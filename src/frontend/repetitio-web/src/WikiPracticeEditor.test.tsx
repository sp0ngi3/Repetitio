import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { updateWikiPractice } from "./api";
import { WikiPracticeEditor } from "./WikiPracticeEditor";
import type { WikiPage } from "./types";

vi.mock("./api", () => ({ updateWikiPractice: vi.fn() }));
const page: WikiPage = {
  id: "page", title: "Networking", slug: "networking", path: "networking", parentId: null,
  depth: 0, sortOrder: 0, contentMarkdown: "Keep this article", isArchived: false, isStudied: true,
  childCount: 0, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-23T08:00:00Z", sources: [],
  quizQuestions: [{ id: "quiz", prompt: "Existing question?", explanation: "Existing explanation", sortOrder: 0,
    options: [{ id: "a", text: "Yes", isCorrect: true, sortOrder: 0 }, { id: "b", text: "No", isCorrect: false, sortOrder: 1 }] }],
  flashcards: [{ id: "card", front: "Existing front", back: "Existing back", sortOrder: 0 }]
};
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  vi.mocked(updateWikiPractice).mockResolvedValue({ ...page, updatedAt: "2026-10-23T09:00:00Z" });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
});
const question = (index = 1) => within(screen.getByRole("group", { name: `Question ${index}` }));
const card = (index = 1) => within(screen.getByRole("group", { name: `Flashcard ${index}` }));
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
function editor(record = page) {
  const onSaved = vi.fn(); const onClose = vi.fn();
  render(<WikiPracticeEditor page={record} onSaved={onSaved} onClose={onClose} />);
  return { onSaved, onClose };
}

it("loads and edits the existing fields, supporting additional answers and multiple correct choices", async () => {
  const { onSaved, onClose } = editor();
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  expect(question().getByLabelText("Correct answer 1")).toBeChecked();
  change(question().getByLabelText("Question", { exact: true }), "Revised question?");
  change(question().getByLabelText("Explanation (optional)"), "Revised explanation");
  change(question().getByLabelText("Answer 1", { exact: true }), "Revised answer");
  fireEvent.click(question().getByLabelText("Correct answer 2"));
  fireEvent.click(question().getByRole("button", { name: "Add answer" }));
  change(question().getByLabelText("Answer 3", { exact: true }), "Third answer");
  change(card().getByLabelText("Front"), "Revised front");
  change(card().getByLabelText("Back"), "Revised back");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(updateWikiPractice).toHaveBeenCalledWith("page", {
    expectedUpdatedAt: page.updatedAt,
    quizQuestions: [{ prompt: "Revised question?", explanation: "Revised explanation", options: [
      { text: "Revised answer", isCorrect: true }, { text: "No", isCorrect: true }, { text: "Third answer", isCorrect: false }
    ] }], flashcards: [{ front: "Revised front", back: "Revised back" }]
  });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("adds quiz questions and flashcards to an article with no existing checks", async () => {
  editor({ ...page, quizQuestions: [], flashcards: [] });
  fireEvent.click(screen.getByRole("button", { name: "Add question" }));
  change(question().getByLabelText("Question", { exact: true }), "New question");
  change(question().getByLabelText("Answer 1", { exact: true }), "Correct");
  change(question().getByLabelText("Answer 2", { exact: true }), "Incorrect");
  fireEvent.click(question().getByLabelText("Correct answer 1"));
  fireEvent.click(screen.getByRole("button", { name: "Add flashcard" }));
  change(card().getByLabelText("Front"), "New front");
  change(card().getByLabelText("Back"), "New back");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(updateWikiPractice).toHaveBeenCalledWith("page", expect.objectContaining({
    quizQuestions: [expect.objectContaining({ prompt: "New question" })], flashcards: [{ front: "New front", back: "New back" }]
  })));
});

it("validates correct choices and bounds the number of answers between two and eight", async () => {
  editor();
  expect(question().getByRole("button", { name: "Remove answer 1" })).toBeDisabled();
  fireEvent.click(question().getByLabelText("Correct answer 1"));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Question 1: mark at least one answer as correct");
  expect(updateWikiPractice).not.toHaveBeenCalled();
  for (let count = 2; count < 8; count++) fireEvent.click(question().getByRole("button", { name: "Add answer" }));
  expect(question().getByRole("button", { name: "Add answer" })).toBeDisabled();
  fireEvent.click(question().getByRole("button", { name: "Remove answer 8" }));
  expect(question().getByRole("button", { name: "Add answer" })).toBeEnabled();
});

it("retains the edited draft after a failed save so the user can retry", async () => {
  vi.mocked(updateWikiPractice).mockRejectedValueOnce(new Error("Article changed. Reopen the editor."));
  const { onSaved, onClose } = editor();
  change(card().getByLabelText("Back"), "Keep my draft");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Article changed");
  expect(card().getByLabelText("Back")).toHaveValue("Keep my draft");
  expect(onSaved).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it("can undo a removal and protects unsaved edits when cancelling or pressing Escape", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const { onClose } = editor();
  fireEvent.click(screen.getByRole("button", { name: "Remove question 1" }));
  expect(screen.queryByRole("group", { name: "Question 1" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  expect(question().getByLabelText("Question", { exact: true })).toHaveValue("Existing question?");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  change(card().getByLabelText("Back"), "Unsaved");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(onClose).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(updateWikiPractice).not.toHaveBeenCalled();
});

it("blocks duplicate saves and closing while a request is running", async () => {
  let finish!: (value: WikiPage) => void;
  vi.mocked(updateWikiPractice).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { onClose } = editor();
  change(card().getByLabelText("Front"), "Changed");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Close practice editor" })).toBeDisabled();
  expect(card().getByLabelText("Front")).toBeDisabled();
  fireEvent.submit(screen.getByRole("button", { name: "Saving..." }).closest("form")!);
  expect(updateWikiPractice).toHaveBeenCalledTimes(1);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish(page));
  expect(onClose).toHaveBeenCalledTimes(1);
});
