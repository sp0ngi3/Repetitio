import { useEffect, useMemo, useState } from "react";
import { getBasicExercises, getDashboard, getHealthStatus, getLearningItems } from "./api";
import { BackupPage } from "./BackupPage";
import { BasicsPage } from "./BasicsPage";
import { DsaPage } from "./DsaPage";
import { FlashcardsPage } from "./FlashcardsPage";
import { NotesCompanion, NotesPage } from "./NotesPage";
import { SystemDesignPage } from "./SystemDesignPage";
import {
  readInitialReviewSchedulePreset,
  saveReviewSchedulePreset,
  type ReviewSchedulePreset
} from "./reviewSchedule";
import type { BasicExercise, Dashboard, LearningItem, LearningItemType } from "./types";

/**
 * Application page identifiers.
 */
type AppPage = "overview" | "dsa" | "system-design" | "basics" | "flashcards" | "notes" | "settings";

/**
 * Internal navigation target for opening a concrete learning item.
 */
interface FocusedLearningTarget {
  /** Learning item identifier. */
  id: string;
  /** Learning item type. */
  type: LearningItemType;
  /** Unique value that allows reopening the same item twice. */
  nonce: number;
}

/**
 * Visual themes supported by the application shell.
 */
type AppTheme = "light" | "dark";

/**
 * Database connection states shown in the app shell.
 */
type DatabaseConnectionState = "checking" | "connected" | "disconnected";

/**
 * Interval used to refresh the database connection indicator.
 */
const databaseHealthPollMs = 10_000;

/**
 * Renders the Repetitio application shell.
 *
 * @returns The root application component.
 */
export function App() {
  const [activePage, setActivePage] = useState<AppPage>("overview");
  const [theme, setTheme] = useState<AppTheme>(readInitialTheme);
  const [reviewSchedulePreset, setReviewSchedulePreset] = useState<ReviewSchedulePreset>(
    readInitialReviewSchedulePreset
  );
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [focusedLearningTarget, setFocusedLearningTarget] = useState<FocusedLearningTarget | null>(null);
  const [basicExercises, setBasicExercises] = useState<BasicExercise[]>([]);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [databaseConnection, setDatabaseConnection] = useState<DatabaseConnectionState>("checking");
  const [databaseCheckedAt, setDatabaseCheckedAt] = useState<string | null>(null);

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

  useEffect(() => {
    let isActive = true;

    /**
     * Refreshes the lightweight database connection status.
     */
    async function checkDatabaseConnection() {
      try {
        const health = await getHealthStatus();

        if (!isActive) {
          return;
        }

        setDatabaseConnection(health.databaseConnected ? "connected" : "disconnected");
        setDatabaseCheckedAt(health.checkedAt ?? new Date().toISOString());
      } catch {
        if (!isActive) {
          return;
        }

        setDatabaseConnection("disconnected");
        setDatabaseCheckedAt(new Date().toISOString());
      }
    }

    void checkDatabaseConnection();

    const intervalId = window.setInterval(() => {
      void checkDatabaseConnection();
    }, databaseHealthPollMs);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("repetitio-theme", theme);
  }, [theme]);

  useEffect(() => {
    saveReviewSchedulePreset(reviewSchedulePreset);
  }, [reviewSchedulePreset]);

  const groupedCounts = useMemo(() => {
    return items.reduce<Record<LearningItemType, number>>(
      (counts, item) => {
        if (item.type !== "Basics") {
          counts[item.type] += 1;
        }

        return counts;
      },
      { Basics: basicExercises.length, Dsa: 0, SystemDesign: 0, Flashcard: 0 }
    );
  }, [basicExercises.length, items]);

  /**
   * Opens a concrete learning item in its owning module.
   *
   * @param target - Item type and identifier.
   */
  function openLearningTarget(target: { id: string; type: LearningItemType }) {
    setFocusedLearningTarget({ ...target, nonce: Date.now() });
    setActivePage(toAppPage(target.type));
  }

  /**
   * Opens the highest-priority item represented by a weakness tag.
   *
   * @param tag - Weakness tag to drill.
   */
  function openWeaknessTag(tag: string) {
    const normalizedTag = tag.toLowerCase();
    const candidates = [
      ...items
        .filter((item) => item.tags.some((itemTag) => itemTag.toLowerCase() === normalizedTag))
        .map((item) => ({
          id: item.id,
          type: item.type,
          confidence: item.confidence,
          lastPracticedAt: item.lastPracticedAt,
          nextReviewAt: item.nextReviewAt,
          totalAttempts: item.totalAttempts
        })),
      ...basicExercises
        .filter((exercise) => exercise.tags.some((itemTag) => itemTag.toLowerCase() === normalizedTag))
        .map((exercise) => ({
          id: exercise.learningItemId,
          type: "Basics" as const,
          confidence: exercise.confidence,
          lastPracticedAt: exercise.lastPracticedAt,
          nextReviewAt: exercise.nextReviewAt,
          totalAttempts: exercise.totalAttempts
        }))
    ];

    const bestCandidate = candidates
      .map((candidate) => ({
        ...candidate,
        score: calculateOverviewTargetScore(candidate)
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (bestCandidate) {
      openLearningTarget(bestCandidate);
    }
  }

  /**
   * Clears a handled deep-link target.
   */
  function clearFocusedLearningTarget() {
    setFocusedLearningTarget(null);
  }

  return (
    <main className="app-shell">
      <section className="top-bar" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Local learning system</p>
          <h1 id="page-title">Repetitio</h1>
        </div>
        <div className="top-bar-actions">
          <div className="top-bar-utility-row">
            <DatabaseConnectionIndicator checkedAt={databaseCheckedAt} state={databaseConnection} />
            <button
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className={`theme-toggle ${theme}`}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              type="button"
              onClick={() => setTheme(toggleTheme)}
            >
              <span className="theme-toggle-track" aria-hidden="true">
                <span className="theme-toggle-thumb" />
              </span>
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
          </div>
          <nav className="app-nav" aria-label="Primary navigation">
            <button className={activePage === "overview" ? "active" : ""} type="button" onClick={() => setActivePage("overview")}>
              Overview
            </button>
            <button className={activePage === "dsa" ? "active" : ""} type="button" onClick={() => setActivePage("dsa")}>
              DSA
            </button>
            <button
              className={activePage === "system-design" ? "active" : ""}
              type="button"
              onClick={() => setActivePage("system-design")}
            >
              System Design
            </button>
            <button className={activePage === "basics" ? "active" : ""} type="button" onClick={() => setActivePage("basics")}>
              Basics
            </button>
            <button
              className={activePage === "flashcards" ? "active" : ""}
              type="button"
              onClick={() => setActivePage("flashcards")}
            >
              Flashcards
            </button>
            <button className={activePage === "notes" ? "active" : ""} type="button" onClick={() => setActivePage("notes")}>
              Notes
            </button>
            <button
              className={activePage === "settings" ? "active" : ""}
              type="button"
              onClick={() => setActivePage("settings")}
            >
              Settings
            </button>
          </nav>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      {activePage === "overview" ? (
        <OverviewPage
          dashboard={dashboard}
          groupedCounts={groupedCounts}
          onOpenItem={openLearningTarget}
          onOpenWeaknessTag={openWeaknessTag}
        />
      ) : null}

      {activePage === "dsa" ? (
        <DsaPage
          focusItemId={focusedLearningTarget?.type === "Dsa" ? focusedLearningTarget.id : null}
          focusNonce={focusedLearningTarget?.type === "Dsa" ? focusedLearningTarget.nonce : null}
          reviewSchedulePreset={reviewSchedulePreset}
          onChanged={refreshData}
          onFocusHandled={clearFocusedLearningTarget}
        />
      ) : null}

      {activePage === "system-design" ? (
        <SystemDesignPage
          focusItemId={focusedLearningTarget?.type === "SystemDesign" ? focusedLearningTarget.id : null}
          focusNonce={focusedLearningTarget?.type === "SystemDesign" ? focusedLearningTarget.nonce : null}
          reviewSchedulePreset={reviewSchedulePreset}
          onChanged={refreshData}
          onFocusHandled={clearFocusedLearningTarget}
        />
      ) : null}

      {activePage === "basics" ? (
        <BasicsPage
          basicExercises={basicExercises}
          focusItemId={focusedLearningTarget?.type === "Basics" ? focusedLearningTarget.id : null}
          focusNonce={focusedLearningTarget?.type === "Basics" ? focusedLearningTarget.nonce : null}
          reviewSchedulePreset={reviewSchedulePreset}
          onChanged={refreshData}
          onFocusHandled={clearFocusedLearningTarget}
        />
      ) : null}

      {activePage === "flashcards" ? (
        <FlashcardsPage
          focusCardId={focusedLearningTarget?.type === "Flashcard" ? focusedLearningTarget.id : null}
          focusNonce={focusedLearningTarget?.type === "Flashcard" ? focusedLearningTarget.nonce : null}
          onChanged={refreshData}
          onFocusHandled={clearFocusedLearningTarget}
        />
      ) : null}

      {activePage === "notes" ? <NotesPage /> : null}

      {activePage === "settings" ? (
        <SettingsPage
          reviewSchedulePreset={reviewSchedulePreset}
          onReviewSchedulePresetChange={setReviewSchedulePreset}
        />
      ) : null}

      <NotesCompanion />
    </main>
  );
}

/**
 * Props accepted by the database connection indicator.
 */
interface DatabaseConnectionIndicatorProps {
  /** Current connection state. */
  state: DatabaseConnectionState;
  /** Last health check timestamp. */
  checkedAt: string | null;
}

/**
 * Renders a compact database connectivity signal.
 *
 * @param props - Component props.
 * @returns The database connection indicator.
 */
function DatabaseConnectionIndicator(props: DatabaseConnectionIndicatorProps) {
  const label =
    props.state === "connected" ? "DB online" : props.state === "disconnected" ? "DB offline" : "Checking DB";
  const ariaLabel =
    props.state === "connected"
      ? "Database connected"
      : props.state === "disconnected"
        ? "Database disconnected"
        : "Checking database connection";

  return (
    <div
      aria-label={ariaLabel}
      className={`connection-indicator ${props.state}`}
      role="status"
      title={formatConnectionCheck(props.checkedAt)}
    >
      <span className="connection-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/**
 * Props accepted by the overview page.
 */
interface OverviewPageProps {
  /** Dashboard overview data. */
  dashboard: Dashboard | null;
  /** Learning item counts grouped by type. */
  groupedCounts: Record<LearningItemType, number>;
  /** Opens a concrete learning item in its owning module. */
  onOpenItem: (target: { id: string; type: LearningItemType }) => void;
  /** Opens a high-priority item for a weakness tag. */
  onOpenWeaknessTag: (tag: string) => void;
}

/**
 * Renders compact global metrics.
 *
 * @param props - Component props.
 * @returns The overview page.
 */
function OverviewPage(props: OverviewPageProps) {
  return (
    <>
      <section className="metric-grid" aria-label="Learning metrics">
        <Metric label="Practices today" value={props.dashboard?.practicesToday ?? 0} />
        <Metric label="This week" value={props.dashboard?.practicesThisWeek ?? 0} />
        <Metric label="Due reviews" value={props.dashboard?.dueReviewCount ?? 0} />
        <Metric label="Never practiced" value={props.dashboard?.neverPracticedCount ?? 0} />
      </section>

      <section className="dashboard-focus-grid" aria-label="Daily interview focus">
        <section className="panel data-panel" aria-labelledby="today-plan-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Daily interview plan</p>
              <h2 id="today-plan-title">Today</h2>
            </div>
            <span className="confidence">{props.dashboard?.interviewPlan?.length ?? 0}/5</span>
          </div>

          {props.dashboard?.interviewPlan?.length ? (
            <ul className="stack-list">
              {props.dashboard.interviewPlan.map((item) => (
                <li className="list-row today-plan-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {formatType(item.type)} · {item.reason}
                    </span>
                    <span className="tag-row compact">
                      {item.tags.length ? item.tags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                    </span>
                  </div>
                  <div className="overview-row-actions">
                    <span className="confidence">{item.confidence ? `${item.confidence}/5` : "No confidence"}</span>
                    <button className="secondary-button compact-button" type="button" onClick={() => props.onOpenItem(item)}>
                      Open
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No suggested practice items yet.</p>
          )}
        </section>

        <section className="panel data-panel" aria-labelledby="weakness-map-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Weakness map</p>
              <h2 id="weakness-map-title">Tags to drill</h2>
            </div>
          </div>

          {props.dashboard?.weaknessMap?.length ? (
            <ul className="weakness-list">
              {props.dashboard.weaknessMap.map((weakness) => (
                <li className="weakness-row" key={weakness.tag}>
                  <div>
                    <strong>#{weakness.tag}</strong>
                    <span>
                      {weakness.itemCount} items · {weakness.failedOrPartialAttempts} failed/partial
                    </span>
                    {weakness.improveNextSamples.length ? (
                      <small>{weakness.improveNextSamples[0]}</small>
                    ) : null}
                  </div>
                  <div className="overview-row-actions">
                    <span className="confidence">
                      {weakness.averageConfidence ? `${weakness.averageConfidence}/5` : "No confidence"}
                    </span>
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => props.onOpenWeaknessTag(weakness.tag)}
                    >
                      Drill
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Weakness tags will appear after a few attempts.</p>
          )}
        </section>
      </section>

      <section className="panel data-panel" aria-labelledby="overview-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inventory</p>
            <h2 id="overview-title">Learning areas</h2>
          </div>
          <div className="count-strip" aria-label="Learning item counts by type">
            <span>Basics {props.groupedCounts.Basics}</span>
            <span>DSA {props.groupedCounts.Dsa}</span>
            <span>System Design {props.groupedCounts.SystemDesign}</span>
            <span>Flashcards {props.groupedCounts.Flashcard}</span>
          </div>
        </div>

        {props.dashboard?.dueReviews.length ? (
          <ul className="stack-list">
            {props.dashboard.dueReviews.map((item) => (
              <li key={item.id} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatType(item.type)}</span>
                </div>
                <div className="overview-row-actions">
                  <span className="confidence">{item.confidence ? `${item.confidence}/5` : "No confidence"}</span>
                  <button className="secondary-button compact-button" type="button" onClick={() => props.onOpenItem(item)}>
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No items are due for review yet.</p>
        )}
      </section>
    </>
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
 * Props accepted by the settings page.
 */
interface SettingsPageProps {
  /** Selected default review schedule preset. */
  reviewSchedulePreset: ReviewSchedulePreset;
  /** Updates the default review schedule preset. */
  onReviewSchedulePresetChange: (preset: ReviewSchedulePreset) => void;
}

/**
 * Renders app settings and backup controls.
 *
 * @param props - Component props.
 * @returns The settings page.
 */
function SettingsPage(props: SettingsPageProps) {
  return (
    <div className="settings-stack">
      <section className="panel settings-panel" aria-labelledby="practice-settings-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Practice settings</p>
            <h2 id="practice-settings-title">Review schedule</h2>
          </div>
        </div>

        <label>
          Default next review
          <select
            value={props.reviewSchedulePreset}
            onChange={(event) => props.onReviewSchedulePresetChange(event.target.value as ReviewSchedulePreset)}
          >
            <option value="one-week">1 week</option>
            <option value="two-weeks">2 weeks</option>
            <option value="one-month">1 month</option>
          </select>
        </label>
      </section>

      <BackupPage />
    </div>
  );
}

/**
 * Converts an API item type into display text.
 *
 * @param type - Learning item type.
 * @returns Human-readable item type.
 */
function formatType(type: LearningItemType) {
  return type === "Dsa" ? "DSA" : type === "SystemDesign" ? "System Design" : type === "Flashcard" ? "Flashcard" : "Basics";
}

/**
 * Converts a learning item type into the owning app page.
 *
 * @param type - Learning item type.
 * @returns App page containing the item.
 */
function toAppPage(type: LearningItemType): AppPage {
  if (type === "Dsa") {
    return "dsa";
  }

  if (type === "SystemDesign") {
    return "system-design";
  }

  if (type === "Flashcard") {
    return "flashcards";
  }

  return "basics";
}

/**
 * Scores candidate items when opening a weakness tag.
 *
 * @param candidate - Potential item to drill.
 * @returns Higher score for more useful practice targets.
 */
function calculateOverviewTargetScore(candidate: {
  confidence?: number | null;
  lastPracticedAt?: string | null;
  nextReviewAt?: string | null;
  totalAttempts: number;
}) {
  const now = Date.now();
  let score = 0;

  if (candidate.nextReviewAt && new Date(candidate.nextReviewAt).getTime() <= now) {
    score += 100;
  }

  if (!candidate.lastPracticedAt) {
    score += 80;
  } else if (new Date(candidate.lastPracticedAt).getTime() <= now - 21 * 24 * 60 * 60 * 1000) {
    score += 35;
  }

  if (!candidate.confidence) {
    score += 20;
  } else if (candidate.confidence <= 2) {
    score += 45;
  } else if (candidate.confidence === 3) {
    score += 20;
  }

  if (candidate.totalAttempts === 0) {
    score += 15;
  }

  return score;
}

/**
 * Reads the saved application theme from local storage.
 *
 * @returns The initial application theme.
 */
function readInitialTheme(): AppTheme {
  return localStorage.getItem("repetitio-theme") === "dark" ? "dark" : "light";
}

/**
 * Toggles the application theme.
 *
 * @param currentTheme - Current application theme.
 * @returns The next application theme.
 */
function toggleTheme(currentTheme: AppTheme): AppTheme {
  return currentTheme === "dark" ? "light" : "dark";
}

/**
 * Formats the last health check timestamp for a tooltip.
 *
 * @param checkedAt - Last health check timestamp.
 * @returns Human-readable health check text.
 */
function formatConnectionCheck(checkedAt: string | null) {
  if (!checkedAt) {
    return "Database connection has not been checked yet.";
  }

  return `Last checked ${new Date(checkedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })}`;
}
