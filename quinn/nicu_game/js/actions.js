/* NICU Night Shift — what the player can actually do at a bedside.

   One record per action: what it is called, what it costs, which panel it lives in, what
   it is FOR (the "?" blurb), what it does, and when it is unavailable or already running.
   Adding an action is a single edit in a single place. It used to be three: a name/cost
   table, a switch statement, and a separate blurb table over in glossary.js, with nothing
   to stop you doing two of the three. js/deliveries.js already worked this way.

   Loads AFTER game.js, and reaches back into it through window.NG for the handful of
   things an action has to be able to do: write to the log, score a decision, put a note
   on the bedside, and let the colleague who asked judge what you just did.            */
(function () {
  "use strict";
  var G = window.G, S = window.Sim, EV = window.Events, CL = window.Clinical;
  var NG = window.NG || (window.NG = {});

  function log(m, k) { return NG.log(m, k); }
  function addScore(n, w) { return NG.addScore(n, w); }
  function setNote(b, k, t, o) { return NG.setNote(b, k, t, o); }
  function judgeConcern(b, id) { return NG.judgeConcern(b, id); }
  function render() { return NG.render(); }
  function byBed(n) { return NG.byBed(n); }
  function clockStr(m) { return NG.clockStr(m); }
  function cap(t) { return NG.cap(t); }
  function label(a, b) { return typeof a.t === "function" ? a.t(b) : a.t; }

  // ------------------------------------------------------------------ orders
  var LAB_TIME = { glucose: 5, gas: 15, cbc: 40, bili: 25 };
  var IMG_TIME = { axr: 25, hus: 40, echo: 55 };

  /* These three return null when the order goes off, and a sentence when the unit
     declines to repeat one that is already running. Sending the same test twice used
     to be a silent no-op that still charged the player its full time cost and still
     let a colleague credit them for it - the worst possible combination, and exactly
     the situation a confused player clicks their way into. */
  function pendingLabel(kind, chest) {
    var k = (kind === "axr" && chest) ? "cxr" : kind;
    return (TEST_LABEL[k] || [cap(k)])[0];
  }
  function alreadyRunning(b, kind, chest) {
    var due = null;
    b.pending.forEach(function (p) { if (p.kind === kind && !!p.chest === !!chest) due = p.due; });
    if (due == null) return null;
    return "A " + pendingLabel(kind, chest).toLowerCase() + " is already running on " + b.name +
           " - it comes back at " + clockStr(due) + ". Nothing sent.";
  }

  G.orderLab = function (b, kind) {
    var busy = alreadyRunning(b, kind, false);
    if (busy) return busy;
    b.pending.push({ kind: kind, due: G.min + LAB_TIME[kind], type: "lab" });
    if (kind !== "glucose") { b.h.draws++; b.h.hgb -= 0.35; b.h.painStim = 0.28; G.metrics.draws++; }
    else b.h.painStim = 0.15;
    b.h.handling += 0.6;
    log("Sent " + kind.toUpperCase() + " on " + b.name, "");
    return null;
  };
  G.orderImaging = function (b, kind, chest) {
    var busy = alreadyRunning(b, kind, chest);
    if (busy) return busy;
    b.pending.push({ kind: kind, due: G.min + IMG_TIME[kind], type: "img", chest: chest });
    b.h.handling += 0.8;
    log("Ordered " + ({ axr: chest ? "chest X-ray" : "abdominal X-ray", hus: "head ultrasound", echo: "echocardiogram" })[kind] + " for " + b.name, "");
    return null;
  };
  G.orderCulture = function (b) {
    if (b.h.cultureDrawn)
      return "A blood culture was already drawn on " + b.name + " at " + clockStr(b.h.cultureAt) +
             ". A second one tells you nothing the first will not.";
    b.h.cultureDrawn = true; b.h.cultureAt = G.min; b.h.draws++; G.metrics.draws++; b.h.painStim = 0.3;
    log("Blood culture drawn on " + b.name, "");
    return null;
  };
  G.startAbx = function (b) {
    if (b.h.abx) return;
    if (!b.h.cultureDrawn) { log("Antibiotics started on " + b.name + " before a culture was drawn", "warn"); addScore(-2, "Antibiotics before the culture on " + b.name); }
    b.h.abx = true; b.h.abxMinutes = 0;
    log("Antibiotics started on " + b.name, "good");
  };

  // ----------------------------------------------------------------- actions
  /* ==================================================================
     One record per action: what it is called, what it costs, which panel it lives in,
     what it is FOR (the "?" blurb), what it does, and when it is unavailable or already
     running. This used to be spread over three tables in two files - a name/cost table
     here, a switch below it, and the blurbs in glossary.js - with nothing to stop you
     adding an action and forgetting one of them. js/deliveries.js already worked this
     way; now the unit does too.

       run(b, h) -> { msg, kind, refused }   kind: "" | "good" | "warn" | "bad"
       off(b)    -> true when the button cannot be pressed right now
       on(b)     -> true when this is already running, for the lit-up state
     ================================================================== */
  var ACTIONS = {
    examine: { t: "Examine", cost: 5, g: "assess", info: "Lay hands on the baby. Colour, breathing effort, chest sounds, belly, pulses and cap refill. Costs five minutes and answers questions no monitor can.",
      run: function (b) {
        G.metrics.exams++; b.findings = S.examine(b); b.examinedAt = G.min;
        return { msg: "Examined " + b.name };
      } },
    glucose: { t: "Glucose (heel)", cost: 5, g: "assess", info: "A heel-prick blood sugar, back in five minutes. Cheap, fast, and explains a surprising number of problems.",
      run: function (b) { return refusable(G.orderLab(b, "glucose")); } },
    gas: { t: "Blood gas", cost: 10, g: "assess", info: "A blood gas: pH, carbon dioxide and base deficit. Tells you whether a baby is failing to breathe out CO2, or short of oxygen, or building up acid.",
      run: function (b) { return refusable(G.orderLab(b, "gas")); } },
    cbc: { t: "Blood count", cost: 10, g: "assess", info: "White cells for infection and haemoglobin for anaemia. Takes about forty minutes.",
      run: function (b) { return refusable(G.orderLab(b, "cbc")); } },
    bili: { t: "Bilirubin", cost: 10, g: "assess", info: "A bilirubin level, to compare against the threshold for this baby's age in hours. Never judge jaundice by eye.",
      run: function (b) { return refusable(G.orderLab(b, "bili")); } },
    /* ASKING FOR HELP. The game has said from the beginning that asking for help scores
       positively because it should, and there was no way to do it at a cot - only inside a
       crisis, or if Dr. Halvorsen happened to ring. Meanwhile the debrief for pulmonary
       hypertension taught "keep the baby calm and call for help early", naming an action
       that did not exist. It does now.

       She does not hand over the diagnosis. She does what a good senior does on the phone at
       three in the morning: asks the question you have not asked yourself, and points at the
       part of the baby you have not looked at. */
    help: { t: "Call the attending", cost: 10, g: "assess",
      info: "Ring Dr. Halvorsen at home and talk a baby through with her. She will not do your thinking for you, but she will tell you which part of this baby she would be looking at, and she never minds being called. Asking early is a senior skill, not a junior one.",
      on: function (b) { return !!b.h.helpAsked; },
      run: function (b, h) {
        var first = !h.helpAsked;
        h.helpAsked = true;
        if (first) { G.metrics.calledForHelp++; addScore(4, "Rang the attending about " + b.name); }
        return { msg: "Dr. Halvorsen: \u201c" + attendingSteer(b) + "\u201d", kind: "good" };
      } },

    culture: { t: "Blood culture", cost: 10, g: "assess", info: "Take blood to grow any bacteria in it. Must be taken BEFORE antibiotics start, or the result is worthless.",
      run: function (b) { return refusable(G.orderCulture(b)); },
      on: function (b) { return b.h.cultureDrawn; } },

    cxr: { t: "Chest X-ray", cost: 10, g: "imaging", info: "A chest X-ray. Shows the lungs, whether a breathing tube sits in the right place, and any air leak.",
      run: function (b) { return refusable(G.orderImaging(b, "axr", true)); } },
    axr: { t: "Abdominal X-ray", cost: 10, g: "imaging", info: "An abdominal X-ray. Looking for the gas in the bowel wall that means necrotising enterocolitis.",
      run: function (b) { return refusable(G.orderImaging(b, "axr", false)); } },
    hus: { t: "Head ultrasound", cost: 10, g: "imaging", info: "Ultrasound of the brain through the soft spot on the head. No radiation. This is how brain bleeds are found.",
      run: function (b) { return refusable(G.orderImaging(b, "hus")); } },
    echo: { t: "Echocardiogram", cost: 10, g: "imaging", info: "Ultrasound of the heart. Shows whether the ductus is still open and how much it matters.",
      run: function (b) { return refusable(G.orderImaging(b, "echo")); } },

    caffeine: { t: "Caffeine", cost: 5, g: "treat", info: "The standard medicine for apnea of prematurity. It keeps the immature breathing centre alert. A large trial showed babies given it came off support sooner and had less lung disease.",
      on: function (b) { return !!b.h.caffeine; },
      run: function (b, h) {
        if (h.caffeine) return { msg: b.name + " is already on caffeine", kind: "warn", refused: true };
        h.caffeine = true;
        return { msg: "Caffeine loaded for " + b.name, kind: "good" };
      } },
    abx: { t: "Antibiotics", cost: 10, g: "treat", info: "Antibiotics for suspected infection. In a newborn, waiting for proof costs more than treating early does. Draw the culture first.",
      on: function (b) { return !!b.h.abx; },
      run: function (b) { G.startAbx(b); } },
    surfactant: { t: "Surfactant", cost: 10, g: "treat", info: "The missing slippery liquid, dripped straight into the lungs. Within minutes stiff lungs open up. Needs a breathing tube to give it through.",
      off: function (b) { return b.support.mode !== "VENT"; },
      run: function (b, h) {
        if (b.support.mode !== "VENT") return { msg: "Surfactant needs a breathing tube first", kind: "warn", refused: true };
        h.surfTreatPending = 1; h.rds = Math.max(0, h.rds - 0.9); h.handling += 0.7;
        watch(b, "sat", "surfactant");
        return { msg: "Surfactant given to " + b.name + ". The chest starts moving more easily within minutes", kind: "good" };
      } },
    photo: { t: "Phototherapy", cost: 5, g: "treat", info: "Blue light that changes bilirubin into a form the body can flush out without the liver. Very safe. Eyes are covered.",
      on: function (b) { return !!b.h.photo; },
      run: function (b, h) {
        h.photo = h.photo ? 0 : (h.bili > h.biliThreshold + 3 ? 2 : 1);
        return { msg: h.photo ? "Phototherapy started for " + b.name + (h.photo > 1 ? " (double)" : "")
                              : "Phototherapy stopped for " + b.name, kind: "good" };
      } },
    d10: { t: "Dextrose bolus", cost: 5, g: "treat", info: "A dose of sugar straight into the vein for a low blood glucose. Fixes the moment; you also need to turn up the infusion so it does not fall again.",
      run: function (b, h) {
        h.d10bolus = 45; h.glucose += 30; watch(b, "glucose", "dextrose");
        return { msg: "Dextrose bolus given to " + b.name, kind: "good" };
      } },
    bolus: { t: "Fluid bolus", cost: 10, g: "treat", info: "Ten millilitres per kilo of fluid into a vein. Helps a baby who is genuinely short of circulating volume, and adds water to the lungs of one who is not.",
      run: function (b, h) {
        if (h.hypovolemia > 0.25) {
          h.hypovolemia = S.c01(h.hypovolemia - 0.5);
          return { msg: "Fluid bolus given and the perfusion improves", kind: "good" };
        }
        h.secretions += 0.12; addScore(-2, "Fluid bolus without evidence of hypovolaemia");
        return { msg: "Fluid bolus given, with no obvious improvement", kind: "warn" };
      } },
    dopamine: { t: "Dopamine", cost: 10, g: "treat", info: "A drip that makes the heart squeeze harder and tightens the blood vessels, raising the blood pressure. Treats the number; find out why it was low.",
      on: function (b) { return !!b.h.pressorInfusion; },
      run: function (b, h) {
        h.pressorInfusion = true; h.pressorDose = 1;
        return { msg: "Dopamine started on " + b.name };
      } },
    ibuprofen: { t: "Ibuprofen", cost: 5, g: "treat", info: "The medicine that makes a stubborn ductus arteriosus tighten and close. It is hard on the gut and kidneys, so confirm the duct matters first.",
      /* It used to refuse itself when there was no duct, which by this game's own rule means
         nothing happened - and then scored the player for having done it. Its siblings are
         consistent: an unnecessary transfusion, a bolus into a baby who is not dry, a needle
         into a chest with no air in it all HAPPEN, do their harm, and are scored. So does
         this now, which also lets the murmur concern's "treating a duct you have not looked
         at" line fire for the first time - a refusal never reached a colleague to judge. */
      run: function (b, h) {
        h.pdaTreat = 240; h.gutTol = S.c01(h.gutTol - 0.08);
        if (h.pda < 0.2) {
          addScore(-2, "Ibuprofen for a duct that was not open");
          return { msg: "Ibuprofen given, though there is no significant duct to treat. It is hard on " +
                        "the gut and the kidneys either way", kind: "warn" };
        }
        return { msg: "Ibuprofen started for " + b.name + "'s duct", kind: "good" };
      } },
    morphine: { t: "Morphine", cost: 5, g: "treat",
      info: "A continuous infusion for a baby in real pain or fighting a ventilator. It is the strongest thing on the unit for pain, and it takes away breathing drive with it: fewer grimaces, more spells, and a harder extubation. Press it again to stop it, and remember it takes a couple of hours to wear off.",
      on: function (b) { return !!b.h.morphine; },
      run: function (b, h) {
        if (h.morphine) {
          h.morphine = false;
          return { msg: "Morphine stopped for " + b.name + ". It will take a couple of hours to wear off",
                   kind: "good" };
        }
        h.morphine = true;
        if (h.pain < 0.3) {
          addScore(-2, "Morphine for a baby who was not in pain");
          return { msg: "Morphine started, though " + b.name + " was settled. Sedating a comfortable baby " +
                        "costs " + b.pronoun.o + " breathing drive for nothing", kind: "warn" };
        }
        h.comfortActs++;
        return { msg: "Morphine started for " + b.name + ". The grimacing eases over the next half hour, " +
                      "and so will " + b.pronoun.p + " breathing", kind: "good" };
      } },
    transfuse: { t: "Transfuse", cost: 20, g: "treat", info: "Give red cells to an anaemic baby. Anaemia makes spells worse and makes babies pale and tired.",
      run: function (b, h) {
        if (h.hgb < CL.hgb.transfuseAbove) {
          h.hgb += 4;
          return { msg: "Red cells transfused and " + b.name + " looks pinker", kind: "good" };
        }
        addScore(-2, "Unnecessary transfusion");
        return { msg: b.name + " does not need blood", kind: "warn" };
      } },
    npo: { t: "Stop feeds", cost: 5, g: "treat", info: "Stop milk feeds and let the stomach empty. The first move whenever you are worried about the gut.",
      run: function (b, h) {
        h.feedsMlKgD = 0;
        return { msg: b.name + " made nil by mouth, stomach decompressed", kind: "good" };
      } },

    /* One button, two jobs, because at a cot they are the same job: getting a tube into the
       right place. It used to be disabled the moment a baby was on a ventilator - which is
       exactly when a tube can slip - so the concern that says "re-siting the tube (Intubate,
       under Procedures) puts it back" pointed at a greyed-out button, and its accept for
       `intubate` could never be reached. A player found the only route open to them, pulling
       the tube out and putting a new one in, which is a great deal more than the baby needed.  */
    intubate: {
      t: function (b) { return b && b.h.ettDisplaced && b.support.mode === "VENT" ? "Re-site the tube" : "Intubate"; },
      cost: 15, g: "proc",
      info: "Place a breathing tube into the windpipe so a ventilator can take over. A real procedure with real risk; not a first move. On a baby who already has one that has slipped, this is the same skill used to put it back where it belongs.",
      off: function (b) { return b.support.mode === "VENT" && !b.h.ettDisplaced; },
      urgent: function (b) { return b.support.mode === "VENT" && !!b.h.ettDisplaced; },
      run: function (b, h) {
        /* RE-SITING, not starting again. The settings are deliberately left alone: a player
           who has spent the night weaning a peak pressure down should not have it thrown back
           to the defaults because a tube moved. */
        if (b.support.mode === "VENT") {
          if (!h.ettDisplaced) return { msg: b.name + " is already intubated", kind: "warn", refused: true };
          h.ettDisplaced = false; h.handling += 0.6; h.painStim = 0.2;
          addScore(6, "Re-sited a displaced tube on " + b.name);
          return { msg: "Tube pulled back two centimetres and re-taped. Both sides of " + b.name +
                        "'s chest lift evenly again", kind: "good" };
        }
        h.handling += 1.4; h.painStim = 0.35;
        var out;
        if (S.chance(G.difficulty === "attending" ? 0.24 : G.difficulty === "student" ? 0.05 : 0.13)) {
          h.painStim += 0.2;
          out = { msg: "First attempt at intubating " + b.name + " failed. Second attempt successful.", kind: "warn" };
        } else out = { msg: b.name + " intubated" };
        b.support.mode = "VENT"; b.support.pip = Math.max(16, Math.round(14 + 6 * h.rds));
        b.support.peep = 5; b.support.rate = 40; h.ettDisplaced = false;
        return out;
      } },
    extubate: { t: "Extubate", cost: 10, g: "proc", info: "Take the breathing tube out and go back to CPAP. Do it as soon as it is safe, because tube days cost lungs.",
      off: function (b) { return b.support.mode !== "VENT"; },
      run: function (b, h) {
        if (b.support.mode !== "VENT") return { msg: b.name + " is not intubated", kind: "warn", refused: true };
        /* The tube is OUT, so it is not down anybody's right main bronchus any more. Leaving
           the flag set left a baby on CPAP carrying a 0.42 lung-function penalty with no
           cause on screen and nothing able to clear it, because the concern that reports a
           displaced tube only looks at ventilated babies. */
        h.ettDisplaced = false;
        b.support.mode = "CPAP"; b.support.cpap = 6;
        if (h.spontDrive < 0.75 || h.co2 > CL.co2.notEnough || S.lungFunction(b) < 0.45) {
          h.fatigue += 0.35;
          addScore(-3, "Extubated " + b.name + " before " + b.pronoun.s + " " + b.pronoun.was + " ready");
          return { msg: b.name + " was extubated but is struggling. This may not hold", kind: "warn" };
        }
        return { msg: b.name + " extubated to CPAP and doing well", kind: "good" };
      } },
    suction: { t: "Suction", cost: 5, g: "proc", info: "Clear secretions from the airway. Useful when the chest sounds wet or a tube may be blocked, but it is uncomfortable, so not routinely.",
      run: function (b, h) {
        h.secretions = S.c01(h.secretions - 0.55); h.painStim = 0.2; h.handling += 0.5;
        return { msg: "Suctioned " + b.name };
      } },
    needle: { t: "Needle the chest", cost: 10, g: "proc", info: "Put a needle into the chest to release trapped air. Life-saving for a tension pneumothorax, harmful if there is no air there.",
      urgent: function (b) { return b.h.ptx && b.mon.spo2 < CL.sat.alarmLowOnOxygen - 5; },
      run: function (b, h) {
        if (h.ptx) {
          h.ptx = false; addScore(8, "Decompressed a pneumothorax");
          return { msg: "Air released. " + b.name + "'s saturation climbs almost at once", kind: "good" };
        }
        h.painStim = 0.4; h.handling += 1; addScore(-4, "Needled a chest with no air leak");
        return { msg: "No air found. There was no pneumothorax", kind: "warn" };
      } },
    reposition: { t: "Fix probe / leads", cost: 5, g: "proc", info: "Reseat the saturation probe and the ECG stickers. The answer when the number and the baby disagree.",
      run: function (b, h) {
        var wrong = h.artifactProbe || h.artifactLead;
        h.artifactProbe = false; h.artifactProbeAt = 0; h.artifactLead = false;
        return wrong ? { msg: "Reseated the sensors on " + b.name + " and the readings settle", kind: "good" }
                     : { msg: "The sensors on " + b.name + " were already sitting properly" };
      } },

    /* Two minutes, and it is the whole treatment. It is here as its own control rather than
       hidden behind the isolette temperature slider - which is how you used to have to close
       a porthole, by nudging the heat up past 36.4 and hoping you noticed the side effect. */
    closeiso: { t: "Close the isolette", cost: 5, g: "care",
      info: "Click the portholes shut and check the door seal. An open isolette vents heat straight into the room, and a small baby loses half a degree in ten minutes - which they then buy back with sugar and oxygen they needed for growing.",
      off: function (b) { return !b.support.isoOpen; },
      urgent: function (b) { return !!b.support.isoOpen; },
      run: function (b, h) {
        if (!b.support.isoOpen) return { msg: "The isolette is already closed", kind: "warn", refused: true };
        b.support.isoOpen = false;
        addScore(3, "Closed the isolette on " + b.name);
        return { msg: "Portholes shut and the seal checked. " + b.name + " will warm back up now", kind: "good" };
      } },

    comfort: { t: "Comfort care", cost: 5, g: "care", info: "Nest, swaddle, dim the light and offer a little sucrose. Lowers pain and stress, which is treatment, not decoration.",
      run: function (b, h) {
        h.swaddled = true; h.pain = S.c01(h.pain - 0.35); h.comfortActs++;
        /* Protected care runs out. Every baby is swaddled by default, so that flag could
           never say whether anybody had DECIDED to keep this one undisturbed - which is
           the whole treatment for clamped lung vessels. Three hours, and then it is a
           decision somebody has to make again. */
        h.protectedMin = Math.max(h.protectedMin, 180); h.handling = S.c01(h.handling - 0.3);
        h.handling = Math.max(0, h.handling - 0.4);
        return { msg: b.name + " settled with containment and a dim light", kind: "good" };
      } },
    kangaroo: { t: "Kangaroo care", cost: 10, g: "care", info: "Settle the baby skin to skin on a parent's chest. Steadies temperature, heart rate and breathing, and helps the family. Only possible when a parent is here.",
      off: function (b) { return !G.parentPresent(b); },
      on: function (b) { return !!b.h.kangaroo; },
      run: function (b, h) {
        if (!G.parentPresent(b)) return { msg: "No parent at the bedside right now", kind: "warn", refused: true };
        h.kangaroo = true; h.swaddled = false; h.pain = S.c01(h.pain - 0.5); h.comfortActs++; G.trust += 8;
        h.protectedMin = Math.max(h.protectedMin, 240); h.handling = 0;
        return { msg: b.name + " is skin to skin with " + b.parentName, kind: "good" };
      } }
  };


  /* What a senior would actually say, read off the hidden state in the order she would think
     of it. Never the diagnosis - the question that leads to it, and where to look. If there
     is genuinely nothing, she says so, which is why calling her about every baby in turn is
     ten minutes each and not a reveal button. */
  function attendingSteer(b) {
    var h = b.h, sup = b.support;
    if (h.pphn > 0.25)
      return "Those saturations are swinging more than the oxygen you are giving explains. When the number " +
             "will not follow the dial, stop thinking about the air sacs and start thinking about the blood " +
             "vessels. Keep her absolutely undisturbed and get an echo - and ring me back.";
    if (h.ptx)
      return "Sudden, and not responding to oxygen? Get a light on that chest and listen to both sides. " +
             "If one is quieter, do not wait for the film.";
    if (h.rds > 1.2 && h.surfactant < 0.55)
      return "Rising oxygen on CPAP with a baby working that hard is stiff lungs, and CPAP alone will not " +
             "open them. A gas will tell you. If the CO2 is up too, that baby needs surfactant, and a tube " +
             "to give it down.";
    if (h.sepsis > 0.2 && !h.abx)
      return "You are describing a baby who is not quite right, with risk factors. Culture, then antibiotics. " +
             "Do not wait for a number to give you permission.";
    if (h.necGrade > 0 || (h.residuals > 0.5 && h.feedsMlKgD > 0))
      return "Green residuals and a belly that is changing. Stop the feeds, get a film, and start antibiotics. " +
             "If I am wrong you have lost a few hours of feeding. If you are wrong she loses bowel.";
    if (h.glucose < CL.glucose.treated)
      return "Before anything clever, what is the sugar doing? And if you have already given a bolus, what is " +
             "the infusion rate? A bolus on its own is a bounce.";
    if (h.pda > 0.45)
      return "Bounding pulses and a creeping oxygen need on a preemie that age is a duct until an echo says " +
             "otherwise. Look before you treat: ibuprofen is hard on a gut.";
    if (h.bili > h.biliThreshold - 2)
      return "You cannot judge that by eye, particularly not on her skin. Send a level and read it against " +
             "the threshold for her age in hours.";
    if (h.hgb < CL.hgb.nadir)
      return "How much blood have you taken off her this week? Tired, pale, and more spells is anaemia until " +
             "a count says otherwise.";
    if (sup.mode === "VENT" && sup.pip > 22)
      return "Come down on that pressure and let the CO2 run a little high. Lungs remember the pressure they " +
             "were given, for years.";
    if (h.coreTemp < CL.temp.coldStress)
      return "Warm first. Everything else you are about to do works better on a warm baby, and none of it " +
             "works well on a cold one.";
    return "Nothing jumps out at me from what you are describing. Examine her properly, look at the trend " +
           "rather than the number, and ring me again the moment that changes. I would rather be woken twice.";
  }

  // the three order functions answer with a sentence when they decline; everything else is a no-op
  function refusable(why) { return why ? { msg: why, kind: "warn", refused: true } : null; }

  G.doAction = function (b, id, opt) {
    opt = opt || {};
    var a = ACTIONS[id];
    if (!a) return;
    var r = (a.run ? a.run(b, b.h) : null) || {};
    var msg = r.msg || null, kind = r.kind || "", refused = !!r.refused;
    if (msg) log(msg, kind);
    /* Into this baby's own history as well as the unit log. A refused action never happened,
       so it is not part of what was done for them. */
    /* An order that goes off says nothing - the three order functions answer only when they
       decline - so a bare "Chest X-ray" in the history would read as a film that had come
       back rather than one on its way. */
    if (!refused)
      NG.recordHistory(b, "did", label(a, b) +
        (msg ? " \u2014 " + msg : (a.g === "assess" || a.g === "imaging" ? " requested" : "")));
    /* A refused action never happened, so there is nothing for a colleague to judge - and
       the refusal is the one thing the player must see, since the screen did not change. */
    if (refused) setNote(b, "warn", msg);
    else {
      if (kind === "warn" || kind === "bad") setNote(b, kind, msg);
      judgeConcern(b, id);
    }
    // nothing happened, so nothing is charged for it either
    if (!opt.silent) { if (!refused) G.advance(a.cost); render(); }
  };

  // Slider and mode changes report themselves as pseudo-actions, so a concern can
  // recognise "you turned the oxygen down" as an answer.
  G.noteChange = function (b, tag) { judgeConcern(b, tag); };

  // ------------------------------------------- did that help? follow-up feedback
  function watch(b, kind, label) {
    var before = kind === "sat" ? b.mon.trueSat : kind === "glucose" ? b.h.glucose : b.h.co2;
    G.watches.push({ bed: b.bed, kind: kind, label: label, at: G.min + 20, before: before });
  }
  function runWatches() {
    G.watches = G.watches.filter(function (w) {
      if (G.min < w.at) return true;
      var b = byBed(w.bed); if (!b || b.died) return false;
      var now = w.kind === "sat" ? b.mon.trueSat : w.kind === "glucose" ? b.h.glucose : b.h.co2;
      var d = now - w.before, up = d > 2, down = d < -2;
      var who = EV.CHARS[EV.nurseFor(b)].name.split(",")[0];
      var m;
      if (w.kind === "sat") m = up ? "saturation is up to " + Math.round(now) + " since the " + w.label
                                  : down ? "saturation has slipped to " + Math.round(now) + " despite the " + w.label
                                  : "saturation is holding around " + Math.round(now);
      else if (w.kind === "glucose") m = up ? "sugar has come up to " + Math.round(now) : "sugar is still " + Math.round(now) + " - it needs the infusion turned up, not just a bolus";
      else m = "carbon dioxide is now " + Math.round(now);
      log(who + ": " + b.name + "'s " + m, up ? "good" : down ? "warn" : "");
      return false;
    });
  }
  // oxygen weaning gets its own quiet check so the player learns cause and effect
  function watchO2(b) {
    if (b.h.o2watch && G.min - b.h.o2watch < 20) return;
    b.h.o2watch = G.min;
    watch(b, "sat", "oxygen change");
  }


  var TEST_LABEL = {
    glucose: ["Blood sugar", "A heel-prick sugar level. Below about " + CL.glucose.low + " is low, and below " + CL.glucose.severe + " a newborn's brain is at risk. Where exactly the line sits is genuinely argued over."],
    gas:     ["Blood gas", "A few drops of blood measured for acid (pH), carbon dioxide, and how much acid has built up. It tells you whether the baby is breathing well enough and getting enough blood flow."],
    cbc:     ["Blood count", "White cells, which rise or fall with infection, and haemoglobin, which shows anaemia."],
    bili:    ["Bilirubin", "The yellow chemical that causes jaundice. It is judged against a threshold for the baby's age in hours."],
    cxr:     ["Chest X-ray", "A picture of the lungs. Shows stiff lungs, a collapsed lung, an air leak, and whether a breathing tube sits in the right place."],
    axr:     ["Belly X-ray", "A picture of the bowel. Gas in the wall of the bowel means necrotising enterocolitis."],
    hus:     ["Head ultrasound", "A sound picture of the brain, taken through the soft spot on the head. No radiation. This is how brain bleeds are found."],
    echo:    ["Heart echo", "A sound picture of the beating heart. It shows whether the ductus is still open and whether it matters."],
    culture: ["Blood culture", "Blood kept warm to see whether bacteria grow in it. It takes hours to days, so antibiotics usually start before the answer arrives."]
  };

  NG.ACTIONS = ACTIONS;
  NG.TEST_LABEL = TEST_LABEL;
  NG.runWatches = runWatches;
  NG.watchO2 = watchO2;
})();
