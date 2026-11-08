import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PwaUpdateNotice } from "./PwaUpdateNotice";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("checks again when an installed app resumes and lets the user apply the update", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const request = vi.fn()
    .mockResolvedValueOnce(Response.json({ buildId: __BUILD_ID__ }))
    .mockResolvedValueOnce(Response.json({ buildId: `${__BUILD_ID__}-next` }));
  vi.stubGlobal("fetch", request);

  await act(async () => { render(<PwaUpdateNotice />); });
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledWith("/app-version.json", expect.objectContaining({ cache: "no-store" }));

  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(request).toHaveBeenCalledTimes(1);

  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  expect(await screen.findByRole("button", { name: "Reload to update" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Save your work");
});

it("does not poll when Repetitio is open as a normal browser tab", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const request = vi.fn();
  vi.stubGlobal("fetch", request);

  render(<PwaUpdateNotice />);
  fireEvent(window, new Event("pageshow"));
  expect(request).not.toHaveBeenCalled();
});
