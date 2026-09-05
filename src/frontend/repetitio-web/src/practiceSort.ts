/**
 * Dashboard sort modes for last practice recency.
 */
export type LastPracticedSort = "never-first" | "oldest" | "newest";

/**
 * Sorts records by their last practice timestamp without mutating the source list.
 *
 * @param items - Records with optional last practice timestamps.
 * @param sort - Selected last practice sort mode.
 * @returns Sorted records.
 */
export function sortByLastPracticed<T extends { lastPracticedAt?: string | null }>(
  items: T[],
  sort: LastPracticedSort
) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const comparison = compareLastPracticed(left.item.lastPracticedAt, right.item.lastPracticedAt, sort);
      return comparison || left.index - right.index;
    })
    .map(({ item }) => item);
}

/**
 * Compares optional last practice timestamps for dashboard sorting.
 *
 * @param left - Left timestamp.
 * @param right - Right timestamp.
 * @param sort - Selected last practice sort mode.
 * @returns Sort comparison value.
 */
function compareLastPracticed(left: string | null | undefined, right: string | null | undefined, sort: LastPracticedSort) {
  const leftTime = getTimestamp(left);
  const rightTime = getTimestamp(right);

  if (sort === "never-first") {
    if (leftTime === null && rightTime === null) {
      return 0;
    }

    if (leftTime === null) {
      return -1;
    }

    if (rightTime === null) {
      return 1;
    }

    return leftTime - rightTime;
  }

  if (leftTime === null && rightTime === null) {
    return 0;
  }

  if (leftTime === null) {
    return 1;
  }

  if (rightTime === null) {
    return -1;
  }

  return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
}

/**
 * Parses an optional timestamp for sorting.
 *
 * @param value - Optional ISO timestamp.
 * @returns Milliseconds since epoch, or null when missing or invalid.
 */
function getTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}
