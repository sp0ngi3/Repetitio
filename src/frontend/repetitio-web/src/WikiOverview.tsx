import { useEffect, useState } from "react";
import { getWikiStudy } from "./api";
import type { WikiStudyModeProgress, WikiStudyOverview } from "./types";
import { wikiStudyRows } from "./wikiStudyProgress";
import "./wiki.css";

type StudyFilter = "todo" | "due" | "improve" | "never" | "partial" | "completed" | "all";
const filters: [StudyFilter, string][] = [
  ["todo", "To do"], ["due", "Due"], ["improve", "Needs practice"],
  ["never", "Never practiced"], ["partial", "In progress"],
  ["completed", "Completed at least once"], ["all", "All"]
];
const pageSize = 8;

export function WikiOverview({ onPractice }: {
  onPractice: (pageId: string, kind: WikiStudyModeProgress["kind"]) => void;
}) {
  const [overview, setOverview] = useState<WikiStudyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StudyFilter>("todo");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await getWikiStudy();
        if (active) { setOverview(result); setError(null); }
      } catch {
        if (active) setError("Unable to load Wiki study progress.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const refresh = () => { void load(); };
    window.addEventListener("wiki-study-updated", refresh);
    return () => { active = false; window.removeEventListener("wiki-study-updated", refresh); };
  }, [reload]);

  const rows = wikiStudyRows(overview);
  const total = rows.reduce((sum, row) => sum + row.mode.total, 0);
  const covered = rows.reduce((sum, row) => sum + row.mode.covered, 0);
  const correct = rows.reduce((sum, row) => sum + row.mode.correct, 0);
  const coverage = total ? Math.round(covered / total * 100) : 0;
  const priority = (row: typeof rows[number]) => row.due ? 0 : row.needsPractice ? 1 : row.partial ? 2 : row.never ? 3 : 4;
  const filtered = rows.filter(row => {
    if (!(row.topic.title + " " + row.topic.path).toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filter === "todo") return row.due || row.needsPractice > 0 || row.never || row.mode.covered < row.mode.total;
    if (filter === "improve") return row.needsPractice > 0;
    return filter === "all" || row[filter];
  }).sort((a, b) => priority(a) - priority(b)
    || (a.mode.nextReviewAt ?? "").localeCompare(b.mode.nextReviewAt ?? "")
    || (a.mode.lastPracticedAt ?? "").localeCompare(b.mode.lastPracticedAt ?? "")
    || a.topic.path.localeCompare(b.topic.path));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  return <section className="wiki-overview" aria-labelledby="wiki-overview-title">
    <header className="section-heading">
      <div><p className="eyebrow">Knowledge practice</p><h2 id="wiki-overview-title">Wiki study</h2></div>
      {overview ? <span className="confidence">{new Set(rows.map(row => row.topic.id)).size} active topics</span> : null}
    </header>
    {error ? <p className="error-banner" role="alert">{error} <button className="text-button" type="button" onClick={() => setReload(value => value + 1)}>Retry</button></p> : null}
    {loading && !overview ? <p role="status">Loading Wiki progress...</p> : null}
    {overview ? <>
      <div className="wiki-overview-coverage">
        <div><strong>{coverage}% covered</strong><span>{covered} / {total} checks</span></div>
        <progress aria-label="Wiki check coverage" value={covered} max={total || 1} />
      </div>
      <dl className="wiki-overview-metrics">
        <div><dt>Due sections</dt><dd>{rows.filter(row => row.due).length}</dd></div>
        <div><dt>Never practiced</dt><dd>{rows.filter(row => row.never).length}</dd></div>
        <div><dt>In progress</dt><dd>{rows.filter(row => row.partial).length}</dd></div>
        <div><dt>Completed at least once</dt><dd>{rows.filter(row => row.completed).length}</dd></div>
        <div><dt>Checks to improve</dt><dd>{rows.reduce((sum, row) => sum + row.needsPractice, 0)}</dd></div>
        <div><dt>Current answer accuracy</dt><dd>{covered ? `${Math.round(correct / covered * 100)}%` : "Not practiced"}</dd></div>
      </dl>
      <div className="wiki-overview-controls">
        <div className="wiki-study-segmented" aria-label="Filter Wiki study progress">
          {filters.map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value}
            className={filter === value ? "active" : ""} onClick={() => { setFilter(value); setPage(1); }}>{label}</button>)}
        </div>
        <label>Find a Wiki topic<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      </div>
      <ul className="wiki-overview-list">
        {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(row => {
          const label = row.mode.kind === "quiz" ? "Quiz" : "Flashcards";
          return <li key={row.topic.id + row.mode.kind}>
            <div className="wiki-overview-topic"><strong>{row.topic.title}</strong><small>{row.topic.path}</small>
              <span>{label} · {row.mode.covered} / {row.mode.total} covered · {row.mode.correct} correct</span>
              <span className={row.due || row.needsPractice ? "wiki-review-due" : ""}>
                {row.due ? "Review due" : row.never ? "Never practiced" : row.partial ? "In progress" : row.mode.covered < row.mode.total ? "Checks remaining" : "Current checks completed"}
                {row.needsPractice ? ` · ${row.needsPractice} ${row.needsPractice === 1 ? "check needs" : "checks need"} practice` : ""}
              </span>
            </div>
            <div className="wiki-overview-dates"><span>Last practiced: {date(row.mode.lastPracticedAt)}</span>
              <span>Last completed: {date(row.mode.lastCompletedAt)}</span>
              <span>Next review: {row.mode.nextReviewAt ? date(row.mode.nextReviewAt) : "Complete remaining checks"}</span></div>
            <button className="secondary-button compact-button" type="button" aria-label={`Practice ${row.topic.title} ${label}`}
              onClick={() => onPractice(row.topic.id, row.mode.kind)}>Practice</button>
          </li>;
        })}
      </ul>
      {!filtered.length ? <p className="empty-state">{rows.length ? "No sections match this view." : "No active Wiki quizzes or flashcards yet."}</p> : null}
      {filtered.length ? <div className="pagination-row">
        <button className="secondary-button" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <span>{currentPage} / {pageCount} · {filtered.length} {filtered.length === 1 ? "section" : "sections"}</span>
        <button className="secondary-button" type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
      </div> : null}
      {overview.history.length ? <details className="wiki-session-history"><summary>Recent Wiki sessions</summary>
        {overview.history.slice(0, 5).map(session => <div key={session.id}><time>{new Date(session.completedAt).toLocaleString()}</time>
          <span>{session.correct} / {session.answered} correct</span></div>)}
      </details> : null}
    </> : null}
  </section>;
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Never";
}
