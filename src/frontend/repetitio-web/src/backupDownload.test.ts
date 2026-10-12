import { afterEach, expect, it, vi } from "vitest";
import { exportBackup } from "./api";

afterEach(() => vi.unstubAllGlobals());

it.each([
  ['attachment; filename=repetitio-backup.zip; filename*=UTF-8\'\'repetitio-backup.zip', "repetitio-backup.zip"],
  ['attachment; filename="backup.zip"', "backup.zip"],
  ['attachment; filename="fallback.zip"; filename*=UTF-8\'\'review%20notes.zip', "review notes.zip"],
  ['attachment; filename="fallback.zip"; filename*=UTF-8\'\'%broken', "fallback.zip"],
  ['attachment; filename="C:\\private\\backup.zip"', "backup.zip"]
])("preserves ZIP bytes and parses the download filename: %s", async (header, expected) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("original archive bytes", { headers: { "Content-Disposition": header } })));
  const result = await exportBackup();
  expect(result.fileName).toBe(expected);
  expect(await result.blob.text()).toBe("original archive bytes");
});
