import { Check, Circle, ClipboardList, Code2, Flag, X } from "lucide-react";
import type { DsaInterviewReview } from "./types";

type CheckKey = { [K in keyof DsaInterviewReview]: DsaInterviewReview[K] extends boolean ? K : never }[keyof DsaInterviewReview];
type RatingKey = Exclude<keyof DsaInterviewReview, CheckKey>;
const stages: { title: string; icon: typeof Check; items: { key: CheckKey; label: string }[] }[] = [
  { title: "Before coding", icon: ClipboardList, items: [
    { key: "restatedProblem", label: "Restated the problem in my own words" },
    { key: "askedConstraints", label: "Asked about input constraints and edge cases" },
    { key: "discussedApproaches", label: "Discussed at least two approaches" },
    { key: "statedComplexity", label: "Stated time and space complexity of the chosen approach" },
    { key: "receivedGoAhead", label: "Got the go-ahead before coding" }
  ] },
  { title: "During coding", icon: Code2, items: [
    { key: "talkedThroughCode", label: "Talked through what I was writing" },
    { key: "meaningfulNames", label: "Used meaningful variable names" },
    { key: "cleanModularCode", label: "Wrote modular, clean code" },
    { key: "handledEdgeCases", label: "Handled edge cases (empty input, single element, etc.)" }
  ] },
  { title: "After coding", icon: Flag, items: [
    { key: "walkedThroughExample", label: "Walked through the code with an example" },
    { key: "testedEdgeCases", label: "Tested edge cases manually" },
    { key: "fixedBugs", label: "Identified and fixed bugs" },
    { key: "discussedOptimizations", label: "Discussed potential optimizations" }
  ] }
];
const ratings: { key: RatingKey; label: string }[] = [
  { key: "problemSolving", label: "Problem solving" }, { key: "communication", label: "Communication" },
  { key: "speed", label: "Speed" }, { key: "dsa", label: "DSA" }, { key: "coding", label: "Coding" }
];
export const emptyDsaInterviewReview: DsaInterviewReview = {
  restatedProblem: false, askedConstraints: false, discussedApproaches: false, statedComplexity: false,
  receivedGoAhead: false, talkedThroughCode: false, meaningfulNames: false, cleanModularCode: false,
  handledEdgeCases: false, walkedThroughExample: false, testedEdgeCases: false, fixedBugs: false,
  discussedOptimizations: false, problemSolving: null, communication: null, speed: null, dsa: null, coding: null
};

/** One shared definition drives editing and the read-only history, without guessing legacy values. */
export function DsaInterviewScorecard({ value, onChange }: { value: DsaInterviewReview; onChange?: (value: DsaInterviewReview) => void }) {
  const completed = stages.flatMap(stage => stage.items).filter(item => value[item.key]).length;
  return <section className={`interview-scorecard${onChange ? "" : " readonly"}`} aria-label="Interview scorecard">
    <header className="interview-scorecard-heading">
      <div><p className="eyebrow">Interview practice</p><h4>{onChange ? "Interview scorecard" : "Saved interview scorecard"}</h4>
        <p>{onChange ? "Track your process. Your checklist and optional ratings are saved with this attempt." : "Review completed checkpoints and the steps to practise next."}</p></div>
      <span className="interview-completion" aria-live="polite"><strong>{completed}<small>/13</small></strong><span>checkpoints completed</span></span>
    </header>
    <div className="interview-stages">
      {stages.map(stage => {
        const count = stage.items.filter(item => value[item.key]).length;
        return <fieldset key={stage.title} className="interview-stage">
          <legend><stage.icon size={18} aria-hidden="true" />{stage.title}<small>{count}/{stage.items.length}</small></legend>
          <progress value={count} max={stage.items.length} aria-label={`${stage.title} checkpoints`} />
          {stage.items.map(item => onChange ? <label className={`interview-check${value[item.key] ? " done" : ""}`} key={item.key}>
            <input type="checkbox" checked={value[item.key]} onChange={event => onChange({ ...value, [item.key]: event.target.checked })} />
            <span className="interview-check-icon" aria-hidden="true"><Check size={15} /></span><span>{item.label}</span>
          </label> : <div className={`interview-check${value[item.key] ? " done" : ""}`} key={item.key}>
            {value[item.key] ? <Check size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}
            <span><span className="sr-only">{value[item.key] ? "Completed: " : "To practise: "}</span>{item.label}</span>
          </div>)}
        </fieldset>;
      })}
    </div>
    <div className="interview-ratings">
      <div><strong>Skill review <small>Optional</small></strong><p>1 · Needs work &nbsp; 2 · Developing &nbsp; 3 · Solid &nbsp; 4 · Strong &nbsp; 5 · Excellent</p></div>
      <div className="interview-rating-grid">{ratings.map(rating => <div key={rating.key} className="interview-rating">
        <strong>{rating.label}</strong>
        {onChange ? <div role="group" aria-label={`${rating.label} rating`} className="interview-rating-options">
          {[1, 2, 3, 4, 5].map(score => <button type="button" key={score} aria-label={`${rating.label}: ${score} of 5`}
            aria-pressed={value[rating.key] === score} onClick={() => onChange({ ...value, [rating.key]: value[rating.key] === score ? null : score })}>{score}</button>)}
          <button type="button" aria-label={`Clear ${rating.label.toLowerCase()} rating`} disabled={value[rating.key] == null}
            onClick={() => onChange({ ...value, [rating.key]: null })}><X size={15} /></button>
        </div> : <span>{value[rating.key] == null ? "Not rated" : `${value[rating.key]} / 5`}</span>}
      </div>)}</div>
    </div>
  </section>;
}
