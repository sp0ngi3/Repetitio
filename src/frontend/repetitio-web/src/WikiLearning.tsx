import { ActionIcon } from "./ActionIcon";
import { useEffect, useRef, useState } from "react";
import { getWikiStudy, saveWikiStudy, saveWikiStudySettings, saveWikiReviewPreference } from "./api";
import type { WikiPage, WikiStudyAnswerRequest, WikiStudyOverview, WikiStudyPageProgress } from "./types";
import "./wiki.css";
import { wikiStudyRows } from "./wikiStudyProgress";

export type WikiStudyItem =
  | { id: string; type: "quiz"; pageId: string; pageTitle: string; pagePath: string; question: WikiPage["quizQuestions"][number] }
  | { id: string; type: "flashcard"; pageId: string; pageTitle: string; pagePath: string; flashcard: WikiPage["flashcards"][number] };

export function studyItems(pages: WikiPage[], mode: "quiz" | "flashcards" | "both"): WikiStudyItem[] {
  return pages.flatMap(page => [
    ...(mode !== "flashcards" ? page.quizQuestions.map(question => ({ id: question.id, type: "quiz" as const,
      pageId: page.id, pageTitle: page.title, pagePath: page.path, question })) : []),
    ...(mode !== "quiz" ? page.flashcards.map(flashcard => ({ id: flashcard.id, type: "flashcard" as const,
      pageId: page.id, pageTitle: page.title, pagePath: page.path, flashcard })) : [])
  ]);
}

export function WikiLearningPlayer({ items, onClose }: { items: WikiStudyItem[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, WikiStudyAnswerRequest>>({});
  const [revealed, setRevealed] = useState(false);
  const [summary, setSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [trackedCount, setTrackedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(crypto.randomUUID());
  const frameRef = useRef<HTMLElement>(null);
  useEffect(() => { frameRef.current?.scrollIntoView?.({ block: "start" }); }, []);
  const item = items[index];
  const result = answers[item.id];
  const values = Object.values(answers);
  const correct = values.filter(answer => {
    if (answer.kind === "flashcard") return answer.knew;
    const check = items.find(candidate => candidate.id === answer.itemId && candidate.type === "quiz");
    return check?.type === "quiz" && check.question.options.some(option => option.id === answer.optionId && option.isCorrect);
  }).length;

  function move(delta: number) {
    setIndex(value => Math.max(0, Math.min(items.length - 1, value + delta)));
    setRevealed(false);
    const body = frameRef.current?.querySelector(".wiki-player-body");
    if (body) body.scrollTop = 0;
  }

  async function finish() {
    if (!values.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      const overview = await saveWikiStudy(sessionId.current, values);
      setTrackedCount(overview.history.find(session => session.id === sessionId.current)?.answered ?? 0);
      setSaved(true);
      setSummary(true);
      window.dispatchEvent(new Event("wiki-study-updated"));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save results."); }
    finally { setSaving(false); }
  }

  return <section className="wiki-learning-player" ref={frameRef} aria-label="Wiki practice player" onKeyDown={event => {
    if ((event.target as HTMLElement).matches("input,textarea,select")) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
  }}>
    <header className="wiki-player-header">
      <div><span className="wiki-practice-kicker">{summary ? "Session results" : item.type === "quiz" ? "Quiz" : "Flashcards"}</span>
        <h3>{summary ? `${correct} / ${values.length} correct` : item.pageTitle}</h3>
        <small>{item.pagePath}</small></div>
      <span>{values.length} / {items.length} answered</span>
    </header>
    <progress max={items.length} value={values.length} aria-label="Answered checks" />
    <div className="wiki-player-body">
      {summary ? <div className="wiki-player-results">
        <h3>{trackedCount ? "Results saved" : "Practice complete"}</h3>
        <p>{values.length} checks reviewed across {new Set(values.map(a => a.pageId)).size} topics.</p>
        {trackedCount !== null && trackedCount < values.length ? <p>{values.length - trackedCount} checks belong to archived or excluded topics and were not added to review history.</p> : null}
        <p>Full coverage schedules the next review. Partial practice keeps the remaining checks open.</p>
      </div> : item.type === "quiz" ? <>
        <h3>{item.question.prompt}</h3>
        <div className="wiki-quiz-options">{item.question.options.map((option, optionIndex) =>
          <button type="button" key={option.id} aria-label={`${String.fromCharCode(65 + optionIndex)} ${option.text}`} disabled={!!result || saving}
            className={result ? option.isCorrect ? "correct" : result.optionId === option.id ? "incorrect" : "" : ""}
            onClick={() => setAnswers(current => ({ ...current, [item.id]: { pageId: item.pageId,
              itemId: item.question.id, kind: "quiz", optionId: option.id } }))}>
            <strong>{String.fromCharCode(65 + optionIndex)}</strong><span>{option.text}</span>
          </button>)}</div>
        {result ? <div className="wiki-player-feedback" role="status">
          <strong>{item.question.options.some(o => o.id === result.optionId && o.isCorrect) ? "Correct" : "Review this point"}</strong>
          {item.question.explanation ? <p>{item.question.explanation}</p> : null}
        </div> : null}
      </> : <>
        <button className="wiki-study-flashcard" type="button" onClick={() => setRevealed(value => !value)}>
          <span>{revealed ? "Answer" : "Prompt"}</span><strong>{revealed ? item.flashcard.back : item.flashcard.front}</strong>
          <small>{revealed ? "Hide answer" : "Reveal answer"}</small>
        </button>
        {revealed ? <div className="wiki-grade-actions">
          <button className="secondary-button" type="button" disabled={!!result || saving} onClick={() => setAnswers(current => ({ ...current,
            [item.id]: { pageId: item.pageId, itemId: item.flashcard.id, kind: "flashcard", knew: false } }))}>Need practice</button>
          <button className="primary-button" type="button" disabled={!!result || saving} onClick={() => setAnswers(current => ({ ...current,
            [item.id]: { pageId: item.pageId, itemId: item.flashcard.id, kind: "flashcard", knew: true } }))}><ActionIcon label="I knew it" />I knew it</button>
        </div> : null}
        {result ? <p role="status">{result.knew ? "Marked as known" : "Marked for practice"}</p> : null}
      </>}
    </div>
    {error ? <p className="error-banner" role="alert">{error}</p> : null}
    <footer className="wiki-player-footer">
      {summary ? <button className="primary-button" type="button" onClick={onClose}><ActionIcon label="Back to topics" />Back to topics</button> : <>
        <button className="secondary-button" aria-label="Previous check" title="Previous check" type="button" disabled={index === 0 || saving} onClick={() => move(-1)}>&larr;</button>
        <span>{index + 1} / {items.length}</span>
        <button className="secondary-button" aria-label="Next check" title="Next check" type="button" disabled={index === items.length - 1 || saving} onClick={() => move(1)}>&rarr;</button>
        <button className="primary-button" type="button" disabled={!values.length || saving || saved} onClick={finish}>{saving ? "Saving..." : "Save results"}</button>
        <button className="text-button" type="button" disabled={saving} onClick={() => {
          if (!values.length || saved || window.confirm("Leave without saving these results?")) onClose();
        }}><ActionIcon label="Close" />Close</button>
      </>}
    </footer>
  </section>;
}

export function WikiProgressSummary({ progress }: { progress?: WikiStudyPageProgress }) {
  if (!progress) return null;
  return <div className="wiki-progress-summary" aria-label="Wiki review progress">
    {!progress.effectiveReviewEnabled ? <span>Review tracking off{progress.isArchived ? " · archived" : ""}</span> : null}
    {progress.modes.filter(mode => mode.total > 0).map(mode => <div key={mode.kind}>
      <strong>{mode.kind === "quiz" ? "Quiz" : "Flashcards"}</strong>
      <span>Last practiced: {displayDate(mode.lastPracticedAt)}</span>
      <span>{mode.covered} / {mode.total} covered · {mode.correct} correct</span>
      <span className={mode.nextReviewAt && new Date(mode.nextReviewAt) <= new Date() ? "wiki-review-due" : ""}>
        Next review: {mode.nextReviewAt ? displayDate(mode.nextReviewAt) : "Complete all checks"}</span>
    </div>)}
  </div>;
}

export function WikiReviewSettings() {
  const [overview, setOverview] = useState<WikiStudyOverview | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [branch, setBranch] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function load() { try { setOverview(await getWikiStudy()); } catch (failure) { setError(String(failure)); } }
  useEffect(() => { void load(); }, []);
  const filtered = overview?.pages.filter(p => p.path.toLowerCase().includes(search.toLowerCase()) || p.title.toLowerCase().includes(search.toLowerCase())) ?? [];
  async function change(action: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await action(); await load(); window.dispatchEvent(new Event("wiki-study-updated")); }
    catch (failure) { setError(String(failure)); } finally { setBusy(false); }
  }
  return <section className="panel wiki-review-settings" aria-labelledby="wiki-review-settings-title">
    <h2 id="wiki-review-settings-title">Wiki reviews</h2>
    {error ? <p className="error-banner">{error}</p> : null}
    <div className="wiki-settings-controls">
      <label>Default review interval<select disabled={busy || !overview} value={overview?.intervalDays ?? 30}
        onChange={event => void change(() => saveWikiStudySettings(Number(event.target.value)))}>
        {[7, 14, 30, 60, 90].map(days => <option value={days} key={days}>{days} days</option>)}
      </select></label>
      <label>Find a topic<input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="inline-checkbox"><input type="checkbox" checked={branch} onChange={event => setBranch(event.target.checked)} />Apply changes to subtopics</label>
    </div>
    <div className="wiki-review-preferences">{filtered.slice((page - 1) * 15, page * 15).map(topic =>
      <div className="wiki-review-preference" key={topic.id}>
        <div><strong>{topic.title}</strong><small>{topic.path}</small>{!topic.effectiveReviewEnabled ? <small>{topic.isArchived ? "Archived" : topic.reviewEnabled ? "Parent topic is archived" : "Review tracking disabled"}</small> : null}</div>
        <label className="inline-checkbox"><input disabled={busy || topic.isArchived} type="checkbox" checked={topic.reviewEnabled}
          onChange={event => void change(() => saveWikiReviewPreference(topic.id, event.target.checked, branch, topic.intervalDays))} />Track reviews</label>
        <select aria-label={`Review interval for ${topic.title}`} disabled={busy || topic.isArchived} value={topic.intervalDays ?? ""}
          onChange={event => void change(() => saveWikiReviewPreference(topic.id, topic.reviewEnabled, branch, event.target.value ? Number(event.target.value) : null))}>
          <option value="">Default interval</option>{[7,14,30,60,90].map(days => <option value={days} key={days}>{days} days</option>)}
        </select>
      </div>)}</div>
    <div className="pagination-row"><button className="secondary-button" type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ActionIcon label="Previous" />Previous</button>
      <span>{page} / {Math.max(1, Math.ceil(filtered.length / 15))}</span><button className="secondary-button" type="button" disabled={page * 15 >= filtered.length} onClick={() => setPage(p => p + 1)}><ActionIcon label="Next" />Next</button></div>
  </section>;
}

export function WikiBranchProgress({ topics, rootId }: { topics: WikiStudyPageProgress[]; rootId: string }) {
  const root = topics.find(topic => topic.id === rootId);
  if (!root) return null;
  const branch = topics.filter(topic => topic.effectiveReviewEnabled && (topic.id === rootId || topic.path.startsWith(root.path + "/")));
  if (branch.length < 2) return null;
  const modes = branch.flatMap(topic => topic.modes.filter(mode => mode.total > 0));
  if (!modes.length) return null;
  const practiced = modes.map(mode => mode.lastPracticedAt).filter((date): date is string => !!date).sort().at(-1) ?? null;
  const due = modes.filter(mode => mode.nextReviewAt && new Date(mode.nextReviewAt) <= new Date()).length;
  return <div className="wiki-branch-progress" aria-label="Topic branch progress">
    <strong>Topic branch</strong><span>{branch.length} active pages</span>
    <span>{modes.reduce((sum, mode) => sum + mode.covered, 0)} / {modes.reduce((sum, mode) => sum + mode.total, 0)} checks covered</span>
    <span>Last practiced: {displayDate(practiced)}</span><span>{due} sections due</span>
  </div>;
}

export function WikiReviewDashboard({ overview, onSelect }: { overview: WikiStudyOverview | null; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState("due");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rows = wikiStudyRows(overview);
  const filtered = rows.filter(({ topic, mode }) => (topic.title + " " + topic.path).toLowerCase().includes(search.toLowerCase())
    && (filter === "all" || filter === "never" && !mode.lastPracticedAt
      || filter === "partial" && mode.covered > 0 && mode.covered < mode.total
      || filter === "due" && !!mode.nextReviewAt && new Date(mode.nextReviewAt) <= new Date()))
    .sort((left, right) => (left.mode.lastPracticedAt ?? "").localeCompare(right.mode.lastPracticedAt ?? ""));
  return <section aria-label="Wiki review dashboard">
    <header className="wiki-special-header"><div><span>Learning progress</span><h1>Wiki reviews</h1></div></header>
    <div className="wiki-review-dashboard-controls"><div className="wiki-study-segmented">
      {[["due", "Due"], ["never", "Never practiced"], ["partial", "In progress"], ["all", "All active"]].map(([value, label]) =>
        <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => { setFilter(value); setPage(1); }}>{label}</button>)}
    </div><label>Find a topic<input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label></div>
    {!overview ? <p>Loading reviews...</p> : !filtered.length ? <p className="empty-state">No topics in this view.</p> :
      <div className="wiki-review-list">{filtered.slice((page - 1) * 15, page * 15).map(({ topic, mode }) =>
        <button className="wiki-review-list-row" type="button" key={topic.id + mode.kind} onClick={() => onSelect(topic.id)}>
          <div><strong>{topic.title}</strong><small>{topic.path}</small></div><span>{mode.kind === "quiz" ? "Quiz" : "Flashcards"}</span>
          <span>{mode.covered} / {mode.total} covered</span><span>Last: {displayDate(mode.lastPracticedAt)}</span>
          <span>Due: {mode.nextReviewAt ? displayDate(mode.nextReviewAt) : "Not completed"}</span>
        </button>)}</div>}
    <div className="pagination-row"><button className="secondary-button" type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ActionIcon label="Previous" />Previous</button>
      <span>{page} / {Math.max(1, Math.ceil(filtered.length / 15))} · {filtered.length} topics</span><button className="secondary-button" type="button" disabled={page * 15 >= filtered.length} onClick={() => setPage(p => p + 1)}><ActionIcon label="Next" />Next</button></div>
  </section>;
}

function displayDate(value: string | null) { return value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Never"; }
