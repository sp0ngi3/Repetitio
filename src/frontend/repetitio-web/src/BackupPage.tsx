import { ChangeEvent, useEffect, useState } from "react";
import { exportBackup, getBackupStatus, importBackup, validateBackup } from "./api";
import type { BackupStatus, BackupValidation, ImportBackupResult } from "./types";

/**
 * Renders backup export, validation, and import controls.
 *
 * @returns The backup settings page.
 */
export function BackupPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<BackupValidation | null>(null);
  const [importResult, setImportResult] = useState<ImportBackupResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  /**
   * Loads current backup storage status.
   */
  async function loadStatus() {
    try {
      setStatus(await getBackupStatus());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load backup status.");
    }
  }

  /**
   * Downloads an exported backup archive.
   */
  async function handleExport() {
    setIsBusy(true);
    setError(null);

    try {
      const backup = await exportBackup();
      const url = URL.createObjectURL(backup.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = backup.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      await loadStatus();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to export backup.");
    } finally {
      setIsBusy(false);
    }
  }

  /**
   * Stores the selected import file.
   *
   * @param event - The file input change event.
   */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidation(null);
    setImportResult(null);
    setError(null);
  }

  /**
   * Validates the selected backup file without importing it.
   */
  async function handleValidate() {
    if (!selectedFile) {
      setError("Select a backup file first.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setImportResult(null);

    try {
      setValidation(await validateBackup(selectedFile));
    } catch (requestError) {
      setValidation(null);
      setError(readRequestError(requestError, "Backup validation failed."));
    } finally {
      setIsBusy(false);
    }
  }

  /**
   * Imports the selected backup file after server-side validation.
   */
  async function handleImport() {
    if (!selectedFile) {
      setError("Select a backup file first.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const result = await importBackup(selectedFile);
      setImportResult(result);
      setValidation(result.validation);
      await loadStatus();
    } catch (requestError) {
      setImportResult(null);
      setError(readRequestError(requestError, "Unable to import backup."));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="tracker-page" aria-labelledby="backup-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h2 id="backup-title">Backup</h2>
        </div>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="panel backup-panel" aria-label="Backup storage">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Persistence</p>
            <h3>SQLite storage</h3>
          </div>
          <span className={status?.databaseExists ? "status-pill ready" : "status-pill warning"}>
            {status?.databaseExists ? "Ready" : "Missing"}
          </span>
        </div>

        <dl className="backup-status-list">
          <div>
            <dt>Database</dt>
            <dd>{status?.databasePath ?? "Loading..."}</dd>
          </div>
          <div>
            <dt>Backup directory</dt>
            <dd>{status?.backupDirectory ?? "Loading..."}</dd>
          </div>
          <div>
            <dt>Schema</dt>
            <dd>{status?.databaseSchemaVersion || "No migrations"}</dd>
          </div>
        </dl>
      </section>

      <section className="backup-grid">
        <article className="panel backup-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Export Data</p>
              <h3>Create backup</h3>
            </div>
          </div>
          <p className="muted-copy">Exports a validated zip archive with manifest.json and repetitio.db.</p>
          <button className="primary-button" type="button" onClick={handleExport} disabled={isBusy}>
            {isBusy ? "Working..." : "Export Data"}
          </button>
        </article>

        <article className="panel backup-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Import Data</p>
              <h3>Restore backup</h3>
            </div>
          </div>

          <label>
            Backup file
            <input type="file" accept=".zip,application/zip" onChange={handleFileChange} />
          </label>

          <div className="editor-actions">
            <button className="secondary-button" type="button" onClick={handleValidate} disabled={isBusy || !selectedFile}>
              Validate Backup
            </button>
            <button className="danger-button" type="button" onClick={handleImport} disabled={isBusy || !selectedFile}>
              Import Data
            </button>
          </div>

          {validation ? <BackupValidationResult validation={validation} /> : null}
          {importResult ? <ImportResult result={importResult} /> : null}
        </article>
      </section>
    </section>
  );
}

/**
 * Props accepted by backup validation result.
 */
interface BackupValidationResultProps {
  /** Backup validation result. */
  validation: BackupValidation;
}

/**
 * Renders backup validation details.
 *
 * @param props - Component props.
 * @returns The validation result panel.
 */
function BackupValidationResult(props: BackupValidationResultProps) {
  return (
    <div className={props.validation.isValid ? "validation-box valid" : "validation-box invalid"}>
      <strong>{props.validation.isValid ? "Backup is valid" : "Backup is invalid"}</strong>
      <span>{props.validation.message}</span>
      {props.validation.manifest ? (
        <small>
          Created {formatDateTime(props.validation.manifest.createdAt)} · schema{" "}
          {props.validation.manifest.databaseSchemaVersion}
        </small>
      ) : null}
    </div>
  );
}

/**
 * Props accepted by import result.
 */
interface ImportResultProps {
  /** Import result returned by the API. */
  result: ImportBackupResult;
}

/**
 * Renders backup import details.
 *
 * @param props - Component props.
 * @returns The import result panel.
 */
function ImportResult(props: ImportResultProps) {
  return (
    <div className={props.result.imported ? "validation-box valid" : "validation-box invalid"}>
      <strong>{props.result.imported ? "Import completed" : "Import blocked"}</strong>
      <span>{props.result.message}</span>
      {props.result.preImportBackupFileName ? (
        <small>Pre-import backup: {props.result.preImportBackupFileName}</small>
      ) : null}
    </div>
  );
}

/**
 * Reads a useful API error message from a request failure.
 *
 * @param requestError - The thrown request error.
 * @param fallback - Fallback message.
 * @returns A display-ready error message.
 */
function readRequestError(requestError: unknown, fallback: string) {
  if (!(requestError instanceof Error)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(requestError.message) as { message?: string; validation?: { message?: string } };

    return parsed.validation?.message ?? parsed.message ?? requestError.message;
  } catch {
    return requestError.message || fallback;
  }
}

/**
 * Formats an ISO date and time for display.
 *
 * @param value - ISO date value.
 * @returns Human-readable date and time.
 */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
