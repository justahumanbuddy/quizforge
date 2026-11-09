import { normalizeQuestion, Question } from "./quiz";

const prompt = "Extract every multiple-choice question from this source. Copy wording and option order verbatim where possible. Remove option labels. Set source to key only if the document states the correct answer; otherwise set source to solved. Return JSON only.";
const schema = { type: "OBJECT", properties: { questions: { type: "ARRAY", items: { type: "OBJECT", properties: { q: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } }, answer: { type: "INTEGER" }, explanation: { type: "STRING" }, source: { type: "STRING", enum: ["key", "solved"] } }, required: ["q", "options", "source"] } } }, required: ["questions"] };

async function once(model: string, parts: unknown[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("Gemini is not configured on this Vercel project."), { status: 503 });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...parts] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema } }) });
  if (!response.ok) throw Object.assign(new Error(`Gemini could not extract this PDF (${response.status}).`), { status: response.status });
  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw Object.assign(new Error(body.promptFeedback?.blockReason ? "Gemini blocked this request." : "Gemini returned no extractable questions."), { status: 422 });
  return JSON.parse(text);
}

export async function extractGemini(model: string, parts: unknown[]): Promise<Question[]> {
  let payload: { questions?: Partial<Question>[] };
  try { payload = await once(model, parts); } catch (error) { const status = (error as { status?: number }).status; if (![429, 500, 503].includes(status || 0)) throw error; payload = await once(model, parts); }
  return (payload.questions || []).map(normalizeQuestion);
}
