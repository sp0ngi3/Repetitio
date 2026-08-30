import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  createPracticeSession,
  createSystemDesignProblem,
  deleteSystemDesignProblem,
  getSystemDesignProblemTemplate,
  getSystemDesignProblems,
  updateSystemDesignProblem
} from "./api";
import type {
  CreatePracticeSessionRequest,
  CreateSystemDesignProblemRequest,
  LearningDifficulty,
  LearningItemStatus,
  PracticeOutcome,
  SystemDesignProblem,
  SystemDesignProblemTemplate,
  UpdateSystemDesignProblemRequest
} from "./types";

/**
 * Difficulty choices rendered by System Design filters and forms.
 */
const difficulties: LearningDifficulty[] = ["Unknown", "Easy", "Medium", "Hard"];

/**
 * Status choices rendered by System Design filters and forms.
 */
const statuses: LearningItemStatus[] = ["NotStarted", "InProgress", "Completed", "Mastered"];

/**
 * Practice outcome choices rendered by the System Design attempt form.
 */
const outcomes: PracticeOutcome[] = ["Completed", "Passed", "Partial", "Failed"];

/**
 * System Design page view modes.
 */
type SystemDesignView = "dashboard" | "new" | "detail";

/**
 * Represents System Design list filters.
 */
interface SystemDesignFilters {
  /** Optional text search. */
  search: string;
  /** Optional progress status filter. */
  status: LearningItemStatus | "";
  /** Optional difficulty filter. */
  difficulty: LearningDifficulty | "";
}

/**
 * Represents the local editable System Design problem form state.
 */
interface SystemDesignProblemForm {
  /** Problem title. */
  title: string;
  /** Problem source, such as a course or interview list. */
  source: string;
  /** External problem URL. */
  externalUrl: string;
  /** Problem difficulty. */
  difficulty: LearningDifficulty;
  /** Comma-separated tags. */
  tagsText: string;
  /** Short description. */
  description: string;
  /** Complete System Design document in markdown. */
  designMarkdown: string;
  /** Latest reflection notes in markdown. */
  reflectionMarkdown: string;
  /** What helped solve or explain the design. */
  whatHelped: string;
  /** What was difficult about the design. */
  whatWasDifficult: string;
  /** What should be improved on the next attempt. */
  improveNext: string;
}

/**
 * Represents the local editable System Design attempt form state.
 */
interface SystemDesignAttemptForm {
  /** Attempt outcome. */
  outcome: PracticeOutcome;
  /** Confidence value as form text. */
  confidence: string;
  /** Attempt duration in minutes as form text. */
  durationMinutes: string;
  /** Attempt notes. */
  notes: string;
  /** Reflection notes in markdown. */
  reflectionMarkdown: string;
  /** What helped during the attempt. */
  whatHelped: string;
  /** What was difficult during the attempt. */
  whatWasDifficult: string;
  /** What should be improved next. */
  improveNext: string;
}

/**
 * Initial System Design problem form state.
 */
const emptyProblemForm: SystemDesignProblemForm = {
  title: "",
  source: "",
  externalUrl: "",
  difficulty: "Unknown",
  tagsText: "",
  description: "",
  designMarkdown: "",
  reflectionMarkdown: "",
  whatHelped: "",
  whatWasDifficult: "",
  improveNext: ""
};

/**
 * Initial System Design attempt form state.
 */
const emptyAttemptForm: SystemDesignAttemptForm = {
  outcome: "Completed",
  confidence: "",
  durationMinutes: "",
  notes: "",
  reflectionMarkdown: "",
  whatHelped: "",
  whatWasDifficult: "",
  improveNext: ""
};

/**
 * Props accepted by the System Design page.
 */
interface SystemDesignPageProps {
  /** Called after System Design changes that should update parent dashboard data. */
  onChanged?: () => Promise<void> | void;
}

/**
 * Renders the System Design tracker with dashboard, markdown editor, attempts, and reflection.
 *
 * @param props - Component props.
 * @returns The System Design page.
 */
export function SystemDesignPage({ onChanged }: SystemDesignPageProps) {
  const [view, setView] = useState<SystemDesignView>("dashboard");
  const [problems, setProblems] = useState<SystemDesignProblem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<SystemDesignFilters>({ search: "", status: "", difficulty: "" });
  const [template, setTemplate] = useState<SystemDesignProblemTemplate | null>(null);
  const [problemForm, setProblemForm] = useState<SystemDesignProblemForm>(emptyProblemForm);
  const [attemptForm, setAttemptForm] = useState<SystemDesignAttemptForm>(emptyAttemptForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedProblemId) ?? null,
    [problems, selectedProblemId]
  );

  /**
   * Loads System Design problems with the current filters.
   */
  async function loadProblems() {
    setError(null);

    try {
      const nextProblems = await getSystemDesignProblems(filters);
      setProblems(nextProblems);

      if (selectedProblemId && !nextProblems.some((problem) => problem.id === selectedProblemId)) {
        setSelectedProblemId(null);
        setView("dashboard");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load System Design problems.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProblems();
  }, [filters.difficulty, filters.search, filters.status]);

  useEffect(() => {
    /**
     * Loads the default System Design markdown template once.
     */
    async function loadTemplate() {
      try {
        setTemplate(await getSystemDesignProblemTemplate());
      } catch {
        setTemplate(null);
      }
    }

    void loadTemplate();
  }, []);

  /**
   * Opens the System Design add page.
   */
  function openNewProblem() {
    setSelectedProblemId(null);
    setProblemForm(createProblemFormFromTemplate(template));
    setAttemptForm(emptyAttemptForm);
    setView("new");
    setError(null);
  }

  /**
   * Opens an existing System Design problem detail page.
   *
   * @param problem - Problem selected from the dashboard.
   */
  function openProblem(problem: SystemDesignProblem) {
    setSelectedProblemId(problem.id);
    setProblemForm(createProblemFormFromProblem(problem));
    setAttemptForm(createAttemptFormFromProblem(problem));
    setView("detail");
    setError(null);
  }

  /**
   * Returns to the System Design dashboard.
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
  function updateProblemForm<K extends keyof SystemDesignProblemForm>(key: K, value: SystemDesignProblemForm[K]) {
    setProblemForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Updates one attempt form field.
   *
   * @param key - Field name to update.
   * @param value - Next field value.
   */
  function updateAttemptForm<K extends keyof SystemDesignAttemptForm>(key: K, value: SystemDesignAttemptForm[K]) {
    setAttemptForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Creates a new System Design problem from the add page.
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
      const savedProblem = await createSystemDesignProblem(toCreateProblemRequest(problemForm));
      await loadProblems();
      await onChanged?.();
      openProblem(savedProblem);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create System Design problem.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Updates the currently selected System Design problem.
   */
  async function saveProblemMetadata() {
    if (!selectedProblem) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedProblem = await updateSystemDesignProblem(
        selectedProblem.id,
        toUpdateProblemRequest(problemForm, selectedProblem)
      );
      await loadProblems();
      await onChanged?.();
      openProblem(updatedProblem);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save System Design problem.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Records a new attempt for the selected System Design problem.
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
      await updateSystemDesignProblem(selectedProblem.id, {
        ...metadata,
        reflectionMarkdown: attemptForm.reflectionMarkdown.trim() || metadata.reflectionMarkdown,
        whatHelped: attemptForm.whatHelped.trim() || metadata.whatHelped,
        whatWasDifficult: attemptForm.whatWasDifficult.trim() || metadata.whatWasDifficult,
        improveNext: attemptForm.improveNext.trim() || metadata.improveNext
      });
      await createPracticeSession(toPracticeRequest(selectedProblem.id, attemptForm));

      setAttemptForm(emptyAttemptForm);
      await loadProblems();
      await onChanged?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save System Design attempt.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Deletes the currently selected System Design problem.
   */
  async function handleDeleteProblem() {
    if (!selectedProblem) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteSystemDesignProblem(selectedProblem.id);
      await loadProblems();
      await onChanged?.();
      returnToDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete System Design problem.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tracker-page" aria-labelledby="system-design-title">
      {view === "dashboard" ? (
        <SystemDesignDashboard
          filters={filters}
          isLoading={isLoading}
          problems={problems}
          onAdd={openNewProblem}
          onFiltersChange={setFilters}
          onOpen={openProblem}
        />
      ) : null}

      {view === "new" ? (
        <SystemDesignCreatePage
          error={error}
          form={problemForm}
          isSaving={isSaving}
          onBack={returnToDashboard}
          onChange={updateProblemForm}
          onSubmit={handleCreateProblem}
        />
      ) : null}

      {view === "detail" && selectedProblem ? (
        <SystemDesignDetailPage
          attemptForm={attemptForm}
          error={error}
          form={problemForm}
          isSaving={isSaving}
          problem={selectedProblem}
          onAttemptChange={updateAttemptForm}
          onAttemptSubmit={handleAttemptSubmit}
          onBack={returnToDashboard}
          onChange={updateProblemForm}
          onDelete={handleDeleteProblem}
          onSave={saveProblemMetadata}
        />
      ) : null}
    </section>
  );
}

/**
 * Props accepted by the System Design dashboard.
 */
interface SystemDesignDashboardProps {
  /** Current list filters. */
  filters: SystemDesignFilters;
  /** Whether System Design problems are loading. */
  isLoading: boolean;
  /** System Design problems shown in the dashboard. */
  problems: SystemDesignProblem[];
  /** Opens the add page. */
  onAdd: () => void;
  /** Updates list filters. */
  onFiltersChange: (filters: SystemDesignFilters) => void;
  /** Opens a problem detail page. */
  onOpen: (problem: SystemDesignProblem) => void;
}

/**
 * Renders the scan-first System Design dashboard.
 *
 * @param props - Component props.
 * @returns The System Design dashboard.
 */
function SystemDesignDashboard(props: SystemDesignDashboardProps) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">System Design dashboard</p>
          <h2 id="system-design-title">Problems</h2>
        </div>
        <button className="secondary-button" type="button" onClick={props.onAdd}>
          Add problem
        </button>
      </div>

      <div className="panel tracker-toolbar" aria-label="System Design filters">
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

      <section className="panel data-panel" aria-label="System Design problem records">
        {props.isLoading ? (
          <p className="empty-state">Loading System Design problems...</p>
        ) : props.problems.length ? (
          <div className="record-table system-design-table">
            <div className="record-header">
              <span>Problem</span>
              <span>Tags</span>
              <span>Status</span>
              <span>Difficulty</span>
              <span>Attempts</span>
            </div>
            {props.problems.map((problem) => (
              <button className="record-row" type="button" key={problem.id} onClick={() => props.onOpen(problem)}>
                <span>
                  <strong>{problem.title}</strong>
                  <small>{problem.source || "Personal"} {problem.nextReviewAt ? `· ${formatDate(problem.nextReviewAt)}` : ""}</small>
                </span>
                <span className="tag-row compact">
                  {problem.tags.length ? problem.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                </span>
                <span>{formatStatus(problem.status)}</span>
                <span>{problem.difficulty}</span>
                <span>{problem.totalAttempts}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-state">No System Design problems yet.</p>
        )}
      </section>
    </>
  );
}

/**
 * Props accepted by the System Design create page.
 */
interface SystemDesignCreatePageProps {
  /** Current error message. */
  error: string | null;
  /** Editable problem form. */
  form: SystemDesignProblemForm;
  /** Whether the form is saving. */
  isSaving: boolean;
  /** Returns to the dashboard. */
  onBack: () => void;
  /** Updates one form field. */
  onChange: <K extends keyof SystemDesignProblemForm>(key: K, value: SystemDesignProblemForm[K]) => void;
  /** Handles problem creation. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Renders the System Design add page.
 *
 * @param props - Component props.
 * @returns The System Design create page.
 */
function SystemDesignCreatePage(props: SystemDesignCreatePageProps) {
  return (
    <>
      <PageBackHeader eyebrow="New System Design problem" title="Add problem" onBack={props.onBack} />
      {props.error ? <p className="error-banner">{props.error}</p> : null}
      <form className="system-design-layout" onSubmit={props.onSubmit}>
        <SystemDesignEditorPanel form={props.form} onChange={props.onChange} />
        <aside className="panel solve-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Setup</p>
              <h3>Metadata</h3>
            </div>
          </div>
          <SystemDesignMetadataFields form={props.form} onChange={props.onChange} />
          <button className="primary-button" type="submit" disabled={props.isSaving}>
            {props.isSaving ? "Saving..." : "Save problem"}
          </button>
        </aside>
      </form>
    </>
  );
}

/**
 * Props accepted by the System Design detail page.
 */
interface SystemDesignDetailPageProps {
  /** Current attempt form. */
  attemptForm: SystemDesignAttemptForm;
  /** Current error message. */
  error: string | null;
  /** Editable problem form. */
  form: SystemDesignProblemForm;
  /** Whether a request is saving. */
  isSaving: boolean;
  /** Selected System Design problem. */
  problem: SystemDesignProblem;
  /** Updates one attempt form field. */
  onAttemptChange: <K extends keyof SystemDesignAttemptForm>(key: K, value: SystemDesignAttemptForm[K]) => void;
  /** Handles attempt save. */
  onAttemptSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Returns to the dashboard. */
  onBack: () => void;
  /** Updates one problem form field. */
  onChange: <K extends keyof SystemDesignProblemForm>(key: K, value: SystemDesignProblemForm[K]) => void;
  /** Deletes the selected problem. */
  onDelete: () => void;
  /** Saves problem metadata. */
  onSave: () => void;
}

/**
 * Renders the System Design detail page where attempts and reflection are recorded.
 *
 * @param props - Component props.
 * @returns The System Design detail page.
 */
function SystemDesignDetailPage(props: SystemDesignDetailPageProps) {
  return (
    <>
      <PageBackHeader eyebrow="System Design problem" title={props.problem.title} onBack={props.onBack} />
      {props.error ? <p className="error-banner">{props.error}</p> : null}
      <div className="system-design-layout">
        <SystemDesignEditorPanel form={props.form} onChange={props.onChange}>
          <div className="editor-actions">
            <button className="secondary-button" type="button" onClick={props.onSave} disabled={props.isSaving}>
              Save design
            </button>
            <button className="danger-button" type="button" onClick={props.onDelete} disabled={props.isSaving}>
              Delete
            </button>
          </div>
        </SystemDesignEditorPanel>

        <aside className="panel solve-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Progress</p>
              <h3>Attempt design</h3>
            </div>
          </div>

          <dl className="attempt-stats">
            <div>
              <dt>Attempts</dt>
              <dd>{props.problem.totalAttempts}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatStatus(props.problem.status)}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{props.problem.difficulty}</dd>
            </div>
          </dl>

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
                placeholder="45"
              />
            </label>

            <MarkdownEditor
              label="Reflection"
              value={props.attemptForm.reflectionMarkdown}
              onChange={(value) => props.onAttemptChange("reflectionMarkdown", value)}
              placeholder="What did you miss? What did you explain well?"
              variant="reflection"
            />

            <label>
              Notes
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.notes}
                onChange={(event) => props.onAttemptChange("notes", event.target.value)}
                placeholder="Short attempt summary."
              />
            </label>

            <label>
              What helped
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.whatHelped}
                onChange={(event) => props.onAttemptChange("whatHelped", event.target.value)}
                placeholder="Diagram, estimate, API-first thinking..."
              />
            </label>

            <label>
              What was difficult
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.whatWasDifficult}
                onChange={(event) => props.onAttemptChange("whatWasDifficult", event.target.value)}
                placeholder="Tradeoffs, consistency, scaling bottleneck..."
              />
            </label>

            <label>
              Improve next
              <textarea
                className="medium-textarea expanding-textarea"
                value={props.attemptForm.improveNext}
                onChange={(event) => props.onAttemptChange("improveNext", event.target.value)}
                placeholder="One thing to drill next time."
              />
            </label>

            <button className="primary-button" type="submit" disabled={props.isSaving}>
              {props.isSaving ? "Saving attempt..." : "Save attempt"}
            </button>
          </form>

          <SystemDesignAttemptHistory problem={props.problem} />
        </aside>
      </div>
    </>
  );
}

/**
 * Props accepted by the System Design editor panel.
 */
interface SystemDesignEditorPanelProps {
  /** Editable problem form. */
  form: SystemDesignProblemForm;
  /** Optional action content. */
  children?: ReactNode;
  /** Updates one form field. */
  onChange: <K extends keyof SystemDesignProblemForm>(key: K, value: SystemDesignProblemForm[K]) => void;
}

/**
 * Renders the left-side System Design markdown editor.
 *
 * @param props - Component props.
 * @returns The System Design editor panel.
 */
function SystemDesignEditorPanel(props: SystemDesignEditorPanelProps) {
  return (
    <section className="panel problem-panel" aria-label="System Design editor">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Design workspace</p>
          <h3>{props.form.title || "Untitled design problem"}</h3>
        </div>
        {props.children}
      </div>

      <label>
        Title
        <input
          value={props.form.title}
          onChange={(event) => props.onChange("title", event.target.value)}
          placeholder="Design a URL shortener"
        />
      </label>

      <MarkdownEditor
        label="Design document"
        value={props.form.designMarkdown}
        onChange={(value) => props.onChange("designMarkdown", value)}
        placeholder="Write the full prompt, requirements, constraints, estimates, APIs, data model, architecture, scaling strategy, tradeoffs, and notes here."
        variant="document"
      />
    </section>
  );
}

/**
 * Props accepted by System Design metadata fields.
 */
interface SystemDesignMetadataFieldsProps {
  /** Editable problem form. */
  form: SystemDesignProblemForm;
  /** Updates one form field. */
  onChange: <K extends keyof SystemDesignProblemForm>(key: K, value: SystemDesignProblemForm[K]) => void;
}

/**
 * Renders System Design problem metadata controls.
 *
 * @param props - Component props.
 * @returns Metadata form fields.
 */
function SystemDesignMetadataFields(props: SystemDesignMetadataFieldsProps) {
  return (
    <>
      <label>
        Source
        <input
          value={props.form.source}
          onChange={(event) => props.onChange("source", event.target.value)}
          placeholder="System Design Primer"
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
          placeholder="caching, queues, consistency"
        />
      </label>

      <label>
        Description
        <textarea
          className="medium-textarea expanding-textarea"
          value={props.form.description}
          onChange={(event) => props.onChange("description", event.target.value)}
          placeholder="Short reminder for the dashboard."
        />
      </label>
    </>
  );
}

/**
 * Props accepted by the markdown editor.
 */
interface MarkdownEditorProps {
  /** Editor label. */
  label: string;
  /** Markdown text value. */
  value: string;
  /** Placeholder text. */
  placeholder: string;
  /** Editor size variant. */
  variant?: "document" | "reflection";
  /** Updates markdown text. */
  onChange: (value: string) => void;
}

/**
 * Renders a markdown textarea.
 *
 * @param props - Component props.
 * @returns The markdown editor.
 */
function MarkdownEditor(props: MarkdownEditorProps) {
  const textareaClassName =
    props.variant === "document"
      ? "system-design-document-textarea expanding-textarea"
      : "medium-textarea expanding-textarea";

  return (
    <label className="markdown-editor">
      <span>{props.label}</span>
      <textarea
        className={textareaClassName}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        spellCheck={false}
      />
    </label>
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
 * Props accepted by the attempt history component.
 */
interface SystemDesignAttemptHistoryProps {
  /** Selected System Design problem. */
  problem: SystemDesignProblem;
}

/**
 * Renders prior System Design attempts.
 *
 * @param props - Component props.
 * @returns Attempt history.
 */
function SystemDesignAttemptHistory(props: SystemDesignAttemptHistoryProps) {
  return (
    <div className="history-panel">
      <h3>Previous attempts</h3>
      {props.problem.practiceSessions.length ? (
        <ul className="stack-list">
          {props.problem.practiceSessions.map((session) => (
            <li className="list-row" key={session.id}>
              <div>
                <strong>{formatStatus(session.outcome)}</strong>
                <span>{formatDate(session.startedAt)}</span>
                {session.notes ? <small>{session.notes}</small> : null}
                {session.whatHelped ? <small>Helped: {session.whatHelped}</small> : null}
                {session.whatWasDifficult ? <small>Difficult: {session.whatWasDifficult}</small> : null}
                {session.improveNext ? <small>Next: {session.improveNext}</small> : null}
              </div>
              <span className="confidence">{session.confidence ? `${session.confidence}/5` : "No confidence"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">No attempts yet.</p>
      )}
    </div>
  );
}

/**
 * Creates one editable markdown document from the default System Design template.
 *
 * @param template - Optional default System Design template.
 * @returns A single markdown document for the large editor.
 */
function createDesignMarkdownFromTemplate(template: SystemDesignProblemTemplate | null) {
  if (!template) {
    return "";
  }

  return [
    template.promptMarkdown,
    formatMarkdownSection("Functional requirements", template.functionalRequirementsMarkdown),
    formatMarkdownSection("Non-functional requirements", template.nonFunctionalRequirementsMarkdown),
    formatMarkdownSection("Constraints", template.constraintsMarkdown),
    "## Capacity estimates",
    "## API design",
    "## Data model",
    "## Architecture",
    "## Scaling strategy",
    "## Tradeoffs"
  ]
    .filter((section) => section.trim())
    .join("\n\n");
}

/**
 * Creates one editable markdown document from a persisted System Design problem.
 *
 * @param problem - Existing System Design problem.
 * @returns A single markdown document that preserves older split fields.
 */
function createDesignMarkdownFromProblem(problem: SystemDesignProblem) {
  return [
    problem.promptMarkdown ?? "",
    formatMarkdownSection("Functional requirements", problem.functionalRequirementsMarkdown),
    formatMarkdownSection("Non-functional requirements", problem.nonFunctionalRequirementsMarkdown),
    formatMarkdownSection("Constraints", problem.constraintsMarkdown),
    formatMarkdownSection("Capacity estimates", problem.capacityEstimatesMarkdown),
    formatMarkdownSection("API design", problem.apiDesignMarkdown),
    formatMarkdownSection("Data model", problem.dataModelMarkdown),
    formatMarkdownSection("Architecture", problem.architectureMarkdown),
    formatMarkdownSection("Scaling strategy", problem.scalingStrategyMarkdown),
    formatMarkdownSection("Tradeoffs", problem.tradeoffsMarkdown)
  ]
    .filter((section) => section.trim())
    .join("\n\n");
}

/**
 * Wraps optional markdown content in a section heading.
 *
 * @param title - Section heading text.
 * @param value - Optional markdown content.
 * @returns A heading and body when content exists.
 */
function formatMarkdownSection(title: string, value?: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? `## ${title}\n${trimmedValue}` : "";
}

/**
 * Creates a new System Design problem form from the default template.
 *
 * @param template - Optional default System Design template.
 * @returns Editable System Design problem form.
 */
function createProblemFormFromTemplate(template: SystemDesignProblemTemplate | null): SystemDesignProblemForm {
  return {
    ...emptyProblemForm,
    designMarkdown: createDesignMarkdownFromTemplate(template),
    reflectionMarkdown: template?.reflectionMarkdown ?? ""
  };
}

/**
 * Creates a problem form from an existing System Design problem.
 *
 * @param problem - Existing System Design problem.
 * @returns Editable System Design problem form.
 */
function createProblemFormFromProblem(problem: SystemDesignProblem): SystemDesignProblemForm {
  return {
    title: problem.title,
    source: problem.source ?? "",
    externalUrl: problem.externalUrl ?? "",
    difficulty: problem.difficulty,
    tagsText: problem.tags.join(", "),
    description: problem.description ?? "",
    designMarkdown: createDesignMarkdownFromProblem(problem),
    reflectionMarkdown: problem.reflectionMarkdown ?? "",
    whatHelped: problem.whatHelped ?? "",
    whatWasDifficult: problem.whatWasDifficult ?? "",
    improveNext: problem.improveNext ?? ""
  };
}

/**
 * Creates an attempt form from an existing System Design problem.
 *
 * @param problem - Existing System Design problem.
 * @returns Editable System Design attempt form.
 */
function createAttemptFormFromProblem(problem: SystemDesignProblem): SystemDesignAttemptForm {
  return {
    ...emptyAttemptForm,
    reflectionMarkdown: problem.reflectionMarkdown ?? "",
    whatHelped: problem.whatHelped ?? "",
    whatWasDifficult: problem.whatWasDifficult ?? "",
    improveNext: problem.improveNext ?? ""
  };
}

/**
 * Converts the problem form into a create request.
 *
 * @param form - Editable System Design problem form.
 * @returns System Design create request payload.
 */
function toCreateProblemRequest(form: SystemDesignProblemForm): CreateSystemDesignProblemRequest {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    source: form.source.trim(),
    externalUrl: form.externalUrl.trim(),
    difficulty: form.difficulty,
    tags: parseTags(form.tagsText),
    promptMarkdown: form.designMarkdown.trim(),
    functionalRequirementsMarkdown: "",
    nonFunctionalRequirementsMarkdown: "",
    constraintsMarkdown: "",
    capacityEstimatesMarkdown: "",
    apiDesignMarkdown: "",
    dataModelMarkdown: "",
    architectureMarkdown: "",
    scalingStrategyMarkdown: "",
    tradeoffsMarkdown: "",
    reflectionMarkdown: form.reflectionMarkdown.trim(),
    whatHelped: form.whatHelped.trim(),
    whatWasDifficult: form.whatWasDifficult.trim(),
    improveNext: form.improveNext.trim()
  };
}

/**
 * Converts the problem form into an update request.
 *
 * @param form - Editable System Design problem form.
 * @param problem - Current persisted System Design problem.
 * @returns System Design update request payload.
 */
function toUpdateProblemRequest(
  form: SystemDesignProblemForm,
  problem: SystemDesignProblem
): UpdateSystemDesignProblemRequest {
  return {
    ...toCreateProblemRequest(form),
    status: problem.status,
    confidence: problem.confidence
  };
}

/**
 * Converts an attempt form into a practice request.
 *
 * @param problemId - System Design problem identifier.
 * @param form - Editable attempt form.
 * @returns Practice session creation payload.
 */
function toPracticeRequest(problemId: string, form: SystemDesignAttemptForm): CreatePracticeSessionRequest {
  const durationMinutes = Number(form.durationMinutes);
  const durationMs = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes * 60 * 1000 : undefined;

  return {
    learningItemId: problemId,
    outcome: form.outcome,
    confidence: form.confidence ? Number(form.confidence) : null,
    durationMs,
    notes: form.notes.trim() || form.reflectionMarkdown.trim(),
    whatHelped: form.whatHelped.trim(),
    whatWasDifficult: form.whatWasDifficult.trim(),
    improveNext: form.improveNext.trim()
  };
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
