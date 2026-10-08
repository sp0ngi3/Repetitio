import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyAppearance, readColorMode, readMotionPreference, readVisualStyle } from "./appearance";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("uses Professional without discarding the existing dark-mode preference", () => {
  localStorage.setItem("repetitio-theme", "dark");
  expect(readColorMode()).toBe("dark");
  expect(readVisualStyle()).toBe("professional");
  expect(readMotionPreference()).toBe("system");
});

it.each(["light", "dark"] as const)("persists independent style and %s mode preferences", mode => {
  localStorage.setItem("repetitio-review-schedule", "two-weeks");
  applyAppearance(mode, "vaporwave", "reduced");
  expect(readColorMode()).toBe(mode);
  expect(readVisualStyle()).toBe("vaporwave");
  expect(readMotionPreference()).toBe("reduced");
  expect(document.documentElement.dataset).toMatchObject({ theme: mode, style: "vaporwave", motion: "reduced" });
  expect(localStorage.getItem("repetitio-review-schedule")).toBe("two-weeks");
});

it("safely defaults for unsupported stored values", () => {
  localStorage.setItem("repetitio-theme", "neon");
  localStorage.setItem("repetitio-visual-style", "unknown");
  localStorage.setItem("repetitio-motion", "unknown");
  expect(readColorMode()).toBe("light");
  expect(readVisualStyle()).toBe("professional");
  expect(readMotionPreference()).toBe("system");
});

it("still applies themes when browser storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
  expect(readVisualStyle()).toBe("professional");
  expect(() => applyAppearance("dark", "vaporwave", "reduced")).not.toThrow();
  expect(document.documentElement.dataset.style).toBe("vaporwave");
});
