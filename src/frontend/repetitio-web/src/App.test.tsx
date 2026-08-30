import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { getBasicExercises, getDashboard, getDsaProblemTemplate, getDsaProblems, getLearningItems } from "./api";
import type { BasicExercise, Dashboard, DsaProblem, DsaProblemTemplate, LearningItem } from "./types";

vi.mock("./api", () => ({
  createDsaProblem: vi.fn(),
  createDsaSolution: vi.fn(),
  createLearningItem: vi.fn(),
  deleteDsaProblem: vi.fn(),
  getBasicExercises: vi.fn(),
  getDashboard: vi.fn(),
  getDsaProblemTemplate: vi.fn(),
  getDsaProblems: vi.fn(),
  getLearningItems: vi.fn(),
  updateDsaProblem: vi.fn()
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
 * Mocked DSA problem response used by component tests.
 */
const dsaProblems: DsaProblem[] = [
  {
    id: "dsa-1",
    title: "Valid Parentheses",
    description: "Stack warmup.",
    status: "InProgress",
    difficulty: "Easy",
    confidence: 3,
    lastPracticedAt: null,
    nextReviewAt: null,
    totalAttempts: 2,
    successfulAttempts: 1,
    source: "LeetCode",
    externalUrl: null,
    tags: ["stack"],
    problemStatement: null,
    testCases: null,
    assumptions: null,
    approach: null,
    notes: null,
    whatHelped: null,
    whatWasDifficult: null,
    improveNext: null,
    knowledgeChecklist: null,
    questionsToAsk: null,
    missedMentalSteps: null,
    expectedTimeComplexity: "O(n)",
    expectedSpaceComplexity: "O(n)",
    solutions: [],
    practiceSessions: []
  }
];

/**
 * Mocked DSA template response used by component tests.
 */
const dsaTemplate: DsaProblemTemplate = {
  problemStatement: "Restate the problem.",
  testCases: "Capture examples.",
  assumptions: "Write assumptions.",
  approach: "Explain the approach.",
  knowledgeChecklist: "Know the pattern.",
  questionsToAsk: "Ask about constraints.",
  missedMentalSteps: "Track missed steps."
};

/**
 * Configures default API mocks before each component test.
 */
beforeEach(() => {
  vi.mocked(getDashboard).mockResolvedValue(dashboard);
  vi.mocked(getBasicExercises).mockResolvedValue(basics);
  vi.mocked(getLearningItems).mockResolvedValue(learningItems);
  vi.mocked(getDsaProblems).mockResolvedValue(dsaProblems);
  vi.mocked(getDsaProblemTemplate).mockResolvedValue(dsaTemplate);
});

describe("App", () => {
  /**
   * Verifies that the manual refresh button is not rendered.
   */
  it("does not render a manual refresh button", async () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
    expect(await screen.findByText("Learning areas")).toBeInTheDocument();
  });

  /**
   * Verifies that System Design has its own dashboard.
   */
  it("renders the dedicated System Design dashboard", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "System Design" }));

    expect(await screen.findByRole("heading", { name: "Topics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add topic" })).toBeInTheDocument();
  });

  /**
   * Verifies that the DSA page can be opened from navigation.
   */
  it("renders the dedicated DSA tracker page", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "DSA" }));

    expect(await screen.findByRole("heading", { name: "Problems" })).toBeInTheDocument();
    expect(await screen.findByText("Valid Parentheses")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add problem" })).toBeInTheDocument();
  });

  /**
   * Verifies that the DSA add flow opens a dedicated page.
   */
  it("opens the DSA add problem page", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "DSA" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add problem" }));

    expect(await screen.findByRole("heading", { name: "Add problem" })).toBeInTheDocument();
    expect(screen.getByLabelText("Problem statement")).toBeInTheDocument();
  });

  /**
   * Verifies that built-in Basics exercises are displayed with a peekable solution.
   */
  it("renders built-in Basics exercises with reference solutions", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Basics" }));

    expect(await screen.findByText("Kadane's Algorithm")).toBeInTheDocument();
    expect(screen.getByText("Peek solution")).toBeInTheDocument();
  });
});
