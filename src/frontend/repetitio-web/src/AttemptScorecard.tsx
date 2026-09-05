/**
 * Structured interview attempt checklist.
 */
export interface AttemptScorecardValue {
  /** Whether requirements were clarified during the attempt. */
  clarifiedRequirements: boolean;
  /** Whether edge cases were found during the attempt. */
  foundEdgeCases: boolean;
  /** Whether complexity was explained during the attempt. */
  explainedComplexity: boolean;
  /** Whether the solution was tested during the attempt. */
  testedSolution: boolean;
  /** Whether tradeoffs were communicated during the attempt. */
  communicatedTradeoffs: boolean;
}

/**
 * Empty scorecard values for a new attempt.
 */
export const emptyAttemptScorecard: AttemptScorecardValue = {
  clarifiedRequirements: false,
  foundEdgeCases: false,
  explainedComplexity: false,
  testedSolution: false,
  communicatedTradeoffs: false
};

const scorecardOptions: Array<{ key: keyof AttemptScorecardValue; label: string }> = [
  { key: "clarifiedRequirements", label: "Clarified requirements" },
  { key: "foundEdgeCases", label: "Found edge cases" },
  { key: "explainedComplexity", label: "Explained complexity" },
  { key: "testedSolution", label: "Tested solution" },
  { key: "communicatedTradeoffs", label: "Communicated tradeoffs" }
];

/**
 * Props accepted by the attempt scorecard input.
 */
interface AttemptScorecardProps {
  /** Current scorecard values. */
  value: AttemptScorecardValue;
  /** Updates one scorecard field. */
  onChange: (key: keyof AttemptScorecardValue, value: boolean) => void;
}

/**
 * Renders the structured attempt scorecard.
 *
 * @param props - Component props.
 * @returns Scorecard checkbox group.
 */
export function AttemptScorecard(props: AttemptScorecardProps) {
  return (
    <fieldset className="scorecard-fieldset">
      <legend>Attempt scorecard</legend>
      <div className="scorecard-grid">
        {scorecardOptions.map((option) => (
          <label className="checkbox-row" key={option.key}>
            <input
              type="checkbox"
              checked={props.value[option.key]}
              onChange={(event) => props.onChange(option.key, event.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Formats completed scorecard items for attempt history.
 *
 * @param value - Scorecard values.
 * @returns Human-readable completed items.
 */
export function formatCompletedScorecard(value: AttemptScorecardValue) {
  return scorecardOptions.filter((option) => value[option.key]).map((option) => option.label);
}

/**
 * Renders completed scorecard items for attempt history.
 *
 * @param props - Component props.
 * @returns Scorecard summary or null when nothing was selected.
 */
export function AttemptScorecardSummary(props: { value: AttemptScorecardValue }) {
  const completedItems = formatCompletedScorecard(props.value);

  if (!completedItems.length) {
    return null;
  }

  return (
    <div className="scorecard-summary">
      {completedItems.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
