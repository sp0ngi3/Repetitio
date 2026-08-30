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
 * Represents the payload used to create a practice session.
 */
export interface CreatePracticeSessionRequest {
  /** Practiced learning item identifier. */
  learningItemId: string;
  /** Optional session start date and time. */
  startedAt?: string;
  /** Optional session completion date and time. */
  completedAt?: string;
  /** Optional duration in milliseconds. */
  durationMs?: number;
  /** Session outcome. */
  outcome: PracticeOutcome;
  /** Confidence value from 1 to 5. */
  confidence?: number | null;
  /** Free-form notes. */
  notes?: string;
  /** Source code submitted or drafted during the attempt. */
  sourceCode?: string;
  /** What helped during the attempt. */
  whatHelped?: string;
  /** What was difficult during the attempt. */
  whatWasDifficult?: string;
  /** What should be improved next time. */
  improveNext?: string;
}

/**
 * Represents a built-in Basics exercise.
 */
export interface BasicExercise {
  /** Stable exercise slug. */
  slug: string;
  /** Related learning item identifier used for practice tracking. */
  learningItemId: string;
  /** Exercise title. */
  title: string;
  /** Programming language used by the exercise. */
  language: string;
  /** Rough exercise difficulty. */
  difficulty: LearningDifficulty;
  /** Exercise instructions. */
  instructions: string;
  /** Detailed problem statement. */
  problemStatement: string;
  /** Worked examples for the exercise. */
  examples: string;
  /** Input constraints for the exercise. */
  constraints: string;
  /** Suggested test cases for local practice. */
  testCases: string;
  /** Short explanation of the intended approach. */
  approachGuide: string;
  /** Starter code shown to the user. */
  starterCode: string;
  /** Function signature expected by the exercise. */
  functionSignature: string;
  /** Reference solution that can be peeked by the user. */
  referenceSolution: string;
  /** Assigned tag names. */
  tags: string[];
  /** Current progress state. */
  status: LearningItemStatus;
  /** Current confidence value from 1 to 5. */
  confidence?: number | null;
  /** Last practice date and time. */
  lastPracticedAt?: string | null;
  /** Next review date and time. */
  nextReviewAt?: string | null;
  /** Total recorded practice attempts. */
  totalAttempts: number;
  /** Total successful solve attempts. */
  successfulAttempts: number;
  /** Practice sessions recorded for the exercise. */
  practiceSessions: PracticeSession[];
}

/**
 * Represents a Basics code execution request.
 */
export interface ExecuteBasicExerciseRequest {
  /** C# source code to compile and run. */
  sourceCode: string;
  /** Optional execution timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Represents one automated Basics test result.
 */
export interface BasicExerciseTestResult {
  /** Test case name. */
  name: string;
  /** Whether the test passed. */
  passed: boolean;
  /** Expected output for the test. */
  expected: string;
  /** Actual output from the submitted solution. */
  actual: string;
  /** Optional runtime error message. */
  error?: string | null;
}

/**
 * Represents the compilation and automated test result for a Basics submission.
 */
export interface ExecuteBasicExerciseResponse {
  /** Whether the source code compiled successfully. */
  compiled: boolean;
  /** Whether execution exceeded the timeout. */
  timedOut: boolean;
  /** Whether every automated test passed. */
  passed: boolean;
  /** Optional compiler output. */
  compilerOutput?: string | null;
  /** Optional runtime output. */
  runtimeOutput?: string | null;
  /** Automated test results. */
  testResults: BasicExerciseTestResult[];
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
  /** Source code submitted or drafted during the attempt. */
  sourceCode?: string | null;
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

/**
 * Represents the payload used to create a DSA problem.
 */
export interface CreateDsaProblemRequest {
  /** Problem title. */
  title: string;
  /** Optional short description. */
  description?: string;
  /** Problem source, such as LeetCode or a book. */
  source?: string;
  /** External problem URL. */
  externalUrl?: string;
  /** Rough problem difficulty. */
  difficulty: LearningDifficulty;
  /** Tag names to assign. */
  tags: string[];
  /** Problem statement or prompt. */
  problemStatement?: string;
  /** Test cases captured by the user. */
  testCases?: string;
  /** Assumptions made before solving. */
  assumptions?: string;
  /** Chosen solving approach. */
  approach?: string;
  /** Free-form personal notes. */
  notes?: string;
  /** What helped solve the problem. */
  whatHelped?: string;
  /** What was difficult about the problem. */
  whatWasDifficult?: string;
  /** What should be improved on the next attempt. */
  improveNext?: string;
  /** What should be known after solving the problem. */
  knowledgeChecklist?: string;
  /** Questions the user should have asked while solving. */
  questionsToAsk?: string;
  /** Missed mental steps from the solving process. */
  missedMentalSteps?: string;
  /** Expected time complexity. */
  expectedTimeComplexity?: string;
  /** Expected space complexity. */
  expectedSpaceComplexity?: string;
}

/**
 * Represents the payload used to update a DSA problem.
 */
export interface UpdateDsaProblemRequest extends CreateDsaProblemRequest {
  /** Current progress state. */
  status: LearningItemStatus;
  /** Current confidence value from 1 to 5. */
  confidence?: number | null;
}

/**
 * Represents the payload used to save a DSA solution.
 */
export interface CreateDsaSolutionRequest {
  /** Programming language used by the solution. */
  language: string;
  /** Source code for the solution. */
  sourceCode: string;
  /** Explanation of the solution. */
  explanation?: string;
  /** Time complexity. */
  timeComplexity?: string;
  /** Space complexity. */
  spaceComplexity?: string;
}

/**
 * Represents a saved DSA solution.
 */
export interface DsaSolution {
  /** Unique solution identifier. */
  id: string;
  /** Programming language used by the solution. */
  language: string;
  /** Source code for the solution. */
  sourceCode: string;
  /** Explanation of the solution. */
  explanation?: string | null;
  /** Time complexity. */
  timeComplexity?: string | null;
  /** Space complexity. */
  spaceComplexity?: string | null;
  /** Creation date and time. */
  createdAt: string;
}

/**
 * Represents a DSA problem returned by the API.
 */
export interface DsaProblem {
  /** Related learning item identifier. */
  id: string;
  /** Problem title. */
  title: string;
  /** Optional short description. */
  description?: string | null;
  /** Current progress state. */
  status: LearningItemStatus;
  /** Rough problem difficulty. */
  difficulty: LearningDifficulty;
  /** Current confidence value from 1 to 5. */
  confidence?: number | null;
  /** Last practice date and time. */
  lastPracticedAt?: string | null;
  /** Next review date and time. */
  nextReviewAt?: string | null;
  /** Number of recorded attempts. */
  totalAttempts: number;
  /** Number of successful attempts. */
  successfulAttempts: number;
  /** Problem source, such as LeetCode or a book. */
  source?: string | null;
  /** External problem URL. */
  externalUrl?: string | null;
  /** Assigned tag names. */
  tags: string[];
  /** Problem statement or prompt. */
  problemStatement?: string | null;
  /** Test cases captured by the user. */
  testCases?: string | null;
  /** Assumptions made before solving. */
  assumptions?: string | null;
  /** Chosen solving approach. */
  approach?: string | null;
  /** Free-form personal notes. */
  notes?: string | null;
  /** What helped solve the problem. */
  whatHelped?: string | null;
  /** What was difficult about the problem. */
  whatWasDifficult?: string | null;
  /** What should be improved on the next attempt. */
  improveNext?: string | null;
  /** What should be known after solving the problem. */
  knowledgeChecklist?: string | null;
  /** Questions the user should have asked while solving. */
  questionsToAsk?: string | null;
  /** Missed mental steps from the solving process. */
  missedMentalSteps?: string | null;
  /** Expected time complexity. */
  expectedTimeComplexity?: string | null;
  /** Expected space complexity. */
  expectedSpaceComplexity?: string | null;
  /** Saved solutions for the problem. */
  solutions: DsaSolution[];
  /** Practice sessions recorded for the problem. */
  practiceSessions: PracticeSession[];
}

/**
 * Represents the default DSA reflection template returned by the API.
 */
export interface DsaProblemTemplate {
  /** Problem statement template. */
  problemStatement: string;
  /** Test cases template. */
  testCases: string;
  /** Assumptions template. */
  assumptions: string;
  /** Approach template. */
  approach: string;
  /** Knowledge checklist template. */
  knowledgeChecklist: string;
  /** Self-question template. */
  questionsToAsk: string;
  /** Missed mental steps template. */
  missedMentalSteps: string;
}

/**
 * Represents the payload used to create a System Design problem.
 */
export interface CreateSystemDesignProblemRequest {
  /** Problem title. */
  title: string;
  /** Optional short description. */
  description?: string;
  /** Problem source, such as a course or interview list. */
  source?: string;
  /** External problem URL. */
  externalUrl?: string;
  /** Rough problem difficulty. */
  difficulty: LearningDifficulty;
  /** Tag names to assign. */
  tags: string[];
  /** Markdown prompt or scenario. */
  promptMarkdown?: string;
  /** Functional requirements in markdown. */
  functionalRequirementsMarkdown?: string;
  /** Non-functional requirements in markdown. */
  nonFunctionalRequirementsMarkdown?: string;
  /** Constraints and assumptions in markdown. */
  constraintsMarkdown?: string;
  /** Capacity estimates in markdown. */
  capacityEstimatesMarkdown?: string;
  /** API design notes in markdown. */
  apiDesignMarkdown?: string;
  /** Data model notes in markdown. */
  dataModelMarkdown?: string;
  /** Architecture notes in markdown. */
  architectureMarkdown?: string;
  /** Scaling strategy notes in markdown. */
  scalingStrategyMarkdown?: string;
  /** Tradeoff notes in markdown. */
  tradeoffsMarkdown?: string;
  /** Reflection notes in markdown. */
  reflectionMarkdown?: string;
  /** What helped solve or explain the design. */
  whatHelped?: string;
  /** What was difficult about the design. */
  whatWasDifficult?: string;
  /** What should be improved on the next attempt. */
  improveNext?: string;
}

/**
 * Represents the payload used to update a System Design problem.
 */
export interface UpdateSystemDesignProblemRequest extends CreateSystemDesignProblemRequest {
  /** Current progress state. */
  status: LearningItemStatus;
  /** Current confidence value from 1 to 5. */
  confidence?: number | null;
}

/**
 * Represents a System Design problem returned by the API.
 */
export interface SystemDesignProblem {
  /** Related learning item identifier. */
  id: string;
  /** Problem title. */
  title: string;
  /** Optional short description. */
  description?: string | null;
  /** Current progress state. */
  status: LearningItemStatus;
  /** Rough problem difficulty. */
  difficulty: LearningDifficulty;
  /** Current confidence value from 1 to 5. */
  confidence?: number | null;
  /** Last practice date and time. */
  lastPracticedAt?: string | null;
  /** Next review date and time. */
  nextReviewAt?: string | null;
  /** Number of recorded attempts. */
  totalAttempts: number;
  /** Number of successful attempts. */
  successfulAttempts: number;
  /** Problem source, such as a course or interview list. */
  source?: string | null;
  /** External problem URL. */
  externalUrl?: string | null;
  /** Assigned tag names. */
  tags: string[];
  /** Markdown prompt or scenario. */
  promptMarkdown?: string | null;
  /** Functional requirements in markdown. */
  functionalRequirementsMarkdown?: string | null;
  /** Non-functional requirements in markdown. */
  nonFunctionalRequirementsMarkdown?: string | null;
  /** Constraints and assumptions in markdown. */
  constraintsMarkdown?: string | null;
  /** Capacity estimates in markdown. */
  capacityEstimatesMarkdown?: string | null;
  /** API design notes in markdown. */
  apiDesignMarkdown?: string | null;
  /** Data model notes in markdown. */
  dataModelMarkdown?: string | null;
  /** Architecture notes in markdown. */
  architectureMarkdown?: string | null;
  /** Scaling strategy notes in markdown. */
  scalingStrategyMarkdown?: string | null;
  /** Tradeoff notes in markdown. */
  tradeoffsMarkdown?: string | null;
  /** Reflection notes in markdown. */
  reflectionMarkdown?: string | null;
  /** What helped solve or explain the design. */
  whatHelped?: string | null;
  /** What was difficult about the design. */
  whatWasDifficult?: string | null;
  /** What should be improved on the next attempt. */
  improveNext?: string | null;
  /** Practice sessions recorded for the problem. */
  practiceSessions: PracticeSession[];
}

/**
 * Represents the default System Design markdown template returned by the API.
 */
export interface SystemDesignProblemTemplate {
  /** Prompt template. */
  promptMarkdown: string;
  /** Functional requirements template. */
  functionalRequirementsMarkdown: string;
  /** Non-functional requirements template. */
  nonFunctionalRequirementsMarkdown: string;
  /** Constraints template. */
  constraintsMarkdown: string;
  /** Reflection template. */
  reflectionMarkdown: string;
}
