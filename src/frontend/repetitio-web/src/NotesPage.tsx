import { FormEvent, useEffect, useMemo, useState } from "react";
import { createNotePage, deleteNotePage, getNotePages, updateNotePage } from "./api";
import { confirmDelete } from "./confirmDelete";
import type { CreateNotePageRequest, NoteArea, NotePage as NotePageRecord, UpdateNotePageRequest } from "./types";

/**
 * Notebook areas rendered by the notes UI.
 */
const noteAreas: NoteArea[] = ["Dsa", "SystemDesign", "Other"];

/**
 * Delay used before saving notes from the companion panel.
 */
const companionSaveDebounceMs = 500;

/**
 * Number of note pages rendered in the sidebar at once.
 */
const notesPageSize = 12;

/**
 * Target maximum size for one split note page.
 */
const noteSplitTargetLength = 12000;

/**
 * Editable note form state.
 */
interface NoteForm {
  /** Notebook area. */
  area: NoteArea;
  /** Page title. */
  title: string;
  /** Markdown content. */
  contentMarkdown: string;
}

/**
 * Props accepted by the Notes page.
 */
interface NotesPageProps {
  /** Called after notes are changed. */
  onChanged?: () => Promise<void> | void;
}

/**
 * Initial note form values.
 */
const emptyNoteForm: NoteForm = {
  area: "Dsa",
  title: "",
  contentMarkdown: ""
};

/**
 * Renders the full notes workspace.
 *
 * @param props - Component props.
 * @returns The Notes page.
 */
export function NotesPage(props: NotesPageProps) {
  const [notes, setNotes] = useState<NotePageRecord[]>([]);
  const [activeArea, setActiveArea] = useState<NoteArea>("Dsa");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<NoteForm>(emptyNoteForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  const visibleNotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesArea = note.area === activeArea;
      const matchesSearch =
        !normalizedSearch || `${note.title} ${note.contentMarkdown}`.toLowerCase().includes(normalizedSearch);

      return matchesArea && matchesSearch;
    });
  }, [activeArea, notes, search]);
  const totalPages = Math.max(1, Math.ceil(visibleNotes.length / notesPageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedNotes = visibleNotes.slice((normalizedPage - 1) * notesPageSize, normalizedPage * notesPageSize);

  useEffect(() => {
    setPage(1);
  }, [activeArea, search]);

  /**
   * Loads all note pages.
   */
  async function loadNotes(preferredNoteId = selectedNoteId, preferredArea = activeArea) {
    setError(null);
    setIsLoading(true);

    try {
      const nextNotes = await getNotePages();
      setNotes(nextNotes);

      const nextSelected = nextNotes.find((note) => note.id === preferredNoteId)
        ?? nextNotes.find((note) => note.area === preferredArea)
        ?? nextNotes[0]
        ?? null;

      if (nextSelected) {
        selectNote(nextSelected);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load notes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  useEffect(() => {
    const noteForArea = notes.find((note) => note.area === activeArea);

    if (noteForArea && selectedNote?.area !== activeArea) {
      selectNote(noteForArea);
    }
  }, [activeArea, notes]);

  /**
   * Selects a note page for editing.
   *
   * @param note - Note page to select.
   */
  function selectNote(note: NotePageRecord) {
    setSelectedNoteId(note.id);
    setForm(createNoteForm(note));
  }

  /**
   * Starts a new page in the current notebook area.
   */
  function startNewPage() {
    setSelectedNoteId(null);
    setForm({
      area: activeArea,
      title: "",
      contentMarkdown: ""
    });
  }

  /**
   * Updates one form field.
   *
   * @param key - Field to update.
   * @param value - New field value.
   */
  function updateForm<K extends keyof NoteForm>(key: K, value: NoteForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Saves the current note form.
   *
   * @param event - Form submit event.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const savedNote = selectedNote
        ? await updateNotePage(selectedNote.id, toUpdateNotePageRequest(form, selectedNote))
        : await createNotePage(toCreateNotePageRequest(form));

      await props.onChanged?.();
      setSelectedNoteId(savedNote.id);
      setActiveArea(savedNote.area);
      await loadNotes(savedNote.id, savedNote.area);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save note.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Deletes the currently selected note page.
   */
  async function handleDelete() {
    if (!selectedNote) {
      return;
    }

    if (!confirmDelete(`note "${selectedNote.title}"`)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteNotePage(selectedNote.id);
      await props.onChanged?.();
      setSelectedNoteId(null);
      await loadNotes(null, activeArea);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete note.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Splits a long note into several note pages in the same notebook area.
   */
  async function handleSplitPage() {
    const title = form.title.trim();

    if (!title) {
      setError("Title is required before splitting a note.");
      return;
    }

    const chunks = splitNoteIntoPages(form.contentMarkdown);

    if (chunks.length <= 1) {
      setError("This note is short enough to stay as one page.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const firstPage = selectedNote
        ? await updateNotePage(selectedNote.id, {
          ...toUpdateNotePageRequest({ ...form, contentMarkdown: chunks[0] }, selectedNote)
        })
        : await createNotePage(toCreateNotePageRequest({ ...form, contentMarkdown: chunks[0] }));

      for (let index = 1; index < chunks.length; index++) {
        await createNotePage({
          area: form.area,
          title: `${title} (${index + 1})`,
          contentMarkdown: chunks[index]
        });
      }

      await props.onChanged?.();
      setSelectedNoteId(firstPage.id);
      setActiveArea(firstPage.area);
      await loadNotes(firstPage.id, firstPage.area);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to split note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="notes-page" aria-labelledby="notes-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Notes</p>
          <h2 id="notes-title">Notebook</h2>
        </div>
        <button className="secondary-button" type="button" onClick={startNewPage}>
          New page
        </button>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="notes-layout">
        <aside className="panel notes-sidebar" aria-label="Note pages">
          <div className="note-area-tabs" role="tablist" aria-label="Notebook areas">
            {noteAreas.map((area) => (
              <button
                className={activeArea === area ? "active" : ""}
                key={area}
                type="button"
                role="tab"
                aria-selected={activeArea === area}
                onClick={() => setActiveArea(area)}
              >
                {formatNoteArea(area)}
              </button>
            ))}
          </div>

          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="title or note text..." />
          </label>

          <div className="notes-sidebar-summary">
            <strong>{visibleNotes.length}</strong>
            <span>{formatNoteArea(activeArea)} pages</span>
          </div>

          {isLoading ? (
            <p className="empty-state">Loading notes...</p>
          ) : visibleNotes.length ? (
            <ul className="problem-list">
              {pagedNotes.map((note) => (
                <li key={note.id}>
                  <button
                    aria-label={note.title}
                    className={selectedNoteId === note.id ? "problem-row active" : "problem-row"}
                    type="button"
                    onClick={() => selectNote(note)}
                  >
                    <span>
                      <strong>{note.title}</strong>
                      <small>Updated {formatDateTime(note.updatedAt)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No note pages match this search.</p>
          )}

          {visibleNotes.length > notesPageSize ? (
            <nav className="pagination-bar notes-pagination" aria-label="Notes pagination">
              <span>
                Page {normalizedPage} / {totalPages}
              </span>
              <div className="pagination-controls">
                <button
                  aria-label="Previous notes page"
                  className="pagination-button"
                  disabled={normalizedPage <= 1}
                  type="button"
                  onClick={() => setPage(Math.max(1, normalizedPage - 1))}
                >
                  Prev
                </button>
                <button
                  aria-label="Next notes page"
                  className="pagination-button"
                  disabled={normalizedPage >= totalPages}
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, normalizedPage + 1))}
                >
                  Next
                </button>
              </div>
            </nav>
          ) : null}
        </aside>

        <form className="panel notes-editor" onSubmit={handleSubmit}>
          <div className="form-grid two-columns">
            <label>
              Area
              <select value={form.area} onChange={(event) => updateForm("area", event.target.value as NoteArea)}>
                {noteAreas.map((area) => (
                  <option key={area} value={area}>
                    {formatNoteArea(area)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Title
              <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Page title" />
            </label>
          </div>

          <label>
            Page
            <textarea
              className="notes-document-textarea"
              value={form.contentMarkdown}
              onChange={(event) => updateForm("contentMarkdown", event.target.value)}
              placeholder="Write notes in markdown..."
            />
          </label>

          <div className="editor-actions">
            <button className="primary-button compact-button" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save page"}
            </button>
            <button
              className="secondary-button compact-button"
              type="button"
              disabled={isSaving || form.contentMarkdown.length <= noteSplitTargetLength}
              onClick={handleSplitPage}
            >
              Split page
            </button>
            {selectedNote ? (
              <button className="danger-button" type="button" onClick={handleDelete} disabled={isSaving}>
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

/**
 * Renders a global note companion that can be opened on any page.
 *
 * @returns The note companion component.
 */
export function NotesCompanion() {
  const [notes, setNotes] = useState<NotePageRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeArea, setActiveArea] = useState<NoteArea>("Dsa");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteForm>(emptyNoteForm);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const areaNotes = useMemo(
    () => notes.filter((note) => note.area === activeArea),
    [activeArea, notes]
  );

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? areaNotes[0] ?? notes[0] ?? null,
    [areaNotes, notes, selectedNoteId]
  );

  /**
   * Loads note pages for the companion.
   */
  async function loadNotes() {
    try {
      const nextNotes = await getNotePages();
      setNotes(nextNotes);

      const nextSelected = nextNotes.find((note) => note.id === selectedNoteId)
        ?? nextNotes.find((note) => note.area === activeArea)
        ?? nextNotes[0]
        ?? null;

      if (nextSelected) {
        setSelectedNoteId(nextSelected.id);
        setDraft(createNoteForm(nextSelected));
      }
    } catch {
      setSaveState("error");
    }
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  useEffect(() => {
    if (selectedNote) {
      setSelectedNoteId(selectedNote.id);
      setDraft(createNoteForm(selectedNote));
    }
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!isOpen || !selectedNote || draft.title.trim().length === 0 || !hasDraftChanged(draft, selectedNote)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveState("saving");
      updateNotePage(selectedNote.id, toUpdateNotePageRequest(draft, selectedNote))
        .then((savedNote) => {
          setNotes((current) => current.map((note) => (note.id === savedNote.id ? savedNote : note)));
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, companionSaveDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [draft.area, draft.contentMarkdown, draft.title, isOpen]);

  /**
   * Selects the active notebook area.
   *
   * @param area - Notebook area to open.
   */
  function selectArea(area: NoteArea) {
    setActiveArea(area);
    const note = notes.find((candidate) => candidate.area === area);

    if (note) {
      setSelectedNoteId(note.id);
      setDraft(createNoteForm(note));
    }
  }

  /**
   * Selects a note page.
   *
   * @param noteId - Note page identifier.
   */
  function selectNote(noteId: string) {
    const note = notes.find((candidate) => candidate.id === noteId);

    if (note) {
      setSelectedNoteId(note.id);
      setDraft(createNoteForm(note));
    }
  }

  return (
    <>
      <button
        aria-label="Open notes companion"
        className="notes-fab"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        Notes
      </button>
      {isOpen ? (
        <aside className="notes-companion" aria-label="Global notes">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quick notes</p>
              <h2>Notes</h2>
            </div>
            <button className="secondary-button compact-button" type="button" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>

          <div className="note-area-tabs" role="tablist" aria-label="Quick notebook areas">
            {noteAreas.map((area) => (
              <button
                className={activeArea === area ? "active" : ""}
                key={area}
                type="button"
                role="tab"
                aria-selected={activeArea === area}
                onClick={() => selectArea(area)}
              >
                {formatNoteArea(area)}
              </button>
            ))}
          </div>

          {areaNotes.length > 1 ? (
            <label>
              Page
              <select value={selectedNote?.id ?? ""} onChange={(event) => selectNote(event.target.value)}>
                {areaNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Page title"
            />
          </label>

          <label>
            Page
            <textarea
              className="notes-companion-textarea"
              value={draft.contentMarkdown}
              onChange={(event) => setDraft((current) => ({ ...current, contentMarkdown: event.target.value }))}
              placeholder="Write notes..."
            />
          </label>

          <span className={`autosave-state ${saveState}`}>{formatSaveState(saveState)}</span>
        </aside>
      ) : null}
    </>
  );
}

/**
 * Creates a note form from an API response.
 *
 * @param note - Existing note page.
 * @returns Editable note form.
 */
function createNoteForm(note: NotePageRecord): NoteForm {
  return {
    area: note.area,
    title: note.title,
    contentMarkdown: note.contentMarkdown
  };
}

/**
 * Converts a note form into a create request.
 *
 * @param form - Editable note form.
 * @returns Note page create request.
 */
function toCreateNotePageRequest(form: NoteForm): CreateNotePageRequest {
  return {
    area: form.area,
    title: form.title.trim(),
    contentMarkdown: form.contentMarkdown
  };
}

/**
 * Converts a note form into an update request.
 *
 * @param form - Editable note form.
 * @param note - Existing note page.
 * @returns Note page update request.
 */
function toUpdateNotePageRequest(form: NoteForm, note: NotePageRecord): UpdateNotePageRequest {
  return {
    ...toCreateNotePageRequest(form),
    sortOrder: note.sortOrder
  };
}

/**
 * Returns whether the note draft differs from the currently selected page.
 *
 * @param draft - Editable note form.
 * @param note - Selected note page.
 * @returns <see langword="true"/> when the draft contains unsaved changes.
 */
function hasDraftChanged(draft: NoteForm, note: NotePageRecord) {
  return draft.area !== note.area || draft.title !== note.title || draft.contentMarkdown !== note.contentMarkdown;
}

/**
 * Splits a long note into page-sized markdown chunks.
 *
 * @param markdown - The markdown document.
 * @returns Split markdown chunks.
 */
function splitNoteIntoPages(markdown: string) {
  const normalized = markdown.trim();

  if (normalized.length <= noteSplitTargetLength) {
    return [normalized];
  }

  const sections = normalized
    .split(/\n(?=#{1,2}\s+)/g)
    .map((section) => section.trim())
    .filter(Boolean);
  const sourceSections = sections.length > 1 ? sections : splitByLength(normalized);
  const chunks: string[] = [];
  let current = "";

  for (const section of sourceSections) {
    if (section.length > noteSplitTargetLength) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }

      chunks.push(...splitByLength(section));
      continue;
    }

    const candidate = current ? `${current}\n\n${section}` : section;

    if (candidate.length > noteSplitTargetLength && current) {
      chunks.push(current.trim());
      current = section;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Splits text into bounded chunks when markdown headings are not enough.
 *
 * @param text - The text to split.
 * @returns Bounded chunks.
 */
function splitByLength(text: string) {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > noteSplitTargetLength) {
    let splitAt = remaining.lastIndexOf("\n\n", noteSplitTargetLength);

    if (splitAt < noteSplitTargetLength * 0.5) {
      splitAt = remaining.lastIndexOf("\n", noteSplitTargetLength);
    }

    if (splitAt < noteSplitTargetLength * 0.5) {
      splitAt = noteSplitTargetLength;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

/**
 * Converts a note area into display text.
 *
 * @param area - Notebook area.
 * @returns Human-readable notebook name.
 */
function formatNoteArea(area: NoteArea) {
  return area === "Dsa" ? "DSA" : area === "SystemDesign" ? "System Design" : "Other";
}

/**
 * Formats autosave state for the companion panel.
 *
 * @param state - Current autosave state.
 * @returns Human-readable autosave state.
 */
function formatSaveState(state: "idle" | "saving" | "saved" | "error") {
  return state === "saving" ? "Saving..." : state === "saved" ? "Saved" : state === "error" ? "Could not save" : "Ready";
}

/**
 * Formats an ISO date and time for note metadata.
 *
 * @param value - ISO date value.
 * @returns Localized date and time string.
 */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
