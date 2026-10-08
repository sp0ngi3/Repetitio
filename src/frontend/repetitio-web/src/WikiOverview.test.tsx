import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { getWikiStudy } from "./api";
import { WikiOverview } from "./WikiOverview";
import type { WikiStudyModeProgress, WikiStudyOverview, WikiStudyPageProgress } from "./types";

vi.mock("./api", () => ({ getWikiStudy: vi.fn() }));

const blankMode: WikiStudyModeProgress = {
  kind: "quiz", total: 2, covered: 0, correct: 0,
  lastPracticedAt: null, lastCompletedAt: null, nextReviewAt: null
};
function topic(id: string, mode = blankMode): WikiStudyPageProgress {
  return { id, title: id, path: `exam/${id}`, parentId: "exam", isArchived: false,
    reviewEnabled: true, effectiveReviewEnabled: true, intervalDays: null, modes: [mode] };
}
const overview: WikiStudyOverview = {
  intervalDays: 30,
  pages: [
    topic("Partial", { ...blankMode, total: 4, covered: 2, correct: 1, lastPracticedAt: "2026-01-01" }),
    topic("Complete", { ...blankMode, kind: "flashcard", total: 3, covered: 3, correct: 3,
      lastPracticedAt: "2026-01-01", lastCompletedAt: "2026-01-01", nextReviewAt: "2000-02-01" }),
    topic("Untouched"),
    { ...topic("Archived"), isArchived: true },
    { ...topic("Excluded"), effectiveReviewEnabled: false },
    { ...topic("Empty root"), modes: [] }
  ],
  history: [{ id: "session", completedAt: "2026-01-01", answered: 5, correct: 4 }]
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWikiStudy).mockResolvedValue(overview);
});

it("summarizes coverage, mistakes and completion without counting archived, excluded or empty topics", async () => {
  render(<WikiOverview onPractice={vi.fn()} />);
  expect(await screen.findByText("56% covered")).toBeInTheDocument();
  expect(screen.getByText("3 active topics")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Wiki check coverage" })).toHaveAttribute("value", "5");
  const value = (label: string) => within(screen.getByText(label, { selector: "dt" }).parentElement!).getByRole("definition");
  expect(value("Due sections")).toHaveTextContent("1");
  expect(value("Never practiced")).toHaveTextContent("1");
  expect(value("In progress")).toHaveTextContent("1");
  expect(value("Completed at least once")).toHaveTextContent("1");
  expect(value("Checks to improve")).toHaveTextContent("1");
  expect(value("Current answer accuracy")).toHaveTextContent("80%");
  expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  expect(screen.queryByText("Excluded")).not.toBeInTheDocument();
  expect(screen.queryByText("Empty root")).not.toBeInTheDocument();
});

it("filters actionable sections and opens the exact owning page and practice mode", async () => {
  const onPractice = vi.fn();
  render(<WikiOverview onPractice={onPractice} />);
  await screen.findByText("Partial");
  fireEvent.click(screen.getByRole("button", { name: "Needs practice" }));
  expect(screen.getByText("Partial")).toBeInTheDocument();
  expect(screen.queryByText("Complete")).not.toBeInTheDocument();
  expect(screen.getByText("1 check needs practice", { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Practice Partial Quiz" }));
  expect(onPractice).toHaveBeenCalledWith("Partial", "quiz");
  fireEvent.click(screen.getByRole("button", { name: "Completed at least once" }));
  fireEvent.click(screen.getByRole("button", { name: "Practice Complete Flashcards" }));
  expect(onPractice).toHaveBeenCalledWith("Complete", "flashcard");
  fireEvent.click(screen.getByRole("button", { name: "Never practiced" }));
  expect(screen.getByText("Untouched")).toBeInTheDocument();
  expect(screen.queryByText("Partial")).not.toBeInTheDocument();
});

it("paginates large inventories and resets pagination when searching or changing filters", async () => {
  vi.mocked(getWikiStudy).mockResolvedValue({ ...overview,
    pages: Array.from({ length: 19 }, (_, i) => topic(`Topic ${String(i).padStart(2, "0")}`)) });
  render(<WikiOverview onPractice={vi.fn()} />);
  await screen.findByText("Topic 00");
  expect(screen.getAllByRole("button", { name: /^Practice Topic/ })).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.queryByText("Topic 00")).not.toBeInTheDocument();
  expect(screen.getByText("Topic 08")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Find a Wiki topic"), { target: { value: "Topic 18" } });
  expect(screen.getByText("Topic 18")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});

it("refreshes after study updates and distinguishes prior completion from a new partial cycle", async () => {
  render(<WikiOverview onPractice={vi.fn()} />);
  await screen.findByText("Partial");
  vi.mocked(getWikiStudy).mockResolvedValue({ ...overview, pages: [topic("Next cycle", {
    ...blankMode, covered: 1, correct: 1, lastPracticedAt: "2026-01-10", lastCompletedAt: "2026-01-01", nextReviewAt: "2099-01-01"
  })] });
  fireEvent(window, new Event("wiki-study-updated"));
  await screen.findByText("Next cycle");
  fireEvent.click(screen.getByRole("button", { name: "In progress" }));
  expect(screen.getByText("Next cycle")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Completed at least once" }));
  expect(screen.getByText("Next cycle")).toBeInTheDocument();
});

it("shows a retryable error without presenting failed loads as zero progress", async () => {
  vi.mocked(getWikiStudy).mockRejectedValueOnce(new Error("Offline"));
  render(<WikiOverview onPractice={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load");
  expect(screen.queryByText("0% covered")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.getByText("56% covered")).toBeInTheDocument());
});
