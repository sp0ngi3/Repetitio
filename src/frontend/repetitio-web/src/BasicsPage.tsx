import { FormEvent, useMemo, useState } from "react";
import { createPracticeSession, executeBasicExercise } from "./api";
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
          <div className="record-table">
            <div className="record-header">
              <span>Exercise</span>
              <span>Tags</span>
              <span>Status</span>
              <span>Difficulty</span>
              <span>Times solved</span>
            </div>
            {props.basicExercises.map((exercise) => (
              <button className="record-row" type="button" key={exercise.slug} onClick={() => openExercise(exercise)}>
                <span>
                  <strong>{exercise.title}</strong>
                  <small>{exercise.functionSignature}</small>
                </span>
                <span className="tag-row compact">
                  {exercise.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </span>
                <span>{formatStatus(exercise.status)}</span>
                <span>{exercise.difficulty}</span>
                <span>{exercise.successfulAttempts}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-state">Loading built-in basics...</p>
        )}
      </section>
    </section>
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
