import { FormEvent, useMemo, useState } from "react";
import { createLearningItem } from "./api";
import type { CreateLearningItemRequest, LearningDifficulty, LearningItem } from "./types";

/**
 * Difficulty choices rendered by the System Design page.
 */
const difficulties: LearningDifficulty[] = ["Unknown", "Easy", "Medium", "Hard"];

/**
 * System Design page view modes.
 */
type SystemDesignView = "dashboard" | "new" | "detail";

/**
 * Represents the local System Design form state.
 */
interface SystemDesignForm {
  /** Topic title. */
  title: string;
  /** Topic difficulty. */
  difficulty: LearningDifficulty;
  /** Comma-separated tags. */
  tagsText: string;
  /** Short description. */
  description: string;
}

/**
 * Initial System Design form state.
 */
const emptyForm: SystemDesignForm = {
  title: "",
  difficulty: "Unknown",
  tagsText: "",
  description: ""
};

/**
 * Props accepted by the System Design page.
 */
interface SystemDesignPageProps {
  /** Whether parent data is loading. */
  isLoading: boolean;
  /** Learning items loaded by the app shell. */
  items: LearningItem[];
  /** Called after a System Design item is created. */
  onChanged: () => Promise<void> | void;
}

/**
 * Renders the System Design dashboard and detail flow.
 *
 * @param props - Component props.
 * @returns The System Design page.
 */
export function SystemDesignPage(props: SystemDesignPageProps) {
  const [view, setView] = useState<SystemDesignView>("dashboard");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [form, setForm] = useState<SystemDesignForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const systemDesignItems = useMemo(
    () => props.items.filter((item) => item.type === "SystemDesign"),
    [props.items]
  );

  const selectedItem = useMemo(
    () => systemDesignItems.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, systemDesignItems]
  );

  /**
   * Opens the add page.
   */
  function openNew() {
    setForm(emptyForm);
    setSelectedItemId(null);
    setView("new");
    setError(null);
  }

  /**
   * Opens a topic detail page.
   *
   * @param item - Selected System Design item.
   */
  function openDetail(item: LearningItem) {
    setSelectedItemId(item.id);
    setView("detail");
    setError(null);
  }

  /**
   * Returns to the dashboard.
   */
  function returnToDashboard() {
    setView("dashboard");
    setSelectedItemId(null);
    setError(null);
  }

  /**
   * Updates one form field.
   *
   * @param key - Field name to update.
   * @param value - Next field value.
   */
  function updateForm<K extends keyof SystemDesignForm>(key: K, value: SystemDesignForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Creates a System Design learning item.
   *
   * @param event - The form submission event.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createLearningItem(toRequest(form));
      setForm(emptyForm);
      await props.onChanged();
      setView("dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create System Design item.");
    } finally {
      setIsSaving(false);
    }
  }

  if (view === "new") {
    return (
      <section className="tracker-page" aria-labelledby="system-design-new-title">
        <PageHeader eyebrow="New System Design topic" title="Add topic" onBack={returnToDashboard} />
        {error ? <p className="error-banner">{error}</p> : null}
        <form className="panel narrow-form" onSubmit={handleSubmit}>
          <SystemDesignFields form={form} onChange={updateForm} />
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save topic"}
          </button>
        </form>
      </section>
    );
  }

  if (view === "detail" && selectedItem) {
    return (
      <section className="tracker-page" aria-labelledby="system-design-detail-title">
        <PageHeader eyebrow="System Design topic" title={selectedItem.title} onBack={returnToDashboard} />
        <article className="panel detail-page">
          <div className="item-card-header">
            <span>{selectedItem.difficulty}</span>
            <span>{formatStatus(selectedItem.status)}</span>
          </div>
          {selectedItem.description ? <p>{selectedItem.description}</p> : <p className="empty-state">No description yet.</p>}
          <div className="tag-row">
            {selectedItem.tags.length ? selectedItem.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
          </div>
          <dl className="item-meta">
            <div>
              <dt>Attempts</dt>
              <dd>{selectedItem.totalAttempts}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{selectedItem.confidence ? `${selectedItem.confidence}/5` : "Not set"}</dd>
            </div>
            <div>
              <dt>Next review</dt>
              <dd>{formatDate(selectedItem.nextReviewAt)}</dd>
            </div>
          </dl>
        </article>
      </section>
    );
  }

  return (
    <section className="tracker-page" aria-labelledby="system-design-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">System Design dashboard</p>
          <h2 id="system-design-title">Topics</h2>
        </div>
        <button className="secondary-button" type="button" onClick={openNew}>
          Add topic
        </button>
      </div>

      <section className="panel data-panel" aria-label="System Design records">
        {props.isLoading ? (
          <p className="empty-state">Loading System Design topics...</p>
        ) : systemDesignItems.length ? (
          <div className="record-table system-design-table">
            <div className="record-header">
              <span>Topic</span>
              <span>Tags</span>
              <span>Status</span>
              <span>Difficulty</span>
              <span>Attempts</span>
            </div>
            {systemDesignItems.map((item) => (
              <button className="record-row" type="button" key={item.id} onClick={() => openDetail(item)}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description || "No description"}</small>
                </span>
                <span className="tag-row compact">
                  {item.tags.length ? item.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                </span>
                <span>{formatStatus(item.status)}</span>
                <span>{item.difficulty}</span>
                <span>{item.totalAttempts}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-state">No System Design topics yet.</p>
        )}
      </section>
    </section>
  );
}

/**
 * Props accepted by the page header.
 */
interface PageHeaderProps {
  /** Small header label. */
  eyebrow: string;
  /** Main title. */
  title: string;
  /** Back button handler. */
  onBack: () => void;
}

/**
 * Renders a compact page header with back navigation.
 *
 * @param props - Component props.
 * @returns The page header.
 */
function PageHeader(props: PageHeaderProps) {
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
 * Props accepted by System Design fields.
 */
interface SystemDesignFieldsProps {
  /** Editable form state. */
  form: SystemDesignForm;
  /** Updates one form field. */
  onChange: <K extends keyof SystemDesignForm>(key: K, value: SystemDesignForm[K]) => void;
}

/**
 * Renders the System Design creation fields.
 *
 * @param props - Component props.
 * @returns System Design form controls.
 */
function SystemDesignFields(props: SystemDesignFieldsProps) {
  return (
    <>
      <label>
        Title
        <input
          value={props.form.title}
          onChange={(event) => props.onChange("title", event.target.value)}
          placeholder="Design a rate limiter"
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
          value={props.form.description}
          onChange={(event) => props.onChange("description", event.target.value)}
          placeholder="Scope, constraints, or things to cover."
        />
      </label>
    </>
  );
}

/**
 * Converts form state into a create request.
 *
 * @param form - Editable form state.
 * @returns Learning item create request.
 */
function toRequest(form: SystemDesignForm): CreateLearningItemRequest {
  return {
    type: "SystemDesign",
    title: form.title.trim(),
    description: form.description.trim(),
    difficulty: form.difficulty,
    tags: form.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
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
