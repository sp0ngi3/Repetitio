import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WikiLearningPlayer, WikiReviewDashboard, type WikiStudyItem } from "./WikiLearning";
import { saveWikiStudy, getWikiPage, changeWikiPracticeItem } from "./api";
import type { WikiPage } from "./types";

vi.mock("./api", () => ({ saveWikiStudy: vi.fn(), getWikiStudy: vi.fn(), getWikiPage: vi.fn(), changeWikiPracticeItem: vi.fn(), saveWikiStudySettings: vi.fn(), saveWikiReviewPreference: vi.fn() }));

const items: WikiStudyItem[] = [
  { id: "question-1", type: "quiz", pageId: "parent", pageTitle: "Parent", pagePath: "parent", question: {
    id: "question-1", prompt: "First question", sortOrder: 0, options: [
      { id: "right", text: "Right answer", isCorrect: true, sortOrder: 0 },
      { id: "wrong", text: "Wrong answer", isCorrect: false, sortOrder: 1 }
    ] } },
  { id: "question-2", type: "quiz", pageId: "child", pageTitle: "Child", pagePath: "parent/child", question: {
    id: "question-2", prompt: "Second question", sortOrder: 0, options: [
      { id: "second-right", text: "Another answer", isCorrect: true, sortOrder: 0 }
    ] } },
  { id: "card-1", type: "flashcard", pageId: "child", pageTitle: "Child", pagePath: "parent/child", flashcard: {
    id: "card-1", front: "Card prompt", back: "Card answer", sortOrder: 0
  } }
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(saveWikiStudy).mockResolvedValue({ intervalDays: 30, pages: [], history: [] });
});

const fixturePage: WikiPage = { id: "parent", title: "Parent", path: "parent", slug: "parent", parentId: null,
  depth: 0, sortOrder: 0, contentMarkdown: "Keep article and images", isArchived: false, isStudied: false,
  childCount: 1, createdAt: "2026-01-01", updatedAt: "2026-10-31T12:00:00Z", sources: [],
  quizQuestions: items.filter(item => item.type === "quiz").map(item => item.question),
  flashcards: items.filter(item => item.type === "flashcard").map(item => item.flashcard) };
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  vi.mocked(getWikiPage).mockResolvedValue(fixturePage);
});
afterEach(() => {
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  vi.restoreAllMocks();
});

it("never deletes on opening the dialog or cancelling; requires explicit permanent confirmation", async () => {
  render(<WikiLearningPlayer items={items} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete this check" }));
  const confirm = await screen.findByRole("button", { name: "Delete permanently" });
  await waitFor(() => expect(confirm).toBeEnabled());
  expect(changeWikiPracticeItem).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(changeWikiPracticeItem).not.toHaveBeenCalled();
  expect(screen.getByText("First question")).toBeInTheDocument();
});

it("edits the current question, keeps other answers and retries a failed save without discarding the draft", async () => {
  const onPageUpdated = vi.fn();
  const editedPage = { ...fixturePage, quizQuestions: [{ ...fixturePage.quizQuestions[0], id: "revised", prompt: "Clearer question" }, fixturePage.quizQuestions[1]] };
  vi.mocked(changeWikiPracticeItem).mockRejectedValueOnce(new Error("Article changed; reopen to retry")).mockResolvedValueOnce({ page: editedPage, replacementItemId: "revised" });
  render(<WikiLearningPlayer items={items} onClose={vi.fn()} onPageUpdated={onPageUpdated} />);
  fireEvent.click(screen.getByRole("button", { name: "A Right answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Next check" }));
  fireEvent.click(screen.getByRole("button", { name: "A Another answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous check" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit this check" }));
  const prompt = await screen.findByLabelText("Question", { exact: true });
  fireEvent.change(prompt, { target: { value: "Clearer question" } });
  expect(changeWikiPracticeItem).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Article changed");
  expect(prompt).toHaveValue("Clearer question");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("Clearer question")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "A Right answer" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "A Right answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Save results" }));
  await waitFor(() => expect(saveWikiStudy).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
    { pageId: "child", itemId: "question-2", kind: "quiz", optionId: "second-right" },
    { pageId: "parent", itemId: "revised", kind: "quiz", optionId: "right" }
  ])));
  expect(onPageUpdated).toHaveBeenCalledWith(editedPage);
});

it("deleting an answered check removes only that answer and advances without losing other results", async () => {
  vi.mocked(changeWikiPracticeItem).mockResolvedValue({ page: { ...fixturePage, quizQuestions: [fixturePage.quizQuestions[1]] }, replacementItemId: null });
  render(<WikiLearningPlayer items={items} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "A Right answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Next check" }));
  fireEvent.click(screen.getByRole("button", { name: "A Another answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous check" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete this check" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Delete permanently" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("Second question")).toBeInTheDocument();
  expect(screen.getByText("1 / 2 answered")).toBeInTheDocument();
  expect(changeWikiPracticeItem).toHaveBeenCalledWith("parent", "quiz", "question-1", { expectedUpdatedAt: fixturePage.updatedAt, delete: true });
  fireEvent.click(screen.getByRole("button", { name: "Save results" }));
  await waitFor(() => expect(saveWikiStudy).toHaveBeenCalledWith(expect.any(String), [{ pageId: "child", itemId: "question-2", kind: "quiz", optionId: "second-right" }]));
});

it("edits a flashcard and handles deleting the very last check without crashing", async () => {
  const updated = { ...fixturePage, flashcards: [{ ...fixturePage.flashcards[0], id: "new-card", back: "Corrected answer" }] };
  vi.mocked(changeWikiPracticeItem).mockResolvedValueOnce({ page: updated, replacementItemId: "new-card" })
    .mockResolvedValueOnce({ page: { ...updated, flashcards: [] }, replacementItemId: null });
  const onClose = vi.fn();
  render(<WikiLearningPlayer items={[items[2]]} onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit this check" }));
  fireEvent.change(await screen.findByLabelText("Back"), { target: { value: "Corrected answer" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /Card prompt/ }));
  expect(screen.getByText("Corrected answer")).toBeInTheDocument();
  vi.mocked(getWikiPage).mockResolvedValueOnce(updated);
  fireEvent.click(screen.getByRole("button", { name: "Delete this check" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Delete permanently" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
  expect(await screen.findByText("No checks remaining")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to topics" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

describe("Wiki practice player", () => {
  it("shows one question, locks the first answer and credits the owning child page", async () => {
    render(<WikiLearningPlayer items={items} onClose={vi.fn()} />);
    expect(screen.getByText("First question")).toBeInTheDocument();
    expect(screen.queryByText("Second question")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "B Wrong answer" }));
    expect(screen.getByRole("button", { name: "A Right answer" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next check" }));
    fireEvent.click(screen.getByRole("button", { name: "A Another answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Save results" }));
    await waitFor(() => expect(saveWikiStudy).toHaveBeenCalledWith(expect.any(String), [
      { pageId: "parent", itemId: "question-1", kind: "quiz", optionId: "wrong" },
      { pageId: "child", itemId: "question-2", kind: "quiz", optionId: "second-right" }
    ]));
    expect(screen.getByText("1 / 2 correct")).toBeInTheDocument();
  });

  it("does not grade flashcards by revealing them and saves the explicit self-assessment", async () => {
    render(<WikiLearningPlayer items={[items[2]]} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save results" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Card prompt/ }));
    expect(screen.getByRole("button", { name: "Save results" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Need practice" }));
    fireEvent.click(screen.getByRole("button", { name: "Save results" }));
    await waitFor(() => expect(saveWikiStudy).toHaveBeenCalledWith(expect.any(String), [
      { pageId: "child", itemId: "card-1", kind: "flashcard", knew: false }
    ]));
  });

  it("retains answers and the same session ID when retrying a failed save", async () => {
    vi.mocked(saveWikiStudy).mockRejectedValueOnce(new Error("Offline"));
    render(<WikiLearningPlayer items={items} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "A Right answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Save results" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Save results" }));
    await waitFor(() => expect(saveWikiStudy).toHaveBeenCalledTimes(2));
    expect(vi.mocked(saveWikiStudy).mock.calls[0]).toEqual(vi.mocked(saveWikiStudy).mock.calls[1]);
  });
});

it("excludes archived/disabled topics from the Wiki review queue", () => {
  const mode = { kind: "quiz" as const, total: 10, covered: 2, correct: 1, lastPracticedAt: "2026-01-01", lastCompletedAt: null, nextReviewAt: null };
  const base = { parentId: null, path: "root", isArchived: false, reviewEnabled: true, effectiveReviewEnabled: true, intervalDays: null, modes: [mode] };
  render(<WikiReviewDashboard onSelect={vi.fn()} overview={{ intervalDays: 30, history: [], pages: [
    { ...base, id: "active", title: "Active topic" },
    { ...base, id: "archived", title: "Archived topic", isArchived: true, effectiveReviewEnabled: false },
    { ...base, id: "excluded", title: "Excluded topic", effectiveReviewEnabled: false }
  ] }} />);
  fireEvent.click(screen.getByRole("button", { name: "In progress" }));
  expect(screen.getByText("Active topic")).toBeInTheDocument();
  expect(screen.queryByText("Archived topic")).not.toBeInTheDocument();
  expect(screen.queryByText("Excluded topic")).not.toBeInTheDocument();
});
