import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { getBasicExercises, getDashboard, getLearningItems } from "./api";
import type { BasicExercise, Dashboard, LearningItem } from "./types";

vi.mock("./api", () => ({
  createLearningItem: vi.fn(),
  getBasicExercises: vi.fn(),
  getDashboard: vi.fn(),
  getLearningItems: vi.fn()
}));

/**
 * Mocked dashboard response used by component tests.
 */
const dashboard: Dashboard = {
  practicesToday: 0,
  practicesThisWeek: 0,
  dueReviewCount: 0,
  neverPracticedCount: 0,
  dueReviews: [],
  recentPractice: []
};

/**
 * Mocked Basics catalog response used by component tests.
 */
const basics: BasicExercise[] = [
  {
    slug: "kadane-algorithm",
    title: "Kadane's Algorithm",
    language: "C#",
    instructions: "Return the maximum subarray sum.",
    starterCode: "public static int MaxSubArray(int[] values)",
    functionSignature: "public static int MaxSubArray(int[] values)",
    referenceSolution: "return best;",
    tags: ["arrays", "dynamic-programming"]
  }
];

/**
 * Mocked learning item response used by component tests.
 */
const learningItems: LearningItem[] = [
  {
    id: "item-1",
    type: "Dsa",
    title: "Two Sum",
    description: "Hash map warmup.",
    status: "NotStarted",
    difficulty: "Easy",
    confidence: null,
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T12:00:00Z",
    lastPracticedAt: null,
    nextReviewAt: null,
    tags: ["hash-map"],
    totalAttempts: 0
  }
];

/**
 * Configures default API mocks before each component test.
 */
beforeEach(() => {
  vi.mocked(getDashboard).mockResolvedValue(dashboard);
  vi.mocked(getBasicExercises).mockResolvedValue(basics);
  vi.mocked(getLearningItems).mockResolvedValue(learningItems);
});

describe("App", () => {
  /**
   * Verifies that the manual refresh button is not rendered.
   */
  it("does not render a manual refresh button", async () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
  });

  /**
   * Verifies that users cannot choose Basics in the creation form.
   */
  it("allows creating only DSA and System Design items", async () => {
    render(<App />);

    const typeSelect = await screen.findByLabelText("Type");

    expect(typeSelect).toHaveTextContent("DSA");
    expect(typeSelect).toHaveTextContent("System Design");
    expect(typeSelect).not.toHaveTextContent("Basics");
  });

  /**
   * Verifies that built-in Basics exercises are displayed with a peekable solution.
   */
  it("renders built-in Basics exercises with reference solutions", async () => {
    render(<App />);

    expect(await screen.findByText("Kadane's Algorithm")).toBeInTheDocument();
    expect(screen.getByText("Peek solution")).toBeInTheDocument();
  });
});
