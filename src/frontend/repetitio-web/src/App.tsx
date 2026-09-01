import { useEffect, useMemo, useState } from "react";
import { getBasicExercises, getDashboard, getHealthStatus, getLearningItems } from "./api";
import { BackupPage } from "./BackupPage";
import { BasicsPage } from "./BasicsPage";
import { DsaPage } from "./DsaPage";
import { FlashcardsPage } from "./FlashcardsPage";
import { NotesCompanion, NotesPage } from "./NotesPage";
import { SystemDesignPage } from "./SystemDesignPage";
import type { BasicExercise, Dashboard, LearningItem, LearningItemType } from "./types";

/**
 * Application page identifiers.
 */
type AppPage = "overview" | "dsa" | "system-design" | "basics" | "flashcards" | "notes" | "settings";

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
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
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
        <OverviewPage dashboard={dashboard} groupedCounts={groupedCounts} />
      ) : null}

      {activePage === "dsa" ? <DsaPage onChanged={refreshData} /> : null}

      {activePage === "system-design" ? <SystemDesignPage onChanged={refreshData} /> : null}

      {activePage === "basics" ? <BasicsPage basicExercises={basicExercises} onChanged={refreshData} /> : null}

      {activePage === "flashcards" ? <FlashcardsPage onChanged={refreshData} /> : null}

      {activePage === "notes" ? <NotesPage /> : null}

      {activePage === "settings" ? <BackupPage /> : null}

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
                <span className="confidence">{item.confidence ? `${item.confidence}/5` : "No confidence"}</span>
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
 * Converts an API item type into display text.
 *
 * @param type - Learning item type.
 * @returns Human-readable item type.
 */
function formatType(type: LearningItemType) {
  return type === "Dsa" ? "DSA" : type === "SystemDesign" ? "System Design" : type === "Flashcard" ? "Flashcard" : "Basics";
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
