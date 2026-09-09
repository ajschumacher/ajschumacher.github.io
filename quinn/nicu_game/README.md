# NICU Night Shift

A NICU simulation game. You are the clinician on a twelve-hour night shift with five
babies, a team who bring you problems, and families who ask you questions. Companion to
NICU Tutor and NICUniversity; it teaches by putting you in the chair rather than by
explaining.

Open [index.html](index.html) in a browser. No server, no build step, no internet needed.
Keep the folder beside `nicu_tutor` and `nicuniversity` so the cross-links work.

## The design in one paragraph

Every baby has a hidden physiological state — lungs, circulation, temperature, glucose,
bilirubin, gut, infection, brain — that evolves every five simulated minutes. The player
never sees that state. They see monitors (which have artifact), a picture of the baby
(which never lies), physical examination, laboratory results that take realistic time to
come back, and colleagues with opinions. Play consists of inferring the hidden state from
noisy evidence, intervening, and watching the trend. At the end, the hidden state is
revealed and explained. That reveal is the actual teaching payload.

## What makes it deep rather than whack-a-mole

- **Time is the scarce resource.** The clock runs while you work. Examining costs 5
  minutes, intubation 15, an echocardiogram nearly an hour to come back. Being at one
  bedside means not being at another.
- **Uncertainty is the core mechanic.** A desaturation might be a slipped probe, apnea,
  a pneumothorax, or sepsis. Each has a different investigation and a different fix.
- **Interventions have costs.** Oxygen above target accumulates eye and lung injury.
  Ventilator pressure accumulates lung damage and can cause an air leak. Blood draws
  cause anaemia. Handling and blood-pressure swings accumulate brain-bleed risk. Fluid
  given to a baby who is not hypovolaemic does harm.
- **Consequences unfold hours later**, so bad decisions do not fail instantly.
- **Routine work is done by the team.** Nurses stimulate babies through spells without
  being asked. Your job is to notice the *pattern* — why is this baby having more spells
  tonight? — not to chase every beep.
- **Asking for help scores positively**, because it should.

## Randomisation

Five of eight archetypes are drawn each shift, each with a randomised first name, surname,
family, pronouns, skin tone, gestation, day of life, weight and bed. Across twelve
consecutive shifts, sixty name slots produced sixty distinct names and twelve distinct
archetype combinations. A baby born during the shift is charted as "Baby Surname" until the
parents choose a name, which they tell you later in the night — that is real practice, not
a missing value.

## The hidden puzzles

Each baby draws one hidden problem per shift from its own weighted pool, so
the same census is a different detective story each night: early-onset sepsis, anaemia of
prematurity, respiratory distress needing surfactant, a pneumothorax, haemolytic jaundice,
hypoglycaemia in an infant of a diabetic mother, a patent ductus arteriosus, necrotising
enterocolitis, meconium aspiration with pulmonary hypertension, or simply an ordinary night
where the correct answer is to watch carefully and do very little.

## How a problem reaches you

Nothing is a pop-up quiz. A colleague raises a **concern** about a specific baby: their
face appears on that bed, in the "who needs you" panel, and against their name in the team
strip. You choose when to go. At the bedside they tell you what they saw, and then you act
with the ordinary controls — order the test, wean the oxygen, stop the feeds. The concern
judges the *action*, replies in character, and resolves. Ignore it and they ask again;
ignore that and it costs you, and the report says so.

You always get an answer. Doing the thing they asked for earns praise and settles the
concern, which stays on screen for a moment marked "settled" so success is visible. Doing
something counterproductive gets said so. Doing anything else gets a neutral acknowledgement,
so you can never be left wondering whether the game noticed. You can also **decline** any
concern outright. Sometimes declining is the right call and is scored that way (refusing to
turn up the oxygen for a probe that has fallen off; choosing to watch a well-perfused baby
with a lowish blood pressure; leaving an extubation for the morning). Otherwise they come
back, marked "asking again".

**Conversations** are separate, and they stay multiple choice, because a conversation
genuinely is one. Parents and staff show a "wants to talk" badge and wait until you choose
to talk to them. There are fourteen family conversations, drawn without replacement, so no
two come round twice in a shift and no two shifts feel the same. Not all of them are heavy:
one is about a knitted hat.

**Choice order is shuffled with the seeded RNG at render time.** Options are authored best-first
for readability, so without the shuffle the top answer would be correct in sixteen of seventeen
decisions and could be picked without reading. Never rely on authored order.

**The phone** rings in the top bar, visibly and audibly. You decide whether to pick it up.
Important callers ring back a few times; unimportant ones give up.

Only a genuine crisis interrupts you unasked.

## Hints, prompts and definitions

**Everything on screen explains itself.** Not just abbreviations: the numbers too. Hover or
tap "29 weeks" and it says that is the gestation at birth and what the baby is corrected to
now; "day 0" says day 0 is the day of birth; "1.60 kg" gives the pounds and ounces and what
is typical. In "CPAP 6 / 30%", the 6 explains that it is centimetres of water holding the
lungs open, and the 30% explains that room air is 21 percent so this baby is getting extra.
Every vital carries two explanations, one on the label and one on the value with its normal
range. Units (bpm, mmHg, cmH2O, mL/kg/d), control labels, result rows and status chips are
all covered. The rule used: if it would not be obvious to an eight-year-old off the street,
it gets hover text.

Two things to keep in mind when editing:

- Panels that re-render on the clock (the ward, the monitor, the crib, slider readouts) must
  call `attachTips()` again afterwards, or the listeners are silently lost. The ward pods had
  no tooltips at all until this was fixed.
- Use `GL.term(text, key)` for a fixed definition and `GL.tip(text, sentence)` when the
  explanation depends on the baby, such as the actual oxygen percentage.

Every action button carries what it is for. Option hints describe what the choice *does*,
neutrally — they never argue for their own option, so a hint can never push a player toward
a wrong answer. Separately, a **thinking prompt** points at the principle without naming the
answer. Prompts are shown on Student and Resident and hidden on Attending.

## Set pieces

- **Crises** (pneumothorax / septic shock / severe hypoglycaemia) pause the unit and force a
  differential under pressure. The pneumothorax crisis is the DOPE checklist: Displacement,
  Obstruction, Pneumothorax, Equipment.
- **The delivery room.** Mid-shift the phone goes and you attend a 29-week birth: warm the
  baby, ventilate, decide on support, and score the Apgar. How well you do changes the
  condition the baby arrives in.

## Structure

- `index.html` title, difficulty, options · `game.html` the game shell
- `js/sim.js` the physiology engine — the only file that decides what is true
- `js/patients.js` eight archetypes; five are drawn per shift with randomised identities
- `js/names.js` name, family, pronoun and skin-tone generation
- `js/glossary.js` plain-language definitions for every acronym, and what each action is for
- `js/events.js` concerns, conversations and phone calls
- `js/art.js` all artwork, generated as inline SVG
- `js/audio.js` alarms synthesised with WebAudio; no sound files
- `js/game.js` clock, actions, orders, concerns, crises, scoring, end-of-shift report

Script and stylesheet URLs carry a `?v=N` version tag, and `index.html` holds a matching
`BUILD` constant that it appends when it navigates to `game.html`. **Bump both whenever you
edit a file**, or browsers will keep serving the cached old copy and your change will appear
to do nothing. This has caused confusion more than once, including a stale `game.html` that
silently loaded an old script set.

## Level defaults

The three levels own their settings. Picking a level always applies *all* of its defaults,
so the selector and the checkboxes cannot drift apart:

| | Thinking prompts | Babies can die |
|---|---|---|
| Student | on | off |
| Resident | on | on |
| Attending | off | on |

Alarm sound is a personal preference and is never changed by the level. You can still
override a level's boxes deliberately; the line underneath then says the settings are
changed from that level's defaults and offers a reset.

## What the difficulty levels actually change

| | Student | Resident | Attending |
|---|---|---|---|
| Babies | 4 | 5 | 5 |
| Mid-shift admission | never | yes | yes |
| Apnea tendency (avg) | 0.25 | 0.40 | 0.48 |
| Minutes before a hidden sepsis declares | ~69 | ~16 | ~4 |
| Brain-bleed threshold | 1.57 | 0.98 | 0.83 |
| Intubation failure rate | 5% | 13% | 24% |
| Minutes critical before death | 220 | 150 | 150 |
| Thinking prompts | shown | shown | hidden |

## Tuning notes

`Sim.lungFunction` and `satFrom` are the two functions that set the feel of the whole game.
They are calibrated so a healthy baby on room air reads 96-98, a stable 26-weeker on CPAP
in 28% oxygen sits around 93-95, and severe respiratory distress on 30% sits in the 80s and
responds to more oxygen and to surfactant. If you change them, re-run the calibration sweep
described below before playing.

Verification used during development, run in the browser console:

- a sweep of 40 seeds checking opening vitals and that almost no bed alarms at handover
- a twelve-hour run with **no** care versus **competent** care. Competent care should show
  roughly 20 critical minutes per baby, no NEC and no deaths; total neglect should show
  around 160 critical minutes, NEC in a fraction of shifts, and occasional death
- 30 full shifts across all three difficulties with every event condition and text function
  exercised on every tick, checking for exceptions

## The end-of-shift evaluation

Scored by **proportion of what the night actually asked of you**, not by accumulated points.
Five domains, each rated strong / fair / shaky / poor with its own bar and, when it falls
short, a sentence saying exactly what went wrong:

| Domain | Weight | Measures |
|---|---|---|
| Answering your team | .30 | concerns dealt with, counted by unique concern |
| Clinical judgement | .25 | good decision points against poor ones |
| Gentle care | .18 | oxygen overshoot, ventilator pressure, blood draws, comfort |
| The families | .17 | trust, and conversations taken against offered |
| Keeping them safe | .10 | overrides, untreated positive cultures, long critical stretches |

Three rules keep it honest:

- **Domains that never came up are excluded and the weights re-normalised**, so you cannot
  earn credit for gentle ventilation on a night you never touched a ventilator.
- **The weakest important domain caps the headline.** Any domain under 0.35 caps the shift at
  "Rocky"; under 0.20 caps it at "Difficult night"; a death caps it lower still. "Outstanding"
  is only reachable when every domain is strong.
- **There is no starting credit.** The previous version began at 50 out of 100, so a shift
  where almost nothing happened still read as "Solid". It now starts at nothing and is earned.

Measured behaviour, deaths disabled so the bands are visible:

| Play | Concerns dealt with | Grade |
|---|---|---|
| Ignored almost everything | 0 of 13 | Difficult night |
| About half, some conversations | 2 of 6 | Rocky |
| Nearly all, took the conversations | 9 of 9 | Outstanding |

The report also lists **What nobody came to**: every concern raised during the night that was
never dealt with, named by bed, baby and colleague.

## A note on mortality

Babies can die, but only after a sustained critical state that was repeatedly ignored, and
never as a random event. A death caps the shift grade regardless of everything else, leads
the report, and is followed by an honest debrief rather than a game-over screen. Untick
"babies can die" on the title screen to disable it; it is off by default in Student mode.
