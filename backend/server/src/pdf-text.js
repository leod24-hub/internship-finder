// Extracts plain text from a PDF (resumes). Uses Mozilla's PDF.js, which reads PDFs from any common tool.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function pdfText(buffer, maxChars = 20000) {
  const doc = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    let line = "", out = [];
    for (const item of content.items) {
      line += item.str;
      if (item.hasEOL) { out.push(line); line = ""; } else if (item.str && !item.str.endsWith(" ")) line += " ";
    }
    if (line.trim()) out.push(line);
    pages.push(out.map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n"));
  }
  await doc.destroy();
  return pages.join("\n\n").slice(0, maxChars);
}
