import type { WikiStudyOverview } from "./types";

export function wikiStudyRows(overview: WikiStudyOverview | null, now = Date.now()) {
  return overview?.pages.filter(topic => !topic.isArchived && topic.effectiveReviewEnabled)
    .flatMap(topic => topic.modes.filter(mode => mode.total > 0).map(mode => ({
      topic,
      mode,
      due: !!mode.nextReviewAt && new Date(mode.nextReviewAt).getTime() <= now,
      never: !mode.lastPracticedAt,
      partial: mode.covered > 0 && mode.covered < mode.total,
      completed: !!mode.lastCompletedAt,
      needsPractice: Math.max(0, mode.covered - mode.correct)
    }))) ?? [];
}
