import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import {
  completeFlashcardSession,
  createFlashcard,
  createFlashcardDeck,
  createNotePage,
  deleteFlashcard,
  deleteFlashcardDeck,
  deleteNotePage,
  exportBackup,
  executeBasicExercise,
  getBackupStatus,
  getBasicExercises,
  getDashboard,
  getDsaProblemTemplate,
  getDsaProblems,
  getFlashcardDeck,
  getFlashcardDecks,
  getFlashcards,
  getLearningItems,
  getNotePages,
  getSystemDesignProblemTemplate,
  getSystemDesignProblems,
  importFlashcardsBatch,
  importBackup,
  updateFlashcard,
  updateFlashcardDeck,
  updateNotePage,
  validateBackup
} from "./api";
import type {
  BasicExercise,
  Dashboard,
  DsaProblem,
  DsaProblemTemplate,
  Flashcard,
  FlashcardDeck,
  FlashcardDeckSummary,
  LearningItem,
  NotePage,
  SystemDesignProblem,
  SystemDesignProblemTemplate
} from "./types";

vi.mock("./api", () => ({
  completeFlashcardSession: vi.fn(),
  createFlashcard: vi.fn(),
  createFlashcardDeck: vi.fn(),
  createNotePage: vi.fn(),
  createDsaProblem: vi.fn(),
  createDsaSolution: vi.fn(),
  createLearningItem: vi.fn(),
  createPracticeSession: vi.fn(),
  createSystemDesignProblem: vi.fn(),
  deleteFlashcard: vi.fn(),
  deleteFlashcardDeck: vi.fn(),
  deleteNotePage: vi.fn(),
  deleteDsaProblem: vi.fn(),
  deleteSystemDesignProblem: vi.fn(),
  exportBackup: vi.fn(),
  executeBasicExercise: vi.fn(),
  getBackupStatus: vi.fn(),
  getBasicExercises: vi.fn(),
  getDashboard: vi.fn(),
  getDsaProblemTemplate: vi.fn(),
  getDsaProblems: vi.fn(),
  getFlashcardDeck: vi.fn(),
  getFlashcardDecks: vi.fn(),
  getFlashcards: vi.fn(),
  getLearningItems: vi.fn(),
  getNotePages: vi.fn(),
  getSystemDesignProblemTemplate: vi.fn(),
  getSystemDesignProblems: vi.fn(),
  importFlashcardsBatch: vi.fn(),
  updateDsaProblem: vi.fn(),
  updateFlashcard: vi.fn(),
  updateFlashcardDeck: vi.fn(),
  updateNotePage: vi.fn(),
  updateSystemDesignProblem: vi.fn(),
  importBackup: vi.fn(),
  validateBackup: vi.fn()
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
 * Creates a mocked Basics exercise response for component tests.
 *
 * @param overrides - Exercise values to override.
 * @returns A mocked Basics exercise.
 */
function createBasicExercise(overrides: Partial<BasicExercise>): BasicExercise {
  return {
    slug: "reverse-linked-list",
    learningItemId: "basic-1",
    title: "Reverse Linked List",
    language: "C#",
    difficulty: "Easy",
    instructions: "Reverse a singly linked list.",
    problemStatement: "Reverse the list in place and return the new head.",
    examples: "Example panel content\nInput: 1 -> 2\nOutput: 2 -> 1",
    constraints: "Constraint panel content\n- The list may be empty.",
    testCases: "Reverse(null) => null",
    approachGuide: "Keep previous, current, and next pointers.",
    starterCode: "public static class Solution { public static ListNode? Reverse(ListNode? head) => head; }",
    functionSignature: "public static ListNode? Reverse(ListNode? head)",
    referenceSolution: "return previous;",
    tags: ["linked-list", "pointers"],
    status: "NotStarted",
    confidence: null,
    lastPracticedAt: null,
    nextReviewAt: null,
    totalAttempts: 0,
    successfulAttempts: 0,
    practiceSessions: [],
    ...overrides
  };
}

/**
 * Mocked Basics catalog response used by component tests.
 */
const basics: BasicExercise[] = [
  createBasicExercise({}),
  ...Array.from({ length: 12 }, (_, index) =>
    createBasicExercise({
      slug: `generated-basic-${index + 1}`,
      learningItemId: `basic-generated-${index + 1}`,
      title: `Generated Basic ${index + 1}`,
      instructions: `Practice generated pattern ${index + 1}.`,
      problemStatement: `Solve generated pattern ${index + 1}.`,
      functionSignature: `public static int Solve${index + 1}(int[] nums)`,
      tags: index % 2 === 0 ? ["array", "prefix-sum"] : ["binary-search"],
      successfulAttempts: index % 3
    })
  )
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
  },
  {
    id: "flashcard-1",
    type: "Flashcard",
    title: "CAP theorem",
    description: "Distributed systems flashcard.",
    status: "NotStarted",
    difficulty: "Medium",
    confidence: null,
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T12:00:00Z",
    lastPracticedAt: null,
    nextReviewAt: null,
    tags: ["system-design"],
    totalAttempts: 0
  }
];

/**
 * Mocked flashcard response used by component tests.
 */
const flashcards: Flashcard[] = [
  {
    id: "flashcard-1",
    title: "CAP theorem",
    description: "Distributed systems flashcard.",
    question: "What does CAP theorem say?",
    explanation: "A distributed system can provide at most two of consistency, availability, and partition tolerance.",
    source: "System Design",
    status: "NotStarted",
    difficulty: "Medium",
    confidence: null,
    lastPracticedAt: null,
    nextReviewAt: null,
    tags: ["system-design"],
    totalReviews: 0,
    knownReviews: 0,
    practiceSessions: []
  },
  {
    id: "flashcard-2",
    title: "Binary search invariant",
    description: "Algorithm flashcard.",
    question: "What invariant should binary search preserve?",
    explanation: "The answer stays inside the current low-high search interval.",
    source: "Basics",
    status: "InProgress",
    difficulty: "Easy",
    confidence: 3,
    lastPracticedAt: null,
    nextReviewAt: null,
    tags: ["binary-search"],
    totalReviews: 1,
    knownReviews: 1,
    practiceSessions: []
  },
  ...Array.from({ length: 11 }, (_, index) => ({
    id: `flashcard-generated-${index + 1}`,
    title: `Generated Flashcard ${index + 1}`,
    description: "Generated flashcard.",
    question: `Question ${index + 1}?`,
    explanation: `Explanation ${index + 1}.`,
    source: "Generated",
    status: "NotStarted" as const,
    difficulty: "Easy" as const,
    confidence: null,
    lastPracticedAt: null,
    nextReviewAt: null,
    tags: ["generated"],
    totalReviews: 0,
    knownReviews: 0,
    practiceSessions: []
  }))
];

/**
 * Mocked saved flashcard learning sessions used by component tests.
 */
const flashcardDecks: FlashcardDeck[] = [
  {
    id: "deck-1",
    name: "Interview flashcards",
    description: "Mixed review.",
    cards: flashcards,
    defaultSessionSize: 25,
    totalRuns: 2,
    totalReviews: 4,
    knownReviews: 3,
    lastPracticedAt: "2026-08-30T12:00:00Z",
    nextReviewAt: "2026-09-06T12:00:00Z",
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T12:00:00Z"
  }
];

/**
 * Mocked lightweight saved session response used by paginated dashboard tests.
 */
const flashcardDeckSummaries: FlashcardDeckSummary[] = flashcardDecks.map((deck) => ({
  id: deck.id,
  name: deck.name,
  description: deck.description,
  cardCount: deck.cards.length,
  defaultSessionSize: deck.defaultSessionSize,
  totalRuns: deck.totalRuns,
  totalReviews: deck.totalReviews,
  knownReviews: deck.knownReviews,
  lastPracticedAt: deck.lastPracticedAt,
  nextReviewAt: deck.nextReviewAt,
  createdAt: deck.createdAt,
  updatedAt: deck.updatedAt
}));

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
 * Mocked System Design problem response used by component tests.
 */
const systemDesignProblems: SystemDesignProblem[] = [
  {
    id: "system-1",
    title: "Design a Rate Limiter",
    description: "Token bucket and distributed counters.",
    status: "InProgress",
    difficulty: "Medium",
    confidence: 3,
    lastPracticedAt: null,
    nextReviewAt: null,
    totalAttempts: 1,
    successfulAttempts: 1,
    source: "Personal",
    externalUrl: null,
    tags: ["rate-limiting", "redis"],
    promptMarkdown: "## Scenario\nLimit API requests per user.",
    functionalRequirementsMarkdown: "- Allow requests under limit",
    nonFunctionalRequirementsMarkdown: "- Low latency",
    constraintsMarkdown: "- Distributed clients",
    capacityEstimatesMarkdown: "1000 QPS",
    apiDesignMarkdown: "POST /requests/check",
    dataModelMarkdown: "key: user window",
    architectureMarkdown: "API -> Redis -> workers",
    scalingStrategyMarkdown: "Shard counters",
    tradeoffsMarkdown: "Accuracy vs latency",
    reflectionMarkdown: "## Gaps\nExplain burst handling better.",
    whatHelped: "Drawing the data flow.",
    whatWasDifficult: "Choosing consistency model.",
    improveNext: "Practice global limits.",
    practiceSessions: [
      {
        id: "attempt-1",
        learningItemId: "system-1",
        learningItemTitle: "Design a Rate Limiter",
        startedAt: "2026-08-30T12:00:00Z",
        completedAt: "2026-08-30T12:45:00Z",
        durationMs: 2700000,
        outcome: "Completed",
        confidence: 3,
        notes: "Covered core flow.",
        sourceCode: null,
        whatHelped: "Drawing the data flow.",
        whatWasDifficult: "Choosing consistency model.",
        improveNext: "Practice global limits.",
        createdAt: "2026-08-30T12:45:00Z"
      }
    ]
  }
];

/**
 * Mocked System Design template response used by component tests.
 */
const systemDesignTemplate: SystemDesignProblemTemplate = {
  promptMarkdown: "## Scenario\nDesign ...",
  functionalRequirementsMarkdown: "- Users can ...",
  nonFunctionalRequirementsMarkdown: "- Availability:",
  constraintsMarkdown: "- Traffic assumptions:",
  reflectionMarkdown: "## What went well"
};

/**
 * Mocked note pages used by component tests.
 */
const notePages: NotePage[] = [
  {
    id: "note-dsa",
    area: "Dsa",
    title: "DSA Notes",
    contentMarkdown: "## DSA Notes\n\nRemember invariants.",
    sortOrder: 0,
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T12:00:00Z"
  },
  {
    id: "note-system-design",
    area: "SystemDesign",
    title: "System Design Notes",
    contentMarkdown: "## System Design Notes\n\nClarify requirements first.",
    sortOrder: 0,
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T12:00:00Z"
  },
  {
    id: "note-other",
    area: "Other",
    title: "Other Notes",
    contentMarkdown: "## Other Notes",
    sortOrder: 0,
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T12:00:00Z"
  }
];

/**
 * Mocked backup status response used by component tests.
 */
const backupStatus = {
  databasePath: "C:/Users/studn/Desktop/Repetitio/data/repetitio.db",
  databaseExists: true,
  backupDirectory: "C:/Users/studn/Desktop/Repetitio/backups",
  databaseSchemaVersion: "20260830193638_AddSystemDesignTracker"
};

/**
 * Configures default API mocks before each component test.
 */
beforeEach(() => {
  localStorage.clear();
  vi.mocked(getDashboard).mockResolvedValue(dashboard);
  vi.mocked(getBasicExercises).mockResolvedValue(basics);
  vi.mocked(getLearningItems).mockResolvedValue(learningItems);
  vi.mocked(getDsaProblems).mockResolvedValue(dsaProblems);
  vi.mocked(getDsaProblemTemplate).mockResolvedValue(dsaTemplate);
  vi.mocked(getFlashcards).mockImplementation(async (filters = {}) => {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";
    const filteredCards = normalizedSearch
      ? flashcards.filter((card) =>
          [card.title, card.question, card.explanation, card.source ?? "", ...card.tags]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)
        )
      : flashcards;
    const start = (page - 1) * pageSize;

    return {
      items: filteredCards.slice(start, start + pageSize),
      totalCount: filteredCards.length,
      page,
      pageSize
    };
  });
  vi.mocked(getFlashcardDeck).mockResolvedValue(flashcardDecks[0]);
  vi.mocked(getFlashcardDecks).mockImplementation(async (filters = {}) => {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";
    const filteredDecks = normalizedSearch
      ? flashcardDeckSummaries.filter((deck) =>
          [deck.name, deck.description ?? ""].join(" ").toLowerCase().includes(normalizedSearch)
        )
      : flashcardDeckSummaries;
    const start = (page - 1) * pageSize;

    return {
      items: filteredDecks.slice(start, start + pageSize),
      totalCount: filteredDecks.length,
      page,
      pageSize
    };
  });
  vi.mocked(getSystemDesignProblems).mockResolvedValue(systemDesignProblems);
  vi.mocked(getSystemDesignProblemTemplate).mockResolvedValue(systemDesignTemplate);
  vi.mocked(getNotePages).mockResolvedValue(notePages);
  vi.mocked(createNotePage).mockResolvedValue({
    id: "note-new",
    area: "Dsa",
    title: "Two pointers",
    contentMarkdown: "Fast and slow pointer reminders.",
    sortOrder: 1,
    createdAt: "2026-08-30T13:00:00Z",
    updatedAt: "2026-08-30T13:00:00Z"
  });
  vi.mocked(updateNotePage).mockImplementation(async (id, request) => ({
    id,
    area: request.area,
    title: request.title,
    contentMarkdown: request.contentMarkdown ?? "",
    sortOrder: request.sortOrder,
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T13:00:00Z"
  }));
  vi.mocked(deleteNotePage).mockResolvedValue();
  vi.mocked(getBackupStatus).mockResolvedValue(backupStatus);
  vi.mocked(exportBackup).mockResolvedValue({
    blob: new Blob(["backup"], { type: "application/zip" }),
    fileName: "repetitio-backup-2026-08-30.zip"
  });
  vi.mocked(validateBackup).mockResolvedValue({
    isValid: true,
    message: "Backup is valid.",
    manifest: {
      application: "Repetitio",
      schemaVersion: 1,
      createdAt: "2026-08-30T14:30:00Z",
      databaseSchemaVersion: "20260830193638_AddSystemDesignTracker"
    }
  });
  vi.mocked(importBackup).mockResolvedValue({
    imported: true,
    message: "Backup imported successfully.",
    preImportBackupFileName: "repetitio-pre-import-2026-08-30-143000.zip",
    validation: {
      isValid: true,
      message: "Backup is valid."
    }
  });
  vi.mocked(createFlashcard).mockResolvedValue(flashcards[0]);
  vi.mocked(importFlashcardsBatch).mockResolvedValue({
    requestedCount: 1,
    importedCount: 1,
    flashcardIds: ["flashcard-imported-1"]
  });
  vi.mocked(updateFlashcard).mockResolvedValue(flashcards[0]);
  vi.mocked(deleteFlashcard).mockResolvedValue();
  vi.mocked(createFlashcardDeck).mockResolvedValue(flashcardDecks[0]);
  vi.mocked(updateFlashcardDeck).mockResolvedValue(flashcardDecks[0]);
  vi.mocked(deleteFlashcardDeck).mockResolvedValue();
  vi.mocked(completeFlashcardSession).mockResolvedValue({
    savedReviews: 1,
    knownAnswers: 1,
    missedAnswers: 0
  });
  vi.mocked(executeBasicExercise).mockResolvedValue({
    compiled: true,
    timedOut: false,
    passed: true,
    compilerOutput: null,
    runtimeOutput: null,
    testResults: [
      {
        name: "two nodes",
        passed: true,
        expected: "2 -> 1",
        actual: "2 -> 1",
        error: null
      }
    ]
  });
});

describe("App", () => {
  /**
   * Verifies that backup settings expose export and import controls.
   */
  it("renders backup settings", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByRole("heading", { name: "Backup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate Backup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import Data" })).toBeInTheDocument();
  });

  /**
   * Verifies that the manual refresh button is not rendered.
   */
  it("does not render a manual refresh button", async () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
    expect(await screen.findByText("Learning areas")).toBeInTheDocument();
  });

  /**
   * Verifies that the application shell can switch to dark mode.
   */
  it("toggles dark mode", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("repetitio-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  /**
   * Verifies that System Design has its own dashboard.
   */
  it("renders the dedicated System Design dashboard", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "System Design" }));

    expect(await screen.findByRole("heading", { name: "Problems" })).toBeInTheDocument();
    expect(await screen.findByText("Design a Rate Limiter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add problem" })).toBeInTheDocument();
  });

  /**
   * Verifies that the System Design add flow opens one large markdown document editor.
   */
  it("opens the System Design add problem page", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "System Design" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add problem" }));

    expect(await screen.findByRole("heading", { name: "Add problem" })).toBeInTheDocument();
    expect(screen.getByText("Design document")).toBeInTheDocument();
    expect(screen.queryByLabelText("Markdown preview")).not.toBeInTheDocument();
  });

  /**
   * Verifies that the System Design detail page includes practice reflection and previous attempts.
   */
  it("opens System Design detail with reflection and previous attempts", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "System Design" }));
    fireEvent.click(await screen.findByText("Design a Rate Limiter"));

    expect(await screen.findByRole("heading", { name: "Attempt design" })).toBeInTheDocument();
    expect(screen.getByText("Previous attempts")).toBeInTheDocument();
    expect(screen.getByText("Covered core flow.")).toBeInTheDocument();
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
   * Verifies that the Flashcards page exposes cards and saved learning sessions.
   */
  it("renders flashcards and starts a learning session", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));

      expect(await screen.findByRole("heading", { name: "Cards" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /CAP theorem/i })).toBeInTheDocument();
      expect(screen.getByText("Interview flashcards")).toBeInTheDocument();

      fireEvent.change(screen.getByDisplayValue("25"), { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      fireEvent.click(await screen.findByRole("button", { name: "Flip" }));

      expect(screen.getByText(/low-high search interval/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Knew it" }));

      expect(completeFlashcardSession).toHaveBeenCalledWith({
        deckId: "deck-1",
        reviews: [
          {
            flashcardId: "flashcard-2",
            knewAnswer: true,
            confidence: 4
          }
        ]
      });
    } finally {
      randomSpy.mockRestore();
    }
  });

  /**
   * Verifies that the Notes page supports notebook pages.
   */
  it("renders and creates notebook pages", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Notes" }));

    expect(await screen.findByRole("heading", { name: "Notebook" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "DSA Notes" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Remember invariants/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New page" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Two pointers" } });
    fireEvent.change(screen.getByLabelText("Page"), { target: { value: "Fast and slow pointer reminders." } });
    fireEvent.click(screen.getByRole("button", { name: "Save page" }));

    expect(createNotePage).toHaveBeenCalledWith({
      area: "Dsa",
      title: "Two pointers",
      contentMarkdown: "Fast and slow pointer reminders."
    });
  });

  /**
   * Verifies that the global Notes companion can be opened from any page.
   */
  it("opens the global notes companion", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open notes companion" }));

    expect(await screen.findByRole("complementary", { name: "Global notes" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Remember invariants/i)).toBeInTheDocument();
  });

  /**
   * Verifies that the Flashcards page can create a new card and saved learning session.
   */
  it("creates flashcards and saved learning sessions", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add flashcard" }));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Redis eviction" } });
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: "What is LRU?" } });
    fireEvent.change(screen.getByLabelText("Explanation"), { target: { value: "Least recently used eviction." } });
    fireEvent.click(screen.getByRole("button", { name: "Save flashcard" }));

    expect(createFlashcard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Redis eviction",
        question: "What is LRU?",
        explanation: "Least recently used eviction."
      })
    );

    fireEvent.click(await screen.findByRole("button", { name: "Create learning session" }));
    fireEvent.change(screen.getByLabelText("Session name"), { target: { value: "System Design deck" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: /CAP theorem/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save learning session" }));

    expect(createFlashcardDeck).toHaveBeenCalledWith({
      name: "System Design deck",
      description: "",
      defaultSessionSize: 25,
      flashcardIds: ["flashcard-1"]
    });
  });

  /**
   * Verifies that Flashcards can import a batch JSON file.
   */
  it("imports flashcards from a JSON file", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));
    fireEvent.click(await screen.findByRole("button", { name: "JSON structure" }));

    expect(screen.getByRole("heading", { name: "JSON structure" })).toBeInTheDocument();
    expect(screen.getByText(/"flashcards"/i)).toBeInTheDocument();

    const file = new File(
      [
        JSON.stringify({
          flashcards: [
            {
              title: "TCP handshake",
              question: "What are the TCP handshake steps?",
              explanation: "SYN, SYN-ACK, ACK.",
              source: "Networking",
              difficulty: "Medium",
              tags: ["networking", "tcp"]
            },
            {
              title: "Throwaway card",
              question: "Should this be imported?",
              explanation: "No.",
              difficulty: "Easy",
              tags: ["scratch"]
            }
          ]
        })
      ],
      "flashcards.json",
      { type: "application/json" }
    );

    fireEvent.change(screen.getByLabelText("Batch import"), { target: { files: [file] } });

    expect(await screen.findByText(/Loaded 2 flashcards/i)).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("TCP handshake"), {
      target: { value: "TCP three-way handshake" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Import reviewed flashcards" }));

    expect(await screen.findByText(/Imported 1 flashcard/i)).toBeInTheDocument();
    expect(importFlashcardsBatch).toHaveBeenCalledWith({
      flashcards: [
        {
          title: "TCP three-way handshake",
          question: "What are the TCP handshake steps?",
          explanation: "SYN, SYN-ACK, ACK.",
          source: "Networking",
          description: "",
          difficulty: "Medium",
          tags: ["networking", "tcp"]
        }
      ]
    });
  });

  /**
   * Verifies that the Flashcards dashboard paginates card records.
   */
  it("paginates flashcards", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));

    expect(await screen.findByText("Showing 1-10 of 13")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Generated Flashcard 9/i })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("navigation", { name: "Flashcards pagination" }).querySelector("button:not([disabled]):last-child") as HTMLButtonElement
    );

    expect(await screen.findByRole("button", { name: /Generated Flashcard 9/i })).toBeInTheDocument();
  });

  /**
   * Verifies that saved Flashcard learning sessions can be edited and deleted.
   */
  it("edits and deletes saved flashcard learning sessions", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("heading", { name: "Edit learning session" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Session name"), { target: { value: "Core interview cards" } });
    fireEvent.change(screen.getByLabelText("Default cards per run"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save learning session" }));

    expect(updateFlashcardDeck).toHaveBeenCalledWith(
      "deck-1",
      expect.objectContaining({
        name: "Core interview cards",
        defaultSessionSize: 30,
        flashcardIds: expect.arrayContaining(["flashcard-1", "flashcard-2"])
      })
    );

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("heading", { name: "Edit learning session" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteFlashcardDeck).toHaveBeenCalledWith("deck-1");
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
   * Verifies that built-in Basics exercises use the tracker-style dashboard and detail page.
   */
  it("renders built-in Basics as a dashboard with a detail page", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Basics" }));

    expect(await screen.findByRole("heading", { name: "Exercises" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reverse Linked List" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reverse Linked List"));

    expect(screen.getByText("Peek solution")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attempt exercise" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run tests" })).toBeInTheDocument();
  });

  /**
   * Verifies that Basics dashboard search, hashtag filtering, and pagination work together.
   */
  it("filters and paginates the Basics dashboard", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Basics" }));

    expect(await screen.findByRole("heading", { name: "Exercises" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1-10 of 13")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generated Basic 10" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByRole("button", { name: "Generated Basic 10" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "Generated Basic 12" } });

    expect(screen.getByRole("button", { name: "Generated Basic 12" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reverse Linked List" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "#linked-list" }));

    expect(screen.getByRole("button", { name: "Reverse Linked List" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generated Basic 1" })).not.toBeInTheDocument();
  });

  /**
   * Verifies that Basics prompt tabs switch between examples and constraints.
   */
  it("switches Basics prompt tabs", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Basics" }));
    fireEvent.click(await screen.findByText("Reverse Linked List"));
    fireEvent.click(screen.getByRole("tab", { name: "Examples" }));

    expect(screen.getByText(/Example panel content/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Constraints" }));

    expect(screen.getByText(/Constraint panel content/i)).toBeInTheDocument();
  });

  /**
   * Verifies that Basics can execute automated tests from the detail page.
   */
  it("runs Basics automated tests from the code editor", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Basics" }));
    fireEvent.click(await screen.findByText("Reverse Linked List"));
    fireEvent.click(screen.getByRole("button", { name: "Run tests" }));

    expect(await screen.findByText("All tests passed")).toBeInTheDocument();
    expect(screen.getByText("two nodes")).toBeInTheDocument();
  });

  /**
   * Verifies that the Basics code editor handles Tab as indentation.
   */
  it("inserts indentation when Tab is pressed in the Basics code editor", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Basics" }));
    fireEvent.click(await screen.findByText("Reverse Linked List"));

    const editor = screen.getByLabelText("Code") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "public static class Solution\n{\n}" } });
    editor.setSelectionRange("public static class Solution\n{\n".length, "public static class Solution\n{\n".length);
    fireEvent.keyDown(editor, { key: "Tab" });

    expect(editor.value).toContain("{\n    }");
  });
});
