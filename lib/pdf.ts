import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseOfflineQuestions as parse } from "./quiz";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export async function extractPdfText(file: File): Promise<string> {
  const document = await getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const content = await (await document.getPage(pageNumber)).getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
  }
  return pages.join("\n\n");
}

export const parseOfflineQuestions = parse;
