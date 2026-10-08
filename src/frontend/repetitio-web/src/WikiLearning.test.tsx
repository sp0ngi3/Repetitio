import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WikiLearningPlayer, WikiReviewDashboard, type WikiStudyItem } from "./WikiLearning";
import { saveWikiStudy } from "./api";

vi.mock("./api", () => ({ saveWikiStudy: vi.fn(), getWikiStudy: vi.fn(), saveWikiStudySettings: vi.fn(), saveWikiReviewPreference: vi.fn() }));

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
