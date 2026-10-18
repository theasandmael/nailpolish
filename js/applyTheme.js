export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode); else root.removeAttribute("data-theme");
  const b = $("#themeBtn"); b.replaceChildren(ic(mode === "dark" ? "moon" : mode === "light" ? "sun" : "auto"));
  b.title = "Theme: " + (mode || "system");
}