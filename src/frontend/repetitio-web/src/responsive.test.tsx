import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CompactDisclosure, compactLayoutQuery, MobileSheet, useCompactLayout } from "./responsive";

const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
});

it("reacts to tablet/phone breakpoint changes and removes its listener on unmount", () => {
  let matches = false;
  let change!: () => void;
  const remove = vi.fn();
  const matchMedia = vi.fn(() => ({ get matches() { return matches; }, addEventListener: (_: string, listener: () => void) => { change = listener; }, removeEventListener: remove }));
  vi.stubGlobal("matchMedia", matchMedia);
  function Probe() { return <span>{useCompactLayout() ? "Compact" : "Desktop"}</span>; }
  const { unmount } = render(<Probe />);
  expect(screen.getByText("Desktop")).toBeInTheDocument();
  expect(matchMedia).toHaveBeenCalledWith(compactLayoutQuery);
  act(() => { matches = true; change(); });
  expect(screen.getByText("Compact")).toBeInTheDocument();
  unmount();
  expect(remove).toHaveBeenCalledWith("change", change);
});

it("leaves desktop markup unwrapped and makes only compact actions collapsible", () => {
  const { container, rerender } = render(<CompactDisclosure compact={false} label="Article actions"><button>Save article</button></CompactDisclosure>);
  expect(container.querySelector("details")).toBeNull();
  expect(container.firstElementChild?.tagName).toBe("BUTTON");
  rerender(<CompactDisclosure compact label="Article actions"><button>Save article</button></CompactDisclosure>);
  expect(container.querySelector("details")).not.toHaveAttribute("open");
  expect(screen.getByText("Article actions")).toBeInTheDocument();
});

it("opens a modal topic sheet outside the page, preserves body state and closes only on explicit dismissal", () => {
  const close = vi.fn();
  document.body.style.overflow = "auto";
  const { unmount } = render(<MobileSheet title="Wiki topics" onClose={close}><input aria-label="Find topic" /></MobileSheet>);
  const dialog = screen.getByRole("dialog", { name: "Wiki topics" });
  expect(dialog).toHaveAttribute("open");
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.click(screen.getByLabelText("Find topic"));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Close wiki topics" }));
  expect(close).toHaveBeenCalledTimes(1);
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(close).toHaveBeenCalledTimes(2);
  unmount();
  expect(document.body.style.overflow).toBe("auto");
  document.body.style.overflow = "";
});
