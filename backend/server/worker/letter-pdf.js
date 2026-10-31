// Renders the approved cover letter as a one-page PDF for upload fields.
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function coverLetterPdf(text, name) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Cover letter - ${name}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 11, lineHeight = 15, margin = 72, width = 612 - margin * 2;
  let page = doc.addPage([612, 792]);
  let y = 792 - margin;
  // Standard fonts only cover WinAnsi; swap the characters that come up in letters.
  const safe = s => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x00-\xFF]/g, "");
  for (const para of safe(text).split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    const flush = () => {
      if (y < margin) { page = doc.addPage([612, 792]); y = 792 - margin; }
      page.drawText(line, { x: margin, y, size, font });
      y -= lineHeight;
      line = "";
    };
    if (!words.length) { y -= lineHeight * 0.6; continue; }
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width) flush(), line = w;
      else line = next;
    }
    if (line) flush();
  }
  return Buffer.from(await doc.save());
}
