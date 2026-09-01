/**
 * Number of milliseconds in one day.
 */
const millisecondsPerDay = 24 * 60 * 60 * 1000;

/**
 * Returns the CSS class used to visualize how old a practice timestamp is.
 *
 * @param lastPracticedAt - Last practice timestamp.
 * @param now - Current timestamp in milliseconds.
 * @returns A freshness CSS class.
 */
export function getPracticeAgeClass(lastPracticedAt?: string | null, now = Date.now()) {
  if (!lastPracticedAt) {
    return "practice-age-none";
  }

  const practicedAt = new Date(lastPracticedAt).getTime();

  if (!Number.isFinite(practicedAt)) {
    return "practice-age-none";
  }

  const ageInDays = Math.max(0, (now - practicedAt) / millisecondsPerDay);

  if (ageInDays <= 2) {
    return "practice-age-fresh";
  }

  if (ageInDays < 6) {
    return "practice-age-warm";
  }

  return "practice-age-stale";
}
