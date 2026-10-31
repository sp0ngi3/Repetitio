import { Plus, Trash2 } from "lucide-react";

export interface DraftOption { key: string; text: string; isCorrect: boolean; }
export interface DraftQuestion { key: string; prompt: string; explanation: string; options: DraftOption[]; }
export interface DraftCard { key: string; front: string; back: string; }
export const blankOption = (): DraftOption => ({ key: crypto.randomUUID(), text: "", isCorrect: false });

export function WikiQuestionFields({ question, onChange }: { question: DraftQuestion; onChange: (change: Partial<DraftQuestion>) => void }) {
  return <>
    <label>Question<textarea required rows={3} value={question.prompt} onChange={event => onChange({ prompt: event.target.value })} /></label>
    <div className="wiki-check-edit-options">
      {question.options.map((option, index) => <div className="wiki-check-edit-option" key={option.key}>
        <label className="wiki-check-edit-correct"><input type="checkbox" aria-label={`Correct answer ${index + 1}`} checked={option.isCorrect}
          onChange={event => onChange({ options: question.options.map(candidate => candidate.key === option.key ? { ...candidate, isCorrect: event.target.checked } : candidate) })} />Correct</label>
        <label>Answer {index + 1}<textarea required rows={2} value={option.text}
          onChange={event => onChange({ options: question.options.map(candidate => candidate.key === option.key ? { ...candidate, text: event.target.value } : candidate) })} /></label>
        <button className="secondary-button compact-button" type="button" aria-label={`Remove answer ${index + 1}`} title={`Remove answer ${index + 1}`}
          disabled={question.options.length <= 2} onClick={() => onChange({ options: question.options.filter(candidate => candidate.key !== option.key) })}><Trash2 size={16} /></button>
      </div>)}
    </div>
    <div className="wiki-check-edit-option-actions"><button className="secondary-button compact-button" type="button" disabled={question.options.length >= 8}
      onClick={() => onChange({ options: [...question.options, blankOption()] })}><Plus size={16} /> Add answer</button>
      <small>2–8 answers. Mark each correct answer.</small></div>
    <label>Explanation (optional)<textarea rows={3} value={question.explanation} onChange={event => onChange({ explanation: event.target.value })} /></label>
  </>;
}

export function WikiFlashcardFields({ card, onChange }: { card: DraftCard; onChange: (change: Partial<DraftCard>) => void }) {
  return <>
    <label>Front<textarea required rows={3} value={card.front} onChange={event => onChange({ front: event.target.value })} /></label>
    <label>Back<textarea required rows={5} value={card.back} onChange={event => onChange({ back: event.target.value })} /></label>
  </>;
}
