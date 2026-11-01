import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { DsaInterviewScorecard, emptyDsaInterviewReview } from "./DsaInterviewScorecard";

afterEach(cleanup);
it("tracks each interview stage independently and lets optional skill ratings be cleared", () => {
  function Form() {
    const [value, setValue] = useState({ ...emptyDsaInterviewReview });
    return <DsaInterviewScorecard value={value} onChange={setValue} />;
  }
  render(<Form />);
  expect(screen.getAllByRole("checkbox")).toHaveLength(13);
  fireEvent.click(screen.getByRole("checkbox", { name: "Discussed at least two approaches" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Used meaningful variable names" }));
  expect(screen.getByRole("progressbar", { name: "Before coding checkpoints" })).toHaveValue(1);
  expect(screen.getByRole("progressbar", { name: "During coding checkpoints" })).toHaveValue(1);
  expect(screen.getByRole("progressbar", { name: "After coding checkpoints" })).toHaveValue(0);
  const rating = screen.getByRole("group", { name: "Communication rating" });
  const four = within(rating).getByRole("button", { name: "Communication: 4 of 5" });
  fireEvent.click(four);
  expect(four).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(within(rating).getByRole("button", { name: "Clear communication rating" }));
  expect(four).toHaveAttribute("aria-pressed", "false");
});

it("shows the exact saved review without offering editable or guessed history values", () => {
  render(<DsaInterviewScorecard value={{ ...emptyDsaInterviewReview, restatedProblem: true, coding: 4 }} />);
  expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(screen.getByText("Restated the problem in my own words")).toHaveTextContent("Completed:");
  expect(screen.getByText("Tested edge cases manually")).toHaveTextContent("To practise:");
  expect(screen.getByText("4 / 5")).toBeInTheDocument();
  expect(screen.getAllByText("Not rated")).toHaveLength(4);
});
