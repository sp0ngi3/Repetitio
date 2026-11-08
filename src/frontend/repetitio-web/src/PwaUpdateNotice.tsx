import { useEffect, useState } from "react";

const updateCheckIntervalMs = 60_000;

function isInstalledApp() {
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return iosNavigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function PwaUpdateNotice() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!isInstalledApp()) return;

    const lifetime = new AbortController();
    let checking = false;

    async function checkForUpdate() {
      if (document.hidden || checking) return;

      checking = true;
      try {
        const response = await fetch("/app-version.json", {
          cache: "no-store",
          redirect: "error",
          signal: lifetime.signal
        });
        if (!response.ok) return;

        const metadata = await response.json() as { buildId?: unknown } | null;
        if (!lifetime.signal.aborted && typeof metadata?.buildId === "string" && metadata.buildId.length > 0)
          setUpdateAvailable(metadata.buildId !== __BUILD_ID__);
      } catch {
        // Offline, signed-out and older servers can be checked again later.
      } finally {
        checking = false;
      }
    }

    void checkForUpdate();
    const interval = window.setInterval(checkForUpdate, updateCheckIntervalMs);
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("pageshow", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    return () => {
      lifetime.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("pageshow", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <aside className="pwa-update-notice" aria-label="App update">
      <p role="status">A new version of Repetitio is available. Save your work before updating.</p>
      <button className="primary-button compact-button" type="button" onClick={() => window.location.reload()}>
        Reload to update
      </button>
    </aside>
  );
}
