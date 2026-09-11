/* NICU Night Shift — the census.
   Eight clinical archetypes; five are drawn each shift. Names, families, gestations,
   weights and bed order are all randomised, so two shifts never look alike. */
(function () {
  "use strict";
  var S = window.Sim, NB = window.NameBank, CL = window.Clinical;

  function baseHidden() {
    return {
      surfactant: 0.9, rds: 0, secretions: 0.1, ptx: false, ptxPending: 0, ettDisplaced: false,
      aspiration: 0, pphn: 0, bpd: 0, volutrauma: 0, surfTreatPending: 0,
      apneaTend: 0.2, caffeine: false, apneaNow: false, apneaLen: 0, apneaDepth: 0,
      spells: 0, spellsThisHour: 0, severeSpells: 0, stimulated: false,
      spontDrive: 1.0, fatigue: 0.1, morphine: false, morphineLevel: 0,
      co2: 45, baseDeficit: 2, map: 32, mapSwing: 0,
      pda: 0, pdaTreat: 0, hypovolemia: 0, pressors: 0, pressorInfusion: false, pressorDose: 0,
      coreTemp: 36.8, coldMinutes: 0, kangaroo: false, kangarooMinutes: 0, swaddled: true, hat: true,
      glucose: 70, gir: 0, dexPct: 0, ivRate: 0, glucoseDrain: 1, d10bolus: 0,
      // glycogen: how much sugar this baby can make for itself with nothing running.
      // hypoDrive / hypoDriveMax: an active hypoglycaemia, which a puzzle turns on.
      glycogen: 0.8, hypoDrive: 0, hypoDriveMax: 0,
      hypoMinutes: 0, severeHypoMinutes: 0, iugr: false, motherDiabetic: false,
      bili: 5, hemolysis: 0.05, photo: 0, biliThreshold: 15, biliDangerMinutes: 0,
      sepsis: 0, sepsisLatent: 0, abx: false, abxMinutes: -1, cultureDrawn: false,
      wbc: 12, crp: 2, shockMinutes: 0,
      gutTol: 0.8, residuals: 0, necRisk: 0, necGrade: 0, feedsMlKgD: 0, feedAdvanceStress: 0,
      hgb: 14, draws: 0,
      ivhWindow: true, ivhAccum: 0, ivhThreshold: 1.0, ivhGrade: 0, handling: 0,
      ivhAtHandover: 0, fontanelleFull: false,
      pain: 0.1, painStim: 0, painMinutes: 0, comfortActs: 0, awake: false,
      o2Exposure: 0, highSatMinutes: 0, lowSatMinutes: 0, criticalMinutes: 0, criticalRun: 0,
      helpAsked: false, fio2Floor: undefined, o2Creep: 0,
      /* ageH is real hours of life, not the shift clock: RDS turns the corner on it,
         and dol alone could not say whether a day-0 baby was two hours old or twenty. */
      ageH: 0, o2HandsOff: 0, o2Ceilinged: 0, co2Base: null, caresIn: null, protectedMin: 0,
      hypocapMinutes: 0, hypocapWorst: null,
      portholeDone: false,
      uvc: false, feedTube: false, artifactProbe: false, artifactProbeAt: 0, artifactLead: false
    };
  }

  function R(a, b) { return a + S.rnd() * (b - a); }
  function Ri(a, b) { return Math.round(R(a, b)); }

  /* ------------------------------------------------------------------ archetypes
     Each has: a clinical situation, ranges for gestation / age / weight, opening
     support, a setter for hidden state, a handover written from the situation, and a
     weighted pool of hidden problems with the truth revealed at the end.          */
  var ARCHETYPES = [
    {
      key: "micro", label: "extremely preterm, first days",
      ga: [24, 27], dol: [1, 3], wt: [520, 900],
      support: { mode: "CPAP", fio2: 0.28, cpap: 6, peep: 5, pip: 18, rate: 40, isoTemp: 36.8, humidity: 80, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = R(0.48, 0.62); h.rds = R(0.4, 0.7); h.apneaTend = R(0.8, 1.0); h.caffeine = true;
        h.glycogen = 0.2;
        h.dexPct = 10; h.ivRate = 80; h.feedsMlKgD = Ri(10, 25); h.gutTol = 0.6;
        h.bili = R(6.5, 8.5); h.uvc = true; h.feedTube = true; h.ivhThreshold = 0.85; h.hgb = R(11.5, 13.5);
      },
      vent: {
        chance: 0.5,
        support: { mode: "VENT", fio2: 0.32, cpap: 6, peep: 5, pip: 22, rate: 25,
                   isoTemp: 36.8, humidity: 80, servo: true, isoOpen: false },
        set: function (h) { h.secretions = R(0.22, 0.34); h.spontDrive = R(0.7, 0.95); }
      },
      handoff: function (b) {
        if (b.ventedAtHandover)
          return "Born at " + b.ga + " weeks by emergency section. " + b.riskLine +
                 " Surfactant in the delivery room and still on the ventilator - nobody has felt brave " +
                 "enough to take the tube out yet. The day team says " + b.pronoun.s + " " +
                 b.pronoun.has + " been a bit unsettled this evening.";
        return "Born at " + b.ga + " weeks by emergency section. " + b.riskLine +
               " Surfactant in the delivery room, extubated to CPAP yesterday. The day team says " +
               b.pronoun.s + " " + b.pronoun.has + " been a bit unsettled this evening.";
      },
      risks: ["Mum had a fever in labour and the membranes were ruptured for over a day.",
              "Mum was on antibiotics before delivery for a suspected infection.",
              "It was a quick, clean delivery with no obvious risk factors."],
      puzzles: [
        { id: "sepsis", w: 3, dx: { test: 'A blood culture or a blood count would have shown it.', found: function (b) { return !!(b.labs.culture || b.labs.cbc); },
                fixed: function (b) { return b.h.abx; } },
          apply: function (h) { h.sepsisLatent = Ri(30, 70); h.apneaTend += 0.25; },
          truth: "was developing early-onset sepsis. The clue was in the handover all along, and then in the rising spell count.",
          key: "Draw a blood culture and start antibiotics early. Increasing A's and B's in a baby with risk factors is sepsis until proven otherwise." },
        { id: "anemia", w: 2, dx: { test: 'A blood count would have shown it.', found: function (b) { return !!b.labs.cbc; },
                fixed: function (b) { return b.h.hgb > CL.hgb.treated; } },
          apply: function (h) { h.hgb = R(7.0, 8.2); h.apneaTend += 0.15; },
          truth: "was anaemic. Days of blood draws with nothing put back, and anaemia makes spells worse.",
          key: "Check a haemoglobin when spells increase. A transfusion often settles them completely." },
        { id: "quiet", w: 2, benign: true, apply: function (h) { h.apneaTend *= 0.85; },
          truth: "was simply being an extremely premature baby: spells from an immature brainstem, nothing sinister underneath.",
          key: "Not every change is a disaster. Watching carefully and doing very little is a real clinical decision." }
      ]
    },
    {
      key: "rds", label: "moderately preterm, born tonight",
      ga: [29, 31], dol: [0, 0], wt: [1250, 1650],
      support: { mode: "CPAP", fio2: 0.30, cpap: 6, peep: 5, pip: 18, rate: 40, isoTemp: 36.8, humidity: 70, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = R(0.45, 0.56); h.rds = R(1.2, 1.6); h.apneaTend = R(0.4, 0.6); h.glycogen = 0.3;
        h.dexPct = 10; h.ivRate = 60; h.gutTol = 0.75; h.bili = R(2.5, 4); h.uvc = true; h.co2 = R(48, 55);
      },
      handoff: function (b) {
        return "Born " + Ri(2, 6) + " hours ago at " + b.ga + " weeks after preterm labour. " + b.riskLine +
               " Started on CPAP in the delivery room. Grunting on and off since admission.";
      },
      risks: ["Mum got one dose of steroids before delivery, not the full course.",
              "There was no time for steroids at all.",
              "Mum completed the full course of steroids two days ago."],
      puzzles: [
        { id: "rds", w: 3, dx: { test: 'A blood gas or a chest film would have shown it.', found: function (b) { return !!(b.labs.gas || b.labs.cxr); },
                fixed: function (b) { return b.h.surfactant > 0.62 || b.h.surfTreatPending > 0; } },
          apply: function (h) { h.surfactant = R(0.36, 0.44); h.rds = R(1.8, 2.2); },
          truth: "had significant respiratory distress syndrome. The lungs were short of surfactant and CPAP alone was never going to hold them open.",
          key: "Rising oxygen need plus rising CO2 on CPAP means it is time for surfactant, and usually a tube to give it through." },
        { id: "mild", w: 2, benign: true, apply: function (h) { h.surfactant = R(0.58, 0.68); h.rds = R(0.7, 1.0); },
          truth: "had mild RDS that CPAP handled beautifully, and needed neither surfactant nor a ventilator.",
          key: "CPAP first is the modern approach. Escalating a baby who is coping is its own kind of harm." },
        { id: "ptx", w: 2, dx: { test: 'A chest film would have shown it - or a torch and a stethoscope, faster.', found: function (b) { return !!b.labs.cxr || b.h.ptxHandled; },
                fixed: function (b) { return !b.h.ptx; } },
          apply: function (h) { h.surfactant = R(0.5, 0.6); h.rds = R(1.0, 1.4); h.ptxPending = Ri(70, 190); },
          truth: "developed a pneumothorax: an air leak from an over-stretched lung.",
          key: "A sudden desaturation that does not respond to more oxygen, with quieter breath sounds on one side, is a pneumothorax until proven otherwise." }
      ]
    },
    {
      key: "feeder", label: "late preterm, feeding and growing",
      ga: [34, 36], dol: [3, 6], wt: [1950, 2450],
      support: { mode: "RA", fio2: 0.21, cpap: 5, peep: 5, pip: 16, rate: 30, isoTemp: 36.6, humidity: 40, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = 1.0; h.rds = 0; h.secretions = 0.03; h.apneaTend = R(0.12, 0.24);
        h.feedsMlKgD = Ri(110, 140); h.gutTol = 0.9; h.feedTube = true;
        h.bili = R(10, 13); h.hemolysis = 0.4; h.ivhWindow = false;
      },
      handoff: function (b) {
        return "Late preterm, " + b.dol + " days old, here to learn to feed and to grow. " + b.riskLine +
               " " + b.parentName + " is keen to try feeding tonight.";
      },
      risks: ["Getting more yellow each day, and there is a blood group difference between mum and baby.",
              "Steadily more jaundiced since day two.",
              "Feeding well by day, tiring by night."],
      puzzles: [
        { id: "jaundice", w: 3, dx: { test: 'A bilirubin level would have shown it. Never judge jaundice by eye.', found: function (b) { return !!b.labs.bili; },
                fixed: function (b) { return !!b.h.photo; } },
          apply: function (h) { h.bili = R(13.5, 15.5); h.hemolysis = R(0.65, 0.85); },
          truth: "had haemolytic jaundice from blood group incompatibility. The bilirubin was climbing fast and needed light quickly.",
          key: "Compare the level to the threshold for the baby's age in hours, not to a single magic number. Rising fast plus haemolysis means start phototherapy now." },
        { id: "feeder", w: 2, benign: true, apply: function (h) { h.bili = R(9.5, 11); h.hemolysis = 0.25; },
          truth: "was a straightforward feeder and grower. The jaundice was ordinary and settling on its own.",
          key: "Most jaundice is normal. Treating it is easy; knowing when you do not need to is the skill." },
        { id: "hypo", w: 2, dx: { test: 'A heel-prick glucose would have shown it, in five minutes.', found: function (b) { return !!b.labs.glucose; },
                fixed: function (b) { return b.h.glucose >= CL.glucose.treated; } },
          apply: function (h) { h.bili = R(10, 12); h.motherDiabetic = true; h.glucose = R(32, 42);
            h.hypoDrive = 20; h.hypoDriveMax = 28; },
          truth: "had a mother with gestational diabetes, and the baby's own insulin kept dropping the blood sugar.",
          key: "A jittery late-preterm baby of a diabetic mother: check the glucose before you assume anything else." }
      ]
    },
    {
      key: "chronic", label: "long-stay preterm, weeks in",
      ga: [26, 28], dol: [12, 22], wt: [980, 1350],
      support: { mode: "CPAP", fio2: 0.27, cpap: 6, peep: 5, pip: 18, rate: 40, isoTemp: 36.4, humidity: 55, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = R(0.62, 0.72); h.rds = 0.2; h.secretions = 0.06; h.apneaTend = R(0.45, 0.65); h.caffeine = true;
        h.glycogen = 0.35;
        h.feedsMlKgD = Ri(130, 160); h.gutTol = 0.8; h.feedTube = true;
        h.bili = R(3, 5); h.hgb = R(8.8, 10.2); h.ivhWindow = false; h.bpd = 0.3;
      },
      /* THE VENTILATED BABY. No archetype started on a ventilator and no admission arrived
         on one, so `highpip`, `extubatable` and `wetchest` - and the whole pressure, rate
         and weaning system behind them - existed only if the player chose to intubate
         somebody. A third of the support model sat behind a door nobody had a reason to
         open. A chronic lung disease baby back on the ventilator after a failed extubation
         is the most ordinary vented baby in any unit, and it is inherited rather than
         caused, which makes the night about getting them off rather than putting them on. */
      vent: {
        chance: 0.7,
        /* Settings that have crept up, not settings that are blowing the baby off. A peak
           pressure of 23 is over the limit for this gestation so the therapist asks you to
           come down on it - that is the story - while the rate is low enough that the
           carbon dioxide starts in the forties. Over-ventilating is then something the
           player can do, which is the only way it teaches anything. */
        support: { mode: "VENT", fio2: 0.35, cpap: 6, peep: 5, pip: 22, rate: 20,
                   isoTemp: 36.4, humidity: 55, servo: true, isoOpen: false },
        set: function (h) {
          h.secretions = R(0.28, 0.4);     // a tube makes secretions, and wetchest needs some
          h.bpd = R(0.42, 0.55);           // the lungs remember every extubation that failed
          h.spontDrive = R(0.85, 1.0);
        }
      },
      handoff: function (b) {
        if (b.ventedAtHandover)
          return b.dol + " days old, born at " + b.ga + " weeks. A long, slow road. Extubated on Tuesday, " +
                 "back on the ventilator by Wednesday night, and the settings have crept up since. On full " +
                 "feeds and gaining. The day team would like " + b.pronoun.o + " off the tube. " + b.riskLine;
        return b.dol + " days old, born at " + b.ga + " weeks. A long, slow road. Still on CPAP, on full feeds, " +
               "gaining weight. " + b.riskLine;
      },
      risks: ["The day team heard a murmur this afternoon and wondered about the duct.",
              function (b) { return "The nurse says " + b.pronoun.s + " " + b.pronoun.has +
                " been needing more oxygen than usual today."; },
              "Feeds have been advanced twice this week and the belly has looked a little full."],
      puzzles: [
        { id: "pda", w: 3, dx: { test: 'An echo would have shown it.', found: function (b) { return !!b.labs.echo; },
                fixed: function (b) { return b.h.pdaTreat > 0 || b.h.pda < 0.3; } },
          apply: function (h) { h.pda = R(0.6, 0.8); },
          truth: "had a patent ductus arteriosus, the fetal shortcut that should have closed. It was flooding the lungs and stealing blood from the rest of the body.",
          key: "Bounding pulses, a wide pulse pressure, a murmur and creeping oxygen needs: get an echo, then decide to treat or to wait." },
        { id: "nec", w: 3, dx: { test: 'An abdominal film or a blood culture would have shown it.', found: function (b) { return !!(b.labs.axr || b.labs.culture); },
                fixed: function (b) { return b.h.feedsMlKgD === 0 && b.h.abx; } },
          apply: function (h) { h.gutTol = R(0.16, 0.24); h.feedAdvanceStress = 0.7; },
          truth: "was developing necrotising enterocolitis. The first signs were green residuals and a belly that looked a little fuller than yesterday.",
          key: "Stop feeds, decompress the stomach, X-ray the abdomen, start antibiotics and call the surgeons. Hours matter." },
        { id: "growing", w: 2, benign: true, apply: function (h) { h.pda = R(0.15, 0.3); },
          truth: "was simply a chronic preemie having an ordinary night. The murmur was small and closing on its own.",
          key: "A murmur is a finding, not a diagnosis. The echo is what tells you whether it matters." }
      ]
    },
    {
      key: "term", label: "term baby, difficult birth",
      ga: [38, 41], dol: [0, 0], wt: [2900, 3900],
      support: { mode: "NC", fio2: 0.35, cpap: 5, peep: 5, pip: 20, rate: 40, isoTemp: 36.5, humidity: 40, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = R(0.9, 1.0); h.rds = 0.1; h.secretions = 0.05; h.apneaTend = 0.08; h.aspiration = R(0.2, 0.3);
        h.glycogen = 1.0;
        h.dexPct = 10; h.ivRate = 60; h.bili = R(2.5, 3.5); h.ivhWindow = false; h.co2 = R(46, 52); h.hgb = 16;
      },
      handoff: function (b) {
        return "Born at term about two hours ago. " + b.riskLine +
               " Came to us breathing fast with saturations that kept dipping. The parents are frightened; this was not their plan.";
      },
      risks: ["Thick meconium in the fluid, and " + "the baby needed help to start breathing. Apgars were 4 and 7.",
              "A long second stage and a difficult forceps delivery. Apgars 5 and 8.",
              "An emergency section for a heart-rate trace everyone disliked. Apgars 6 and 9."],
      puzzles: [
        { id: "ttn", w: 3, benign: true, apply: function (h) { h.aspiration = R(0.18, 0.26); },
          truth: "had transient tachypnoea: wet lungs after a hard birth. It resolved on its own over a few hours, exactly as it usually does.",
          key: "Term babies breathing fast after birth usually improve. Support gently and give it time before escalating." },
        { id: "pphn", w: 2, dx: { test: 'An echo would have shown it - the only test that sees the lung pressures.', found: function (b) { return !!b.labs.echo; },
                fixed: function (b) { return b.h.pphn < 0.2 || (b.h.comfortActs > 0 && b.h.helpAsked); } },
          apply: function (h) { h.aspiration = R(0.45, 0.6); h.pphn = R(0.3, 0.45); },
          truth: "had meconium aspiration with persistent pulmonary hypertension: the lung blood vessels stayed clamped shut as if still in the womb.",
          key: "Saturations that swing wildly and do not follow the oxygen you give: think pulmonary hypertension, keep the baby calm, and call for help early." },
        { id: "sepsis2", w: 2, dx: { test: 'A blood culture or a blood count would have shown it.', found: function (b) { return !!(b.labs.culture || b.labs.cbc); },
                fixed: function (b) { return b.h.abx; } },
          apply: function (h) { h.sepsisLatent = Ri(40, 80); h.aspiration = 0.3; },
          truth: "had pneumonia and early sepsis, not simply wet lungs.",
          key: "A term baby who is not following the expected getting-better curve deserves a septic screen." }
      ]
    },
    {
      key: "iugr", label: "small and growth restricted",
      ga: [32, 34], dol: [1, 2], wt: [1150, 1500],
      support: { mode: "NC", fio2: 0.25, cpap: 5, peep: 5, pip: 18, rate: 40, isoTemp: 36.7, humidity: 55, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = R(0.78, 0.9); h.rds = R(0.2, 0.5); h.apneaTend = R(0.3, 0.5); h.iugr = true;
        h.glycogen = 0.1;                      // months of starving in the womb leave no store at all
        h.dexPct = 10; h.ivRate = 70; h.feedsMlKgD = Ri(20, 50); h.gutTol = 0.55;
        h.bili = R(5, 7); h.hgb = R(15, 18); h.glucose = R(45, 60);
      },
      handoff: function (b) {
        return "Born at " + b.ga + " weeks but only " + b.weightG + " grams, which is small even for that. " + b.riskLine +
               " Blood sugars have been on the low side of acceptable all day.";
      },
      risks: ["The placenta was small and the growth scans had been falling off for weeks.",
              "Mum had high blood pressure through the pregnancy and the baby stopped growing.",
              "Growth restriction picked up late, and delivery was brought forward for it."],
      puzzles: [
        { id: "hypoglycaemia", w: 3, dx: { test: 'A heel-prick glucose would have shown it, in five minutes.', found: function (b) { return !!b.labs.glucose; },
                fixed: function (b) { return b.h.glucose >= CL.glucose.treated && b.h.gir >= 5; } },
          apply: function (h) { h.glucose = R(28, 38); h.dexPct = 10; h.ivRate = 55;
            h.hypoDrive = 26; h.hypoDriveMax = 38; },
          truth: "was hypoglycaemic. A growth-restricted baby is born with almost no stored sugar, and burns through what little there is.",
          key: "Fix it with a bolus AND turn up the glucose infusion rate, or it simply falls again. Growth-restricted babies need more sugar per kilo, not less." },
        { id: "gutcaution", w: 2, dx: { test: 'An abdominal film, or simply laying hands on that belly, would have shown it.', found: function (b) { return !!(b.labs.axr) || !!b.findings; },
                fixed: function (b) { return b.h.feedsMlKgD === 0 || b.h.gutTol > 0.45; } },
          apply: function (h) { h.gutTol = R(0.25, 0.35); h.feedAdvanceStress = 0.5; },
          truth: "had a gut that had spent months short of blood supply, and did not tolerate being fed quickly.",
          key: "Growth-restricted babies are at higher risk of NEC. Advance their feeds more slowly, not faster to catch up." },
        { id: "polycythaemia", w: 2, dx: { test: 'A blood count would have shown it.', found: function (b) { return !!b.labs.cbc; },
                fixed: function (b) { return !!b.h.photo || b.h.bili < b.h.biliThreshold; } },
          apply: function (h) { h.hgb = R(21, 24); h.bili = R(8, 10); h.hemolysis = 0.45; },
          truth: "had polycythaemia: too many red cells, made in response to months of low oxygen before birth. Thick blood, sluggish flow, and then jaundice as the extra cells were recycled.",
          key: "A ruddy, small baby with a very high haemoglobin will often become jaundiced as those extra red cells break down." }
      ]
    },
    {
      key: "late-sepsis", label: "a fortnight in, with a central line",
      ga: [29, 31], dol: [8, 14], wt: [1300, 1700],
      support: { mode: "NC", fio2: 0.24, cpap: 5, peep: 5, pip: 18, rate: 40, isoTemp: 36.5, humidity: 50, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = R(0.78, 0.88); h.rds = 0.15; h.apneaTend = R(0.3, 0.45); h.caffeine = true; h.glycogen = 0.35;
        h.feedsMlKgD = Ri(90, 130); h.gutTol = 0.75; h.dexPct = 10; h.ivRate = 40;
        h.feedTube = true; h.uvc = true; h.bili = R(3, 5); h.hgb = R(9.5, 11); h.ivhWindow = false;
      },
      handoff: function (b) {
        return b.dol + " days old, born at " + b.ga + " weeks, doing well until today. Still has a long line in " +
               "for the last of " + b.pronoun.p + " nutrition. " + b.riskLine;
      },
      risks: [function (b) { return "The nurse thinks " + b.pronoun.s + " " + b.pronoun.has +
                " been less active than yesterday, though the numbers all look fine."; },
              "Temperature has wobbled twice today, once up and once down.",
              "Feeds were held once this afternoon for a large residual."],
      puzzles: [
        { id: "lateonset", w: 3, dx: { test: 'A blood culture or a blood count would have shown it.', found: function (b) { return !!(b.labs.culture || b.labs.cbc); },
                fixed: function (b) { return b.h.abx; } },
          apply: function (h) { h.sepsisLatent = Ri(20, 60); h.apneaTend += 0.2; },
          truth: "had a late-onset line infection. Any baby with a central line and a bad feeling about them has one until proven otherwise.",
          key: "Temperature instability plus 'just not right' plus a central line means culture and antibiotics tonight, not in the morning." },
        { id: "feedintol", w: 2, benign: true, dx: { test: 'An examination or an abdominal film would have shown it.', found: function (b) { return !!b.findings || !!b.labs.axr; },
                fixed: function (b) { return b.h.feedsMlKgD === 0 || b.h.residuals < 0.35; } },
          apply: function (h) { h.gutTol = R(0.28, 0.38); h.feedAdvanceStress = 0.4; },
          truth: "had simple feeding intolerance that settled once the feeds were slowed down.",
          key: "Not every full belly is NEC. Holding a feed and re-examining an hour later is a reasonable, cheap test." },
        { id: "settled", w: 2, benign: true, apply: function (h) { h.apneaTend *= 0.8; },
          truth: "was genuinely just having an ordinary night, and the right answer was to leave the line alone and let " +
                 "everyone sleep.",
          key: "Reassurance after a careful look is a legitimate outcome. Not every worry needs a needle." }
      ]
    },
    {
      key: "idm", label: "big term baby of a diabetic mother",
      ga: [37, 39], dol: [0, 1], wt: [3800, 4600],
      support: { mode: "RA", fio2: 0.21, cpap: 5, peep: 5, pip: 18, rate: 40, isoTemp: 36.5, humidity: 40, servo: true, isoOpen: false },
      set: function (h) {
        h.surfactant = R(0.85, 0.95); h.rds = R(0.1, 0.3); h.apneaTend = 0.08; h.motherDiabetic = true;
        h.glycogen = 1.0;                      // a big baby with plenty of store; the problem is the insulin
        h.glucose = R(30, 44); h.dexPct = 0; h.ivRate = 0; h.bili = R(4, 6); h.ivhWindow = false; h.hgb = R(17, 19);
      },
      handoff: function (b) {
        return "Born at term, " + (b.weightG / 1000).toFixed(2) + " kilos, to a mother with diabetes. " + b.riskLine +
               " The first blood sugar was low and " + b.pronoun.s + " " + b.pronoun.has + " been jittery since.";
      },
      risks: ["Mum's diabetes was hard to control through the third trimester.",
              "Gestational diabetes picked up late and managed with insulin.",
              "Long-standing type 1 diabetes, with a difficult shoulder delivery."],
      puzzles: [
        { id: "idmhypo", w: 3, dx: { test: 'A heel-prick glucose would have shown it, in five minutes.', found: function (b) { return !!b.labs.glucose; },
                fixed: function (b) { return b.h.glucose >= CL.glucose.treated; } },
          apply: function (h) { h.glucose = R(24, 34); h.hypoDrive = 22; h.hypoDriveMax = 38; },
          truth: "had the classic problem of a baby of a diabetic mother: months of high sugar across the placenta means a big baby making far too much of its own insulin, and the sugar crashes as soon as the cord is cut.",
          key: "Feed or infuse sugar early and keep measuring. This hypoglycaemia is predictable, which means it is preventable." },
        { id: "idmttn", w: 2, dx: { test: 'A blood gas or a chest film would have shown it.', found: function (b) { return !!(b.labs.gas || b.labs.cxr); },
                fixed: function (b) { return b.support.mode !== "RA" || b.h.rds < 0.4; } },
          /* Wet enough to actually need something. At 0.7-0.8 surfactant this baby sat at 91
             or 92 percent all night - inside the target - so nothing in the unit ever asked
             the player to start support, even though the puzzle's own `fixed` test is
             whether support was started. Below 0.62 it also falls under the young-lung
             consumption rule, so an untreated one gets wetter through the night, which is
             the whole point of "a big term baby who is grunting is not automatically fine". */
          apply: function (h) { h.rds = R(1.0, 1.4); h.surfactant = R(0.58, 0.68); h.glucose = R(38, 48); },
          truth: "had wet, slightly immature lungs. Babies of diabetic mothers make surfactant a little later than their gestation suggests.",
          key: "A big term baby who is grunting is not automatically fine. Diabetes delays lung maturity." },
        { id: "idmsettle", w: 2, benign: true, apply: function (h) { h.glucose = R(48, 62); },
          truth: "settled quickly once fed. Most babies of diabetic mothers do exactly this.",
          key: "Early feeding fixes most of these. Watch the numbers, resist the urge to do more." }
      ]
    }
  ];

  function weightedPick(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += (list[i].w || 1);
    var r = S.rnd() * total;
    for (i = 0; i < list.length; i++) { r -= (list[i].w || 1); if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* Put a baby on the ventilator they arrived on. Separate from build() so the guarantee
     pass in makeCensus can use it too, and so an archetype only has to describe settings. */
  function ventilate(b, arch) {
    b.support = JSON.parse(JSON.stringify(arch.vent.support));
    arch.vent.set(b.h);
    b.ventedAtHandover = true;
    /* And re-read the handover. The guarantee pass in makeCensus runs after every baby has
       been built, so a baby vented there kept the sheet written for the baby they were
       going to be - "still on CPAP", above a cot with a tube in it. */
    if (b.handoff) {
      b.handoff = arch.handoff(b);
      if (b.unnamed) b.handoff += " The parents have not settled on a name yet, so " + b.pronoun.s +
        " " + b.pronoun.is + " charted as Baby " + b.surname + " for now.";
    }
  }

  function build(arch, difficulty, used, bed, newborn) {
    var h = baseHidden();
    var id = newborn ? NB.makeNewbornIdentity(S.rnd, used) : NB.makeIdentity(S.rnd, used);

    var b = {
      arch: arch.key, label: arch.label,
      name: id.name, surname: id.surname, tone: id.tone, pronoun: id.pronoun,
      unnamed: !!id.unnamed, chosenName: id.chosenName,
      parents: id.parents, parentName: id.parentName, parentAvatar: id.parentAvatar,
      ga: Ri(arch.ga[0], arch.ga[1]),
      dol: Ri(arch.dol[0], arch.dol[1]),
      weightG: Math.round(R(arch.wt[0], arch.wt[1]) / 10) * 10,
      bed: bed,
      support: JSON.parse(JSON.stringify(arch.support)),
      h: h, mon: { hr: 140, rr: 50, spo2: 95, map: 32, sys: 46, dia: 25, temp: 36.8, trueSat: 95, trueHr: 140 },
      hist: { spo2: [], hr: [], map: [] },
      labs: {}, pending: [], flags: [], alarm: { level: "none", reasons: [] },
      /* `discharged` is read in a dozen places as a companion to `died` and is never set:
         no baby goes home mid-shift yet. The guards are correct and cost nothing, and they
         would all have to come back the day one does, so they stay - but a reader should
         not have to work out for themselves that this never happens. */
      discharged: false, died: false, startSnapshot: null,
      // what has been done for this baby tonight, in order, with the time on each
      history: []
    };
    b.pma = b.ga + b.dol / 7;
    /* Real hours of life. RDS turns its corner on this and dol alone cannot say whether a
       day-0 baby is two hours old or twenty - which is the whole difference between a night
       that deteriorates and one that has already peaked. The shift starts at seven in the
       evening, so a baby born today was born some time in the working day behind it. */
    h.ageH = b.dol * 24 + (b.dol === 0 ? R(2, 14) : R(0, 24));
    var risk = arch.risks[Math.floor(S.rnd() * arch.risks.length) % arch.risks.length];
    b.riskLine = typeof risk === "function" ? risk(b) : risk;

    arch.set(h);
    if (arch.vent && S.rnd() < arch.vent.chance) ventilate(b, arch);
    var puzzle = weightedPick(arch.puzzles);
    puzzle.apply(h);
    b.puzzle = puzzle;

    if (difficulty === "student") {
      h.apneaTend *= 0.65;
      if (h.sepsisLatent) h.sepsisLatent += 60;
      h.ivhThreshold *= 1.6;
      if (h.ptxPending) h.ptxPending += 60;
    } else if (difficulty === "attending") {
      h.apneaTend *= 1.2;
      h.ivhThreshold *= 0.85;
      if (h.sepsisLatent) h.sepsisLatent = Math.max(10, h.sepsisLatent - 20);
    }

    /* SOME BABIES ARRIVE WITH A BLEED. A quarter of babies under 28 weeks have one, almost
       always inside the first three days, and most of it is grade 1 or 2 found on the routine
       scan rather than by anybody noticing at the cot. It has to be here rather than left to
       the night, because a bleed that already exists is a baby you have to protect - which is
       what the handling and blood pressure model is for - and because it gives the head
       ultrasound something to find. b.pma > 32 closes the window, so this only reaches the
       babies it should. */
    if (h.ivhWindow && b.pma <= 32 && S.rnd() < CL.ivh.arriveChance) {
      h.ivhGrade = S.rnd() < CL.ivh.arriveGrade2 ? 2 : 1;
      h.ivhAtHandover = h.ivhGrade;
      h.ivhThreshold = CL.ivh.knownThreshold;      // a matrix that has bled is more fragile
      if (h.ivhGrade === 2) { h.hgb = Math.max(7.5, h.hgb - 0.8); h.apneaTend += 0.15; }
    }

    b.handoff = arch.handoff(b);
    /* The day team scanned this baby, so they know. Handing a player a bleed they are not
       told about would be blaming them for missing something nobody could have found, and
       the whole point of an existing bleed is that it is a baby you have been asked to
       protect. */
    if (h.ivhAtHandover)
      b.handoff += " The routine head ultrasound showed a grade " + h.ivhAtHandover +
        " bleed on " + (S.rnd() < 0.5 ? "day one" : "day two") + ". Keep " + b.pronoun.o +
        " settled and " + b.pronoun.p + " blood pressure steady.";
    if (b.unnamed) b.handoff += " The parents have not settled on a name yet, so " + b.pronoun.s +
      " " + b.pronoun.is + " charted as Baby " + b.surname + " for now.";

    // settle so the opening numbers are self-consistent and quiet
    var settleFrom = h.ageH, settleO2 = b.support.fio2;
    for (var i = 0; i < 6; i++) S.step(b, 5, { min: 0, settling: true });
    /* The settling loop exists to make the OPENING numbers self-consistent, not to advance
       the night. Handing back the half hour it ages the baby, and the oxygen the nurse
       adjusted while doing it, keeps the handover sheet honest - and keeps o2Creep measured
       from where this shift actually started. */
    h.ageH = settleFrom; b.support.fio2 = settleO2;
    h.fio2Floor = undefined; h.o2Creep = 0; h.o2Ceilinged = 0; h.o2HandsOff = 0;
    b.h.spells = 0; b.h.criticalMinutes = 0; b.h.criticalRun = 0; b.h.handling = 0; b.h.highSatMinutes = 0; b.h.lowSatMinutes = 0;
    b.startSnapshot = snapshot(b);
    return b;
  }

  function snapshot(b) {
    return {
      fio2: b.support.fio2, mode: b.support.mode, sepsis: b.h.sepsis, bili: b.h.bili,
      necGrade: b.h.necGrade, pda: b.h.pda, glucose: b.h.glucose, co2: b.h.co2,
      lung: S.lungFunction(b), spells: b.h.spells, ivhGrade: b.h.ivhGrade, hgb: b.h.hgb,
      bpd: b.h.bpd
    };
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(S.rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function makeCensus(difficulty) {
    var n = difficulty === "student" ? 4 : 5;
    var pool = shuffle(ARCHETYPES.slice());
    var used = {};
    var list = [];
    for (var i = 0; i < n; i++) list.push(build(pool[i], difficulty, used, i + 1));
    // every shift should carry at least one baby with something real to find
    var interesting = list.some(function (b) {
      return ["sepsis", "rds", "ptx", "jaundice", "pda", "nec", "pphn", "sepsis2",
              "hypoglycaemia", "lateonset", "idmhypo"].indexOf(b.puzzle.id) >= 0;
    });
    if (!interesting) {
      var v = list[Math.floor(S.rnd() * list.length)];
      var arch = ARCHETYPES.filter(function (a) { return a.key === v.arch; })[0];
      var hard = arch.puzzles.filter(function (p) { return p.w >= 3; })[0] || arch.puzzles[0];
      hard.apply(v.h); v.puzzle = hard;
    }
    /* And at least one baby on a ventilator, where the census allows one. A unit of five
       with nobody on a tube is possible but uncommon, and leaving it to chance meant the
       whole ventilator arc - pressure, rate, secretions, a tube that moves, and getting a
       baby off - appeared in only about half of shifts. This game is meant to show a player
       the things that happen. */
    if (!list.some(function (b) { return b.support.mode === "VENT"; })) {
      var canVent = list.filter(function (b) {
        return ARCHETYPES.filter(function (a) { return a.key === b.arch && a.vent; }).length > 0;
      });
      if (canVent.length) {
        var pick = canVent[Math.floor(S.rnd() * canVent.length)];
        ventilate(pick, ARCHETYPES.filter(function (a) { return a.key === pick.arch; })[0]);
      }
    }

    list.used = used;
    return list;
  }

  // archKey lets the delivery room decide what kind of baby it is sending up.
  function makeAdmission(difficulty, used, archKey) {
    var want = archKey || "rds";
    var arch = ARCHETYPES.filter(function (a) { return a.key === want; })[0] ||
               ARCHETYPES.filter(function (a) { return a.key === "rds"; })[0];
    var b = build(arch, difficulty, used || {}, 6, true);
    b.dol = 0; b.h.coreTemp = 36.2;
    b.handoff = "Just arrived from the delivery room.";
    return b;
  }

  window.Patients = { makeCensus: makeCensus, makeAdmission: makeAdmission, snapshot: snapshot, ARCHETYPES: ARCHETYPES };
})();
