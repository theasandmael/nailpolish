export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") {
    root.setAttribute("data-theme", mode);
  } else {
    root.removeAttribute("data-theme");
  }
  
  const b = document.getElementById("themeBtn");
  if (b && typeof window.ic === "function") {
    const iconName = mode === "dark" ? "moon" : mode === "light" ? "sun" : "auto";
    b.replaceChildren(window.ic(iconName));
    b.title = "Theme: " + (mode || "system");
  }
}