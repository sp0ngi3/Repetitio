import { afterEach, expect, it, vi } from "vitest";
import { fetchRead } from "./readRequest";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("recovers safe reads when the API starts after the frontend", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("not ready")).mockResolvedValueOnce(new Response("starting", { status: 503 })).mockResolvedValueOnce(Response.json({ ready: true }));
  vi.stubGlobal("fetch", fetch);
  const pending = fetchRead("http://localhost/api/dashboard");
  await vi.runAllTimersAsync();
  expect(await (await pending).json()).toEqual({ ready: true });
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("does not retry permanent errors", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));
  vi.stubGlobal("fetch", fetch);
  expect((await fetchRead("http://localhost/api/missing")).status).toBe(404);
  expect(fetch).toHaveBeenCalledTimes(1);
});
