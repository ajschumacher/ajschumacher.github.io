# NICU Tutor — Machines of the NICU

A self-contained web app that teaches NICU medicine to a curious kid, structured
around the machines and tools of a Neonatal Intensive Care Unit. Eight ~20-minute
lessons plus a mixed capstone quiz ("Your NICU Rounds"), a glossary, and a sources page.

## How to use

Open [index.html](index.html) in any browser — double-clicking the file works.
No server, no build step, no internet connection required (the "Want more?" links
need internet, but everything else is local).

Progress and badges are saved in the browser's localStorage, so use the same
browser to keep them. The "Reset all progress" button is at the bottom of the
home page.

## Structure

- `index.html` — home: lesson map, badge shelf, progress
- `lessons/01…08-*.html` — the eight lessons, each ending in an 8-question badge quiz
- `lessons/rounds.html` — 12-question capstone mixing all lessons
- `glossary.html` — medical vocabulary, including word-part "LEGO bricks"
- `sources.html` — references used to fact-check the medical content
- `css/style.css`, `js/app.js` — shared design system, quiz engine, and progress store
- `print/` — printable PDF versions of every quiz (`quiz-*.pdf`, or `all-quizzes.pdf`
  for one print job) plus `answer-key.pdf` for the grader. Regenerate after editing
  any quiz with `/usr/bin/python3 print/make_quiz_pdfs.py` (reads the quiz data
  straight from the lesson HTML files; needs `reportlab` and `pypdf`)

## Notes for the grown-up

- Quizzes require ~70% (6/8, or 9/12 on the capstone) to earn a badge; retries
  are unlimited and best scores are kept.
- Content is honest about mortality (RDS history, NEC, IVH, kernicterus,
  survival at the edge of viability) without being gratuitous.
- Medical facts were checked against AAP, NIH, and published research as of
  August 2026 — see `sources.html`. Teaching ranges are simplifications;
  where experts genuinely disagree (e.g., treating preterm hypotension),
  the lessons say so.
