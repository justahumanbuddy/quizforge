import { NextResponse } from "next/server";
import { extractGemini } from "../../../../lib/gemini";

export const runtime = "nodejs";
const requests = new Map<string, { count: number; reset: number }>();

function allowRequest(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = requests.get(ip);
  if (!entry || entry.reset < now) { requests.set(ip, { count: 1, reset: now + 60 * 60_000 }); return true; }
  if (entry.count >= 8) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    if (!allowRequest(request)) return NextResponse.json({ error: "This connection has reached the hourly extraction limit. Try again later." }, { status: 429 });
    const form = await request.formData();
    const file = form.get("file");
    const model = String(form.get("model") || process.env.GEMINI_MODEL || "gemini-2.0-flash");
    if (!(file instanceof File) || file.type !== "application/pdf") return NextResponse.json({ error: "Send a PDF file." }, { status: 400 });
    if (file.size > 4.5 * 1024 * 1024) return NextResponse.json({ error: "This PDF needs the Blob upload path; direct request uploads are limited to 4.5 MB." }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    const questions = await extractGemini(model, [{ inlineData: { mimeType: "application/pdf", data: bytes } }]);
    return NextResponse.json({ questions });
  } catch (error) { const item = error as { message?: string; status?: number }; return NextResponse.json({ error: item.message || "Extraction did not complete." }, { status: item.status || 500 }); }
}
