/**
 * Learning domains supported by the backend.
 */
export type LearningItemType = "Basics" | "Dsa" | "SystemDesign";

/**
 * Progress states supported by the backend.
 */
export type LearningItemStatus = "NotStarted" | "InProgress" | "Completed" | "Mastered";

/**
 * Difficulty values supported by the backend.
 */
export type LearningDifficulty = "Unknown" | "Easy" | "Medium" | "Hard";

/**
 * Practice outcomes supported by the backend.
 */
export type PracticeOutcome = "Failed" | "Partial" | "Completed" | "Passed";

/**
 * Represents a learning item returned by the API.
 */
export interface LearningItem {
  /** Unique learning item identifier. */
  id: string;
  /** Learning domain. */
  type: LearningItemType;
  /** Display title. */
  title: string;
  /** Optional longer description. */
  description?: string | null;
  /** Current progress state. */
  status: LearningItemStatus;
  /** Rough item difficulty. */
  difficulty: LearningDifficulty;
  /** Current confidence value from 1 to 5. */
  confidence?: number | null;
  /** Creation date and time. */
  createdAt: string;
  /** Last update date and time. */
  updatedAt: string;
  /** Last practice date and time. */
  lastPracticedAt?: string | null;
  /** Next review date and time. */
  nextReviewAt?: string | null;
  /** Assigned tag names. */
  tags: string[];
  /** Total recorded practice attempts. */
  totalAttempts: number;
}

/**
 * Represents the payload used to create a learning item.
 */
export interface CreateLearningItemRequest {
  /** Learning domain. */
  type: LearningItemType;
  /** Display title. */
  title: string;
  /** Optional longer description. */
  description?: string;
  /** Rough item difficulty. */
  difficulty: LearningDifficulty;
  /** Tag names to assign. */
  tags: string[];
}

/**
 * Represents a built-in Basics exercise.
 */
export interface BasicExercise {
  /** Stable exercise slug. */
  slug: string;
  /** Exercise title. */
  title: string;
  /** Programming language used by the exercise. */
  language: string;
  /** Exercise instructions. */
  instructions: string;
  /** Starter code shown to the user. */
  starterCode: string;
  /** Function signature expected by the exercise. */
  functionSignature: string;
  /** Reference solution that can be peeked by the user. */
  referenceSolution: string;
  /** Assigned tag names. */
  tags: string[];
}

/**
 * Represents a learning item due for review.
 */
export interface DueReviewItem {
  /** Unique learning item identifier. */
  id: string;
  /** Display title. */
  title: string;
  /** Learning domain. */
  type: LearningItemType;
  /** Last practice date and time. */
  lastPracticedAt?: string | null;
  /** Next review date and time. */
  nextReviewAt?: string | null;
  /** Current confidence value from 1 to 5. */
  confidence?: number | null;
}

/**
 * Represents a recorded practice session.
 */
export interface PracticeSession {
  /** Unique practice session identifier. */
  id: string;
  /** Practiced learning item identifier. */
  learningItemId: string;
  /** Practiced learning item title. */
  learningItemTitle: string;
  /** Session start date and time. */
  startedAt: string;
  /** Session completion date and time. */
  completedAt?: string | null;
  /** Duration in milliseconds. */
  durationMs?: number | null;
  /** Session outcome. */
  outcome: PracticeOutcome;
  /** Confidence value from 1 to 5. */
  confidence?: number | null;
  /** Free-form notes. */
  notes?: string | null;
  /** What helped during the attempt. */
  whatHelped?: string | null;
  /** What was difficult during the attempt. */
  whatWasDifficult?: string | null;
  /** What should be improved next time. */
  improveNext?: string | null;
  /** Creation date and time. */
  createdAt: string;
}

/**
 * Represents the dashboard overview returned by the API.
 */
export interface Dashboard {
  /** Number of sessions created today. */
  practicesToday: number;
  /** Number of sessions created during the last seven days. */
  practicesThisWeek: number;
  /** Number of items due for review. */
  dueReviewCount: number;
  /** Number of items that have never been practiced. */
  neverPracticedCount: number;
  /** Items due for review. */
  dueReviews: DueReviewItem[];
  /** Recent practice sessions. */
  recentPractice: PracticeSession[];
}
