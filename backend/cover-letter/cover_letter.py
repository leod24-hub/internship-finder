"""One-page cover letter PDF generator (PyMuPDF).

Usage:
    pip install -r requirements.txt
    python cover_letter.py examples/example_letter.json

Input JSON keys:
    name          applicant full name (bold header)
    contact       footer line, e.g. "email | phone | linkedin.com/in/..."
    slug          used in the output filename
    date          e.g. "October 19, 2026"
    header_lines  company / role / location lines
    salutation    e.g. "Dear Recruiting Team,"
    paras         list of body paragraphs (keep to ~4 so it fits one page)

Output: $COVER_LETTER_DIR (default ./out)/<Lastname>_Cover_Letter_<slug>.pdf
Raises SystemExit if the text overflows one page.
"""
import json
import os
import sys

import fitz

OUT = os.environ.get("COVER_LETTER_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))


def make(name, contact, slug, date, header_lines, salutation, paras):
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((72, 80), name, fontname="Times-Bold", fontsize=16)
    body = [date, ""] + header_lines + ["", salutation, ""]
    for p in paras:
        body += [p, ""]
    body += ["Sincerely,", name, contact]
    rect = fitz.Rect(72, 100, 540, 740)
    rc = page.insert_textbox(rect, "\n".join(body), fontname="Times-Roman", fontsize=11, lineheight=1.25)
    if rc < 0:
        raise SystemExit(f"overflow by {-rc:.0f}pt")
    os.makedirs(OUT, exist_ok=True)
    last = name.split()[-1]
    path = os.path.join(OUT, f"{last}_Cover_Letter_{slug}.pdf")
    doc.save(path)
    print(path, "spare", round(rc))


if __name__ == "__main__":
    make(**json.load(open(sys.argv[1])))
