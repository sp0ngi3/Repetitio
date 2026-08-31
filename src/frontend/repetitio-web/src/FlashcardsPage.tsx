import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  completeFlashcardSession,
  createFlashcard,
  createFlashcardDeck,
  deleteFlashcard,
  deleteFlashcardDeck,
  getFlashcardDeck,
  getFlashcardDecks,
  getFlashcards,
  updateFlashcard,
  updateFlashcardDeck
} from "./api";
import type {
  CompleteFlashcardReviewRequest,
  CreateFlashcardRequest,
  Flashcard,
  FlashcardDeck,
  FlashcardDeckSummary,
  LearningDifficulty,
  LearningItemStatus,
  UpdateFlashcardRequest
} from "./types";

/**
 * Flashcard page view modes.
 */
type FlashcardView = "dashboard" | "new-card" | "edit-card" | "new-deck" | "edit-deck" | "study";

/**
 * Number of flashcards shown on one dashboard page.
 */
const flashcardsPageSize = 10;

/**
 * Number of saved learning sessions shown on one dashboard page.
 */
const decksPageSize = 10;

/**
 * Number of flashcards shown in the learning session card picker.
 */
const deckPickerPageSize = 20;

/**
 * Delay used for server-backed search fields.
 */
const searchDebounceMs = 250;

/**
 * Editable flashcard form state.
 */
interface FlashcardForm {
  /** Flashcard title. */
  title: string;
  /** Question shown before flipping. */
  question: string;
  /** Explanation shown after flipping. */
  explanation: string;
  /** Optional source. */
  source: string;
  /** Optional short description. */
  description: string;
  /** Difficulty value. */
  difficulty: LearningDifficulty;
  /** Comma-separated tags. */
  tagsText: string;
}

/**
 * Editable saved deck form state.
 */
interface FlashcardDeckForm {
  /** Deck name. */
  name: string;
  /** Optional deck description. */
  description: string;
  /** Default number of cards to review in one run. */
  defaultSessionSize: string;
  /** Selected flashcard identifiers. */
  selectedCardIds: string[];
}

/**
 * Flashcard list filters.
 */
interface FlashcardFilters {
  /** Text search. */
  search: string;
  /** Status filter. */
  status: LearningItemStatus | "";
  /** Difficulty filter. */
  difficulty: LearningDifficulty | "";
}

/**
 * Active study session state.
 */
interface StudySession {
  /** Deck used for the session. */
  deck: FlashcardDeck;
  /** Cards selected for this run. */
  cards: Flashcard[];
  /** Current zero-based card index. */
  index: number;
  /** Whether the explanation side is visible. */
  isFlipped: boolean;
  /** Completed review results. */
  reviews: CompleteFlashcardReviewRequest[];
}

/**
 * Initial flashcard form values.
 */
const emptyFlashcardForm: FlashcardForm = {
  title: "",
  question: "",
  explanation: "",
  source: "",
  description: "",
  difficulty: "Unknown",
  tagsText: ""
};

/**
 * Initial saved deck form values.
 */
const emptyDeckForm: FlashcardDeckForm = {
  name: "",
  description: "",
  defaultSessionSize: "25",
  selectedCardIds: []
};

/**
 * Status values available in flashcard filters.
 */
const statuses: LearningItemStatus[] = ["NotStarted", "InProgress", "Completed", "Mastered"];

/**
 * Difficulty values available in flashcard forms and filters.
 */
const difficulties: LearningDifficulty[] = ["Unknown", "Easy", "Medium", "Hard"];

/**
 * Props accepted by the Flashcards page.
 */
interface FlashcardsPageProps {
  /** Called after flashcard practice changes global progress data. */
  onChanged: () => Promise<void> | void;
}

/**
 * Renders the flashcard dashboard, creation flow, and study session.
 *
 * @param props - Component props.
 * @returns The Flashcards page.
 */
export function FlashcardsPage(props: FlashcardsPageProps) {
  const [view, setView] = useState<FlashcardView>("dashboard");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardTotalCount, setFlashcardTotalCount] = useState(0);
  const [decks, setDecks] = useState<FlashcardDeckSummary[]>([]);
  const [deckTotalCount, setDeckTotalCount] = useState(0);
  const [filters, setFilters] = useState<FlashcardFilters>({ search: "", status: "", difficulty: "" });
  const [deckSearch, setDeckSearch] = useState("");
  const [cardForm, setCardForm] = useState<FlashcardForm>(emptyFlashcardForm);
  const [deckForm, setDeckForm] = useState<FlashcardDeckForm>(emptyDeckForm);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [selectedCardLookup, setSelectedCardLookup] = useState<Record<string, Flashcard>>({});
  const [pickerCards, setPickerCards] = useState<Flashcard[]>([]);
  const [pickerTotalCount, setPickerTotalCount] = useState(0);
  const [pickerSearch, setPickerSearch] = useState("");
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const [sessionSizes, setSessionSizes] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [deckPage, setDeckPage] = useState(1);
  const [pickerPage, setPickerPage] = useState(1);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedCardSearch = useDebouncedValue(filters.search, searchDebounceMs);
  const debouncedDeckSearch = useDebouncedValue(deckSearch, searchDebounceMs);
  const debouncedPickerSearch = useDebouncedValue(pickerSearch, searchDebounceMs);

  const flashcardPageCount = Math.max(1, Math.ceil(flashcardTotalCount / flashcardsPageSize));
  const deckPageCount = Math.max(1, Math.ceil(deckTotalCount / decksPageSize));
  const pickerPageCount = Math.max(1, Math.ceil(pickerTotalCount / deckPickerPageSize));
  const selectedPickerCards = useMemo(
    () => deckForm.selectedCardIds.map((id) => selectedCardLookup[id]).filter(Boolean),
    [deckForm.selectedCardIds, selectedCardLookup]
  );

  /**
   * Loads one page of flashcards from the API.
   */
  async function loadFlashcards() {
    setError(null);
    setIsLoadingCards(true);

    try {
      const response = await getFlashcards({
        ...filters,
        search: debouncedCardSearch,
        page: currentPage,
        pageSize: flashcardsPageSize
      });
      setFlashcards(response.items);
      setFlashcardTotalCount(response.totalCount);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load flashcards.");
    } finally {
      setIsLoadingCards(false);
    }
  }

  /**
   * Loads one page of saved learning session summaries from the API.
   */
  async function loadDecks() {
    setError(null);
    setIsLoadingDecks(true);

    try {
      const response = await getFlashcardDecks({
        search: debouncedDeckSearch,
        page: deckPage,
        pageSize: decksPageSize
      });
      setDecks(response.items);
      setDeckTotalCount(response.totalCount);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load flashcard sessions.");
    } finally {
      setIsLoadingDecks(false);
    }
  }

  /**
   * Loads one searchable page for the saved learning session card picker.
   */
  async function loadPickerCards() {
    setError(null);
    setIsLoadingPicker(true);

    try {
      const response = await getFlashcards({
        search: debouncedPickerSearch,
        page: pickerPage,
        pageSize: deckPickerPageSize
      });
      setPickerCards(response.items);
      setPickerTotalCount(response.totalCount);
      mergeSelectedCardLookup(response.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load flashcard picker.");
    } finally {
      setIsLoadingPicker(false);
    }
  }

  useEffect(() => {
    void loadFlashcards();
  }, [debouncedCardSearch, filters.status, filters.difficulty, currentPage]);

  useEffect(() => {
    void loadDecks();
  }, [debouncedDeckSearch, deckPage]);

  useEffect(() => {
    if (view === "new-deck" || view === "edit-deck") {
      void loadPickerCards();
    }
  }, [view, debouncedPickerSearch, pickerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, flashcardPageCount));
  }, [flashcardPageCount]);

  useEffect(() => {
    setDeckPage((page) => Math.min(page, deckPageCount));
  }, [deckPageCount]);

  useEffect(() => {
    setPickerPage((page) => Math.min(page, pickerPageCount));
  }, [pickerPageCount]);

  /**
   * Opens the new flashcard form.
   */
  function openNewCard() {
    setCardForm(emptyFlashcardForm);
    setSelectedCard(null);
    setView("new-card");
    setError(null);
  }

  /**
   * Opens an existing flashcard for editing.
   *
   * @param flashcard - Flashcard to edit.
   */
  function openEditCard(flashcard: Flashcard) {
    setSelectedCard(flashcard);
    setCardForm(createFlashcardForm(flashcard));
    setView("edit-card");
    setError(null);
  }

  /**
   * Opens the saved learning session form.
   */
  function openNewDeck() {
    setDeckForm(emptyDeckForm);
    setSelectedDeck(null);
    setSelectedCardLookup({});
    setPickerSearch("");
    setPickerPage(1);
    setView("new-deck");
    setError(null);
  }

  /**
   * Opens the saved learning session form for editing.
   *
   * @param deckSummary - Saved learning session summary to edit.
   */
  async function openEditDeck(deckSummary: FlashcardDeckSummary) {
    setIsSaving(true);
    setError(null);

    try {
      const deck = await getFlashcardDeck(deckSummary.id);
      setDeckForm(createFlashcardDeckForm(deck));
      setSelectedDeck(deck);
      setSelectedCardLookup(Object.fromEntries(deck.cards.map((card) => [card.id, card])));
      setPickerSearch("");
      setPickerPage(1);
      setView("edit-deck");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to open flashcard session.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Returns to the dashboard.
   */
  function returnToDashboard() {
    setView("dashboard");
    setStudySession(null);
    setSelectedCard(null);
    setSelectedDeck(null);
    setError(null);
  }

  /**
   * Updates one flashcard form field.
   *
   * @param key - Field to update.
   * @param value - New field value.
   */
  function updateCardForm<K extends keyof FlashcardForm>(key: K, value: FlashcardForm[K]) {
    setCardForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Updates one deck form field.
   *
   * @param key - Field to update.
   * @param value - New field value.
   */
  function updateDeckForm<K extends keyof FlashcardDeckForm>(key: K, value: FlashcardDeckForm[K]) {
    setDeckForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Updates one dashboard flashcard filter and resets pagination.
   *
   * @param patch - Filter values to change.
   */
  function updateFilters(patch: Partial<FlashcardFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setCurrentPage(1);
  }

  /**
   * Updates saved learning session search and resets pagination.
   *
   * @param value - Search value.
   */
  function updateDeckSearch(value: string) {
    setDeckSearch(value);
    setDeckPage(1);
  }

  /**
   * Updates card picker search and resets picker pagination.
   *
   * @param value - Search value.
   */
  function updatePickerSearch(value: string) {
    setPickerSearch(value);
    setPickerPage(1);
  }

  /**
   * Toggles a flashcard selection in the saved learning session form.
   *
   * @param flashcard - Flashcard to toggle.
   * @param isSelected - Whether the flashcard should be selected.
   */
  function toggleDeckCard(flashcard: Flashcard, isSelected: boolean) {
    setSelectedCardLookup((current) => ({ ...current, [flashcard.id]: flashcard }));
    setDeckForm((current) => ({
      ...current,
      selectedCardIds: isSelected
        ? [...current.selectedCardIds, flashcard.id].filter(onlyUnique)
        : current.selectedCardIds.filter((id) => id !== flashcard.id)
    }));
  }

  /**
   * Removes one selected card from the saved learning session form.
   *
   * @param flashcardId - Flashcard identifier to remove.
   */
  function removeSelectedDeckCard(flashcardId: string) {
    setDeckForm((current) => ({
      ...current,
      selectedCardIds: current.selectedCardIds.filter((id) => id !== flashcardId)
    }));
  }

  /**
   * Saves a new or existing flashcard.
   *
   * @param event - Form submit event.
   */
  async function handleCardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (selectedCard) {
        await updateFlashcard(selectedCard.id, toUpdateFlashcardRequest(cardForm, selectedCard));
      } else {
        await createFlashcard(toCreateFlashcardRequest(cardForm));
      }

      await loadFlashcards();
      await props.onChanged();
      returnToDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save flashcard.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Deletes the currently selected flashcard.
   */
  async function handleDeleteCard() {
    if (!selectedCard) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteFlashcard(selectedCard.id);
      await loadFlashcards();
      await loadDecks();
      await props.onChanged();
      returnToDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete flashcard.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Saves a selected-card learning session deck.
   *
   * @param event - Form submit event.
   */
  async function handleDeckSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (selectedDeck) {
        await updateFlashcardDeck(selectedDeck.id, toSaveFlashcardDeckRequest(deckForm));
      } else {
        await createFlashcardDeck(toSaveFlashcardDeckRequest(deckForm));
      }

      await loadDecks();
      setView("dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save flashcard session.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Deletes the currently selected saved learning session.
   */
  async function handleDeleteDeck() {
    if (!selectedDeck) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteFlashcardDeck(selectedDeck.id);
      await loadDecks();
      returnToDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete flashcard session.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Starts a study run from a saved deck.
   *
   * @param deckSummary - Deck summary to study.
   */
  async function startStudy(deckSummary: FlashcardDeckSummary) {
    setIsSaving(true);
    setError(null);

    try {
      const deck = await getFlashcardDeck(deckSummary.id);
      const sizeText = sessionSizes[deck.id] ?? String(deck.defaultSessionSize || 25);
      const size = Number(sizeText);
      const cards = selectStudyCards(deck.cards, Number.isFinite(size) && size > 0 ? size : 25);

      if (cards.length === 0) {
        setError("This saved session has no flashcards.");
        return;
      }

      setStudySession({
        deck,
        cards,
        index: 0,
        isFlipped: false,
        reviews: []
      });
      setView("study");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start flashcard session.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Records the current card evaluation and advances the study session.
   *
   * @param knewAnswer - Whether the answer was known.
   */
  async function evaluateCurrentCard(knewAnswer: boolean) {
    if (!studySession) {
      return;
    }

    const card = studySession.cards[studySession.index];
    const nextReviews = [
      ...studySession.reviews,
      {
        flashcardId: card.id,
        knewAnswer,
        confidence: knewAnswer ? 4 : 2
      }
    ];

    if (studySession.index + 1 < studySession.cards.length) {
      setStudySession({
        ...studySession,
        index: studySession.index + 1,
        isFlipped: false,
        reviews: nextReviews
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await completeFlashcardSession({
        deckId: studySession.deck.id,
        reviews: nextReviews
      });
      await loadFlashcards();
      await loadDecks();
      await props.onChanged();
      setStudySession({
        ...studySession,
        reviews: nextReviews,
        isFlipped: true
      });
      setView("dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save flashcard reviews.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Merges loaded cards into the selected-card lookup.
   *
   * @param cards - Cards loaded from an API page.
   */
  function mergeSelectedCardLookup(cards: Flashcard[]) {
    setSelectedCardLookup((current) => ({
      ...current,
      ...Object.fromEntries(cards.map((card) => [card.id, card]))
    }));
  }

  if (view === "new-card" || view === "edit-card") {
    return (
      <section className="tracker-page" aria-labelledby="flashcard-form-title">
        <PageHeading title={selectedCard ? "Edit flashcard" : "Add flashcard"} onBack={returnToDashboard} />
        {error ? <p className="error-banner">{error}</p> : null}
        <FlashcardFormPanel
          form={cardForm}
          isSaving={isSaving}
          selectedCard={selectedCard}
          onChange={updateCardForm}
          onDelete={handleDeleteCard}
          onSubmit={handleCardSubmit}
        />
      </section>
    );
  }

  if (view === "new-deck" || view === "edit-deck") {
    return (
      <section className="tracker-page" aria-labelledby="flashcard-deck-title">
        <PageHeading title={selectedDeck ? "Edit learning session" : "Create learning session"} onBack={returnToDashboard} />
        {error ? <p className="error-banner">{error}</p> : null}
        <FlashcardDeckFormPanel
          flashcards={pickerCards}
          form={deckForm}
          isLoadingPicker={isLoadingPicker}
          isSaving={isSaving}
          page={pickerPage}
          pageCount={pickerPageCount}
          pageSize={deckPickerPageSize}
          pickerSearch={pickerSearch}
          selectedCards={selectedPickerCards}
          selectedDeck={selectedDeck}
          totalCount={pickerTotalCount}
          onChange={updateDeckForm}
          onDelete={handleDeleteDeck}
          onPageChange={setPickerPage}
          onPickerSearchChange={updatePickerSearch}
          onRemoveSelected={removeSelectedDeckCard}
          onSubmit={handleDeckSubmit}
          onToggleCard={toggleDeckCard}
        />
      </section>
    );
  }

  if (view === "study" && studySession) {
    return (
      <StudySessionPage
        isSaving={isSaving}
        session={studySession}
        onBack={returnToDashboard}
        onEvaluate={evaluateCurrentCard}
        onFlip={() => setStudySession({ ...studySession, isFlipped: !studySession.isFlipped })}
      />
    );
  }

  return (
    <section className="tracker-page" aria-labelledby="flashcards-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Flashcards</p>
          <h2 id="flashcards-title">Cards</h2>
        </div>
        <div className="editor-actions">
          <button className="secondary-button" type="button" onClick={openNewCard}>
            Add flashcard
          </button>
          <button className="secondary-button" type="button" onClick={openNewDeck} disabled={flashcardTotalCount === 0}>
            Create learning session
          </button>
        </div>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="panel tracker-toolbar" aria-label="Flashcard filters">
        <label>
          Search cards
          <input
            value={filters.search}
            onChange={(event) => updateFilters({ search: event.target.value })}
            placeholder="question, explanation, tag..."
          />
        </label>

        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => updateFilters({ status: event.target.value as LearningItemStatus | "" })}
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
            value={filters.difficulty}
            onChange={(event) => updateFilters({ difficulty: event.target.value as LearningDifficulty | "" })}
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

      <section className="panel data-panel" aria-label="Flashcard records">
        {isLoadingCards ? (
          <p className="empty-state">Loading flashcards...</p>
        ) : flashcards.length ? (
          <div className="record-table flashcard-table">
            <div className="record-header">
              <span>Flashcard</span>
              <span>Tags</span>
              <span>Status</span>
              <span>Difficulty</span>
              <span>Known</span>
            </div>
            {flashcards.map((flashcard) => (
              <button className="record-row" type="button" key={flashcard.id} onClick={() => openEditCard(flashcard)}>
                <span>
                  <strong>{flashcard.title}</strong>
                  <small>{flashcard.source || "Personal"}</small>
                </span>
                <span className="tag-row compact">
                  {flashcard.tags.length ? flashcard.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                </span>
                <span>{formatStatus(flashcard.status)}</span>
                <span>{flashcard.difficulty}</span>
                <span>
                  {flashcard.knownReviews}/{flashcard.totalReviews}
                </span>
              </button>
            ))}
            <PaginationBar
              currentPage={currentPage}
              label="Flashcards pagination"
              pageCount={flashcardPageCount}
              totalCount={flashcardTotalCount}
              pageSize={flashcardsPageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          <p className="empty-state">No flashcards match the current filters.</p>
        )}
      </section>

      <section className="panel data-panel" aria-labelledby="flashcard-decks-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Saved sessions</p>
            <h3 id="flashcard-decks-title">Learning sessions</h3>
          </div>
        </div>

        <div className="session-filter-panel">
          <label>
            Search sessions
            <input
              value={deckSearch}
              onChange={(event) => updateDeckSearch(event.target.value)}
              placeholder="session name, description, card, tag..."
            />
          </label>
        </div>

        {isLoadingDecks ? (
          <p className="empty-state">Loading learning sessions...</p>
        ) : decks.length ? (
          <>
            <ul className="stack-list">
              {decks.map((deck) => (
                <li className="list-row flashcard-deck-row" key={deck.id}>
                  <div>
                    <strong>{deck.name}</strong>
                    <div className="session-metrics" aria-label={`${deck.name} session metrics`}>
                      <span>{deck.cardCount} cards</span>
                      <span>{deck.totalRuns} runs</span>
                      <span>{deck.knownReviews}/{deck.totalReviews} known</span>
                    </div>
                    <div className="date-metrics">
                      <span className="date-chip strong-date">
                        Last practiced {deck.lastPracticedAt ? formatDate(deck.lastPracticedAt) : "never"}
                      </span>
                      <span className="date-chip">
                        Next review {deck.nextReviewAt ? formatDate(deck.nextReviewAt) : "not scheduled"}
                      </span>
                    </div>
                    {deck.description ? <small>{deck.description}</small> : null}
                  </div>
                  <label>
                    Cards
                    <input
                      inputMode="numeric"
                      value={sessionSizes[deck.id] ?? String(deck.defaultSessionSize || 25)}
                      onChange={(event) => setSessionSizes({ ...sessionSizes, [deck.id]: event.target.value })}
                    />
                  </label>
                  <div className="editor-actions compact-actions">
                    <button className="secondary-button" type="button" disabled={isSaving} onClick={() => void startStudy(deck)}>
                      Start
                    </button>
                    <button className="secondary-button" type="button" disabled={isSaving} onClick={() => void openEditDeck(deck)}>
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <PaginationBar
              currentPage={deckPage}
              label="Learning sessions pagination"
              pageCount={deckPageCount}
              totalCount={deckTotalCount}
              pageSize={decksPageSize}
              onPageChange={setDeckPage}
            />
          </>
        ) : flashcardTotalCount ? (
          <p className="empty-state">No saved learning sessions match the current search.</p>
        ) : (
          <p className="empty-state">Create flashcards before saving a learning session.</p>
        )}
      </section>
    </section>
  );
}

/**
 * Props accepted by the page heading.
 */
interface PageHeadingProps {
  /** Heading text. */
  title: string;
  /** Returns to the dashboard. */
  onBack: () => void;
}

/**
 * Renders a page heading with a back action.
 *
 * @param props - Component props.
 * @returns A page heading.
 */
function PageHeading(props: PageHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">Flashcards</p>
        <h2>{props.title}</h2>
      </div>
      <button className="secondary-button" type="button" onClick={props.onBack}>
        Back
      </button>
    </div>
  );
}

/**
 * Props accepted by the flashcard form panel.
 */
interface FlashcardFormPanelProps {
  /** Editable flashcard form. */
  form: FlashcardForm;
  /** Whether a save operation is running. */
  isSaving: boolean;
  /** Existing selected flashcard when editing. */
  selectedCard: Flashcard | null;
  /** Updates one form field. */
  onChange: <K extends keyof FlashcardForm>(key: K, value: FlashcardForm[K]) => void;
  /** Deletes the selected flashcard. */
  onDelete: () => void;
  /** Saves the form. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Renders the flashcard editor form.
 *
 * @param props - Component props.
 * @returns The flashcard editor panel.
 */
function FlashcardFormPanel(props: FlashcardFormPanelProps) {
  return (
    <form className="panel flashcard-form" onSubmit={props.onSubmit}>
      <label>
        Title
        <input
          value={props.form.title}
          onChange={(event) => props.onChange("title", event.target.value)}
          placeholder="CAP theorem"
        />
      </label>

      <label>
        Question
        <textarea
          className="large-textarea expanding-textarea"
          value={props.form.question}
          onChange={(event) => props.onChange("question", event.target.value)}
          placeholder="What does CAP theorem say?"
        />
      </label>

      <label>
        Explanation
        <textarea
          className="large-textarea expanding-textarea"
          value={props.form.explanation}
          onChange={(event) => props.onChange("explanation", event.target.value)}
          placeholder="A distributed system can provide at most two of consistency, availability, and partition tolerance."
        />
      </label>

      <div className="form-grid two-columns">
        <label>
          Source
          <input
            value={props.form.source}
            onChange={(event) => props.onChange("source", event.target.value)}
            placeholder="System Design"
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
      </div>

      <label>
        Tags
        <input
          value={props.form.tagsText}
          onChange={(event) => props.onChange("tagsText", event.target.value)}
          placeholder="system-design, distributed-systems"
        />
      </label>

      <label>
        Description
        <textarea
          className="medium-textarea expanding-textarea"
          value={props.form.description}
          onChange={(event) => props.onChange("description", event.target.value)}
          placeholder="Short reminder for future review."
        />
      </label>

      <div className="editor-actions">
        <button className="primary-button" type="submit" disabled={props.isSaving}>
          {props.isSaving ? "Saving..." : "Save flashcard"}
        </button>
        {props.selectedCard ? (
          <button className="danger-button" type="button" onClick={props.onDelete} disabled={props.isSaving}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Props accepted by the saved flashcard deck form panel.
 */
interface FlashcardDeckFormPanelProps {
  /** Available flashcards on the current picker page. */
  flashcards: Flashcard[];
  /** Editable deck form. */
  form: FlashcardDeckForm;
  /** Whether picker data is being loaded. */
  isLoadingPicker: boolean;
  /** Whether a save operation is running. */
  isSaving: boolean;
  /** Current picker page. */
  page: number;
  /** Total picker page count. */
  pageCount: number;
  /** Picker page size. */
  pageSize: number;
  /** Current picker search value. */
  pickerSearch: string;
  /** Selected card records known to the client. */
  selectedCards: Flashcard[];
  /** Existing selected deck when editing. */
  selectedDeck: FlashcardDeck | null;
  /** Total matching picker card count. */
  totalCount: number;
  /** Updates one form field. */
  onChange: <K extends keyof FlashcardDeckForm>(key: K, value: FlashcardDeckForm[K]) => void;
  /** Deletes the selected saved learning session. */
  onDelete: () => void;
  /** Updates the picker page. */
  onPageChange: (page: number) => void;
  /** Updates the picker search. */
  onPickerSearchChange: (value: string) => void;
  /** Removes a selected card. */
  onRemoveSelected: (flashcardId: string) => void;
  /** Saves the deck. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Toggles one flashcard in the saved session. */
  onToggleCard: (flashcard: Flashcard, isSelected: boolean) => void;
}

/**
 * Renders the saved learning session form.
 *
 * @param props - Component props.
 * @returns The saved session form.
 */
function FlashcardDeckFormPanel(props: FlashcardDeckFormPanelProps) {
  const selectedPreview = props.selectedCards.slice(0, 20);
  const hiddenSelectedCount = Math.max(0, props.form.selectedCardIds.length - selectedPreview.length);

  return (
    <form className="panel flashcard-form" onSubmit={props.onSubmit}>
      <div className="form-grid two-columns">
        <label>
          Session name
          <input
            value={props.form.name}
            onChange={(event) => props.onChange("name", event.target.value)}
            placeholder="System Design fundamentals"
          />
        </label>

        <label>
          Default cards per run
          <input
            inputMode="numeric"
            min="1"
            max="200"
            type="number"
            value={props.form.defaultSessionSize}
            onChange={(event) => props.onChange("defaultSessionSize", event.target.value)}
          />
        </label>
      </div>

      <label>
        Description
        <textarea
          className="medium-textarea expanding-textarea"
          value={props.form.description}
          onChange={(event) => props.onChange("description", event.target.value)}
          placeholder="What this saved session should drill."
        />
      </label>

      <fieldset className="flashcard-selection">
        <legend>Flashcards</legend>
        <div className="card-picker-toolbar">
          <label>
            Search flashcards
            <input
              value={props.pickerSearch}
              onChange={(event) => props.onPickerSearchChange(event.target.value)}
              placeholder="title, question, source, tag..."
            />
          </label>
          <span>{props.form.selectedCardIds.length} selected</span>
        </div>

        {props.form.selectedCardIds.length ? (
          <div className="selected-card-strip" aria-label="Selected flashcards">
            {selectedPreview.map((flashcard) => (
              <button
                className="tag-filter-chip active"
                key={flashcard.id}
                type="button"
                onClick={() => props.onRemoveSelected(flashcard.id)}
              >
                {flashcard.title}
              </button>
            ))}
            {hiddenSelectedCount ? <span>{hiddenSelectedCount} more selected</span> : null}
          </div>
        ) : null}

        {props.isLoadingPicker ? (
          <p className="empty-state">Loading flashcards...</p>
        ) : props.flashcards.length ? (
          <div className="flashcard-picker-list">
            {props.flashcards.map((flashcard) => (
              <label className="checkbox-row picker-row" key={flashcard.id}>
                <input
                  checked={props.form.selectedCardIds.includes(flashcard.id)}
                  type="checkbox"
                  onChange={(event) => props.onToggleCard(flashcard, event.target.checked)}
                />
                <span>
                  <strong>{flashcard.title}</strong>
                  <small>
                    {flashcard.source || "Personal"} · {flashcard.tags.map((tag) => `#${tag}`).join(" ")}
                  </small>
                </span>
              </label>
            ))}
            <PaginationBar
              currentPage={props.page}
              label="Flashcard picker pagination"
              pageCount={props.pageCount}
              totalCount={props.totalCount}
              pageSize={props.pageSize}
              onPageChange={props.onPageChange}
            />
          </div>
        ) : (
          <p className="empty-state">No flashcards match this search.</p>
        )}
      </fieldset>

      <div className="editor-actions">
        <button className="primary-button" type="submit" disabled={props.isSaving}>
          {props.isSaving ? "Saving..." : "Save learning session"}
        </button>
        {props.selectedDeck ? (
          <button className="danger-button" type="button" onClick={props.onDelete} disabled={props.isSaving}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Props accepted by the study session page.
 */
interface StudySessionPageProps {
  /** Active study session. */
  session: StudySession;
  /** Whether review results are being saved. */
  isSaving: boolean;
  /** Returns to the dashboard. */
  onBack: () => void;
  /** Flips the current flashcard. */
  onFlip: () => void;
  /** Evaluates the current card. */
  onEvaluate: (knewAnswer: boolean) => void;
}

/**
 * Renders the active flashcard learning session.
 *
 * @param props - Component props.
 * @returns The study session page.
 */
function StudySessionPage(props: StudySessionPageProps) {
  const card = props.session.cards[props.session.index];

  return (
    <section className="tracker-page" aria-labelledby="flashcard-study-title">
      <PageHeading title={props.session.deck.name} onBack={props.onBack} />

      <section className="panel flashcard-study-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              Card {props.session.index + 1}/{props.session.cards.length}
            </p>
            <h3 id="flashcard-study-title">{card.title}</h3>
          </div>
        </div>

        <button className="flashcard-card" type="button" onClick={props.onFlip}>
          <span>{props.session.isFlipped ? "Explanation" : "Question"}</span>
          <strong>{props.session.isFlipped ? card.explanation : card.question}</strong>
        </button>

        <div className="editor-actions">
          <button className="secondary-button" type="button" onClick={props.onFlip}>
            Flip
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={!props.session.isFlipped || props.isSaving}
            onClick={() => props.onEvaluate(false)}
          >
            Did not know
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!props.session.isFlipped || props.isSaving}
            onClick={() => props.onEvaluate(true)}
          >
            Knew it
          </button>
        </div>
      </section>
    </section>
  );
}

/**
 * Creates a flashcard form from an existing flashcard.
 *
 * @param flashcard - Existing flashcard.
 * @returns Editable flashcard form.
 */
function createFlashcardForm(flashcard: Flashcard): FlashcardForm {
  return {
    title: flashcard.title,
    question: flashcard.question,
    explanation: flashcard.explanation,
    source: flashcard.source ?? "",
    description: flashcard.description ?? "",
    difficulty: flashcard.difficulty,
    tagsText: flashcard.tags.join(", ")
  };
}

/**
 * Creates a saved learning session form from an existing deck.
 *
 * @param deck - Existing saved learning session.
 * @returns Editable saved learning session form.
 */
function createFlashcardDeckForm(deck: FlashcardDeck): FlashcardDeckForm {
  return {
    name: deck.name,
    description: deck.description ?? "",
    defaultSessionSize: String(deck.defaultSessionSize || 25),
    selectedCardIds: deck.cards.map((card) => card.id)
  };
}

/**
 * Converts the flashcard form into a create request.
 *
 * @param form - Editable flashcard form.
 * @returns Flashcard create request.
 */
function toCreateFlashcardRequest(form: FlashcardForm): CreateFlashcardRequest {
  return {
    title: form.title.trim(),
    question: form.question.trim(),
    explanation: form.explanation.trim(),
    source: form.source.trim(),
    description: form.description.trim(),
    difficulty: form.difficulty,
    tags: parseTags(form.tagsText)
  };
}

/**
 * Converts the flashcard form into an update request.
 *
 * @param form - Editable flashcard form.
 * @param flashcard - Existing flashcard.
 * @returns Flashcard update request.
 */
function toUpdateFlashcardRequest(form: FlashcardForm, flashcard: Flashcard): UpdateFlashcardRequest {
  return {
    ...toCreateFlashcardRequest(form),
    status: flashcard.status,
    confidence: flashcard.confidence
  };
}

/**
 * Converts the saved learning session form into an API request.
 *
 * @param form - Editable saved learning session form.
 * @returns Saved learning session request.
 */
function toSaveFlashcardDeckRequest(form: FlashcardDeckForm) {
  const defaultSessionSize = Number(form.defaultSessionSize);

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    defaultSessionSize: Number.isFinite(defaultSessionSize) ? defaultSessionSize : 25,
    flashcardIds: form.selectedCardIds
  };
}

/**
 * Selects a due-first subset for one study run.
 *
 * @param cards - Available deck cards.
 * @param size - Requested study run size.
 * @returns Selected cards for this run.
 */
function selectStudyCards(cards: Flashcard[], size: number) {
  return [...cards]
    .sort((left, right) => {
      const leftDue = left.nextReviewAt ? new Date(left.nextReviewAt).getTime() : 0;
      const rightDue = right.nextReviewAt ? new Date(right.nextReviewAt).getTime() : 0;
      return leftDue - rightDue || left.title.localeCompare(right.title);
    })
    .slice(0, size);
}

/**
 * Props accepted by a dashboard pagination bar.
 */
interface PaginationBarProps {
  /** Accessible pagination label. */
  label: string;
  /** Current one-based page number. */
  currentPage: number;
  /** Total page count. */
  pageCount: number;
  /** Total record count. */
  totalCount: number;
  /** Number of records per page. */
  pageSize: number;
  /** Updates the current page. */
  onPageChange: (page: number) => void;
}

/**
 * Renders dashboard pagination controls.
 *
 * @param props - Component props.
 * @returns Pagination controls.
 */
function PaginationBar(props: PaginationBarProps) {
  const firstItem = props.totalCount === 0 ? 0 : (props.currentPage - 1) * props.pageSize + 1;
  const lastItem = Math.min(props.currentPage * props.pageSize, props.totalCount);

  return (
    <nav className="pagination-bar" aria-label={props.label}>
      <span>
        Showing {firstItem}-{lastItem} of {props.totalCount}
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-button"
          type="button"
          disabled={props.currentPage === 1}
          onClick={() => props.onPageChange(props.currentPage - 1)}
        >
          Previous page
        </button>
        <span>
          {props.currentPage}/{props.pageCount}
        </span>
        <button
          className="pagination-button"
          type="button"
          disabled={props.currentPage === props.pageCount}
          onClick={() => props.onPageChange(props.currentPage + 1)}
        >
          Next page
        </button>
      </div>
    </nav>
  );
}

/**
 * Returns a value after it has remained unchanged for the requested delay.
 *
 * @param value - Value to debounce.
 * @param delayMs - Debounce delay in milliseconds.
 * @returns The delayed value.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
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
 * Allows a value to appear only once in an array filter.
 *
 * @param value - Current value.
 * @param index - Current value index.
 * @param values - Source values.
 * @returns Whether this is the first occurrence of the value.
 */
function onlyUnique(value: string, index: number, values: string[]) {
  return values.indexOf(value) === index;
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
 * Formats an ISO date for compact dashboard display.
 *
 * @param value - ISO date value.
 * @returns Localized date string.
 */
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
