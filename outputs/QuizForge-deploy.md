# Deploy QuizForge to Vercel

1. Import this folder into a Vercel project.
2. In **Project Settings → Environment Variables**, add `GEMINI_API_KEY` for Preview and Production. Do not use a `NEXT_PUBLIC_` prefix.
3. Deploy. Visitors can then upload a PDF without entering any key.

The Gemini route currently accepts direct PDFs up to 4.5 MB, which is Vercel Functions' request-body limit. Offline extraction remains local in the browser for text PDFs.

The public endpoint has a small best-effort hourly per-IP guard. For serious public traffic, replace it with durable rate limiting before sharing widely.
