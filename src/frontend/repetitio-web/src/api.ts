import type {
  BasicExercise,
  CreateDsaProblemRequest,
  CreateDsaSolutionRequest,
  CreateLearningItemRequest,
  CreatePracticeSessionRequest,
  CreateSystemDesignProblemRequest,
  Dashboard,
  DsaProblem,
  DsaProblemTemplate,
  DsaSolution,
  ExecuteBasicExerciseRequest,
  ExecuteBasicExerciseResponse,
  LearningDifficulty,
  LearningItem,
  LearningItemStatus,
  PracticeSession,
  SystemDesignProblem,
  SystemDesignProblemTemplate,
  UpdateDsaProblemRequest,
  UpdateSystemDesignProblemRequest
} from "./types";

/**
 * Base URL used for backend API requests.
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5182";

/**
 * Sends a JSON request to the backend API.
 *
 * @param path - API path beginning with a slash.
 * @param init - Optional request initialization.
 * @returns Parsed JSON response.
 */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Loads the dashboard overview.
 *
 * @returns Dashboard metrics and recent practice data.
 */
export function getDashboard(): Promise<Dashboard> {
  return requestJson<Dashboard>("/api/dashboard");
}

/**
 * Loads all learning items.
 *
 * @returns Learning items sorted by review status and title.
 */
export function getLearningItems(): Promise<LearningItem[]> {
  return requestJson<LearningItem[]>("/api/items");
}

/**
 * Loads the built-in Basics exercise catalog.
 *
 * @returns Built-in Basics exercises.
 */
export function getBasicExercises(): Promise<BasicExercise[]> {
  return requestJson<BasicExercise[]>("/api/basics");
}

/**
 * Compiles and runs automated tests for a built-in Basics exercise.
 *
 * @param slug - Basics exercise slug.
 * @param request - Code execution payload.
 * @returns Compilation and automated test results.
 */
export function executeBasicExercise(
  slug: string,
  request: ExecuteBasicExerciseRequest
): Promise<ExecuteBasicExerciseResponse> {
  return requestJson<ExecuteBasicExerciseResponse>(`/api/basics/${slug}/execute`, {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Creates a learning item.
 *
 * @param request - Learning item creation payload.
 * @returns The created learning item.
 */
export function createLearningItem(request: CreateLearningItemRequest): Promise<LearningItem> {
  return requestJson<LearningItem>("/api/items", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Records a practice session.
 *
 * @param request - Practice session creation payload.
 * @returns The created practice session.
 */
export function createPracticeSession(request: CreatePracticeSessionRequest): Promise<PracticeSession> {
  return requestJson<PracticeSession>("/api/practice", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Loads DSA problems with optional filters.
 *
 * @param filters - Optional DSA list filters.
 * @returns DSA problems sorted by review status and title.
 */
export function getDsaProblems(filters: {
  status?: LearningItemStatus | "";
  difficulty?: LearningDifficulty | "";
  search?: string;
} = {}): Promise<DsaProblem[]> {
  const query = new URLSearchParams();

  if (filters.status) {
    query.set("status", filters.status);
  }

  if (filters.difficulty) {
    query.set("difficulty", filters.difficulty);
  }

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestJson<DsaProblem[]>(`/api/dsa${suffix}`);
}

/**
 * Loads a single DSA problem.
 *
 * @param id - DSA problem identifier.
 * @returns The matching DSA problem.
 */
export function getDsaProblem(id: string): Promise<DsaProblem> {
  return requestJson<DsaProblem>(`/api/dsa/${id}`);
}

/**
 * Loads the default DSA reflection template.
 *
 * @returns The DSA problem template.
 */
export function getDsaProblemTemplate(): Promise<DsaProblemTemplate> {
  return requestJson<DsaProblemTemplate>("/api/dsa/template");
}

/**
 * Creates a DSA problem.
 *
 * @param request - DSA problem creation payload.
 * @returns The created DSA problem.
 */
export function createDsaProblem(request: CreateDsaProblemRequest): Promise<DsaProblem> {
  return requestJson<DsaProblem>("/api/dsa", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Updates a DSA problem.
 *
 * @param id - DSA problem identifier.
 * @param request - DSA problem update payload.
 * @returns The updated DSA problem.
 */
export function updateDsaProblem(id: string, request: UpdateDsaProblemRequest): Promise<DsaProblem> {
  return requestJson<DsaProblem>(`/api/dsa/${id}`, {
    method: "PUT",
    body: JSON.stringify(request)
  });
}

/**
 * Deletes a DSA problem.
 *
 * @param id - DSA problem identifier.
 * @returns A promise that resolves when deletion completes.
 */
export async function deleteDsaProblem(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/dsa/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
}

/**
 * Saves a DSA solution for a problem.
 *
 * @param id - DSA problem identifier.
 * @param request - DSA solution creation payload.
 * @returns The created DSA solution.
 */
export function createDsaSolution(id: string, request: CreateDsaSolutionRequest): Promise<DsaSolution> {
  return requestJson<DsaSolution>(`/api/dsa/${id}/solutions`, {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Loads System Design problems with optional filters.
 *
 * @param filters - Optional System Design list filters.
 * @returns System Design problems sorted by review status and title.
 */
export function getSystemDesignProblems(filters: {
  status?: LearningItemStatus | "";
  difficulty?: LearningDifficulty | "";
  search?: string;
} = {}): Promise<SystemDesignProblem[]> {
  const query = new URLSearchParams();

  if (filters.status) {
    query.set("status", filters.status);
  }

  if (filters.difficulty) {
    query.set("difficulty", filters.difficulty);
  }

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestJson<SystemDesignProblem[]>(`/api/system-design${suffix}`);
}

/**
 * Loads the default System Design markdown template.
 *
 * @returns The System Design problem template.
 */
export function getSystemDesignProblemTemplate(): Promise<SystemDesignProblemTemplate> {
  return requestJson<SystemDesignProblemTemplate>("/api/system-design/template");
}

/**
 * Creates a System Design problem.
 *
 * @param request - System Design problem creation payload.
 * @returns The created System Design problem.
 */
export function createSystemDesignProblem(
  request: CreateSystemDesignProblemRequest
): Promise<SystemDesignProblem> {
  return requestJson<SystemDesignProblem>("/api/system-design", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Updates a System Design problem.
 *
 * @param id - System Design problem identifier.
 * @param request - System Design problem update payload.
 * @returns The updated System Design problem.
 */
export function updateSystemDesignProblem(
  id: string,
  request: UpdateSystemDesignProblemRequest
): Promise<SystemDesignProblem> {
  return requestJson<SystemDesignProblem>(`/api/system-design/${id}`, {
    method: "PUT",
    body: JSON.stringify(request)
  });
}

/**
 * Deletes a System Design problem.
 *
 * @param id - System Design problem identifier.
 * @returns A promise that resolves when deletion completes.
 */
export async function deleteSystemDesignProblem(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/system-design/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
}
