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

Weeks 1 and 2 are complete: each has nine lectures with quizzes, nine printed
homeworks with answer keys, nine recitation pages, Friday study hall with a
review sheet, a 24-question final (17 to pass), and a printable diploma. Week 2
adds optional at-home labs to six homeworks and fades the "Write this down"
cues to "What's the big idea here?" prompts. Week 3 is next; its slots show as
"coming soon" on the timetable. The syllabus through Week 5 and the 20-week
unit plan are in [PLAN.md](PLAN.md).

## Structure

- `index.html` timetable (week tabs) · `transcript.html` record by week
- `courses/<course>/weekN.html` lectures · `recitations/weekN/<course>.html`
- `study/weekN.html` review · `exams/weekN-final.html` final exam
- `data/quizzes-wN.json` quiz + exam source of truth · `data/homework-wN.json`
  homework source · `data/review-wN.json` the week's big ideas
- `js/schedule.js` the semester manifest (`window.WEEKS`; slot ids are stored in
  progress, never rename one) · `js/app.js` progress, Professor mode, quiz engine,
  read-aloud, vocab popovers · `js/vocab.js` tappable vocabulary ·
  `js/quizzes-wN.js` (generated; each page loads only its week)
- `print/weekN/` generated PDFs: `quiz-*.pdf`, `hw-*.pdf`, `hw-*-key.pdf`,
  `notes-*.pdf`, `quiz-keys-wN.pdf`, `review-weekN.pdf`, `certificate-weekN.pdf`
- `tools/check_links.py` verifies every link, quiz/homework id, recitation point
  total, and schedule entry

## Adding a week

1. Add the week block to `js/schedule.js` (slot ids `wN-…`, day/time, course, href,
   quizId/hwId, `certificate` on the exam slot). `href: null` shows "coming soon".
2. Write `courses/<course>/weekN.html` and `recitations/weekN/<course>.html` from the
   previous week's pages (body class `c-<course>`, `data-root`, `window.LESSON`,
   load `js/quizzes-wN.js` and `js/schedule.js`). Cue fading: Week 2 uses
   `.cue.cue-ask` with a `<details>` check; Weeks 3–4 use `.cue.cue-spot`; Week 5+
   has no in-text cues. Optional home labs go in a `.box.box-lab` on the page and a
   `"type": "lab"` item at the end of the homework (not graded; professor initials).
3. Write `data/quizzes-wN.json` (9 quizzes + `final-wN`), `data/homework-wN.json`,
   `data/review-wN.json`; add vocabulary to `js/vocab.js`. Homework figures available:
   `cell`, `grid`, `bars`, `growthchart`, `ratesteps`, `heart` (add new ones in
   `tools/build_print.py`).
4. Rebuild and check (below). Fix any lint warnings — they are the "guessable
   answer" check. Then follow PLAN.md's per-week checklist.

## Rebuilding after editing quizzes or homework

```bash
/usr/bin/python3 tools/build_quizzes.py && /usr/bin/python3 tools/build_print.py && /usr/bin/python3 tools/check_links.py
```

`build_quizzes.py` shuffles answer positions with a seeded RNG (web and paper
always match), balances which letter is correct, and lints for answers that are
guessable from length. It exits non-zero on lint warnings. `build_print.py`
needs `reportlab` and `pypdf` (installed for the system python3). The preview
server in `.claude/launch.json` serves the parent folder so `../nicu_tutor` links resolve.

## Authoring rules for quizzes

Correct-answer position is randomized by the build — never hand-place it.
Distractors must be plausible misconceptions, not jokes, and about the same
length as the correct answer. Ask: could you get it right from the look of the
choices alone? If yes, rewrite.
