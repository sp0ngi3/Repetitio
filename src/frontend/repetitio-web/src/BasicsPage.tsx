import { ActionIcon } from "./ActionIcon";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPracticeSession, executeBasicExercise } from "./api";
import { CodeEditor } from "./CodeEditor";
import { getPracticeAgeClass } from "./practiceAge";
import { sortByLastPracticed, type LastPracticedSort } from "./practiceSort";
import { createDefaultNextReviewDate, toNextReviewTimestamp, type ReviewSchedulePreset } from "./reviewSchedule";
import type {
  BasicExercise,
  CreatePracticeSessionRequest,
  ExecuteBasicExerciseResponse
} from "./types";

/**
 * Number of Basics exercises shown on one dashboard page.
 */
const basicsPageSize = 10;

/**
 * Basics page view modes.
 */
type BasicsView = "dashboard" | "detail";

/**
 * Problem prompt tabs shown on the Basics detail page.
 */
type BasicsProblemTab = "description" | "examples" | "constraints" | "tests";

/**
 * Problem prompt tab metadata.
 */
const problemTabs: { key: BasicsProblemTab; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "examples", label: "Examples" },
  { key: "constraints", label: "Constraints" },
  { key: "tests", label: "Test cases" }
];

/**
 * Represents the local Basics attempt form state.
 */
interface BasicsAttemptForm {
  /** Source code drafted during the attempt. */
  codeDraft: string;
}

/**
 * Initial Basics attempt form state.
 */
/**
 * Props accepted by the Basics page.
 */
interface BasicsPageProps {
  /** Built-in Basics exercises with progress. */
  basicExercises: BasicExercise[];
  /** Learning item id to open from the Overview page. */
  focusItemId?: string | null;
  /** Changes when the same focused item should be reopened. */
  focusNonce?: number | null;
  /** Default review schedule for new practice attempts. */
  reviewSchedulePreset: ReviewSchedulePreset;
  /** Called after a Basics attempt is recorded. */
  onChanged: () => Promise<void> | void;
  /** Called after the focused item has been opened. */
  onFocusHandled?: () => void;
}

/**
 * Renders the Basics dashboard and exercise detail flow.
 *
 * @param props - Component props.
 * @returns The Basics page.
 */
export function BasicsPage(props: BasicsPageProps) {
  const [view, setView] = useState<BasicsView>("dashboard");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [lastPracticedSort, setLastPracticedSort] = useState<LastPracticedSort>("never-first");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeProblemTab, setActiveProblemTab] = useState<BasicsProblemTab>("description");
  const [attemptForm, setAttemptForm] = useState<BasicsAttemptForm>({ codeDraft: "" });
  const [executionResult, setExecutionResult] = useState<ExecuteBasicExerciseResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedExercise = useMemo(
    () => props.basicExercises.find((exercise) => exercise.slug === selectedSlug) ?? null,
    [props.basicExercises, selectedSlug]
  );

  const availableTags = useMemo(() => getAllBasicTags(props.basicExercises), [props.basicExercises]);
  const filteredExercises = useMemo(
    () => filterBasicExercises(props.basicExercises, searchQuery, selectedTag).filter(exercise => {
      if (activityFilter === "all") return true;
      if (activityFilter === "never") return !exercise.lastPracticedAt;
      if (!exercise.lastPracticedAt) return true;
      return new Date(exercise.lastPracticedAt).getTime() <= Date.now() - Number(activityFilter) * 86400000;
    }),
    [props.basicExercises, searchQuery, selectedTag, activityFilter]
  );
  const sortedExercises = useMemo(
    () => sortByLastPracticed(filteredExercises, lastPracticedSort),
    [filteredExercises, lastPracticedSort]
  );
  const pageCount = Math.max(1, Math.ceil(sortedExercises.length / basicsPageSize));
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedExercises = useMemo(
    () => paginateBasicExercises(sortedExercises, effectivePage, basicsPageSize),
    [sortedExercises, effectivePage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [lastPracticedSort, searchQuery, selectedTag, activityFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!props.focusItemId) {
      return;
    }

    const focusedExercise = props.basicExercises.find((exercise) => exercise.learningItemId === props.focusItemId);

    if (focusedExercise) {
      openExercise(focusedExercise);
      props.onFocusHandled?.();
    }
  }, [props.focusItemId, props.focusNonce, props.basicExercises]);

  /**
   * Opens the selected Basics exercise detail page.
   *
   * @param exercise - Selected built-in exercise.
   */
  function openExercise(exercise: BasicExercise) {
    setSelectedSlug(exercise.slug);
    setActiveProblemTab("description");
    setAttemptForm({ codeDraft: exercise.starterCode });
    setExecutionResult(null);
    setView("detail");
    setError(null);
  }

  /**
   * Returns to the Basics dashboard.
   */
  function returnToDashboard() {
    setSelectedSlug(null);
    setExecutionResult(null);
    setView("dashboard");
    setError(null);
  }

  /**
   * Updates one attempt form field.
   *
   * @param key - Field name to update.
   * @param value - Next field value.
   */
  function updateAttemptForm<K extends keyof BasicsAttemptForm>(key: K, value: BasicsAttemptForm[K]) {
    setAttemptForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Records a Basics attempt for the selected exercise.
   *
   * @param event - The form submission event.
   */
  async function handleAttemptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExercise || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createPracticeSession(toPracticeRequest(selectedExercise.learningItemId, attemptForm, props.reviewSchedulePreset));
      await props.onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save Basics attempt.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Compiles and runs automated tests for the selected Basics exercise.
   */
  async function handleRunTests() {
    if (!selectedExercise) {
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const result = await executeBasicExercise(selectedExercise.slug, {
        sourceCode: attemptForm.codeDraft,
        timeoutMs: 3000
      });

      setExecutionResult(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run automated tests.");
    } finally {
      setIsRunning(false);
    }
  }

  if (view === "detail" && selectedExercise) {
    return (
      <section className="tracker-page" aria-labelledby="basics-detail-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Basics exercise</p>
            <h2 id="basics-detail-title">{selectedExercise.title}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={returnToDashboard}>
            <ActionIcon label="Back" />Back
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <div className="leetcode-layout">
          <section className="panel problem-panel leetcode-problem-panel" aria-label="Basics exercise prompt">
            <div className="problem-tabs" role="tablist" aria-label="Problem sections">
              {problemTabs.map((tab) => (
                <button
                  aria-selected={activeProblemTab === tab.key}
                  className={activeProblemTab === tab.key ? "active" : ""}
                  key={tab.key}
                  onClick={() => setActiveProblemTab(tab.key)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="problem-document">
              <div className="problem-title-row">
                <div>
                  <p className="eyebrow">{selectedExercise.language}</p>
                  <h3>{selectedExercise.title}</h3>
                </div>
                <span className="difficulty-pill">{selectedExercise.difficulty}</span>
              </div>

              <ProblemTabContent exercise={selectedExercise} activeTab={activeProblemTab} />

              <details className="solution-peek">
                <summary>Peek approach</summary>
                <p>{selectedExercise.approachGuide}</p>
              </details>

              <details className="solution-peek">
                <summary>Peek solution</summary>
                <pre>
                  <code>{selectedExercise.referenceSolution}</code>
                </pre>
              </details>
            </div>
          </section>

          <aside className="panel solve-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Progress</p>
                <h3>Practice exercise</h3>
              </div>
            </div>

            <dl className="basics-completion-stats" aria-live="polite">
              <div>
                <dt>Times completed</dt>
                <dd>{selectedExercise.successfulAttempts}</dd>
              </div>
            </dl>

            <form className="attempt-form" onSubmit={handleAttemptSubmit}>
              <div className="editor-field">
                <label htmlFor="basics-code-editor">Code</label>
                <CodeEditor
                  key={selectedExercise.slug}
                  id="basics-code-editor"
                  label="Code"
                  language={selectedExercise.language}
                  value={attemptForm.codeDraft}
                  onChange={(value) => updateAttemptForm("codeDraft", value)}
                  placeholder="Write your solution here."
                  toolbarEnd={
                    <button className="secondary-button compact-button" type="button" onClick={handleRunTests} disabled={isRunning}>
                      <ActionIcon label="Run tests" />{isRunning ? "Running..." : "Run tests"}
                    </button>
                  }
                />
              </div>

              {executionResult ? <ExecutionResultPanel result={executionResult} /> : null}

              <button className="primary-button" type="submit" disabled={isSaving}>
                <ActionIcon label="Complete" />{isSaving ? "Recording..." : "Mark completed"}
              </button>
            </form>

            {selectedExercise.practiceSessions.length ? (
              <details className="basics-practice-history"><summary>Practice history · {selectedExercise.totalAttempts}</summary><ul className="stack-list attempt-history">
                {selectedExercise.practiceSessions.map((session) => (
                  <li className="list-row" key={session.id}>
                    <div>
                      <strong>{session.outcome === "Completed" || session.outcome === "Passed" ? "Completed" : "Previous practice"}</strong>
                      <span>{formatDate(session.startedAt)}</span>
                      {session.sourceCode ? (
                        <details className="history-code">
                          <summary>View saved code</summary>
                          <pre>
                            <code>{session.sourceCode}</code>
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul></details>
            ) : (
              <p className="empty-state">No attempts yet.</p>
            )}
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="tracker-page" aria-labelledby="basics-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Basics dashboard</p>
          <h2 id="basics-title">Exercises</h2>
        </div>
      </div>

      <section className="panel data-panel" aria-label="Basics exercise records">
        {props.basicExercises.length ? (
          <>
            <div className="basics-filter-panel" aria-label="Basics filters">
              <label>
                Search
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="exercise or hashtag..."
                />
              </label>

              <label>
                Practice activity
                <select value={activityFilter} onChange={event => setActivityFilter(event.target.value)}>
                  <option value="all">All exercises</option>
                  <option value="never">Never practiced</option>
                  <option value="7">Not practiced in 7+ days</option>
                  <option value="30">Not practiced in 30+ days</option>
                </select>
              </label>

              <label>
                Last practiced
                <select
                  value={lastPracticedSort}
                  onChange={(event) => setLastPracticedSort(event.target.value as LastPracticedSort)}
                >
                  <option value="never-first">Never practiced first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="newest">Newest first</option>
                </select>
              </label>

              <div className="tag-filter-list" aria-label="Basics hashtags">
                <button
                  aria-pressed={selectedTag === ""}
                  className={selectedTag === "" ? "tag-filter-chip active" : "tag-filter-chip"}
                  type="button"
                  onClick={() => setSelectedTag("")}
                >
                  All
                </button>
                {availableTags.map((tag) => (
                  <button
                    aria-pressed={selectedTag === tag}
                    className={selectedTag === tag ? "tag-filter-chip active" : "tag-filter-chip"}
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag((current) => (current === tag ? "" : tag))}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {filteredExercises.length ? (
              <>
                <div className="record-table basics-title-table">
                  <div className="record-header">
                    <span>Exercise</span>
                    <span>Completed</span>
                    <span>Last practiced</span>
                  </div>
                  {pagedExercises.map((exercise) => (
                    <button
                      aria-label={exercise.title}
                      className="record-row"
                      type="button"
                      key={exercise.slug}
                      onClick={() => openExercise(exercise)}
                    >
                      <span>
                        <strong>{exercise.title}</strong>
                      </span>
                      <span className="basics-completed-count"><strong>{exercise.successfulAttempts}</strong><small>completed</small></span>
                      <span className={`date-chip ${getPracticeAgeClass(exercise.lastPracticedAt)}`}>
                        {exercise.lastPracticedAt ? formatDate(exercise.lastPracticedAt) : "Never practiced"}
                      </span>
                    </button>
                  ))}
                </div>

                <PaginationBar
                  currentPage={effectivePage}
                  pageCount={pageCount}
                  totalCount={filteredExercises.length}
                  pageSize={basicsPageSize}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <p className="empty-state">No Basics exercises match the current filters.</p>
            )}
          </>
        ) : (
          <p className="empty-state">Loading built-in basics...</p>
        )}
      </section>
    </section>
  );
}

/**
 * Props accepted by the dashboard pagination bar.
 */
interface PaginationBarProps {
  /** Current one-based page number. */
  currentPage: number;
  /** Total page count. */
  pageCount: number;
  /** Total filtered record count. */
  totalCount: number;
  /** Number of records per page. */
  pageSize: number;
  /** Updates the current page. */
  onPageChange: (page: number) => void;
}

/**
 * Renders dashboard pagination controls.
 *
 * @param props - Component props.
 * @returns Pagination controls for the current filtered list.
 */
function PaginationBar(props: PaginationBarProps) {
  const firstItem = (props.currentPage - 1) * props.pageSize + 1;
  const lastItem = Math.min(props.currentPage * props.pageSize, props.totalCount);

  return (
    <nav className="pagination-bar" aria-label="Basics pagination">
      <span>
        Showing {firstItem}-{lastItem} of {props.totalCount}
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-button"
          type="button"
          disabled={props.currentPage === 1}
          onClick={() => props.onPageChange(props.currentPage - 1)}
        >
          <ActionIcon label="Previous page" />Previous page
        </button>
        <span>
          {props.currentPage}/{props.pageCount}
        </span>
        <button
          className="pagination-button"
          type="button"
          disabled={props.currentPage === props.pageCount}
          onClick={() => props.onPageChange(props.currentPage + 1)}
        >
          <ActionIcon label="Next page" />Next page
        </button>
      </div>
    </nav>
  );
}

/**
 * Renders the selected problem prompt section.
 *
 * @param props - Component props.
 * @returns The active problem tab content.
 */
function ProblemTabContent(props: { exercise: BasicExercise; activeTab: BasicsProblemTab }) {
  const { exercise, activeTab } = props;

  if (activeTab === "examples") {
    return (
      <section aria-labelledby="basics-examples-title" role="tabpanel">
        <h4 id="basics-examples-title">Examples</h4>
        <pre className="example-block">
          <code>{exercise.examples}</code>
        </pre>
      </section>
    );
  }

  if (activeTab === "constraints") {
    return (
      <section aria-labelledby="basics-constraints-title" role="tabpanel">
        <h4 id="basics-constraints-title">Constraints</h4>
        <pre className="example-block">
          <code>{exercise.constraints}</code>
        </pre>
      </section>
    );
  }

  if (activeTab === "tests") {
    return (
      <section aria-labelledby="basics-tests-title" role="tabpanel">
        <h4 id="basics-tests-title">Test cases</h4>
        <pre className="example-block">
          <code>{exercise.testCases}</code>
        </pre>
      </section>
    );
  }

  return (
    <section aria-labelledby="basics-description-title" role="tabpanel">
      <h4 id="basics-description-title">Description</h4>
      <p>{exercise.problemStatement}</p>
    </section>
  );
}

/**
 * Renders compilation and automated test feedback for a Basics submission.
 *
 * @param props - Component props.
 * @returns The execution result panel.
 */
function ExecutionResultPanel(props: { result: ExecuteBasicExerciseResponse }) {
  const { result } = props;
  const title = result.timedOut
    ? "Timed out"
    : result.passed
      ? "All tests passed"
      : result.compiled
        ? "Tests failed"
        : "Compilation failed";

  return (
    <section className={`execution-panel ${result.passed ? "passed" : "failed"}`} aria-label="Execution result">
      <div className="execution-summary">
        <strong>{title}</strong>
        <span>{result.testResults.length ? `${result.testResults.filter((test) => test.passed).length}/${result.testResults.length} passed` : "No tests completed"}</span>
      </div>

      {result.compilerOutput ? (
        <pre className="output-block">
          <code>{result.compilerOutput}</code>
        </pre>
      ) : null}

      {result.runtimeOutput ? (
        <pre className="output-block">
          <code>{result.runtimeOutput}</code>
        </pre>
      ) : null}

      {result.testResults.length ? (
        <ul className="test-result-list">
          {result.testResults.map((test) => (
            <li className={`test-result-row ${test.passed ? "passed" : "failed"}`} key={test.name}>
              <div>
                <strong>{test.name}</strong>
                <span>Expected: {test.expected}</span>
                <span>Actual: {test.actual}</span>
                {test.error ? <span>{test.error}</span> : null}
              </div>
              <span>{test.passed ? "Pass" : "Fail"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Converts an attempt form into a practice request.
 *
 * @param learningItemId - Related Basics learning item identifier.
 * @param form - Editable attempt form.
 * @returns Practice session creation payload.
 */
function toPracticeRequest(learningItemId: string, form: BasicsAttemptForm, preset: ReviewSchedulePreset): CreatePracticeSessionRequest {
  return {
    learningItemId,
    outcome: "Completed",
    nextReviewAt: toNextReviewTimestamp(createDefaultNextReviewDate(preset)),
    sourceCode: form.codeDraft.trim()
  };
}

/**
 * Returns every hashtag used by the Basics catalog.
 *
 * @param exercises - Basics exercises.
 * @returns Sorted unique tag names.
 */
function getAllBasicTags(exercises: BasicExercise[]) {
  return [...new Set(exercises.flatMap((exercise) => exercise.tags))].sort((left, right) => left.localeCompare(right));
}

/**
 * Filters Basics exercises by free-text search and selected hashtag.
 *
 * @param exercises - Basics exercises.
 * @param searchQuery - Current search input.
 * @param selectedTag - Current selected tag filter.
 * @returns Exercises matching the current filters.
 */
function filterBasicExercises(exercises: BasicExercise[], searchQuery: string, selectedTag: string) {
  const query = searchQuery.trim().toLowerCase();

  return exercises.filter((exercise) => {
    const matchesTag = !selectedTag || exercise.tags.includes(selectedTag);
    const searchableText = [
      exercise.title,
      exercise.slug,
      exercise.difficulty,
      exercise.status,
      exercise.language,
      exercise.instructions,
      exercise.problemStatement,
      exercise.functionSignature,
      ...exercise.tags.map((tag) => `#${tag} ${tag}`)
    ]
      .join(" ")
      .toLowerCase();

    return matchesTag && (!query || searchableText.includes(query));
  });
}

/**
 * Returns one page of Basics exercises.
 *
 * @param exercises - Filtered Basics exercises.
 * @param currentPage - One-based page number.
 * @param pageSize - Number of exercises per page.
 * @returns Exercises for the requested page.
 */
function paginateBasicExercises(exercises: BasicExercise[], currentPage: number, pageSize: number) {
  const startIndex = (currentPage - 1) * pageSize;
  return exercises.slice(startIndex, startIndex + pageSize);
}

/**
 * Formats an optional ISO date for compact display.
 *
 * @param value - ISO date value.
 * @returns Human-readable date text.
 */
function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
