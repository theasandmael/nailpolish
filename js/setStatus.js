function setStatus(p, status) {
  if (status) state.lists.set(p.key, status); else state.lists.delete(p.key);
  persist(); renderAll();
}