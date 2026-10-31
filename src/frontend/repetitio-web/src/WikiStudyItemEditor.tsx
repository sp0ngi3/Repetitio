import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Save, Trash2, X } from "lucide-react";
import { changeWikiPracticeItem, getWikiPage } from "./api";
import { WikiQuestionFields, WikiFlashcardFields, type DraftQuestion, type DraftCard } from "./WikiCheckFields";
import type { WikiPage } from "./types";
import type { WikiStudyItem } from "./WikiLearning";

export function WikiStudyItemEditor({ item, deleting, onSaved, onClose }: {
  item: WikiStudyItem; deleting: boolean;
  onSaved: (page: WikiPage, replacementItemId: string | null) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState<WikiPage | null>(null);
  const [question, setQuestion] = useState<DraftQuestion | null>(null);
  const [card, setCard] = useState<DraftCard | null>(null);
  const initial = useRef("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = !!initial.current && JSON.stringify({ question, card }) !== initial.current;
  const title = `${deleting ? "Delete" : "Edit"} ${item.type === "quiz" ? "question" : "flashcard"}`;
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let active = true;
    void getWikiPage(item.pageId).then(fresh => {
      if (!active) return;
      const quiz = fresh.quizQuestions.find(check => check.id === item.id);
      const flashcard = fresh.flashcards.find(check => check.id === item.id);
      if (item.type === "quiz" ? !quiz : !flashcard) throw new Error("This check has changed or was removed. Close this dialog and reopen the study session to load the latest material.");
      const question = quiz ? { key: quiz.id, prompt: quiz.prompt, explanation: quiz.explanation ?? "",
        options: quiz.options.map(option => ({ key: option.id, text: option.text, isCorrect: option.isCorrect })) } : null;
      const card = flashcard ? { key: flashcard.id, front: flashcard.front, back: flashcard.back } : null;
      initial.current = JSON.stringify({ question, card });
      setQuestion(question); setCard(card); setPage(fresh);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load this check."); });
    return () => { active = false; };
  }, [item.id, item.pageId, item.type]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function close() {
    if (!busy && (!dirty || window.confirm("Discard the changes to this check?"))) onClose();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!page || busy || !deleting && !dirty) return;
    if (!deleting && question && !question.options.some(option => option.isCorrect)) { setError("Mark at least one answer as correct."); return; }
    setBusy(true); setError(null);
    try {
      const result = await changeWikiPracticeItem(item.pageId, item.type, item.id, { expectedUpdatedAt: page.updatedAt, delete: deleting,
        ...(!deleting && question ? { question: { prompt: question.prompt, explanation: question.explanation,
          options: question.options.map(option => ({ text: option.text, isCorrect: option.isCorrect })) } } : {}),
        ...(!deleting && card ? { flashcard: { front: card.front, back: card.back } } : {}) });
      onSaved(result.page, result.replacementItemId);
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save. Your draft is still here."); setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} className="wiki-practice-editor-dialog wiki-single-check-dialog" aria-labelledby="wiki-single-check-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <form onSubmit={save}>
      <header className="wiki-practice-editor-heading"><div><h2 id="wiki-single-check-title">{title}</h2><p>{item.pageTitle}</p></div>
        <button type="button" className="secondary-button compact-button" aria-label="Close check editor" title="Close" disabled={busy} onClick={close}><X size={18} /></button></header>
      <div className="wiki-practice-editor-body">
        {error ? <p role="alert" className="error-banner">{error}</p> : null}
        {!page && !error ? <p role="status">Loading check...</p> : null}
        {deleting ? <><p>This permanently removes this {item.type === "quiz" ? "question and its answer choices" : "flashcard"} from <strong>{item.pageTitle}</strong>, including future study sessions.</p>
          <blockquote className="wiki-delete-check-preview">{item.type === "quiz" ? item.question.prompt : item.flashcard.front}</blockquote>
          <p>The article, images, other checks, and past study history will be kept.</p></> :
          <fieldset className="wiki-practice-editor-fields" disabled={busy || !page}>
            {question ? <WikiQuestionFields question={question} onChange={change => setQuestion(current => current ? { ...current, ...change } : current)} /> : null}
            {card ? <WikiFlashcardFields card={card} onChange={change => setCard(current => current ? { ...current, ...change } : current)} /> : null}
          </fieldset>}
      </div>
      <footer className="wiki-practice-editor-footer"><span>{deleting ? "Permanent deletion" : dirty ? "Unsaved changes" : ""}</span><div>
        <button className="secondary-button" type="button" disabled={busy} onClick={close}>Cancel</button>
        <button className={deleting ? "danger-button" : "primary-button"} type="submit" disabled={!page || busy || !deleting && !dirty}>
          {deleting ? <Trash2 size={16} /> : <Save size={16} />}{busy ? "Saving..." : deleting ? "Delete permanently" : "Save changes"}</button>
      </div></footer>
    </form>
  </dialog>, document.body);
}
