export async function initAccount() {
  let db = null, user = null;
  try { [db, user] = await Promise.all([claude.use("db"), claude.use("user")]); } catch (e) {}
  if (user) { try { const me = await user.me(); sync.name = me.name || ""; sync.avatar = me.avatarUrl; sync.id = me.id; } catch (e) {} }
  if (!db || !sync.id) { sync.ready = true; renderNotice(); renderWho(); return; }
  try {
    sync.ref = db.doc(`data/users/${sync.id}/lists`);
    const first = await sync.ref.get();
    sync.ok = true;
    if (first.exists) {
      state.lists = docToLists(first.data());
    } else {
      const local = loadLocal();
      if (local.size) { state.lists = local; sync.dirty = true; await flush(); toast("Moved the lists saved in this browser into your account."); }
    }
    sync.ref.onSnapshot(snap => {
      if (!snap.exists || snap.metadata.hasPendingWrites) return;
      const incoming = docToLists(snap.data());
      let same = incoming.size === state.lists.size;
      if (same) for (const [k, v] of incoming) if (state.lists.get(k) !== v) { same = false; break; }
      if (!same && !sync.writing && !sync.dirty) { state.lists = incoming; saveLocal(); renderAll(); }
    }, () => {});
  } catch (e) { sync.ok = false; }
  sync.ready = true; renderNotice(); renderWho(); renderAll();
}