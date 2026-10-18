function loadLocal() { try { return docToLists(JSON.parse(store.get("lists:v1") || "null")); } catch (e) { return new Map(); } }
