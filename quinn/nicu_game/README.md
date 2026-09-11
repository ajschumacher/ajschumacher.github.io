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
  bedside means not being at another. See "How time moves" below: the clock walks beside
  you at a cot and runs on when the unit is quiet, and you never set it yourself.
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

## The picture that never lies

It is the only thing in the game promised to be honest, so the face has to read correctly at
every value, and the thresholds in `Art.baby` deliberately match `describeLook()` so the picture
and the sentence under it can never disagree. A settled smile is *earned*: not apneic, not dusky
or mottled, comfortable and not in pain. Everything else gets a slack mouth, a grimace, or an
open one.

`look.apneic` exists because `workOfBreathing()` returns **0** during a spell — a baby who is not
breathing is not working at it — which used to fall straight through to the resting face. The
sickest baby on the unit smiled, and so did the flat, blue 29-weeker in the delivery room, whom
Priya had just described as "floppy, blue, no cry". An apnoeic baby is now drawn limp: arms flat
rather than in the splayed frog-leg posture, and a slack mouth.

In the delivery room, `d.tone` is **muscle** tone (0..1) and `d.skin` is the skin-tone letter Art
wants. Those two used to share the name `tone`, so the look reached for `d.sc.tone`, which no
scenario has, and every baby born downstairs came out the same colour.

## The hidden puzzles

Each baby draws one hidden problem per shift from its own weighted pool, so
the same census is a different detective story each night: early-onset sepsis, anaemia of
prematurity, respiratory distress needing surfactant, a pneumothorax, haemolytic jaundice,
hypoglycaemia in an infant of a diabetic mother, a patent ductus arteriosus, necrotising
enterocolitis, meconium aspiration with pulmonary hypertension, or simply an ordinary night
where the correct answer is to watch carefully and do very little.

**The reveal is assembled from what actually happened, not from what the puzzle meant to
teach.** Each puzzle carries a `truth` and a `key` written for the course its author expected.
When the night went somewhere else those lines stop being a lesson: a baby who died of
untreated hypoglycaemia was once debriefed with *"settled quickly once fed... resist the urge
to do more"*. `revealFor()` in `js/game.js` now reads the hidden state the baby ended in and
names what was still unanswered at handover, and only offers the authored lesson when the
course it was written for is the course the baby took.

**Every non-benign puzzle carries a `dx` block, and the game asks it two questions.**
`dx.found(b)` is "did the player ever send something that would have shown this"; `dx.fixed(b)`
is "did the plan then change". Before this, `b.puzzle` was read in exactly one place in the
whole codebase — the reveal — which meant a shift could pass without a single test being sent
at a cot and still be scored clean, and the report would print the answer at seven in the
morning as if it had been earned. Both questions now feed `openAtHandover()`, so *nobody ever
established what was actually wrong* and *what was wrong was found, and then left alone* are
things the day team inherits and the grade reflects.

`dx.test` is the sentence that names the test in the debrief. Every cot card now carries a
**What you had to go on** line, because "you never looked" and "you looked and did nothing"
are the two different lessons in this game and they used to read as the same card.

**A puzzle whose `truth` asserts a good outcome is marked `benign: true`.** Eight of them are.
If that baby dies or ends the shift worse, the benign lines are withheld entirely and the
reveal says the truer and more useful thing: there was nothing hidden here, and what happened
was done to this baby rather than found in them. When you write a new puzzle, ask whether its
`truth` is a *diagnosis* or an *outcome*. If it is an outcome, it needs the flag.

## Reference ranges

A blood count came back as `WBC 6.2 / Hgb 9.4 / CRP 14` with nothing to compare it against,
which teaches a beginner only that numbers exist. Every analyte with a meaningful range now
carries one on hover, and **the number that is actually out of range is marked** — the row used
to turn red as a whole, which said "something here is wrong" without saying which of the three
numbers it was.

The ranges live in `C.ref` in [`js/clinical.js`](js/clinical.js), alongside the sentence the
player reads, so a clinician changing a bound is changing what is taught and the two cannot
drift apart. **The suite enforces that every bound appears in its own tip**; that check
immediately caught a haemoglobin floor of 9.5 sitting next to a sentence describing 9 to 11 as
the expected nadir.

**Age-dependence is carried in words, not in the model.** Almost every one of these bands really
moves with postnatal age — a day-one white count of 25 is normal and the game will mark it high
— and modelling that properly would complicate the sim for very little teaching return. Instead
each tip says what moves and which way, so a learner meets the caveat at the point of confusion.
`CLINICAL.md` §11 tabulates all eight.

The label on screen is **`Expected`, not `Normal`**, because two of the six bands are not normal
ranges: the CO2 ceiling is what permissive hypercapnia allows, and the haemoglobin band runs
from the physiological nadir to polycythaemia. Each tip says what both ends mean.

Narrative results — films, echo, head ultrasound, culture — have no range and keep their plain
sentence. A lab record grows an optional `parts` array; without one, `labValueHtml()` falls
back to the old string, so adding a test with no range needs no new code.

## An action that works has to say so

From a playtest: *"I'm pretty sure I've pressed Call the attending and nothing has happened."*
Nothing had. Two bugs, one inside the other.

**`doAction` swallowed all good news.** It surfaced a result at the bedside only when the kind was
`"warn"` or `"bad"`:

```js
if (kind === "warn" || kind === "bad") setNote(b, kind, msg);
```

**Eighteen actions answer with a confirmation** — *surfactant given and the chest moving more
easily*, *air hissing out of a chest*, *red cells in and the baby pinker*, *portholes shut* — and
not one of them appeared where the player was standing. They all went to the unit log, at the
bottom of a side panel that is closed at a bedside. You pressed a button, some numbers moved, and
nobody told you it had worked. One line: `if (kind && !r.quiet)`.

**And a phone call should be a phone call.** Ringing the attending was the worst case of it,
because the message *is* the entire feature: Dr. Halvorsen's paragraph of advice, the most
information-dense thing in the game, delivered into a log line. It is a modal now, in the same
shape as the call she makes to you — and she asks before she tells:

> *"Ingrid."* She sounds wide awake, and not at all surprised. *"Before I say anything — tell me
> what you are seeing."*

Both answers get the steer. Talking her through what you see scores more than saying you are not
sure, but **saying you are not sure is why you rang**, and this game does not punish it: *"Good,"
she says, and means it. "The ones who never ring are the ones I worry about."*

What she said goes into that cot's history with her actual words on it, because the modal closes
and what she told you at half past two is the thing you want to read back at six. `r.quiet`
suppresses the bedside note for an action whose answer arrives somewhere better.

## Every scenario has to be playable

From a playtest: *"it said Ndidi had meconium aspiration with pulmonary hypertension. I could tell
something was wrong but I never figured out what to do, and after reading the feedback I still
don't know."*

A hidden problem is only a puzzle if **somebody points at it** and **there is something to do about
it that the game then acknowledges**. Auditing all sixteen non-benign puzzles — forcing each onto
its archetype and running the night with no player action — found three that failed the first test
outright and a systemic reason why several more were failing it intermittently.

**All three infection puzzles had nothing pointing at them.** Early-onset sepsis in the 25-weeker,
late-onset on a central line, pneumonia in the term baby: the unit raised a low blood pressure,
which is a late consequence, and never once said the word. The debrief then told the player that
*"temperature instability plus 'just not right' plus a central line means culture and antibiotics
tonight"* — describing signs nobody had been shown. `notright` is the fix: the most important
sentence in neonatology and the hardest to teach, because it is a gestalt rather than a number. She
cannot tell you what is wrong, only that something is, and in a newborn that is enough to act on.
Chasing the blood pressure instead — a bolus, or a pressor — is marked wrong.

**And the urgent concerns were starving the quiet ones.** `QUEUE_SOFT_CAP` was a flat 8, from when
the game had nine kinds of concern; there are twenty-four now, eight of them urgent, and urgent was
the only severity that bypassed the cap. Measured across eight shifts, **the queue sat at or over
the cap 49% of the time**, and while it did, twelve non-urgent concerns were being suppressed —
including `jittery`, `murmur`, `yellow` and `cold`, which are the only things pointing at
hypoglycaemia, the duct, jaundice and a cold baby.

A player can ignore a row in a panel; they cannot act on something they were never told. The cap
now scales with the census and is a brake on a pile-up rather than a permanent silence. The effect
was redistribution, not noise: **the same 33 raises a shift, now spread across 21 kinds instead of
crowding into the loud ones.**

`POINTS_AT` in the suite is the permanent guard — every puzzle, the concerns that legitimately point
at it, asserted to fire across a spread of shifts. A companion check asserts each of those concerns
**accepts an action that the puzzle's own `found()` or `fixed()` test names**, so a signpost can
never point at a locked door.

### The pulmonary hypertension baby specifically

Three things were wrong with it, and the first was the one that made the debrief useless:

- **The reveal asserted the outcome.** `truth` read *"the lung blood vessels **stayed** clamped
  shut"* — so a player who found it, called for help and kept the baby undisturbed all night was
  told in the first line of their debrief that nothing had changed. This is the same trap the benign
  puzzles carry a flag for, arriving from the other direction: a `truth` has to state the
  **diagnosis**, never how the night went.
- **Perfect play could not finish the job.** Echo, attending called, comfort care kept up all night
  took a worst-case baby from 0.45 only to 0.35 — still flagged. The clearance rate is faster now,
  and `openAtHandover` judges **trajectory rather than level**: a third better by morning is a baby
  being managed, not a problem handed over mid-course.
- **The lesson named principles, not controls.** *"Keep the baby calm and call for help early"* is
  true and unactionable. It now names Echo, Comfort care and Call the attending.

## This baby's night

The unit log is one stream for five cots, so *"what has actually been done for this baby, and
when"* meant reading past everybody else — and a chest film from four hours ago looked exactly
like one from ten minutes ago.

Every cot now keeps its own history, under Results in the left column, newest first:

```
00:40   Blood gas: pH 7.36 / CO2 41 / base deficit 2        1h 25m ago
23:00   Blood gas requested                                 1h 40m ago
22:00   Renata Cruz raised: cold, and the isolette is open   2h 40m ago
20:55   Comfort care — Sana settled with containment         3h 45m ago
19:55   The isolette porthole was left open                  4h 45m ago
```

It is assembled from the places that already know which baby they are talking about rather than
by parsing the log: `doAction` records every action at a cot, `deliverResults` records every
result as it comes back, the director records a colleague arriving and a concern settling, and the
sim's own flags record an air leak, a tube that moved, a bleed. **`b.history` is structured, not
scraped**, so each entry carries the clock time it happened at and can be coloured by what kind of
thing it was.

**And the Results list now shows each result's age** — *"Chest X-ray 19:30 · 5h 5m ago"* — which
was the point of the request. A test asserts it.

Two things worth knowing if you extend it. **An order that goes off says nothing**: the three order
functions answer only when they decline, so a bare "Chest X-ray" in the history would read as a
film that had come back rather than one on its way — hence "requested". And **nothing stored may
carry markup**: `testLabel()` returns a hoverable span, so a history entry built from it arrives on
screen as visible `<span class="gl" data-tip=...>`. There is a `testName()` for text that will be
escaped later, and a check that no stored entry contains a bracket.

## One conversation at a cot

From a playtest, once the unit had enough going on to make it visible: *"were two people
trying to talk to me at the same bed? was one's message covering the other's? it just got very
busy."* They were. `openConcernFor()` returned the first non-done concern in creation order and
the callout rendered that one — **nothing on screen said the others existed**, and nothing let you
reach them.

Colleagues waiting to speak now share **one row of faces** with the parents and teaching moments
that already had one, because to a player standing at a cot they are the same question: who is here,
and who am I talking to? The open one is marked *talking* and is not a button that will take you
somewhere else; the rest say what they want and *Speak →*. Most pressing sorts first.

**Nothing takes the conversation off you.** Not a new arrival, however urgent, and not leaving the
cot and coming back — `G.openConcern` remembers your choice per bed. Somebody more pressing joins
the front of the row and waits there to be picked. The one exception is a card that has already
stood itself down, which is not a conversation any more and steps aside for anybody who needs you.

**An action now answers whoever asked**, not whoever happens to be on screen. With two colleagues
at one cot, `judgeConcern` judged only the open conversation — so doing exactly what the second one
asked was answered by the first, or by nobody. And arriving at a cot marks everyone waiting as seen,
since the row shows what each of them wants.

## A concern that settles is news, not a chore

The same playtest: *"I was quickly buried in old messages that wanted me to dismiss them."* A
stood-down concern queued in the who-needs-you panel as **"settled on its own · dismiss it"** — a
chore wearing the clothes of a task — and each one needed a click at its own bed to clear.

They are gone from the panel entirely: they do not need you, which is the whole point of them. At
the cot the card arrives, reads for a few seconds and clears itself — twelve game-minutes once
you have seen it, forty-five if nobody ever came. The button is still there, relabelled *Close*, for
anybody who wants it gone now.

## No dead buttons

Two buttons shipped doing nothing: **"Live this shift again"**, and the faces in the row above.
There is one delegated click handler reading a selector list, and anything not named in that list is
a button with no error, no clue, and exactly the appearance of a button that works. Worse, the test
for the first one stubbed `window.location` and skipped itself when it could not — which it could
not — so it passed green over a dead button.

The list is exported as `NG.CLICKABLE` and the suite now walks the ward, a bedside and the report
asserting that **every button on the page matches it**. The replaced test measures the config write
instead, which happens before the navigation and is observable whatever the browser does with it.

## The unit acts on its own

For a long time the only thing that ever moved a baby's oxygen was the player's slider. Measured
across twenty-four neglected shifts, **every baby ended on exactly the FiO2 it started on** — a
desaturating baby sat at 79 percent for hours with nobody responding, and the high-saturation
concern fired 8.3 times a night because nobody weaned either.

It also silently disabled most of the game. A reachability sweep — every concern's `cond()`
evaluated against every baby every tick, across 3,600 baby-ticks — found that **eight of the
seventeen non-parent concerns were never once true**. `risingwork`, `risingoxygen` and `swinging`
all gated on a FiO2 that only the player could have set, so a traced RDS baby spent an entire night
at a work of breathing of 0.76 — grunting, deep retractions — and drew no comment at all, because
the dial happened to read 30 percent.

`stepNursing()` in [`js/sim.js`](js/sim.js) fixes the cause. She titrates to hold each baby in the
target range, and three details matter:

- **She reads `trueSat`, not the monitor.** She is standing at the cot and can see the baby, so a
  slipped probe reading 74 percent does not make her turn the oxygen up. Chasing it would have had
  the game making the game's own signature mistake on the player's behalf.
- **Up fast, down slow.** Safety is urgent, weaning is a conversation — and keeping the descent
  slow leaves the decision, and the credit for it, with the player.
- **She stops at a ceiling** (`CL.o2Nurse.ceiling`, 0.45). Past that she wants a doctor at the cot
  rather than another adjustment, and `h.o2Ceilinged` counts how long she has been stuck there.

`stepCares()` is the same idea for handling: nappies, observations and a blood pressure cuff happen
to a baby three or four times a night whether or not a doctor decides anything. Nothing generated
handling except the player before this, which is why a pulmonary-hypertensive baby looked perfectly
steady all night — the lability that *is* the diagnosis needs something to be labile about.

**FiO2 is now a readout rather than a knob.** A rising requirement is something the player
discovers, which is what it is at three in the morning.

### The open porthole

`cold` was the last concern in the game with no natural route to it. The thermal model works — an
open isolette really does take a 25-weeker down to 34.5 in half an hour — but every baby is on
servo control, so nothing ever made one cold unless the player opened the isolette themselves.

So sometimes somebody's parent leaves a porthole open. They reach in to touch their baby and it
does not quite click shut behind them; it is one of the most ordinary things that happens in a
neonatal unit, and it costs the smallest babies half a degree in ten minutes. `checkPortholes()`
in [`js/game.js`](js/game.js) runs it about once in fifteen visited hours, only on the humidified
isolettes — which is to say only on the babies for whom it matters — and never while a baby is on
somebody's chest or in the middle of a crisis.

Closing it is **"Close the isolette" under Care**, five minutes, marked urgent while it is open.
It used to be that the only way to shut a porthole was to nudge the isolette temperature slider
past 36.4 and notice the side effect. The action pays for spotting it and the concern pays
separately for answering the nurse who asked, so a player who catches it before she does is not
worse off for being quick.

**The nurse names the cause and does not blame anybody for it** — *"I think Oona left it after
sitting with him, and nobody has been past since. No harm meant by it, but cold babies burn through
their sugar"* — and the suite asserts that, because a game that made parents into hazards would be
getting something important wrong. It also gives a shift a problem that has nothing to do with the
illness in the cot and everything to do with the room, which is a fair share of what a night shift
actually is.

## The respiratory arc

Six concerns now form one escalating story, and all six were measured firing on their own in
ordinary shifts:

| | fires when | raises/shift |
|---|---|---|
| `risingoxygen` | the requirement has crept above this baby's own floor | 0.6 |
| `risingwork` | **the baby** is working hard, whatever the dial says | 2.3 |
| `needsoxygen` | a baby in room air is under target and there is nothing to turn up | 0.4 |
| `tiring` | the CO2 has risen above the baby's own baseline | 4.1 |
| `swinging` | the saturation will not follow the oxygen | 0.9 |
| `o2ceiling` | the nurse has run out of room and needs a decision | 1.4 |

Two of those never existed. **`tiring`** closes the oddest gap in the game: the sim models CO2
carefully — a traced RDS baby went from 56 to 82 across a night — and not one concern had ever
looked at it. The nurse cannot read a CO2 off a monitor either, so what she brings you is the
bedside picture of a baby who has gone quiet and stopped fighting, and a gas is the answer to it.
It fires on a *rise* above a slow-following baseline rather than on a level, so a baby who settles
at a new normal stops being chased and one who is still climbing does not.

**RDS also ran backwards.** Severity decayed from the first tick and surfactant matured at a flat
rate, so an untreated severe baby measurably *improved* across a night — saturations 90 to 95, work
of breathing 0.76 down to 0.55 — while the debrief told the player that CPAP was never going to
hold those lungs open. Real surfactant deficiency worsens for the first day or so, because a lung
too immature to make it is consuming what little it has. `CL.rdsCourse` keys that off `h.ageH`,
real hours of life, and scales all of it by how deficient the lung actually is, so the benign
"mild" puzzle stays benign while the real one deteriorates all night.

Traced, untreated, on CPAP: FiO2 30 → 45 percent, work of breathing 0.83 → 0.93, CO2 59 → 73,
reaching the nurse's ceiling by morning. Given surfactant at hour one, none of it happens. Neglect
now costs about one death a shift; **scripted expert play across eight shifts lost nobody.**

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

**But nobody waits all night.** A conversation goes when the parent goes home, or after about
two and a half hours when the moment has simply passed, and it says so quietly in the log.
They used to sit in the who-needs-you list from the moment they were offered until you took
them, so by five in the morning the panel was mostly ten-hour-old requests — a parent still
waiting to ask about a photograph they had wanted at five past seven. Fourteen rows, half of
them stale. Letting them expire also frees the one-conversation-per-baby slot, so more of the
fourteen get seen in a night instead of the first four blocking the rest.

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
feedback, no colleague judges it, and **it costs no time**, because nothing happened.

The other side of that rule: **a harmful action is not a refusal.** An unnecessary transfusion,
a bolus into a baby who is not dry, a needle into a chest with no air in it, ibuprofen for a
duct that was never open — those all happen, do their harm, and are scored. Ibuprofen used to
refuse itself and *then* score the player for having done it, which is both of the rules broken
at once, and it meant the murmur concern's "treating a duct you have not looked at" line could
never fire, because a refusal never reaches a colleague to judge. Sending a
test that is already running is a refusal too: it names the test and says when it comes back.
That case used to be silent - it charged the full ten minutes, sent nothing, said nothing, and
still let the nurse credit you for it.

**Credit is paid once per action per concern.** An `accept` entry that does not resolve used to
pay out on every click, so one button held down could earn the judgement domain outright. The
colleague still answers every time and a resolving action still resolves; only the points are
spent once.

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

**Everyone in that list takes you to what they want.** A conversation row takes you to that
baby's cot *and* opens the conversation, because a conversation about a baby happens at that
baby. This was broken in a way worth recording: a ward cot carries `data-bed="<index into
G.babies>"` and a conversation row in the side panel carried `data-bed="<bed number>"` — the
same attribute name meaning two different things — and the click handler tested `data-bed`
before `data-talk`. So a parent waiting at bed 1 took you to bed 2 and opened nothing, and a
conversation about the **last** cot in the census indexed past the end of the array and the
click threw outright. Conversations now carry `data-talk-bed`, are routed first, and
`openBed()` refuses a cot that is not there.

**An alarm row is the monitor, not a colleague**, and says so on hover. Nobody has come to
tell you about it; it is the baby asking rather than a person.

**The team strip explains itself.** It was four names, a bare job description in a native
`title`, and an amber dot that pulsed at you and was documented nowhere. Hovering now gives
the name, the role, which cots they hold, and what they are waiting on you for — and the dot
says what it means, which is that this is the third place a request shows up, alongside the
cot and the list above. When somebody does want you, their chip is a button that takes you
to them; when they do not, it is not.

**A person at a bedside outranks the monitor about that bed.** If a colleague has an open
concern about a baby, that baby's *amber* alarm is folded into it rather than listed beside it.
"Sitting high on extra oxygen" used to appear twice in one panel — once as Renata asking you to
come, once as a monitor — at two different priorities, with the machine ranked above her. A red
alarm is always shown regardless, because that one is the baby rather than a colleague.

**Dr. Halvorsen is at home, so she telephones.** Her check-in was written as a conversation
and opens with "It is Ingrid. I am at home but wide awake" — while appearing in the
who-needs-you list as somebody standing on the unit wanting a word. She is a call now, and
rings back once, because a consultant checking in on a night shift does.

**The phone** rings in the top bar, visibly and audibly. You decide whether to pick it up.
Important callers ring back a few times; unimportant ones give up. A caller who rings out waits
at least an hour before trying again — the guard that enforces that keys off `lastCallEnd`,
which used to be set only when a call was *answered*, so ignoring the phone made it ring again
five minutes later.

**A baby who dies takes their bedspace's requests with them.** Every open concern and every
waiting conversation for that bed is closed at the moment of death. A parent left in the
"who needs you" list with "wants to talk" against a baby who has just died is the cruellest bug
this game could have had, and it had it.

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

Two things to keep in mind when editing:

- **Tooltips need nothing.** One delegated listener on the document reads `data-tip` and
  `data-term` wherever they appear, so markup that explains itself keeps explaining itself
  through any number of redraws. There used to be an `attachTips(root)` that had to be called
  again after every re-render or the listeners were silently lost - a rule an author had to
  remember on every edit, and one the ward pods went without for a long time. The same now
  goes for clicks: anything pressable carries a `data-` attribute and one handler reads it.
  **What a redrawn panel does still need is a `data-focus-key`** on anything focusable, so
  the keyboard survives the redraw. See "Reaching all of it".
- Use `GL.term(text, key)` for a fixed definition and `GL.tip(text, sentence)` when the
  explanation depends on the baby, such as the actual oxygen percentage. Prose that a character
  speaks or that the report prints should go through `gl()`, which escapes it and then marks up
  the lingo; `esc()` alone leaves the words bare.
- To teach a new word, add it to `TERMS` **and** list its written forms in `PHRASES` in
  `js/glossary.js`. One without the other does nothing. Acronyms are matched case-sensitively,
  so the word "map" in a sentence is never mistaken for mean arterial pressure. What an
  *action* is for is not in this file - it lives on the action itself, as `info`.

Every action button carries what it is for. Option hints describe what the choice *does*,
neutrally — they never argue for their own option, so a hint can never push a player toward
a wrong answer. Separately, a **thinking prompt** points at the principle without naming the
answer. **One checkbox on the title screen controls both**, and it means what it says: with it
off there are no thinking prompts, no `help` lines and no option hints anywhere. The level sets
the box — Attending defaults it off — but it no longer overrules the player afterwards. Ticking
"Show thinking prompts" on Attending used to do nothing at all while the note underneath
reported that the settings had been changed from the Attending defaults.

Concerns carry a third line, `help`, shown under the prompt on the same two levels. The prompt
asks the question; `help` says which panel the answer lives in — "Under Assess, Glucose (heel).
Five minutes and a heel prick, before anything else." It exists because knowing what is wrong
and still not finding the control is its own kind of stuck, and it names the panel headings as
they actually appear on screen. Each concern also carries a `settled` line, which is what the
colleague says if the situation resolves — either because you helped or because it passed.

## How time moves

There were 1x / 2x / 4x buttons, and they were not speeds. "1x" ran the clock at about a
hundred and twenty-five times real time; the player was being asked to set a number that
meant nothing to them, and the fastest useful thing you could do with it was hold down 4x
and hope. They are gone. **Nobody sets the clock. Where you are and what is waiting for you
set it.**

| | game minutes per real second |
|---|---|
| A decision on screen, or paused | **0** — the world waits for you |
| In the delivery room | **1/60** — a second is a second |
| At a cot, with the phone ringing, or with a birth waiting for you | **0.5** — one real second is thirty seconds of the night |
| Moving around the unit | **1.5** |
| Standing in a quiet unit, after a few seconds | **builds to 8** — a game hour every seven seconds |

The pace at a cot is the point. It is slow enough to read a callout and think, and it makes
the *action costs* legible for the first time: a five-minute examination is ten seconds of
standing there, but pressing the button spends it instantly. Thinking is cheap and acting is
expensive, which is the whole argument of the game and was previously drowned out by an
ambient clock running at two game-minutes a second.

**The run-up is what gets you through an hour-long echo.** Stand in the ward with nothing
happening and the clock builds — the top bar says `»» running on` — so a wait for a blood
gas is ten seconds rather than a chore. It is a run-up rather than a switch because you pass
through the ward constantly, and snapping to full speed on arrival would tax navigation.

Two kinds of interruption, and the difference matters:

- A **hold** — a red alarm, or a colleague who needs you now and has asked twice — stops the
  clock *building*. It does not make it crawl. The first version of this pinned the whole
  unit to the bedside pace whenever any baby was red, which sounds principled and plays
  badly: a baby you cannot fix yet, because you are waiting on a gas, locked the player out
  of passing any time at all. Neglect was being punished with tedium instead of with the
  handover report.
- A **notice** — a colleague asking, a parent wanting to talk, a result landing, the phone —
  resets the run-up so you get a beat to see it, then lets the clock build again if you do
  nothing. Notices cannot hold, because conversations never expire: if a waiting parent held
  the clock the way a red alarm does, the first conversation of the night would switch
  fast-forward off for good.

**You watch what an action costs.** Press Intubate and the clock face winds forward fifteen
minutes over about a second with `+15 min` beside it. The world jumps immediately — six
callers depend on `G.advance()` having finished when it returns — and only the *face* lags;
`G.clockLag` is drained by `windClock()` on each frame. It is a presentational animation over
an instant state change, which is why it cost nothing in re-entrancy risk.

**The delivery room runs in real time, and it is the same clock.** It is the one place in
this game where the medicine is written in seconds — the saturation target moves minute by
minute, compressions come in thirty-second cycles, and the first minute is the first minute
— so compressing it the way a twelve-hour shift is compressed would make the algorithm
meaningless. It is a different *rate*, not a different clock: `frame()` advances `d.sec` and
the shift clock from the same number, so they cannot drift.

They used to. An action moved the resuscitation by its own cost in seconds and the shift by
roughly twice that in minutes, and between button presses the resuscitation froze solid —
the baby's temperature fell only when you touched something, so dithering was free and acting
was what cost. `DEL.advance()` now banks fractional time instead of rounding every call up to
a full ten-second beat, and the room is split into a shell and a live part the way the bedside
is, so the timer, the baby, the monitor and the gate on leaving all move on the clock without
rebuilding the buttons under the player's hands.

**A birth waiting for you holds the clock at the bedside pace**, wherever you are. Twenty-five
minutes before the labour ward registrar takes over is fifty real seconds — enough to finish
what you are doing and not much more, which is the intent. Without that it would have been
three seconds, because the ward would have been free to run on.

**While you are away, the baby holds rather than drifts.** That is a claim about Priya, not an
exemption from the clock: left alone a good respiratory therapist keeps a baby where it is,
and cannot take the next step of the algorithm because that is the part that needed you. The
cost of being away is the takeover timer.

**Two things had to move from game time into real time**, because the person they are for
lives in real time: how long the phone rings before the caller gives up (22 seconds, checked
on the frame rather than the tick), and how often an alarm may sound (a 2.5-second floor,
or a red bed would beep every couple of seconds while the clock was running on).

**Frames are counted exactly or not at all.** A gap over a second and a half is the machine
being busy rather than time passing, and is dropped. Clamping it instead looked safer and was
worse: a browser throttling a background tab to one frame a second had forty percent of every
frame quietly discarded, so the night ran at two thirds speed and both clocks drifted from
real time without anything on screen looking wrong. (`document.hidden` is the obvious test for
this and is not safe to depend on — it reads true in some embedded contexts, where it would
stop the game dead.)

`Sim.TICK` stays at five game minutes. Dropping it to one would be tidier — the clock face
would not need its accumulator — but the integrated noise terms (`coreTemp`, `map` and
`glucose` all do `+= ... + noise(sigma)`) would pick up roughly √5 more jitter per unit of
time, and that means recalibrating the physiology the balance work sits on. The frame loop
accumulates fractional minutes in `G.acc` and steps the simulation whenever a full five have
come due; the face reads `G.min + G.acc - G.clockLag`, so it moves smoothly regardless.

Pause stays, on the button and on the space bar. It is the only way to freeze something you
catch sight of mid-run-up, and this game has always promised no penalty for thinking.

## Comfort has a price

The Care panel used to offer only things that were unambiguously good — nest the baby, put
them on a parent's chest — so pain was something a player could always reduce for free.
**Morphine** is the one that costs something. It takes pain away better than anything else on
the unit, and it takes the drive to breathe with it: fewer grimaces, more spells, and a
harder extubation.

It is a level rather than a switch. It reaches full effect over about forty minutes and takes
a couple of hours to clear, which is what makes *stop it before you pull the tube* a plan you
have to make in advance rather than a button you press on the way past. The same baby on the
same settings is extubated "struggling, this may not hold" while it is running and "doing
well" once it has worn off. Starting it on a baby who was already settled is scored against
you, like every other treatment given to someone who did not need it.

The physiology was already there — `spontDrive - 0.35`, apnea risk half again — modelled in
`js/sim.js` since the beginning with nothing in the game able to prescribe it.

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

Inside, it works like a bedside — including the clock, which runs there at one second per
second. The baby cools while you think about it, the heart rate falls while nobody is
ventilating, and the two-minute gate on leaving is two real minutes if you stand still or
two minutes of algorithm if you work. Priya tells you what she is seeing, and you press real
controls rather than picking from a list. Sixteen actions across five panels — the first
minute, assess, breathing, circulation, the family — each costing seconds of the
resuscitation, which are the same seconds off your shift rather than a second helping of
them. Every press answers in the sticky callout
under Priya's opening line, and the thinking prompt and the "where to act" line work exactly as
they do at a bed. Sixteen actions cost sixteen clicks and nothing else.

There is a live heart rate, a saturation judged against the **minute-by-minute newborn
target** rather than against 95, a breathing effort and a temperature that falls until
somebody stops it.

**The room tells you whether it is working.** "Now watch the heart rate: that is your read on
whether it is working" is the single most important sentence in a newborn resuscitation, and
the room used to ask the player to watch a number that said nothing about which way it was
going. Now the heart rate and the saturation each carry an arrow for the last half minute,
the saturation shows the minute-by-minute target beside it rather than only in a tooltip, and
"Where things stand" carries a **Response** line read off the state in the order NRP asks it —
*"the chest is not moving, so none of those breaths are reaching the lungs"*, *"under 60 with
the breaths going in — this is the moment compressions start"*, *"heart rate climbing, what
you are doing is working"*. It reports what **is**, never what to do next, so it stays honest
on Attending where the prompts are off. The gate on leaving is a checklist rather than a
sentence, so you can watch each of the three conditions tick over as you work. **You leave by deciding what happens to the baby, and it is a real decision**: two buttons,
*take the baby up to the unit* and *leave the baby with the parents*. Neither is available
until the baby is stable enough to move, and the panel ticks off the three conditions as you
meet them. Leaving them with their parents is offered only when the baby genuinely never
needed you — term enough, breathing for herself, warm, and never given breaths.

That last condition has a consequence worth having. **Bag a vigorous baby who did not need
it and you have closed off the option of leaving her with her mother**, which is exactly what
an unnecessary intervention costs a family. The panel says so, in as many words.

The temperature bar is hypothermia, not cold stress. A first version refused a baby at 36.1,
which is precisely backwards: skin to skin is *how* you warm a slightly cold newborn, and the
panel now says as much.

For a while this promised more than it delivered. The line read "Decide where they go" above a
single button, because the decision had actually been made earlier by whether the player
pressed *Baby to the mother* during the resuscitation — and the closing line read that action
rather than the destination, so admitting her printed "Skin to skin with her mother. Nothing
for the unit." The exit is the decision now, and `d.wentTo` records it.

Stepping out is not abandoning: the delivery keeps its state and you can go back. But if you
are away for twenty-five minutes — or never came at all — the labour ward registrar takes over,
that costs you, and the baby arrives in worse shape than it needed to.

**Nothing in the room is rebuilt unless it changed.** `setHtml()` skips a write whose markup
is identical to what is already on screen. Writing innerHTML that matches byte for byte is
not free — it destroys and rebuilds every node underneath — and the room refreshes five
times a second, so the button a player was reaching for was a *different element* by the time
their mouse came back up. The click never fired, the page dragged itself back down to the
button as focus was restored to the new one, and tooltips flickered out from under the
cursor. The exit buttons in particular are now built once and only have their disabled state
toggled, exactly like the action buttons at a bedside.

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

A scenario names the baby who arrives in bed 6 twice over: `arrival` for the ordinary path, and
`arrivalIfAdmitted` for a scenario whose right answer is that nobody comes up at all. Admitting
the well term baby has to produce *that* baby - 39 weeks, three and a quarter kilos, on nothing -
and not a preemie borrowed from another scenario, or the punishment for separating a family is
a different baby appearing in the cot.

**The closing line describes the night the player actually had.** `done` may be a function of
`(d, q)`, and `doneRough` is used when the resuscitation fell short. One fixed sentence per
scenario meant "nothing for the unit" printed directly above "a well term baby was admitted to
the unit anyway".

## Knowing where you are standing

**The way out is pinned.** The bedside header — the button back to the unit, the bed, the
baby's name — is sticky at the top of the page. It used to scroll away with everything else:
two hundred pixels down a cot, which is nothing, the action panels start below that, and the
way back was gone while the sticky callout stayed pinned over the place it had been. So you
clicked where the exit should be, hit the callout, and nothing happened. In the delivery room,
which is taller, it was worse.

**Every bed keeps its own colour**, on the cot card in the ward and on the badge in the
bedside header, and arriving plays a short movement. A bedside is a wall of identical panels;
without something that changes hard when you move, it is genuinely easy to work on the wrong
baby for a while.

## Reaching all of it

The game was mouse-only, and the smallest text on screen had the worst contrast. Both are
fixed, and the fixes are load-bearing rather than decorative:

- **Every bed is a real `<button>`.** The card is a `<div>` with a `.pod-hit` button stretched
  across it, so the whole cot is one clearly named action ("Bed 3. Zane Kalu. 26 weeks. Renata
  Cruz needs you now: having repeated spells. Red alarm: SpO2 78%…"). The button sits *under*
  the glossary spans in z-order, so tapping a defined term still reads its definition instead
  of walking you into the bedside.
- **Focus survives the clock.** Every panel rebuilds its `innerHTML` on the tick, which
  destroyed whatever the keyboard was standing on — focus fell back to `<body>` every 2.4
  seconds, so you could tab to a cot and find that Enter did nothing. Interactive elements
  carry a stable `data-focus-key`, and `keepFocus()` puts focus (and scroll position) back
  after the rebuild. **If you add a control to a panel that re-renders, give it a key.**
- **There is a designed focus ring.** There was not one `:focus` rule in 743 lines of CSS.
  It is `:focus-visible`, so a mouse click never paints one.
- **Dialogs are real modals**: `role="dialog"`, `aria-modal`, labelled by the person speaking,
  focus placed inside on open, Tab wrapping in both directions, and focus returned to the
  element you came from — by key, because the panel behind will have rebuilt itself while you
  were reading. There is deliberately **no Escape-to-close**: every dialog here is a scored
  decision, and dismissing one would be a way to skip it.
- **One quiet live region**, `#announcer`. The callout and the who-needs-you panel are
  deliberately *not* live regions — they rebuild wholesale on the clock and would re-read the
  entire unit every few seconds. Instead `announce()` is called when something actually
  happens: a colleague asking, a reply, a refusal, a crisis, the phone, arriving at a bedside.
- **The artwork says what it draws.** `aria-label` was the literal word "baby". It is now
  composed by `seen()` from the same look object the drawing uses, so the picture, the caption
  under it and what a screen reader hears are one sentence: *"Zane Kalu: Dusky, working hard to
  breathe, awake, on CPAP 6 / 28%."*
- **`--ink-dim` is now #8593a7**, which clears 4.5:1 on every surface it is used on. It was
  #64748b — 3.0:1 on `--panel-2` — and it is the token used for the *smallest* text in the
  game, so the hardest text to read also had the worst contrast. The smallest type went from
  9.9px to 11.2px. A contrast audit over every rendered text node on the ward, the bedside,
  the delivery room and the report now reports zero failures.

On a phone the top bar used to wrap to five rows and eat two thirds of the screen before a
single cot was visible, and the side panel then took 42vh of what was left. It is now a
two-row grid — 95px — and the side panel is a sheet you open from a **Waiting** button that
carries the count and turns coral when something urgent is behind it. Escape closes it,
and going to a bed closes it for you.

## Structure

- `index.html` title, difficulty, options · `game.html` the game shell
- `js/sim.js` the physiology engine — the only file that decides what is true
- `js/patients.js` eight archetypes; five are drawn per shift with randomised identities
- `js/deliveries.js` the five delivery scenarios, the sixteen delivery-room actions, and the
  thin resuscitation physiology that connects them
- `js/names.js` name, family, pronoun and skin-tone generation
- `js/glossary.js` plain-language definitions for every acronym and every piece of ward lingo,
  and the table of written forms that marks them up in prose
- `js/events.js` the people: concerns, conversations, phone calls and the three crises
- `js/actions.js` everything you can do at a bedside, one record per action
- `js/art.js` all artwork, generated as inline SVG
- `js/audio.js` alarms synthesised with WebAudio; no sound files
- `js/game.js` the clock, the director that decides who asks you for what and when, and
  every panel on screen
- `js/clinical.js` **every number a clinician would have an opinion about**, in one place
- `js/report.js` the end-of-shift evaluation and the report
- `test/index.html` the checks — see below
- `CLINICAL.md` the same clinical numbers written for review rather than for the parser

`game.js` shares its internals with `actions.js` and `report.js` through `window.NG`.
Everything on it is looked up when it is called rather than when the file loads, so the only
load-order rule is the obvious one: `game.js` first, because the other two read `window.G`.

**Adding an action is one edit in one place.** The record in `js/actions.js` carries the
label, the cost, the panel it belongs in, the "?" blurb, what it does, and when it is
unavailable or already running:

```js
caffeine: { t: "Caffeine", cost: 5, g: "treat", info: "The same molecule as in coffee...",
  on:  function (b) { return !!b.h.caffeine; },
  run: function (b, h) { ... return { msg: "...", kind: "good" }; } }
```

That used to be three edits in two files - a name-and-cost table, a `switch` arm, and a
blurb over in `glossary.js` - with nothing to stop you doing two of the three.

## The ventilator

Nobody ever arrived on one. Checking the archetypes: three on CPAP, three on nasal cannula, two in
room air, **none on a ventilator**, and no admission arrived on one either. So `highpip`,
`extubatable` and `wetchest` — and the whole peak pressure, PEEP, rate, secretions and weaning
system behind them — existed only if the player chose to intubate somebody. A third of the support
model sat behind a door nobody had a reason to open.

Two archetypes can now arrive on a tube, and both stories are the ordinary ones: the **chronic lung
disease baby** extubated on Tuesday and back on the ventilator by Wednesday night, and the
**25-weeker** nobody has yet felt brave enough to extubate. `makeCensus()` then guarantees it —
if the census contains a baby who *could* be on a tube and nobody is, one is. Leaving it to chance
put a ventilated baby in only about half of shifts.

**They arrive on settings that have crept up, not on settings that are hurting them.** The peak
pressure is two points over the limit for the gestation, so the therapist asks you to come down on
it — that is the night's job — while the rate is low enough that the carbon dioxide starts in the
forties. It matters that the *harm* is not already happening when the shift begins: it means the
ventilator is something you manage rather than something you inherit already broken.

Two things that had been written and never wired up now work:

**Re-siting is the same button as intubating.** Reported from a playtest: *"I was advised a baby
needed re-siting the tube, but the only options I saw were to extubate and then intubate, and it
did not seem to work."* Two defects behind that, both mine:

- **Intubate was disabled the moment a baby was on a ventilator** — which is exactly when a tube can
  slip. So the concern saying *"re-siting the tube puts it back"* pointed at a greyed-out button and
  its own `accept` for `intubate` could never be reached. The button is now live when the tube has
  moved, marked urgent, and **relabels itself "Re-site the tube"** — the label follows the baby, so a
  tube that slips while you are standing at the cot changes it under your hand. Re-siting keeps the
  ventilator settings: a player who has spent the night weaning a peak pressure down should not have
  it thrown back to the defaults because a tube moved.
- **Extubating did not clear `ettDisplaced`.** The tube was out and the game still thought it was
  down a bronchus, so the baby carried a 0.42 lung-function penalty on CPAP with no cause on screen,
  nothing able to clear it, and no concern watching — because the one that reports a displaced tube
  only looks at ventilated babies. That is the "it did not seem to work" half.

The workaround the player found is still allowed and still scored, at 1 point rather than 8, with
the nurse saying what it cost: *"That will certainly get the tube out of the wrong place. It also
leaves a baby who needed a ventilator without one."*

**A tube can move.** `h.ettDisplaced` has existed since the beginning — it costs 0.42 of lung
function, it shows on a film, it shows on examination, and the emergency checklist has a branch
written for finding it — and **nothing in the game ever set it**. The whole feature was reachable
only by reading the source. A tube in a 900 gram baby has about a centimetre of margin and handling
is what uses it up, so it slips occasionally, more often on a baby who is being worked on. Priya
sees one side of the chest lifting and one not.

**The ventilator rate can be judged.** It was the one control on the bedside with no `noteChange`
attached, so nothing could tell whether you had answered a rising CO2 — or driven one into the floor.

## Hypocapnia

The game taught permissive hypercapnia carefully and taught nothing at all about the other end.
Measured, a baby given surfactant on a ventilator settled at a **CO2 of 22 and sat there all night
at no cost whatever**, which is the one number on a ventilator a doctor should be least comfortable
seeing. Blowing the carbon dioxide down clamps the cerebral arteries, and in a preterm brain that
is a white-matter injury mechanism.

Below 30 now accrues `hypocapMinutes` and feeds the same brain-injury sum as blood pressure swings
and acidosis. The handover names it — *"the carbon dioxide was driven down to 22 and held there for
eight hours by the ventilator"* — and it counts as serious below 25.

**`overventilated`** is the concern, and it is the mirror of `tiring`: Priya cannot read a CO2 off
a monitor either, so what she brings you is a baby who has stopped taking any breaths of their own,
because the machine has already blown off the stimulus. More rate and more pressure are both marked
wrong; coming down on either is the answer.

It is deliberately **not** something you inherit. On the settings a baby arrives on it never fires;
it is a consequence of a decision the player makes, which is the only way it teaches anything.

## One set of numbers

`js/clinical.js` exists because the rule *"a mean blood pressure should be at least the gestational
age"* had been implemented five different ways. It kept happening anyway, and haemoglobin was the
worst of it — **six numbers answering questions about the same measurement**:

| | was |
|---|---|
| the lab result shouted below | 8 |
| the skin went pale below | 8.5 |
| the nurse raised it below | 8.5 |
| the handover flagged below | 8 |
| the attending mentioned it below | 9 |
| a transfusion was refused above | 10 |
| the anaemia puzzle called itself fixed above | 9.5 |
| and the hover text told the player to expect | 9 to 22 |

So a haemoglobin of 8.5 rendered as *out of range* and *not critical* at once, an inch apart on the
same screen. Carbon dioxide was the same story from the other direction: the tooltip taught **"over
65 means the ventilation is not enough"** and nothing in the game used 65 — the handover flagged 75,
the crisis fired at 85, the extubation refusal sat at 62.

These are not all the same question and they should not all be the same number. But they must all be
**named, in one place**, so a clinician moving one can see what moves with it. `C.hgb` and `C.co2`
now hold them, and `C.ref` — the ranges the player sees on hover — is filled in *from* them rather
than being a second copy:

```js
C.ref.hgb.lo = C.hgb.nadir;
C.ref.hgb.hi = C.hgb.polycythaemia;
C.ref.co2.hi = C.co2.permissiveHigh;
```

Eighteen literals across six files were replaced. Two numbers moved as a result: the haemoglobin
flag from 8 to 8.5, so a value the hover calls out of range is one the row calls critical; and the
handover carbon dioxide from 75 to 65, which is what the game had been teaching all along.

**And the check that would have caught it reads the shipped source.** Every other test measures
behaviour, and drift *is* the behaviour agreeing with itself while disagreeing with what the game
tells the player — so the suite fetches all seven source files over http and fails on any comparison
of `hgb`, `co2`, `crp`, `wbc`, `glucose`, `coreTemp`, `trueSat`, `spo2` or `biliThreshold` against a
bare number. Only `clinical.js` is allowed to hold one. A companion check asserts the sets are
internally ordered the way the medicine is — a baby cannot look pale above the expected nadir,
permissive hypercapnia has to permit something and stop short of not-enough, an emergency sugar has
to sit below the handover sugar.

*(That guard was verified by planting `if (h.hgb < 8)` back into report.js and watching it fail with
the file, the line and the text.)*

## The brain

A full sweep — every category of content, checked against what actually fires — found one system
that existed entirely on paper. **Fourteen ordinary shifts, seventy babies, every single one grade
0.** A deliberately worst-possible night (handling pinned high, mean pressure at 12, base deficit
16, septic, ventilated at 30 over 60, held for twelve hours) only just crossed the line:

```
seed 11000  rds pma30.0:  accum 0.698 / 1   grade 0
seed 11001  rds pma30.0:  accum 0.774 / 1   grade 0
seed 11002  rds pma30.0:  accum 1.001 / 1   grade 1
```

So the head ultrasound — a forty-minute investigation — could only ever say *"no bleeding seen"*.
Three of its four results were dead text, the `ivh` flag never fired, and the whole handling and
blood-pressure model had nothing to point at.

**Some babies now arrive with one.** Around a fifth to a quarter of babies under 28 weeks have an
intraventricular haemorrhage, almost all of it in the first 72 hours, and most of it grade 1 or 2
found on the routine scan rather than by anybody noticing. That is a better teaching object than a
bleed you cause: it is a baby you have been *asked to protect*, which is what the handling model is
for. **The handover sheet tells you** — the day team scanned, so they know — because handing a
player a bleed nobody could have found would be blaming them for it.

**And it can extend.** `stepBrain` used to close the window on the first bleed, so the baby you most
need to protect was the one nothing could happen to. Extension is now the risk, at a lower threshold
than a fresh bleed, because a matrix that has bled is more fragile than one that has not.

**A grade 2 or 3 is not a line in a report.** It bleeds into the ventricle, so the count falls; it
presses on a brainstem that was barely coping, so the spells get worse; and the fontanelle comes up
under your fingers. That is how anybody notices one at a cot, and it is what the new **`fontanelle`**
concern describes — deliberately gated on the bleed having changed *tonight*, since a known grade 1
is on the handover sheet rather than a discovery. A fast fluid bolus is marked wrong on it, because
that is how a grade 2 becomes a grade 3.

**Handling is capped, deliberately.** Uncapped, a player who examined and suctioned every forty
minutes gave thirteen new bleeds to twenty babies — a certainty rather than a risk, which teaches
nothing except never to touch anybody. Measured now: gentle 1 extension, neglect 2, busy handling 3
extensions and a new bleed, across comparable numbers of eligible babies.

## Nothing may be unreachable

*"It is an objective of the game that it expose all the things that can happen, so we had better
not miss any big ones."* Eight concerns had gone quietly unreachable and nothing noticed, so there
is now a check that would have caught it.

**Every concern either turns up on its own across a spread of ordinary shifts, or has a named
scenario in the suite that reaches it, and the suite proves that scenario really does.** The list in
`NAMED_CASE` is now down to six and every one is there for a stated reason: `extubatable` and
`overventilated` are decisions the player makes rather than things that happen, `cold` needs
somebody's parent to have left a porthole open, and `pale`, `needsoxygen` and `swinging` are real
but too uncommon to be sure of in six seeds. Adding a concern without either is a failing test
rather than a silent gap.

**And the panel has a cap.** Every concern added over the last few builds is another row that can
be open at once, and a who-needs-you list nobody can read is the same as no list. The director now
stops raising non-urgent concerns past eight open items — a nurse who cannot get the doctor deals
with what she can rather than adding an eleventh name — while urgent always gets through, because a
baby in trouble has to reach you. The suite measures the panel a player who is *keeping up* sees
(never more than a handful) separately from the neglect case, which is allowed to be long: that one
is the unit in trouble, and capping it would be lying to the player.

A companion check watches the other failure: **no concern may be raised more than six times a
night, and the unit as a whole must stay under forty.** That is what caught `highsat` at 8.3 per
shift, drowning everything else out. It now runs at 0.3, because the nurse weans on her own and the
concern finally means something.

## The checks

Serve the folder and open `test/index.html`:

```
python3 -m http.server
```

It boots the real game in an iframe, once per case, at full speed and played badly on
purpose, and reports pass or fail. (It needs http rather than `file://`, because a `file://`
iframe is an opaque origin the harness cannot reach into.)

Nearly every bug this game has had was **found by measurement rather than by reading**: one
archetype quietly killing its baby whatever puzzle it drew, keyboard focus dying every 2.4
seconds, the delivery room charging its cost twice, forty percent of every frame being thrown
away, a conversation still waiting ten hours after it was offered. All of that instrumentation
used to be typed into a browser console and then evaporate. It checks:

- a shift runs to the report on every difficulty and with prompts both on and off, with no
  exceptions, no `undefined` or `NaN` reaching the screen, and no singular *they* taking a
  singular verb
- **no baby ever dies on a puzzle marked `benign`** — that is the signal that something in the
  physiology has a floor in the wrong place, and it is how the worst bug in this project's
  history would have been caught on the day it was written
- the clock: the delivery room at a second per second, a cot at thirty game-seconds per real
  second, a birth waiting for you holding the ward, and an action spending the *same* seconds
  on both clocks
- an action that did nothing costs nothing, is not credited, and says so — and no action is
  silent
- the delivery room sends up the baby you actually delivered, and nobody comes up at all from
  the one where the right answer is to leave her with her mother
- nothing waits all night in the who-needs-you list, and the panel is still readable at five
  in the morning
- the way back to the unit does not scroll away
- **what the support panel says is what the baby is getting** — no cot is ever labelled room
  air while the blender is still open
- a harmful action is never free: ibuprofen without a duct still costs the gut, morphine
  bought comfort with breathing, and both are scored
- the end of the shift is announced rather than arriving in silence

When you change `Sim.lungFunction`, `satFrom`, or anything in `stepMetabolic`, run these
first. They will not tell you the medicine is right — see the note at the end — but they will
tell you within a minute whether you have broken the game.

## Cache busting

There is **one** version number, `BUILD` at the top of `index.html`. It tags everything that
page loads and is handed to `game.html` on the URL, which uses it to tag the stylesheet and
every script. Bump that one number when you change any file.

There used to be thirteen hand-written `?v=` tags. They drifted, and a stale stylesheet twice
sent someone hunting for a layout bug that had already been fixed. Opening `game.html`
directly with no `?v=` tags nothing at all, which is what you want while editing.

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
changed from that level's defaults and offers a reset — and the override is honoured, on
every level, for the whole shift.

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

## The medicine

Every number a clinician would recognise and have an opinion about lives in
[`js/clinical.js`](js/clinical.js) — saturation targets, alarm limits, the temperature bands,
the glucose threshold, the blood-pressure rule, the bilirubin curve, peak pressure limits, the
minute-by-minute newborn saturation targets. Each carries the basis for the number in a
comment. [`CLINICAL.md`](CLINICAL.md) is the same material written for a clinician to red-pen:
what each number does in play, where it came from, and how confident it is.

**They were scattered literals and they had drifted.** The rule "a mean blood pressure should
be at least the gestational age" was implemented five different ways, so the number on screen
turned red before any alarm fired. The game told the player a baby should sit between 36.5 and
37.5 degrees and then used nine different temperature boundaries. Worst of it: a nurse raised
*"she is jittery"* below a glucose of 42 while the examination called a baby jittery only below
40 — so between 40 and 42 a colleague told you something was wrong and the baby told you
otherwise, in a game whose whole premise is that the monitor may lie and the baby never does.

The checks in `test/` now hold those together: the nurse and the examination use the same
glucose, a pressure that worries the therapist is a pressure that injures the lung, and what
the tooltips tell the player is what the code uses.

**None of these numbers has been reviewed by a clinician.** They were chosen from published
guidance — NeOProM for the saturation target, WHO for the thermal bands, NRP 8th edition for
the delivery room, AAP and the Pediatric Endocrine Society for glucose, the shape of the AAP
2022 curves for bilirubin — which is a reasonable starting point and not a substitute for the
review. `CLINICAL.md` ends with the five questions most worth a neonatologist's ten minutes.

## Tuning notes

Model **coefficients** — how fast surfactant works, how likely an air leak is per minute of
high pressure — are deliberately *not* in `clinical.js`. They are calibration rather than
medicine, a clinician cannot usefully review them, and they stay here.

`Sim.lungFunction` and `satFrom` are the two functions that set the feel of the whole game.
They are calibrated so a healthy baby on room air reads 96-98, a stable 26-weeker on CPAP
in 28% oxygen sits around 93-95, and severe respiratory distress on 30% sits in the 80s and
responds to more oxygen and to surfactant. If you change them, re-run the calibration sweep
described below before playing.

**Glucose has two knobs and they matter as much.** `h.glycogen` (0..1) is what a baby can make
for itself with nothing running, and it *fills the gap* rather than adding on top of a drip - so
a baby on no sugar at all sits somewhere sensible unless something is actively wrong. Without it
every baby with no dextrose and no feeds converged on 12, which quietly made the big baby of a
diabetic mother the most lethal cot in the unit whichever puzzle it had drawn: across twelve
neglected shifts it died six times, including on the puzzle whose reveal reads "settled quickly
once fed". `h.hypoDrive` / `h.hypoDriveMax` are an *active* hypoglycaemia, switched on by the
puzzle that means it. The drive climbs while the sugar is under 50 and unwinds above it, which
is why a bolus alone bounces and turning the infusion rate up is what actually holds it - the
lesson those puzzles were always written to teach and could not previously demonstrate.

**Two accumulators that were being computed and never shown now are.** `h.bpd` is the lung
injury that ventilator pressure does over hours - the headline harm of intensive care, and it
was invisible: it appears in the bed-by-bed outcome and in the gentle-care line. `h.crp` is on
the blood count beside the white cells, which is what makes "anaemia and infection both show
up here" true. `coldMinutes` and `biliDangerMinutes` describe the night in the debrief rather
than only the last reading.

Verification used during development, run in the browser console:

- a sweep of 40 seeds checking opening vitals and that almost no bed alarms at handover
- a twelve-hour run with **no** care versus **competent** care. Competent care should show
  roughly 20 critical minutes per baby, no NEC and no deaths. Total neglect, with the modal
  crises answered (badly, but answered - they cannot be dismissed), gives about 45 critical
  minutes per baby, NEC in a fraction of shifts, and a death in roughly one shift in ten at
  Resident. **Every death should come from a puzzle that was genuinely pathological.** A baby
  that drew a benign puzzle dying is the signal that something in the physiology has a floor
  in the wrong place
- 20 full shifts across all three difficulties, driven to the end-of-shift report, checking for
  exceptions and for `undefined` / `NaN` / "they is" reaching the screen

## The end-of-shift evaluation

Scored by **proportion of what the night actually asked of you**, not by accumulated points.
Five domains, each rated strong / fair / shaky / poor with its own bar and, when it falls
short, a sentence saying exactly what went wrong:

| Domain | Weight | Measures |
|---|---|---|
| Answering your team | .25 | concerns dealt with, counted by unique concern |
| **The state you handed over** | **.25** | **babies still carrying an unfinished problem at 07:00** |
| Clinical judgement | .20 | good clinical decisions against poor ones, by count and by weight |
| Gentle care | .15 | oxygen overshoot, ventilator pressure, blood draws, comfort |
| The families | .15 | trust, and conversations taken against offered |

### What the report is for

**A playtest came back rating every domain STRONG, headed "Outstanding", with the verdict
"Nothing to pick at. The unit was in good hands all night" — printed four inches above a cot
card reading "The blood sugar was still 34 at handover."**

The report had computed what was left open, printed it in small type halfway down the
bed-by-bed section, and then scored the shift without looking at it. Three things were wrong
and all three are fixed:

- **The old "Keeping them safe" domain was blind.** It looked at overridden pharmacy queries,
  positive cultures with no antibiotics, and long critical stretches — none of which describe
  a baby handed over hypoglycaemic. It reported "no safety flags". It has been replaced by
  *The state you handed over*, which asks the only question that matters at seven in the
  morning: what is the day team inheriting?
- **Clinical judgement was a points ratio over everything scored.** Thirteen conversations at
  five to seven points each buried five points of bad clinical calls under a hundred and
  fifty good ones — *"158 points of good calls against 5 of poor ones"*, rated STRONG.
  Conversations are now tagged `family` and excluded (they were also being counted twice,
  here and again as trust), and the domain weighs the **count** of decisions as much as their
  size, so one big win cannot bury several small errors.
- **The verdict and the advice only ever read the domain scores.** So "nothing to pick at" and
  "a genuinely well-run shift, with nothing left hanging" could both print over a list of
  things left hanging.

### One list, used everywhere

`openAtHandover(b)` in `js/report.js` is the single source of truth for what is still wrong
with a baby at 07:00. It distinguishes a **serious** problem — one still doing harm, that the
day team inherits mid-course — from a **loose end**, which is real and named but not the same
thing. Everything reads it: the domain, the headline cap, the verdict, the cot reveals, and a
new section at the very top of the report.

**What you are handing over** now leads the report, above the scoring, because that is what a
night shift actually produces. Each baby gets their bed colour, what is still wrong, and one
line on what should have been done about it.

**An unfinished baby caps the headline outright**, whatever the arithmetic says: one serious
problem is no better than "Solid", two is no better than "Rocky", loose ends alone cap just
below "Outstanding". You can answer every concern, take every conversation and wean every
baby's oxygen, and still not have run a good shift if somebody goes to the morning mid-problem.

### The lungs, and the diagnosis

A second playtest came back with two babies whose reveal named a serious respiratory problem —
significant RDS in one, meconium aspiration with pulmonary hypertension in the other — and an
evaluation that did not dock a single mark for either. Two separate holes:

- **`openAtHandover()` had nothing respiratory in it at all.** The commonest thing in a NICU,
  and a baby still on 60 percent oxygen at seven in the morning registered as nothing wrong.
  It now names high oxygen, high work of breathing, clamped lung vessels, and stiff lungs that
  never got surfactant.
- **The game never asked whether the player found the diagnosis.** See the `dx` block above.

The other half of the complaint was fairer still: *where in-game would I know this?* Pulmonary
hypertension had no voice in the unit — no concern pointed at it, and its lesson named actions
("keep the baby calm, call for help early") with no affordance to match. Three things were added:

- **`swinging`** — the nurse notices that the saturation is not tracking the dial, which is the
  whole tell. She describes; she does not diagnose. It accepts an echo, comfort care and a call
  to the attending, and it counts suctioning as the wrong answer, because handling is what makes
  this baby worse.
- **`risingoxygen`** — the earlier half of `risingwork`, which waited for 45 percent by which
  point the answer is already obvious. This fires while there is still a diagnosis to make, and
  it asks a question rather than naming a treatment. It needs `h.o2Creep`, which `js/sim.js` now
  tracks as the distance above this baby's *own* lowest requirement tonight, with a floor that
  drifts slowly back up so a baby who genuinely recovers stops being flagged for ever.
- **"Call the attending"** — under Assess at every bedside, ten minutes. The game had said from
  the beginning that asking for help scores positively, and there was no way to do it. Dr.
  Halvorsen reads the hidden state and answers the way a good senior does at three in the
  morning: the question you have not asked yourself, and the part of the baby you have not
  looked at — never the diagnosis. On a baby with nothing wrong she says so, which is what stops
  it being a reveal button.

Pulmonary hypertension is also now **modelled rather than described**. `h.pphn` moved for
nothing before this; the debrief could tell you the vessels stayed shut no matter what you did.
The desaturation it causes scales with pain, so the saturation genuinely swings with handling,
and the vessels relax over hours with minimal handling, sedation and adequate oxygen — which is
the actual treatment short of nitric oxide.

**A clamp bug found on the way.** `stepRespiratory` decayed RDS severity through `c01()`, which
clamps to 1 — but the RDS puzzle applies 1.8 to 2.2 and the mild one 0.7 to 1.0. The worst case
was truncated to the moderate case on the very first tick, and surfactant's 0.9 subtraction was
being taken off a number that could not exceed 1.

Three older rules still hold:

- **Domains that never came up are excluded and the weights re-normalised**, so you cannot
  earn credit for gentle ventilation on a night you never touched a ventilator.
- **The weakest important domain caps the headline.** Any domain under 0.35 caps the shift at
  "Rocky"; under 0.20 caps it at "Difficult night"; a death caps it lower still.
- **There is no starting credit.** An earlier version began at 50 out of 100, so a shift where
  almost nothing happened still read as "Solid".

The report also lists **What nobody came to**: every concern raised during the night that was
never dealt with, named by bed, baby and colleague.

Two smaller things fixed at the same time. Decision labels were sliced at 54 characters and
came out as *"Sit down and say honestly what you know, what you do n"* under a heading reading
"Decisions that mattered"; they now end on a word. And the grade — the largest thing on the
page — was **invisible in print**, because it is gradient-filled text and browsers drop
backgrounds when printing, so a PDF of the report had a blank space where the verdict should
be. There is a `@media print` override.

## A note on mortality

Babies can die, but only after a sustained critical state that was repeatedly ignored, and
never as a random event. A death caps the shift grade regardless of everything else, leads
the report, and is followed by an honest debrief rather than a game-over screen. Untick
"babies can die" on the title screen to disable it; it is off by default in Student mode.
