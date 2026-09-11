/* NICU Night Shift — every number a clinician would have an opinion about, in one place.

   WHY THIS FILE EXISTS
   These numbers used to be literals scattered through sim.js, events.js, game.js and
   actions.js, and they had drifted. The rule "a mean blood pressure should be at least the
   gestational age" was implemented five different ways. The game told the player a baby
   should sit between 36.5 and 37.5 degrees and then used nine different temperature
   boundaries. Worst of it: a nurse raised "she is jittery" at a glucose under 42 while the
   examination called a baby jittery only under 40, so between 40 and 42 a colleague told
   you something was wrong and the baby said otherwise - in a game whose whole premise is
   that the monitor may lie and the baby never does.

   HOW TO READ IT
   Every entry carries `why`, which is the basis for the number, and every one of them is
   meant to be argued with. See CLINICAL.md for the same material written for review rather
   than for the parser: what each number does in play, and how confident it is.

   Model COEFFICIENTS - how fast surfactant works, how likely an air leak is per minute -
   are deliberately NOT here. They are calibration, not medicine, and a clinician cannot
   usefully review them. They stay in sim.js. */
(function () {
  "use strict";

  var C = {

    /* ---------------------------------------------------------------- oxygen
       90-95% is the settled compromise for a preterm baby on supplemental oxygen: the
       NeOProM meta-analysis of SUPPORT / BOOST-II / COT found lower targets cost lives and
       higher targets cost eyes and lungs. Alarm limits sit ON the target edges, which is
       what most units do - an alarm one point outside the target is an alarm that teaches
       the target is somewhere else. A baby in room air is not being given oxygen, so a
       slightly lower floor there is about the baby, not about the dose. */
    sat: {
      targetLow: 90, targetHigh: 95,

      /* The ALARM sits a point outside the target, and the distinction is real rather than
         fudge. A saturation trace wanders by a point or two every breath, so an alarm set
         exactly on 95 chatters continuously and teaches the staff to ignore it - which is
         how alarm fatigue kills people. Setting it at 96 means the alarm means something.
         The HARM, though, starts at the target: eyes and lungs do not wait for the alarm.
         So o2Exposure accrues above targetHigh while the alarm waits until alarmHigh.

         Getting this wrong was measurable. With the alarm on the target edge, the "sitting
         high on oxygen" concern fired twelve times a shift and drowned every other thing a
         colleague had to say. */
      alarmLowOnOxygen: 89,
      alarmLowRoomAir: 88,
      alarmHigh: 96,
      /* Between the target and the red alarm. A baby handed over at 87 is not in an
         emergency and is not fine either, and neither of the other two numbers says so. */
      handoverBelow: 85,
      /* ...and it has to have been there a while. The handover line says "and staying
         there", and it was reading a single instant - so a baby having an ordinary
         self-resolving spell at seven in the morning was handed to the day team as a
         sustained desaturation, on a night where the baseline had been inside the target
         the whole time. Measured: every instance was a baby mid-spell, one of them with
         a lowSatMinutes of zero. Thirty minutes under target is a trend; forty seconds of
         apnea is a Tuesday. */
      handoverLowMinutes: 30,
      highForMinutes: 25,          // and above target THIS long before anyone is bothered
      alarmRed: 80,
      why: "NeOProM (SUPPORT/BOOST-II/COT): target 90-95% on oxygen; alarms set a point outside so they do not chatter."
    },

    /* ------------------------------------------------------------ heart rate
       100-160 is the ordinary newborn range. Bradycardia in a newborn is under 100 and
       matters immediately; under 90 is an emergency. The upper alarm was at 190, which is
       above where a unit would look - sustained tachycardia over 180 is worth noticing. */
    hr: {
      normalLow: 100, normalHigh: 160,
      alarmLow: 100, alarmRed: 90, alarmHigh: 180,
      why: "Ordinary newborn range 100-160; bradycardia <100, and >180 sustained is worth a look."
    },

    /* --------------------------------------------------------- temperature
       WHO's bands, used verbatim, because they are citable and because the game already
       tells the player the normal range in those words. Normal 36.5-37.5; cold stress
       36.0-36.4; moderate hypothermia 32.0-35.9. The game had nine boundaries between
       35.8 and 37.8 and stated a tenth to the player. */
    temp: {
      normalLow: 36.5, normalHigh: 37.5,
      coldStress: 36.5,            // below the normal range: the number is flagged
      hypothermia: 36.0,           // moderate hypothermia begins: alarms, a nurse comes, physiology bites
      severe: 35.0,                // red
      feverAmber: 37.5, feverRed: 38.0,
      why: "WHO thermal protection bands: normal 36.5-37.5, cold stress 36.0-36.4, moderate hypothermia <36.0."
    },

    /* ------------------------------------------------------------- glucose
       Genuinely contested, and the game should not pretend otherwise. The AAP intervenes
       at <40 mg/dL in a symptomatic baby and <25 in the first four hours; the Pediatric
       Endocrine Society wants >50 in the first 48 hours for a baby at risk. 45 is the
       middle of that argument and is close to the 2.6 mmol/L (47 mg/dL) threshold used
       across the UK and Australasia.

       ONE number for "low", used by the nurse who raises it, the examination that confirms
       it, and the physiology that acts on it. They disagreed before. */
    glucose: {
      low: 45,                     // jittery, and everything that follows from being low
      severe: 25,                  // brain at risk; this is the crisis
      hyperinsulinismRamp: 50,     // model: below this an untreated hyperinsulinism worsens
      /* Deliberately below `low`. Handing a baby over at 43 is a note; handing one over at
         39 is a problem the morning has to act on before anything else, and the AAP's
         symptomatic threshold is the citable place to draw that line. */
      handoverBelow: 40,
      treated: 50,                 // what "the low sugar was dealt with" means, in the puzzles
      why: "Between AAP (<40 symptomatic, <25 first 4h) and PES (>50 first 48h); ~2.6 mmol/L convention."
    },

    /* ------------------------------------------------- blood pressure (MAP)
       "Mean pressure at least the gestational age in weeks" is what about half of neonatal
       clinicians use, and there is no threshold at which treating has been shown to improve
       outcome. The game says as much out loud in the low-blood-pressure conversation, which
       is the honest position. So the rule is the reference point and the offsets hang off
       it, rather than five unrelated numbers.

       Offsets from gestational age in weeks: 0 = "at the rule". */
    map: {
      flagAt: 0,                   // the number is flagged on screen: below the rule
      alarmAmberAt: 0,             // and the monitor agrees, rather than waiting another point
      concernAt: -2,               // a nurse raises it once it is clearly under, not borderline
      alarmRedAt: -5,
      criticalAt: -5,              // and "critical" means the same thing the red alarm means
      why: "MAP < gestational age in weeks is the most used definition; no treatment threshold is evidence-based."
    },

    /* ----------------------------------------------------------- bilirubin
       The 2022 AAP revision raised phototherapy thresholds by roughly 1-2 mg/dL and is a
       family of curves by gestation, age in hours and neurotoxicity risk. A single formula
       cannot reproduce that and should not pretend to; this is the SHAPE - lower at birth,
       climbing over the first days, flattening - anchored at each gestation band.

       The old formula started a term baby at 15 on day 0, which is far too high for day
       zero, and capped at 20, which is too low by day four. Babies under 35 weeks are
       outside the AAP guideline entirely and are managed on lower, unit-specific charts. */
    bili: {
      startTerm: 11, startLate: 9.5, startPreterm: 6.5,     // day 0, mg/dL
      perDay: 2.4,
      capTerm: 21, capLate: 19, capPreterm: 14,
      lateFrom: 35, termFrom: 38,                            // weeks
      concernMargin: 3,            // a nurse notices yellow this far under the threshold
      dangerMargin: 5,             // this far over it and harm accrues
      why: "Shape of AAP 2022 phototherapy curves; <35 weeks is outside that guideline and lower."
    },

    /* ------------------------------------------------- ventilator pressure
       Peak pressure is the thing that leaves a lung scarred, and the number a unit will
       tolerate depends on how small the baby is. The nurse's worry and the injury the model
       applies used to sit one unit apart, so there was a band where damage accumulated and
       nobody said anything. */
    pip: {
      limitUnder30: 20, limitFrom30: 24,
      why: "Gentle ventilation: peak pressures much above 20-25 injure a small lung."
    },

    /* ----------------------------------------------------- the delivery room
       NRP 8th edition. The minute-by-minute targets are the MIDPOINT of each published
       band - the game used the top of every band from three minutes on, which quietly made
       a correctly-resuscitated baby look behind. Bands: 1min 60-65, 2min 65-70, 3min
       70-75, 4min 75-80, 5min 80-85, 10min 85-95. */
    delivery: {
      satByMinute: [62, 68, 72, 78, 82, 90],   // during minute 0-1, 1-2, ... 5-10
      satAfterTen: 93,
      hrAdequate: 100,             // over this and ventilation is working
      hrCompressions: 60,          // under this after effective ventilation, compressions
      minSecondsBeforeLeaving: 120,
      why: "NRP 8th edition: targets are band midpoints; HR <100 act, <60 compressions."
    },

    /* ------------------------------------------------- laboratory reference ranges
       WHY THESE ARE HERE. A blood count came back "WBC 6.2 / Hgb 9.4 / CRP 14" with nothing
       to compare it against, so a student learned only that a number exists. Every range
       below is what the player sees on hover, so the range and the sentence explaining it
       cannot drift apart, and a clinician changing one is changing what is taught.

       Every one of these is age-dependent in real life and the game does not model that.
       The tips say so where it matters rather than pretending to a precision the model
       does not have. `lo`/`hi` drive which number is marked abnormal on screen; a null
       means there is no meaningful bound on that side. */
    ref: {
      wbc: { lo: 5, hi: 20, unit: "\u00D710\u2079/L",
        tip: "That is the band after the first day of life; on the day of birth 5 to 20 would be low. A LOW " +
             "white count is more worrying than a high one in a newborn: it means the marrow is being consumed " +
             "faster than it can produce, which is what overwhelming infection does.",
        why: "Manroe/Schmutz neonatal ranges collapse hugely with postnatal age; 5-20 is the usable " +
             "after-day-one band. Neutropenia carrying worse prognosis than leucocytosis is the durable teaching point." },

      /* lo is 9, not 9.5: 9 to 11 IS the physiological nadir, so marking a 9.4 abnormal
         would contradict the sentence sitting next to it. The suite checks that every bound
         here appears in its own tip, because that is precisely how the two drift apart. */
      // lo and hi are filled in from C.hgb below: one place, one set of numbers
      hgb: { unit: "g/dL",
        tip: "A newborn starts at 13 to 20 and is supposed to be at the top of that. It falls on its own to " +
             "about 9 to 11 by a month - lower and sooner in a preemie, who also loses a surprising amount to " +
             "blood tests. Under 9 in a baby having more spells than yesterday is worth treating. Over 22 is the " +
             "other problem: too many red cells, thick blood, and a baby who looks ruddy and feeds poorly.",
        why: "Physiological nadir: term ~9-11 at 8-12 weeks, preterm ~7-9 at 4-8 weeks. Iatrogenic loss is " +
             "the dominant cause in a NICU and is the thing worth teaching." },

      crp: { lo: null, hi: 10, unit: "mg/L",
        tip: "The trap is timing rather than the number: CRP takes six to twelve hours to rise, so a value " +
             "under 10 taken early does NOT rule infection out. Two normal values twenty-four hours apart are " +
             "what actually make infection unlikely.",
        why: "CRP has poor sensitivity at presentation and good negative predictive value in serial pairs; " +
             "the timing caveat is more useful to a learner than the cutoff." },

      pH: { lo: 7.25, hi: 7.45, unit: "",
        tip: "Below 7.25 always needs an explanation - either the baby is not breathing the carbon dioxide " +
             "out, or the tissues are short of blood and making acid. The rest of the gas tells you which: a " +
             "high CO2 means the first, a large base deficit means the second. Above 7.45 is worth noticing too: " +
             "in a ventilated baby it usually means you are breathing for them too hard. In the first hours after " +
             "birth a mild acidosis is expected and corrects on its own; the same number on day three is not.",
        why: "Strict normal is 7.35-7.45; 7.25 is the practical floor under permissive hypercapnia. " +
             "The respiratory/metabolic split is the reason to send a gas at all." },

      co2: { lo: 35, unit: "mmHg",
        tip: "Strictly 35 to 45; up to 55 is deliberately allowed on support - permissive hypercapnia, " +
             "trading a slightly high CO2 for lower ventilator pressure, because pressure is what costs " +
             "lungs. Over 65 means the ventilation is not enough, whatever the oxygen is doing. A baby weeks " +
             "into chronic lung disease lives at a higher CO2 than a baby on day one and is used to it.",
        why: "Permissive hypercapnia is standard practice and the PIP trade-off is the lesson; 65 is where " +
             "the game's own crisis and concern thresholds sit." },

      baseDeficit: { lo: null, hi: 8, unit: "mmol/L",
        tip: "Under 4 is comfortable. Over 8 means acid is building up because tissues are not getting enough " +
             "blood or enough oxygen - a circulation question, not a lung question, and turning the oxygen up " +
             "will not fix it. A deficit in the first hours after a hard birth should be shrinking each time " +
             "you look; one that is growing is the one to worry about.",
        why: "BD > 8-10 is the usual marker of significant metabolic acidosis; separating it from the " +
             "respiratory component is the point of teaching it alongside CO2." }
    },

    /* --------------------------------------------- what the nurse does herself
       Nothing in the game moved the oxygen except the player's slider, so a baby who
       deteriorated simply desaturated and stayed there all night, and a baby who improved
       stayed on oxygen they no longer needed. No unit works that way: titrating oxygen to
       keep a baby in the target range is the single most frequent thing a NICU nurse does.

       Making her do it is what turns FiO2 from a knob into a READOUT. A rising requirement
       becomes something the player discovers rather than something only the player can
       cause - which is how it works at three in the morning, and it is what every
       respiratory concern in this game was silently waiting for.

       She titrates on the TRUE saturation, not the monitor, because she is standing at the
       cot and can see the baby. A probe that has slipped off reads 74 percent on a baby who
       is pink and wriggling; if she chased that number the game would be doing the wrong
       thing on the player's behalf and the artifact lesson would be destroyed. */
    o2Nurse: {
      ceiling: 0.45,              // she will go this far on her own, then she wants you
      upPerMin: 0.0030,           // ~18 points of oxygen an hour: safety is urgent
      downPerMin: 0.0018,         // ~11 an hour: weaning is not urgent, but nor is it optional
      weanAbove: 96,              // she only comes down once the baby is clear of the target
      handsOffMin: 20,            // after YOU move the slider, she leaves it alone this long
      /* ROUTINE CARES. Nappies, observations, a blood pressure cuff - a NICU baby is handled
         every few hours whatever anybody decides, and the game only ever generated handling
         from player actions. That made a pulmonary-hypertensive baby look completely stable
         all night, because nothing ever disturbed one, and the lability that IS the diagnosis
         never appeared. It is also what comfort care and morphine are for. */
      caresEveryMin: 190,
      caresHandling: 0.6,
      caresPain: 0.22,
      why: "Titration to a target range is standard nursing practice everywhere. Up fast and " +
           "down slow is real behaviour and is also what keeps weaning a decision the player " +
           "makes. The 0.45 ceiling is the point at which a nurse in any unit would want the " +
           "doctor at the cot rather than a further adjustment."
    },

    /* ------------------------------------------------------ how RDS actually goes
       Surfactant deficiency does not resolve overnight - it gets WORSE for the first day or
       so, because the lungs are consuming what little they have faster than an immature
       lung can make it, and production only ramps up around 48 to 72 hours. The game had
       severity decaying from the first tick and surfactant maturing at a flat rate, so an
       untreated severe RDS baby measurably IMPROVED across a night shift: saturations 90 to
       95, work of breathing 0.76 down to 0.55. The debrief would then tell the player that
       "CPAP alone was never going to hold them open", which the simulation had just spent
       twelve hours disproving. */
    rdsCourse: {
      worseUntilH: 40,            // hours of life: consumption outruns production until here
      matureFromH: 60,            // production properly ramps from about here
      earlyMakeFrac: 0.15,        // before worseUntilH the lung makes almost none
      midMakeFrac: 0.6,
      shortOf: 0.62,              // below this a lung is short of surfactant and consuming it
      consumePerMin: 0.00022,     // what a deficient lung burns while it is still too young
      worsenPerMin: 0.0035,       // severity gain per minute, scaled by how deficient it is
      why: "RDS classically worsens over 24-48h and improves as endogenous surfactant appears " +
           "around day 2-3; pre-surfactant natural history is exactly this curve. The numbers " +
           "are calibrated so an untreated moderate baby needs meaningfully more oxygen by " +
           "morning and a treated one does not."
    },

    /* --------------------------------------------------------- carbon dioxide
       A tiring baby retains CO2 long before anything else declares itself, and the game
       modelled it well and then never mentioned it: not one concern in the unit looked at
       CO2. A nurse cannot read a CO2 off the monitor either - what she sees is a baby who
       has gone quiet, is breathing shallowly and has stopped fighting. That is the concern,
       and a gas is the answer to it. */
    co2Concern: {
      raiseAt: 62,                // she notices the picture at about here
      urgentAt: 72,
      /* AND it has to have CHANGED. Level alone had her raising it 8.8 times a night: a baby
         who retains CO2 goes on retaining it, and she came back every cooldown to say so.
         Her own line is "something has changed in the last hour", so the trigger is a rise
         above a slow-following baseline - a worsening baby keeps reaching her, a stably
         high one does not. */
      riseOver: 9,
      baseFollowMin: 110,         // how fast the baseline catches up with a new normal
      why: "Above about 60 with a rising trend is where most units act; 55 alone is tolerated " +
           "under permissive hypercapnia. The signs named are the bedside picture of " +
           "hypercapnia and respiratory fatigue, not a number she could not have."
    },

    /* ------------------------------------------------------- haemoglobin
       SIX different numbers used to answer questions about the same one measurement: the
       lab result shouted below 8, the skin went pale below 8.5, the nurse raised it below
       8.5, the handover flagged it below 8, the attending mentioned it below 9, a
       transfusion was refused above 10, the anaemia puzzle called itself fixed above 9.5,
       and the hover text I added later told the player to expect 9 to 22 - so a value of
       8.5 read as out of range and non-critical at once, an inch apart on the same screen.

       They are not all the same question, and they should not all be the same number. But
       they should all be named, in one place, so that a clinician moving one can see what
       else moves with it. */
    hgb: {
      nadir: 9,                    // the floor of the expected physiological nadir
      pale: 8.5,                   // this baby looks pale, and a nurse says so
      flagAt: 8.5,                 // the lab result shouts, and the morning is told
      transfuseBelow: 10,          // below this a transfusion is the answer, above it is not
      treated: 9.5,                // and this is what "the anaemia was dealt with" means
      polycythaemia: 22,
      why: "Physiological nadir is roughly 9-11 term and 7-9 preterm, so 9 is the floor of " +
           "expected rather than a treatment threshold; most units transfuse a symptomatic " +
           "baby below about 10 and few above it. Pallor is not reliably visible until the " +
           "middle eights."
    },

    /* ------------------------------------------------------ carbon dioxide
       The tooltip taught "over 65 means the ventilation is not enough" and NOTHING in the
       game used 65: the handover flagged 75, the crisis at 85, the extubation refusal at 62.
       Teaching one number and acting on another is exactly the failure clinical.js exists
       to stop. */
    co2: {
      normalHigh: 45,              // strictly normal
      permissiveHigh: 55,          // and this much is deliberately allowed on support
      notEnough: 65,               // past here the ventilation is not enough, whatever the oxygen is
      critical: 85,                // and here the baby is in real trouble
      why: "Permissive hypercapnia is standard practice up to about 55. 65 is where most " +
           "guidelines stop tolerating and start changing something; 85 with an acidosis is " +
           "a baby who needs somebody now."
    },

    /* ------------------------------------------------------------- sepsis
       THE SENTENCE THIS GAME WAS MISSING. Measured across every puzzle, all three infection
       puzzles - early-onset in the 25-weeker, late-onset on a central line, and pneumonia in
       the term baby - had NOTHING pointing at them. The unit raised low blood pressure, which
       is a late consequence, and the debrief then said "temperature instability plus just not
       right plus a central line means culture and antibiotics tonight", describing signs the
       game never showed anybody.

       "She is just not right" is the most important sentence in neonatology and the hardest
       to teach, because it is a gestalt rather than a number. The threshold is where the
       model's own correlates - temperature swinging, mottled perfusion, a baby who does not
       tolerate handling - are established enough for an experienced nurse to notice. */
    sepsisSign: {
      noticeAt: 0.22,             // she is uneasy, and she is usually right
      urgentAt: 0.5,
      why: "There is no test for this and no threshold in any guideline; the whole teaching " +
           "point is that a nurse's unease precedes every number. It is set below the level " +
           "at which the blood pressure falls, because arriving after the blood pressure is " +
           "arriving late."
    },

    /* ---------------------------------------------------------- hypocapnia
       The game teaches permissive hypercapnia carefully and taught nothing at all about the
       other end. Measured, a baby given surfactant on a ventilator settled at a CO2 of 22
       and stayed there all night at no cost whatever - which is the one number on a
       ventilator that a doctor should be most uncomfortable seeing.

       Blowing the carbon dioxide down constricts the cerebral arteries. In a preterm baby
       that is a white-matter and periventricular injury mechanism, and it is one of the
       reasons "the ventilator is set and the baby looks lovely" is a dangerous sentence. */
    hypocapnia: {
      raiseAt: 34,                // she notices a baby who has stopped triggering at all
      harmBelow: 30,              // below this the vessels are clamping down
      severeBelow: 25,
      openMinutes: 60,            // minutes below harmBelow before the morning inherits it
      why: "Under 30-35 mmHg is consistently associated with periventricular leukomalacia and " +
           "cerebral palsy in ventilated preterm infants; under 25 more strongly still. There " +
           "is no threshold trial, but every unit's guideline tells you not to go there."
    },

    /* --------------------------------------------------- the germinal matrix
       WHY THESE MOVED. Measured across fourteen ordinary shifts, seventy babies, every one
       came out grade 0 - and a deliberately worst-possible night (handling pinned high, mean
       pressure at 12, base deficit 16, septic, ventilated at 30 over 60, held for twelve
       hours) only just crossed the line. So the head ultrasound could only ever say "no
       bleeding seen": three of its four results were dead text, and the whole handling and
       blood-pressure model had no consequence to point at.

       Real intraventricular haemorrhage happens to something like a fifth to a quarter of
       babies under 28 weeks, almost all of it in the first 72 hours, and most of it is grade
       1 or 2 and found on a routine scan rather than by anybody noticing. So some babies now
       ARRIVE with one - which is what makes it a management problem rather than a lottery -
       and a badly run night can extend it. */
    ivh: {
      arriveChance: 0.28,          // of a baby still inside the window at handover
      arriveGrade2: 0.3,           // and this fraction of those are a grade 2 rather than a 1
      riskPerMin: 0.00045,         // was 0.00035, which nothing could ever reach
      knownThreshold: 0.62,        // a matrix that has already bled is more fragile than one that has not
      extendRaises: 1.35,          // and each extension is harder to reach than the last
      why: "20-25% of infants under 28 weeks, ~90% within 72 hours, and the majority grade 1-2 " +
           "and clinically silent. Extension of an existing bleed is the thing minimal handling " +
           "and stable blood pressure are actually for, which is why an arriving bleed teaches " +
           "more than a new one."
    },

    /* --------------------------------------------------- a tube that moves
       An endotracheal tube in a 900 gram baby has about a centimetre of margin, and a baby
       who is handled moves. h.ettDisplaced existed from the beginning - it costs 0.42 of
       lung function, it shows on a film, it shows on examination, and the emergency
       checklist has a branch written for finding it - and NOTHING in the game ever set it.
       The entire feature was reachable only by reading the source. */
    ett: {
      slipPerHandling: 0.0022,    // per minute, scaled by how much this baby is being moved
      slipBaseline: 0.00035,      // and a little even when nobody is touching them: babies wriggle
      why: "Unplanned extubation and tube migration are among the commonest adverse events in " +
           "neonatal intensive care, and handling is the dominant risk. The rate here is set " +
           "so it is an occasional event on a ventilated baby who is being worked on, not a " +
           "certainty and not a rarity."
    },

    /* ------------------------------------------------- pulmonary hypertension
       The clinical sign is not a low saturation, it is a saturation that does not follow
       the oxygen you are giving. A baby with open lung vessels on 40 percent sits well
       above 95; one below 94 on that much oxygen is shunting past the lungs, and THAT is
       the finding worth calling a doctor for. Both numbers here gate a nurse's concern,
       not any physiology - the model runs on h.pphn regardless. */
    pphn: {
      alertFio2: 0.40,
      alertSat: 94,
      why: "The sign is the gap between the dose and the response. 40% is where a healthy " +
           "lung is comfortably above target, so failing to reach 94 on it is a shunt " +
           "question, not an oxygen question. Handling-related desaturation is the classic " +
           "bedside description and is what the concern text names."
    },

    /* ------------------------------------------------------- the oxygen creep
       A rising requirement is the earliest signal a unit gets and the cheapest to act on.
       Measured against this baby's OWN lowest requirement tonight rather than any absolute,
       because 30 percent means something different in a 25-weeker and a term baby. */
    o2Creep: {
      alertRise: 0.08,
      alertFrom: 0.30,
      why: "Eight points above a baby's own floor is more than trace wander and less than " +
           "the 45 percent at which the existing concern fires - the window in which there " +
           "is still a diagnosis to make rather than a crisis to manage."
    }
  };

  /* ONE SET OF NUMBERS. The reference ranges the player is shown on hover are the same
     objects the rest of the game compares against, rather than a second copy of them that
     drifts. The suite checks the whole codebase for a comparison against a bare number on
     any of these fields; the only file allowed to hold one is this one. */
  C.ref.hgb.lo = C.hgb.nadir;
  C.ref.hgb.hi = C.hgb.polycythaemia;
  C.ref.co2.hi = C.co2.permissiveHigh;

  // the bilirubin threshold for this baby today
  C.biliThreshold = function (ga, dol) {
    var start = ga >= C.bili.termFrom ? C.bili.startTerm
              : ga >= C.bili.lateFrom ? C.bili.startLate : C.bili.startPreterm;
    var cap = ga >= C.bili.termFrom ? C.bili.capTerm
            : ga >= C.bili.lateFrom ? C.bili.capLate : C.bili.capPreterm;
    return Math.min(cap, start + C.bili.perDay * dol);
  };

  // the peak pressure this baby should not be above
  C.pipLimit = function (ga) { return ga < 30 ? C.pip.limitUnder30 : C.pip.limitFrom30; };

  // the saturation a baby this many seconds old ought to have reached
  C.satTarget = function (sec) {
    var m = Math.floor(sec / 60);
    return m >= 10 ? C.delivery.satAfterTen
         : C.delivery.satByMinute[Math.min(m, C.delivery.satByMinute.length - 1)];
  };

  window.Clinical = C;
})();
