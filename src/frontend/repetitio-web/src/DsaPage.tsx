import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  createDsaProblem,
  createDsaSolution,
  createPracticeSession,
  deleteDsaProblem,
  getDsaProblemTemplate,
  getDsaProblems,
  updateDsaProblem
} from "./api";
import { getPracticeAgeClass, getReviewDueClass } from "./practiceAge";
import type {
  CreateDsaProblemRequest,
  CreateDsaSolutionRequest,
  CreatePracticeSessionRequest,
  DsaProblem,
  DsaProblemTemplate,
  LearningDifficulty,
  LearningItemStatus,
  PracticeOutcome,
  PracticeSession,
  UpdateDsaProblemRequest
} from "./types";

/**
 * Difficulty choices rendered by DSA filters and forms.
 */
const difficulties: LearningDifficulty[] = ["Unknown", "Easy", "Medium", "Hard"];

/**
 * Status choices rendered by DSA filters and forms.
 */
const statuses: LearningItemStatus[] = ["NotStarted", "InProgress", "Completed", "Mastered"];

/**
 * Practice outcome choices rendered by the attempt form.
 */
const outcomes: PracticeOutcome[] = ["Completed", "Passed", "Partial", "Failed"];

/**
 * DSA page view modes.
 */
type DsaView = "dashboard" | "new" | "detail";

/**
 * Represents DSA list filters.
 */
interface DsaFilters {
  /** Optional text search. */
  search: string;
  /** Optional progress status filter. */
  status: LearningItemStatus | "";
  /** Optional difficulty filter. */
  difficulty: LearningDifficulty | "";
}

/**
 * Represents the local editable DSA problem form state.
 */
interface DsaProblemForm {
  /** Problem title. */
  title: string;
  /** Problem source, such as LeetCode. */
  source: string;
  /** External problem URL. */
  externalUrl: string;
  /** Problem difficulty. */
  difficulty: LearningDifficulty;
  /** Comma-separated tags. */
  tagsText: string;
  /** Short description. */
  description: string;
  /** Problem statement. */
  problemStatement: string;
  /** Captured test cases. */
  testCases: string;
  /** Assumptions before solving. */
  assumptions: string;
  /** Expected time complexity. */
  expectedTimeComplexity: string;
  /** Expected space complexity. */
  expectedSpaceComplexity: string;
}

/**
 * Represents the local editable DSA attempt form state.
 */
interface DsaAttemptForm {
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
  /** Chosen approach after the attempt. */
  approach: string;
}

/**
 * Initial DSA problem form state.
 */
const emptyProblemForm: DsaProblemForm = {
  title: "",
  source: "LeetCode",
  externalUrl: "",
  difficulty: "Unknown",
  tagsText: "",
  description: "",
  problemStatement: "",
  testCases: "",
  assumptions: "",
  expectedTimeComplexity: "",
  expectedSpaceComplexity: ""
};

/**
 * Initial DSA attempt form state.
 */
const emptyAttemptForm: DsaAttemptForm = {
  outcome: "Completed",
  confidence: "",
  durationMinutes: "",
  notes: "",
  whatHelped: "",
  whatWasDifficult: "",
  improveNext: "",
  approach: ""
};

/**
 * Initial solution form state.
 */
const emptySolutionForm: CreateDsaSolutionRequest = {
  language: "C#",
  sourceCode: "",
  explanation: "",
  timeComplexity: "",
  spaceComplexity: ""
};

/**
 * Props accepted by the DSA page.
 */
interface DsaPageProps {
  /** Called after DSA changes that should update parent dashboard data. */
  onChanged?: () => Promise<void> | void;
}

/**
 * Renders the DSA tracker with a dashboard, add page, and detail page.
 *
 * @param props - Component props.
 * @returns The DSA page.
 */
export function DsaPage({ onChanged }: DsaPageProps) {
  const [view, setView] = useState<DsaView>("dashboard");
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DsaFilters>({ search: "", status: "", difficulty: "" });
  const [template, setTemplate] = useState<DsaProblemTemplate | null>(null);
  const [problemForm, setProblemForm] = useState<DsaProblemForm>(emptyProblemForm);
  const [attemptForm, setAttemptForm] = useState<DsaAttemptForm>(emptyAttemptForm);
  const [solutionForm, setSolutionForm] = useState<CreateDsaSolutionRequest>(emptySolutionForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedProblemId) ?? null,
    [problems, selectedProblemId]
  );

  /**
   * Loads DSA problems with the current filters.
   */
  async function loadProblems() {
    setError(null);

    try {
      const nextProblems = await getDsaProblems(filters);
      setProblems(nextProblems);

      if (selectedProblemId && !nextProblems.some((problem) => problem.id === selectedProblemId)) {
        setSelectedProblemId(null);
        setView("dashboard");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load DSA problems.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProblems();
  }, [filters.difficulty, filters.search, filters.status]);

  useEffect(() => {
    /**
     * Loads the default DSA template once for the add page.
     */
    async function loadTemplate() {
      try {
        setTemplate(await getDsaProblemTemplate());
      } catch {
        setTemplate(null);
      }
    }

    void loadTemplate();
  }, []);

  /**
   * Opens the DSA add page.
   */
  function openNewProblem() {
    setSelectedProblemId(null);
    setProblemForm(createProblemFormFromTemplate(template));
    setAttemptForm(emptyAttemptForm);
    setSolutionForm(emptySolutionForm);
    setView("new");
    setError(null);
  }

  /**
   * Opens an existing problem detail page.
   *
   * @param problem - Problem selected from the dashboard.
   */
  function openProblem(problem: DsaProblem) {
    setSelectedProblemId(problem.id);
    setProblemForm(createProblemFormFromProblem(problem));
    setAttemptForm(emptyAttemptForm);
    setSolutionForm(emptySolutionForm);
    setView("detail");
    setError(null);
  }

  /**
   * Returns to the DSA dashboard.
   */
  function returnToDashboard() {
    setView("dashboard");
    setSelectedProblemId(null);
    setError(null);
  }

  /**
   * Updates one problem form field.
   *
   * @param key - Field name to update.
   * @param value - Next field value.
   */
  function updateProblemForm<K extends keyof DsaProblemForm>(key: K, value: DsaProblemForm[K]) {
    setProblemForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Updates one attempt form field.
   *
   * @param key - Field name to update.
   * @param value - Next field value.
   */
  function updateAttemptForm<K extends keyof DsaAttemptForm>(key: K, value: DsaAttemptForm[K]) {
    setAttemptForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Updates one solution form field.
   *
   * @param key - Field name to update.
   * @param value - Next field value.
   */
  function updateSolutionForm<K extends keyof CreateDsaSolutionRequest>(
    key: K,
    value: CreateDsaSolutionRequest[K]
  ) {
    setSolutionForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Creates a new DSA problem from the add page.
   *
   * @param event - The form submission event.
   */
  async function handleCreateProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!problemForm.title.trim()) {
      setError("Title is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savedProblem = await createDsaProblem(toCreateProblemRequest(problemForm));
      await loadProblems();
      await onChanged?.();
      openProblem(savedProblem);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create DSA problem.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Updates the currently selected DSA problem metadata.
   */
  async function saveProblemMetadata() {
    if (!selectedProblem) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedProblem = await updateDsaProblem(selectedProblem.id, toUpdateProblemRequest(problemForm, selectedProblem));
      await loadProblems();
      await onChanged?.();
      openProblem(updatedProblem);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save problem metadata.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Records a new attempt for the selected DSA problem.
   *
   * @param event - The form submission event.
   */
  async function handleAttemptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProblem) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const metadata = toUpdateProblemRequest(problemForm, selectedProblem);
      await updateDsaProblem(selectedProblem.id, {
        ...metadata,
        approach: attemptForm.approach.trim() || metadata.approach,
        notes: attemptForm.notes.trim() || selectedProblem.notes || "",
        whatHelped: attemptForm.whatHelped.trim() || selectedProblem.whatHelped || "",
        whatWasDifficult: attemptForm.whatWasDifficult.trim() || selectedProblem.whatWasDifficult || "",
        improveNext: attemptForm.improveNext.trim() || selectedProblem.improveNext || ""
      });
      await createPracticeSession(toPracticeRequest(selectedProblem.id, attemptForm, solutionForm.sourceCode));

      if (solutionForm.sourceCode.trim()) {
        await createDsaSolution(selectedProblem.id, {
          ...solutionForm,
          language: solutionForm.language.trim() || "C#",
          sourceCode: solutionForm.sourceCode.trim()
        });
      }

      setAttemptForm(emptyAttemptForm);
      setSolutionForm(emptySolutionForm);
      await loadProblems();
      await onChanged?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save attempt.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Deletes the currently selected DSA problem.
   */
  async function handleDeleteProblem() {
    if (!selectedProblem) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteDsaProblem(selectedProblem.id);
      await loadProblems();
      await onChanged?.();
      returnToDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete DSA problem.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tracker-page" aria-labelledby="dsa-title">
      {view === "dashboard" ? (
        <DsaDashboard
          filters={filters}
          isLoading={isLoading}
          problems={problems}
          onAdd={openNewProblem}
          onFiltersChange={setFilters}
          onOpen={openProblem}
        />
      ) : null}

      {view === "new" ? (
        <DsaProblemCreatePage
          error={error}
          form={problemForm}
          isSaving={isSaving}
          onBack={returnToDashboard}
          onChange={updateProblemForm}
          onSubmit={handleCreateProblem}
        />
      ) : null}

      {view === "detail" && selectedProblem ? (
        <DsaProblemDetailPage
          attemptForm={attemptForm}
          error={error}
          isSaving={isSaving}
          problem={selectedProblem}
          problemForm={problemForm}
          solutionForm={solutionForm}
          onAttemptChange={updateAttemptForm}
          onAttemptSubmit={handleAttemptSubmit}
          onBack={returnToDashboard}
          onDelete={handleDeleteProblem}
          onProblemChange={updateProblemForm}
          onSaveMetadata={saveProblemMetadata}
          onSolutionChange={updateSolutionForm}
        />
      ) : null}
    </section>
  );
}

/**
 * Props accepted by the DSA dashboard.
 */
interface DsaDashboardProps {
  /** Current list filters. */
  filters: DsaFilters;
  /** Whether DSA problems are loading. */
  isLoading: boolean;
  /** DSA problems shown in the dashboard. */
  problems: DsaProblem[];
  /** Opens the add page. */
  onAdd: () => void;
  /** Updates list filters. */
  onFiltersChange: (filters: DsaFilters) => void;
  /** Opens a problem detail page. */
  onOpen: (problem: DsaProblem) => void;
}

/**
 * Renders the scan-first DSA dashboard.
 *
 * @param props - Component props.
 * @returns The DSA dashboard.
 */
function DsaDashboard(props: DsaDashboardProps) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">DSA dashboard</p>
          <h2 id="dsa-title">Problems</h2>
        </div>
        <button className="secondary-button" type="button" onClick={props.onAdd}>
          Add problem
        </button>
      </div>

      <div className="panel tracker-toolbar" aria-label="DSA filters">
        <label>
          Search
          <input
            value={props.filters.search}
            onChange={(event) => props.onFiltersChange({ ...props.filters, search: event.target.value })}
            placeholder="problem, source, tag..."
          />
        </label>

        <label>
          Status
          <select
            value={props.filters.status}
            onChange={(event) =>
              props.onFiltersChange({ ...props.filters, status: event.target.value as LearningItemStatus | "" })
            }
          >
            <option value="">All</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Difficulty
          <select
            value={props.filters.difficulty}
            onChange={(event) =>
              props.onFiltersChange({ ...props.filters, difficulty: event.target.value as LearningDifficulty | "" })
            }
          >
            <option value="">All</option>
            {difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="panel data-panel" aria-label="DSA problem records">
        {props.isLoading ? (
          <p className="empty-state">Loading DSA problems...</p>
        ) : props.problems.length ? (
          <div className="record-table dsa-table">
            <div className="record-header">
              <span>Problem</span>
              <span>Tags</span>
              <span>Last practiced</span>
              <span>Next review</span>
              <span>Status</span>
              <span>Solved</span>
            </div>
            {props.problems.map((problem) => {
              const lastPracticedClass = getPracticeAgeClass(problem.lastPracticedAt);
              const nextReviewClass = getReviewDueClass(problem.nextReviewAt, problem.lastPracticedAt);

              return (
                <button className="record-row" type="button" key={problem.id} onClick={() => props.onOpen(problem)}>
                  <span>
                    <strong>{problem.title}</strong>
                    <small>
                      {problem.source || "Personal"} · {problem.difficulty}
                    </small>
                  </span>
                  <span className="tag-row compact">
                    {problem.tags.length ? problem.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                  </span>
                  <span className={`date-chip ${lastPracticedClass}`}>{formatLastPracticed(problem.lastPracticedAt)}</span>
                  <span className={`date-chip ${nextReviewClass}`}>{formatNextReview(problem)}</span>
                  <span>{formatStatus(problem.status)}</span>
                  <span>{problem.successfulAttempts}/{Math.max(problem.totalAttempts, problem.successfulAttempts)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No DSA problems yet.</p>
        )}
      </section>
    </>
  );
}

/**
 * Props accepted by the DSA problem create page.
 */
interface DsaProblemCreatePageProps {
  /** Current error message. */
  error: string | null;
  /** Editable problem form. */
  form: DsaProblemForm;
  /** Whether the form is saving. */
  isSaving: boolean;
  /** Returns to the dashboard. */
  onBack: () => void;
  /** Updates one form field. */
  onChange: <K extends keyof DsaProblemForm>(key: K, value: DsaProblemForm[K]) => void;
  /** Handles problem creation. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Renders the DSA add page with a coding-workspace style layout.
 *
 * @param props - Component props.
 * @returns The DSA problem create page.
 */
function DsaProblemCreatePage(props: DsaProblemCreatePageProps) {
  return (
    <>
      <PageBackHeader eyebrow="New DSA problem" title="Add problem" onBack={props.onBack} />
      {props.error ? <p className="error-banner">{props.error}</p> : null}
      <form className="coding-layout" onSubmit={props.onSubmit}>
        <ProblemEditorPanel form={props.form} onChange={props.onChange} />
        <aside className="panel solve-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Setup</p>
              <h3>Metadata</h3>
            </div>
          </div>
          <MetadataFields form={props.form} onChange={props.onChange} />
          <button className="primary-button" type="submit" disabled={props.isSaving}>
            {props.isSaving ? "Saving..." : "Save problem"}
          </button>
        </aside>
      </form>
    </>
  );
}

/**
 * Props accepted by the DSA detail page.
 */
interface DsaProblemDetailPageProps {
  /** Current attempt form. */
  attemptForm: DsaAttemptForm;
  /** Current error message. */
  error: string | null;
  /** Whether a request is saving. */
  isSaving: boolean;
  /** Selected DSA problem. */
  problem: DsaProblem;
  /** Editable problem metadata. */
  problemForm: DsaProblemForm;
  /** Editable solution form. */
  solutionForm: CreateDsaSolutionRequest;
  /** Updates one attempt form field. */
  onAttemptChange: <K extends keyof DsaAttemptForm>(key: K, value: DsaAttemptForm[K]) => void;
  /** Handles attempt save. */
  onAttemptSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Returns to the dashboard. */
  onBack: () => void;
  /** Deletes the selected problem. */
  onDelete: () => void;
  /** Updates one problem form field. */
  onProblemChange: <K extends keyof DsaProblemForm>(key: K, value: DsaProblemForm[K]) => void;
  /** Saves problem metadata. */
  onSaveMetadata: () => void;
  /** Updates one solution form field. */
  onSolutionChange: <K extends keyof CreateDsaSolutionRequest>(
    key: K,
    value: CreateDsaSolutionRequest[K]
  ) => void;
}

/**
 * Renders the DSA detail page where attempts and solutions are recorded.
 *
 * @param props - Component props.
 * @returns The DSA problem detail page.
 */
function DsaProblemDetailPage(props: DsaProblemDetailPageProps) {
  return (
    <>
      <PageBackHeader eyebrow="DSA problem" title={props.problem.title} onBack={props.onBack} />
      {props.error ? <p className="error-banner">{props.error}</p> : null}
      <div className="coding-layout">
        <ProblemEditorPanel form={props.problemForm} onChange={props.onProblemChange}>
          <div className="editor-actions">
            <button className="secondary-button" type="button" onClick={props.onSaveMetadata} disabled={props.isSaving}>
              Save metadata
            </button>
            <button className="danger-button" type="button" onClick={props.onDelete} disabled={props.isSaving}>
              Delete
            </button>
          </div>
        </ProblemEditorPanel>

        <aside className="panel solve-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Progress</p>
              <h3>Attempt problem</h3>
            </div>
          </div>

          <dl className="attempt-stats">
            <div>
              <dt>Times solved</dt>
              <dd>{props.problem.successfulAttempts}/6</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatStatus(props.problem.status)}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{props.problem.difficulty}</dd>
            </div>
            <div>
              <dt>Last practiced</dt>
              <dd>
                <span className={`date-chip ${getPracticeAgeClass(props.problem.lastPracticedAt)}`}>
                  {formatLastPracticed(props.problem.lastPracticedAt)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Next review</dt>
              <dd>
                <span className={`date-chip ${getReviewDueClass(props.problem.nextReviewAt, props.problem.lastPracticedAt)}`}>
                  {formatNextReview(props.problem)}
                </span>
              </dd>
            </div>
          </dl>

          <SavedProblemMemory problem={props.problem} />

          <form className="attempt-form" onSubmit={props.onAttemptSubmit}>
            <div className="form-grid two-columns">
              <label>
                Outcome
                <select
                  value={props.attemptForm.outcome}
                  onChange={(event) => props.onAttemptChange("outcome", event.target.value as PracticeOutcome)}
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
                  value={props.attemptForm.confidence}
                  onChange={(event) => props.onAttemptChange("confidence", event.target.value)}
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
                value={props.attemptForm.durationMinutes}
                onChange={(event) => props.onAttemptChange("durationMinutes", event.target.value)}
                placeholder="35"
              />
            </label>

            <label>
              Approach
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.approach}
                onChange={(event) => props.onAttemptChange("approach", event.target.value)}
                placeholder="What approach did you use this time?"
              />
            </label>

            <label>
              Notes
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.notes}
                onChange={(event) => props.onAttemptChange("notes", event.target.value)}
                placeholder="What happened during this attempt?"
              />
            </label>

            <label>
              What helped
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.whatHelped}
                onChange={(event) => props.onAttemptChange("whatHelped", event.target.value)}
                placeholder="Pattern, hint, or idea that unlocked progress."
              />
            </label>

            <label>
              What was difficult
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.whatWasDifficult}
                onChange={(event) => props.onAttemptChange("whatWasDifficult", event.target.value)}
                placeholder="Where did you get stuck?"
              />
            </label>

            <label>
              Improve next
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.improveNext}
                onChange={(event) => props.onAttemptChange("improveNext", event.target.value)}
                placeholder="One thing to do better next time."
              />
            </label>

            <div className="solution-box">
              <div className="panel-heading">
                <p className="eyebrow">Optional solution</p>
                <span>{props.solutionForm.language || "C#"}</span>
              </div>
              <label>
                Language
                <input
                  value={props.solutionForm.language}
                  onChange={(event) => props.onSolutionChange("language", event.target.value)}
                />
              </label>
              <label>
                Source code
                <textarea
                  className="code-input expanding-textarea"
                  value={props.solutionForm.sourceCode}
                  onChange={(event) => props.onSolutionChange("sourceCode", event.target.value)}
                  placeholder="Paste your accepted solution."
                />
              </label>
              <div className="form-grid two-columns">
                <label>
                  Time
                  <input
                    value={props.solutionForm.timeComplexity}
                    onChange={(event) => props.onSolutionChange("timeComplexity", event.target.value)}
                    placeholder="O(n)"
                  />
                </label>
                <label>
                  Space
                  <input
                    value={props.solutionForm.spaceComplexity}
                    onChange={(event) => props.onSolutionChange("spaceComplexity", event.target.value)}
                    placeholder="O(1)"
                  />
                </label>
              </div>
              <label>
                Explanation
                <textarea
                  className="medium-textarea expanding-textarea"
                  value={props.solutionForm.explanation}
                  onChange={(event) => props.onSolutionChange("explanation", event.target.value)}
                  placeholder="Why this solution works."
                />
              </label>
            </div>

            <button className="primary-button" type="submit" disabled={props.isSaving}>
              {props.isSaving ? "Saving attempt..." : "Save attempt"}
            </button>
          </form>

          <AttemptHistory problem={props.problem} />
        </aside>
      </div>
    </>
  );
}

/**
 * Props accepted by the page back header.
 */
interface PageBackHeaderProps {
  /** Small header label. */
  eyebrow: string;
  /** Main header title. */
  title: string;
  /** Returns to the previous dashboard. */
  onBack: () => void;
}

/**
 * Renders a compact header with a back action.
 *
 * @param props - Component props.
 * @returns The page back header.
 */
function PageBackHeader(props: PageBackHeaderProps) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{props.eyebrow}</p>
        <h2>{props.title}</h2>
      </div>
      <button className="secondary-button" type="button" onClick={props.onBack}>
        Back
      </button>
    </div>
  );
}

/**
 * Props accepted by the problem editor panel.
 */
interface ProblemEditorPanelProps {
  /** Editable problem form. */
  form: DsaProblemForm;
  /** Optional action content. */
  children?: ReactNode;
  /** Updates one form field. */
  onChange: <K extends keyof DsaProblemForm>(key: K, value: DsaProblemForm[K]) => void;
}

/**
 * Renders the left-side problem editor.
 *
 * @param props - Component props.
 * @returns The problem editor panel.
 */
function ProblemEditorPanel(props: ProblemEditorPanelProps) {
  return (
    <section className="panel problem-panel" aria-label="Problem editor">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Problem</p>
          <h3>{props.form.title || "Untitled problem"}</h3>
        </div>
        {props.children}
      </div>

      <label>
        Title
        <input
          value={props.form.title}
          onChange={(event) => props.onChange("title", event.target.value)}
          placeholder="Longest Substring Without Repeating Characters"
        />
      </label>

      <label>
        Problem statement
        <textarea
          className="large-textarea expanding-textarea"
          value={props.form.problemStatement}
          onChange={(event) => props.onChange("problemStatement", event.target.value)}
          placeholder="Paste the prompt, examples, and constraints."
        />
      </label>

      <div className="form-grid two-columns">
        <label>
          Test cases
          <textarea
            className="medium-textarea expanding-textarea"
            value={props.form.testCases}
            onChange={(event) => props.onChange("testCases", event.target.value)}
            placeholder="Edge cases and sample inputs."
          />
        </label>
        <label>
          Assumptions
          <textarea
            className="medium-textarea expanding-textarea"
            value={props.form.assumptions}
            onChange={(event) => props.onChange("assumptions", event.target.value)}
            placeholder="Constraints and clarifying assumptions."
          />
        </label>
      </div>
    </section>
  );
}

/**
 * Props accepted by metadata fields.
 */
interface MetadataFieldsProps {
  /** Editable problem form. */
  form: DsaProblemForm;
  /** Updates one form field. */
  onChange: <K extends keyof DsaProblemForm>(key: K, value: DsaProblemForm[K]) => void;
}

/**
 * Renders DSA problem metadata controls.
 *
 * @param props - Component props.
 * @returns Metadata form fields.
 */
function MetadataFields(props: MetadataFieldsProps) {
  return (
    <>
      <label>
        Source
        <input
          value={props.form.source}
          onChange={(event) => props.onChange("source", event.target.value)}
          placeholder="LeetCode"
        />
      </label>

      <label>
        External URL
        <input
          value={props.form.externalUrl}
          onChange={(event) => props.onChange("externalUrl", event.target.value)}
          placeholder="https://..."
        />
      </label>

      <label>
        Difficulty
        <select
          value={props.form.difficulty}
          onChange={(event) => props.onChange("difficulty", event.target.value as LearningDifficulty)}
        >
          {difficulties.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty}
            </option>
          ))}
        </select>
      </label>

      <label>
        Tags
        <input
          value={props.form.tagsText}
          onChange={(event) => props.onChange("tagsText", event.target.value)}
          placeholder="arrays, sliding-window"
        />
      </label>

      <label>
        Description
        <textarea
          className="medium-textarea expanding-textarea"
          value={props.form.description}
          onChange={(event) => props.onChange("description", event.target.value)}
          placeholder="Short reminder for future practice."
        />
      </label>

      <div className="form-grid two-columns">
        <label>
          Expected time
          <input
            value={props.form.expectedTimeComplexity}
            onChange={(event) => props.onChange("expectedTimeComplexity", event.target.value)}
            placeholder="O(n)"
          />
        </label>
        <label>
          Expected space
          <input
            value={props.form.expectedSpaceComplexity}
            onChange={(event) => props.onChange("expectedSpaceComplexity", event.target.value)}
            placeholder="O(1)"
          />
        </label>
      </div>
    </>
  );
}

/**
 * Props accepted by the attempt history component.
 */
interface AttemptHistoryProps {
  /** Selected DSA problem. */
  problem: DsaProblem;
}

/**
 * Renders previously saved problem-level memory behind an explicit reveal.
 *
 * @param props - Component props.
 * @returns The saved memory section.
 */
function SavedProblemMemory(props: AttemptHistoryProps) {
  if (!hasAnyText(props.problem.approach, props.problem.notes, props.problem.whatHelped, props.problem.whatWasDifficult, props.problem.improveNext)) {
    return null;
  }

  return (
    <details className="solution-peek memory-peek">
      <summary>Reveal saved approach and notes</summary>
      <div className="attempt-history-grid">
        <HistoryField label="Approach" value={props.problem.approach} />
        <HistoryField label="Notes" value={props.problem.notes} />
        <HistoryField label="What helped" value={props.problem.whatHelped} />
        <HistoryField label="What was difficult" value={props.problem.whatWasDifficult} />
        <HistoryField label="Improve next" value={props.problem.improveNext} />
      </div>
    </details>
  );
}

/**
 * Renders prior attempts and saved solutions.
 *
 * @param props - Component props.
 * @returns Attempt history.
 */
function AttemptHistory(props: AttemptHistoryProps) {
  return (
    <div className="history-panel">
      <h3>History</h3>
      {props.problem.practiceSessions.length ? (
        <div className="detail-stack">
          {props.problem.practiceSessions.map((session) => (
            <details className="solution-peek attempt-history-entry" key={session.id}>
              <summary>
                <span>
                  {formatStatus(session.outcome)} · {formatDateTime(session.startedAt)}
                </span>
                <span>{formatAttemptMeta(session)}</span>
              </summary>
              {hasAnyText(session.notes, session.whatHelped, session.whatWasDifficult, session.improveNext) ? (
                <div className="attempt-history-grid">
                  <HistoryField label="Notes" value={session.notes} />
                  <HistoryField label="What helped" value={session.whatHelped} />
                  <HistoryField label="What was difficult" value={session.whatWasDifficult} />
                  <HistoryField label="Improve next" value={session.improveNext} />
                </div>
              ) : (
                <p className="empty-state compact-empty">No reflection captured for this attempt.</p>
              )}
              {session.sourceCode ? (
                <pre>
                  <code>{session.sourceCode}</code>
                </pre>
              ) : null}
            </details>
          ))}
        </div>
      ) : (
        <p className="empty-state">No attempts yet.</p>
      )}

      {props.problem.solutions.length ? (
        <div className="detail-stack">
          {props.problem.solutions.map((solution) => (
            <details className="solution-peek" key={solution.id}>
              <summary>
                {solution.language} · {formatDate(solution.createdAt)}
              </summary>
              {solution.explanation ? <p>{solution.explanation}</p> : null}
              {solution.timeComplexity || solution.spaceComplexity ? (
                <div className="solution-meta">
                  {solution.timeComplexity ? <span>Time {solution.timeComplexity}</span> : null}
                  {solution.spaceComplexity ? <span>Space {solution.spaceComplexity}</span> : null}
                </div>
              ) : null}
              <pre>
                <code>{solution.sourceCode}</code>
              </pre>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Props accepted by a history field.
 */
interface HistoryFieldProps {
  /** Field label. */
  label: string;
  /** Optional field value. */
  value?: string | null;
}

/**
 * Renders one non-empty reflection field.
 *
 * @param props - Component props.
 * @returns A labeled history field when it has content.
 */
function HistoryField(props: HistoryFieldProps) {
  if (!hasText(props.value)) {
    return null;
  }

  return (
    <div className="history-field">
      <strong>{props.label}</strong>
      <p>{props.value}</p>
    </div>
  );
}

/**
 * Creates a new problem form from the default template.
 *
 * @param template - Optional default DSA template.
 * @returns Editable DSA problem form.
 */
function createProblemFormFromTemplate(template: DsaProblemTemplate | null): DsaProblemForm {
  return {
    ...emptyProblemForm,
    problemStatement: template?.problemStatement ?? "",
    testCases: template?.testCases ?? "",
    assumptions: template?.assumptions ?? ""
  };
}

/**
 * Creates a problem form from an existing DSA problem.
 *
 * @param problem - Existing DSA problem.
 * @returns Editable DSA problem form.
 */
function createProblemFormFromProblem(problem: DsaProblem): DsaProblemForm {
  return {
    title: problem.title,
    source: problem.source ?? "",
    externalUrl: problem.externalUrl ?? "",
    difficulty: problem.difficulty,
    tagsText: problem.tags.join(", "),
    description: problem.description ?? "",
    problemStatement: problem.problemStatement ?? "",
    testCases: problem.testCases ?? "",
    assumptions: problem.assumptions ?? "",
    expectedTimeComplexity: problem.expectedTimeComplexity ?? "",
    expectedSpaceComplexity: problem.expectedSpaceComplexity ?? ""
  };
}

/**
 * Converts the problem form into a create request.
 *
 * @param form - Editable DSA problem form.
 * @returns DSA create request payload.
 */
function toCreateProblemRequest(form: DsaProblemForm): CreateDsaProblemRequest {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    source: form.source.trim(),
    externalUrl: form.externalUrl.trim(),
    difficulty: form.difficulty,
    tags: parseTags(form.tagsText),
    problemStatement: form.problemStatement.trim(),
    testCases: form.testCases.trim(),
    assumptions: form.assumptions.trim(),
    expectedTimeComplexity: form.expectedTimeComplexity.trim(),
    expectedSpaceComplexity: form.expectedSpaceComplexity.trim()
  };
}

/**
 * Converts the problem form into an update request.
 *
 * @param form - Editable DSA problem form.
 * @param problem - Current persisted DSA problem.
 * @returns DSA update request payload.
 */
function toUpdateProblemRequest(form: DsaProblemForm, problem: DsaProblem): UpdateDsaProblemRequest {
  return {
    ...toCreateProblemRequest(form),
    status: problem.status,
    confidence: problem.confidence,
    approach: problem.approach ?? "",
    notes: problem.notes ?? "",
    whatHelped: problem.whatHelped ?? "",
    whatWasDifficult: problem.whatWasDifficult ?? "",
    improveNext: problem.improveNext ?? "",
    knowledgeChecklist: problem.knowledgeChecklist ?? "",
    questionsToAsk: problem.questionsToAsk ?? "",
    missedMentalSteps: problem.missedMentalSteps ?? ""
  };
}

/**
 * Converts an attempt form into a practice request.
 *
 * @param problemId - DSA problem identifier.
 * @param form - Editable attempt form.
 * @param sourceCode - Optional source code captured during the attempt.
 * @returns Practice session creation payload.
 */
function toPracticeRequest(problemId: string, form: DsaAttemptForm, sourceCode?: string): CreatePracticeSessionRequest {
  const durationMinutes = Number(form.durationMinutes);
  const durationMs = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes * 60 * 1000 : undefined;

  return {
    learningItemId: problemId,
    outcome: form.outcome,
    confidence: form.confidence ? Number(form.confidence) : null,
    durationMs,
    notes: form.notes.trim(),
    sourceCode: sourceCode?.trim() || undefined,
    whatHelped: form.whatHelped.trim(),
    whatWasDifficult: form.whatWasDifficult.trim(),
    improveNext: form.improveNext.trim()
  };
}

/**
 * Formats the last practice timestamp for dashboard display.
 *
 * @param value - Last practice timestamp.
 * @returns Human-readable last practice text.
 */
function formatLastPracticed(value?: string | null) {
  return value ? formatDate(value) : "Never";
}

/**
 * Formats the next review state for dashboard display.
 *
 * @param problem - DSA problem with review metadata.
 * @returns Human-readable review text.
 */
function formatNextReview(problem: DsaProblem) {
  if (!problem.nextReviewAt) {
    return problem.lastPracticedAt ? "Not scheduled" : "Start now";
  }

  const reviewAt = new Date(problem.nextReviewAt).getTime();

  if (!Number.isFinite(reviewAt)) {
    return "Not scheduled";
  }

  return reviewAt <= Date.now() ? "Due now" : formatDate(problem.nextReviewAt);
}

/**
 * Formats an attempt timestamp with date and time.
 *
 * @param value - ISO date value.
 * @returns Human-readable date and time text.
 */
function formatDateTime(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/**
 * Formats compact attempt metadata for history summaries.
 *
 * @param session - Practice session.
 * @returns Compact confidence and duration text.
 */
function formatAttemptMeta(session: PracticeSession) {
  const confidence = session.confidence ? `${session.confidence}/5` : "No confidence";
  const duration = formatDuration(session.durationMs);

  return duration ? `${confidence} · ${duration}` : confidence;
}

/**
 * Formats a duration in milliseconds.
 *
 * @param durationMs - Duration in milliseconds.
 * @returns Human-readable duration when present.
 */
function formatDuration(durationMs?: number | null) {
  if (!durationMs || durationMs <= 0) {
    return "";
  }

  const minutes = Math.round(durationMs / 60000);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Checks whether optional text contains visible characters.
 *
 * @param value - Optional text value.
 * @returns True when the value contains text.
 */
function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

/**
 * Checks whether any optional text value contains visible characters.
 *
 * @param values - Optional text values.
 * @returns True when at least one value contains text.
 */
function hasAnyText(...values: Array<string | null | undefined>) {
  return values.some(hasText);
}

/**
 * Parses comma-separated tags.
 *
 * @param value - Raw tag text.
 * @returns Normalized tag names.
 */
function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
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
