export type Source = "key" | "solved";

export type Question = {
  id: string;
  q: string;
  options: string[];
  answer: number | null;
  explanation: string;
  source: Source;
};

export type Quiz = { id: string; title: string; qs: Question[]; best: number | null };

export type Draft = { questions: Question[]; warnings: string[] };

export const QUIZZES_KEY = "quizforge.quizzes.v1";
export const SETTINGS_KEY = "quizforge.settings.v1";

export function newId(): string {
  return crypto.randomUUID();
}

export function normalizeQuestion(raw: Partial<Question>): Question {
  const options = Array.isArray(raw.options)
    ? raw.options.map(String).map((value) => value.trim()).filter(Boolean)
    : [];
  const answer = Number.isInteger(raw.answer) && (raw.answer as number) >= 0 && (raw.answer as number) < options.length
    ? (raw.answer as number)
    : null;
  return {
    id: typeof raw.id === "string" ? raw.id : newId(),
    q: String(raw.q || "").trim(),
    options,
    answer,
    explanation: String(raw.explanation || "").trim(),
    source: raw.source === "solved" ? "solved" : "key",
  };
}

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "") ?? fallback;
  } catch {
    return fallback;
  }
}

export function questionKey(question: Pick<Question, "q">): string {
  return question.q.toLowerCase().replace(/\s+/g, " ").trim();
}

export function prepareDraft(rawQuestions: Partial<Question>[]): Draft {
  const seen = new Set<string>();
  const questions: Question[] = [];
  let duplicates = 0;
  let dropped = 0;
  let needsReview = 0;

  for (const raw of rawQuestions) {
    const question = normalizeQuestion(raw);
    if (!question.q || question.options.length < 2) {
      dropped += 1;
      continue;
    }
    const key = questionKey(question);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    if (question.answer === null) needsReview += 1;
    questions.push(question);
  }

  const warnings = [
    duplicates ? `${duplicates} duplicate${duplicates === 1 ? "" : "s"} removed` : "",
    dropped ? `${dropped} incomplete item${dropped === 1 ? "" : "s"} removed` : "",
    needsReview ? `${needsReview} answer${needsReview === 1 ? " needs" : "s need"} review` : "",
  ].filter(Boolean);
  return { questions, warnings };
}

function answerIndex(value: string | undefined): number | null {
  const letter = value?.trim().toUpperCase().match(/^([A-D]|[1-4])\b/)?.[1];
  if (!letter) return null;
  return /^[1-4]$/.test(letter) ? Number(letter) - 1 : letter.charCodeAt(0) - 65;
}

export function parseOfflineQuestions(text: string): Question[] {
  const keyMap = new Map<number, number>();
  const answerSection = text.match(/(?:^|\n)\s*(?:answers?|answer\s*key)\s*[:\-]?([\s\S]*)$/i);
  if (answerSection) {
    for (const match of answerSection[1].matchAll(/(?:^|\n|\s)(\d{1,4})\s*[.)\-:]\s*([A-D1-4])\b/gi)) {
      const index = answerIndex(match[2]);
      if (index !== null) keyMap.set(Number(match[1]), index);
    }
  }
  const body = answerSection ? text.slice(0, answerSection.index) : text;
  const starts = [...body.matchAll(/(?:^|\n)\s*(\d{1,4})\s*[.)]\s*/g)];
  const questions: Partial<Question>[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    const next = starts[index + 1];
    const segment = body.slice((current.index ?? 0) + current[0].length, next?.index).trim();
    const optionMatches = [...segment.matchAll(/(?:^|\n)\s*([A-D])\s*[.)]\s*([^\n]+)/gi)];
    if (optionMatches.length < 2) continue;
    const firstOptionStart = optionMatches[0].index ?? segment.length;
    const prompt = segment.slice(0, firstOptionStart).replace(/\s+/g, " ").trim();
    const options = optionMatches.map((match) => match[2].replace(/\s+(?:Answer|Ans)\s*[:\-].*$/i, "").trim());
    const inline = segment.match(/(?:Answer|Ans)\s*[:\-]?\s*([A-D1-4])\b/i);
    questions.push({
      q: prompt,
      options,
      answer: keyMap.get(Number(current[1])) ?? answerIndex(inline?.[1]),
      explanation: "",
      source: "key",
    });
  }
  return prepareDraft(questions).questions;
}

export function validateQuiz(input: Pick<Quiz, "title" | "qs">): string | null {
  if (!input.title.trim()) return "Give this test a title before saving.";
  if (!input.qs.length) return "Keep at least one question before saving.";
  const invalid = input.qs.findIndex((question) => !question.q || question.options.length < 2 || question.answer === null);
  return invalid >= 0 ? `Question ${invalid + 1} needs a correct answer before saving.` : null;
}

export function scoreSession(questions: Question[], answers: Record<string, number>, penalty: number) {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined) skipped += 1;
    else if (answer === question.answer) correct += 1;
    else wrong += 1;
  }
  const raw = Number((correct - wrong * penalty).toFixed(2));
  return { correct, wrong, skipped, raw, max: questions.length, percentage: Math.round((correct / questions.length) * 100) };
}
