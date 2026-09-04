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

/**
 * Returns the CSS class used to visualize review urgency.
 *
 * @param nextReviewAt - Next scheduled review timestamp.
 * @param lastPracticedAt - Last practice timestamp used when no review is scheduled.
 * @param now - Current timestamp in milliseconds.
 * @returns A review urgency CSS class.
 */
export function getReviewDueClass(nextReviewAt?: string | null, lastPracticedAt?: string | null, now = Date.now()) {
  if (!nextReviewAt) {
    return lastPracticedAt ? "practice-age-warm" : "practice-age-stale";
  }

  const reviewAt = new Date(nextReviewAt).getTime();

  if (!Number.isFinite(reviewAt)) {
    return "practice-age-none";
  }

  const daysUntilReview = (reviewAt - now) / millisecondsPerDay;

  if (daysUntilReview <= 0) {
    return "practice-age-stale";
  }

  if (daysUntilReview <= 2) {
    return "practice-age-warm";
  }

  return "practice-age-fresh";
}
