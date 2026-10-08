export type ColorMode = "light" | "dark";
export type VisualStyle = "professional" | "vaporwave";
export type MotionPreference = "system" | "reduced";

function readPreference(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function readColorMode(): ColorMode {
  return readPreference("repetitio-theme") === "dark" ? "dark" : "light";
}

export function readVisualStyle(): VisualStyle {
  return readPreference("repetitio-visual-style") === "vaporwave" ? "vaporwave" : "professional";
}

export function readMotionPreference(): MotionPreference {
  return readPreference("repetitio-motion") === "reduced" ? "reduced" : "system";
}

export function applyAppearance(mode: ColorMode, style: VisualStyle, motion: MotionPreference) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.style = style;
  root.dataset.motion = motion;
  root.style.colorScheme = mode;
  try {
    // Retain the original light/dark key so existing browser preferences still work.
    localStorage.setItem("repetitio-theme", mode);
    localStorage.setItem("repetitio-visual-style", style);
    localStorage.setItem("repetitio-motion", motion);
  } catch { /* Appearance still works when browser storage is unavailable. */ }
}
