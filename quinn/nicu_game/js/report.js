/* NICU Night Shift — the end-of-shift evaluation and the report screen.

   This is the teaching payload: at 07:00 the hidden state every baby has been carrying all
   night is revealed and explained. It is a clean seam - nothing in the game calls into this
   file except the one moment the shift ends, and this file only READS the world - so it
   lives on its own rather than as the last four hundred lines of game.js.

   Shared helpers come through window.NG, which game.js populates. This file loads AFTER
   game.js (see the script list in game.html) because it reads window.G at load time. */
(function () {
  "use strict";
  var G = window.G, S = window.Sim, EV = window.Events, CL = window.Clinical;
  var NG = window.NG || (window.NG = {});

  // pulled from NG at call time, so game.js can define them whenever it likes
  function $(id) { return NG.$(id); }
  function esc(t) { return NG.esc(t); }
  function gl(t) { return NG.gl(t); }
  function cap(t) { return NG.cap(t); }
  function clockStr(m) { return NG.clockStr(m); }
  function byBed(n) { return NG.byBed(n); }
  function displayName(b) { return NG.displayName(b); }
  function supportLabel(b) { return NG.supportLabel(b); }

  /* =====================================================================
     What actually happened, as opposed to what the puzzle meant to teach.

     Every puzzle carries a `truth` and a `key`, written for the course the author
     expected that baby to take. When the night went somewhere else those lines stop
     being a lesson and start being an insult: a baby who died of untreated
     hypoglycaemia was debriefed with "settled quickly once fed... resist the urge to
     do more". So the reveal is now assembled from the state the baby ended in, and
     the authored lesson is only offered when the course it was written for is the
     course the baby took.
     ===================================================================== */

  /* Keyed off the same list, so a cot cannot say "improved" in its header and "it was never
     worked out" three lines below - which is what a playtest showed, on a baby whose
     infection the player HAD found and treated. "worse" now means something really is
     still open, rather than a proxy for it. */
  function courseOf(b) {
    var h = b.h;
    if (b.died) return "died";
    if (h.criticalMinutes > 90) return "critical";
    if (openAtHandover(b).length || h.necGrade > 1.4 || h.ivhGrade >= 2) return "worse";
    return "expected";
  }

  /* Named from the hidden state at handover, so it can only ever describe something
     that was genuinely still true when the day team took over. */
  /* WHAT IS STILL WRONG WITH THIS BABY AT SEVEN IN THE MORNING.

     This is the single most important thing a night shift produces, and until now the
     report computed it, printed it in small type halfway down the bed-by-bed section, and
     then scored the shift without looking at it. A playtest came back "Nothing to pick at,
     the unit was in good hands all night" over a card that said, four inches lower, "The
     blood sugar was still 34 at handover."

     One list, and everything uses it: the domain, the headline cap, the verdict, the
     handover summary at the top, and the reveal on each cot.

     `serious` means a problem that is still doing harm and that the day team inherits
     mid-course. The rest are loose ends - real, worth naming, not the same thing. */
  function openAtHandover(b) {
    var h = b.h, out = [];
    function add(t, serious) { out.push({ t: t, serious: !!serious }); }

    if (h.glucose < CL.glucose.handoverBelow)
      add("the blood sugar was still " + Math.round(h.glucose) + " at handover", true);
    else if (h.severeHypoMinutes > 20)
      add(Math.round(h.severeHypoMinutes) + " minutes were spent with a blood sugar under 25", true);
    if (h.sepsis > 0.45 && !h.abx) add("an infection was running with no antibiotics against it", true);
    if (b.labs.culture && b.labs.culture.crit && !h.abx)
      add("the blood culture grew something and nothing was started", true);
    if (h.necGrade > 1.4) add("the bowel was failing" + (h.feedsMlKgD > 0 ? " while the feeds kept running" : ""), true);
    if (h.ptx) add("an air leak was never decompressed", true);
    if (h.coreTemp < CL.temp.hypothermia) add("the temperature was " + h.coreTemp.toFixed(1) + " and nobody warmed " + b.pronoun.o, true);
    if (h.co2 > CL.co2.notEnough) add("the carbon dioxide had climbed to " + Math.round(h.co2), true);
    /* And the other end of it, which nothing used to ask about. A ventilator that blows the
       CO2 into the twenties costs nothing on the monitor and something in the brain. */
    if (h.hypocapMinutes > CL.hypocapnia.openMinutes)
      add("the carbon dioxide was driven down to " + Math.round(h.hypocapWorst) + " and held there for " +
          Math.round(h.hypocapMinutes / 60) + " hours by the ventilator",
          h.hypocapWorst < CL.hypocapnia.severeBelow);
    if (b.support.mode === "VENT" && h.ettDisplaced)
      add("the breathing tube was sitting down one bronchus and was never re-sited", true);
    /* A bleed that got bigger tonight, which is the thing gentle handling and a steady blood
       pressure exist to prevent - and the one the morning most needs to be told about. */
    if (h.ivhGrade > h.ivhAtHandover)
      add(h.ivhAtHandover
            ? "the brain bleed extended overnight, from grade " + h.ivhAtHandover + " to grade " + h.ivhGrade
            : "a grade " + h.ivhGrade + " bleed happened during the shift",
          h.ivhGrade >= 2 || !b.labs.hus);
    else if (h.ivhGrade > 0 && !b.labs.hus && h.fontanelleFull)
      add("the fontanelle was full all night and nobody scanned " + b.pronoun.o, false);
    /* "AND STAYING THERE" HAS TO BE TRUE. This read the saturation at the single instant
       the shift ended, so a baby having an ordinary spell at 07:00 - the commonest event in
       a preterm unit, self-resolving, and the thing the nurses handle without being asked -
       was written up for the morning as a sustained desaturation. Measured over a night
       where every baby was well: four hits, every one of them a baby mid-apnea, and one of
       them with no time under target all night at all.

       h.lowSatMinutes is the number that means what this sentence says. It is deliberately
       PAUSED rather than reset through a spell, so it answers "has this baby's baseline been
       low", which is the question the day team is being asked to inherit. */
    if (b.mon.trueSat < CL.sat.handoverBelow && !h.apneaNow &&
        h.lowSatMinutes > CL.sat.handoverLowMinutes)
      add("the saturation was in the " + (Math.floor(b.mon.trueSat / 10) * 10) + "s and staying there", true);
    if (h.bili > h.biliThreshold + 4 && !h.photo) add("the bilirubin was past the threshold with no light on", true);

    if (h.coreTemp >= CL.temp.hypothermia && h.coldMinutes > 90)
      add(Math.round(h.coldMinutes) + " minutes were spent under 36 degrees", false);
    if (h.biliDangerMinutes > 60)
      add("the bilirubin sat over the threshold for " + Math.round(h.biliDangerMinutes / 60) + " hours", false);
    if (h.bpd > 0.9) add("the ventilator pressure was doing steady damage to lungs that have to last a lifetime", false);
    if (h.hgb < CL.hgb.flagAt) add("the haemoglobin was down to " + h.hgb.toFixed(1) + " and nobody looked", false);

    /* THE LUNGS. There was nothing respiratory in here at all, which is why a baby still in
       significant respiratory distress at seven in the morning - the commonest thing in a
       NICU - registered as nothing wrong, and a shift that never touched it scored clean.
       Reported from a playtest twice over: significant RDS and pulmonary hypertension,
       neither of them costing the player a mark. */
    if (b.support.fio2 >= 0.5)
      add("still on " + Math.round(b.support.fio2 * 100) + " percent oxygen at handover", true);
    else if (S.workOfBreathing(b) > 0.55 && b.support.mode !== "VENT")
      add("still working hard for every breath on " + supportLabel(b), true);
    /* TRAJECTORY, NOT LEVEL. This asked only "are the vessels still tight", so a player who
       found it, called for help and kept the baby undisturbed all night - taking a bad one
       from 0.45 down to 0.29 - was handed the same sentence as somebody who never looked.
       The thing a player controls here is the direction, and a baby who is a third better by
       morning is a baby being managed, not a problem the day team is inheriting mid-course. */
    var pphn0 = b.startSnapshot ? b.startSnapshot.pphn : h.pphn;
    if (h.pphn > 0.25 && h.pphn > pphn0 * 0.75)
      add("the lung blood vessels were still clamped shut, and the saturations were showing it", true);
    if (h.rds > 1.2 && h.surfactant < 0.55)
      add("the lungs were still short of surfactant and none was ever given", true);

    /* DID ANYBODY WORK OUT WHAT WAS WRONG? Every baby carries a hidden diagnosis, and the
       game revealed it at 07:00 without ever having asked whether the player found it. A
       whole night could pass without a single test at a cot and the report would print the
       answer and score the shift clean. This is the question the game is actually about. */
    var pz = b.puzzle, dx = pz && pz.dx;
    if (dx && !pz.benign) {
      var found = false, fixed = false;
      try { found = !!dx.found(b); fixed = !!dx.fixed(b); } catch (e) { found = true; fixed = true; }
      // serious only if something is ALSO still wrong; an unexamined baby who came right
      // on her own is a near miss, not a harm
      if (!found) add("nobody ever established what was actually wrong with " + b.pronoun.o, out.length > 0);
      else if (!fixed) add("what was wrong was found, and then left alone", out.length > 0);
    }
    return out;
  }
  function serious(list) { return list.filter(function (x) { return x.serious; }); }
  // "a", "a and b", "a, b and c" - joined the way a person would say it out loud
  function listOf(items) {
    if (items.length <= 1) return items[0] || "";
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }
  function phrase(list, n) {
    return listOf(list.slice(0, n || 3).map(function (x) { return x.t; }));
  }

  // every baby still on the unit that you are handing over with something unfinished
  function handoverProblems() {
    var out = [];
    G.babies.forEach(function (b) {
      if (b.died) return;
      var open = openAtHandover(b);
      if (open.length) out.push({ b: b, open: open, serious: serious(open).length > 0 });
    });
    return out;
  }

  /* WHAT YOU HAD TO GO ON. The reveal used to hand over the answer without ever saying
     whether the answer had been available, so a player who never sent a test and a player
     who sent it and ignored the result read the same card. These are the two different
     lessons in the game, and they are the two most useful sentences in the debrief. */
  function dxLine(b) {
    var pz = b.puzzle, dx = pz && pz.dx;
    if (!dx || pz.benign) return "";
    var found, fixed;
    try { found = !!dx.found(b); fixed = !!dx.fixed(b); }
    catch (e) { return ""; }
    if (!found)
      return "<br><br><b>What you had to go on:</b> Nothing you sent would have shown this. " +
             esc(dx.test || "");
    if (!fixed)
      return "<br><br><b>What you had to go on:</b> You had it. " + esc(dx.test || "") +
             " The finding was on the chart and the plan never changed.";
    return "<br><br><b>What you had to go on:</b> You went looking, you found it, and you acted on it. " +
           "That is the whole job.";
  }

  function revealFor(b) {
    var course = courseOf(b), un = openAtHandover(b), pz = b.puzzle;
    var truth = esc(b.name) + " " + gl(pz.truth);
    if (course === "expected")
      return "<b>What was really happening:</b> " + truth + dxLine(b) +
             "<br><br><b>The lesson:</b> " + gl(pz.key);

    var what = cap(phrase(un));

    /* A benign puzzle's `truth` and `key` are written as a good outcome - "settled
       quickly once fed", "resist the urge to do more". On a night that went wrong they
       are not a lesson, they are a taunt, so they are withheld and the reveal says the
       true and much more useful thing instead: there was nothing hidden here, and what
       happened was done to this baby rather than found in them. */
    if (pz.benign) {
      var lead = "<b>What was really happening:</b> There was nothing hidden wrong with " + esc(b.name) +
                 // "drew" is past tense, which is the same for one baby or for they
                 ". " + b.pronoun.S + " drew the quiet night, and " +
                 (course === "died" ? "died anyway." : "still ended the shift worse than " + b.pronoun.s + " started it.");
      return lead + "<br><br><b>What went wrong instead:</b> " +
             (un.length ? gl(what) : "nothing you can point at, which is its own kind of answer") + "." +
             "<br><br><b>The lesson:</b> A baby with nothing the matter can still be harmed by the night " +
             "around them. Cold, hunger, oxygen, pressure and handling are all things we do, not things " +
             "they arrive with.";
    }

    if (course === "died") {
      return "<b>What " + esc(b.name) + " had:</b> " + truth + dxLine(b) +
             "<br><br><b>What " + b.pronoun.s + " died of:</b> " + (un.length
               ? gl(what) + ". None of that is sudden. Every one of them was a number on the screen for hours."
               : "a long stretch in a critical state that nobody came to. It was on the screen the whole time.") +
             "<br><br><b>What would have changed it:</b> " + gl(pz.key);
    }
    if (course === "critical") {
      return "<b>What was really happening:</b> " + truth + dxLine(b) +
             "<br><br><b>Where the night went:</b> " + (un.length ? gl(what) + ". " : "") + esc(b.name) +
             " spent " + Math.round(b.h.criticalMinutes) + " minutes in a critical state." +
             "<br><br><b>The lesson:</b> " + gl(pz.key);
    }
    /* Only claim something was left open when something WAS. A baby whose infection you
       found and treated, and who simply had a hard night, used to be handed a card reading
       "it was never worked out, and nothing was ever changed about the plan". */
    if (!un.length) {
      return "<b>What was really happening:</b> " + truth + dxLine(b) +
             "<br><br><b>How it went:</b> Hard work, and you got there. Nothing was left open on " +
             esc(b.name) + " at handover." +
             "<br><br><b>The lesson:</b> " + gl(pz.key);
    }
    return "<b>What was really happening:</b> " + truth + dxLine(b) +
           "<br><br><b>What is still open at handover:</b> " + gl(what) + "." +
           "<br><br><b>The lesson:</b> " + gl(pz.key);
  }

  /* What the player should have done about it, said once, plainly. Keyed off the first
     serious clause because that is the one the morning will act on. */
  function handoverAdvice(p) {
    var t = p.open.filter(function (x) { return x.serious; })[0] || p.open[0];
    var s = t.t;
    if (/blood sugar|under 25/.test(s))
      return "A bolus lifts it for an hour; it is the infusion rate that holds it. Recheck after you change it.";
    if (/infection|culture grew/.test(s))
      return "Culture, then antibiotics, then keep looking. Waiting for a number before treating is how this one gets away.";
    if (/bowel/.test(s)) return "Feeds stopped, stomach decompressed, film, antibiotics, and a surgeon told. Hours matter.";
    if (/air leak/.test(s)) return "Sudden, one-sided, unresponsive to oxygen. It needed a needle.";
    if (/temperature/.test(s)) return "Warm first, always. Cold burns the sugar and the oxygen a baby needed for growing.";
    if (/carbon dioxide/.test(s)) return "Rising CO2 on support means the ventilation is not enough, not that the oxygen is.";
    if (/lung blood vessels/.test(s))
      return "Saturations that swing and will not follow the oxygen are pulmonary hypertension. Minimal handling, " +
             "sedation, an echo, and ring somebody senior early - it is not a diagnosis to sit on alone.";
    if (/short of surfactant/.test(s))
      return "CPAP holds lungs open; it cannot make what is missing. Stiff lungs and a rising oxygen need mean " +
             "a gas, then a tube, then surfactant down it.";
    if (/percent oxygen at handover|working hard for every breath/.test(s))
      return "A rising oxygen requirement is a diagnosis waiting to be made. A gas and a film are ten minutes each " +
             "and they tell you which one it is.";
    if (/saturation/.test(s)) return "A saturation that sits low is a question about the lungs, not a reason to turn the dial up.";
    if (/bilirubin/.test(s)) return "Light is cheap and very safe. Get a level, read it against the threshold, and start.";
    if (/haemoglobin/.test(s)) return "Anaemia makes spells worse and babies tired. A blood count would have shown it.";
    if (/ventilator pressure/.test(s)) return "Lower pressure and a higher CO2 is the trade that brought chronic lung disease rates down.";
    if (/driven down to/.test(s))
      return "A low carbon dioxide is not a good result. It clamps the arteries in a preterm brain, and " +
             "the only sign is a baby who has stopped breathing over the ventilator. Come down on the rate.";
    if (/brain bleed extended|bleed happened during/.test(s))
      return "There is no treatment for a bleed once it has happened, which is exactly why the " +
             "handling matters: minimal disturbance, a steady blood pressure, and nothing that " +
             "swings the pressure about - no fast fluid, no unnecessary suctioning.";
    if (/down one bronchus/.test(s))
      return "One side of the chest lifting and one not, on a baby with a tube in, is the tube until a " +
             "film says otherwise. Listen to both sides every time you are at the cot.";
    return "Worth going back over before the next shift.";
  }

  function bedAccent(b) { return window.Util.bedAccent(b); }

  // ------------------------------------------------------------------ report
  function endShift() {
    G.running = false; clearTimeout(G.timer);
    var ev = evaluateShift();
    var died = ev.died, pct = ev.pct, grade = ev.grade;

    var h = '<div class="report-wrap"><div class="muted mono">07:00 &middot; handover to the day team</div>' +
      '<div class="grade grade-' + (pct >= 76 ? "good" : pct >= 46 ? "mid" : "poor") + '">' + grade + "</div>" +
      '<p class="verdict">' + gl(verdictLine(ev)) + "</p>" +
      '<p class="muted" style="font-size:1.02rem">Twelve hours. ' + G.babies.filter(function (b) { return !b.died; }).length +
      " babies handed over" + (died.length ? ", and one who did not make it." : ".") + "</p>";

    died.forEach(function (b) {
      h += '<div class="card" style="border-color:#7d2a3a"><h3 style="color:#ff9d9d">' + esc(displayName(b)) +
        " died at " + clockStr(b.diedAt) + "</h3><p>" + esc(b.name) + " spent " + Math.round(b.h.criticalMinutes) +
        " minutes in a critical state during your shift. The team will hold a debrief later today, because that is " +
        "what good units do after a death.</p><div class=\"truth\" style=\"background:#241820\">" +
        revealFor(b) + "</div></div>";
    });

    /* THE HANDOVER ITSELF, at the top, before any scoring.
       This is what a night shift actually produces and the player had to hunt for it: the
       only place it appeared was one line inside each cot card, halfway down a four-page
       report, in the same weight as everything else. */
    if (ev.problems.length) {
      h += '<div class="card handover-open"><h3>What you are handing over</h3>' +
        '<p class="muted" style="font-size:.94rem">These were all findable before seven. ' +
        "The day team starts with them.</p>";
      ev.problems.forEach(function (p) {
        h += '<div class="open-baby' + (p.serious ? " serious" : "") + '">' +
          '<div class="ob-head"><span class="bed-badge ' + bedAccent(p.b) + '">bed ' + p.b.bed + "</span>" +
          "<b>" + esc(displayName(p.b)) + "</b>" +
          '<span class="ob-tag">' + (p.serious ? "still wrong" : "loose end") + "</span></div><ul class='plain'>";
        /* cap() BEFORE gl(), not after. gl() wraps a leading glossary term in an <abbr>, so
           capitalising its output uppercased the "<" and left the sentence starting lower
           case - on exactly the clauses that open with a word the glossary knows. */
        p.open.forEach(function (x) { h += "<li>" + gl(cap(x.t)) + "</li>"; });
        h += "</ul><div class='ob-why'>" + gl(handoverAdvice(p)) + "</div></div>";
      });
      h += "</div>";
    }

    h += '<div class="card"><h3>How the night went</h3>' +
      '<p class="muted" style="font-size:.9rem">Each part is judged against what the night actually asked of you. ' +
      "Anything that never came up is left out rather than counted in your favour.</p>";
    ev.domains.forEach(function (x) {
      var bd = band(x.v);
      h += '<div class="domain ' + bd.cls + '"><div class="dom-head"><span class="dom-name">' + esc(x.label) +
        '</span><span class="dom-rating">' + bd.word + '</span></div>' +
        '<div class="dom-bar"><i style="width:' + Math.round(x.v * 100) + '%"></i></div>' +
        '<div class="dom-detail">' + gl(x.detail) + "</div>" +
        (x.v < 0.62 ? '<div class="dom-short">' + gl(x.shortfall) + "</div>" : "") + "</div>";
    });
    h += "</div>";

    h += '<div class="card"><h3>The numbers</h3><div class="metric-grid">' +
      metric(ev.concerns.handled + "/" + ev.concerns.total, "Concerns dealt with",
             ev.concerns.total === 0 ? "" : ev.concerns.handled === ev.concerns.total ? "good"
             : ev.concerns.handled / ev.concerns.total >= 0.6 ? "warn" : "bad") +
      metric(G.metrics.talksHad + "/" + G.metrics.talksOffered, "Conversations taken",
             G.metrics.talksOffered === 0 ? "" : G.metrics.talksHad >= G.metrics.talksOffered * 0.7 ? "good"
             : G.metrics.talksHad > 0 ? "warn" : "bad") +
      metric(Math.round(Math.max(0, Math.min(100, G.trust))) + "%", "Family trust",
             G.trust > 70 ? "good" : G.trust > 45 ? "warn" : "bad") +
      metric(G.metrics.exams, "Hands-on examinations",
             G.metrics.exams >= 5 ? "good" : G.metrics.exams >= 2 ? "warn" : "bad") +
      metric(G.metrics.draws, "Blood draws",
             G.metrics.draws <= 6 ? "good" : G.metrics.draws <= 10 ? "warn" : "bad") +
      metric(G.metrics.calledForHelp, "Times you asked for help", G.metrics.calledForHelp > 0 ? "good" : "warn") +
      (G.metrics.safetyCatches || G.metrics.overrides
        ? metric(G.metrics.safetyCatches, "Dose checks worked through",
                 G.metrics.overrides ? "bad" : "good") : "") +
      "</div></div>";

    if (ev.concerns.unhandled.length) {
      h += '<div class="card" style="border-color:#6b551b"><h3 style="color:var(--amber)">What nobody came to</h3>' +
        "<p class=\"muted\" style=\"font-size:.92rem\">These were raised during the night and never dealt with.</p><ul class=\"plain\">";
      ev.concerns.unhandled.slice(0, 8).forEach(function (u) {
        var b = byBed(u.bed);
        h += "<li><b>Bed " + u.bed + (b ? ", " + esc(displayName(b)) : "") + "</b> &mdash; " +
             esc(EV.CHARS[u.who].name.split(",")[0]) + " raised " + gl(u.summaryText) + "</li>";
      });
      h += "</ul></div>";
    }

    h += '<div class="card"><h3>Bed by bed, and what was actually going on</h3>';
    G.babies.forEach(function (b) {
      var st = statusOf(b);
      h += '<div class="outcome ' + st.cls + '"><h4>' + esc(displayName(b)) + " &middot; bed " + b.bed +
        ' <span class="muted" style="font-weight:400">' + st.label + '</span></h4><div class="muted" style="font-size:.92rem">' +
        st.detail + '</div><div class="truth">' + revealFor(b) + "</div></div>";
    });
    h += "</div>";

    var goods = G.scoreItems.filter(function (s) { return s.n > 0; }).sort(function (a, c) { return c.n - a.n; }).slice(0, 6);
    var bads = G.scoreItems.filter(function (s) { return s.n < 0; }).sort(function (a, c) { return a.n - c.n; }).slice(0, 6);
    h += '<div class="card"><h3>Decisions that mattered</h3>';
    if (goods.length) { h += "<p><b>Well judged</b></p><ul class='plain'>"; goods.forEach(function (s) { h += "<li>" + s.t + " &mdash; " + gl(s.why) + "</li>"; }); h += "</ul>"; }
    if (bads.length) { h += "<p style='margin-top:10px'><b>Worth revisiting</b></p><ul class='plain'>"; bads.forEach(function (s) { h += "<li>" + s.t + " &mdash; " + gl(s.why) + "</li>"; }); h += "</ul>"; }
    if (!goods.length && !bads.length) h += '<p class="muted">A quiet night with few decision points.</p>';
    h += "</div>";

    h += '<div class="card"><h3>What to try next shift</h3>' + tips(ev).map(function (t) {
      return '<div class="tip"><span class="ti">&rsaquo;</span><span>' + gl(t) + "</span></div>";
    }).join("") + "</div>";
    /* The same night again. Everything in a shift comes off one seeded generator, so handing
       back the seed this shift actually used - the resolved one, not the blank the player may
       have left in the box - rebuilds the same five babies with the same five hidden problems.
       What happens after that is yours to change, which is the whole point of it. */
    /* TWO BUTTONS, TWO DIFFERENT THINGS. There were three, and two of them did the same
       thing: "Another shift" and the "Back to the title" link both went to index.html, so
       the only real choice on offer - a new night, or this one again - was hidden behind a
       pair of controls that were the same door twice. */
    h += '<div class="opt-row"><button class="btn" id="toTitle">Back to the title</button>' +
      '<button class="btn ghost" id="relive" data-tip="' +
      esc("The same five babies, the same five hidden problems, the same night in the same order - " +
          "seed " + G.seedVal + ". Everything you do differently is yours.") +
      '">Live this shift again</button></div></div>';
    document.body.innerHTML = h;
    buildReportIndex();
    /* Replacing the whole body takes the live region with it, so the end of the shift - the
       entire teaching payload - arrived in silence for anyone using a screen reader, with
       focus left on nothing. Put it back, say what happened, and land on the verdict. */
    var live = document.createElement("div");
    live.id = "announcer"; live.className = "sr-only";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    document.body.appendChild(live);
    var head = document.querySelector(".grade");
    if (head) {
      head.setAttribute("tabindex", "-1");
      try { head.focus(); } catch (e) {}
    }
    setTimeout(function () {
      /* And what the morning is actually inheriting. The grade and the verdict were all
         this said, so the single most important thing a night shift produces - the list of
         what is still wrong, which the sighted player reads at the top of the page - was
         never spoken. */
      /* The specifics only. verdictLine has already said who is being handed over unfinished,
         so repeating "you are handing over one baby with something unfinished" in front of
         the list makes the one sentence a screen reader gets say it twice. */
      var carry = !ev.problems.length ? " Nothing was left open."
        : " " + ev.problems.map(function (p) { return p.b.name + ": " + phrase(p.open, 2) + "."; }).join(" ");
      live.textContent = "Seven in the morning, handover to the day team. " + grade + ". " +
                         verdictLine(ev) + carry;
    }, 60);
    saveBest(pct, grade);
  }

  /* ------------------------------------------------------------- the index
     The report is the teaching payload and it is four screens of it: the handover, the
     domains, the numbers, a card per cot, the decisions, the advice. Once you had scrolled
     past a cot there was no way back to it except scrolling, which is the wrong shape for
     something meant to be re-read rather than read once.

     Built from the headings that actually rendered, not from a second list beside them -
     half these cards are conditional, so a hand-written index would be wrong on most
     nights. */
  function buildReportIndex() {
    var wrap = document.querySelector(".report-wrap");
    if (!wrap) return;
    var cards = [].slice.call(wrap.querySelectorAll(".card")), items = [];
    cards.forEach(function (c, i) {
      var head = c.querySelector("h3");
      if (!head) return;
      c.id = "rep" + i;
      // "Bed by bed, and what was actually going on" is a heading, not a tab label
      items.push({ id: c.id, text: head.textContent.trim().split(",")[0] });
    });
    if (items.length < 3) return;
    var nav = document.createElement("nav");
    nav.className = "report-index";
    nav.setAttribute("aria-label", "Jump to a section of the report");
    nav.innerHTML = items.map(function (it) {
      return '<a href="#' + it.id + '">' + esc(it.text) + "</a>";
    }).join("");
    var first = wrap.querySelector(".card");
    if (first) wrap.insertBefore(nav, first);

    /* The index is sticky, so an anchor has to stop short of it by however tall it actually
       is - and that changes with the width, because the pills wrap. A fixed scroll-margin
       guessed 64 and the row was 97 at 1024px, so every jump landed its heading behind the
       thing you had just clicked. */
    function sizeIndex() {
      wrap.style.setProperty("--index-h", Math.ceil(nav.getBoundingClientRect().height) + "px");
    }
    sizeIndex();
    window.addEventListener("resize", sizeIndex);
  }

  function metric(v, l, c) { return '<div class="metric ' + (c || "") + '"><div class="mv">' + v + '</div><div class="ml">' + l + "</div></div>"; }

  /* ===================================================================
     Shift evaluation.

     Scored by PROPORTION, not by accumulated points. The old version started
     everyone at 50 and added a bonus for things that were true by default, so a
     shift where almost nothing was done still read as "Solid". Each domain now
     measures what you did against what was actually asked of you, domains that
     never came up are excluded rather than credited, and the headline is capped
     by the weakest domain so it cannot praise a shift with a hole in it.
     =================================================================== */

  function band(v) {
    return v >= 0.85 ? { word: "strong", cls: "good" }
         : v >= 0.62 ? { word: "fair", cls: "" }
         : v >= 0.35 ? { word: "shaky", cls: "warn" }
                     : { word: "poor", cls: "bad" };
  }

  // concerns are counted by key, so a re-raised one is not double counted
  function concernTally() {
    var keys = {};
    G.concerns.forEach(function (c) {
      var k = keys[c.key] || (keys[c.key] = { handled: false, stoodDown: false, who: c.who,
                                              what: c.def, bed: c.bed, summaryText: c.summaryText });
      k.summaryText = c.summaryText;
      var settled = c.done && !c.missed && (c.resolvedAt != null ||
                     (c.declinedAt != null && c.def.decline && c.def.decline.resolve));
      if (settled) k.handled = true;
      if (c.stale || c.retracted) k.stoodDown = true;
      if (c.missed) k.missed = true;
    });
    // handled beats everything; a purely self-resolving one is dropped from the denominator
    var ks = Object.keys(keys).filter(function (k) {
      return keys[k].handled || keys[k].missed || !keys[k].stoodDown;
    });
    var handled = ks.filter(function (k) { return keys[k].handled; });
    return { total: ks.length, handled: handled.length,
             unhandled: ks.filter(function (k) { return !keys[k].handled; }).map(function (k) { return keys[k]; }) };
  }

  function evaluateShift() {
    var d = [], m = G.metrics;

    // 1. did you go when your colleagues asked for you?
    var ct = concernTally();
    if (ct.total > 0) {
      d.push({ key: "response", w: 0.25, v: ct.handled / ct.total,
               label: "Answering your team",
               detail: ct.handled + " of " + ct.total + " concerns your colleagues raised were dealt with",
               shortfall: "Your team asked you to come to a bedside " + ct.total + " times and " +
                          (ct.total - ct.handled) + " of those went unanswered. When a nurse asks you to look at a baby, " +
                          "they have usually already noticed something real." });
    }

    // 2. when you did decide, were the decisions good ones?
    /* Conversations are excluded. They carry score, and thirteen of them at five to seven
       points each buried five points of bad clinical calls under a hundred and fifty good
       ones - a playtest read "158 points of good calls against 5 of poor ones" and rated
       the judgement STRONG. They were also being counted twice: once here and again as
       family trust. This domain is about decisions made at a cot. */
    var good = 0, bad = 0, goodN = 0, badN = 0;
    G.scoreItems.forEach(function (x) {
      if (x.kind === "family") return;
      if (x.n > 0) { good += x.n; goodN++; } else { bad += -x.n; badN++; }
    });
    if (good + bad > 0) {
      /* Half the weight on the points and half on the COUNT, so one large win cannot bury
         several small errors and one large error cannot erase a careful night. */
      var byPoints = good / (good + bad);
      var byCount = goodN + badN > 0 ? goodN / (goodN + badN) : 1;
      d.push({ key: "judgement", w: 0.20, v: (byPoints + byCount) / 2,
               label: "Clinical judgement",
               detail: goodN + " good clinical calls against " + badN +
                       " that went the wrong way" + (badN ? " - listed below" : ""),
               shortfall: "A lot of the decisions you made worked against the babies rather than for them. " +
                          "The list below shows which ones." });
    }

    // 3. gentleness — only judged on the things you actually did
    var o2 = 0, press = 0, ventUsed = false, oxyUsed = false, painful = 0, comfort = 0, bpdAdded = 0;
    G.babies.forEach(function (b) {
      o2 += b.h.o2Exposure; press += b.h.volutrauma;
      bpdAdded += Math.max(0, b.h.bpd - (b.startSnapshot ? b.startSnapshot.bpd : 0));
      if (b.h.o2Exposure > 0 || b.support.fio2 > 0.21) oxyUsed = true;
      if (b.support.mode === "VENT" || b.h.volutrauma > 0) ventUsed = true;
      painful += b.h.painMinutes > 0 ? 1 : 0; comfort += b.h.comfortActs;
    });
    var gparts = [];
    if (oxyUsed) gparts.push(o2 < 60 ? 1 : o2 < 220 ? 0.55 : 0.15);
    if (ventUsed) gparts.push(press < 1 ? 1 : press < 4 ? 0.55 : 0.2);
    gparts.push(m.draws <= 6 ? 1 : m.draws <= 10 ? 0.6 : 0.25);
    if (painful) gparts.push(comfort >= painful ? 1 : comfort > 0 ? 0.6 : 0.3);
    if (gparts.length) {
      var gv = gparts.reduce(function (a, b2) { return a + b2; }, 0) / gparts.length;
      d.push({ key: "gentle", w: 0.15, v: gv,
               label: "Gentle care",
               detail: "oxygen " + (o2 < 60 ? "well controlled" : o2 < 220 ? "over target at times" : "left high") +
                       ", " + m.draws + " blood draws" +
                       (ventUsed ? ", ventilator " + (press < 1 ? "gentle" : "firm") +
                         (bpdAdded > 0.25 ? " (lung injury accumulated)" : "") : ""),
               shortfall: "Oxygen above target, high ventilator pressures and repeated blood draws all cost a " +
                          "premature baby something, even when the numbers on the monitor look fine at the time." });
    }

    // 4. the families
    var fparts = [Math.max(0, Math.min(1, (G.trust - 20) / 60))];
    if (m.talksOffered > 0) fparts.push(Math.min(1, m.talksHad / m.talksOffered));
    var fv = fparts.reduce(function (a, b2) { return a + b2; }, 0) / fparts.length;
    d.push({ key: "family", w: 0.15, v: fv,
             label: "The families",
             detail: "trust " + Math.round(Math.max(0, Math.min(100, G.trust))) + "%" +
                     (m.talksOffered ? ", " + m.talksHad + " of " + m.talksOffered + " conversations taken" : ""),
             shortfall: "Families are part of the care, not an interruption to it. People wanted to talk to you " +
                        "and mostly did not get the chance." });

    /* 5. THE STATE YOU HANDED OVER.

       This replaces a "safety" domain that looked only at overridden pharmacy queries,
       positive cultures with no antibiotics, and long critical stretches - and therefore
       reported "no safety flags" on a shift that handed over a baby with a blood sugar of
       34. The most important question at seven in the morning is what the day team is
       inheriting, and nothing was asking it.

       It is deliberately NOT divided by the number of cots. Handing over one baby with an
       untreated infection is not one sixth of a problem because there are six babies. */
    var problems = handoverProblems();
    var seriousCount = problems.filter(function (p) { return p.serious; }).length;
    var looseCount = problems.length - seriousCount;
    var hv = 1 - 0.45 * seriousCount - 0.18 * looseCount;
    if (m.overrides) hv -= 0.4 * m.overrides;
    G.babies.forEach(function (b) { if (b.h.criticalMinutes > 120) hv -= 0.12; });
    hv = Math.max(0, Math.min(1, hv));
    var handDetail = problems.length
      ? problems.length + (problems.length === 1 ? " baby is" : " babies are") + " handed over with something unfinished: " +
        listOf(problems.map(function (p) { return p.b.name; }))
      : (m.overrides ? "a pharmacy dose query was overridden" : "every baby handed over settled, with nothing outstanding");
    d.push({ key: "handover", w: 0.25, v: hv,
             label: "The state you handed over",
             detail: handDetail,
             shortfall: "The day team is inheriting a problem mid-course. A night shift is judged on what " +
                        "the morning finds, and these were all findable before seven." });

    // weights re-normalised across only the domains that applied
    var tw = d.reduce(function (a, x) { return a + x.w; }, 0);
    var pct = Math.round(d.reduce(function (a, x) { return a + x.v * x.w; }, 0) / tw * 100);

    // the weakest important domain caps the headline: no praising a holed shift
    var died = G.babies.filter(function (b) { return b.died; });
    var weak = d.filter(function (x) { return x.w >= 0.15 && x.v < 0.35; });
    var awful = d.filter(function (x) { return x.w >= 0.15 && x.v < 0.20; });
    if (weak.length) pct = Math.min(pct, 55);
    if (awful.length) pct = Math.min(pct, 40);
    /* An unfinished baby caps the headline outright, whatever the arithmetic says. You can
       run a night beautifully - answer everything, take every conversation, wean the oxygen
       - and still hand a baby over with a blood sugar of 34, and that is not an outstanding
       shift. It was, before this: every domain STRONG and "nothing to pick at" printed over
       a cot card naming the problem. */
    if (seriousCount >= 1) pct = Math.min(pct, 74);        // no better than "Solid"
    if (seriousCount >= 2) pct = Math.min(pct, 58);        // no better than "Rocky"
    if (looseCount && !seriousCount) pct = Math.min(pct, 85);
    if (died.length) pct = Math.min(pct, 28);
    pct = Math.max(0, Math.min(100, pct));

    var grade = died.length ? "A hard night"
      : pct >= 88 ? "Outstanding" : pct >= 76 ? "Strong shift" : pct >= 62 ? "Solid"
      : pct >= 46 ? "Rocky" : pct >= 30 ? "Difficult night" : "A rough night";

    d.sort(function (a, b2) { return a.v - b2.v; });
    return { domains: d, pct: pct, grade: grade, died: died, concerns: ct,
             problems: problems, serious: seriousCount, loose: looseCount,
             weakest: d[0], failing: d.filter(function (x) { return x.v < 0.62; }) };
  }

  /* One honest sentence under the headline, naming the real problem. */
  function verdictLine(ev) {
    if (ev.died.length) return "A baby died during your shift. Everything else is secondary to that.";
    /* Before the verdict looks at domain scores at all: is anybody being handed over
       unfinished? That outranks every average, and it used to be invisible here. */
    if (ev.serious) {
      var names = ev.problems.filter(function (p) { return p.serious; })
                             .map(function (p) { return p.b.name; });
      return "You are handing " + listOf(names) + " over with something still wrong. " +
             "Everything else about the night was " + (ev.failing.length ? "mixed" : "good") +
             ", and the morning will start with this.";
    }
    if (ev.loose)
      return "Nothing is unsafe, but there are loose ends going into the morning. The list is above.";
    if (!ev.failing.length) return "Nothing to pick at. The unit was in good hands all night.";
    var w = ev.weakest;
    if (w.key === "response")
      return "You answered " + ev.concerns.handled + " of the " + ev.concerns.total +
             " things your team brought you. That is the single biggest thing to change.";
    if (w.key === "judgement") return "Several decisions went the wrong way tonight.";
    if (w.key === "gentle") return "The babies got through the night, but not gently.";
    if (w.key === "family") return "The medicine held together. The families were left out of it.";
    if (w.key === "handover") return "Too much was still open when the day team arrived.";
    return "There were problems tonight that should not happen twice.";
  }

  function statusOf(b) {
    if (b.died) return { cls: "crit", label: "died during the shift", detail: "The team will debrief together later today." };
    var s0 = b.startSnapshot, h = b.h, better = 0, worse = 0;
    if (S.lungFunction(b) > s0.lung + 0.05) better++;
    if (b.support.fio2 < s0.fio2 - 0.02) better++;
    if (h.sepsis < s0.sepsis || (h.sepsis > 0 && h.abx)) better++;
    if (h.bili < s0.bili || h.photo) better++;
    if (b.support.fio2 > s0.fio2 + 0.08) worse++;
    if (h.sepsis > s0.sepsis + 0.15 && !h.abx) worse++;
    if (h.necGrade > s0.necGrade + 0.5) worse++;
    if (h.ivhGrade > s0.ivhGrade) worse++;
    if (h.criticalMinutes > 60) worse++;
    var d = ["Oxygen " + Math.round(s0.fio2 * 100) + "% &rarr; " + Math.round(b.support.fio2 * 100) + "%",
             s0.mode + " &rarr; " + b.support.mode, h.spells + " spells"];
    if (h.abx) d.push("antibiotics started");
    if (h.photo) d.push("phototherapy running");
    if (h.bpd - s0.bpd > 0.25) d.push("lung injury accumulating from the pressures used");
    if (h.coldMinutes > 60) d.push(Math.round(h.coldMinutes) + " minutes cold");
    if (h.ivhGrade) d.push("grade " + h.ivhGrade + " bleed on ultrasound");
    if (h.kangarooMinutes > 0) d.push(Math.round(h.kangarooMinutes) + " minutes of skin to skin");
    return { cls: worse >= 2 ? "down" : better > worse ? "up" : "same",
             label: worse >= 2 ? "harder night" : better > worse ? "improved" : "stable", detail: d.join(" &middot; ") };
  }

  /* Advice comes from the domains that actually fell short, hardest first. Praise
     is only offered when nothing fell short at all. */
  function tips(ev) {
    var t = [], m = G.metrics;
    ev.failing.forEach(function (x) {
      if (x.key === "response")
        t.push("Go when you are called. " + (ev.concerns.total - ev.concerns.handled) + " of " + ev.concerns.total +
               " concerns went unanswered tonight. Working through the 'who needs you' list is most of this job.");
      if (x.key === "judgement")
        t.push("Slow down before acting. Read what your colleague actually saw, and check the thinking prompt if it is showing.");
      if (x.key === "gentle")
        t.push("Watch the top of the saturation range as carefully as the bottom, keep ventilator pressure as low as it will go, " +
               "and ask what you will do differently with a blood result before you send it.");
      if (x.key === "family")
        t.push("Take the conversations. They are marked with a face in the side panel, and ten minutes sitting down " +
               "changes how a whole admission feels to a family.");
      if (x.key === "safety")
        t.push("When a pharmacist queries a dose, go through it with them. And a baby who stays critical for hours " +
               "needs a different plan, not more of the same one.");
    });
    if (m.callsMissed) t.push("A phone call went unanswered. Important callers ring back, but not for ever.");
    if (!m.calledForHelp && !ev.died.length)
      t.push("You never called the attending. \u201cCall the attending\u201d sits under Assess at every bedside, " +
             "costs ten minutes, and Dr. Halvorsen will tell you which part of that baby she would be looking at. " +
             "Asking early is a senior skill, not a junior one.");

    /* The most useful sentence in the whole debrief, and it needs its own tip rather than
       being buried in a cot card: which babies went the whole night without anybody asking
       what was wrong with them. */
    var missed = G.babies.filter(function (b) {
      var dx = b.puzzle && b.puzzle.dx;
      if (!dx || b.puzzle.benign) return false;
      try { return !dx.found(b); } catch (e) { return false; }
    });
    if (missed.length)
      t.unshift((missed.length === 1 ? "One baby went" : missed.length + " babies went") +
                " the whole night without a test that would have shown what was wrong: " +
                listOf(missed.map(function (b) { return b.name; })) +
                ". A blood gas, a film, a count or a sugar is ten minutes. Guessing is free and costs more.");
    /* This used to print "a genuinely well-run shift, with nothing left hanging" directly
       underneath a list of things left hanging, because it only looked at domain scores. */
    if (ev.problems.length) {
      t.unshift(ev.serious
        ? "Before you hand over, walk the unit once and ask of every baby: is anything still wrong here? " +
          "Tonight " + listOf(ev.problems.filter(function (p) { return p.serious; })
                                         .map(function (p) { return p.b.name; })) +
          " went to the day team mid-problem."
        : "Tidy the loose ends before seven. None of tonight's were dangerous, but they are all things " +
          "the morning now has to pick up.");
    } else if (!t.length) {
      t.push("A genuinely well-run shift, with nothing left hanging. Try the next difficulty up, or a new seed for a different set of problems.");
    }
    return t.slice(0, 5);
  }

  function saveBest(pct, grade) {
    try {
      var k = "nicuGameBest", cur = JSON.parse(localStorage.getItem(k) || "{}");
      if (!cur[G.difficulty] || cur[G.difficulty].pct < pct)
        cur[G.difficulty] = { pct: pct, grade: grade, when: new Date().toISOString().slice(0, 10) };
      localStorage.setItem(k, JSON.stringify(cur));
    } catch (e) {}
  }

  NG.endShift = endShift;
})();
