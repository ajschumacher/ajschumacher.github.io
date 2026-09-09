#!/usr/bin/env python3
"""Generate printable PDF versions of the NICU Tutor quizzes.

Reads quiz data from the lesson HTML files (window.LESSON blocks), producing:
  print/quiz-XX-name.pdf   one per lesson + the capstone
  print/all-quizzes.pdf    all quizzes merged for one print job
  print/answer-key.pdf     answers + explanations for the grown-up grader
"""
import json
import re
import unicodedata
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether,
                                PageTemplate, Paragraph, Spacer, Table,
                                TableStyle)
from pypdf import PdfReader, PdfWriter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont

# Embed real TrueType fonts so every viewer/printer renders identically.
FDIR = "/System/Library/Fonts/Supplemental"
pdfmetrics.registerFont(TTFont("Treb", f"{FDIR}/Trebuchet MS.ttf"))
pdfmetrics.registerFont(TTFont("TrebB", f"{FDIR}/Trebuchet MS Bold.ttf"))
pdfmetrics.registerFont(TTFont("TrebI", f"{FDIR}/Trebuchet MS Italic.ttf"))
pdfmetrics.registerFont(TTFont("TrebBI", f"{FDIR}/Trebuchet MS Bold Italic.ttf"))
pdfmetrics.registerFont(TTFont("Rounded", f"{FDIR}/Arial Rounded Bold.ttf"))
registerFontFamily("Treb", normal="Treb", bold="TrebB", italic="TrebI", boldItalic="TrebBI")

ROOT = Path("/Users/aaron/space/nicu_tutor")
OUT = ROOT / "print"
OUT.mkdir(exist_ok=True)

TEAL = colors.HexColor("#0E7C7B")
TEAL_DARK = colors.HexColor("#0A5958")
CORAL = colors.HexColor("#F25F5C")
INK = colors.HexColor("#2D3142")
INK_SOFT = colors.HexColor("#565D75")
CREAM = colors.HexColor("#FFF8F0")
SUNNY = colors.HexColor("#FFB627")
LINE = colors.HexColor("#E4D7C3")

LESSON_FILES = [
    ("01", "01-isolette.html"),
    ("02", "02-pulse-ox.html"),
    ("03", "03-monitor.html"),
    ("04", "04-blood-pressure.html"),
    ("05", "05-breathing.html"),
    ("06", "06-feeding.html"),
    ("07", "07-bili-lights.html"),
    ("08", "08-imaging.html"),
    ("rounds", "rounds.html"),
]


def parse_lesson(path):
    """Extract the window.LESSON object from a lesson HTML file."""
    html = path.read_text(encoding="utf-8")
    m = re.search(r"window\.LESSON = (\{.*?\});\n</script>", html, re.S)
    if not m:
        raise ValueError(f"no LESSON block in {path}")
    js = m.group(1)
    # Keys are unquoted identifiers at line starts (consistent formatting) — quote them.
    js = re.sub(r"(?m)^(\s*)(id|title|home|quiz|q|choices|answer|explain):", r'\1"\2":', js)
    return json.loads(js)


def sanitize(text):
    """Keep only characters the base-14 PDF fonts can draw; fix known symbols."""
    replacements = {"₂": "2", " ": " ", "’": "’"}
    out = []
    for ch in text:
        ch = replacements.get(ch, ch)
        try:
            ch.encode("cp1252")
            out.append(ch)
        except UnicodeEncodeError:
            # drop emoji/symbols the fonts can't draw
            if unicodedata.category(ch).startswith("Z"):
                out.append(" ")
    return "".join(out).replace("  ", " ").strip()


def esc(text):
    return (sanitize(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


# ---------- styles ----------
S_TITLE = ParagraphStyle("title", fontName="Rounded", fontSize=21,
                         leading=25, textColor=TEAL_DARK, spaceAfter=2)
S_KICKER = ParagraphStyle("kicker", fontName="TrebB", fontSize=9.5,
                          leading=12, textColor=CORAL)
S_INSTR = ParagraphStyle("instr", fontName="Treb", fontSize=10.5,
                         leading=14.5, textColor=INK)
S_Q = ParagraphStyle("q", fontName="TrebB", fontSize=11.5,
                     leading=15, textColor=INK, spaceBefore=0, spaceAfter=5)
S_CHOICE = ParagraphStyle("choice", fontName="Treb", fontSize=11,
                          leading=14.5, textColor=INK)
S_KEY_H = ParagraphStyle("keyh", fontName="Rounded", fontSize=14,
                         leading=18, textColor=TEAL_DARK, spaceBefore=14, spaceAfter=4)
S_KEY = ParagraphStyle("key", fontName="Treb", fontSize=10,
                       leading=13.5, textColor=INK, spaceAfter=5)


def page_decorations(header_left, header_right):
    def draw(canvas, doc):
        canvas.saveState()
        w, h = letter
        # top band
        canvas.setFillColor(TEAL)
        canvas.rect(0, h - 0.42 * inch, w, 0.42 * inch, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("TrebB", 11)
        canvas.drawString(0.75 * inch, h - 0.29 * inch, header_left)
        canvas.setFont("Treb", 10)
        canvas.drawRightString(w - 0.75 * inch, h - 0.29 * inch, header_right)
        # footer
        canvas.setFillColor(INK_SOFT)
        canvas.setFont("Treb", 8.5)
        canvas.drawString(0.75 * inch, 0.45 * inch,
                          "NICU Tutor - Machines of the NICU")
        canvas.drawRightString(w - 0.75 * inch, 0.45 * inch, f"Page {doc.page}")
        canvas.restoreState()
    return draw


def make_doc(path, header_left, header_right):
    doc = BaseDocTemplate(str(path), pagesize=letter,
                          leftMargin=0.75 * inch, rightMargin=0.75 * inch,
                          topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="page", frames=[frame],
                                       onPage=page_decorations(header_left, header_right))])
    return doc


def name_date_row(doc_width):
    t = Table([[Paragraph("Name: ______________________________", S_INSTR),
                Paragraph("Date: ____________________", S_INSTR)]],
              colWidths=[doc_width * 0.6, doc_width * 0.4])
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return t


def question_block(num, q, doc_width):
    parts = [Paragraph(f"{num}. {esc(q['q'])}", S_Q)]
    rows = []
    for i, choice in enumerate(q["choices"]):
        letter_lbl = "ABCD"[i]
        rows.append(["", Paragraph(f"<b>{letter_lbl}.</b>  {esc(choice)}", S_CHOICE)])
    t = Table(rows, colWidths=[0.34 * inch, doc_width - 0.62 * inch])
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    # draw a small checkbox in column 0 of each row
    for r in range(len(rows)):
        style.append(("BOX", (0, r), (0, r), 1.1, INK_SOFT))
        style.append(("BACKGROUND", (0, r), (0, r), colors.white))
    # shrink checkbox cell: use fixed row heights via padding; BOX draws around cell
    t.setStyle(TableStyle(style))
    parts.append(t)
    parts.append(Spacer(1, 13))
    return KeepTogether(parts)


def build_quiz_pdf(lesson, meta_label, badge_name, out_path):
    quiz = lesson["quiz"]
    total = len(quiz)
    need = -(-total * 7 // 10)  # ceil(70%)
    doc = make_doc(out_path, "NICU Tutor  ·  Paper Badge Quiz", meta_label)
    story = []
    story.append(Paragraph(meta_label.upper(), S_KICKER))
    story.append(Paragraph(sanitize(lesson["title"]), S_TITLE))
    story.append(Spacer(1, 8))
    story.append(name_date_row(doc.width))
    story.append(Spacer(1, 8))

    instr = Paragraph(
        f"<b>How to play:</b> For each question, put an X in the box next to the best answer "
        f"(one answer per question). Get <b>{need} of {total}</b> right to earn the "
        f"<b>{badge_name}</b> badge. Take your time - real doctors think before they answer!",
        S_INSTR)
    it = Table([[instr]], colWidths=[doc.width])
    it.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 1.2, SUNNY),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(it)
    story.append(Spacer(1, 16))

    for i, q in enumerate(quiz, 1):
        story.append(question_block(i, q, doc.width))

    # score box
    score = Table([[Paragraph("<b>Score:</b> ________ / %d" % total, S_Q),
                    Paragraph(f"<b>Badge earned?</b>   YES  /  NOT YET  "
                              f"(need {need})", S_Q)]],
                  colWidths=[doc.width * 0.4, doc.width * 0.6])
    score.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1.4, TEAL),
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(KeepTogether([Spacer(1, 6), score]))
    doc.build(story)


def build_answer_key(lessons_meta, out_path):
    doc = make_doc(out_path, "NICU Tutor  ·  Answer Key", "For the grown-up grader")
    story = [Paragraph("ANSWER KEY - KEEP AWAY FROM QUIZ-TAKERS!", S_KICKER),
             Paragraph("All Quizzes: Answers & Explanations", S_TITLE),
             Spacer(1, 4),
             Paragraph("Each entry shows the correct letter and the explanation the "
                       "app gives. Reading the explanation aloud after grading each "
                       "question is half the fun.", S_INSTR),
             Spacer(1, 6)]
    for label, lesson in lessons_meta:
        total = len(lesson["quiz"])
        need = -(-total * 7 // 10)
        block = [Paragraph(f"{sanitize(label)}: {sanitize(lesson['title'])} "
                           f"<font size=9 color='#565D75'>(pass mark {need}/{total})</font>",
                           S_KEY_H)]
        for i, q in enumerate(lesson["quiz"], 1):
            letter_lbl = "ABCD"[q["answer"]]
            block.append(Paragraph(
                f"<b>{i}. {letter_lbl}</b> - {esc(q['explain'])}", S_KEY))
        story.append(KeepTogether(block[:2]))  # keep heading with first answer
        story.extend(block[2:])
    doc.build(story)


def main():
    lessons_meta = []
    quiz_paths = []
    for lid, fname in LESSON_FILES:
        lesson = parse_lesson(ROOT / "lessons" / fname)
        if lid == "rounds":
            label = "Final Challenge"
            badge = "stethoscope"
            out = OUT / "quiz-09-rounds.pdf"
        else:
            label = f"Lesson {int(lid)} Quiz"
            badge = {"01": "hatching chick", "02": "heart on fire", "03": "chart",
                     "04": "balloon", "05": "wind", "06": "milk", "07": "blue heart",
                     "08": "magnifying glass"}[lid]
            out = OUT / f"quiz-{fname.replace('.html', '')}.pdf"
        build_quiz_pdf(lesson, label, badge, out)
        lessons_meta.append((label, lesson))
        quiz_paths.append(out)
        print("wrote", out.name)

    build_answer_key(lessons_meta, OUT / "answer-key.pdf")
    print("wrote answer-key.pdf")

    writer = PdfWriter()
    for p in quiz_paths:
        for page in PdfReader(str(p)).pages:
            writer.add_page(page)
    with open(OUT / "all-quizzes.pdf", "wb") as f:
        writer.write(f)
    print("wrote all-quizzes.pdf")


if __name__ == "__main__":
    main()
