# NICUniversity — Plan for Weeks 2–5 (and the road to Week 20)

Written 2026-09-09, after Week 1 shipped (2026-09-03). Week 2 shipped 2026-09-09 (restructure in §4 done). This is the working syllabus and
build plan. Update it as weeks ship; it is the file to read before starting any week.

---

## 1. Where things stand

**Week 1 is complete** — nine lectures with quizzes, nine printed homeworks with keys,
nine recitations, study hall + review sheet, the 24-question final, and a diploma.

**The "Week 2 plan" is not a separate file.** It exists in three places:

1. The original NICUniversity plan (previous session, Sept 2026) gave each course a
   *Weeks 2–4* arc. Those arcs are reproduced and extended below.
2. The NICU Tutor project memory (`~/.claude/projects/-Users-aaron-space-nicu-tutor/memory/`)
   summarizes the same arcs, Quinn's profile, and the quiz-design rules.
3. **Promises made inside Week 1 lectures**, which Week 2 must keep:
   - Chemistry: "You'll meet acids and bases properly next Monday."
   - Calculus: "Question 2, how much piles up, is next week."
   - Statistics: "next week, the median and percentiles, which are how growth charts work."
   - Genetics: "You'll meet that screening test (a heel prick…) next week."
   - Seminar: "Next week, the boxes will ask you to find the big idea yourself.
     By Week 3 you won't need them."
   - Exam page / certificate: "Week 2 begins with the same nine courses, one step deeper each."

**Week 1 by the numbers** (the unit of effort for every later week):

| Piece | Week 1 volume |
|---|---|
| Lecture prose | ~14,300 words (1,400–1,800 per lecture), 2–3 inline SVGs each, 4 cues each |
| Quiz questions | 96 (9 × 8 + 24-question final) |
| Homework | 142 items, ~195 points, 9 answer keys |
| Vocabulary | 117 entries in `js/vocab.js` |
| Generated PDFs | 40 files, 2.6 MB |

---

## 2. The shape of every week (invariants)

Keep the timetable identical every week so the fiction stays stable:

| | Mon | Tue | Wed | Thu | Fri |
|---|---|---|---|---|---|
| 9:00 | **Seminar** | Rec: Chem | Rec: Physics | Rec: Stats | Rec: Psych |
| 9:45 | | Rec: Bio | Rec: Calc | Rec: Genetics | Rec: Soc |
| 10:30 | **Chemistry** | **Physics** | **Statistics** | **Psychology** | Study Hall |
| 1:00 | **Biology** | **Calculus** | **Genetics** | **Sociology** | **Final** |
| 2:30 | Rec: Seminar | | | | |

Every **lecture** ships with: a 2-question warm-up, a "Get ready" notes-sheet cue,
big-idea cues (fading — see §4), one real person or historical story, at least one
Flashback box with a link into `../nicu_tutor`, a "Try it yourself", a "Real talk",
Words to know, Want more, an 8-question quiz (6 to pass), and the homework hand-off.

Every **homework**: ~20 minutes, ~20–26 points, parts A/B/C, a Flashback section, and a
"Think like a doctor" question with a sample answer in the key.

Every **week**: review.json (3 big ideas × 9 courses), study hall, a final, a certificate.

**From Week 2 on, spaced repetition widens:**
- Warm-ups: one question from NICU Tutor + one from an earlier NICUniversity week
  (usually the same course's previous lecture).
- Weekly final (24 Q, 17 to pass): 18 from this week (2 per course) + 3 from earlier
  NICUniversity weeks + 3 NICU Tutor flashbacks.
- Homework Flashback sections draw from both sources.

---

## 3. The 20-week arc: units of five

Twenty meetings per course is a real semester-and-a-half. Group weeks into **four units
of five**, each closing with a cumulative exam and a bigger certificate:

| Unit | Weeks | Name | Closer |
|---|---|---|---|
| 1 | 1–5 | Foundations | Week 5: **Unit 1 Exam** (cumulative) |
| 2 | 6–10 | Systems | Week 10: **Midterm** |
| 3 | 11–15 | Evidence | Week 15: Unit 3 Exam |
| 4 | 16–20 | Practice | Week 20: **First-Year Finals** → Year 1 diploma |

**Unit exam format** (weeks 5, 10, 15, 20): 32 questions = 14 from this week +
14 from the unit's earlier weeks + 4 NICU Tutor; pass at 23 (`passMark` already
computes 70%). Ordinary weeks keep the 24-question final. Unit names are suggestions;
they only appear on the certificate and the week label.

Only Unit 1 is planned in detail here. Units 2–4 get a one-line direction per course
(§5, "Later") so the Unit 1 lectures can foreshadow honestly.

---

## 4. One-time plumbing before Week 2 content (about half a build session)

Week 1 hard-codes "Week 1" in ~a dozen places. Fix the structure once, then every
later week is content only.

1. **Schedule becomes per-week.** Move `SCHEDULE` out of `js/app.js` into a new
   `js/schedule.js` as `window.WEEKS = [{ week: 1, unit: 1, label: "Fall · Week 1", slots: [...] }, ...]`.
   `app.js` flattens it (`SCHEDULE = all slots, each tagged with its week`) so
   `nextSlot`, `initNav`, and progress logic keep working unchanged across week
   boundaries. **Keep Week 1 slot ids exactly as they are** (`p.study["fri-study"]` is
   stored progress); new weeks use `w2-mon-chem`, `w2-fri-final`, etc. Quiz/hw ids
   already carry the week (`chemistry-w2`).
2. **Home page shows one week at a time.** Week tabs (or ◀ Week N ▶) above the
   timetable; default to the week containing the next undone slot. Add the *next*
   week's slots with `href: null` as soon as a week starts so the striped
   "Coming soon" cards preview what's ahead. Replace the three hard-coded banner
   strings ("rest of Week 1…", "Week 1 complete!") with week-derived text.
3. **Transcript groups by week**, newest first, with a per-week diploma row; the badge
   shelf shows the current week (the "9 courses + the final" string becomes computed).
   Add a one-line semester summary ("3 of 20 weeks · 2 diplomas").
4. **Quiz result text** ("You passed the Week 1 Final!") derives from `quiz.title`.
5. **Split data files by week.** `data/quizzes-w1.json`, `homework-w1.json`,
   `review-w1.json` (rename the Week 1 files once); `build_quizzes.py` loops over
   `data/quizzes-w*.json` and emits `js/quizzes-w1.js`, `js/quizzes-w2.js`…; each
   lecture/exam page loads only its week's file. Otherwise every page parses a
   ~1 MB quiz blob by Week 20, and authoring diffs stay small.
6. **`build_print.py` reads the week from the id suffix** (`-w2`) for footers, kickers,
   notes-sheet headers, `review-week2.pdf`, `certificate-week2.pdf`, and the
   certificate wording ("advanced to Week 3"). Unit weeks get a second, fancier
   certificate. Output to `print/week1/`, `print/week2/`… (move the Week 1 PDFs once
   and sed the links) so the folder doesn't reach 800 files.
7. **Cue fading needs markup.** Add `.cue.cue-ask` (Week 2: label "What's the big
   idea here?" with a `<details>` reveal of the model sentence) and `.cue.cue-spot`
   (Weeks 3–4: just the 📝 marker and "Big idea spot — write yours"). From Week 5 the
   in-text cues are gone; only the printed notes sheet remains. Seminar Week 2 teaches
   the change explicitly.
8. **Add `tools/check_links.py`**: walk every `.html`, verify every relative `href`/`src`
   (including `../nicu_tutor/…`) resolves on disk, and compare each recitation's
   `RECITATION.total` with the homework's point total. Run it with the two build
   scripts. Cheap, and it is the thing that will break silently at week 9.
9. **README**: update "Adding a week" for the per-week files and the new tools.

Optional, not needed for Week 2: a warm-up/flashback question bank (`data/flashbacks.json`)
that lectures reference by id. Inline authoring is fine through Week 5; revisit at Unit 2
when there are ~40 lectures to draw on.

---

## 5. Course syllabi, Weeks 2–5

Format per course: the Week 1 base, then W2–W5 (title · content · person · sneaky skill ·
homework), then the direction for Weeks 6–20. People are not reused across courses
(Mary Ellen Avery belongs to Chemistry W3, Semmelweis to Biology W4, and so on).

### Freshman Seminar (academic skills; the meta-course)
Week 1: orientation, notes = 3 big ideas in your own words, quiz strategy.

- **W2 · Finding the Big Idea.** How to tell a big idea from a detail: the "so what?"
  test, the "would a doctor need this?" test; cues become prompts this week. Person:
  Leonardo da Vinci's notebooks (ideas + drawings — supports the draw-it box).
  HW: extract 3 big ideas from three short passages (Chem/Bio/NICU Tutor); write one
  quiz question of her own with plausible wrong answers (she becomes the professor).
- **W3 · Writing Like a Doctor.** A paragraph = claim + because + example; the SOAP note
  as a doctor's paragraph (What they say / What we measure / What I think / What we do).
  Person: Lawrence Weed (invented the problem-oriented record and SOAP, 1968).
  HW: write a case note for a made-up baby from a data table; fix a bad paragraph.
- **W4 · How to Look Things Up.** Question → source → check it; textbook vs study vs
  website; why NICU Tutor has a sources page; "collect all the studies" — Archie
  Cochrane, and the Cochrane logo, which is literally a chart of the preemie steroid
  trials. HW: answer three questions using provided source cards; rank source trust.
- **W5 · Triage: Managing Time on a Shift.** Sickest first; the shape of a NICU day
  (handoff, rounds, feeds every 3 hours); planning her own study week. Person:
  Dominique-Jean Larrey (invented triage, Napoleon's surgeon). HW: triage a task list;
  plan a week on a printed timetable; a handoff card for one baby.
- *Later:* presenting a case aloud (rounds), mnemonics (APGAR is one), reading a diagram,
  speaking up in a team, mistakes and honesty (the M&M conference), how to study for a
  midterm (W9), the path to becoming a neonatologist (college → med school → residency →
  fellowship), keeping a lab notebook, explaining things to a parent, a mini-paper (W19).

### Chemistry 101
Week 1: atoms, formulas/subscripts, what's in a breath, CO₂ → acid.

- **W2 · Acids, Bases, and the Blood Gas.** The pH scale 0–14; blood lives at 7.35–7.45;
  CO₂ makes carbonic acid; bicarbonate as the sponge; reading a real-looking blood gas.
  Person: Søren Sørensen (invented pH at the Carlsberg brewery, 1909). Sneaky: decimals
  to hundredths on a number line. HW: sort household acids/bases; four blood gases to
  interpret; pH number line.
- **W3 · Soap, Water, and Surfactant.** Water is sticky (surface tension); soap breaks
  the stickiness; surfactant is the lungs' soap and why alveoli would otherwise collapse.
  Person: Mary Ellen Avery (1959, found what preemies were missing). Flashback: NICU
  Tutor L5. HW: drops-on-a-penny experiment with and without soap, logged as data.
- **W4 · Sugar, the Fuel.** Glucose again; chains of sugar; blood sugar has a range;
  newborn hypoglycemia and heel-stick checks; "D10" means 10% — percent returns.
  Person: Banting and Best (insulin, 1921, and Leonard Thompson). HW: read glucose
  numbers against the range; percent-mixing puzzles; think-like-a-doctor: a shaky baby.
- **W5 · Salt and Water.** Solutions and concentration; sodium and potassium; why IVs
  aren't plain water (a raisin in salt water vs fresh — osmosis); preemie skin leaks
  water → isolette humidity (NICU Tutor L1). Person: Sydney Ringer and the tap-water
  accident that gave us Ringer's solution. Sneaky: amount ÷ volume. HW: raisin
  experiment log; read an electrolyte panel; concentration arithmetic.
- *Later:* iron and blood, calcium and bone, proteins and enzymes (why fever matters),
  medicines and mg/kg dosing (caffeine, the preemie's medicine), vitamins K and D, fat in
  TPN, bilirubin chemistry and why blue light works, nitric oxide (a gas as medicine), the
  periodic table proper, sterilizing chemistry (alcohol, chlorhexidine), plastics and tubing.

### Biology 101
Week 1: cells, the ladder to organism, mitochondria, cell division and growth.

- **W2 · The Heart and the Blood.** Four rooms, two loops; what's in blood; the fetal
  shortcut that should close (PDA). Person: William Harvey (1628). Flashbacks: NICU
  Tutor L3/L4. Sneaky: beats per minute arithmetic. HW: label the heart, trace the loop,
  a heart-rate table for baby vs adult.
- **W3 · Lungs and the Breathing Muscles.** The airway tree (branches double — Week 1
  callback), the diaphragm, why preemies forget to breathe (apnea → caffeine); same week
  as Chem's surfactant on purpose. Person: Maria Delivoria-Papadopoulos (first to keep a
  preemie alive on a ventilator, 1960s). HW: balloon-in-a-bottle lung; count breaths;
  branching arithmetic.
- **W4 · Germs, Handwashing, and the Immune System.** Bacteria vs viruses; white cells
  as soldiers; antibodies cross the placenta late, so preemies arrive unarmed; sepsis;
  antibiotics. Person: Semmelweis (1847; honest about how it ended). HW: glitter-germ
  handwashing experiment; sort bacteria/virus; a timeline.
- **W5 · The Gut: Feeding a Tiny Body.** The pipeline; why breast milk; the immature gut
  and NEC (NICU Tutor L6, honest); good bacteria. Person: Alan Lucas (1990: formula-fed
  preemies got far more NEC). HW: trace a sip of milk; mL per feed × feeds per day
  (ties to Calc W2); read a feeding plan.
- *Later:* kidneys and fluid balance, skin, brain and nerves (IVH), eyes (ROP), bones,
  liver (bilirubin), hormones (thyroid screen), muscles, the placenta as the original life
  support, vaccines, sleep biology, senses, embryology weeks 1–40, how a baby is born.

### Physics 101
Week 1: pressure, mmHg, cmH₂O.

- **W2 · Light.** Colors and the spectrum; absorption — why the pulse ox uses red and
  infrared; why bili lights are blue; the nurse who noticed sunlight (Sister Jean Ward,
  Rochford, 1956). Flashbacks: L2, L7. HW: CD/prism rainbow; colored-cellophane
  absorption test; match machine → light.
- **W3 · Sound and Echoes.** Vibration, pitch, loudness, decibels (why the NICU stays
  under ~45 dB); echoes → ultrasound through the fontanelle (L8); Doppler and the siren.
  Person: Ian Donald (Glasgow, 1958, from shipyard sonar). HW: ruler-twang experiment;
  a decibel table; echo-time arithmetic.
- **W4 · Heat.** Temperature vs heat; the four heat thieves (conduction, convection,
  radiation, evaporation) and how the isolette fights each (L1); wet newborns lose heat
  fast. Person: Stéphane Tarnier (1880, incubators copied from the zoo's chicken
  hatchery). Sneaky: reading thermometers, 36.5–37.5 °C decimals. HW: cooling-cup
  experiment with and without lid, as a data table; thief matching.
- **W5 · Electricity and the Heart Monitor.** Charge moving; the heart makes its own
  electricity; three stickers; the bump-and-spike wave; artifact — a slipped lead looks
  like a disaster (the NICU Night Shift lesson: the monitor lies, the baby doesn't).
  Person: Willem Einthoven (1903; patients with hands in buckets of salt water — Chem W5
  tie-in). HW: draw the waves; count a rate from a strip; battery-and-bulb circuit.
- *Later:* gases and Boyle's law (ventilator volumes), fluids and flow (IV pumps, thin
  tubes), gravity and weighing, X-rays, magnets and MRI, energy, motion and the car-seat
  test, springs and lung stiffness, suction and siphons, the eye and the ROP exam.

### Calculus 101
Week 1: rate of change = change ÷ time; slope; reading the line.

- **W2 · How Much Piles Up?** Rate × time = total; stacking rectangles; area under a
  step graph = total; mL/hr on a pump → mL per day → mL/kg/day. Person: Archimedes
  (area by slicing). Sneaky: multiplication, adding a column, area of rectangles.
  HW: total intake from a pump log; draw the staircase; a 24-hour intake sheet.
- **W3 · Going Down: Negative Rates.** Babies lose up to ~10% in days 1–3 and that's
  normal; the number line below zero; a downhill graph. Person: Brahmagupta (628 AD,
  debts and fortunes). Sneaky: negatives, subtraction across zero, 10% of 3,000 g.
  HW: weight-loss table; number line; up/down graph reading.
- **W4 · Right Now vs. On Average.** Average speed over a week vs speed right now; zoom
  in until the curve looks straight; the idea of a limit. Person: Zeno (Achilles and the
  tortoise). HW: averages over shrinking intervals from a table; zoom-in graph reading.
- **W5 · Doubling and Halving.** Repeated multiplication (cells W1, bacteria Bio W4);
  halving as a medicine leaves the body — caffeine's half-life is ~4 days in a preemie vs
  ~5 hours in an adult; the two curve shapes. Frame: the rice-and-chessboard legend.
  Sneaky: ×2 chains; ½, ¼, ⅛. HW: doubling and halving tables; draw both curves.
- *Later:* curves that bend (speeding up/slowing down), unit chains of "per", area under a
  real curve (drug exposure), extrapolation and its danger, the peak of a curve (the best
  setting), intake vs output on one graph, surface area vs volume (why small things lose
  heat), the grown-up symbols dy/dx and ∫ (≈W12–15), and the capstone: rate and total are
  inverses (the fundamental theorem, in words, W19–20).

### Statistics 101
Week 1: mean, range, the Apgar score.

- **W2 · Where Do You Stand? Percentiles and Growth Charts.** Ordering; the median;
  percentile = the fraction below you; the preemie growth chart; "small for gestational
  age" = below the 10th. Person: Tanis Fenton (the preterm growth chart). Sneaky:
  ordering, fractions of a group, reading a curve chart. HW: median of nine babies; plot a
  baby; percentile fractions.
- **W3 · How Do We Know? The Fair Test.** Randomized trials and control groups; the
  oxygen-blindness story as *why* we test; coin flips as randomization (first
  probability); blinding. Person: Arnall Patz (1950s; ran the oxygen trial on borrowed
  money) with James Lind (scurvy, 1747) as the ancestor. HW: design a fair test;
  coin-flip tally; spot the unfair comparison.
- **W4 · Pictures of Numbers.** Bar, line, pie — which for what; the monitor's trend
  screen is a line chart. Person: Florence Nightingale and the rose diagram that changed
  an army (Crimea: disease killed more than wounds). HW: two charts from NICU data; pick
  the chart for the question.
- **W5 · Alarms and False Alarms.** Where alarm limits come from (the middle of many
  babies); every alarm is a bet; false alarms vs misses; alarm fatigue is a real NICU
  problem (most alarms need no action); "catches" and "false catches". Frame: the boy who
  cried wolf + the NICU Night Shift monitor. HW: classify a night of alarms; fraction
  arithmetic; set-the-limit puzzle.
- *Later:* dice and cards, survival by gestational age (the honest big table), screening
  math (why the heel prick has false positives), correlation vs causation, sampling, the
  bell curve, is Apgar a good measure?, reading an abstract, the placebo effect, counting
  every baby (Vermont Oxford Network), statistics that lie, the birth-weight paradox (W19).

### Genetics 101
Week 1: DNA's four letters, genes → proteins, twins.

- **W2 · The Heel Prick.** Newborn screening; blood spots on filter paper; PKU = a
  missing enzyme, fixed by a diet (gene → protein, W1). Person: Robert Guthrie (1961; his
  own son and niece). Sneaky: pattern decoding, sorting. HW: read a screening card;
  match condition → missing protein; decode a message.
- **W3 · Punnett Squares: Passing It On.** Dominant/recessive; the 2×2 square;
  fractions as probability (¼ ½ ¾); carriers; "eye color is more complicated" caveat.
  Person: Gregor Mendel (28,000 pea plants). HW: fill squares; fractions; a carrier
  family tree.
- **W4 · Sickle Cell: One Letter Changed.** One typo in the hemoglobin gene; the shape;
  blocked vessels; the heel prick finds it (W2); why it's common where malaria is (honest
  evolution); hopeful treatments. Person: Marilyn Gaston (1986 study → universal newborn
  screening). HW: DNA typo decoding; carrier Punnett square; map reading.
- **W5 · X, Y, and Counting Chromosomes.** Sex chromosomes; the karyotype as 23 pairs
  (pairing and counting); trisomy 21 — what it is, why those babies visit the NICU
  (hearts), respectful and honest; why preemie boys do worse. Person: Marthe Gautier
  (did the work on trisomy 21 in 1958 and was written out — Rosalind Franklin callback).
  HW: pair-the-chromosomes puzzle; boy/girl square; read a karyotype.
- *Later:* genes switching on (why steroids before birth help), rapid genome sequencing in
  the NICU, blood types and Rh disease (James Harrison's golden arm — shared with Soc),
  cystic fibrosis and the sweat test, twin-twin transfusion, mutations and repair,
  mitochondrial DNA, the Human Genome Project, genetic counseling, epigenetics-lite, why
  human babies are born so early, CRISPR (honest and hopeful).

### Psychology 101
Week 1: measuring what babies do; senses; the wiring brain; developmental care.

- **W2 · Bonding: The Invisible Rope.** Attachment; the still-face experiment
  (Tronick, 1975); Harlow's cloth mother (honest); why NICUs push skin-to-skin (Bogotá
  W1, NICU Tutor). Person: Mary Ainsworth and the Strange Situation. HW: predict then
  observe (still face at home with a willing adult); attachment-behavior checklist.
- **W3 · Growing Up on Schedule.** Milestones as ranges, not deadlines; corrected age
  (born 8 weeks early → subtract 8 weeks); the follow-up clinic. Person: Arnold Gesell
  (filmed babies through a one-way dome, 1920s). Sneaky: calendar subtraction.
  HW: corrected-age calculations; milestone sorting; a clinic scenario.
- **W4 · Checklists Save Lives.** Why smart people make mistakes (memory, interruptions,
  fatigue); the B-17 checklist (1935) and Peter Pronovost's line checklist (Michigan,
  infections cut by two-thirds); anchoring in kid words. HW: write a checklist for a NICU
  task; find the error in a scenario; a memory-span experiment.
- **W5 · Does a Baby Feel Pain?** Until the late 1980s many believed not — Jill Lawson,
  baby Jeffrey, and K.J.S. Anand's studies (honest, powerful); measuring pain in someone
  who can't talk (brow bulge, eye squeeze, a score like Apgar); comfort: sucrose,
  swaddling, tucking, kangaroo care. HW: score faces from descriptions; plan comfort for
  a heel prick; compare two scales.
- *Later:* sleep (preemies sleep 90% and why), learning and habituation (Cat in the Hat
  callback), language and hearing screens, temperament, touch, parents' stress (honest),
  siblings, music therapy (real trials), play, the team's mind (burnout, second victims),
  deciding under uncertainty, grief and how NICUs support families (W15+), how kids learn.

### Sociology 101
Week 1: roles, hierarchy, the team, levels I–IV, rounds, speaking up.

- **W2 · Who Gets Care?** 15 million preterm births a year; where babies die and why
  (honest); US disparities by race and geography; what "public health" means; per-1,000
  rates (sneaky: rates). Person: Virginia M. Alexander (documented Philadelphia's health
  gaps, 1930s). HW: read a map and a rate table; compute per-1,000; what would help.
- **W3 · How NICUs Were Invented.** Tarnier and Budin; Martin Couney's incubator
  sideshows (1903–1943, ~6,500 babies, honest about the showman); Julius Hess; the March
  of Dimes turning from polio to prematurity; Patrick Bouvier Kennedy (1963) and the
  push for NICUs. HW: timeline sort; then-vs-now table; think question.
- **W4 · Community as Medicine.** Milk banks (Vienna 1909 → today; screening and
  pasteurization); blood donors (James Harrison, 2.4 million babies); cuddler
  volunteers; the gift relationship (Titmuss). HW: trace a donation's journey; plan a
  drive; a who-helps-whom map.
- **W5 · Who Decides?** Consent; the care conference; ethics committees; the Baby Doe
  case (1982) and rules, age-appropriately; the edge of viability and why countries
  decide differently. Person: C. Everett Koop (pediatric surgeon turned Surgeon General).
  HW: who-decides-what sort; role list for a mock care conference; think question.
- *Later:* how you become a NICU doctor (early in Unit 2 — motivating), nursing as a
  profession, global NICUs and bubble CPAP, hospitals and money, medicine's language as
  culture (word parts — NICU Tutor glossary), rituals (NICU graduation, reunions),
  visiting rules and the pandemic, research networks, family-integrated care, the NICU
  building (open bay vs single rooms), safety culture from aviation, the future NICU (W20).

### Cross-course weeks (deliberate overlaps to reinforce)
- **W2:** blood everywhere — Chem blood gas, Bio heart/blood, Physics light through
  blood, Calc intake totals, Stats growth chart, Genetics blood spots. The Week 2 final's
  synthesis question: "Blood came up in five courses this week…"
- **W3:** breathing and fairness — Chem surfactant + Bio lungs; Stats fair test +
  Seminar writing a case.
- **W4:** germs, heat, and mistakes — Bio Semmelweis + Psych checklists + Physics heat.
- **W5 (Unit 1 closer):** salt water links Chem, Physics (Einthoven's buckets), and Bio
  feeding; alarms (Stats) + monitor (Physics); "who decides" (Soc) + pain (Psych).

---

## 6. Week 2 in detail (the immediate next build)

Timetable slots (`w2-…` ids), subtitles for the cards:

| Slot | Title |
|---|---|
| Seminar | Finding the Big Idea |
| Chemistry | Acids, Bases, and the Blood Gas |
| Biology | The Heart and the Blood |
| Physics | Light |
| Calculus | How Much Piles Up? |
| Statistics | Where Do You Stand? |
| Genetics | The Heel Prick |
| Psychology | Bonding: The Invisible Rope |
| Sociology | Who Gets Care? |
| Study Hall | Week 2 Review |
| Final | Week 2 Final Exam (24 Q; 18 + 3 + 3) |

Week 2 specifics to honor:
- Seminar lecture explains the cue change ("this week the box asks *you*"); all Week 2
  cues use `cue-ask` with a reveal.
- Each lecture's warm-up: Q1 from NICU Tutor, Q2 from the same course's Week 1.
- Homework Flashback sections: one NICU Tutor item + one Week 1 item.
- Final: 3 flashback questions from Week 1 courses (Chem/Bio/Calc are the natural ones)
  + 3 NICU Tutor (choose lessons not used on the Week 1 final: L1, L3, L4, L6).
- Certificate: "advanced to Week 3". Week 3 slots added as "Coming soon".
- Vocabulary target ~100 new entries (pH, acid/base, bicarbonate, artery, vein, atrium,
  ventricle, wavelength, infrared, percentile, median, enzyme, attachment, disparity…).

---

## 7. Per-week build workflow

Repeat for every week; Week 2 adds §4 first.

1. **Read before writing:** this file's syllabus for the week, the previous week's
   promises (`grep -i "next week" courses/*/week{N-1}.html`), and the Week 1 chemistry
   page as the style reference.
2. **Schedule:** add the week block to `js/schedule.js` with every slot (pages can be
   `href: null` until built, which shows the striped preview).
3. **Data first:** `data/quizzes-wN.json` (9 × 8 + final), `data/homework-wN.json`,
   `data/review-wN.json`, vocab additions in `js/vocab.js`. Run `build_quizzes.py` early;
   lint must be clean (it is the guessable-answer check).
4. **Pages:** 9 lectures (copy the previous week's page for that course; keep body class,
   `data-root`, `LESSON`), 9 recitations (`RECITATION.total` = homework points), study
   hall, exam.
5. **Build + check:** `build_quizzes.py && build_print.py && check_links.py`. Open the
   week in the preview (`.claude/launch.json` serves `/Users/aaron/space` so the
   NICU Tutor links resolve); click through every card; take a quiz; enter a paper
   score in Professor mode; print one PDF.
6. **Review checkpoint with Aaron:** after Monday's three lectures + Seminar recitation
   (as in the Week 1 pilot), then the rest. Adjust pitch from Quinn's Week N−1 reactions.
7. **Ship:** README status line, this file's "shipped" mark, and the next week's
   "Coming soon" slots.

Expected size per week ≈ Week 1 (14k words, 96 questions, ~140 homework items, ~40 PDFs).
In practice: one session for Mon–Tue content, one for Wed–Fri + final + polish.

Keep a **people-and-experiments registry** at the bottom of this file so 180 lectures
never reuse a story.

---

## 8. Decisions for Aaron before Week 2

1. **How did Week 1 land?** Length, prose density, the sneaky math, the paper homework —
   anything to recalibrate before nine more lectures are written in the same register.
2. **Units of five with cumulative exams** at weeks 5/10/15/20 (32 questions, a bigger
   certificate) — yes, or keep every week identical?
3. **The one-time restructure** in §4 (per-week data files, `print/weekN/`, `js/schedule.js`)
   — fine to do as part of Week 2?
4. **Heaviest topics in Unit 1:** Psych W5 (pain history) and Soc W5 (Baby Doe, edge of
   viability). Both fit her tolerance for honesty; veto or reorder if you prefer them
   later in the semester.
5. **Week 5 topic picks** are mine (the original plan stopped at Week 4): Chem salt/water,
   Bio gut/feeding, Physics electricity/monitor, Calc doubling/halving, Stats alarms,
   Genetics chromosomes, Psych pain, Soc who decides, Seminar triage. Swap freely.

---

## Registry (people, experiments, NICU Tutor lessons used)

**Week 1 people:** Elizabeth Blackwell (Sem), Joseph Priestley (Chem), van Leeuwenhoek (Bio),
Torricelli (Phys), Newton–Leibniz feud (Calc), Virginia Apgar (Stats), Rosalind Franklin
(Gen), Edgar Rey Sanabria / Bogotá (Psych), Hess & Lundeen, Gluck (Soc).
**Week 1 flashbacks on the final:** NICU Tutor L2, L5, L7, L8.

**Week 2 (shipped 2026-09-09) people:** Leonardo da Vinci + Roediger & Karpicke 2006 (Sem);
Søren Sørensen (Chem); William Harvey (Bio); Takuo Aoyagi + Sister Jean Ward / Cremer (Phys);
Archimedes (Calc); Tanis Fenton (Stats); Robert Guthrie + Horst Bickel (Gen); Mary Ainsworth +
Harlow + Tronick + Klaus & Kennell (Psych); Virginia M. Alexander (Soc).
**Week 2 home labs:** red-cabbage pH (Chem), vein valves + pulse (Bio), flashlight-through-finger
+ CD rainbow (Phys), dripping cup (Calc), family hand-span median (Stats), potato catalase
(Gen), still face on a grown-up (Psych), nearest-NICU fieldwork (Soc). Seminar: none.
**Week 2 flashbacks on the final:** Week 1 Physics (mmHg), Stats (Apgar), Genetics (gene);
NICU Tutor L1 (skin probe), L3 (caffeine), L6 (suck-swallow-breathe).
**Promises Week 2 made for Week 3+:** Chem W3 soap/surfactant; Bio W3 lungs (echo/ultrasound
→ Phys W3), Bio W4 white cells, Chem W4 blood sugar/LGA, Soc W4 blood donors, Stats W3 the
fair test, Stats W5 screening nets/false positives, Psych W3 corrected age. Seminar promised
Week 3 cues only mark the spot and Week 5 has none.
**Planned W3–W5 people:** see §5 (one per lecture; no repeats).
