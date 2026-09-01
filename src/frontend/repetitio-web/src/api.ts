import type {
  BackupStatus,
  BackupValidation,
  BasicExercise,
  CompleteFlashcardSessionRequest,
  CompleteFlashcardSessionResponse,
  CreateDsaProblemRequest,
  CreateDsaSolutionRequest,
  CreateFlashcardRequest,
  CreateLearningItemRequest,
  CreatePracticeSessionRequest,
  CreateSystemDesignProblemRequest,
  Dashboard,
  DsaProblem,
  DsaProblemTemplate,
  DsaSolution,
  ExecuteBasicExerciseRequest,
  ExecuteBasicExerciseResponse,
  Flashcard,
  FlashcardDeck,
  ImportFlashcardBatchRequest,
  ImportFlashcardBatchResponse,
  LearningDifficulty,
  LearningItem,
  LearningItemStatus,
  PracticeSession,
  SaveFlashcardDeckRequest,
  SystemDesignProblem,
  SystemDesignProblemTemplate,
  ImportBackupResult,
  CreateNotePageRequest,
  PagedFlashcardDeckResponse,
  PagedFlashcardResponse,
  NoteArea,
  NotePage,
  UpdateDsaProblemRequest,
  UpdateFlashcardRequest,
  UpdateNotePageRequest,
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
 * Loads flashcards with optional filters.
 *
 * @param filters - Optional flashcard list filters.
 * @returns Flashcards sorted by review status and title.
 */
export function getFlashcards(filters: {
  status?: LearningItemStatus | "";
  difficulty?: LearningDifficulty | "";
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedFlashcardResponse> {
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

  if (filters.page) {
    query.set("page", String(filters.page));
  }

  if (filters.pageSize) {
    query.set("pageSize", String(filters.pageSize));
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestJson<PagedFlashcardResponse>(`/api/flashcards${suffix}`);
}

/**
 * Creates a flashcard.
 *
 * @param request - Flashcard creation payload.
 * @returns The created flashcard.
 */
export function createFlashcard(request: CreateFlashcardRequest): Promise<Flashcard> {
  return requestJson<Flashcard>("/api/flashcards", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Imports many flashcards from one JSON payload.
 *
 * @param request - Batch import payload.
 * @returns Batch import summary.
 */
export function importFlashcardsBatch(request: ImportFlashcardBatchRequest): Promise<ImportFlashcardBatchResponse> {
  return requestJson<ImportFlashcardBatchResponse>("/api/flashcards/batch", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Updates a flashcard.
 *
 * @param id - Flashcard identifier.
 * @param request - Flashcard update payload.
 * @returns The updated flashcard.
 */
export function updateFlashcard(id: string, request: UpdateFlashcardRequest): Promise<Flashcard> {
  return requestJson<Flashcard>(`/api/flashcards/${id}`, {
    method: "PUT",
    body: JSON.stringify(request)
  });
}

/**
 * Deletes a flashcard.
 *
 * @param id - Flashcard identifier.
 * @returns A promise that resolves when deletion completes.
 */
export async function deleteFlashcard(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/flashcards/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
}

/**
 * Loads saved flashcard decks with optional search and pagination.
 *
 * @param filters - Optional saved session list filters.
 * @returns Paged saved flashcard decks.
 */
export function getFlashcardDecks(filters: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedFlashcardDeckResponse> {
  const query = new URLSearchParams();

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  if (filters.page) {
    query.set("page", String(filters.page));
  }

  if (filters.pageSize) {
    query.set("pageSize", String(filters.pageSize));
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestJson<PagedFlashcardDeckResponse>(`/api/flashcards/decks${suffix}`);
}

/**
 * Loads one saved flashcard deck with selected flashcards.
 *
 * @param id - Deck identifier.
 * @returns Saved flashcard deck.
 */
export function getFlashcardDeck(id: string): Promise<FlashcardDeck> {
  return requestJson<FlashcardDeck>(`/api/flashcards/decks/${id}`);
}

/**
 * Creates a saved flashcard deck.
 *
 * @param request - Deck creation payload.
 * @returns The created flashcard deck.
 */
export function createFlashcardDeck(request: SaveFlashcardDeckRequest): Promise<FlashcardDeck> {
  return requestJson<FlashcardDeck>("/api/flashcards/decks", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Updates a saved flashcard deck.
 *
 * @param id - Deck identifier.
 * @param request - Deck update payload.
 * @returns The updated flashcard deck.
 */
export function updateFlashcardDeck(id: string, request: SaveFlashcardDeckRequest): Promise<FlashcardDeck> {
  return requestJson<FlashcardDeck>(`/api/flashcards/decks/${id}`, {
    method: "PUT",
    body: JSON.stringify(request)
  });
}

/**
 * Deletes a saved flashcard deck.
 *
 * @param id - Deck identifier.
 * @returns A promise that resolves when deletion completes.
 */
export async function deleteFlashcardDeck(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/flashcards/decks/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
}

/**
 * Loads note pages with optional filters.
 *
 * @param filters - Optional note page filters.
 * @returns Matching note pages.
 */
export function getNotePages(filters: { area?: NoteArea | ""; search?: string } = {}): Promise<NotePage[]> {
  const query = new URLSearchParams();

  if (filters.area) {
    query.set("area", filters.area);
  }

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestJson<NotePage[]>(`/api/notes${suffix}`);
}

/**
 * Creates a note page.
 *
 * @param request - Note page creation payload.
 * @returns The created note page.
 */
export function createNotePage(request: CreateNotePageRequest): Promise<NotePage> {
  return requestJson<NotePage>("/api/notes", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

/**
 * Updates a note page.
 *
 * @param id - Note page identifier.
 * @param request - Note page update payload.
 * @returns The updated note page.
 */
export function updateNotePage(id: string, request: UpdateNotePageRequest): Promise<NotePage> {
  return requestJson<NotePage>(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(request)
  });
}

/**
 * Deletes a note page.
 *
 * @param id - Note page identifier.
 * @returns A promise that resolves when deletion completes.
 */
export async function deleteNotePage(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/notes/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
}

/**
 * Saves completed flashcard review results.
 *
 * @param request - Completed flashcard session payload.
 * @returns Saved session summary.
 */
export function completeFlashcardSession(
  request: CompleteFlashcardSessionRequest
): Promise<CompleteFlashcardSessionResponse> {
  return requestJson<CompleteFlashcardSessionResponse>("/api/flashcards/sessions/complete", {
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

/**
 * Loads the current backup system status.
 *
 * @returns Backup system status.
 */
export function getBackupStatus(): Promise<BackupStatus> {
  return requestJson<BackupStatus>("/api/backup/status");
}

/**
 * Exports the current data backup as a zip file.
 *
 * @returns The downloaded backup blob and its file name.
 */
export async function exportBackup(): Promise<{ blob: Blob; fileName: string }> {
  const response = await fetch(`${apiBaseUrl}/api/backup/export`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return {
    blob: await response.blob(),
    fileName: readFileName(response.headers.get("content-disposition")) ?? createFallbackBackupFileName()
  };
}

/**
 * Validates a backup file without importing it.
 *
 * @param file - Backup zip file selected by the user.
 * @returns Backup validation result.
 */
export function validateBackup(file: File): Promise<BackupValidation> {
  return postBackupFile<BackupValidation>("/api/backup/validate", file);
}

/**
 * Imports a validated backup file.
 *
 * @param file - Backup zip file selected by the user.
 * @returns Backup import result.
 */
export function importBackup(file: File): Promise<ImportBackupResult> {
  return postBackupFile<ImportBackupResult>("/api/backup/import", file);
}

/**
 * Uploads a backup file to an API endpoint.
 *
 * @param path - API path beginning with a slash.
 * @param file - Backup zip file selected by the user.
 * @returns Parsed JSON response.
 */
async function postBackupFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Reads a file name from a Content-Disposition header.
 *
 * @param value - Content-Disposition header value.
 * @returns The parsed file name when present.
 */
function readFileName(value: string | null) {
  const match = value?.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? match?.[2];

  return fileName ? decodeURIComponent(fileName) : null;
}

/**
 * Creates a fallback backup file name when the server header is unavailable.
 *
 * @returns A timestamped backup file name.
 */
function createFallbackBackupFileName() {
  return `repetitio-backup-${new Date().toISOString().slice(0, 10)}.zip`;
}
