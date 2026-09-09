#!/usr/bin/env python3
"""Build all printable PDFs for NICUniversity into print/.

  print/quiz-<id>.pdf      paper version of each lecture quiz (from data/quizzes.shuffled.json)
  print/hw-<id>.pdf        homework worksheet (from data/homework.json)
  print/hw-<id>-key.pdf    answer key for that homework
  print/notes-<id>.pdf     Class Notes sheet for that lecture
  print/quiz-keys.pdf      answer keys for all quizzes

Run tools/build_quizzes.py first.  Requires reportlab + pypdf (system python3 has them).
"""
import json
import unicodedata
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, KeepTogether,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "print"
OUT.mkdir(exist_ok=True)

FDIR = "/System/Library/Fonts/Supplemental"
pdfmetrics.registerFont(TTFont("Treb", f"{FDIR}/Trebuchet MS.ttf"))
pdfmetrics.registerFont(TTFont("TrebB", f"{FDIR}/Trebuchet MS Bold.ttf"))
pdfmetrics.registerFont(TTFont("TrebI", f"{FDIR}/Trebuchet MS Italic.ttf"))
pdfmetrics.registerFont(TTFont("TrebBI", f"{FDIR}/Trebuchet MS Bold Italic.ttf"))
pdfmetrics.registerFont(TTFont("Rounded", f"{FDIR}/Arial Rounded Bold.ttf"))
registerFontFamily("Treb", normal="Treb", bold="TrebB", italic="TrebI", boldItalic="TrebBI")

TEAL = colors.HexColor("#0E7C7B"); TEAL_DARK = colors.HexColor("#0A5958")
INK = colors.HexColor("#2D3142"); INK_SOFT = colors.HexColor("#565D75")
CREAM = colors.HexColor("#FFF8F0"); SUNNY = colors.HexColor("#FFB627"); LINE = colors.HexColor("#E4D7C3")
COURSE_COLORS = {
    "seminar": "#7768AE", "chemistry": "#F25F5C", "biology": "#2A9D3F", "physics": "#3F88C5",
    "calculus": "#C8871A", "statistics": "#0E7C7B", "genetics": "#D64D8A", "psychology": "#E8792B",
    "sociology": "#8A5A33", "general": "#2D3142",
}
COURSE_NAMES = {
    "seminar": "Freshman Seminar", "chemistry": "Chemistry 101", "biology": "Biology 101",
    "physics": "Physics 101", "calculus": "Calculus 101", "statistics": "Statistics 101",
    "genetics": "Genetics 101", "psychology": "Psychology 101", "sociology": "Sociology 101",
}

# Trebuchet has no subscript digits; render them as <sub> markup instead.
SUBS = {"₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9"}


def esc(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    out = []
    for ch in text:
        if ch in SUBS:
            out.append(f"<sub>{SUBS[ch]}</sub>")
            continue
        if ch == "→": out.append(" -> "); continue
        if ch == "−": out.append("-"); continue
        if ch == "≈": out.append("~"); continue
        try:
            ch.encode("cp1252"); out.append(ch)
        except UnicodeEncodeError:
            if unicodedata.category(ch).startswith("Z"): out.append(" ")
    return "".join(out)


# ---------- styles ----------
def ps(name, **kw):
    base = dict(fontName="Treb", fontSize=10.5, leading=14.5, textColor=INK)
    base.update(kw)
    return ParagraphStyle(name, **base)

S_TITLE = ps("title", fontName="Rounded", fontSize=21, leading=25, textColor=TEAL_DARK, spaceAfter=2)
S_KICKER = ps("kicker", fontName="TrebB", fontSize=9.5, leading=12)
S_INSTR = ps("instr")
S_SECTION = ps("section", fontName="Rounded", fontSize=13.5, leading=17, textColor=TEAL_DARK, spaceBefore=12, spaceAfter=6)
S_Q = ps("q", fontName="TrebB", fontSize=11, leading=15, spaceAfter=5)
S_CHOICE = ps("choice", fontSize=10.5, leading=14)
S_PASSAGE = ps("passage", fontName="TrebI", fontSize=10.5, leading=14.5, textColor=INK)
S_SMALL = ps("small", fontSize=9, leading=12, textColor=INK_SOFT)
S_KEY = ps("key", fontSize=10, leading=13.5, spaceAfter=5)
S_CELL = ps("cell", fontSize=10, leading=13)
S_CELL_B = ps("cellb", fontName="TrebB", fontSize=10, leading=13)


def page_decorations(header_left, header_right, accent):
    def draw(canvas, doc):
        canvas.saveState()
        w, h = letter
        canvas.setFillColor(colors.HexColor(accent))
        canvas.rect(0, h - 0.42 * inch, w, 0.42 * inch, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("TrebB", 11)
        canvas.drawString(0.75 * inch, h - 0.29 * inch, header_left)
        canvas.setFont("Treb", 10)
        canvas.drawRightString(w - 0.75 * inch, h - 0.29 * inch, header_right)
        canvas.setFillColor(INK_SOFT)
        canvas.setFont("Treb", 8.5)
        canvas.drawString(0.75 * inch, 0.45 * inch, "NICUniversity - Week 1")
        canvas.drawRightString(w - 0.75 * inch, 0.45 * inch, f"Page {doc.page}")
        canvas.restoreState()
    return draw


def make_doc(path, header_left, header_right, accent):
    doc = BaseDocTemplate(str(path), pagesize=letter, leftMargin=0.75 * inch, rightMargin=0.75 * inch,
                          topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="page", frames=[frame],
                                       onPage=page_decorations(header_left, header_right, accent))])
    return doc


def name_date_row(width):
    t = Table([[Paragraph("Name: ______________________________", S_INSTR),
                Paragraph("Date: ____________________", S_INSTR)]], colWidths=[width * 0.6, width * 0.4])
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return t


def boxed(flowable_or_list, width, fill=CREAM, border=SUNNY):
    content = flowable_or_list if isinstance(flowable_or_list, list) else [flowable_or_list]
    t = Table([[content]], colWidths=[width])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), fill), ("BOX", (0, 0), (-1, -1), 1.2, border),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return t


class Lines(Flowable):
    """Ruled answer lines."""
    def __init__(self, width, n, gap=0.32 * inch):
        super().__init__(); self.w = width; self.n = n; self.gap = gap
        self.height = n * gap + 4
    def wrap(self, aw, ah): return self.w, self.height
    def draw(self):
        self.canv.setStrokeColor(LINE); self.canv.setLineWidth(1)
        for i in range(self.n):
            y = self.height - (i + 1) * self.gap
            self.canv.line(0, y, self.w, y)


class DrawBox(Flowable):
    def __init__(self, width, height):
        super().__init__(); self.w = width; self.height = height
    def wrap(self, aw, ah): return self.w, self.height
    def draw(self):
        self.canv.setStrokeColor(INK_SOFT); self.canv.setLineWidth(1.2)
        self.canv.roundRect(0, 0, self.w, self.height, 10, stroke=1, fill=0)


class CellFigure(Flowable):
    """Numbered cell diagram for the biology homework."""
    def __init__(self, width):
        super().__init__(); self.w = width; self.height = 2.9 * inch
    def wrap(self, aw, ah): return self.w, self.height
    def draw(self):
        c = self.canv
        cx, cy = self.w / 2, self.height / 2 - 6
        c.setFillColor(colors.HexColor("#E2F4E5")); c.setStrokeColor(colors.HexColor("#2A9D3F")); c.setLineWidth(4)
        c.ellipse(cx - 150, cy - 85, cx + 150, cy + 85, stroke=1, fill=1)
        # nucleus
        c.setFillColor(colors.HexColor("#7768AE")); c.setStrokeColor(colors.HexColor("#7768AE"))
        c.circle(cx, cy, 36, stroke=0, fill=1)
        # mitochondria
        c.setFillColor(colors.HexColor("#F25F5C"))
        for (mx, my) in [(cx - 90, cy + 35), (cx + 90, cy - 35), (cx - 80, cy - 45)]:
            c.ellipse(mx - 24, my - 12, mx + 24, my + 12, stroke=0, fill=1)
        # numbered labels with leader lines
        c.setStrokeColor(INK); c.setLineWidth(1)
        labels = [("1", cx - 140, cy + 40, cx - 200, cy + 70),   # membrane (edge)
                  ("2", cx + 60, cy + 45, cx + 175, cy + 70),    # cytoplasm (empty jelly)
                  ("3", cx + 20, cy - 25, cx + 100, cy - 78),    # nucleus
                  ("4", cx - 90, cy + 35, cx - 195, cy - 20)]    # mitochondrion
        for num, x1, y1, x2, y2 in labels:
            c.line(x1, y1, x2, y2)
            c.setFillColor(INK); c.circle(x2, y2, 10, stroke=0, fill=1)
            c.setFillColor(colors.white); c.setFont("TrebB", 11)
            c.drawCentredString(x2, y2 - 4, num)


class GridFigure(Flowable):
    """Blank plotting grid: days 0-8 across, grams 780-900 up (20 g steps)."""
    def __init__(self, width):
        super().__init__(); self.w = width; self.height = 3.4 * inch
    def wrap(self, aw, ah): return self.w, self.height
    def draw(self):
        c = self.canv
        left, bottom = 60, 34
        gw, gh = self.w - left - 20, self.height - bottom - 16
        cols, rows = 8, 6            # days 0..8 ; grams 780..900 step 20
        cw, rh = gw / cols, gh / rows
        c.setStrokeColor(LINE); c.setLineWidth(0.8)
        for i in range(cols + 1):
            c.line(left + i * cw, bottom, left + i * cw, bottom + gh)
        for j in range(rows + 1):
            c.line(left, bottom + j * rh, left + gw, bottom + j * rh)
        c.setStrokeColor(INK); c.setLineWidth(1.5)
        c.line(left, bottom, left + gw, bottom); c.line(left, bottom, left, bottom + gh)
        c.setFillColor(INK); c.setFont("Treb", 9)
        for i in range(cols + 1):
            c.drawCentredString(left + i * cw, bottom - 12, str(i))
        for j in range(rows + 1):
            c.drawRightString(left - 6, bottom + j * rh - 3, str(780 + 20 * j))
        c.setFont("TrebB", 9.5)
        c.drawCentredString(left + gw / 2, 4, "Day")
        c.saveState(); c.translate(14, bottom + gh / 2); c.rotate(90)
        c.drawCentredString(0, 0, "Weight (grams)"); c.restoreState()


class BarFigure(Flowable):
    """Blank bar-chart frame: babies A-E across, heart rate 100-170 up."""
    def __init__(self, width):
        super().__init__(); self.w = width; self.height = 3.0 * inch
    def wrap(self, aw, ah): return self.w, self.height
    def draw(self):
        c = self.canv
        left, bottom = 60, 34
        gw, gh = self.w - left - 20, self.height - bottom - 16
        rows = 7                     # 100..170 step 10
        rh = gh / rows
        c.setStrokeColor(LINE); c.setLineWidth(0.8)
        for j in range(rows + 1):
            c.line(left, bottom + j * rh, left + gw, bottom + j * rh)
        c.setStrokeColor(INK); c.setLineWidth(1.5)
        c.line(left, bottom, left + gw, bottom); c.line(left, bottom, left, bottom + gh)
        c.setFillColor(INK); c.setFont("Treb", 9)
        for j in range(rows + 1):
            c.drawRightString(left - 6, bottom + j * rh - 3, str(100 + 10 * j))
        slot = gw / 5
        c.setFont("TrebB", 10)
        for i, lbl in enumerate("ABCDE"):
            x = left + slot * i + slot / 2
            c.drawCentredString(x, bottom - 13, "Baby " + lbl)
            c.setStrokeColor(LINE); c.setDash(3, 3)
            c.rect(x - slot * 0.3, bottom, slot * 0.6, gh, stroke=1, fill=0)
            c.setDash()
        c.setFont("TrebB", 9.5)
        c.saveState(); c.translate(14, bottom + gh / 2); c.rotate(90)
        c.drawCentredString(0, 0, "Heart rate (beats per minute)"); c.restoreState()


FIGURES = {"cell": CellFigure, "grid": GridFigure, "bars": BarFigure}


def question_number_style():
    return S_Q


# ---------- quiz PDFs ----------
def build_quiz(qid, quiz):
    course = quiz["course"]
    exam = course == "general"
    accent = COURSE_COLORS.get(course, "#0E7C7B")
    total = len(quiz["questions"]); need = -(-total * 7 // 10)
    path = OUT / f"quiz-{qid}.pdf"
    doc = make_doc(path, "NICUniversity  ·  " + ("Final Exam" if exam else "Lecture Quiz"),
                   "Week 1" if exam else COURSE_NAMES.get(course, course), accent)
    W = doc.width
    kicker = "WEEK 1  ·  FINAL EXAM  ·  ALL NINE COURSES" if exam else esc(COURSE_NAMES.get(course, course)).upper() + "  ·  WEEK 1 QUIZ"
    goal = f"Get <b>{need} of {total}</b> right to pass and earn your Week 1 diploma." if exam else f"Get <b>{need} of {total}</b> right to earn the badge."
    story = [Paragraph(kicker, ParagraphStyle("k", parent=S_KICKER, textColor=colors.HexColor(accent))),
             Paragraph(esc(quiz["title"]), S_TITLE), Spacer(1, 8), name_date_row(W), Spacer(1, 8),
             boxed(Paragraph(f"<b>How to play:</b> Read each question twice, read every choice, cross out the wrong ones, "
                             f"then put an X in the box next to your answer. {goal}", S_INSTR), W), Spacer(1, 14)]
    for i, q in enumerate(quiz["questions"], 1):
        parts = [Paragraph(f"{i}. {esc(q['q'])}", S_Q)]
        rows = [["", Paragraph(f"<b>{'ABCD'[j]}.</b>  {esc(c)}", S_CHOICE)] for j, c in enumerate(q["choices"])]
        t = Table(rows, colWidths=[0.34 * inch, W - 0.62 * inch])
        st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (0, -1), 8),
              ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
        for r in range(len(rows)):
            st += [("BOX", (0, r), (0, r), 1.1, INK_SOFT), ("BACKGROUND", (0, r), (0, r), colors.white)]
        t.setStyle(TableStyle(st))
        parts += [t, Spacer(1, 12)]
        story.append(KeepTogether(parts))
    score = Table([[Paragraph(f"<b>Score:</b> ________ / {total}", S_Q),
                    Paragraph(f"<b>Badge earned?</b>   YES  /  NOT YET   (need {need})", S_Q)]],
                  colWidths=[W * 0.4, W * 0.6])
    score.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 1.4, TEAL), ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 10),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    story.append(KeepTogether([Spacer(1, 6), score]))
    doc.build(story)
    return path


def build_quiz_keys(quizzes):
    path = OUT / "quiz-keys.pdf"
    doc = make_doc(path, "NICUniversity  ·  Quiz Answer Keys", "Professor copy", "#2D3142")
    story = [Paragraph("ANSWER KEYS - PROFESSOR COPY", S_KICKER),
             Paragraph("Week 1 Lecture Quizzes", S_TITLE), Spacer(1, 6)]
    for qid, quiz in quizzes.items():
        total = len(quiz["questions"]); need = -(-total * 7 // 10)
        block = [Paragraph(f"{esc(quiz['title'])}  <font size=9 color='#565D75'>(pass mark {need}/{total})</font>", S_SECTION)]
        for i, q in enumerate(quiz["questions"], 1):
            block.append(Paragraph(f"<b>{i}. {'ABCD'[q['answer']]}</b> - {esc(q['explain'])}", S_KEY))
        story.append(KeepTogether(block[:2])); story.extend(block[2:])
    doc.build(story)
    return path


# ---------- homework ----------
def hw_total(hw):
    return sum(it.get("points", 0) for it in hw["items"])


def render_item(it, num, W, key=False):
    """Return flowables for one homework item. key=True renders the answer instead of blanks."""
    t = it["type"]
    if t == "section":
        return [Paragraph(esc(it["title"]), S_SECTION)]
    if t == "passage":
        return [boxed(Paragraph(esc(it["text"]), S_PASSAGE), W, fill=colors.HexColor("#F4F1FA"), border=colors.HexColor("#7768AE")), Spacer(1, 8)]
    if t == "figure":
        return [FIGURES[it["figure"]](W), Spacer(1, 6)]

    pts = it.get("points", 0)
    head = Paragraph(f"{num}. {esc(it['q'])}  <font size=9 color='#565D75'>({pts} pt{'s' if pts != 1 else ''})</font>", S_Q)
    out = [head]

    if key:
        if t == "mc":
            ans = "ABCD"[it["answer"]] + ". " + it["choices"][it["answer"]]
            out.append(Paragraph(f"<b>Answer:</b> {esc(ans)}  -  {esc(it.get('explain', ''))}", S_KEY))
        elif t == "match":
            pairs = [f"{esc(l)} -> {esc(it['right'][it['answer'][i]])}" for i, l in enumerate(it["left"])]
            out.append(Paragraph("<b>Answer:</b> " + " &nbsp;|&nbsp; ".join(pairs) + "  (1 pt each)", S_KEY))
        else:
            out.append(Paragraph(f"<b>Answer:</b> {esc(it['answer'])}", S_KEY))
        out.append(Spacer(1, 6))
        return out

    if t in ("short", "think"):
        out.append(Lines(W, it.get("lines", 2)))
    elif t == "mc":
        rows = [["", Paragraph(f"<b>{'ABCD'[j]}.</b>  {esc(c)}", S_CHOICE)] for j, c in enumerate(it["choices"])]
        tb = Table(rows, colWidths=[0.34 * inch, W - 0.62 * inch])
        st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (0, -1), 8),
              ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
        for r in range(len(rows)):
            st += [("BOX", (0, r), (0, r), 1.1, INK_SOFT), ("BACKGROUND", (0, r), (0, r), colors.white)]
        tb.setStyle(TableStyle(st)); out.append(tb)
    elif t == "table":
        cols = it["columns"]; n = len(cols)
        first_w = W * (0.42 if n <= 3 else 0.34)
        widths = [first_w] + [(W - first_w) / (n - 1)] * (n - 1)
        data = [[Paragraph(esc(c), S_CELL_B) for c in cols]]
        for row in it["rows"]:
            data.append([Paragraph(esc(v), S_CELL) if v else "" for v in row])
        tb = Table(data, colWidths=widths, rowHeights=[None] + [0.42 * inch] * len(it["rows"]))
        tb.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.8, INK_SOFT), ("BACKGROUND", (0, 0), (-1, 0), CREAM),
                                ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        out.append(tb)
    elif t == "draw":
        out.append(DrawBox(W, it.get("height", 2.0) * inch))
    elif t == "match":
        left = [Paragraph(esc(x), S_CELL_B) for x in it["left"]]
        right = [Paragraph(esc(x), S_CELL) for x in it["right"]]
        rows = [[l, "", r] for l, r in zip(left, right)]
        tb = Table(rows, colWidths=[W * 0.3, W * 0.12, W * 0.58], rowHeights=[0.5 * inch] * len(rows))
        tb.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                ("BOX", (0, 0), (0, -1), 0.8, INK_SOFT), ("BOX", (2, 0), (2, -1), 0.8, INK_SOFT),
                                ("LINEBELOW", (0, 0), (0, -2), 0.8, INK_SOFT), ("LINEBELOW", (2, 0), (2, -2), 0.8, INK_SOFT)]))
        out.append(tb)
    out.append(Spacer(1, 10))
    return out


def build_homework(hid, hw, key=False):
    accent = COURSE_COLORS.get(hw["course"], "#0E7C7B")
    total = hw_total(hw)
    path = OUT / (f"hw-{hid}-key.pdf" if key else f"hw-{hid}.pdf")
    doc = make_doc(path, "NICUniversity  ·  " + ("ANSWER KEY" if key else "Homework"), hw["courseName"], accent)
    W = doc.width
    story = [Paragraph(esc(hw["courseName"]).upper() + ("  ·  ANSWER KEY - PROFESSOR COPY" if key else "  ·  RECITATION HOMEWORK"),
                       ParagraphStyle("k", parent=S_KICKER, textColor=colors.HexColor(accent))),
             Paragraph(esc(hw["title"]), S_TITLE), Spacer(1, 8)]
    if not key:
        story += [name_date_row(W), Spacer(1, 8),
                  boxed(Paragraph(f"<b>Instructions:</b> {esc(hw['intro'])}  Total: <b>{total} points</b>.", S_INSTR), W), Spacer(1, 12)]
    else:
        story += [boxed(Paragraph(f"Grading guide. Total <b>{total} points</b>. Answers in different words that mean the same thing get full credit; "
                                  f"partial credit is suggested where it applies. Enter the final score in Professor mode on the recitation page.", S_INSTR), W),
                  Spacer(1, 10)]
    num = 0
    pending = []   # section headings wait and get glued to the next item so they never orphan
    for it in hw["items"]:
        if it["type"] in ("section", "passage", "figure"):
            if key and it["type"] == "figure":
                continue   # the key doesn't need the blank diagram
            pending += render_item(it, num, W, key=key)
            continue
        if it.get("points") is not None:
            num += 1
        flow = render_item(it, num, W, key=key)
        story.append(KeepTogether(pending + flow))
        pending = []
    story += pending
    if not key:
        score = Table([[Paragraph(f"<b>Score:</b> ________ / {total} points", S_Q),
                        Paragraph("<b>Professor's comment:</b> ____________________________", S_Q)]],
                      colWidths=[W * 0.4, W * 0.6])
        score.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 1.4, TEAL), ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                                   ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 10),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
        story.append(KeepTogether([Spacer(1, 6), score]))
    doc.build(story)
    return path, total


# ---------- Class Notes sheet ----------
def build_notes(qid, quiz):
    course = quiz["course"]; accent = COURSE_COLORS.get(course, "#0E7C7B")
    path = OUT / f"notes-{qid}.pdf"
    doc = make_doc(path, "NICUniversity  ·  Class Notes", COURSE_NAMES.get(course, course), accent)
    W = doc.width
    story = [Paragraph(esc(COURSE_NAMES.get(course, course)).upper() + "  ·  WEEK 1  ·  CLASS NOTES",
                       ParagraphStyle("k", parent=S_KICKER, textColor=colors.HexColor(accent))),
             Paragraph(esc(quiz["title"].split(" — ")[0]) + ": my notes", S_TITLE), Spacer(1, 6), name_date_row(W), Spacer(1, 8),
             boxed(Paragraph("<b>The rule:</b> notes are for future-me. Write the <b>3 biggest ideas, in my own words</b> - "
                             "not every sentence. Watch for the dashed 'Write this down' boxes in class.", S_INSTR), W), Spacer(1, 12)]
    S_NSEC = ParagraphStyle("nsec", parent=S_SECTION, spaceBefore=6, spaceAfter=2)
    for i in range(1, 4):
        story += [Paragraph(f"Big idea {i}", S_NSEC), Lines(W, 2, gap=0.34 * inch)]
    story += [Paragraph("New words (in my words)", S_NSEC)]
    tb = Table([[Paragraph("Word", S_CELL_B), Paragraph("What it means", S_CELL_B)], ["", ""], ["", ""]],
               colWidths=[W * 0.3, W * 0.7], rowHeights=[None, 0.4 * inch, 0.4 * inch])
    tb.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.8, INK_SOFT), ("BACKGROUND", (0, 0), (-1, 0), CREAM)]))
    story += [tb,
              KeepTogether([Paragraph("Draw it (a machine, a molecule, a cell, anything from class)", S_NSEC), DrawBox(W, 1.3 * inch)]),
              KeepTogether([Paragraph("One question I still have", S_NSEC), Lines(W, 2, gap=0.32 * inch)])]
    doc.build(story)
    return path


def build_review(review):
    path = OUT / "review-week1.pdf"
    doc = make_doc(path, "NICUniversity  ·  Study Hall", "Week 1 review", "#2D3142")
    W = doc.width
    story = [Paragraph("STUDY HALL  ·  FRIDAY 10:30", S_KICKER), Paragraph(esc(review["title"]), S_TITLE), Spacer(1, 6),
             boxed(Paragraph(esc(review["intro"]), S_INSTR), W), Spacer(1, 8)]
    for sec in review["sections"]:
        accent = colors.HexColor(COURSE_COLORS.get(sec["course"], "#2D3142"))
        block = [Paragraph(esc(sec["name"]), ParagraphStyle("rs", parent=S_SECTION, textColor=accent, spaceBefore=10, spaceAfter=4))]
        rows = [["", Paragraph(esc(i), S_CHOICE)] for i in sec["ideas"]]
        t = Table(rows, colWidths=[0.34 * inch, W - 0.5 * inch])
        st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
        for r in range(len(rows)):
            st += [("BOX", (0, r), (0, r), 1.1, INK_SOFT)]
        t.setStyle(TableStyle(st))
        block.append(t)
        story.append(KeepTogether(block))
    doc.build(story)
    return path


def build_certificate():
    from reportlab.lib.pagesizes import landscape
    from reportlab.pdfgen import canvas as pdfcanvas
    path = OUT / "certificate-week1.pdf"
    W, H = landscape(letter)
    c = pdfcanvas.Canvas(str(path), pagesize=landscape(letter))
    c.setFillColor(CREAM); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setStrokeColor(TEAL); c.setLineWidth(6); c.rect(30, 30, W - 60, H - 60, stroke=1, fill=0)
    c.setStrokeColor(SUNNY); c.setLineWidth(2); c.rect(44, 44, W - 88, H - 88, stroke=1, fill=0)
    c.setFillColor(TEAL_DARK); c.setFont("Rounded", 34); c.drawCentredString(W / 2, H - 120, "NICUniversity")
    c.setFillColor(INK_SOFT); c.setFont("TrebB", 13); c.drawCentredString(W / 2, H - 142, "PRE-MEDICAL PROGRAM  ·  FALL SEMESTER")
    c.setFillColor(INK); c.setFont("Rounded", 26); c.drawCentredString(W / 2, H - 200, "Certificate of Completion")
    c.setFont("Treb", 14); c.drawCentredString(W / 2, H - 240, "This certifies that")
    c.setStrokeColor(INK_SOFT); c.setLineWidth(1); c.line(W / 2 - 200, H - 290, W / 2 + 200, H - 290)
    c.setFont("Treb", 10); c.setFillColor(INK_SOFT); c.drawCentredString(W / 2, H - 304, "student's name")
    c.setFillColor(INK); c.setFont("Treb", 14)
    c.drawCentredString(W / 2, H - 336, "has completed Week 1 of NICUniversity — nine courses, nine homeworks, and the Week 1 Final —")
    c.drawCentredString(W / 2, H - 358, "and is hereby advanced to Week 2 with the full confidence of the faculty.")
    c.setFont("TrebB", 12); c.setFillColor(TEAL_DARK)
    c.drawCentredString(W / 2, H - 400, "Freshman Seminar  ·  Chemistry  ·  Biology  ·  Physics  ·  Calculus  ·  Statistics  ·  Genetics  ·  Psychology  ·  Sociology")
    c.setStrokeColor(INK_SOFT); c.line(110, 110, 330, 110); c.line(W - 330, 110, W - 110, 110)
    c.setFillColor(INK_SOFT); c.setFont("Treb", 10)
    c.drawCentredString(220, 96, "Date"); c.drawCentredString(W - 220, 96, "Professor")
    c.setFont("Treb", 9); c.drawCentredString(W / 2, 60, "Machines report; humans judge.  —  NICU Tutor, Lesson 2")
    c.showPage(); c.save()
    return path


def main():
    quizzes = json.loads((ROOT / "data" / "quizzes.shuffled.json").read_text(encoding="utf-8"))
    homework = json.loads((ROOT / "data" / "homework.json").read_text(encoding="utf-8"))
    review = json.loads((ROOT / "data" / "review.json").read_text(encoding="utf-8"))
    for qid, quiz in quizzes.items():
        print("wrote", build_quiz(qid, quiz).name)
        if quiz["course"] != "general":
            print("wrote", build_notes(qid, quiz).name)
    print("wrote", build_review(review).name)
    print("wrote", build_certificate().name)
    print("wrote", build_quiz_keys(quizzes).name)
    for hid, hw in homework.items():
        p, total = build_homework(hid, hw)
        print("wrote", p.name, f"({total} points)")
        p, _ = build_homework(hid, hw, key=True)
        print("wrote", p.name)


if __name__ == "__main__":
    main()
