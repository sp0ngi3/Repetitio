import { FormEvent, useEffect, useMemo, useState } from "react";
import { createLearningItem, getBasicExercises, getDashboard, getLearningItems } from "./api";
import type {
  BasicExercise,
  CreateLearningItemRequest,
  Dashboard,
  LearningDifficulty,
  LearningItem,
  LearningItemType
} from "./types";

/**
 * Learning item type choices rendered by the creation form.
 */
const itemTypes: LearningItemType[] = ["Dsa", "SystemDesign"];

/**
 * Difficulty choices rendered by the creation form.
 */
const difficulties: LearningDifficulty[] = ["Unknown", "Easy", "Medium", "Hard"];

/**
 * Initial form state for creating a learning item.
 */
const initialForm: CreateLearningItemRequest = {
  type: "Dsa",
  title: "",
  description: "",
  difficulty: "Unknown",
  tags: []
};

/**
 * Renders the Repetitio MVP application shell.
 *
 * @returns The root application component.
 */
export function App() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [basicExercises, setBasicExercises] = useState<BasicExercise[]>([]);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [form, setForm] = useState<CreateLearningItemRequest>(initialForm);
  const [tagInput, setTagInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reloads dashboard metrics and learning items from the API.
   */
  async function refreshData() {
    setError(null);

    try {
      const [nextDashboard, nextBasics, nextItems] = await Promise.all([
        getDashboard(),
        getBasicExercises(),
        getLearningItems()
      ]);
      setDashboard(nextDashboard);
      setBasicExercises(nextBasics);
      setItems(nextItems);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  const groupedCounts = useMemo(() => {
    return items.reduce<Record<LearningItemType, number>>(
      (counts, item) => {
        counts[item.type] += 1;
        return counts;
      },
      { Basics: basicExercises.length, Dsa: 0, SystemDesign: 0 }
    );
  }, [basicExercises.length, items]);

  /**
   * Handles creation of a new learning item.
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
      const tags = tagInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      await createLearningItem({
        ...form,
        title: form.title.trim(),
        description: form.description?.trim(),
        tags
      });

      setForm(initialForm);
      setTagInput("");
      await refreshData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="top-bar" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Local learning system</p>
          <h1 id="page-title">Repetitio</h1>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="metric-grid" aria-label="Learning metrics">
        <Metric label="Practices today" value={dashboard?.practicesToday ?? 0} />
        <Metric label="This week" value={dashboard?.practicesThisWeek ?? 0} />
        <Metric label="Due reviews" value={dashboard?.dueReviewCount ?? 0} />
        <Metric label="Never practiced" value={dashboard?.neverPracticedCount ?? 0} />
      </section>

      <section className="workspace-grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <p className="eyebrow">Phase 1</p>
            <h2>Add DSA or System Design</h2>
          </div>

          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Longest Substring Without Repeating Characters"
            />
          </label>

          <label>
            Type
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as LearningItemType })}
            >
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {formatType(type)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Difficulty
            <select
              value={form.difficulty}
              onChange={(event) => setForm({ ...form, difficulty: event.target.value as LearningDifficulty })}
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
            <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="arrays, dynamic-programming" />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Short notes, source, or reminder for future practice."
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Create item"}
          </button>
        </form>

        <section className="panel" aria-labelledby="queue-title">
          <div className="panel-heading">
            <p className="eyebrow">Review queue</p>
            <h2 id="queue-title">Due now</h2>
          </div>

          {dashboard?.dueReviews.length ? (
            <ul className="stack-list">
              {dashboard.dueReviews.map((item) => (
                <li key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{formatType(item.type)}</span>
                  </div>
                  <span className="confidence">{item.confidence ? `${item.confidence}/5` : "No confidence"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No items are due for review yet.</p>
          )}
        </section>
      </section>

      <section className="content-section" aria-labelledby="basics-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Built-in catalog</p>
            <h2 id="basics-title">Basics</h2>
          </div>
        </div>

        {basicExercises.length ? (
          <div className="item-grid">
            {basicExercises.map((exercise) => (
              <article className="item-card" key={exercise.slug}>
                <div className="item-card-header">
                  <span>{exercise.language}</span>
                  <span>Built in</span>
                </div>
                <h3>{exercise.title}</h3>
                <p>{exercise.instructions}</p>
                <code className="signature">{exercise.functionSignature}</code>
                <div className="tag-row">
                  {exercise.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                <details className="solution-peek">
                  <summary>Peek solution</summary>
                  <pre>
                    <code>{exercise.referenceSolution}</code>
                  </pre>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Loading built-in basics...</p>
        )}
      </section>

      <section className="content-section" aria-labelledby="items-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Practice inventory</p>
            <h2 id="items-title">Your learning items</h2>
          </div>
          <div className="count-strip" aria-label="Learning item counts by type">
            <span>Basics {groupedCounts.Basics}</span>
            <span>DSA {groupedCounts.Dsa}</span>
            <span>System Design {groupedCounts.SystemDesign}</span>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Loading learning history...</p>
        ) : items.length ? (
          <div className="item-grid">
            {items.map((item) => (
              <article className="item-card" key={item.id}>
                <div className="item-card-header">
                  <span>{formatType(item.type)}</span>
                  <span>{item.difficulty}</span>
                </div>
                <h3>{item.title}</h3>
                {item.description ? <p>{item.description}</p> : null}
                <div className="tag-row">
                  {item.tags.length ? item.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                </div>
                <dl className="item-meta">
                  <div>
                    <dt>Status</dt>
                    <dd>{formatStatus(item.status)}</dd>
                  </div>
                  <div>
                    <dt>Attempts</dt>
                    <dd>{item.totalAttempts}</dd>
                  </div>
                  <div>
                    <dt>Next review</dt>
                    <dd>{formatDate(item.nextReviewAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Create the first learning item to start building your practice history.</p>
        )}
      </section>
    </main>
  );
}

/**
 * Renders a compact metric.
 *
 * @param props - Component props.
 * @returns A metric card.
 */
function Metric(props: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

/**
 * Converts an API item type into display text.
 *
 * @param type - Learning item type.
 * @returns Human-readable item type.
 */
function formatType(type: LearningItemType) {
  return type === "Dsa" ? "DSA" : type === "SystemDesign" ? "System Design" : "Basics";
}

/**
 * Converts an API status into display text.
 *
 * @param status - Learning item status.
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
