import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Save, Trash2, Undo2, X } from "lucide-react";
import { updateWikiPractice } from "./api";
import type { WikiPage } from "./types";

interface DraftOption { key: string; text: string; isCorrect: boolean; }
interface DraftQuestion { key: string; prompt: string; explanation: string; options: DraftOption[]; }
interface DraftCard { key: string; front: string; back: string; }
type RemovedCheck = { kind: "quiz"; item: DraftQuestion; index: number } | { kind: "flashcard"; item: DraftCard; index: number };
const blankOption = (): DraftOption => ({ key: crypto.randomUUID(), text: "", isCorrect: false });

export function WikiPracticeEditor({ page, onSaved, onClose }: {
  page: WikiPage; onSaved: (page: WikiPage) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const [initial] = useState(() => ({
    questions: page.quizQuestions.map(question => ({ key: question.id, prompt: question.prompt,
      explanation: question.explanation ?? "", options: question.options.map(option => ({
        key: option.id, text: option.text, isCorrect: option.isCorrect
      })) })),
    cards: page.flashcards.map(card => ({ key: card.id, front: card.front, back: card.back }))
  }));
  const [questions, setQuestions] = useState<DraftQuestion[]>(initial.questions);
  const [cards, setCards] = useState<DraftCard[]>(initial.cards);
  const [removed, setRemoved] = useState<RemovedCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify({ questions, cards }) !== JSON.stringify(initial);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (error) { errorMessage.current?.focus(); errorMessage.current?.scrollIntoView?.({ block: "nearest" }); }
  }, [error]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function close() {
    if (!busy && (!dirty || window.confirm("Discard the quiz and flashcard changes that have not been saved?"))) onClose();
  }
  function changeQuestion(key: string, change: Partial<DraftQuestion>) {
    setQuestions(current => current.map(question => question.key === key ? { ...question, ...change } : question));
  }
  function changeCard(key: string, change: Partial<DraftCard>) {
    setCards(current => current.map(card => card.key === key ? { ...card, ...change } : card));
  }
  function undoRemoval() {
    if (!removed) return;
    if (removed.kind === "quiz") setQuestions(current => [...current.slice(0, removed.index), removed.item, ...current.slice(removed.index)]);
    else setCards(current => [...current.slice(0, removed.index), removed.item, ...current.slice(removed.index)]);
    setRemoved(null);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !dirty) return;
    const invalid = questions.findIndex(question => !question.options.some(option => option.isCorrect));
    if (invalid >= 0) { setError(`Question ${invalid + 1}: mark at least one answer as correct.`); return; }
    setBusy(true); setError(null);
    try {
      const updated = await updateWikiPractice(page.id, {
        expectedUpdatedAt: page.updatedAt,
        quizQuestions: questions.map(question => ({ prompt: question.prompt, explanation: question.explanation,
          options: question.options.map(option => ({ text: option.text, isCorrect: option.isCorrect })) })),
        flashcards: cards.map(card => ({ front: card.front, back: card.back }))
      });
      onSaved(updated);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save. Your draft has been retained.");
      setBusy(false);
    }
  }

  return createPortal(<dialog ref={dialog} className="wiki-practice-editor-dialog" aria-labelledby="wiki-practice-editor-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <form onSubmit={save}>
      <header className="wiki-practice-editor-heading">
        <div><h2 id="wiki-practice-editor-title">Edit quizzes &amp; flashcards</h2><p>{page.title}</p></div>
        <button className="secondary-button compact-button" type="button" aria-label="Close practice editor" disabled={busy} onClick={close}><X size={18} /></button>
      </header>
      <div className="wiki-practice-editor-body">
        <p className="wiki-field-hint">Edit the fields below, then save. Changed checks can be practiced again; past study sessions stay saved.</p>
        {error ? <p className="error-banner" role="alert" tabIndex={-1} ref={errorMessage}>{error}</p> : null}
        {removed ? <div className="wiki-practice-editor-undo" role="status">Removed from this draft.
          <button className="text-button" type="button" disabled={busy} onClick={undoRemoval}><Undo2 size={15} /> Undo removal</button>
        </div> : null}
        <fieldset className="wiki-practice-editor-fields" disabled={busy}>
          <section aria-labelledby="wiki-edit-quiz-heading">
            <div className="wiki-practice-editor-section-heading"><h3 id="wiki-edit-quiz-heading">Quiz questions ({questions.length})</h3>
              <button className="secondary-button compact-button" type="button" onClick={() => setQuestions(current => [...current, {
                key: crypto.randomUUID(), prompt: "", explanation: "", options: [blankOption(), blankOption()]
              }])}><Plus size={16} /> Add question</button>
            </div>
            {!questions.length ? <p className="empty-state">No quiz questions yet. Add your first question.</p> : null}
            {questions.map((question, index) => <fieldset className="wiki-check-edit-card" key={question.key}>
              <legend>Question {index + 1}</legend>
              <label>Question<textarea required maxLength={4000} rows={2} value={question.prompt} onChange={event => changeQuestion(question.key, { prompt: event.target.value })} /></label>
              <div className="wiki-check-edit-options">
                {question.options.map((option, optionIndex) => <div className="wiki-check-edit-option" key={option.key}>
                  <label className="wiki-check-edit-correct"><input type="checkbox" aria-label={`Correct answer ${optionIndex + 1}`} checked={option.isCorrect}
                    onChange={event => changeQuestion(question.key, { options: question.options.map(candidate => candidate.key === option.key ? { ...candidate, isCorrect: event.target.checked } : candidate) })} />
                    Correct
                  </label>
                  <label>Answer {optionIndex + 1}<textarea required maxLength={2000} rows={2} value={option.text}
                    onChange={event => changeQuestion(question.key, { options: question.options.map(candidate => candidate.key === option.key ? { ...candidate, text: event.target.value } : candidate) })} /></label>
                  <button className="secondary-button compact-button" type="button" aria-label={`Remove answer ${optionIndex + 1}`} disabled={question.options.length <= 2}
                    onClick={() => changeQuestion(question.key, { options: question.options.filter(candidate => candidate.key !== option.key) })}><Trash2 size={16} /></button>
                </div>)}
              </div>
              <div className="wiki-check-edit-option-actions"><button className="secondary-button compact-button" type="button" disabled={question.options.length >= 8}
                onClick={() => changeQuestion(question.key, { options: [...question.options, blankOption()] })}><Plus size={16} /> Add answer</button>
                <small>2–8 answers. Mark each correct answer.</small></div>
              <label>Explanation (optional)<textarea maxLength={4000} rows={2} value={question.explanation} onChange={event => changeQuestion(question.key, { explanation: event.target.value })} /></label>
              <button className="danger-button compact-button" type="button" onClick={() => {
                setRemoved({ kind: "quiz", item: question, index }); setQuestions(current => current.filter(candidate => candidate.key !== question.key));
              }}><Trash2 size={16} /> Remove question {index + 1}</button>
            </fieldset>)}
          </section>
          <section aria-labelledby="wiki-edit-cards-heading">
            <div className="wiki-practice-editor-section-heading"><h3 id="wiki-edit-cards-heading">Flashcards ({cards.length})</h3>
              <button className="secondary-button compact-button" type="button" onClick={() => setCards(current => [...current, { key: crypto.randomUUID(), front: "", back: "" }])}><Plus size={16} /> Add flashcard</button>
            </div>
            {!cards.length ? <p className="empty-state">No flashcards yet. Add your first flashcard.</p> : null}
            {cards.map((card, index) => <fieldset className="wiki-check-edit-card" key={card.key}>
              <legend>Flashcard {index + 1}</legend>
              <label>Front<textarea required maxLength={4000} rows={2} value={card.front} onChange={event => changeCard(card.key, { front: event.target.value })} /></label>
              <label>Back<textarea required maxLength={8000} rows={3} value={card.back} onChange={event => changeCard(card.key, { back: event.target.value })} /></label>
              <button className="danger-button compact-button" type="button" onClick={() => {
                setRemoved({ kind: "flashcard", item: card, index }); setCards(current => current.filter(candidate => candidate.key !== card.key));
              }}><Trash2 size={16} /> Remove flashcard {index + 1}</button>
            </fieldset>)}
          </section>
        </fieldset>
      </div>
      <footer className="wiki-practice-editor-footer">
        <span>{questions.length} questions · {cards.length} flashcards{dirty ? " · Unsaved changes" : ""}</span>
        <div><button className="secondary-button compact-button" type="button" disabled={busy} onClick={close}>Cancel</button>
          <button className="primary-button compact-button" type="submit" disabled={busy || !dirty}><Save size={16} /> {busy ? "Saving..." : "Save changes"}</button></div>
      </footer>
    </form>
  </dialog>, document.body);
}
