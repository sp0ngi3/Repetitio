import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getWikiJson, updateWikiJson } from "./api";
import { WikiJsonEditor } from "./WikiJsonEditor";
import type { WikiJsonDocument } from "./types";

vi.mock("./api", async importOriginal => ({
  ...await importOriginal<typeof import("./api")>(),
  getWikiJson: vi.fn(),
  updateWikiJson: vi.fn()
}));
vi.mock("./CodeEditor", () => ({
  CodeEditor: ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) =>
    <textarea aria-label={label} value={value} onChange={event => onChange(event.target.value)} />
}));

const rootId = "aaaaaaaa-1111-4111-8111-111111111111";
const imageId = "bbbbbbbb-2222-4222-8222-222222222222";
const baseline: WikiJsonDocument = { pages: [{
  id: rootId, parentId: null, title: "Root", slug: "root", path: "root", depth: 0, sortOrder: 0,
  summary: null, contentMarkdown: "![Diagram](wiki-image:" + imageId + ")",
  isArchived: false, isStudied: false, childCount: 0, children: [], images: [],
  sources: [], quizQuestions: [], flashcards: [],
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z"
}] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWikiJson).mockResolvedValue(structuredClone(baseline));
  vi.mocked(updateWikiJson).mockResolvedValue({ updatedCount: 1 });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("reviews an uploaded split JSON, confirms it, and sends both pages with image references intact", async () => {
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<WikiJsonEditor pageId={rootId} onSaved={onSaved} onCancel={vi.fn()} />);
  await screen.findByRole("textbox", { name: "Article JSON" });
  const draft = { pages: [{
    id: rootId, updatedAt: baseline.pages[0].updatedAt, contentMarkdown: "Overview",
    children: [{ title: "New chapter", contentMarkdown: baseline.pages[0].contentMarkdown }]
  }] };
  fireEvent.change(screen.getByLabelText("Choose JSON"), { target: { files: [{ text: async () => JSON.stringify(draft) }] } });
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Article JSON" })).toHaveValue(JSON.stringify(draft)));
  fireEvent.click(screen.getAllByRole("button", { name: "Review changes" })[0]);
  expect(screen.getByText(/1 new subpages/)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Allow unlinking/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(rootId));
  expect(confirm).toHaveBeenCalled();
  const request = vi.mocked(updateWikiJson).mock.calls[0][1];
  expect(request.updates).toHaveLength(2);
  expect(request.updates[0]).toMatchObject({ id: rootId, expectedUpdatedAt: baseline.pages[0].updatedAt, isNew: false });
  expect(request.updates[1]).toMatchObject({ isNew: true, expectedUpdatedAt: null,
    page: { parentId: rootId, title: "New chapter", contentMarkdown: baseline.pages[0].contentMarkdown } });
});

it("requires explicit timestamp rebasing and preserves the draft after a concurrent save rejection", async () => {
  const onSaved = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.mocked(updateWikiJson).mockRejectedValue(new Error("The page changed. Reload before saving."));
  render(<WikiJsonEditor pageId={rootId} onSaved={onSaved} onCancel={vi.fn()} />);
  const editor = await screen.findByRole("textbox", { name: "Article JSON" });
  const source = JSON.stringify({ pages: [{ ...baseline.pages[0], title: "Updated", updatedAt: "2025-01-01" }] });
  fireEvent.change(editor, { target: { value: source } });
  fireEvent.click(screen.getAllByRole("button", { name: "Review changes" })[0]);
  expect(screen.getByRole("alert")).toHaveTextContent("updatedAt");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Review against current page versions/ }));
  fireEvent.click(screen.getAllByRole("button", { name: "Review changes" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("The page changed");
  expect(editor).toHaveValue(source);
  expect(onSaved).not.toHaveBeenCalled();
  expect(vi.mocked(updateWikiJson).mock.calls[0][1].updates[0].expectedUpdatedAt).toBe(baseline.pages[0].updatedAt);
});
