/* pagevault runtime v4 */
(function() {
  'use strict';

  var CONFIG = {
    title: "Protected Content",
    buttonText: "Unlock",
    errorText: "Incorrect password",
    placeholder: "Enter password",
    usernamePlaceholder: "Enter username",
    defaultRemember: "ask",
    rememberDays: 0,
    autoPrompt: true
  };
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // v4 chunked crypto helpers for region + wrap decryption.
  //
  // Usage:
  //   const result = await decryptV4(envelope, chunks, password, username, onProgress);
  //   // result is {bytes: Uint8Array, meta: object} or null on failure.
  //
  // The envelope is the parsed JSON from a <script data-pv-meta>/<script id="pv-meta"> tag.
  // chunks is an ordered array of base64 strings (region callers pass
  // the chunk text content; wrap callers typically collect from the DOM
  // and remove each element after decryption to free memory).

  function _hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  function _b64ToBytes(b64) {
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  function _deriveChunkIv(ivBase, chunkIndex) {
    const iv = new Uint8Array(ivBase);
    iv[8]  ^= (chunkIndex >>> 24) & 0xFF;
    iv[9]  ^= (chunkIndex >>> 16) & 0xFF;
    iv[10] ^= (chunkIndex >>> 8)  & 0xFF;
    iv[11] ^=  chunkIndex         & 0xFF;
    return iv;
  }

  async function _deriveKey(secret, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits', 'deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 310000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  // Content integrity hash used by region decryption to verify
  // meta.content_hash against the decrypted text. Matches Python's
  // content_hash(): first 16 bytes of SHA-256(utf-8(content)) as hex.
  async function computeHash(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer).slice(0, 16);
    return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
  }

  async function decryptV4(envelope, chunks, password, username, onProgress) {
    try {
      if (envelope.v !== 4) {
        throw new Error('Unsupported envelope version: ' + envelope.v);
      }

      const salt = _hexToBytes(envelope.salt);
      const secret = username ? username + ':' + password : password;
      const wrappingKey = await _deriveKey(secret, salt);

      // Unwrap CEK — try each key blob until one succeeds.
      let cekRaw = null;
      for (const keyBlob of envelope.keys) {
        const blobIv = _b64ToBytes(keyBlob.iv);
        const blobCt = _b64ToBytes(keyBlob.ct);
        try {
          cekRaw = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: blobIv }, wrappingKey, blobCt
          );
          break;
        } catch (e) { continue; }
      }
      if (!cekRaw) throw new Error('No matching key found — wrong password?');

      const cek = await crypto.subtle.importKey(
        'raw', cekRaw, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
      );

      // Decrypt metadata (independent of chunks).
      const metaIv = _b64ToBytes(envelope.meta_iv);
      const metaCt = _b64ToBytes(envelope.meta_ct);
      const metaPlain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: metaIv }, cek, metaCt
      );
      const meta = JSON.parse(new TextDecoder().decode(metaPlain));

      // Decrypt chunks.
      const ivBase = _b64ToBytes(envelope.iv_base);
      const parts = [];
      let totalLen = 0;
      for (let i = 0; i < envelope.chunk_count; i++) {
        const b64 = chunks[i];
        if (typeof b64 !== 'string') {
          throw new Error('Missing chunk ' + i);
        }
        const ct = _b64ToBytes(b64);
        const chunkIv = _deriveChunkIv(ivBase, i);
        const plain = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: chunkIv }, cek, ct
        );
        const plainBytes = new Uint8Array(plain);
        parts.push(plainBytes);
        totalLen += plainBytes.length;
        if (onProgress) onProgress(i + 1, envelope.chunk_count);
      }

      // Concatenate chunks into one contiguous Uint8Array.
      const bytes = new Uint8Array(totalLen);
      let offset = 0;
      for (const p of parts) {
        bytes.set(p, offset);
        offset += p.length;
      }

      return { bytes: bytes, meta: meta };
    } catch (e) {
      console.error('v4 decryption failed:', e);
      return null;
    }
  }

  // readV4FromScope — collect encrypted envelope + chunk texts from the DOM.
  //
  // Supports two layouts:
  //   Region format: <script data-pv-meta> + <script data-pv-chunk="N"> siblings
  //                  inside a <pagevault> element.
  //   Wrap format:   <script id="pv-meta"> + <script id="pv-N"> at document level.
  //
  // Arguments:
  //   scope — the element to search within (a <pagevault> el for region;
  //            document for wrap).
  //
  // Returns {envelope, chunks} where envelope is the parsed JSON object and
  // chunks is an ordered array of base64 strings, or null if the meta script
  // is not found.  Each chunk element is removed from the DOM after being read
  // to free memory.

  function readV4FromScope(scope) {
    // --- Locate meta script ---
    var metaScript = null;

    // Region layout: direct child with data-pv-meta attribute
    if (scope.querySelector) {
      metaScript = scope.querySelector('script[data-pv-meta]');
    }
    // Wrap layout fallback: <script id="pv-meta"> anywhere in document
    if (!metaScript) {
      metaScript = document.getElementById('pv-meta');
    }
    if (!metaScript) return null;

    var envelope;
    try {
      envelope = JSON.parse(metaScript.textContent);
    } catch (e) {
      console.error('[pagevault] Invalid pv-meta JSON:', e);
      return null;
    }

    var chunks = [];

    // --- Collect chunks: region layout (data-pv-chunk attribute) ---
    var chunkTags = [];
    if (scope.querySelectorAll) {
      var tagged = scope.querySelectorAll('script[data-pv-chunk]');
      for (var i = 0; i < tagged.length; i++) {
        var el = tagged[i];
        var idx = parseInt(el.getAttribute('data-pv-chunk'), 10);
        if (!Number.isNaN(idx)) {
          chunkTags.push([idx, el.textContent || '', el]);
        }
      }
    }

    if (chunkTags.length > 0) {
      // Sort by index and extract text; remove each element to free memory.
      chunkTags.sort(function(a, b) { return a[0] - b[0]; });
      for (var j = 0; j < chunkTags.length; j++) {
        chunks.push(chunkTags[j][1]);
        chunkTags[j][2].remove();
      }
    } else {
      // --- Wrap layout fallback: <script id="pv-N"> ---
      var count = envelope.chunk_count || 0;
      for (var k = 0; k < count; k++) {
        var chunkEl = document.getElementById('pv-' + k);
        if (!chunkEl) {
          console.error('[pagevault] Missing chunk element pv-' + k);
          return null;
        }
        chunks.push(chunkEl.textContent || '');
        chunkEl.remove();
      }
    }

    return { envelope: envelope, chunks: chunks };
  }

  // Storage utilities
  const STORAGE_KEY = 'pagevault_passwords';

  function getStoredPasswords() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};
      const data = JSON.parse(stored);
      // Check expiration
      const now = Date.now();
      const filtered = {};
      for (const [key, value] of Object.entries(data)) {
        if (!value.expires || value.expires > now) {
          filtered[key] = value;
        }
      }
      return filtered;
    } catch {
      return {};
    }
  }

  function storeCredentials(password, username, remember) {
    if (remember === 'none') return;
    const cred = username ? { username, password } : { password };
    if (remember === 'session') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cred));
      return;
    }
    const data = getStoredPasswords();
    const expires = CONFIG.rememberDays > 0
      ? Date.now() + (CONFIG.rememberDays * 24 * 60 * 60 * 1000)
      : null;
    data[location.origin] = { ...cred, expires };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getStoredCredentials() {
    // Check session first
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (session) {
      try {
        const cred = JSON.parse(session);
        return cred.password ? cred : { password: session };
      } catch {
        return { password: session };
      }
    }
    // Check localStorage
    const data = getStoredPasswords();
    const entry = data[location.origin];
    if (!entry) return null;
    return entry.password ? entry : null;
  }

  function clearStoredPasswords() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  // URL fragment handling (only logout — password via URL removed for security)
  function checkFragment() {
    const hash = location.hash.slice(1);
    if (!hash) return null;

    if (hash === 'pagevault_logout') {
      clearStoredPasswords();
      // Navigate without the hash — works on file:// unlike history.replaceState
      location.replace(location.pathname + location.search);
      return 'logout';
    }

    return null;
  }

// === Script activation infrastructure ===
  // Snapshot the original page methods ONCE at runtime load. All handlers
  // share these — concurrent decryption is serialized via __pvActivationChain
  // so the shims always restore the true originals, never another handler's shim.
  var __pvOrigDocAddListener = document.addEventListener.bind(document);
  var __pvOrigWinAddListener = window.addEventListener.bind(window);
  var __pvOrigDocWrite = document.write.bind(document);
  var __pvOrigDocWriteln = document.writeln.bind(document);
  var __pvActivationChain = Promise.resolve();

  // Re-execute scripts in a decrypted region. The browser does not run
  // <script> tags inserted via innerHTML, so we re-create each one.
  // Inline scripts run synchronously on replaceChild; external scripts
  // (with src) load asynchronously — we wait for onload before the next.
  // Lifecycle events (DOMContentLoaded, load) already fired before
  // decryption, so we shim them, collect callbacks, and fire after
  // activation. Errors in any script are caught and logged so the
  // shims always restore via the finally block.
  function __pvActivateContent(el, meta, done) {
    var origOnload = window.onload;  // snapshot for change-detection
    var dclCallbacks = [];
    var wlCallbacks = [];

    // Install shims (page-wide for the duration of activation)
    document.write = function(s) {
      if (s) console.warn('[pagevault] document.write() suppressed during activation:', s);
    };
    document.writeln = function(s) {
      if (s) console.warn('[pagevault] document.writeln() suppressed during activation:', s);
    };
    document.addEventListener = function(type, fn, opts) {
      if (type === 'DOMContentLoaded') dclCallbacks.push(fn);
      else __pvOrigDocAddListener(type, fn, opts);
    };
    window.addEventListener = function(type, fn, opts) {
      if (type === 'load') wlCallbacks.push(fn);
      else __pvOrigWinAddListener(type, fn, opts);
    };

    function restoreShims() {
      document.addEventListener = __pvOrigDocAddListener;
      window.addEventListener = __pvOrigWinAddListener;
      document.write = __pvOrigDocWrite;
      document.writeln = __pvOrigDocWriteln;
    }

    // Permissive JS MIME-type detection (matches HTML spec)
    function isExecutable(s) {
      var t = (s.getAttribute('type') || '').toLowerCase();
      if (!t) return true;
      if (t === 'module') return true;
      return /javascript|ecmascript|jscript/.test(t);
    }

    var scripts = Array.from(el.querySelectorAll('script'));

    function finalize() {
      restoreShims();
      dclCallbacks.forEach(function(fn) {
        try { fn(); } catch(e) { console.error('[pagevault] DOMContentLoaded callback error:', e); }
      });
      wlCallbacks.forEach(function(fn) {
        try { fn(); } catch(e) { console.error('[pagevault] load callback error:', e); }
      });
      // Only re-fire onload if a decrypted script REPLACED it
      if (typeof window.onload === 'function' && window.onload !== origOnload) {
        try { window.onload(new Event('load')); } catch(e) { console.error('[pagevault] onload error:', e); }
      }
      el.dispatchEvent(new CustomEvent('pagevault:activated', {
        bubbles: true,
        detail: { element: el, meta: meta }
      }));
      done();
    }

    function activateNext(i) {
      try {
        // Loop through synchronous (inline) scripts; only recurse on async boundary
        while (i < scripts.length) {
          var old = scripts[i];
          if (!isExecutable(old)) { i++; continue; }
          if (!old.parentNode) { i++; continue; }  // ancestor was removed by an earlier script
          var s = document.createElement('script');
          for (var j = 0; j < old.attributes.length; j++) {
            var a = old.attributes[j];
            s.setAttribute(a.name, a.value);
          }
          var hasSrc = old.hasAttribute('src');
          if (!hasSrc && old.textContent) s.textContent = old.textContent;
          if (hasSrc) {
            // Capture index and src in IIFE so closures don't share mutated state
            (function(idx, srcUrl) {
              s.onload = function() { activateNext(idx + 1); };
              s.onerror = function() {
                console.error('[pagevault] Failed to load:', srcUrl);
                activateNext(idx + 1);
              };
            })(i, old.getAttribute('src'));
            old.parentNode.replaceChild(s, old);
            return;  // suspend until onload/onerror fires
          }
          old.parentNode.replaceChild(s, old);
          i++;
        }
        finalize();
      } catch (e) {
        console.error('[pagevault] script activation error:', e);
        try { finalize(); } catch(_) {}
      }
    }

    activateNext(0);
  }

  // Element handler — uses a plain class instead of Custom Elements because
  // the spec requires hyphenated names and <pagevault> has no hyphen.
  // All values set via innerHTML are either:
  //   - escapeHtml()-wrapped user strings (hint, title, placeholder, button text)
  //   - static HTML template literals (form structure, lock icon)
  //   - decrypted content from AES-256-GCM (trusted after authenticated decryption)
  class PagevaultHandler {
    constructor(el) {
      this.el = el;
      this.el._pvDecrypted = false;
      // Snapshot v4 envelope + chunks before rendering the prompt
      // (rendering clears innerHTML which would discard them).
      // readV4FromScope is provided by core/chunks.js.
      this._snapshot = readV4FromScope(el);
      this._render();
      this._tryAutoDecrypt();
    }

    _render() {
      const el = this.el;
      const hint = el.getAttribute('data-hint');
      const title = el.getAttribute('data-title') || CONFIG.title;
      const remember = el.getAttribute('data-remember') || CONFIG.defaultRemember;
      const isUserMode = el.getAttribute('data-mode') === 'user';

      el.innerHTML = `
        <div class="pagevault-container">
          <div class="pagevault-icon">🔒</div>
          <div class="pagevault-title">${escapeHtml(title)}</div>
          ${hint ? `<div class="pagevault-hint">${escapeHtml(hint)}</div>` : ''}
          <form class="pagevault-form">
            ${isUserMode ? `<input type="text" class="pagevault-input pagevault-username" placeholder="${escapeHtml(CONFIG.usernamePlaceholder)}" autocomplete="username">` : ''}
            <input type="password" class="pagevault-input" placeholder="${escapeHtml(CONFIG.placeholder)}" autocomplete="current-password">
            ${remember === 'ask' ? `
              <label class="pagevault-remember">
                <input type="checkbox" name="remember">
                Remember on this device
              </label>
            ` : ''}
            <button type="submit" class="pagevault-button">${escapeHtml(CONFIG.buttonText)}</button>
            <div class="pagevault-error" style="display: none;"></div>
          </form>
        </div>
      `;

      const form = el.querySelector('form');
      const passwordInput = el.querySelector('input[type="password"]');
      const usernameInput = el.querySelector('.pagevault-username');
      const error = el.querySelector('.pagevault-error');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = passwordInput.value;
        if (!password) return;
        const username = usernameInput ? usernameInput.value : null;

        // Capture checkbox state BEFORE decryption replaces innerHTML
        const rememberCheckbox = el.querySelector('input[name="remember"]');
        const wantsRemember = remember === 'local' || (rememberCheckbox && rememberCheckbox.checked);

        const button = el.querySelector('button');
        button.disabled = true;
        button.textContent = 'Decrypting...';

        const success = await this._decrypt(password, username);

        if (!success) {
          error.textContent = CONFIG.errorText;
          error.style.display = 'block';
          button.disabled = false;
          button.textContent = CONFIG.buttonText;
          passwordInput.value = '';
          passwordInput.focus();
        } else {
          // Store credentials if requested
          if (wantsRemember) {
            storeCredentials(password, username, 'local');
          } else if (remember === 'session') {
            storeCredentials(password, username, 'session');
          }
        }
      });

      // Focus appropriate input if auto-prompt
      if (CONFIG.autoPrompt) {
        const focusTarget = usernameInput || passwordInput;
        setTimeout(() => focusTarget.focus(), 100);
      }
    }

    async _tryAutoDecrypt() {
      // Check URL fragment (only logout supported)
      const fragment = checkFragment();
      if (fragment === 'logout') return;

      // Try stored credentials
      const cred = getStoredCredentials();
      if (cred) {
        await this._decrypt(cred.password, cred.username || null);
      }
    }

    async _decrypt(password, username) {
      const el = this.el;
      if (!this._snapshot) return false;

      const result = await decryptV4(
        this._snapshot.envelope,
        this._snapshot.chunks,
        password,
        username
      );
      if (result === null) return false;

      const meta = result.meta || {};
      if (meta.kind && meta.kind !== 'html_fragment') {
        console.error('Unexpected envelope kind for region:', meta.kind);
        return false;
      }

      // Decode UTF-8 text and strip trailing NUL padding (from --pad).
      let content = new TextDecoder().decode(result.bytes);
      content = content.replace(/\0+$/, '');

      // Verify content hash if present in encrypted metadata.
      const expectedHash = meta.content_hash;
      if (expectedHash) {
        const actualHash = await computeHash(content);
        if (actualHash !== expectedHash) {
          console.error('Content hash mismatch - decryption may be corrupted');
          return false;
        }
      }

      // Clear v4 attributes and reveal content.
      el.removeAttribute('data-pv-v4');
      el.removeAttribute('data-mode');
      // Decrypted content is trusted — it was authenticated by AES-256-GCM
      // (user encrypted their own content; AES-GCM provides authenticity)
      el.innerHTML = content;
      el._pvDecrypted = true;

      // Fire decrypted event immediately — content is in the DOM,
      // listeners that just need to know "the content is here" don't
      // wait for script activation. A separate pagevault:activated
      // event fires after all scripts have run.
      el.dispatchEvent(new CustomEvent('pagevault:decrypted', {
        bubbles: true,
        detail: { element: el, meta: meta }
      }));

      // Serialize script activation across handlers via a page-level
      // promise chain. Global shims (document.addEventListener,
      // document.write, etc.) cannot be safely interleaved across
      // concurrent decryptions, so we ensure only one activation runs
      // at a time. See __pvActivateContent for the activation routine.
      __pvActivationChain = __pvActivationChain.then(function() {
        return new Promise(function(resolve) {
          __pvActivateContent(el, meta, resolve);
        });
      });

      return true;
    }
  }

  // Initialize all v4-encrypted <pagevault> elements.
  // Wrapped in DOMContentLoaded since the script is in <head> but the
  // elements are in <body> — they don't exist yet at script parse time.
  function initAll() {
    document.querySelectorAll('pagevault[data-pv-v4]').forEach(function(el) {
      if (!el._pvHandler) {
        el._pvHandler = new PagevaultHandler(el);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();
