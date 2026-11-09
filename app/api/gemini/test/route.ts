import { NextResponse } from "next/server";

export const runtime = "nodejs";
export async function GET() {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY is not configured on this Vercel project." }, { status: 503 });
  return NextResponse.json({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
}
