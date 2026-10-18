export function persist() {
  saveLocal();
  if (!sync.ok) return;
  sync.dirty = true;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(flush, 500);
}