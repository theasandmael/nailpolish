export async function flush() {
  if (sync.writing || !sync.dirty || !sync.ref) return;
  sync.writing = true; sync.dirty = false;
  try { await sync.ref.set(listsToDoc()); }
  catch (e) {
    if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) {
      sync.ok = false; renderNotice();
      toast("Your lists can't be saved to your account with this access, so they stay in this browser.");
    } else { sync.dirty = true; setTimeout(flush, 2500); }
  }
  sync.writing = false;
  if (sync.dirty) flush();
}