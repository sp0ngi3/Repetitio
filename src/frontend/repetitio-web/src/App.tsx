import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getBasicExercises, getDashboard, getHealthStatus, getLearningItems } from "./api";
import { BackupPage } from "./BackupPage";
import { BasicsPage } from "./BasicsPage";
import { DsaPage } from "./DsaPage";
import { FlashcardsPage } from "./FlashcardsPage";
import { NotesCompanion, NotesPage } from "./NotesPage";
import { SystemDesignPage } from "./SystemDesignPage";
import { WikiReviewSettings } from "./WikiLearning";
import { WikiOverview } from "./WikiOverview";
import { AppFooter, AppHeader, appPages, type AppPage } from "./AppChrome";
import { AppearanceSettings } from "./AppearanceSettings";
import { applyAppearance, readColorMode, readMotionPreference, readVisualStyle, type ColorMode, type MotionPreference, type VisualStyle } from "./appearance";
import { Activity, CalendarDays, CircleDashed, History, ArrowUpRight, Target } from "lucide-react";
import {
  readInitialReviewSchedulePreset,
  saveReviewSchedulePreset,
  type ReviewSchedulePreset
} from "./reviewSchedule";
import type { BasicExercise, Dashboard, LearningItem, LearningItemType, WikiStudyModeProgress } from "./types";

const WikiPage = lazy(() => import("./WikiPage").then(module => ({ default: module.WikiPage })));

/**
 * Internal navigation target for opening a concrete learning item.
 */
interface LearningNavigationTarget {
  /** Learning item identifier. */
  id: string;
  /** Learning item type. */
  type: LearningItemType;
  /** Saved learning session to open when the target is a due flashcard. */
  learningSessionId?: string | null;
  /** Saved learning session name to open when the target is a due flashcard. */
  learningSessionName?: string | null;
}

/**
 * Internal navigation target for opening a concrete learning item.
 */
interface FocusedLearningTarget extends LearningNavigationTarget {
  /** Unique value that allows reopening the same item twice. */
  nonce: number;
}

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
  const [theme, setTheme] = useState<ColorMode>(readColorMode);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(readVisualStyle);
  const [motion, setMotion] = useState<MotionPreference>(readMotionPreference);
  const [reviewSchedulePreset, setReviewSchedulePreset] = useState<ReviewSchedulePreset>(
    readInitialReviewSchedulePreset
  );
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [focusedLearningTarget, setFocusedLearningTarget] = useState<FocusedLearningTarget | null>(null);
  const [focusedWikiTarget, setFocusedWikiTarget] = useState<{ id: string; kind: WikiStudyModeProgress["kind"]; nonce: number } | null>(null);
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
    applyAppearance(theme, visualStyle, motion);
  }, [theme, visualStyle, motion]);

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
  function openLearningTarget(target: LearningNavigationTarget) {
    setFocusedLearningTarget({ ...target, nonce: Date.now() });
    setActivePage(toAppPage(target.type));
  }

  /**
   * Clears a handled deep-link target.
   */
  function clearFocusedLearningTarget() {
    setFocusedLearningTarget(null);
  }

  return (
    <div className="app-shell">
      <AppHeader page={activePage} mode={theme}
        connection={<DatabaseConnectionIndicator checkedAt={databaseCheckedAt} state={databaseConnection} />}
        onToggleMode={() => setTheme(value => value === "dark" ? "light" : "dark")}
        onNavigate={page => { if (page === "wiki") setFocusedWikiTarget(null); setActivePage(page); }} />
      <main id="workspace" className="app-workspace" data-page={activePage} tabIndex={-1}>
      <div className="workspace-location"><span>Workspace</span><span aria-hidden="true">/</span><strong>{appPages.find(page => page.id === activePage)?.label}</strong><time dateTime={new Date().toISOString().slice(0, 10)}>{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</time></div>

      {error ? <p className="error-banner">{error}</p> : null}

      {activePage === "overview" ? (
        <OverviewPage
          dashboard={dashboard}
          groupedCounts={groupedCounts}
          onOpenItem={openLearningTarget}
          onPracticeWiki={(id, kind) => { setFocusedWikiTarget({ id, kind, nonce: Date.now() }); setActivePage("wiki"); }}
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
          focusCardId={
            focusedLearningTarget?.type === "Flashcard" && !focusedLearningTarget.learningSessionId
              ? focusedLearningTarget.id
              : null
          }
          focusDeckId={focusedLearningTarget?.type === "Flashcard" ? focusedLearningTarget.learningSessionId : null}
          focusNonce={focusedLearningTarget?.type === "Flashcard" ? focusedLearningTarget.nonce : null}
          onChanged={refreshData}
          onFocusHandled={clearFocusedLearningTarget}
        />
      ) : null}

      {activePage === "notes" ? <NotesPage /> : null}

      {activePage === "wiki" ? <Suspense fallback={<p role="status">Loading Wiki...</p>}>
        <WikiPage key={focusedWikiTarget?.nonce ?? "wiki"}
          focusPageId={focusedWikiTarget?.id} focusStudyKind={focusedWikiTarget?.kind} />
      </Suspense> : null}

      {activePage === "settings" ? (
        <SettingsPage
          mode={theme} style={visualStyle} motion={motion}
          onModeChange={setTheme} onStyleChange={setVisualStyle} onMotionChange={setMotion}
          reviewSchedulePreset={reviewSchedulePreset}
          onReviewSchedulePresetChange={setReviewSchedulePreset}
        />
      ) : null}

      <NotesCompanion />
      </main>
      <AppFooter mode={theme} style={visualStyle} />
    </div>
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
  onOpenItem: (target: LearningNavigationTarget) => void;
  onPracticeWiki: (pageId: string, kind: WikiStudyModeProgress["kind"]) => void;
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
        <Metric label="Practices today" value={props.dashboard?.practicesToday ?? 0} icon={Activity} />
        <Metric label="This week" value={props.dashboard?.practicesThisWeek ?? 0} icon={CalendarDays} />
        <Metric label="Due reviews" value={props.dashboard?.dueReviewCount ?? 0} icon={History} />
        <Metric label="Never practiced" value={props.dashboard?.neverPracticedCount ?? 0} icon={CircleDashed} />
      </section>

      <section className="dashboard-focus-grid" aria-label="Daily interview focus">
        <section className="panel data-panel" aria-labelledby="today-plan-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Daily interview plan</p>
              <h2 id="today-plan-title"><Target size={19} aria-hidden="true" />Today</h2>
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
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      disabled={!canOpenLearningTarget(item)}
                      onClick={() => props.onOpenItem(item)}
                    >
                      {getLearningTargetActionLabel(item, "Open")}
                      <ArrowUpRight size={15} aria-hidden="true" />
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
                      disabled={!weakness.drillTarget || !canOpenLearningTarget(weakness.drillTarget)}
                      onClick={() => {
                        if (weakness.drillTarget && canOpenLearningTarget(weakness.drillTarget)) {
                          props.onOpenItem(weakness.drillTarget);
                        }
                      }}
                    >
                      {weakness.drillTarget ? getLearningTargetActionLabel(weakness.drillTarget, "Drill") : "Drill"}
                      <ArrowUpRight size={15} aria-hidden="true" />
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

      <WikiOverview onPractice={props.onPracticeWiki} />

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
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    disabled={!canOpenLearningTarget(item)}
                    onClick={() => props.onOpenItem(item)}
                  >
                    {getLearningTargetActionLabel(item, "Open")}
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

function canOpenLearningTarget(target: LearningNavigationTarget) {
  return target.type !== "Flashcard" || Boolean(target.learningSessionId);
}

function getLearningTargetActionLabel(target: LearningNavigationTarget, fallback: string) {
  if (target.type !== "Flashcard") {
    return fallback;
  }

  return target.learningSessionId ? `${fallback} session` : "No session";
}

/**
 * Renders a compact metric.
 *
 * @param props - Component props.
 * @returns A metric card.
 */
function Metric(props: { label: string; value: number; icon: typeof Activity }) {
  const Icon = props.icon;
  return (
    <article className="metric-card">
      <span><Icon size={18} aria-hidden="true" />{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

/**
 * Props accepted by the settings page.
 */
interface SettingsPageProps {
  mode: ColorMode;
  style: VisualStyle;
  motion: MotionPreference;
  onModeChange: (mode: ColorMode) => void;
  onStyleChange: (style: VisualStyle) => void;
  onMotionChange: (motion: MotionPreference) => void;
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
      <AppearanceSettings mode={props.mode} style={props.style} motion={props.motion}
        onModeChange={props.onModeChange} onStyleChange={props.onStyleChange} onMotionChange={props.onMotionChange} />
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
      <WikiReviewSettings />
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
