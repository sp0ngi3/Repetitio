import type { BasicExercise, CreateLearningItemRequest, Dashboard, LearningItem } from "./types";

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
