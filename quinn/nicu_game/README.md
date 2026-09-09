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
family, pronouns, skin tone, gestation, day of life, weight and bed. Six percent of babies
use they/them, which is exactly why every authored line has to conjugate rather than assume. Across twelve
consecutive shifts, sixty name slots produced sixty distinct names and twelve distinct
archetype combinations. A baby born during the shift is charted as "Baby Surname" until the
parents choose a name, which they tell you later in the night — that is real practice, not
a missing value.

## Pronouns and verb agreement

A singular *they* still takes a plural verb. `"They is jittery"` is not a styling problem, it
is a sentence that stops a player dead, and no amount of string concatenation after
`pronoun.s` can get it right. So pronouns conjugate themselves, in `js/names.js`:

- `pr.is` / `pr.was` / `pr.has` / `pr.does` — the irregular auxiliaries ("they **are**
  jittery", "they **were** quiet all day", "they **have** been at 98 percent").
- `pr.Is` when the verb leads a question — "**Are** they dying?"
- `pr.v("look")` for a regular verb, which adds the *s* only when the pronoun is singular:
  "she **looks** washed out" / "they **look** washed out".

Write `pr.S + " " + pr.v("look") + " washed out"`. Never `pr.S + " looks washed out"`.

**Authored text may be a function instead of a string.** Concern feedback (`accept`,
`wrong`, `decline`, `miss`), talk option labels, hints and feedback, and archetype `risks`
lines all accept `function (G, b)` — or `function (b)` for `risks` — and `say()` in
`js/game.js` resolves them. Use a function whenever a line mentions the baby or the colleague
speaking, so it can reach for the right pronoun. A hard-coded "she" in a line any baby can
trigger is the same bug wearing different clothes.

Staff have pronouns too, on `CHARS` in `js/events.js`. A concern raised by `nurseFor` is
Renata on beds 1-3 and Desmond on beds 4-6, so a line about the nurse who is standing there
must use `nursePr(b)` rather than picking one.

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

You always get an answer, and it arrives where you are looking. **The callout is sticky**, so
the request and everything said back to you stay pinned to the top of the page while you scroll
its length hunting for a control. That one property is what makes the rest simple: praise for
the right move, a correction for a counterproductive one, a neutral acknowledgement for
anything else, the reply to a decline, and the unit refusing to carry out an action all land in
the same box, and none of them needs dismissing.

There was briefly a second channel — a card pinned to the bottom of the screen with a "Got it"
button — added to solve the same above-the-fold problem. With the callout sticky it was saying
everything twice and charging a click for it, which is exactly how a resuscitation of sixteen
actions turned into thirty-two. It is gone. **The only click that clears anything is the one on
a concern that stood itself down**, because that is a request leaving the who-needs-you list and
the player should be the one to close it.

A settled answer becomes a **note** that outlives its concern, so being told you got it right
is not wiped off the screen a moment later by the next nurse arriving. You can also **decline**
any concern outright. Sometimes declining is the right call and is scored that way (refusing to
turn up the oxygen for a probe that has fallen off; choosing to watch a well-perfused baby
with a lowish blood pressure; leaving an extubation for the morning). Otherwise they come
back, marked "asking again".

**Conversations** are separate, and they stay multiple choice, because a conversation
genuinely is one. Parents and staff show a "wants to talk" badge and wait until you choose
to talk to them. There are fourteen family conversations, drawn without replacement, so no
two come round twice in a shift and no two shifts feel the same. Not all of them are heavy:
one is about a knitted hat.

**What a colleague says is frozen at the moment they say it.** Re-evaluating the line on
every render made it track the monitor, so a nurse who came to you about a cold baby would be
saying "Temperature is 36.6. Cold babies burn through their sugar" long after the baby had
warmed up — and the same stale sentence turned up in the end-of-shift report. The spoken line
and the one-line summary are captured when the concern is raised, and re-captured only when
the colleague comes back to ask again, because that is a person looking a second time.

**Situations move on, so requests can stand themselves down.** Every tick, a concern whose
condition no longer describes the baby closes one of two ways. If you had already done
something the colleague approved of, it settles as a success — which also fixes partial-credit
actions that used to work and then time out as "never came". If you did nothing and it sorted
itself out, the colleague stands down ("Never mind about Otto. The temperature has come back up
into range"), it turns green in the who-needs-you panel, and you dismiss it. Neither outcome is
scored against you, and a request that only ever stood itself down is dropped from the
denominator at handover: the night stopped asking.

**A refused action is not an answer.** Clicking Surfactant on a baby who has no breathing tube
used to be judged as your response to whatever the nurse had asked. Now the refusal is shown as
feedback and no colleague judges it, because nothing happened.

**Choice order is shuffled with the seeded RNG at render time.** Options are authored best-first
for readability, so without the shuffle the top answer would be correct in sixteen of seventeen
decisions and could be picked without reading. Never rely on authored order.

**Everything waiting is ranked by what it costs to leave it**, and shown at that intensity. A
red alarm comes first, then an urgent concern, then an amber alarm, a worry, a note, a parent
who wants to talk, and last a concern that stood itself down. The top two ranks are loud: a
filled panel, a heavier bar and a slow pulse on the same beat as the ringing phone; the bed
itself glows coral and its flag reads "needs you now". The quiet end is genuinely quiet. Before
this, a parent with a question and a nurse who needed you now differed by four pixels of border
colour. Nothing outshouts a red alarm, which is the baby rather than a colleague, and anyone
who has asked their system not to animate gets the colour and the weight without the motion.

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

**The lingo explains itself too.** The words are the real ones a night nurse uses, and each
one comes with an answer the first time it appears in a passage. When Priya says she is
*bagging*, when a nurse pulls back green *residuals*, when the handover mentions *steroids*,
*membranes* or a *heart-rate trace* — the word is underlined and says what it means. This is
automatic: `GL.markup()` scans any prose the game shows and underlines the first occurrence of
each known term, so authors write natural ward speech and never have to remember to annotate it.
About 150 definitions cover roughly 250 written forms (plurals and tenses are spelled out, since
a NICU is not the place for clever stemming). Only the *first* occurrence in a passage is marked,
so a sentence guides rather than turning into a field of dots.

Three things to keep in mind when editing:

- Panels that re-render on the clock (the ward, the monitor, the crib, slider readouts) must
  call `attachTips()` again afterwards, or the listeners are silently lost. The ward pods had
  no tooltips at all until this was fixed.
- Use `GL.term(text, key)` for a fixed definition and `GL.tip(text, sentence)` when the
  explanation depends on the baby, such as the actual oxygen percentage. Prose that a character
  speaks or that the report prints should go through `gl()`, which escapes it and then marks up
  the lingo; `esc()` alone leaves the words bare.
- To teach a new word, add it to `TERMS` **and** list its written forms in `PHRASES` in
  `js/glossary.js`. One without the other does nothing. Acronyms are matched case-sensitively,
  so the word "map" in a sentence is never mistaken for mean arterial pressure.

Every action button carries what it is for. Option hints describe what the choice *does*,
neutrally — they never argue for their own option, so a hint can never push a player toward
a wrong answer. Separately, a **thinking prompt** points at the principle without naming the
answer. Prompts are shown on Student and Resident and hidden on Attending.

Concerns carry a third line, `help`, shown under the prompt on the same two levels. The prompt
asks the question; `help` says which panel the answer lives in — "Under Assess, Glucose (heel).
Five minutes and a heel prick, before anything else." It exists because knowing what is wrong
and still not finding the control is its own kind of stuck, and it names the panel headings as
they actually appear on screen. Each concern also carries a `settled` line, which is what the
colleague says if the situation resolves — either because you helped or because it passed.

## Set pieces

- **Crises** (pneumothorax / septic shock / severe hypoglycaemia) pause the unit and force a
  differential under pressure. The pneumothorax crisis is the DOPE checklist: Displacement,
  Obstruction, Pneumothorax, Equipment.
- **The delivery room** is a *place*, not an overlay. See below.

## The delivery room

Mid-shift the phone rings and somebody tells you what is coming. You hang up — the button
says "Hang up", because you are not going back to the unit yet — and the delivery room
appears in the ward grid alongside the bedspaces, glowing coral with "needs you now". You go
there by clicking it, the same way you go to a baby.

Inside, it works like a bedside: Priya tells you what she is seeing, and you press real
controls rather than picking from a list. Sixteen actions across five panels — the first
minute, assess, breathing, circulation, the family — each costing seconds of the
resuscitation, which are also minutes off your shift. Every press answers in the sticky callout
under Priya's opening line, and the thinking prompt and the "where to act" line work exactly as
they do at a bed. Sixteen actions cost sixteen clicks and nothing else.

There is a live heart rate, a saturation judged against the **minute-by-minute newborn
target** rather than against 95, a breathing effort and a temperature that falls until
somebody stops it. You leave by deciding what happens to the baby, and the button is disabled
until the baby is actually stable enough to move — with the panel saying which of the three
conditions is not met yet.

Stepping out is not abandoning: the delivery keeps its state and you can go back. But if you
are away for twenty-five minutes — or never came at all — the labour ward registrar takes over,
that costs you, and the baby arrives in worse shape than it needed to.

**Five deliveries, and they are not the same problem.** Which one you get is drawn per shift,
and the caller describes the one you are actually going to:

| | What it teaches |
|---|---|
| 29 weeks, preterm labour | warm first, then breaths, then CPAP rather than a tube |
| Term, straightforward birth | that the right answer is delayed cord clamping, skin to skin, and *not admitting the baby* |
| Term, thick meconium, flat | that the old teaching — suction below the cords first — was overturned; it is the ordinary algorithm |
| Term, no heart rate at birth | the full algorithm in order: ventilation, then compressions, then adrenaline |
| 34 weeks, grunting | that a baby who is breathing needs CPAP, and that bagging them would be too much |

The vigorous term baby is the one worth having. Do it right and nobody comes up to the unit at
all: you keep five babies instead of six, which is a real reward for restraint. Get it wrong
and you have separated a well baby from her mother, and the report says so.

## Structure

- `index.html` title, difficulty, options · `game.html` the game shell
- `js/sim.js` the physiology engine — the only file that decides what is true
- `js/patients.js` eight archetypes; five are drawn per shift with randomised identities
- `js/deliveries.js` the five delivery scenarios, the sixteen delivery-room actions, and the
  thin resuscitation physiology that connects them
- `js/names.js` name, family, pronoun and skin-tone generation
- `js/glossary.js` plain-language definitions for every acronym and every piece of ward lingo,
  the table of written forms that marks them up in prose, and what each action is for
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
