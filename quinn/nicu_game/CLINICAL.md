# The medicine in NICU Night Shift

**This document exists to be argued with.** Every number the game commits to is below, with
what it does in play, where it came from, and how confident I am in it. The numbers all live
in one file — [`js/clinical.js`](js/clinical.js) — so changing one here is a one-line edit
there, and the checks in `test/` will tell you within a minute whether it broke anything.

Read the **Confidence** column first. Anything marked *low* or *invented* is where a
neonatologist's ten minutes is worth more than everything else in this file.

## What this is not

The game is not a decision aid and nothing in it should be used to treat a baby. It is a
teaching toy: the physiology is a caricature tuned to make consequences visible inside a
twelve-hour shift, not a model of a real infant. Where reality is contested, the game should
say so out loud to the player rather than pick a side quietly — it does this for blood
pressure, and it should probably do it for glucose too.

**None of these numbers has been reviewed by a clinician.** They were chosen by an AI from
published guidance, which is a reasonable starting point and not a substitute for the review.

---

## 1. Oxygen saturation

| | value | what it does |
|---|---|---|
| Target range on oxygen | **90–95%** | Stated to the player in the monitor tooltip, the glossary, and Desmond's teaching conversation |
| Harm accrues above | **95%** | `o2Exposure` — feeds the "Gentle care" domain at handover |
| Amber alarm, on oxygen | below **90**, above **96** | The bed glows; the number turns red |
| Amber alarm, room air | below **88** | |
| Red alarm | below **80** | Also the definition of "critical" for mortality |
| Nurse suggests weaning | above 96 for **25 min** | The `highsat` concern |

**Basis.** 90–95% is the settled compromise from the NeOProM prospective meta-analysis of
SUPPORT, BOOST-II and COT: lower targets cost lives, higher targets cost eyes and lungs.

**Confidence: high** on the target. **Medium** on the alarm limits.

**The one deliberate asymmetry.** Harm starts at 95; the alarm waits until 96. That is not
fudge — a saturation trace wanders a point or two with every breath, so an alarm sitting
exactly on the target chatters continuously and teaches staff to ignore it. But it means the
game quietly accrues eye and lung injury in a band where nothing on screen is complaining.
**Is that the right teaching?** An argument could be made either way and I would like yours.

## 2. Heart rate

| | value | what it does |
|---|---|---|
| Normal range | **100–160** | Stated in the tooltip |
| Amber alarm | below **100**, above **180** | |
| Red alarm | below **90** | Also "critical" |

**Basis.** Ordinary newborn range; bradycardia in a newborn is under 100.

**Confidence: high** on the range, **low on the upper alarm.** 180 is a guess at where a unit
would start looking. It was 190 and I moved it without a source. **Please check this one.**

## 3. Temperature

| | value | what it does |
|---|---|---|
| Normal | **36.5–37.5** | Stated to the player |
| Cold stress | **36.0–36.4** | The number is flagged on screen; nothing else happens |
| Hypothermia | below **36.0** | Amber alarm, a nurse comes, and the physiology bites: sugar burns 1.5×, perfusion drops, apnea risk rises |
| Red alarm | below **35.0** | |
| Fever | above **37.5** amber, **38.0** red | |

**Basis.** WHO thermal protection bands, used verbatim: normal 36.5–37.5, cold stress
36.0–36.4, moderate hypothermia 32.0–35.9.

**Confidence: high.** This was the worst drift in the game — nine different boundaries
between 35.8 and 37.8, while telling the player the range was 36.5–37.5.

**Open question.** Should a nurse come at 36.4 (cold stress, below the stated normal) rather
than waiting for 36.0? Currently she waits. In a real unit somebody would act at 36.4.

## 4. Blood glucose

| | value | what it does |
|---|---|---|
| "Low" | below **45 mg/dL** | The nurse raises it; the examination says jittery; breathing drive falls; apnea risk rises |
| Severe | below **25 mg/dL** | "Critical" for mortality, and triggers the hypoglycaemia crisis |

**Basis.** Genuinely contested, and this is the middle of the argument. The AAP intervenes at
<40 mg/dL in a symptomatic infant and <25 mg/dL in the first four hours. The Pediatric
Endocrine Society wants >50 mg/dL in the first 48 hours for an at-risk infant. 45 sits between
them and is close to the 2.6 mmol/L (≈47 mg/dL) threshold used across the UK and Australasia.

**Confidence: medium, and this is the most contested number in the game.**

**This is the one to look at first.** A single "low" is a simplification of a guideline that
is age-dependent (AAP uses different thresholds in the first 4 hours than at 4–24 hours) and
symptom-dependent. The game has neither axis. If you want one of them, hours-of-age is the
more teachable.

**Fixed on the way through:** the nurse used to raise jitteriness at 42 while the examination
only called a baby jittery under 40, so between 40 and 42 a colleague told you something was
wrong and the baby said otherwise. There is now one number and a test that holds it.

## 5. Blood pressure

| | value | what it does |
|---|---|---|
| The rule | MAP ≥ **gestational age in weeks** | Stated to the player |
| Flagged on screen | below GA | |
| Amber alarm | below GA | |
| Nurse raises it | below **GA − 2** | The `lowbp` concern |
| Red alarm | below **GA − 5** | Also "critical" |

**Basis.** "Mean pressure at least the gestational age" is what roughly half of neonatal
clinicians use in practice. There is **no threshold at which treating has been shown to
improve outcome**, and the game says exactly that to the player in the low-blood-pressure
conversation — that honesty is the best thing in this section and should stay.

**Confidence: high that this is what people use. Low that it is right**, which is the point.

**Was five numbers.** GA, GA−1, GA−2, GA−5 and GA−6, so the number on screen turned red
before any alarm fired. Now three, hung off one rule.

## 6. Bilirubin

| | value |
|---|---|
| Threshold at day 0 | **11** mg/dL at ≥38 weeks · **9.5** at 35–37 weeks · **6.5** below 35 weeks |
| Rises per day | **2.4** mg/dL |
| Ceiling | **21** · **19** · **14** |
| Nurse notices yellow | within **3** of the threshold |
| Harm accrues | **5** over it |

**Basis.** The *shape* of the AAP 2022 phototherapy curves — low at birth, climbing over the
first days, flattening. The 2022 revision raised thresholds by roughly 1–2 mg/dL from the 2004
guideline.

**Confidence: low. This is the weakest section in the file and the second thing to look at.**

A single formula cannot reproduce a family of curves indexed by gestation, age in **hours**,
and neurotoxicity risk factors. Three specific problems:

1. The game works in **days**; the guideline works in **hours**, and the first 24 hours are
   where the curve moves fastest.
2. Babies **under 35 weeks are outside the AAP guideline entirely** and are managed on lower,
   unit-specific charts. The 6.5 → 14 band is my invention.
3. There are no **neurotoxicity risk factors** modelled, though the game does model haemolysis,
   which is one of them.

The previous formula started a term baby at 15 on day 0 — far too high for day zero — and
capped at 20, too low by day four. It was wrong in both directions at once.

## 7. Ventilator pressure

| | value |
|---|---|
| Peak pressure limit | **20** below 30 weeks · **24** from 30 weeks |

Above the limit, lung injury and air-leak risk accrue, *and* Priya raises it. Those used to
sit one unit apart, so there was a band where damage accumulated silently.

**Confidence: medium.** "Much above 20–25 injures a small lung" is the right shape; the exact
split at 30 weeks is a simplification.

## 8. The delivery room

| | value |
|---|---|
| Saturation target by minute | **62, 68, 72, 78, 82** then **90**, and **93** after ten minutes |
| Heart rate adequate | **100** |
| Compressions | below **60** after effective ventilation |
| Compression ratio | **3:1** |
| Minimum before leaving | **120 seconds** |

**Basis.** NRP 8th edition. The published bands are 60–65% at one minute, 65–70 at two,
70–75 at three, 75–80 at four, 80–85 at five, 85–95 at ten.

**Confidence: high.**

**Fixed on the way through:** the game used the **top** of every band from three minutes on
(74, 80, 85), which made a correctly-resuscitated baby read as behind target for most of the
resuscitation. It now uses midpoints.

---

## 9. Pulmonary hypertension

`C.pphn` — **alert when FiO2 ≥ 0.40 and SpO2 < 94.** Confidence: **moderate.**

These two numbers gate a nurse's concern, not any physiology; the model runs on hidden `pphn`
severity regardless of whether anybody raises it.

The reasoning is that the sign worth teaching is not a low saturation but a saturation that
does not follow the dose. A baby with open lung vessels on 40 percent oxygen sits comfortably
above 95, so failing to reach 94 on that much is a shunt question rather than an oxygen
question. The concern text describes handling-related desaturation and pre/post-ductal-style
lability without naming the diagnosis, and the model now backs that up: the desaturation
scales with the baby's pain, so the saturation genuinely swings when the baby is disturbed,
and the vessels relax over hours with minimal handling, sedation and adequate oxygen.

**What I am least sure of:** whether making adequate oxygen a *relaxing* influence at FiO2 ≥
0.5 reads as teaching "turn the oxygen up for PPHN". It is true — oxygen is a pulmonary
vasodilator — but it sits next to a game that spends the rest of its time teaching oxygen
restraint, and the coefficient is deliberately smaller than the one for keeping the baby calm.

**What is deliberately absent:** inhaled nitric oxide, pre- and post-ductal saturations as
separate numbers, and the oxygenation index. All three are the real management of this
condition and none of them are in the game.

## 10. The oxygen creep

`C.o2Creep` — **alert at a rise of 0.08 above this baby's own lowest requirement tonight,
once FiO2 is at least 0.30.** Confidence: **low, and it is calibration rather than medicine.**

There is no published threshold for "the oxygen is creeping up". The number was chosen to sit
above trace wander and below the 45 percent at which the existing `risingwork` concern fires,
so that there is a window in which a diagnosis can still be made rather than a crisis managed.
It is measured against the baby's own floor because 30 percent means something quite different
in a 25-weeker and a term baby. The floor drifts slowly back up so that a baby who genuinely
recovers stops being flagged for the rest of the night.

**The question:** is a nurse raising this at 36 percent realistic, or is it the kind of thing
that gets noticed on a ward round rather than at three in the morning?

## 11. Laboratory reference ranges

`C.ref` — **the bands shown to the player on hover, and the bands the game marks a number
abnormal against.** Confidence: **moderate for the bands, high for the teaching points.**

A blood count used to come back as `WBC 6.2 / Hgb 9.4 / CRP 14` with nothing to compare it
against, which taught a beginner only that numbers exist. Each analyte now carries its range
and one sentence of what the range means, and the number actually out of range is marked
rather than the whole row turning red as one.

| Analyte | Band | Unit | Leans on |
|---|---|---|---|
| WBC | 5–20 | ×10⁹/L | after day one; Manroe/Schmutz ranges collapse steeply with postnatal age |
| Hgb | 9–22 | g/dL | nadir at the bottom, polycythaemia at the top |
| CRP | under 10 | mg/L | conventional cutoff; the timing caveat matters more |
| pH | 7.25–7.45 | — | 7.25 is the practical floor under permissive hypercapnia |
| CO2 | 35–55 | mmHg | 35–45 strictly; up to 55 accepted on support |
| Base deficit | under 8 | mmol/L | the usual marker of significant metabolic acidosis |

**These are deliberately not "normal ranges" and the label on screen says `Expected`, not
`Normal`.** Two of them are not: the CO2 ceiling is what permissive hypercapnia allows rather
than what is normal, and the haemoglobin band runs from the physiological nadir to
polycythaemia. Each tip then says what both ends actually mean.

**The three teaching points I care more about than the numbers**, and would defend even if
you move the bounds:

- A **low** white count is worse news than a high one in a newborn.
- A **normal CRP taken early does not exclude sepsis** — it takes six to twelve hours to rise.
- A **base deficit is a circulation question, not a lung question**, and turning the oxygen up
  will not fix it.

**What the model does not do:** any of this by postnatal age or gestation. A day-one white
count of 25 is normal and the game will mark it high. **The fix is in words, not in the model**
— every band whose real value moves with age says so in its own tip, so a learner meets the
caveat at the point of confusion without the game pretending to a precision it does not have:

| Analyte | What the tip says moves |
|---|---|
| WBC | much higher on the day of birth; the band is an after-day-one band |
| Hgb | starts 13–20, falls on its own to 9–11 by a month, sooner and lower in a preemie |
| pH | mild acidosis is expected in the first hours and corrects; the same number on day three is not |
| Base deficit | after a hard birth it should shrink each time you look; a growing one is the worry |
| CO2 | a baby weeks into chronic lung disease lives higher and is used to it |
| Glucose | the real threshold is lower in the first four hours; the game uses one number throughout |
| Bilirubin | no single normal — the threshold is drawn for this baby's gestation and hours of age |
| CRP | not age but *timing*: six to twelve hours to rise, so an early normal proves nothing |

The suite enforces that **every bound appears in its own tip**, so the number the code marks
against and the sentence the player reads cannot drift apart. That check has already caught
one: the haemoglobin floor was 9.5 while the tip described 9–11 as the expected nadir.

## 12. What the nurse does without being asked

`C.o2Nurse` — **she titrates FiO2 to hold the baby in the target range: up at about 18 points an
hour, down at about 11, stopping at 0.45.** Confidence: **high on the behaviour, moderate on the
numbers.**

Until now nothing in the game moved the oxygen except the player, which is not how any unit works
and which had the side effect of making most of the respiratory teaching unreachable. She reads the
true saturation rather than the monitor, deliberately: a slipped probe reads 74 percent on a pink
baby, and a nurse at the cot would not chase that.

**The ceiling is the interesting number.** 0.45 is where she stops adjusting and comes to find you,
which is a claim about escalation practice rather than about physiology. Some units would want a
doctor sooner; some would let an experienced nurse go further.

**Routine cares** (`caresEveryMin`, ~190 minutes) exist because nothing generated handling except
the player, so a pulmonary-hypertensive baby never had anything to be labile about. Whether three
to four sets of cares in twelve hours is right, and whether they should cluster with feeds, are
both fair questions.

## 13. The course of RDS

`C.rdsCourse` — **surfactant deficiency worsens until about 40 hours of life and improves from
about 60.** Confidence: **high on the shape, low on the rates.**

This replaces a model in which severity decayed from the first minute, so untreated severe RDS
measurably improved across a night shift. The pre-surfactant natural history is a deterioration
over the first 24 to 48 hours and recovery as endogenous production appears around day 2 to 3, and
that is what the curve now does. Everything is scaled by how far below `shortOf` (0.62) the lung
actually is, so a mildly immature lung barely moves and a severely deficient one deteriorates all
night.

**Calibration, not medicine:** `consumePerMin` and `worsenPerMin` were tuned until an untreated
moderate baby needed meaningfully more oxygen by morning (30 to 45 percent) and a treated one did
not. **The question for you is the shape and the timing, not those two coefficients.**

## 14. Pulmonary hypertension, revisited

Two things changed since §9. The desaturation now scales with **handling as well as pain**, because
pain decays within the hour and a baby therefore looked completely steady between one set of cares
and the next — handling is what lingers after anybody has touched this baby, and lingering is what
makes the swing visible.

And **relaxation now has to be earned by an act.** It used to be credited to any baby who was
swaddled and not in pain — but every baby in the unit starts swaddled, and pain is low almost
always, so every pulmonary-hypertensive baby got better for free: one traced from 0.38 to 0.11
across a night on which nobody did anything. It now runs off `protectedMin`, a countdown of
deliberately protected care set by comfort care (180 min) and kangaroo care (240 min).

**The claim being made is that a night shift cannot cure this**, only recognise it, avoid making it
worse, and get help. Measured, a baby left alone ends the night slightly worse and flagged at
handover; one given comfort care every two and a half hours improves from 0.34 to 0.24 and is not.
**Is that the right ceiling on what one night can achieve?**

## 15. The open porthole

**About once in fifteen parent-visited hours, a porthole is left open.** Confidence: **high that it
happens, low on the rate.**

This exists because hypothermia had no natural route into the game: every baby is servo-controlled,
so nothing made one cold unless the player opened the isolette. The thermal model itself is
unchanged — an open isolette equilibrates at `35.4 - 0.02 x (100 - humidity)`, so 34.4 to 35.0
depending on humidity, and a small baby gets most of the way there within half an hour.

**Is that too harsh for a porthole?** The equilibrium is the one for a fully open isolette, and a
single porthole vents less. Against that: the nurse raises it within about fifteen minutes, the
action to fix it is five minutes, and the whole point is that a baby loses heat much faster than
people expect. Measured under total neglect it does not kill anybody on its own — it costs about
600 cold minutes and a serious handover item.

It is restricted to isolettes with humidity of 50 or more, which in practice means babies under
about 32 weeks, and never fires while a baby is having kangaroo care or is in a crisis.

## 16. Who arrives on a ventilator, and on what

**Two archetypes can start on a tube — a chronic lung disease baby back on after a failed
extubation, and a 25-weeker nobody has extubated yet — and a shift that contains either always has
one.** Confidence: **high on the situations, moderate on the settings.**

This exists because nothing in the game arrived ventilated, which left the entire peak pressure,
rate, secretions and weaning system unreachable unless the player chose to intubate somebody.

Both arrive at **peak pressure 22 for a baby under 30 weeks** — two points above the limit in §7,
so the respiratory therapist asks you to come down — with the **rate low enough that the carbon
dioxide starts in the forties**. That combination is deliberate: the settings should be *wrong
enough to need you* and not *already harming*, or the shift begins with damage the player had no
chance to prevent.

**What I would most like checked:** whether inheriting a peak pressure two points over the limit
reads as a plausible handover or as a straw man. Real crept-up settings are usually a peak pressure
nobody has re-examined since the baby was sicker, which is what this is meant to be.

**A calibration change came with it.** Ventilator-associated pneumothorax ran at `0.0016` per point
over the limit per five minutes, which gave a baby inherited two points high roughly a coin-flip air
leak across one night. That turned "please wean these settings" into a death sentence for a baby
with nothing else wrong. It is now `0.0004` — a few percent a night, which is the published order of
magnitude. **The lung injury above it is unchanged**: pressure still costs BPD from the first
minute, quietly. The air leak is the dramatic version and should be the rarer one.

## 17. Hypocapnia, and a tube that moves

`C.hypocapnia` — **she raises it under 34, harm accrues under 30, and it is a serious handover item
under 25.** Confidence: **high on the direction, low on the exact numbers.**

The game modelled a driven-down CO2 and charged nothing for it: a baby given surfactant on a
ventilator settled at 22 and stayed there all night. Below 30 now feeds the same brain-injury sum as
blood pressure swings and acidosis.

**A limitation worth naming.** That sum is the germinal matrix haemorrhage model, and it is
correctly switched off for babies past about 32 weeks corrected — including the chronic lung disease
baby who is the one most likely to be ventilated. The white-matter injury hypocapnia actually causes
in an older preterm baby is not modelled at all. For those babies the cost is the handover item, the
scored decision and the debrief, not physiology. **Is that acceptable, or does the game need a
separate white-matter track?**

`C.ett` — **a tube slips at about 0.035 percent a minute at rest, rising with handling.** Measured,
that is one displacement in sixteen neglected shifts and more often on a baby being worked on.
Unplanned extubation and tube migration are among the commonest adverse events in neonatal intensive
care and handling is the dominant risk, but I have no number for the rate and this one is chosen to
make it an occasional event rather than a rarity or a certainty.

## 18. Haemoglobin, and carbon dioxide, in one place each

`C.hgb` and `C.co2`. Confidence: **high** — these are consolidations of numbers that were already
here, not new claims.

Haemoglobin had six thresholds scattered across six files, and adding the hover ranges made it
seven: a value of 8.5 read as out of range and non-critical at once. Carbon dioxide had four, and
the one the tooltip taught — 65 — was used by nothing.

| `C.hgb` | | |
|---|---|---|
| `nadir` | 9 | the floor of the expected physiological nadir |
| `pale` | 8.5 | this baby looks pale, and a nurse says so |
| `flagAt` | 8.5 | the lab result shouts, and the morning is told |
| `transfuseAbove` | 10 | above this a transfusion is not the answer |
| `treated` | 9.5 | what "the anaemia was dealt with" means |
| `polycythaemia` | 22 | |

| `C.co2` | | |
|---|---|---|
| `normalHigh` | 45 | strictly normal |
| `permissiveHigh` | 55 | deliberately allowed on support |
| `notEnough` | 65 | past here the ventilation is not enough |
| `critical` | 85 | a baby who needs somebody now |

**Two numbers moved in the consolidation and you may want them back:** the haemoglobin flag from 8
to 8.5, and the handover carbon dioxide from 75 to 65. The second is the game finally acting on what
it had been teaching.

**Also named rather than left loose:** `glucose.handoverBelow` (40, deliberately below the
symptomatic 45 — handing over at 43 is a note, at 39 it is the first thing the morning does) and
`sat.handoverBelow` (85, between the target and the red alarm, because a baby handed over at 87 is
neither in an emergency nor fine).

**A scope decision worth flagging:** hypocapnia now accrues only while a baby is on a ventilator. A
baby breathing for themselves with a low carbon dioxide is usually compensating for an acidosis,
which is the right thing to be doing and is a finding about the base deficit, not a harm to charge
anybody for. Before this the handover could say *"held there for eight hours by the ventilator"*
about a spontaneously breathing baby.

## 19. Intraventricular haemorrhage

`C.ivh` — **about 28 percent of babies still inside the window arrive with a bleed, 70 percent of
those grade 1 and 30 percent grade 2; a bleed can extend overnight at a lower threshold than a fresh
one needs.** Confidence: **high on the epidemiology, low on the risk coefficients.**

Before this, no baby ever had one: seventy babies across fourteen shifts, all grade 0. The head
ultrasound could only return one answer.

**The epidemiology is the solid part.** 20–25 percent of infants under 28 weeks, roughly 90 percent
within the first 72 hours, and the majority grade 1–2 and clinically silent. Only `micro` and `rds`
are inside the window; `iugr` closes on the first tick because its postmenstrual age is over 32,
which is right.

**The risk coefficients are calibration, not medicine.** Blood pressure swing, pH stress, handling,
a pneumothorax, sepsis and a driven-down CO2 all feed one sum, tuned so that gentle care leaves most
babies alone and constant handling drives them most of the way to a bleed without making it
certain. **Handling is capped** — uncapped it gave thirteen new bleeds to twenty babies, which
teaches only that you should never touch anybody.

**Three questions:**
- Is 28 percent of *eligible* babies too many? It is the population rate, but the game only draws
  babies who are one to three days old, which is exactly when it happens — so it may be right, or it
  may make bleeds feel routine.
- **A grade 2 drops the haemoglobin by about 0.9 and a grade 3 by 2.2, and raises the apnoea
  tendency.** Both are gestures at a real association rather than measured numbers. Is the direction
  right and the magnitude plausible?
- Extension is set at a threshold about 40 percent lower than a fresh bleed needs, and each further
  extension is harder again. Is "already bled means more fragile" the right claim to be making?

## The five questions I would most like answered

1. **Glucose (§4).** Is a single threshold of 45 defensible for a teaching tool, or does the
   first-4-hours distinction have to be in there?
2. **Bilirubin (§6).** Is the shape close enough to be worth keeping, or is it misleading
   enough that the game should stop showing a numeric threshold and just say "against the
   chart for this baby's age"?
3. **Temperature (§3).** Should a nurse come at 36.4 rather than 36.0?
4. **Heart rate (§2).** Is 180 the right upper alarm?
5. **Oxygen (§1).** Is it good teaching for injury to accrue in a band where nothing on
   screen complains, or should the alarm sit on the target?
6. **Pulmonary hypertension (§9).** Does making oxygen a relaxing influence teach the wrong
   habit in a game otherwise built around oxygen restraint?
7. **Reference ranges (§11).** The bands are fixed and the age-dependence is carried in words
   in the hover text. Is that the right trade for a teaching tool — and is any of those eight
   sentences wrong or misleading as written?
8. **The nurse's ceiling (§12).** At what oxygen requirement should a nurse stop adjusting and
   call a doctor? 0.45 is a guess about escalation culture and it drives when three of the six
   respiratory concerns fire.
9. **Carbon dioxide (§Ref, §12).** She raises a tiring baby at a CO2 over 62 *and* a rise of 9 over
   that baby's own recent baseline. Is that the right place to want a gas, or too early?
10. **The open porthole (§15).** Should an open porthole cool a baby as fast as a fully open
    isolette does, or does it want a gentler equilibrium of its own?
11. **Inherited ventilator settings (§16).** Is a peak pressure two points over the limit, with a
    normal carbon dioxide, a fair picture of settings that have crept up?
12. **Hypocapnia in an older preterm baby (§17).** The harm is modelled only where the brain-bleed
    window is open, which excludes the baby most likely to be ventilated. Does that need fixing, or
    is naming it in the debrief enough for a teaching tool?
13. **The consolidated thresholds (§18).** Two numbers moved to get everything into one place -
    the haemoglobin flag from 8 to 8.5 and the handover carbon dioxide from 75 to 65. Are both
    improvements, or would you rather the old values and a different tooltip?
14. **Brain bleeds (§19).** Three specific questions listed there - the arrival rate, the
    haemoglobin and apnoea effects, and whether an existing bleed should extend more readily.
15. **The attending's advice.** "Call the attending" is now a bedside action, and Dr. Halvorsen
   answers from the hidden state in a fixed order of priority — clamped lung vessels, air leak,
   stiff lungs, sepsis, gut, sugar, duct, bilirubin, anaemia, ventilator pressure, temperature.
   Is that the order a senior would actually think in, and is each line the steer you would
   give rather than the answer? The text is in `attendingSteer()` in `js/actions.js`.

## Changing any of it

Everything above is in [`js/clinical.js`](js/clinical.js), one entry per system, each with the
basis in a comment. Change the number, bump `BUILD` in `index.html`, and open `test/index.html`
over a local server. The suite checks that the game still agrees with itself — that the nurse
and the examination use the same glucose, that what the tooltips tell the player is what the
code uses, that a pressure which worries the therapist is a pressure that injures the lung.

It cannot tell you the medicine is right. That is what you are for.
