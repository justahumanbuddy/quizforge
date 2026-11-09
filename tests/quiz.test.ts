import { describe, expect, it } from "vitest";
import { parseOfflineQuestions, prepareDraft, scoreSession, validateQuiz } from "../lib/quiz";

describe("QuizForge core", () => {
  it("parses numbered questions and a trailing answer key", () => {
    const questions = parseOfflineQuestions(`1. Unit of force?\nA. Joule\nB. Newton\nC. Watt\nD. Pascal\n\n2. Largest planet?\nA) Earth\nB) Mars\nC) Jupiter\nD) Venus\n\nAnswers\n1. B\n2. C`);
    expect(questions).toHaveLength(2);
    expect(questions[0].answer).toBe(1);
    expect(questions[1].answer).toBe(2);
  });

  it("deduplicates drafts and leaves invalid answers unset", () => {
    const draft = prepareDraft([
      { q: "  Unit of force? ", options: ["Joule", "Newton"], answer: 1 },
      { q: "unit   of force?", options: ["Joule", "Newton"], answer: 1 },
      { q: "Broken", options: ["One", "Two"], answer: 5 },
    ]);
    expect(draft.questions).toHaveLength(2);
    expect(draft.questions[1].answer).toBeNull();
    expect(draft.warnings).toContain("1 duplicate removed");
  });

  it("prevents a quiz with an unanswered answer key from being saved", () => {
    expect(validateQuiz({ title: "Set", qs: [{ id: "q1", q: "Question", options: ["A", "B"], answer: null, explanation: "", source: "key" }] })).toMatch(/answer/i);
  });

  it("calculates negative marking for right wrong and skipped answers", () => {
    const qs = Array.from({ length: 10 }, (_, index) => ({ id: String(index), q: `Q${index}`, options: ["A", "B"], answer: 0, explanation: "", source: "key" as const }));
    const answers = Object.fromEntries(qs.slice(0, 6).map((q) => [q.id, 0]));
    Object.assign(answers, Object.fromEntries(qs.slice(6, 9).map((q) => [q.id, 1])));
    const result = scoreSession(qs, answers, 1 / 3);
    expect(result).toMatchObject({ correct: 6, wrong: 3, skipped: 1, raw: 5, percentage: 60 });
  });
});
