/**
 * Saved local storage key for the default practice review interval.
 */
const reviewScheduleStorageKey = "repetitio-review-schedule";

/**
 * Review schedule presets offered by app settings.
 */
export type ReviewSchedulePreset = "one-week" | "two-weeks" | "one-month";

/**
 * Reads the saved review schedule preset.
 *
 * @returns The saved preset or the default one-month preset.
 */
export function readInitialReviewSchedulePreset(): ReviewSchedulePreset {
  const savedPreset = localStorage.getItem(reviewScheduleStorageKey);

  return isReviewSchedulePreset(savedPreset) ? savedPreset : "one-month";
}

/**
 * Saves the selected review schedule preset.
 *
 * @param preset - Selected preset.
 */
export function saveReviewSchedulePreset(preset: ReviewSchedulePreset) {
  localStorage.setItem(reviewScheduleStorageKey, preset);
}

/**
 * Creates the default next review date for a new practice attempt.
 *
 * @param preset - Selected review interval.
 * @param anchor - Date used as the schedule anchor.
 * @returns Date input value in yyyy-MM-dd format.
 */
export function createDefaultNextReviewDate(preset: ReviewSchedulePreset, anchor = new Date()) {
  const nextReviewAt = new Date(anchor);

  if (preset === "one-month") {
    nextReviewAt.setMonth(nextReviewAt.getMonth() + 1);
  } else {
    nextReviewAt.setDate(nextReviewAt.getDate() + (preset === "two-weeks" ? 14 : 7));
  }

  return formatDateInputValue(nextReviewAt);
}

/**
 * Converts a date input value to an API timestamp.
 *
 * @param value - Date input value.
 * @returns ISO timestamp for the selected date, or undefined when empty.
 */
export function toNextReviewTimestamp(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T12:00:00`).toISOString();
}

/**
 * Checks whether a raw value is a supported review schedule preset.
 *
 * @param value - Raw local storage value.
 * @returns True when the value is a review schedule preset.
 */
function isReviewSchedulePreset(value: string | null): value is ReviewSchedulePreset {
  return value === "one-week" || value === "two-weeks" || value === "one-month";
}

/**
 * Formats a date for an HTML date input.
 *
 * @param value - Date to format.
 * @returns Date input value.
 */
function formatDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
