# NICUniversity

The sequel to NICU Tutor: a pre-med "first year" for a precocious eight-year-old,
structured as a real weekly class timetable. Nine courses (Freshman Seminar,
Chemistry, Biology, Physics, Calculus, Statistics, Genetics, Psychology,
Sociology), each meeting once a week, with lectures, printed homework done at
recitations, and a Friday final. Everything stays NICU-themed and keeps calling
back to NICU Tutor for spaced repetition.

## How to use

Open [index.html](index.html) in a browser (double-click works; no server, no
internet needed). Classes unlock in timetable order. Flashback links point to
`../nicu_tutor/…`, so keep both folders side by side.

**Professor mode** (🎓 button, top right): set a 4-digit code the first time.
While on, quiz pages show answer keys and a "enter paper score" box, and
recitation pages show homework answer keys and a score-entry box. It turns off
when the browser tab closes.

**Read-aloud** uses the browser's built-in speech (macOS voices, offline). For a
nicer voice: System Settings → Accessibility → Spoken Content → System Voice →
Manage Voices, and download an "Enhanced"/"Premium" English voice.

## Status

Week 1 is complete: nine lectures with quizzes, nine printed homeworks with
answer keys, nine recitation pages, Friday study hall with a review sheet, the
24-question Week 1 Final (17 to pass), and a printable diploma. The timetable
suggests an order but every class is open. Week 2 is next.

## Structure

- `index.html` timetable · `transcript.html` record of quizzes, badges, stamps
- `courses/<course>/week1.html` lectures · `recitations/week1/<course>.html`
- `study/week1.html` review · `exams/week1-final.html` final exam
- `data/quizzes.json` quiz + exam source of truth · `data/homework.json` homework
  source · `data/review.json` the week's big ideas
- `js/app.js` schedule (SCHEDULE manifest), progress, Professor mode, quiz engine,
  read-aloud, vocab popovers · `js/vocab.js` tappable vocabulary · `js/quizzes.js` (generated)
- `print/` generated PDFs: `quiz-*.pdf`, `hw-*.pdf`, `hw-*-key.pdf`, `notes-*.pdf`,
  `quiz-keys.pdf`, `review-week1.pdf`, `certificate-week1.pdf`

## Adding a week

1. Add slots to `SCHEDULE` in `js/app.js` (ids, day/time, course, href, quizId/hwId).
2. Write `courses/<course>/week2.html` and `recitations/week2/<course>.html` from the
   Week 1 pages as templates (body class `c-<course>`, `data-root`, `window.LESSON`).
3. Add quizzes to `data/quizzes.json`, homework to `data/homework.json`, big ideas
   to `data/review.json`; add new vocabulary to `js/vocab.js`.
4. Rebuild (below). Fix any lint warnings — they are the "guessable answer" check.

## Rebuilding after editing quizzes or homework

```bash
/usr/bin/python3 tools/build_quizzes.py && /usr/bin/python3 tools/build_print.py
```

`build_quizzes.py` shuffles answer positions with a seeded RNG (web and paper
always match), balances which letter is correct, and lints for answers that are
guessable from length. It exits non-zero on lint warnings. `build_print.py`
needs `reportlab` and `pypdf` (installed for the system python3).

## Authoring rules for quizzes

Correct-answer position is randomized by the build — never hand-place it.
Distractors must be plausible misconceptions, not jokes, and about the same
length as the correct answer. Ask: could you get it right from the look of the
choices alone? If yes, rewrite.
