import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  completeFlashcardSession,
  createFlashcard,
  createFlashcardDeck,
  deleteFlashcard,
  deleteFlashcardDeck,
  getFlashcard,
  getFlashcardDeck,
  getFlashcardDecks,
  getFlashcards,
  importFlashcardsBatch,
  updateFlashcard,
  updateFlashcardDeck
} from "./api";
import { getPracticeAgeClass } from "./practiceAge";
import type {
  CompleteFlashcardReviewRequest,
  CreateFlashcardRequest,
  Flashcard,
  FlashcardDeck,
  FlashcardDeckSummary,
  ImportFlashcardBatchRequest,
  LearningDifficulty,
  LearningItemStatus,
  UpdateFlashcardRequest
} from "./types";

/**
 * Flashcard page view modes.
 */
type FlashcardView = "dashboard" | "new-card" | "edit-card" | "new-deck" | "edit-deck" | "study";

/**
 * Dashboard sub-views.
 */
type FlashcardsDashboardMode = "sessions" | "cards";

/**
 * Flashcard sort modes supported by the API.
 */
type FlashcardSort = "priority" | "last-practiced-oldest" | "last-practiced-newest" | "created-newest" | "title";

/**
 * Saved learning session sort modes supported by the API.
 */
type LearningSessionSort = "priority" | "last-practiced-oldest" | "last-practiced-newest" | "created-newest" | "name";

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
  /** Whether deleting the saved session should also delete its flashcards. */
  deleteCardsWithSession: boolean;
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
  /** Tag filter. */
  tag: string;
  /** Sort mode. */
  sort: FlashcardSort;
}

/**
 * Saved learning session list filters.
 */
interface LearningSessionFilters {
  /** Text search. */
  search: string;
  /** Tag filter. */
  tag: string;
  /** Sort mode. */
  sort: LearningSessionSort;
}

/**
 * Editable imported flashcard draft.
 */
interface FlashcardImportDraft extends FlashcardForm {
  /** Stable local identifier used before the flashcard is saved. */
  id: string;
}

/**
 * Batch import saved learning session options.
 */
interface FlashcardImportSessionForm {
  /** Whether to create saved learning sessions from imported cards. */
  createLearningSessions: boolean;
  /** Base name used for automatically created saved learning sessions. */
  learningSessionName: string;
  /** Maximum number of imported cards per saved learning session. */
  learningSessionSize: string;
}

/**
 * Active study session state.
 */
interface StudySession {
  /** Deck used for the session. */
  deck: FlashcardDeck;
  /** Cards selected for this run. */
  cards: Flashcard[];
  /** Whether cards were randomized for this run. */
  isShuffled: boolean;
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
  selectedCardIds: [],
  deleteCardsWithSession: false
};

/**
 * Initial batch import saved learning session options.
 */
const emptyImportSessionForm: FlashcardImportSessionForm = {
  createLearningSessions: false,
  learningSessionName: "",
  learningSessionSize: "50"
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
 * Example JSON shown in the batch import helper panel.
 */
const flashcardImportExample = JSON.stringify(
  {
    flashcards: [
      {
        title: "Binary search invariant",
        question: "What invariant should binary search preserve?",
        explanation: "The answer stays inside the current low-high search interval.",
        source: "Basics",
        description: "Short reminder shown in the dashboard.",
        difficulty: "Easy",
        tags: ["binary-search", "invariants"]
      }
    ]
  },
  null,
  2
);

/**
 * Props accepted by the Flashcards page.
 */
interface FlashcardsPageProps {
  /** Flashcard id to open from the Overview page. */
  focusCardId?: string | null;
  /** Changes when the same focused card should be reopened. */
  focusNonce?: number | null;
  /** Called after flashcard practice changes global progress data. */
  onChanged: () => Promise<void> | void;
  /** Called after the focused card has been opened. */
  onFocusHandled?: () => void;
}

/**
 * Renders the flashcard dashboard, creation flow, and study session.
 *
 * @param props - Component props.
 * @returns The Flashcards page.
 */
export function FlashcardsPage(props: FlashcardsPageProps) {
  const [view, setView] = useState<FlashcardView>("dashboard");
  const [dashboardMode, setDashboardMode] = useState<FlashcardsDashboardMode>("sessions");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardTotalCount, setFlashcardTotalCount] = useState(0);
  const [flashcardAvailableTags, setFlashcardAvailableTags] = useState<string[]>([]);
  const [decks, setDecks] = useState<FlashcardDeckSummary[]>([]);
  const [deckTotalCount, setDeckTotalCount] = useState(0);
  const [deckAvailableTags, setDeckAvailableTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<FlashcardFilters>({
    search: "",
    status: "",
    difficulty: "",
    tag: "",
    sort: "priority"
  });
  const [deckFilters, setDeckFilters] = useState<LearningSessionFilters>({
    search: "",
    tag: "",
    sort: "last-practiced-oldest"
  });
  const [cardForm, setCardForm] = useState<FlashcardForm>(emptyFlashcardForm);
  const [deckForm, setDeckForm] = useState<FlashcardDeckForm>(emptyDeckForm);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [selectedCardLookup, setSelectedCardLookup] = useState<Record<string, Flashcard>>({});
  const [pickerCards, setPickerCards] = useState<Flashcard[]>([]);
  const [pickerTotalCount, setPickerTotalCount] = useState(0);
  const [pickerSearch, setPickerSearch] = useState("");
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const [sessionShuffleModes, setSessionShuffleModes] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [deckPage, setDeckPage] = useState(1);
  const [pickerPage, setPickerPage] = useState(1);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importDrafts, setImportDrafts] = useState<FlashcardImportDraft[]>([]);
  const [importSessionForm, setImportSessionForm] = useState<FlashcardImportSessionForm>(emptyImportSessionForm);
  const [showImportExample, setShowImportExample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedCardSearch = useDebouncedValue(filters.search, searchDebounceMs);
  const debouncedDeckSearch = useDebouncedValue(deckFilters.search, searchDebounceMs);
  const debouncedPickerSearch = useDebouncedValue(pickerSearch, searchDebounceMs);

  const flashcardPageCount = Math.max(1, Math.ceil(flashcardTotalCount / flashcardsPageSize));
  const deckPageCount = Math.max(1, Math.ceil(deckTotalCount / decksPageSize));
  const pickerPageCount = Math.max(1, Math.ceil(pickerTotalCount / deckPickerPageSize));
  const selectedPickerCards = useMemo(
    () => deckForm.selectedCardIds.map((id) => selectedCardLookup[id]).filter(Boolean),
    [deckForm.selectedCardIds, selectedCardLookup]
  );
  const visibleDueCount = useMemo(() => flashcards.filter(isDueForReview).length, [flashcards]);
  const visibleKnownRate = useMemo(() => calculateKnownRate(flashcards), [flashcards]);
  const visibleDeckRunCount = useMemo(
    () => decks.reduce((totalRuns, deck) => totalRuns + deck.totalRuns, 0),
    [decks]
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
      setFlashcardAvailableTags(response.tags);
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
        tag: deckFilters.tag,
        sort: deckFilters.sort,
        page: deckPage,
        pageSize: decksPageSize
      });
      setDecks(response.items);
      setDeckAvailableTags(response.tags);
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
        sort: "priority",
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
  }, [debouncedCardSearch, filters.status, filters.difficulty, filters.tag, filters.sort, currentPage]);

  useEffect(() => {
    void loadDecks();
  }, [debouncedDeckSearch, deckFilters.tag, deckFilters.sort, deckPage]);

  useEffect(() => {
    if (view === "new-deck" || view === "edit-deck") {
      void loadPickerCards();
    }
  }, [view, debouncedPickerSearch, pickerPage]);

  useEffect(() => {
    if (!props.focusCardId) {
      return;
    }

    async function openFocusedCard() {
      setIsSaving(true);
      setError(null);

      try {
        const flashcard = await getFlashcard(props.focusCardId!);
        setDashboardMode("cards");
        openEditCard(flashcard);
        props.onFocusHandled?.();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to open flashcard.");
      } finally {
        setIsSaving(false);
      }
    }

    void openFocusedCard();
  }, [props.focusCardId, props.focusNonce]);

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
   * Updates saved learning session filters and resets pagination.
   *
   * @param patch - Filter values to change.
   */
  function updateDeckFilters(patch: Partial<LearningSessionFilters>) {
    setDeckFilters((current) => ({ ...current, ...patch }));
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
   * Parses a JSON file into editable imported flashcard drafts.
   *
   * @param event - File input change event.
   */
  async function handleFlashcardImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImportFileName(file.name);
    setImportMessage(null);
    setError(null);

    try {
      const payload = parseFlashcardImport(await file.text());
      setImportDrafts(payload.flashcards.map((flashcard, index) => createImportDraft(flashcard, index)));
      setImportSessionForm({
        createLearningSessions: false,
        learningSessionName: createImportSessionName(file.name),
        learningSessionSize: "50"
      });
      setImportMessage(`Loaded ${formatCardCount(payload.flashcards.length)} from ${file.name}. Review before importing.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to import flashcards.");
    }
  }

  /**
   * Updates one imported flashcard draft field.
   *
   * @param draftId - Local draft identifier.
   * @param key - Field to update.
   * @param value - New field value.
   */
  function updateImportDraft<K extends keyof FlashcardForm>(
    draftId: string,
    key: K,
    value: FlashcardForm[K]
  ) {
    setImportDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? { ...draft, [key]: value } : draft))
    );
  }

  /**
   * Removes one imported flashcard draft from the review queue.
   *
   * @param draftId - Local draft identifier.
   */
  function removeImportDraft(draftId: string) {
    setImportDrafts((current) => current.filter((draft) => draft.id !== draftId));
  }

  /**
   * Clears the current import review queue.
   */
  function clearImportDrafts() {
    setImportDrafts([]);
    setImportFileName(null);
    setImportMessage(null);
    setImportSessionForm(emptyImportSessionForm);
    setError(null);
  }

  /**
   * Updates one batch import saved learning session option.
   *
   * @param key - Field to update.
   * @param value - New field value.
   */
  function updateImportSessionForm<K extends keyof FlashcardImportSessionForm>(
    key: K,
    value: FlashcardImportSessionForm[K]
  ) {
    setImportSessionForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Saves reviewed imported flashcards.
   */
  async function saveImportDrafts() {
    if (importDrafts.length === 0) {
      setError("No flashcards are ready to import.");
      return;
    }

    setIsImporting(true);
    setImportMessage(null);
    setError(null);

    try {
      const result = await importFlashcardsBatch({
        flashcards: importDrafts.map(toCreateFlashcardRequest),
        ...toImportLearningSessionRequest(importSessionForm)
      });
      setImportMessage(formatImportMessage(result.importedCount, result.createdLearningSessions.length));
      setImportDrafts([]);
      setImportSessionForm(emptyImportSessionForm);
      setCurrentPage(1);
      setDeckPage(1);
      await loadFlashcards();
      await loadDecks();
      await props.onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to import flashcards.");
    } finally {
      setIsImporting(false);
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
      await deleteFlashcardDeck(selectedDeck.id, deckForm.deleteCardsWithSession);
      await loadFlashcards();
      await loadDecks();
      await props.onChanged();
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
      const isShuffled = sessionShuffleModes[deck.id] ?? true;
      const cards = selectStudyCards(deck.cards, isShuffled);

      if (cards.length === 0) {
        setError("This saved session has no flashcards.");
        return;
      }

      setStudySession({
        deck,
        cards,
        isShuffled,
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
    <section className="flashcards-page" aria-labelledby="flashcards-title">
      <section className="flashcards-hero panel">
        <div className="flashcards-hero-copy">
          <p className="eyebrow">Flashcards</p>
          <h2 id="flashcards-title">Cards</h2>
          <p>Review cards, manage saved sessions, and keep the next repetition close to the surface.</p>
        </div>
        <div className="flashcards-hero-actions">
          <button className="secondary-button" type="button" onClick={openNewCard}>
            Add flashcard
          </button>
          <label className="secondary-button file-action-button">
            Batch import
            <input accept="application/json,.json" type="file" disabled={isImporting} onChange={handleFlashcardImport} />
          </label>
          <button className="secondary-button" type="button" onClick={() => setShowImportExample((isShown) => !isShown)}>
            JSON structure
          </button>
          <button className="secondary-button" type="button" onClick={openNewDeck} disabled={flashcardTotalCount === 0}>
            Create learning session
          </button>
        </div>
        <div className="flashcards-metric-strip" aria-label="Flashcard metrics">
          <FlashcardMetric label="Library" value={flashcardTotalCount} detail="cards" />
          <FlashcardMetric label="Due now" value={visibleDueCount} detail="visible" />
          <FlashcardMetric label="Saved sessions" value={deckTotalCount} detail="sets" />
          <FlashcardMetric label="Known rate" value={visibleKnownRate} detail="visible" />
          <FlashcardMetric label="Runs" value={visibleDeckRunCount} detail="visible sessions" />
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}
      {importMessage ? (
        <p className="success-banner">
          {importMessage}
          {importFileName ? ` File: ${importFileName}.` : ""}
        </p>
      ) : null}
      {showImportExample ? (
        <section className="panel flashcard-import-panel" aria-labelledby="flashcard-import-structure-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Batch import</p>
              <h3 id="flashcard-import-structure-title">JSON structure</h3>
            </div>
            <span className="flashcard-count-badge">max 1000 cards</span>
          </div>
          <pre>
            <code>{flashcardImportExample}</code>
          </pre>
        </section>
      ) : null}
      {importDrafts.length ? (
        <FlashcardImportReviewPanel
          drafts={importDrafts}
          fileName={importFileName}
          sessionForm={importSessionForm}
          isImporting={isImporting}
          onClear={clearImportDrafts}
          onImport={() => void saveImportDrafts()}
          onRemove={removeImportDraft}
          onSessionFormChange={updateImportSessionForm}
          onUpdate={updateImportDraft}
        />
      ) : null}

      <div className="dashboard-mode-toggle" role="tablist" aria-label="Flashcards dashboard views">
        <button
          className={dashboardMode === "sessions" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={dashboardMode === "sessions"}
          onClick={() => setDashboardMode("sessions")}
        >
          Learning sessions
        </button>
        <button
          className={dashboardMode === "cards" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={dashboardMode === "cards"}
          onClick={() => setDashboardMode("cards")}
        >
          Flashcards
        </button>
      </div>

      <div className="flashcards-dashboard-grid single-panel">
        {dashboardMode === "cards" ? (
        <section className="panel flashcard-board" aria-label="Flashcard records">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Library</p>
              <h3>Card library</h3>
            </div>
            <span className="flashcard-count-badge">{flashcardTotalCount} total</span>
          </div>

          <div className="flashcard-filter-grid" aria-label="Flashcard filters">
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

            <label>
              Sort
              <select
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value as FlashcardSort })}
              >
                <option value="priority">Priority</option>
                <option value="last-practiced-oldest">Never / oldest practiced</option>
                <option value="last-practiced-newest">Newest practiced</option>
                <option value="created-newest">Newest created</option>
                <option value="title">Title</option>
              </select>
            </label>
          </div>

          <TagFilterPanel
            availableTags={flashcardAvailableTags}
            selectedTag={filters.tag}
            emptyLabel="No card tags match this search yet."
            onSelectTag={(tag) => updateFilters({ tag })}
          />

          {isLoadingCards ? (
            <p className="empty-state">Loading flashcards...</p>
          ) : flashcards.length ? (
            <div className="flashcard-library">
              {flashcards.map((flashcard, index) => (
                <button
                  className="flashcard-record"
                  style={{ animationDelay: `${Math.min(index * 28, 220)}ms` }}
                  type="button"
                  key={flashcard.id}
                  onClick={() => openEditCard(flashcard)}
                >
                  <span className="flashcard-record-main">
                    <span className="flashcard-record-title">
                      <strong>{flashcard.title}</strong>
                      <span className={`difficulty-pill ${getDifficultyClass(flashcard.difficulty)}`}>
                        {flashcard.difficulty}
                      </span>
                    </span>
                    <small>{flashcard.source || "Personal"}</small>
                    <span className="flashcard-question-preview">{flashcard.question}</span>
                    <span className="tag-row compact">
                      {flashcard.tags.length ? flashcard.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                    </span>
                    <span className="session-membership-row">
                      {(flashcard.learningSessions ?? []).length
                        ? (flashcard.learningSessions ?? []).slice(0, 3).map((session) => (
                            <span key={session.id}>{session.name}</span>
                          ))
                        : <span>No learning sessions</span>}
                    </span>
                  </span>
                  <span className="flashcard-record-side">
                    <span className={`status-pill ${getStatusClass(flashcard.status)}`}>{formatStatus(flashcard.status)}</span>
                    <span className="flashcard-known-meter" aria-label={`${flashcard.title} known review rate`}>
                      <span style={{ width: calculateKnownRate([flashcard]) }} />
                    </span>
                    <small>
                      {flashcard.knownReviews}/{flashcard.totalReviews} known
                    </small>
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
        ) : (
        <section className="panel flashcard-session-board" aria-labelledby="flashcard-decks-title">
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
                value={deckFilters.search}
                onChange={(event) => updateDeckFilters({ search: event.target.value })}
                placeholder="session name, description, card, tag..."
              />
            </label>

            <label>
              Sort
              <select
                value={deckFilters.sort}
                onChange={(event) => updateDeckFilters({ sort: event.target.value as LearningSessionSort })}
              >
                <option value="priority">Priority</option>
                <option value="last-practiced-oldest">Never / oldest practiced</option>
                <option value="last-practiced-newest">Newest practiced</option>
                <option value="created-newest">Newest created</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <TagFilterPanel
            availableTags={deckAvailableTags}
            selectedTag={deckFilters.tag}
            emptyLabel="No learning session tags match this search yet."
            onSelectTag={(tag) => updateDeckFilters({ tag })}
          />

          {isLoadingDecks ? (
            <p className="empty-state">Loading learning sessions...</p>
          ) : decks.length ? (
            <>
              <ul className="flashcard-session-list">
                {decks.map((deck, index) => (
                  <li
                    className="flashcard-session-card"
                    style={{ animationDelay: `${Math.min(index * 36, 220)}ms` }}
                    key={deck.id}
                  >
                    <div className="flashcard-session-card-header">
                      <div>
                        <strong>{deck.name}</strong>
                        {deck.description ? <small>{deck.description}</small> : null}
                      </div>
                      <span className="flashcard-count-badge">{deck.cardCount} cards</span>
                    </div>

                    <div className="tag-row compact">
                      {deck.tags.length ? deck.tags.slice(0, 8).map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}
                    </div>

                    <div className="session-metrics" aria-label={`${deck.name} session metrics`}>
                      <span>{deck.totalRuns} runs</span>
                      <span>{deck.knownReviews}/{deck.totalReviews} known</span>
                      <span>{calculateDeckKnownRate(deck)}</span>
                    </div>

                    <div className="date-metrics">
                      <span className={`date-chip strong-date ${getPracticeAgeClass(deck.lastPracticedAt)}`}>
                        Last practiced {deck.lastPracticedAt ? formatDate(deck.lastPracticedAt) : "never"}
                      </span>
                      <span className="date-chip">
                        Next review {deck.nextReviewAt ? formatDate(deck.nextReviewAt) : "not scheduled"}
                      </span>
                    </div>

                    <div className="flashcard-session-actions">
                      <label className="checkbox-row session-shuffle-toggle">
                        <input
                          checked={sessionShuffleModes[deck.id] ?? true}
                          type="checkbox"
                          onChange={(event) =>
                            setSessionShuffleModes({ ...sessionShuffleModes, [deck.id]: event.target.checked })
                          }
                        />
                        <span>Shuffle</span>
                      </label>
                      <div className="editor-actions compact-actions">
                        <button className="secondary-button" type="button" disabled={isSaving} onClick={() => void startStudy(deck)}>
                          Start
                        </button>
                        <button className="secondary-button" type="button" disabled={isSaving} onClick={() => void openEditDeck(deck)}>
                          Edit
                        </button>
                      </div>
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
        )}
      </div>
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
 * Props accepted by the collapsible tag filter.
 */
interface TagFilterPanelProps {
  /** Tags available for the current server-backed search. */
  availableTags: string[];
  /** Currently selected tag. */
  selectedTag: string;
  /** Text shown when no tags are available. */
  emptyLabel: string;
  /** Selects a tag value. */
  onSelectTag: (tag: string) => void;
}

/**
 * Renders collapsible hashtag filters.
 *
 * @param props - Component props.
 * @returns A collapsible tag filter panel.
 */
function TagFilterPanel(props: TagFilterPanelProps) {
  return (
    <details className="collapsible-filter-panel">
      <summary>
        <span>Hashtags</span>
        {props.selectedTag ? <strong>#{props.selectedTag}</strong> : <small>{props.availableTags.length} available</small>}
      </summary>
      {props.availableTags.length ? (
        <div className="tag-filter-list" aria-label="Tag filters">
          <button
            className={!props.selectedTag ? "active" : ""}
            type="button"
            onClick={() => props.onSelectTag("")}
          >
            All tags
          </button>
          {props.availableTags.map((tag) => (
            <button
              className={props.selectedTag === tag ? "active" : ""}
              type="button"
              key={tag}
              onClick={() => props.onSelectTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-state compact-empty">{props.emptyLabel}</p>
      )}
    </details>
  );
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
 * Props accepted by a Flashcard dashboard metric.
 */
interface FlashcardMetricProps {
  /** Metric label. */
  label: string;
  /** Primary metric value. */
  value: number | string;
  /** Supporting metric detail. */
  detail: string;
}

/**
 * Renders one compact Flashcard dashboard metric.
 *
 * @param props - Component props.
 * @returns A Flashcard metric.
 */
function FlashcardMetric(props: FlashcardMetricProps) {
  return (
    <article className="flashcards-metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.detail}</small>
    </article>
  );
}

/**
 * Props accepted by the flashcard import review panel.
 */
interface FlashcardImportReviewPanelProps {
  /** Imported flashcards waiting for review. */
  drafts: FlashcardImportDraft[];
  /** Source file name. */
  fileName: string | null;
  /** Whether the import is being saved. */
  isImporting: boolean;
  /** Saved learning session options for this import. */
  sessionForm: FlashcardImportSessionForm;
  /** Clears the review queue. */
  onClear: () => void;
  /** Saves all reviewed flashcards. */
  onImport: () => void;
  /** Removes one draft. */
  onRemove: (draftId: string) => void;
  /** Updates one import saved learning session option. */
  onSessionFormChange: <K extends keyof FlashcardImportSessionForm>(
    key: K,
    value: FlashcardImportSessionForm[K]
  ) => void;
  /** Updates one draft field. */
  onUpdate: <K extends keyof FlashcardForm>(draftId: string, key: K, value: FlashcardForm[K]) => void;
}

/**
 * Renders editable flashcards parsed from a JSON file before saving them.
 *
 * @param props - Component props.
 * @returns The import review panel.
 */
function FlashcardImportReviewPanel(props: FlashcardImportReviewPanelProps) {
  return (
    <section className="panel flashcard-import-review" aria-labelledby="flashcard-import-review-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Review import</p>
          <h3 id="flashcard-import-review-title">{formatCardCount(props.drafts.length)} ready</h3>
        </div>
        <span className="flashcard-count-badge">{props.fileName ?? "JSON file"}</span>
      </div>

      <div className="flashcard-import-review-actions">
        <button className="primary-button" type="button" disabled={props.isImporting} onClick={props.onImport}>
          {props.isImporting ? "Importing..." : "Import reviewed flashcards"}
        </button>
        <button className="secondary-button" type="button" disabled={props.isImporting} onClick={props.onClear}>
          Clear import
        </button>
      </div>

      <div className="flashcard-import-session-options">
        <label className="checkbox-row">
          <input
            checked={props.sessionForm.createLearningSessions}
            type="checkbox"
            disabled={props.isImporting}
            onChange={(event) => props.onSessionFormChange("createLearningSessions", event.target.checked)}
          />
          <span>Create learning session from this import</span>
        </label>

        {props.sessionForm.createLearningSessions ? (
          <div className="form-grid two-columns">
            <label>
              Session name
              <input
                value={props.sessionForm.learningSessionName}
                disabled={props.isImporting}
                onChange={(event) => props.onSessionFormChange("learningSessionName", event.target.value)}
                placeholder="Imported flashcards"
              />
            </label>

            <label>
              Cards per session
              <input
                min="1"
                max="200"
                type="number"
                value={props.sessionForm.learningSessionSize}
                disabled={props.isImporting}
                onChange={(event) => props.onSessionFormChange("learningSessionSize", event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="flashcard-import-draft-list">
        {props.drafts.map((draft, index) => (
          <article className="flashcard-import-draft" key={draft.id}>
            <div className="flashcard-import-draft-heading">
              <strong>
                {index + 1}. {draft.title || "Untitled flashcard"}
              </strong>
              <button
                className="danger-button"
                type="button"
                disabled={props.isImporting}
                onClick={() => props.onRemove(draft.id)}
              >
                Remove
              </button>
            </div>

            <div className="form-grid two-columns">
              <label>
                Title
                <input
                  value={draft.title}
                  onChange={(event) => props.onUpdate(draft.id, "title", event.target.value)}
                  placeholder="Flashcard title"
                />
              </label>

              <label>
                Difficulty
                <select
                  value={draft.difficulty}
                  onChange={(event) => props.onUpdate(draft.id, "difficulty", event.target.value as LearningDifficulty)}
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
              Question
              <textarea
                className="medium-textarea expanding-textarea"
                value={draft.question}
                onChange={(event) => props.onUpdate(draft.id, "question", event.target.value)}
                placeholder="Question shown on the front side"
              />
            </label>

            <label>
              Explanation
              <textarea
                className="medium-textarea expanding-textarea"
                value={draft.explanation}
                onChange={(event) => props.onUpdate(draft.id, "explanation", event.target.value)}
                placeholder="Explanation shown after flipping"
              />
            </label>

            <div className="form-grid two-columns">
              <label>
                Source
                <input
                  value={draft.source}
                  onChange={(event) => props.onUpdate(draft.id, "source", event.target.value)}
                  placeholder="Book, course, article..."
                />
              </label>

              <label>
                Tags
                <input
                  value={draft.tagsText}
                  onChange={(event) => props.onUpdate(draft.id, "tagsText", event.target.value)}
                  placeholder="tag-one, tag-two"
                />
              </label>
            </div>

            <label>
              Description
              <textarea
                className="medium-textarea expanding-textarea"
                value={draft.description}
                onChange={(event) => props.onUpdate(draft.id, "description", event.target.value)}
                placeholder="Optional short dashboard reminder"
              />
            </label>
          </article>
        ))}
      </div>
    </section>
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
      <label>
        Session name
        <input
          value={props.form.name}
          onChange={(event) => props.onChange("name", event.target.value)}
          placeholder="System Design fundamentals"
        />
      </label>

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
                  <small>{formatFlashcardPickerMeta(flashcard)}</small>
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
          <div className="delete-session-options">
            <label className="checkbox-row">
              <input
                checked={props.form.deleteCardsWithSession}
                type="checkbox"
                onChange={(event) => props.onChange("deleteCardsWithSession", event.target.checked)}
              />
              <span>Also delete the flashcards in this session</span>
            </label>
            <button className="danger-button" type="button" onClick={props.onDelete} disabled={props.isSaving}>
              Delete
            </button>
          </div>
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
  const progress = ((props.session.index + 1) / props.session.cards.length) * 100;
  const knownCount = props.session.reviews.filter((review) => review.knewAnswer).length;

  return (
    <section className="flashcard-study-shell" aria-labelledby="flashcard-study-title">
      <div className="flashcard-study-topbar">
        <PageHeading title={props.session.deck.name} onBack={props.onBack} />
        <div className="study-progress" aria-label="Study progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className="panel flashcard-study-panel">
        <div className="flashcard-study-meta">
          <div>
            <p className="eyebrow">
              Card {props.session.index + 1}/{props.session.cards.length} ·{" "}
              {props.session.isShuffled ? "Shuffled" : "In order"}
            </p>
            <h3 id="flashcard-study-title">{card.title}</h3>
          </div>
          <div className="study-score-strip" aria-label="Current session score">
            <span>{knownCount} known</span>
            <span>{props.session.reviews.length - knownCount} missed</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <button
          aria-pressed={props.session.isFlipped}
          className={props.session.isFlipped ? "flashcard-card is-flipped" : "flashcard-card"}
          type="button"
          onClick={props.onFlip}
        >
          <span className="flashcard-card-inner">
            <span className="flashcard-card-face flashcard-card-front">
              <span>Question</span>
              <strong>{card.question}</strong>
            </span>
            <span className="flashcard-card-face flashcard-card-back">
              <span>Explanation</span>
              <strong>{card.explanation}</strong>
            </span>
          </span>
        </button>

        <div className="flashcard-study-actions">
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
    selectedCardIds: deck.cards.map((card) => card.id),
    deleteCardsWithSession: false
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
 * Creates an editable import draft from a normalized flashcard request.
 *
 * @param flashcard - Normalized imported flashcard.
 * @param index - Zero-based import index.
 * @returns Editable import draft.
 */
function createImportDraft(flashcard: CreateFlashcardRequest, index: number): FlashcardImportDraft {
  return {
    id: `import-${Date.now()}-${index}`,
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
 * Converts import saved learning session options into an API request patch.
 *
 * @param form - Import saved learning session options.
 * @returns Import request session fields.
 */
function toImportLearningSessionRequest(form: FlashcardImportSessionForm) {
  const sessionSize = Number(form.learningSessionSize);

  return {
    createLearningSessions: form.createLearningSessions,
    learningSessionName: form.learningSessionName.trim(),
    learningSessionSize: Number.isFinite(sessionSize) ? sessionSize : 50
  };
}

/**
 * Parses a flashcard batch import file.
 *
 * @param contents - Raw JSON file contents.
 * @returns A normalized batch import request.
 */
function parseFlashcardImport(contents: string): ImportFlashcardBatchRequest {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("Import file must contain valid JSON.");
  }

  const rawCards = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.flashcards)
      ? parsed.flashcards
      : null;

  if (!rawCards) {
    throw new Error("JSON must be an array of flashcards or an object with a flashcards array.");
  }

  if (rawCards.length === 0) {
    throw new Error("Import file must include at least one flashcard.");
  }

  return {
    flashcards: rawCards.map((card, index) => normalizeImportedFlashcard(card, index + 1))
  };
}

/**
 * Normalizes one imported flashcard.
 *
 * @param value - Raw parsed JSON value.
 * @param index - One-based item index.
 * @returns A create-flashcard request.
 */
function normalizeImportedFlashcard(value: unknown, index: number): CreateFlashcardRequest {
  if (!isRecord(value)) {
    throw new Error(`Flashcard ${index} must be a JSON object.`);
  }

  return {
    title: readRequiredImportString(value, "title", index),
    question: readRequiredImportString(value, "question", index),
    explanation: readRequiredImportString(value, "explanation", index),
    source: readOptionalImportString(value.source),
    description: readOptionalImportString(value.description),
    difficulty: readImportDifficulty(value.difficulty, index),
    tags: readImportTags(value.tags, index)
  };
}

/**
 * Reads a required string from an imported flashcard.
 *
 * @param value - Imported flashcard object.
 * @param field - Field name to read.
 * @param index - One-based item index.
 * @returns The trimmed string value.
 */
function readRequiredImportString(value: Record<string, unknown>, field: string, index: number) {
  const fieldValue = value[field];

  if (typeof fieldValue !== "string" || !fieldValue.trim()) {
    throw new Error(`Flashcard ${index} requires a non-empty ${field} field.`);
  }

  return fieldValue.trim();
}

/**
 * Reads an optional string from an imported flashcard.
 *
 * @param value - Imported value.
 * @returns The trimmed string or an empty string.
 */
function readOptionalImportString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads the difficulty from an imported flashcard.
 *
 * @param value - Imported difficulty value.
 * @param index - One-based item index.
 * @returns The normalized difficulty.
 */
function readImportDifficulty(value: unknown, index: number): LearningDifficulty {
  if (value === undefined || value === null || value === "") {
    return "Unknown";
  }

  if (typeof value === "string" && difficulties.includes(value as LearningDifficulty)) {
    return value as LearningDifficulty;
  }

  throw new Error(`Flashcard ${index} difficulty must be Unknown, Easy, Medium, or Hard.`);
}

/**
 * Reads tags from an imported flashcard.
 *
 * @param value - Imported tag value.
 * @param index - One-based item index.
 * @returns The normalized tag names.
 */
function readImportTags(value: unknown, index: number) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) {
    throw new Error(`Flashcard ${index} tags must be an array of strings.`);
  }

  return value.map((tag) => tag.trim()).filter(Boolean);
}

/**
 * Returns whether a parsed JSON value is an object.
 *
 * @param value - Parsed JSON value.
 * @returns True when the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Formats a batch import result message.
 *
 * @param importedCount - Number of imported cards.
 * @returns A friendly import message.
 */
function formatImportMessage(importedCount: number, createdLearningSessionCount: number) {
  const sessionMessage =
    createdLearningSessionCount === 0
      ? ""
      : ` Created ${createdLearningSessionCount === 1 ? "1 learning session" : `${createdLearningSessionCount} learning sessions`}.`;

  return `Imported ${formatCardCount(importedCount)}.${sessionMessage}`;
}

/**
 * Formats a flashcard count.
 *
 * @param count - Number of flashcards.
 * @returns Human-readable flashcard count.
 */
function formatCardCount(count: number) {
  return count === 1 ? "1 flashcard" : `${count} flashcards`;
}

/**
 * Selects a subset for one study run.
 *
 * @param cards - Available deck cards.
 * @param isShuffled - Whether the selected cards should be randomized.
 * @returns Selected cards for this run.
 */
function selectStudyCards(cards: Flashcard[], isShuffled: boolean) {
  return isShuffled ? shuffleFlashcards(cards) : [...cards];
}

/**
 * Creates a default saved learning session name from an import file name.
 *
 * @param fileName - Selected import file name.
 * @returns A readable session name.
 */
function createImportSessionName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "").trim();

  return withoutExtension ? `Imported ${withoutExtension}` : "Imported flashcards";
}

/**
 * Formats priority metadata for cards in the learning session picker.
 *
 * @param flashcard - Flashcard to summarize.
 * @returns Compact priority detail.
 */
function formatFlashcardPickerMeta(flashcard: Flashcard) {
  if (isDueForReview(flashcard) && flashcard.nextReviewAt) {
    return `Due ${formatDate(flashcard.nextReviewAt)}`;
  }

  if (!flashcard.lastPracticedAt) {
    return "New card";
  }

  return flashcard.confidence ? `Confidence ${flashcard.confidence}/5` : "Needs signal";
}

/**
 * Randomizes flashcards using the Fisher-Yates shuffle.
 *
 * @param cards - Cards to randomize.
 * @returns A shuffled copy of the cards.
 */
function shuffleFlashcards(cards: Flashcard[]) {
  const shuffledCards = [...cards];

  for (let index = shuffledCards.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledCards[index], shuffledCards[swapIndex]] = [shuffledCards[swapIndex], shuffledCards[index]];
  }

  return shuffledCards;
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
 * Returns whether a flashcard is due for review.
 *
 * @param flashcard - Flashcard to inspect.
 * @returns True when the card has a due review date in the past.
 */
function isDueForReview(flashcard: Flashcard) {
  return flashcard.nextReviewAt ? new Date(flashcard.nextReviewAt).getTime() <= Date.now() : false;
}

/**
 * Calculates a formatted known-answer rate for flashcards.
 *
 * @param flashcards - Flashcards to summarize.
 * @returns A percentage string.
 */
function calculateKnownRate(flashcards: Flashcard[]) {
  const totalReviews = flashcards.reduce((total, flashcard) => total + flashcard.totalReviews, 0);

  if (totalReviews === 0) {
    return "0%";
  }

  const knownReviews = flashcards.reduce((total, flashcard) => total + flashcard.knownReviews, 0);

  return `${Math.round((knownReviews / totalReviews) * 100)}%`;
}

/**
 * Calculates a formatted known-answer rate for one saved learning session.
 *
 * @param deck - Saved learning session summary.
 * @returns A percentage string.
 */
function calculateDeckKnownRate(deck: FlashcardDeckSummary) {
  return deck.totalReviews === 0 ? "0%" : `${Math.round((deck.knownReviews / deck.totalReviews) * 100)}%`;
}

/**
 * Gets the CSS class for a learning item status.
 *
 * @param status - Learning item status.
 * @returns CSS class suffix.
 */
function getStatusClass(status: LearningItemStatus) {
  return `status-${status.toLowerCase()}`;
}

/**
 * Gets the CSS class for a learning difficulty.
 *
 * @param difficulty - Learning difficulty.
 * @returns CSS class suffix.
 */
function getDifficultyClass(difficulty: LearningDifficulty) {
  return `difficulty-${difficulty.toLowerCase()}`;
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
