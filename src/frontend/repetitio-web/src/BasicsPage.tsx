import { useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { createPracticeSession, executeBasicExercise } from "./api";
import { getPracticeAgeClass } from "./practiceAge";
import type {
  BasicExercise,
  CreatePracticeSessionRequest,
  ExecuteBasicExerciseResponse,
  PracticeOutcome
} from "./types";

/**
 * Practice outcome choices rendered by the Basics attempt form.
 */
const outcomes: PracticeOutcome[] = ["Completed", "Passed", "Partial", "Failed"];

/**
 * Number of Basics exercises shown on one dashboard page.
 */
const basicsPageSize = 10;

/**
 * Number of spaces inserted by the code editor Tab key.
 */
const codeEditorIndent = "    ";

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
  /** Attempt outcome. */
  outcome: PracticeOutcome;
  /** Confidence value as form text. */
  confidence: string;
  /** Attempt duration in minutes as form text. */
  durationMinutes: string;
  /** Attempt notes. */
  notes: string;
  /** What helped during the attempt. */
  whatHelped: string;
  /** What was difficult during the attempt. */
  whatWasDifficult: string;
  /** What should be improved next. */
  improveNext: string;
  /** Source code drafted during the attempt. */
  codeDraft: string;
}

/**
 * Initial Basics attempt form state.
 */
const emptyAttemptForm: BasicsAttemptForm = {
  outcome: "Completed",
  confidence: "",
  durationMinutes: "",
  notes: "",
  whatHelped: "",
  whatWasDifficult: "",
  improveNext: "",
  codeDraft: ""
};

/**
 * Props accepted by the Basics page.
 */
interface BasicsPageProps {
  /** Built-in Basics exercises with progress. */
  basicExercises: BasicExercise[];
  /** Called after a Basics attempt is recorded. */
  onChanged: () => Promise<void> | void;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [activeProblemTab, setActiveProblemTab] = useState<BasicsProblemTab>("description");
  const [attemptForm, setAttemptForm] = useState<BasicsAttemptForm>(emptyAttemptForm);
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
    () => filterBasicExercises(props.basicExercises, searchQuery, selectedTag),
    [props.basicExercises, searchQuery, selectedTag]
  );
  const pageCount = Math.max(1, Math.ceil(filteredExercises.length / basicsPageSize));
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedExercises = useMemo(
    () => paginateBasicExercises(filteredExercises, effectivePage, basicsPageSize),
    [filteredExercises, effectivePage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  /**
   * Opens the selected Basics exercise detail page.
   *
   * @param exercise - Selected built-in exercise.
   */
  function openExercise(exercise: BasicExercise) {
    setSelectedSlug(exercise.slug);
    setActiveProblemTab("description");
    setAttemptForm(createAttemptForm(exercise));
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
   * Inserts or removes indentation when Tab is pressed inside the code editor.
   *
   * @param event - Keyboard event raised by the code editor textarea.
   */
  function handleCodeEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();

    const textarea = event.currentTarget;
    const edit = event.shiftKey
      ? removeCodeEditorIndentation(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      : addCodeEditorIndentation(textarea.value, textarea.selectionStart, textarea.selectionEnd);

    updateAttemptForm("codeDraft", edit.value);

    requestAnimationFrame(() => {
      textarea.selectionStart = edit.selectionStart;
      textarea.selectionEnd = edit.selectionEnd;
    });
  }

  /**
   * Records a Basics attempt for the selected exercise.
   *
   * @param event - The form submission event.
   */
  async function handleAttemptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExercise) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createPracticeSession(toPracticeRequest(selectedExercise.learningItemId, attemptForm));
      setAttemptForm(createAttemptForm(selectedExercise));
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
      setAttemptForm((current) => ({
        ...current,
        outcome: result.passed ? "Completed" : "Failed"
      }));
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
            Back
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
                <h3>Attempt exercise</h3>
              </div>
            </div>

            <dl className="attempt-stats">
              <div>
                <dt>Times solved</dt>
                <dd>{selectedExercise.successfulAttempts}/6</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{formatStatus(selectedExercise.status)}</dd>
              </div>
              <div>
                <dt>Difficulty</dt>
                <dd>{selectedExercise.difficulty}</dd>
              </div>
            </dl>

            <form className="attempt-form" onSubmit={handleAttemptSubmit}>
              <div className="editor-field">
                <span className="editor-toolbar">
                  <label htmlFor="basics-code-editor">Code</label>
                  <button className="secondary-button compact-button" type="button" onClick={handleRunTests} disabled={isRunning}>
                    {isRunning ? "Running..." : "Run tests"}
                  </button>
                </span>
                <textarea
                  id="basics-code-editor"
                  className="code-editor-textarea"
                  spellCheck={false}
                  value={attemptForm.codeDraft}
                  onChange={(event) => updateAttemptForm("codeDraft", event.target.value)}
                  onKeyDown={handleCodeEditorKeyDown}
                  placeholder="Write your solution here."
                />
              </div>

              {executionResult ? <ExecutionResultPanel result={executionResult} /> : null}

              <div className="form-grid two-columns">
                <label>
                  Outcome
                  <select
                    value={attemptForm.outcome}
                    onChange={(event) => updateAttemptForm("outcome", event.target.value as PracticeOutcome)}
                  >
                    {outcomes.map((outcome) => (
                      <option key={outcome} value={outcome}>
                        {formatStatus(outcome)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Confidence
                  <select
                    value={attemptForm.confidence}
                    onChange={(event) => updateAttemptForm("confidence", event.target.value)}
                  >
                    <option value="">Not set</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Duration minutes
                <input
                  inputMode="numeric"
                  value={attemptForm.durationMinutes}
                  onChange={(event) => updateAttemptForm("durationMinutes", event.target.value)}
                  placeholder="15"
                />
              </label>

              <label>
                Notes
                <textarea
                  value={attemptForm.notes}
                  onChange={(event) => updateAttemptForm("notes", event.target.value)}
                  placeholder="What happened during this attempt?"
                />
              </label>

              <label>
                What helped
                <textarea
                  value={attemptForm.whatHelped}
                  onChange={(event) => updateAttemptForm("whatHelped", event.target.value)}
                  placeholder="Pointer movement, invariant, or pattern that helped."
                />
              </label>

              <label>
                What was difficult
                <textarea
                  value={attemptForm.whatWasDifficult}
                  onChange={(event) => updateAttemptForm("whatWasDifficult", event.target.value)}
                  placeholder="Where did you hesitate?"
                />
              </label>

              <label>
                Improve next
                <textarea
                  value={attemptForm.improveNext}
                  onChange={(event) => updateAttemptForm("improveNext", event.target.value)}
                  placeholder="One thing to sharpen next time."
                />
              </label>

              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Saving attempt..." : "Save attempt"}
              </button>
            </form>

            {selectedExercise.practiceSessions.length ? (
              <ul className="stack-list attempt-history">
                {selectedExercise.practiceSessions.map((session) => (
                  <li className="list-row" key={session.id}>
                    <div>
                      <strong>{formatStatus(session.outcome)}</strong>
                      <span>{formatDate(session.startedAt)}</span>
                      {session.notes ? <small>{session.notes}</small> : null}
                      {session.sourceCode ? (
                        <details className="history-code">
                          <summary>View saved code</summary>
                          <pre>
                            <code>{session.sourceCode}</code>
                          </pre>
                        </details>
                      ) : null}
                    </div>
                    <span className="confidence">{session.confidence ? `${session.confidence}/5` : "No confidence"}</span>
                  </li>
                ))}
              </ul>
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
 * Represents an edited code textarea value and the selection that should be restored.
 */
interface CodeEditorEdit {
  /** Edited textarea value. */
  value: string;
  /** Next selection start. */
  selectionStart: number;
  /** Next selection end. */
  selectionEnd: number;
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
          Previous page
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
          Next page
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
function toPracticeRequest(learningItemId: string, form: BasicsAttemptForm): CreatePracticeSessionRequest {
  const durationMinutes = Number(form.durationMinutes);
  const durationMs = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes * 60 * 1000 : undefined;

  return {
    learningItemId,
    outcome: form.outcome,
    confidence: form.confidence ? Number(form.confidence) : null,
    durationMs,
    notes: form.notes.trim(),
    sourceCode: form.codeDraft.trim(),
    whatHelped: form.whatHelped.trim(),
    whatWasDifficult: form.whatWasDifficult.trim(),
    improveNext: form.improveNext.trim()
  };
}

/**
 * Creates the local attempt form for a Basics exercise.
 *
 * @param exercise - Selected Basics exercise.
 * @returns Editable attempt form.
 */
function createAttemptForm(exercise: BasicExercise): BasicsAttemptForm {
  return {
    ...emptyAttemptForm,
    codeDraft: exercise.starterCode
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
 * Adds indentation to the current cursor or selected lines.
 *
 * @param value - Current editor value.
 * @param selectionStart - Current selection start.
 * @param selectionEnd - Current selection end.
 * @returns Edited code and selection.
 */
function addCodeEditorIndentation(value: string, selectionStart: number, selectionEnd: number): CodeEditorEdit {
  if (selectionStart === selectionEnd || !value.slice(selectionStart, selectionEnd).includes("\n")) {
    return {
      value: `${value.slice(0, selectionStart)}${codeEditorIndent}${value.slice(selectionEnd)}`,
      selectionStart: selectionStart + codeEditorIndent.length,
      selectionEnd: selectionStart + codeEditorIndent.length
    };
  }

  const lineStart = findLineStart(value, selectionStart);
  const lineEnd = findSelectedLineEnd(value, selectionStart, selectionEnd);
  const block = value.slice(lineStart, lineEnd);
  const lineCount = block.split("\n").length;
  const indentedBlock = block
    .split("\n")
    .map((line) => `${codeEditorIndent}${line}`)
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${indentedBlock}${value.slice(lineEnd)}`,
    selectionStart: selectionStart + codeEditorIndent.length,
    selectionEnd: selectionEnd + lineCount * codeEditorIndent.length
  };
}

/**
 * Removes one indentation level from the current line or selected lines.
 *
 * @param value - Current editor value.
 * @param selectionStart - Current selection start.
 * @param selectionEnd - Current selection end.
 * @returns Edited code and selection.
 */
function removeCodeEditorIndentation(value: string, selectionStart: number, selectionEnd: number): CodeEditorEdit {
  const lineStart = findLineStart(value, selectionStart);
  const lineEnd = findSelectedLineEnd(value, selectionStart, selectionEnd);
  const block = value.slice(lineStart, lineEnd);
  let removedBeforeSelection = 0;
  let removedInsideSelection = 0;
  let offset = lineStart;

  const outdentedBlock = block
    .split("\n")
    .map((line) => {
      const removeCount = line.startsWith(codeEditorIndent) ? codeEditorIndent.length : line.startsWith("\t") ? 1 : 0;

      if (removeCount > 0) {
        if (offset < selectionStart) {
          removedBeforeSelection += Math.min(removeCount, selectionStart - offset);
        }

        if (offset < selectionEnd) {
          removedInsideSelection += removeCount;
        }
      }

      offset += line.length + 1;
      return line.slice(removeCount);
    })
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${outdentedBlock}${value.slice(lineEnd)}`,
    selectionStart: Math.max(lineStart, selectionStart - removedBeforeSelection),
    selectionEnd: Math.max(lineStart, selectionEnd - removedInsideSelection)
  };
}

/**
 * Finds the first character index of the line containing a selection.
 *
 * @param value - Current editor value.
 * @param selectionStart - Current selection start.
 * @returns Start index for the containing line.
 */
function findLineStart(value: string, selectionStart: number) {
  return value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
}

/**
 * Finds the end index of the selected line block.
 *
 * @param value - Current editor value.
 * @param selectionStart - Current selection start.
 * @param selectionEnd - Current selection end.
 * @returns End index for the selected line block.
 */
function findSelectedLineEnd(value: string, selectionStart: number, selectionEnd: number) {
  if (selectionStart === selectionEnd) {
    return value.indexOf("\n", selectionEnd) === -1 ? value.length : value.indexOf("\n", selectionEnd);
  }

  return value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
}

/**
 * Converts an API status into display text.
 *
 * @param status - Status value.
 * @returns Human-readable status.
 */
function formatStatus(status: string) {
  return status.replace(/([A-Z])/g, " $1").trim();
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
