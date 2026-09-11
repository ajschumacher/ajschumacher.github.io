/* NICU Night Shift — the checks that were previously done by hand.

   Nearly every bug this game has had was FOUND BY MEASUREMENT rather than by reading:
   one archetype quietly killing its baby whatever puzzle it drew, keyboard focus dying
   every 2.4 seconds, the delivery room charging its cost twice, forty percent of every
   frame being thrown away. All of that instrumentation used to live in a browser console
   and evaporate. This is it, written down.

   Open test/index.html over a local server (file:// iframes are opaque-origin, so the
   harness cannot reach into them). Each shift runs in its own iframe at full speed. */
(function () {
  "use strict";

  // ---------------------------------------------------------------- tiny framework
  var suites = [], out = null;
  function suite(name, fn) { suites.push({ name: name, fn: fn }); }
  function ok(cond, what, detail) {
    out.push({ pass: !!cond, what: what, detail: detail == null ? "" : String(detail) });
    return !!cond;
  }
  function near(v, lo, hi, what) { return ok(v >= lo && v <= hi, what, v + " (want " + lo + ".." + hi + ")"); }

  // ---------------------------------------------------------------- running a shift
  /* Boots the real game in an iframe and hands it to `play`. Anything the game logs to
     window.onerror is captured, because a swallowed exception is the failure mode that
     matters most here. */
  function shift(cfg, play) {
    return new Promise(function (res) {
      var f = document.createElement("iframe");
      f.style.cssText = "position:fixed;left:-9999px;width:1200px;height:900px";
      var full = { difficulty: "resident", hints: true, allowDeath: true, sound: false, seed: 1 };
      for (var k in cfg) full[k] = cfg[k];
      sessionStorage.setItem("nicuGameCfg", JSON.stringify(full));
      document.body.appendChild(f);
      f.onload = function () {
        var w = f.contentWindow, D = f.contentDocument, errs = [];
        w.addEventListener("error", function (e) {
          errs.push(e.message + " @" + String(e.filename || "").split("/").pop() + ":" + e.lineno);
        });
        setTimeout(async function () {
          var G = w.G;
          if (!G) { res({ errs: ["the game did not load"], G: null }); f.remove(); return; }
          var sb = D.getElementById("startShift"); if (sb) sb.click();
          var r;
          try { r = await play(G, w, D) || {}; }
          catch (e) { errs.push("play: " + e.message + " | " + String(e.stack || "").split("\n")[1]); r = {}; }
          r.errs = (r.errs || []).concat(errs);
          r.G = G; r.w = w; r.D = D; r.text = D.body.innerText;
          res(r);
          setTimeout(function () { f.remove(); }, 0);
        }, 700);
      };
      f.src = "../game.html?v=test" + Math.random();
    });
  }

  // answer whatever is on screen with the LAST option, which is never the best one:
  // this is a deliberately poor player, not a random one
  function clearDialog(G, D) {
    if (!G.dialogOpen) return false;
    var o = [].slice.call(D.querySelectorAll(".dlg-opt"));
    if (o.length) o[o.length - 1].click();
    var c = D.querySelector(".dialog > .btn"); if (c) c.click();
    var s = D.getElementById("scrim"); if (s) { s.remove(); G.dialogOpen = false; }
    return true;
  }
  /* Every concern dealt with, said in the terms concernTally() actually reads. Setting
     `done` and a `resolvedAt` is not enough on its own: a concern that went stale and was
     retracted, or that escalation had already marked missed, still counts against you, and
     while a neglected unit raised a dozen a night one straggler barely moved the ratio. A
     unit where every baby is well raises about three, so one of them reads as a third of
     the shift ignored. */
  function settleEveryConcern(G) {
    G.concerns.forEach(function (c) {
      if (c.done && c.resolvedAt != null && !c.missed) return;
      if (c.resolvedAt == null) { c.resolvedAt = G.min; G.metrics.concernsAnswered++; }
      c.done = true; c.missed = false; c.stale = false; c.retracted = false;
    });
  }

  function runToEnd(G, D, limit) {
    var guard = 0;
    while (G.running && guard++ < (limit || 4000)) {
      if (clearDialog(G, D)) continue;
      G.advance(720);
    }
  }

  // does this concern's own condition hold for this baby right now?
  function EVcond(w, id, G, b) {
    var c = w.Events.CONCERNS.filter(function (x) { return x.id === id; })[0];
    return !!(c && c.cond(G, b));
  }

  // ---------------------------------------------------------------- suites
  suite("A shift runs, every difficulty, and reaches the report", async function () {
    var beds = [["resident", true], ["resident", false], ["attending", true],
                ["attending", false], ["student", true]];
    for (var i = 0; i < beds.length; i++) {
      var d = beds[i][0], hints = beds[i][1];
      var r = await shift({ difficulty: d, hints: hints, seed: 137 * (i + 1) }, function (G, w, D) {
        runToEnd(G, D); return {};
      });
      var label = d + (hints ? " with prompts" : " without prompts");
      ok(!r.errs.length, label + ": no exceptions", r.errs.join(" | "));
      ok(r.text.indexOf("handover to the day team") >= 0, label + ": reaches the report");
      ok(!/undefined|NaN|\[object/.test(r.text), label + ": no undefined or NaN on screen",
         (r.text.match(/.{30}(undefined|NaN|\[object).{30}/) || [""])[0]);
      ok(!/\b[Tt]hey (is|was|has|does|looks|needs)\b/.test(r.text), label + ": singular they conjugates",
         (r.text.match(/\b[Tt]hey (is|was|has|does|looks|needs)\b.{0,40}/) || [""])[0]);
    }
  });

  suite("Deaths only ever come from a puzzle that was genuinely pathological", async function () {
    /* The bug this exists for: the big baby of a diabetic mother used to die in six of
       twelve neglected shifts on ALL THREE of its puzzles, including the one whose reveal
       reads "settled quickly once fed". A benign puzzle killing its baby is the signal
       that something in the physiology has a floor in the wrong place. */
    var deaths = [], benignDeaths = [], unexplained = [], shifts = 0, repeats = {};
    for (var i = 1; i <= 8; i++) {
      var r = await shift({ seed: 137 * i }, function (G, w, D) {
        runToEnd(G, D);
        var txt = D.body.innerText;
        return { died: G.babies.filter(function (b) { return b.died; }).map(function (b) {
                   /* A baby who dies must have something on the page saying what of. The
                      benign reveal is written for exactly this - "there was nothing hidden
                      wrong with her, and she died anyway" - and it then has to name what
                      the night did to her. */
                   var named = /air leak was never decompressed|tube was sitting down one bronchus|blood sugar was still|infection was running|bowel was failing|temperature was|carbon dioxide|saturation was in the|driven down to|percent oxygen at handover|working hard for every breath|lung blood vessels|short of surfactant/.test(txt);
                   return { id: b.arch + "/" + b.puzzle.id, benign: !!b.puzzle.benign, named: named };
                 }) };
      });
      shifts++;
      (r.died || []).forEach(function (d) {
        deaths.push(d.id);
        repeats[d.id] = (repeats[d.id] || 0) + 1;
        if (d.benign) benignDeaths.push(d.id);
        if (!d.named) unexplained.push(d.id);
      });
      if (r.errs.length) ok(false, "neglect sweep seed " + (137 * i) + ": no exceptions", r.errs.join(" | "));
    }
    /* NOT "never". The game has a deliberate, written path for a benign baby who dies of
       what the unit did to them - "cold, hunger, oxygen, pressure and handling are all
       things we do, not things they arrive with" - and a ventilated baby left for twelve
       hours with an untreated air leak is exactly that. What must not happen is a benign
       puzzle killing its baby ROUTINELY, which is the floor-in-the-wrong-place bug this
       suite was written for, or killing one with nothing on the page to explain it. */
    ok(benignDeaths.length <= 1, "a benign puzzle does not routinely kill its baby",
       benignDeaths.join(", ") + " in " + shifts + " neglected shifts");
    ok(!unexplained.length, "and no death goes unexplained by the handover", unexplained.join(", "));
    var worst = Object.keys(repeats).sort(function (a, b) { return repeats[b] - repeats[a]; })[0];
    ok(!worst || repeats[worst] <= 3, "no single archetype and puzzle is simply lethal",
       worst + " died " + (worst ? repeats[worst] : 0) + " times");
    near(deaths.length, 0, Math.ceil(shifts * 0.8), "deaths across " + shifts + " neglected shifts");
  });

  suite("The clock: one source of time, and the right rate for where you are", async function () {
    var r = await shift({ seed: 99 }, async function (G, w, D) {
      var res = {};
      /* G.clockRate is what frame() last decided, so each of these has to let a frame or
         two actually happen. Pausing to read it - the obvious thing - reads zero, because
         paused is one of the states the rate function answers for. */
      function settle() { return new Promise(function (r) { setTimeout(r, 300); }); }
      await settle(); res.wardBase = G.clockRate;
      D.querySelectorAll(".pod-hit")[0].click();
      await settle(); res.bedside = G.clockRate;
      D.getElementById("btnBack").click();
      G.pendingDelivery = w.Deliveries.SCENARIOS[0];
      G.summonDelivery();
      await settle(); res.birthWaiting = G.clockRate;
      G.enterDelivery();
      await settle(); res.inDelivery = G.clockRate;
      G.paused = true;
      // the resuscitation and the shift must spend the same seconds
      var d = G.delivery, s0 = d.sec, t0 = G.min + G.acc;
      G.doDelivery("warm");                        // a 30-second action
      res.resusSpent = d.sec - s0;
      res.shiftSpent = Math.round(((G.min + G.acc) - t0) * 60);
      return res;
    });
    ok(!r.errs.length, "clock probe: no exceptions", r.errs.join(" | "));
    ok(r.inDelivery > 0 && Math.abs(r.inDelivery - 1 / 60) < 1e-6, "delivery room runs at one second per second", r.inDelivery);
    ok(r.bedside === 0.5, "a cot runs at thirty game-seconds per real second", r.bedside);
    ok(r.birthWaiting === 0.5, "a birth waiting for you holds the ward at the bedside pace", r.birthWaiting);
    ok(r.resusSpent === r.shiftSpent,
       "an action spends the same seconds on both clocks",
       "resus " + r.resusSpent + "s vs shift " + r.shiftSpent + "s");
  });

  suite("An action that did nothing costs nothing and is not credited", async function () {
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var res = {}, b = G.babies[0];
      G.paused = true;
      D.querySelectorAll(".pod-hit")[0].click();
      var m0 = G.min, s0 = G.score;
      G.doAction(b, "gas");
      res.firstCost = G.min - m0;
      var m1 = G.min, s1 = G.score;
      G.doAction(b, "gas"); G.doAction(b, "gas");
      res.repeatCost = G.min - m1;
      res.repeatScore = G.score - s1;
      res.pending = b.pending.filter(function (p) { return p.kind === "gas"; }).length;
      res.refusal = G.note && G.note.text;
      // every action must say something; a silent button is the bug this catches
      res.silent = [];
      [].slice.call(D.querySelectorAll(".act")).forEach(function (n) {
        var id = n.getAttribute("data-act"), L = G.logLines.length;
        G.doAction(G.babies[1], id, { silent: true });
        if (G.logLines.length === L) res.silent.push(id);
      });
      return res;
    });
    ok(!r.errs.length, "action probe: no exceptions", r.errs.join(" | "));
    ok(r.firstCost === 10, "a blood gas costs its ten minutes", r.firstCost);
    ok(r.repeatCost === 0, "repeating it costs nothing", r.repeatCost);
    ok(r.repeatScore === 0, "repeating it earns nothing", r.repeatScore);
    ok(r.pending === 1, "and does not send a second test", r.pending);
    ok(/already running/.test(r.refusal || ""), "and says so", r.refusal);
    ok(r.silent.length === 0, "no action is silent", r.silent.join(", "));
  });

  suite("The delivery room sends up the baby you actually delivered", async function () {
    /* Admitting the well term baby used to produce somebody else's 30-week preemie in bed
       6, because the arrival was looked up from the scenario's ordinary path and that
       scenario's ordinary path is that nobody comes up at all. */
    function run(scId, where) {
      return shift({ seed: 99 }, function (G, w, D) {
        G.pendingDelivery = w.Deliveries.SCENARIOS.filter(function (s) { return s.id === scId; })[0];
        G.summonDelivery(); G.enterDelivery();
        var d = G.delivery;
        (d.sc.wants || []).forEach(function (id) { G.doDelivery(id); });
        w.Deliveries.advance(d, d.sc, Math.max(0, 130 - d.sec));
        G.finishDelivery(where);
        G.advance(30);
        var b6 = G.babies.filter(function (b) { return b.bed === 6; })[0];
        return { arch: b6 ? b6.arch : null, ga: b6 ? b6.ga : null, state: d.state,
                 closing: (G.logLines.filter(function (l) { return /Delivery room:/.test(l.m); })[0] || {}).m };
      });
    }
    var preterm = await run("preterm29", "unit");
    ok(preterm.arch === "rds", "a 29-weeker arrives as a preterm baby", preterm.arch + " " + preterm.ga + "w");

    var admitted = await run("vigorous", "unit");
    ok(admitted.arch === "term", "the well term baby you admit arrives as a TERM baby", admitted.arch + " " + admitted.ga + "w");
    ok(admitted.ga >= 37, "at term gestation", admitted.ga);
    ok(!/Nothing for the unit/.test(admitted.closing || ""),
       "and the closing line does not say nothing came up", admitted.closing);

    var left = await run("vigorous", "mother");
    ok(left.arch === null, "left with her mother, nobody comes up", left.arch);
    ok(/Nothing for the unit/.test(left.closing || ""),
       "and then the closing line does say so", left.closing);
  });

  suite("A player who keeps up sees a short list", async function () {
    /* The panel a player actually looks at. The neglect case below is allowed to be long -
       that is the unit in trouble - but somebody working through it should never be facing
       a wall of names, however much content the game grows. */
    var worst = 0, samples = 0, errs = [];
    for (var i = 0; i < 6; i++) {
      var r = await shift({ seed: 6900 + i, allowDeath: false }, function (G, w, D) {
        var peak = 0, n = 0, guard = 0;
        while (G.running && guard++ < 3000) {
          if (clearDialog(G, D)) continue;
          // answer everybody, the way somebody keeping up would
          G.concerns.filter(function (c) { return !c.done; })
                    .forEach(function (c) { c.seen = true; c.done = true; c.resolvedAt = G.min; });
          G.talks.forEach(function (t) { t.done = true; });
          G.advance(20);
          if (G.min > 120) {
            peak = Math.max(peak, D.querySelectorAll("#side .task").length);
            n++;
          }
        }
        return { peak: peak, n: n };
      });
      errs = errs.concat(r.errs);
      worst = Math.max(worst, r.peak); samples += r.n;
    }
    ok(!errs.length, "no exceptions", errs.slice(0, 2).join(" | "));
    ok(samples > 50, "the panel was sampled across the night", samples + " samples");
    ok(worst <= 6, "and never held more than a handful of rows at once", "peak " + worst);
  });

  suite("Nobody waits all night in the who-needs-you list", async function () {
    var r = await shift({ seed: 137 }, function (G, w, D) {
      var guard = 0;
      while (G.running && G.min < 600 && guard++ < 4000) {
        if (clearDialog(G, D)) continue;
        G.advance(5);
      }
      G.paused = true; G.doAction(G.babies[0], "examine");
      return {
        oldestTalk: G.talks.reduce(function (m, t) { return Math.max(m, G.min - t.at); }, 0),
        talksForDead: G.talks.filter(function (t) {
          var b = G.babies.filter(function (x) { return x.bed === t.bed; })[0];
          return b && b.died;
        }).length,
        rows: D.querySelectorAll("#side .task").length,
        openConcerns: G.concerns.filter(function (x) { return !x.done; }).length,
        offered: G.metrics.talksOffered,
        ingridIsATalk: G.talks.some(function (t) { return t.id === "attending"; })
      };
    });
    ok(!r.errs.length, "panel probe: no exceptions", r.errs.join(" | "));
    ok(r.oldestTalk <= 155, "no conversation is older than about two and a half hours", r.oldestTalk + " min");
    ok(r.talksForDead === 0, "no conversation survives the baby it was about", r.talksForDead);
    /* Ten hours into a shift where NOTHING has been answered, the panel is long because the
       unit is in trouble - seven people waiting and four monitors alarming with nobody at
       the cot. That is honest, and capping it would be lying to the player. What must not
       happen is unbounded growth, and what actually matters is the panel a player who is
       keeping up sees, which is the check below. */
    near(r.rows, 0, 14, "the panel does not grow without limit on a night nobody answers");
    ok(r.openConcerns <= 9, "and the queue of PEOPLE waiting is capped", r.openConcerns + " open");
    ok(!r.ingridIsATalk, "the attending rings rather than queueing to speak to you");
    near(r.offered, 6, 16, "conversations offered across a night");
  });

  suite("The way out is always on screen", async function () {
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      G.paused = true;
      D.querySelectorAll(".pod-hit")[2].click();
      var stage = D.getElementById("stage"), res = {};
      function exitTop() { return Math.round(D.getElementById("btnBack").getBoundingClientRect().top); }
      res.head = Math.round(stage.querySelector(".bedside-head").getBoundingClientRect().height);
      res.top = exitTop();
      stage.scrollTop = 400; res.at400 = exitTop();
      stage.scrollTop = 1400; res.at1400 = exitTop();
      res.badge = (stage.querySelector(".bed-badge") || {}).textContent;
      return res;
    });
    ok(!r.errs.length, "bedside probe: no exceptions", r.errs.join(" | "));
    ok(r.top === r.at400 && r.top === r.at1400,
       "the way back to the unit does not scroll away", r.top + " / " + r.at400 + " / " + r.at1400);
    ok(/bed \d/.test(r.badge || ""), "the bed you are at is named in the header", r.badge);
  });


  suite("What the support panel says is what the baby is getting", async function () {
    /* Weaning a ventilated baby straight to room air used to leave the blender where it
       was, so the panel read "room air" while the baby breathed sixty percent oxygen -
       and the gentle-care domain then marked the player down for it. */
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var b = G.babies[0], res = {};
      G.paused = true;
      D.querySelectorAll(".pod-hit")[0].click();
      G.doAction(b, "intubate");
      b.support.fio2 = 0.60;
      D.querySelector('#segMode [data-mode="RA"]').click();
      res.mode = b.support.mode; res.fio2 = b.support.fio2;
      // and the other way out of a ventilator
      G.doAction(b, "intubate");
      b.support.fio2 = 0.55;
      D.querySelector('#segMode [data-mode="CPAP"]').click();
      res.cpapMode = b.support.mode; res.cpapPressure = b.support.cpap;
      res.lying = G.babies.filter(function (x) {
        return x.support.mode === "RA" && x.support.fio2 > 0.21;
      }).length;
      return res;
    });
    ok(!r.errs.length, "mode probe: no exceptions", r.errs.join(" | "));
    ok(r.mode === "RA" && r.fio2 === 0.21,
       "weaning a ventilated baby to room air actually turns the oxygen off", r.mode + " at " + Math.round(r.fio2 * 100) + "%");
    ok(r.cpapMode === "CPAP" && r.cpapPressure >= 4,
       "and extubating to CPAP arrives with a pressure set", r.cpapMode + " " + r.cpapPressure);
    ok(r.lying === 0, "no baby is ever labelled room air while getting oxygen", r.lying);
  });

  suite("A harmful action is never free", async function () {
    /* Ibuprofen was the only one that refused itself - which by this game's rule means
       nothing happened - and then scored the player for having done it anyway. */
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var b = G.babies[0], res = {};
      G.paused = true;
      D.querySelectorAll(".pod-hit")[0].click();
      b.h.pda = 0;                                   // no duct at all
      var gut0 = b.h.gutTol, m0 = G.min, s0 = G.score;
      G.doAction(b, "ibuprofen");
      res.gutHarm = +(gut0 - b.h.gutTol).toFixed(3);
      res.cost = G.min - m0;
      res.score = G.score - s0;
      // morphine: comfort bought with breathing, and stoppable
      b.h.pain = 0.8;
      G.doAction(b, "morphine");
      res.morphineOn = b.h.morphine;
      var drive0 = b.h.spontDrive;
      for (var i = 0; i < 12; i++) G.advance(5);
      res.level = +b.h.morphineLevel.toFixed(2);
      res.painFell = b.h.pain < 0.8;
      res.driveFell = b.h.spontDrive < drive0;
      G.doAction(b, "morphine");
      res.morphineOff = b.h.morphine;
      for (var j = 0; j < 6; j++) G.advance(5);
      res.clearing = b.h.morphineLevel < res.level;
      // and giving it to a settled baby is scored against you
      var b2 = G.babies[1], s2 = G.score;
      b2.h.pain = 0.05;
      G.doAction(b2, "morphine", { silent: true });
      res.sedatingSettledBaby = G.score - s2;
      return res;
    });
    ok(!r.errs.length, "harm probe: no exceptions", r.errs.join(" | "));
    ok(r.gutHarm > 0, "ibuprofen without a duct still does its harm to the gut", r.gutHarm);
    ok(r.cost === 5, "and costs its five minutes", r.cost);
    ok(r.score < 0, "and is scored against you", r.score);
    ok(r.morphineOn === true && r.morphineOff === false, "morphine can be started and stopped");
    ok(r.level > 0.5, "it builds up over an hour", r.level);
    ok(r.painFell, "it takes the pain away");
    ok(r.driveFell, "and the breathing drive with it");
    ok(r.clearing, "and it clears slowly once stopped");
    ok(r.sedatingSettledBaby < 0, "sedating a comfortable baby is scored against you", r.sedatingSettledBaby);
  });

  suite("Morphine is a decision you have to make in advance", async function () {
    /* The point of the whole drug: the same baby on the same settings comes off a tube
       badly while it is running and well once it has worn off, so "stop it before you
       extubate" is a plan rather than a click. */
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var b = G.babies[0];
      G.paused = true;
      /* Whether morphine actually costs you the extubation depends on how much drive the
         baby had to spare, which is right: a 32-weeker on caffeine tolerates it and comes
         off anyway. So the fixture is a baby immature enough for the decision to bite. */
      b.pma = 28.5; b.h.caffeine = false;
      b.h.pain = 0.8;
      G.doAction(b, "morphine", { silent: true });
      for (var i = 0; i < 14; i++) G.advance(5);          // let it build
      G.doAction(b, "intubate", { silent: true });
      b.h.co2 = 45; b.h.rds = 0.2; b.support.pip = 16; b.support.fio2 = 0.25;
      var s0 = G.score;
      G.doAction(b, "extubate", { silent: true });
      var on = { drive: b.h.spontDrive, said: G.logLines[0].m, scored: G.score - s0 };

      G.doAction(b, "intubate", { silent: true });
      b.h.morphine = false;
      for (var j = 0; j < 40; j++) G.advance(5);          // and let it clear
      b.h.co2 = 45; b.h.rds = 0.2; b.support.pip = 16; b.support.fio2 = 0.25;
      var s1 = G.score;
      G.doAction(b, "extubate", { silent: true });
      return { on: on, off: { level: b.h.morphineLevel, drive: b.h.spontDrive,
                              said: G.logLines[0].m, scored: G.score - s1 } };
    });
    ok(!r.errs.length, "extubation probe: no exceptions", r.errs.join(" | "));
    ok(r.on.drive < 0.75, "morphine takes a preterm baby's drive below the line", +r.on.drive.toFixed(2));
    ok(/struggling/.test(r.on.said || ""), "so extubating on it goes badly", r.on.said);
    ok(r.on.scored < 0, "and is scored against you", r.on.scored);
    ok(r.off.level < 0.05, "morphine clears if you stop it in time", +r.off.level.toFixed(2));
    ok(r.off.drive > 0.75, "and gives it back once it clears", +r.off.drive.toFixed(2));
    ok(/doing well/.test(r.off.said || ""), "so the same baby then comes off well", r.off.said);
    ok(r.off.scored === 0, "with nothing scored against you", r.off.scored);
  });

  suite("The end of the shift is not silent", async function () {
    var r = await shift({ seed: 137 }, async function (G, w, D) {
      runToEnd(G, D);
      await new Promise(function (res) { setTimeout(res, 250); });
      var live = D.getElementById("announcer");
      return { hasLive: !!live, said: live ? live.textContent : "",
               focused: D.activeElement && D.activeElement.className };
    });
    ok(r.hasLive, "the live region survives the report replacing the page");
    ok(/handover to the day team/i.test(r.said || ""), "and says the shift is over", r.said.slice(0, 60));
    ok(/grade/.test(r.focused || ""), "focus lands on the verdict", r.focused);
  });


  suite("The game agrees with itself about the medicine", async function () {
    /* Every check here is a contradiction that was actually shipped. The worst: a nurse
       raised "she is jittery" under a glucose of 42 while the examination called a baby
       jittery only under 40, so between 40 and 42 a colleague told you something was wrong
       and the baby said otherwise - in a game whose whole premise is that the monitor may
       lie and the baby never does. */
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var CL = w.Clinical, S = w.Sim, res = { CL: {
        glucoseLow: CL.glucose.low, tempNormalLow: CL.temp.normalLow,
        satTargetLow: CL.sat.targetLow, satTargetHigh: CL.sat.targetHigh,
        hrLow: CL.hr.normalLow, hrHigh: CL.hr.normalHigh
      } };
      G.paused = true;
      var b = G.babies[0];

      // glucose: the colleague who comes to tell you, and the baby you then examine
      function jitteryAt(v) {
        b.h.glucose = v; b.h.sepsis = 0; b.h.pain = 0;
        var nurse = EVcond(w, "jittery", G, b);
        var exam = S.examine(b).some(function (f) { return /jittery/.test(f.v); });
        return { nurse: nurse, exam: exam };
      }
      res.justUnder = jitteryAt(CL.glucose.low - 1);
      res.justOver = jitteryAt(CL.glucose.low + 1);

      // blood pressure: the number turning amber on screen, and the monitor alarming
      b.h.map = b.ga + CL.map.flagAt - 1; b.mon.map = b.h.map;
      res.mapFlaggedBelowRule = b.mon.map < b.ga + CL.map.flagAt;
      res.mapAlarms = S.alarmState(b).reasons.some(function (x) { return /MAP/.test(x); });

      // ventilator pressure: the therapist's worry and the injury the lung takes
      b.support.mode = "VENT"; b.support.pip = CL.pipLimit(b.ga) + 1; b.support.peep = 5; b.support.rate = 40;
      res.pipConcern = EVcond(w, "highpip", G, b);
      var bpd0 = b.h.bpd;
      for (var i = 0; i < 6; i++) S.step(b, 5, G);
      res.pipDamages = b.h.bpd > bpd0;

      // what the tooltips tell the player, against what the table actually uses
      res.satText = w.document ? "" : "";
      return res;
    });
    ok(!r.errs.length, "consistency probe: no exceptions", r.errs.join(" | "));
    ok(r.justUnder.nurse && r.justUnder.exam,
       "just under the glucose threshold, the nurse AND the examination both say jittery",
       "nurse " + r.justUnder.nurse + ", exam " + r.justUnder.exam);
    ok(!r.justOver.nurse && !r.justOver.exam,
       "just over it, neither does", "nurse " + r.justOver.nurse + ", exam " + r.justOver.exam);
    ok(r.mapFlaggedBelowRule && r.mapAlarms,
       "a mean pressure below the gestation is flagged on screen AND alarms",
       "flagged " + r.mapFlaggedBelowRule + ", alarm " + r.mapAlarms);
    ok(r.pipConcern && r.pipDamages,
       "a peak pressure over the limit both worries the therapist and injures the lung",
       "concern " + r.pipConcern + ", damage " + r.pipDamages);
  });

  suite("What the game tells the player is what the game uses", async function () {
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var CL = w.Clinical;
      G.paused = true;
      D.querySelectorAll(".pod-hit")[0].click();
      var text = D.getElementById("stage").innerHTML;
      // the tooltips quote numbers at the player; pull them back out
      function tipFor(re) { var m = text.match(re); return m ? m[1] : null; }
      return {
        satSaid: tipFor(/aim is (\d+) to \d+, not 100/),
        satSaidHigh: tipFor(/aim is \d+ to (\d+), not 100/),
        tempSaid: tipFor(/should sit between ([\d.]+) and [\d.]+/),
        hrSaid: tipFor(/normally run (\d+) to \d+/),
        CL: { satLow: CL.sat.targetLow, satHigh: CL.sat.targetHigh,
              tempLow: CL.temp.normalLow, hrLow: CL.hr.normalLow }
      };
    });
    ok(+r.satSaid === r.CL.satLow && +r.satSaidHigh === r.CL.satHigh,
       "the saturation target it states is the one it uses",
       r.satSaid + "-" + r.satSaidHigh + " vs " + r.CL.satLow + "-" + r.CL.satHigh);
    ok(+r.tempSaid === r.CL.tempLow, "so is the temperature", r.tempSaid + " vs " + r.CL.tempLow);
    ok(+r.hrSaid === r.CL.hrLow, "so is the heart rate", r.hrSaid + " vs " + r.CL.hrLow);
  });


  suite("The report cannot praise a shift that left a baby unfinished", async function () {
    /* Straight from a playtest. Every domain STRONG, "Nothing to pick at, the unit was in
       good hands all night" - printed above a cot card reading "The blood sugar was still 34
       at handover". The report computed what was left open and then scored the shift without
       looking at it. */
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      // answer everything, take every conversation, be gentle - and miss one baby's sugar
      var guard = 0;
      while (G.running && G.min < 700 && guard++ < 5000) {
        if (clearDialog(G, D)) continue;
        G.concerns.filter(function (c) { return !c.done; })
                  .forEach(function (c) { c.done = true; c.resolvedAt = G.min; G.metrics.concernsAnswered++; });
        G.trust = 100; G.metrics.talksHad = G.metrics.talksOffered;
        G.metrics.draws = 1; G.metrics.calledForHelp = 1;
        G.babies.forEach(function (b) {
          if (b.died) return;
          b.h.o2Exposure = 0; b.h.volutrauma = 0; b.h.bpd = 0;
          // keep everything else right, so the sugar is the ONLY thing left
          if (b.h.sepsis > 0.2) b.h.abx = true;
          if (b.h.coreTemp < 36.4) b.h.coreTemp = 36.9;
          if (b.h.co2 > 60) b.h.co2 = 45;
          if (b.h.hgb < 9) b.h.hgb = 12;
          if (b.h.necGrade > 0) b.h.necGrade = 0;
        });
        G.advance(10);
      }
      /* Take the sugar away and leave it away. Setting a low number is not enough - the
         physiology pulls it back to whatever the drip is delivering, which is the correct
         behaviour and made the first version of this test pass for the wrong reason. */
      var missed = G.babies.filter(function (b) { return !b.died; })[0];
      missed.h.dexPct = 0; missed.h.ivRate = 0; missed.h.feedsMlKgD = 0;
      missed.h.glycogen = 0.05; missed.h.glucose = 34;
      G.advance(30);
      var txt = D.body.innerText;
      return { txt: txt, name: missed.name, endGlucose: Math.round(missed.h.glucose),
               grade: (txt.match(/handover to the day team\s*\n\s*(.+)/) || [])[1] };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.endGlucose < 40, "the baby really was left hypoglycaemic", r.endGlucose);
    ok(!/Outstanding|Strong shift/.test(r.grade || ""),
       "it is not Outstanding or a Strong shift", r.grade);
    ok(!/Nothing to pick at/.test(r.txt), "the verdict does not say there is nothing to pick at");
    ok(r.txt.indexOf("What you are handing over") >= 0,
       "there is a handover section, above the scoring");
    ok(new RegExp("handing " + r.name).test(r.txt) || r.txt.indexOf(r.name) >= 0,
       "and it names the baby", r.name);
    ok(/blood sugar was still \d+ at handover/.test(r.txt),
       "and says exactly what is wrong with them",
       (r.txt.match(/blood sugar was still \d+ at handover/) || [""])[0]);
    ok(!/genuinely well-run shift, with nothing left hanging/.test(r.txt),
       "and does not then advise that nothing was left hanging");
  });

  suite("A shift that really did finish is still allowed to say so", async function () {
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var guard = 0;
      while (G.running && G.min < 700 && guard++ < 5000) {
        if (clearDialog(G, D)) continue;
        settleEveryConcern(G);
        G.trust = 100; G.metrics.talksHad = G.metrics.talksOffered;
        G.metrics.draws = 1; G.metrics.calledForHelp = 1;
        G.babies.forEach(function (b) {
          if (b.died) return;
          b.h.o2Exposure = 0; b.h.volutrauma = 0; b.h.bpd = 0; b.h.criticalMinutes = 0;
          if (b.h.sepsis > 0.2 || (b.puzzle && /sepsis|nec|lateonset/.test(b.puzzle.id))) b.h.abx = true;
          if (b.h.glucose < 55) { b.h.glucose = 70; b.h.hypoDrive = 0; b.h.hypoDriveMax = 0; }
          if (b.h.coreTemp < 36.5) b.h.coreTemp = 36.9;
          if (b.h.co2 > 60) b.h.co2 = 45;
          // and the other end of it: a ventilator wound up too far is a finding too
          if (b.h.co2 < 35) b.h.co2 = 42;
          b.h.hypocapMinutes = 0; b.h.ettDisplaced = false;
          if (b.h.hgb < 10) b.h.hgb = 12;
          if (b.h.necGrade > 0) b.h.necGrade = 0;
          if (b.h.bili > b.h.biliThreshold) b.h.bili = b.h.biliThreshold - 2;
          b.h.coldMinutes = 0; b.h.biliDangerMinutes = 0;
          // somebody's parent may have left a porthole open; an attentive shift closes it,
          // and correcting the temperature without it just lets the room take it away again
          b.support.isoOpen = false;
          /* A shift that really did finish is one where somebody LOOKED. The report now asks
             whether the hidden diagnosis was ever found and ever acted on, so a fixture that
             silently corrects the physiology without ever sending a test is not the shift
             this suite claims to be measuring. Investigate everything, then fix everything. */
          ["glucose", "gas", "cbc", "bili", "culture", "cxr", "axr", "hus", "echo"].forEach(function (k) {
            if (!b.labs[k]) b.labs[k] = { at: G.min };
          });
          b.findings = b.findings || { at: G.min };
          b.h.helpAsked = true;
          b.h.ptx = false; b.h.pphn = 0; b.h.pda = Math.min(b.h.pda, 0.2);
          b.h.rds = Math.min(b.h.rds, 0.3); b.h.surfactant = Math.max(b.h.surfactant, 0.78);
          if (b.h.gir < 5) b.h.gir = 6;
          b.h.residuals = 0; b.h.gutTol = Math.max(b.h.gutTol, 0.7); b.h.feedsMlKgD = 0;
          b.h.pdaTreat = Math.max(b.h.pdaTreat || 0, 1);
          b.h.photo = true; b.h.bili = Math.min(b.h.bili, b.h.biliThreshold - 2);
          b.h.aspiration = Math.min(b.h.aspiration, 0.2);
          if (b.support.fio2 > 0.35) b.support.fio2 = 0.25;
          b.h.fatigue = Math.min(b.h.fatigue, 0.2);
        });
        G.advance(10);
      }
      /* The tail has to keep answering too. It used to just run the clock out, which was
         harmless while a neglected unit raised a dozen concerns and two stragglers barely
         moved the ratio - but this fixture keeps every baby well, so a healthy unit raises
         only about three all night and two unanswered in the last half hour reads as a shift
         that ignored two thirds of its team. */
      /* Small steps, and settle before every one. The tail used to run out the last twenty
         minutes in a single advance(30), and every concern raised inside that one call was
         stranded - which on a unit this well is two out of three of them, and reads as a
         shift that ignored its team. */
      while (G.running && guard++ < 6000) {
        if (clearDialog(G, D)) continue;
        settleEveryConcern(G);
        G.advance(5);
      }
      var txt = D.body.innerText;
      var stillOpen = (txt.split("What you are handing over")[1] || "").split("How the night went")[0];
      return { txt: txt, stillOpen: stillOpen.replace(/\s+/g, " ").slice(0, 120),
               unfixed: G.babies.filter(function (b) {
                 var dx = b.puzzle && b.puzzle.dx;
                 if (!dx || b.puzzle.benign || b.died) return false;
                 try { return !dx.found(b) || !dx.fixed(b); } catch (e) { return true; }
               }).map(function (b) { return b.name + " (" + b.puzzle.id + ")"; }),
               /* When this one fails it is almost never the handover - it is some other
                  domain dragging the headline down - so the failure has to say which. */
               domains: (txt.replace(/\s+/g, " ")
                            .match(/(Answering your team|The state you handed over|Clinical judgement|Gentle care|The families) (STRONG|FAIR|SHAKY|POOR)[^A-Z]{0,60}/g) || [])
                            .join(" \u00B7 "),
               grade: (txt.match(/handover to the day team\s*\n\s*(.+)/) || [])[1] };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    /* Named directly, so that a puzzle added later without a matching line in the fixture
       says which one it was, rather than failing as an unexplained handover section. */
    ok(!r.unfixed.length, "every diagnosis in it was found and dealt with", r.unfixed.join(", "));
    ok(r.txt.indexOf("What you are handing over") < 0,
       "no handover section when there is nothing to hand over", r.stillOpen);
    ok(/Outstanding|Strong shift|Solid/.test(r.grade || ""),
       "a genuinely finished shift still grades well", r.grade + " \u2014 " + r.domains);
    ok(!/It was never worked out/.test(r.txt),
       "and no cot claims a problem was never worked out when it was");
  });

  suite("Conversations do not inflate clinical judgement", async function () {
    /* A playtest rated the judgement STRONG on "158 points of good calls against 5 of poor
       ones". Thirteen conversations at five to seven points each had buried five points of
       bad clinical calls under a hundred and fifty good ones - and were being counted twice,
       once here and again as family trust. */
    var r = await shift({ seed: 137 }, function (G, w, D) {
      runToEnd(G, D);
      var txt = D.body.innerText;
      return {
        allTagged: G.scoreItems.every(function (x) { return !!x.kind; }),
        kinds: Object.keys(G.scoreItems.reduce(function (o, x) { o[x.kind] = 1; return o; }, {})),
        judgementLine: (txt.match(/Clinical judgement[\s\S]{0,110}/) || [""])[0].replace(/\s+/g, " "),
        cutOff: (txt.match(/[a-z]{1,2} \([A-Z][a-z]+\)/) || [])[0] || null
      };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.allTagged, "every scored decision records what kind it was", r.kinds.join(", "));
    ok(/good clinical calls against/.test(r.judgementLine),
       "the judgement domain counts decisions, not points", r.judgementLine.slice(0, 70));
    ok(!r.cutOff, "no decision label is cut off mid-word", r.cutOff);

    // the call site itself, because behaviour cannot reach it without a conversation
    var src = await fetch("../js/game.js").then(function (x) { return x.text(); });
    ok(/addScore\(o\.score, shortLabel\(label\)[^;]*"family"\)/.test(src),
       "a conversation's score is tagged as family where it is recorded");
    var rep = await fetch("../js/report.js").then(function (x) { return x.text(); });
    ok(/x\.kind === "family"\) return;/.test(rep),
       "and the judgement domain skips it");
  });


  suite("Leaving the delivery room is a decision you can actually make", async function () {
    /* Three things a playtest hit at once. The panel said "Decide where they go" and offered
       one button. Clicking it did nothing. And the page kept dragging itself back down to
       that button. All one root cause: the whole panel - the button included - was rebuilt
       from innerHTML five times a second, so a real mousedown and mouseup landed on
       different elements and no click ever fired, while keepFocus re-focused the new button
       each time and scrolled it into view.

       Everything timing-sensitive happens INSIDE the play function: the harness disposes of
       the iframe as soon as it returns, and a check that runs afterwards is querying a
       detached document and passing for free. */
    function room(scId, then) {
      return shift({ seed: 99 }, async function (G, w, D) {
        G.pendingDelivery = w.Deliveries.SCENARIOS.filter(function (x) { return x.id === scId; })[0];
        G.summonDelivery(); G.enterDelivery();
        var d = G.delivery;
        (d.sc.wants || []).forEach(function (id) { G.doDelivery(id); });
        w.Deliveries.advance(d, d.sc, Math.max(0, 150 - d.sec));
        G.doDelivery("hr");
        var unit = D.querySelector('[data-leave="unit"]'), mother = D.querySelector('[data-leave="mother"]');
        var res = { options: D.querySelectorAll("[data-leave]").length,
                    unitOn: !!(unit && !unit.disabled), motherOn: !!(mother && !mother.disabled),
                    why: (D.getElementById("delWhy") || {}).textContent,
                    gate: (D.getElementById("delGate") || {}).textContent,
                    checks: D.getElementById("delChecks").innerText.replace(/\s+/g, " ") };
        if (then) await then(res, G, w, D, unit, mother);
        return res;
      });
    }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    var v = await room("vigorous", async function (res, G, w, D, unit, mother) {
      // still the same element after several clock frames?
      await wait(1100);
      res.sameNode = unit === D.querySelector('[data-leave="unit"]');
      // and a slow, human-paced press that spans several frames
      var btn = D.querySelector('[data-leave="mother"]');
      ["pointerdown", "mousedown"].forEach(function (t) { btn.dispatchEvent(new w.MouseEvent(t, { bubbles: true })); });
      await wait(600);
      ["pointerup", "mouseup", "click"].forEach(function (t) { btn.dispatchEvent(new w.MouseEvent(t, { bubbles: true })); });
      await wait(250);
      res.landed = G.delivery.state === "done" && G.view.mode === "ward";
      res.nobodyCameUp = !G.babies.filter(function (b) { return b.bed === 6; })[0];
    });
    ok(!v.errs.length, "no exceptions", v.errs.join(" | "));
    ok(v.options === 2, "there are two ways out of the room, not one", v.options);
    ok(/Where do they go/.test(v.gate || ""), "and the panel asks which", v.gate);
    ok(v.unitOn && v.motherOn, "for a well term baby both are open",
       "unit " + v.unitOn + ", mother " + v.motherOn);
    ok(v.sameNode, "the buttons are not rebuilt under the player's hands");
    ok(v.landed, "a click held across half a second still registers");
    ok(v.nobodyCameUp, "and leaving her with her mother means nobody comes up");

    var p = await room("preterm29");
    ok(p.unitOn && !p.motherOn, "a 29-weeker can only go to the unit",
       "unit " + p.unitOn + ", mother " + p.motherOn);
    ok(/29 weeks/.test(p.why || ""), "and the reason names the gestation", p.why);

    var m = await room("meconium");
    ok(!/neither/.test(m.checks),
       "a baby whose breathing is coming back is not described as having none", m.checks);
  });


  suite("Everyone in the who-needs-you list takes you to what they want", async function () {
    /* Reported from playtesting: clicking somebody who needed you took you to a cot with
       nothing to talk about. Two attributes were named the same thing and meant different
       things - a ward cot carries data-bed="<index into G.babies>", and a conversation row
       in the side panel carried data-bed="<bed number>" - and the click handler read the
       wrong one first. A parent waiting at bed 1 took you to bed 2 and opened nothing. On
       the LAST cot in the census the bed number indexed past the end of the array and the
       click threw outright, which is the commonest case of all. */
    function withTalk(bedPicker) {
      return shift({ seed: 4242 }, async function (G, w, D) {
        var guard = 0;
        while (!G.talks.filter(function (t) { return t.bed != null; }).length && guard++ < 500) {
          if (clearDialog(G, D)) continue;
          G.advance(5);
        }
        G.paused = true;
        var t = G.talks.filter(function (x) { return x.bed != null; })[0];
        if (!t) return { skip: true };
        t.bed = bedPicker(G);
        // the side panel is only rebuilt by a full render
        D.querySelector(".pod-hit").click();
        D.getElementById("btnBack").click();
        await new Promise(function (r) { setTimeout(r, 250); });
        var row = D.querySelector('#side [data-talk]');
        if (!row) return { skip: true };
        var res = { wantedBed: t.bed, census: G.babies.length,
                    hasCollidingAttribute: row.hasAttribute("data-bed") };
        row.click();
        await new Promise(function (r) { setTimeout(r, 300); });
        res.landedOn = (G.view.bed != null && G.babies[G.view.bed]) ? G.babies[G.view.bed].bed : null;
        res.opened = G.dialogOpen;
        res.speaker = (D.querySelector(".dlg-head .who") || {}).textContent;
        return res;
      });
    }

    var first = await withTalk(function (G) { return G.babies[0].bed; });
    ok(!first.errs.length, "no exceptions", first.errs.join(" | "));
    ok(!first.hasCollidingAttribute, "a conversation row does not carry the cot attribute");
    ok(first.landedOn === first.wantedBed,
       "clicking a parent takes you to THEIR cot", "wanted " + first.wantedBed + ", got " + first.landedOn);
    ok(first.opened, "and opens the conversation, rather than leaving you at a quiet cot");

    // the case that used to run off the end of the census
    var last = await withTalk(function (G) { return G.babies[G.babies.length - 1].bed; });
    ok(!last.errs.length, "a conversation on the last cot does not throw", last.errs.join(" | "));
    ok(last.landedOn === last.wantedBed,
       "and still lands on the right one", "bed " + last.wantedBed + " of " + last.census + ", got " + last.landedOn);
    ok(last.opened, "and still opens");
  });

  suite("The team strip says who these people are", async function () {
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      var guard = 0;
      while (!G.concerns.filter(function (c) { return !c.done; }).length && guard++ < 400) {
        if (clearDialog(G, D)) continue;
        G.advance(5);
      }
      G.paused = true;
      D.querySelector(".pod-hit").click();
      D.getElementById("btnBack").click();
      return [].slice.call(D.querySelectorAll(".tm")).map(function (n) {
        return { tag: n.tagName, dot: !!n.querySelector(".dot"),
                 tip: n.getAttribute("data-tip") || "", actionable: n.hasAttribute("data-go") || n.hasAttribute("data-talk") };
      });
    });
    var team = r[0] ? r : [];
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(team.length === 4, "four colleagues on the strip", team.length);
    ok(team.every(function (m) { return m.tip.length > 30; }),
       "each one says who they are and what they do on hover");
    ok(team.every(function (m) { return !/[a-z]\s+[A-Z][a-z]+ from them/.test(m.tip); }),
       "and the sentences do not run into each other",
       (team.filter(function (m) { return /[a-z]\s+[A-Z][a-z]+ from them/.test(m.tip); })[0] || {}).tip);
    var busy = team.filter(function (m) { return m.dot; });
    ok(busy.every(function (m) { return /amber dot/.test(m.tip); }),
       "the pulsing dot explains itself", busy.length + " with a dot");
    ok(busy.every(function (m) { return m.tag === "BUTTON" && m.actionable; }),
       "and somebody who wants you can be clicked to get to them");
    ok(team.filter(function (m) { return !m.dot; }).every(function (m) { return m.tag !== "BUTTON"; }),
       "while somebody who does not is not a button");
  });


  /* ================================================================== the diagnosis
     The game revealed a hidden diagnosis at seven in the morning without ever having
     asked whether the player found it. A whole night could pass with no test sent at a
     cot and the shift still scored clean. These are the checks for the answer. */
  suite("A shift that never asked what was wrong is told so", async function () {
    var r = await shift({ seed: 7788, difficulty: "resident" }, function (G, w, D) {
      // never open a bed, never send a test - just let the night happen
      runToEnd(G, D);
      var txt = D.body.innerText;
      return { txt: txt,
               /* A crisis dialog answered badly can still leave a test behind, so the claim
                  is the one the rest of the suite rests on: at least one real diagnosis went
                  the whole night without the test that would have shown it. */
               nolab: G.babies.some(function (b) {
                 var dx = b.puzzle && b.puzzle.dx;
                 if (!dx || b.puzzle.benign) return false;
                 try { return !dx.found(b); } catch (e) { return false; }
               }),
               grade: (txt.match(/handover to the day team\s*\n\s*(.+)/) || [])[1] };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.nolab, "a real diagnosis really did go untested all night");
    ok(/nobody ever established what was actually wrong/i.test(r.txt),
       "the handover says nobody worked out what was wrong");
    ok(/without a test that would have shown what was wrong/i.test(r.txt),
       "and a tip names the babies and the cost of guessing");
    ok(/What you had to go on:/.test(r.txt),
       "and every cot card says what there was to go on");
    ok(/Nothing you sent would have shown this/.test(r.txt),
       "which, on this shift, is nothing");
    ok(!/Outstanding|Strong shift/.test(r.grade || ""),
       "a shift like that is not Outstanding", r.grade);
  });

  suite("Found and then ignored reads differently from never found", async function () {
    /* The two lessons this game is actually about are "you never looked" and "you looked
       and then did nothing", and before this they read as the same card. */
    var r = await shift({ seed: 4242 }, function (G, w, D) {
      // every baby gets every test, and nobody gets treated
      G.babies.forEach(function (b) {
        ["glucose", "gas", "cbc", "bili", "culture", "cxr", "axr", "hus", "echo"].forEach(function (k) {
          b.labs[k] = { at: G.min };
        });
        b.findings = b.findings || { at: G.min };
      });
      runToEnd(G, D);
      var real = G.babies.filter(function (x) { return x.puzzle && x.puzzle.dx && !x.puzzle.benign; });
      return { txt: D.body.innerText,
               anyReal: real.length,
               allFound: real.every(function (b) { try { return !!b.puzzle.dx.found(b); } catch (e) { return false; } }),
               anyUnfixed: real.some(function (b) { try { return !b.puzzle.dx.fixed(b); } catch (e) { return false; } }) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.anyReal > 0, "the shift had a real diagnosis in it", r.anyReal);
    ok(r.allFound, "sending the tests counts as finding it");
    ok(!/Nothing you sent would have shown this/.test(r.txt),
       "so no cot is told nothing was sent");
    ok(!/without a test that would have shown what was wrong/.test(r.txt),
       "and the never-looked tip does not appear");
    ok(!r.anyUnfixed || /left alone|plan never changed/.test(r.txt),
       "but finding it and doing nothing is said out loud");
  });

  /* ================================================================== calling for help */
  suite("You can call the attending from a bedside", async function () {
    var r = await shift({ seed: 909 }, function (G, w, D) {
      var b = G.babies[0], before = G.min, msg = "", score0 = G.scoreItems.length;
      G.pause = false;
      var res = w.NG.ACTIONS.help.run(b, b.h);
      msg = res && res.msg || "";
      var second = w.NG.ACTIONS.help.run(b, b.h);
      return { msg: msg, second: second && second.msg, helpAsked: b.h.helpAsked,
               called: G.metrics.calledForHelp,
               scored: G.scoreItems.slice(score0).length,
               cost: w.NG.ACTIONS.help.cost, before: before };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.helpAsked, "it records that help was asked for");
    ok(r.called === 1, "and counts once however often you ring", r.called);
    ok(r.scored === 1, "and scores once", r.scored);
    ok(r.cost === 10, "and costs ten minutes", r.cost);
    ok(/Halvorsen/.test(r.msg) && r.msg.length > 60, "she says something worth ten minutes", r.msg.slice(0, 70));
    ok(r.second && r.second !== "", "and she will take a second call", (r.second || "").slice(0, 40));
  });

  suite("The attending points at the problem without naming it", async function () {
    var r = await shift({ seed: 55 }, function (G, w, D) {
      var b = G.babies[0], said = {};
      function steer(mut) {
        var snap = JSON.stringify(b.h);
        mut(b.h);
        var m = w.NG.ACTIONS.help.run(b, b.h).msg;
        b.h = JSON.parse(snap);
        return m;
      }
      said.pphn = steer(function (h) { h.pphn = 0.4; });
      said.rds = steer(function (h) { h.pphn = 0; h.ptx = false; h.rds = 1.4; h.surfactant = 0.4; });
      said.sepsis = steer(function (h) { h.pphn = 0; h.ptx = false; h.rds = 0; h.sepsis = 0.5; h.abx = false; });
      said.quiet = steer(function (h) {
        h.pphn = 0; h.ptx = false; h.rds = 0; h.sepsis = 0; h.necGrade = 0; h.residuals = 0;
        h.glucose = 70; h.pda = 0; h.bili = 2; h.biliThreshold = 14; h.hgb = 14; h.coreTemp = 37;
      });
      return said;
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(/blood vessels/.test(r.pphn) && !/pulmonary hypertension/i.test(r.pphn),
       "for clamped lung vessels she points, she does not diagnose", r.pphn.slice(0, 60));
    ok(/surfactant/.test(r.rds), "for stiff lungs she names the treatment", r.rds.slice(0, 60));
    ok(/[Cc]ulture/.test(r.sepsis), "for infection she says culture first", r.sepsis.slice(0, 60));
    ok(/[Nn]othing jumps out/.test(r.quiet),
       "and on a baby with nothing wrong she says so, so it is not a reveal button", r.quiet.slice(0, 50));
  });

  /* ================================================================== the new concerns */
  suite("Pulmonary hypertension is something the unit can see", async function () {
    var r = await shift({ seed: 31 }, function (G, w, D) {
      var b = G.babies[0], EV = w.Events;
      var def = EV.CONCERNS.filter(function (c) { return c.id === "swinging"; })[0];
      if (!def) return { missing: true };
      b.h.pphn = 0.45; b.h.pain = 0.8; b.support.fio2 = 0.5;
      G.advance(10);
      var fires = def.cond(G, b), firedAt = b.mon.spo2;
      var calmSat, hotSat;
      b.h.pain = 0.05; G.advance(5); calmSat = b.mon.trueSat;
      b.h.pain = 0.85; G.advance(5); hotSat = b.mon.trueSat;
      /* And protected care actually relaxes the vessels over hours. Note what this fixture
         may NOT do: set b.h.swaddled. Every baby in the unit is swaddled from the moment
         they are created, so that flag can never say whether anybody DECIDED to keep this
         one undisturbed - which is the entire treatment. It has to be the action. */
      var p0 = b.h.pphn;
      b.h.pain = 0.05; b.h.handling = 0;
      for (var i = 0; i < 60; i++) {
        if (i % 18 === 0) w.NG.ACTIONS.comfort.run(b, b.h);   // it expires; you come back
        G.advance(10);
      }
      var p1 = b.h.pphn;
      /* the control arm: an identical stretch with nobody doing anything */
      var c = G.babies[1] || b;
      c.h.pphn = p0; c.h.pain = 0.05; c.h.handling = 0; c.h.protectedMin = 0;
      for (var j = 0; j < 60; j++) G.advance(10);
      var leftAlone = c.h.pphn;
      return { fires: fires, firedAt: firedAt, calmSat: calmSat, hotSat: hotSat, p0: p0, p1: p1,
               leftAlone: leftAlone,
               say: def.say(G, b), accept: Object.keys(def.accept) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "the concern exists");
    ok(r.fires, "it fires on a swinging baby who is up on oxygen", "sat " + Math.round(r.firedAt || 0));
    ok(r.calmSat > r.hotSat + 2, "the saturation really does swing with handling",
       "calm " + Math.round(r.calmSat) + " vs upset " + Math.round(r.hotSat));
    ok(r.p1 < r.p0 - 0.05, "and protected care relaxes the vessels over hours",
       r.p0.toFixed(2) + " -> " + r.p1.toFixed(2));
    ok(r.leftAlone >= r.p0 - 0.02,
       "while a baby nobody protects does not improve on their own", r.leftAlone.toFixed(2));
    ok(r.accept.indexOf("echo") >= 0 && r.accept.indexOf("comfort") >= 0 && r.accept.indexOf("help") >= 0,
       "and it accepts the three things that are actually right", r.accept.join(","));
    ok(!/hypertension/i.test(r.say), "and the nurse describes, she does not diagnose");
  });

  suite("A creeping oxygen need is raised before it is a crisis", async function () {
    var r = await shift({ seed: 77 }, function (G, w, D) {
      var b = G.babies[0], EV = w.Events;
      var def = EV.CONCERNS.filter(function (c) { return c.id === "risingoxygen"; })[0];
      var late = EV.CONCERNS.filter(function (c) { return c.id === "risingwork"; })[0];
      if (!def) return { missing: true };
      b.support.mode = "CPAP"; b.support.fio2 = 0.25; b.h.rds = 1.3; b.h.surfactant = 0.4;
      G.advance(10);                                   // let the floor settle at 0.25
      b.support.fio2 = 0.36;
      G.advance(10);
      return { creep: b.h.o2Creep, early: def.cond(G, b),
               fio2: b.support.fio2, lateName: late.id,
               wob: w.Sim.workOfBreathing(b) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "the concern exists");
    ok(r.creep > 0.08, "the sim measures the creep against this baby's own best", r.creep);
    ok(r.early, "it fires at 36 percent", "wob " + (r.wob || 0).toFixed(2));
    ok(r.fio2 < 0.45,
       "while the oxygen is still nowhere near where it used to have to be", r.fio2);
  });

  suite("The oxygen floor forgives a baby who genuinely recovers", async function () {
    var r = await shift({ seed: 78 }, function (G, w, D) {
      /* The floor only forgives a baby who is actually WELL - drifting it up regardless also
         forgave one pinned at the nurse's ceiling and still under target, which silenced the
         concern on the baby who needed it most. So this fixture has to keep the baby's
         saturation up, and hold the nurse off the dial while it does. */
      /* A WELL baby held on more oxygen than they need. Forging b.mon.trueSat does not work
         - updateMonitor writes it every tick - so the baby has to actually be well, and the
         player has to actually be holding the dial. Note the budget: a shift is 720 game
         minutes and G.advance does nothing once it is over, which will pass any check that
         is really asking "did nothing change". */
      var b = G.babies[0];
      b.support.mode = "CPAP"; b.support.cpap = 6;
      b.h.rds = 0; b.h.surfactant = 1; b.h.aspiration = 0; b.h.pphn = 0; b.h.apneaTend = 0;
      b.support.fio2 = 0.21; G.advance(10);
      b.support.fio2 = 0.45; G.advance(10);
      var high = b.h.o2Creep;
      for (var i = 0; i < 60; i++) {                   // 600 minutes, inside one shift
        b.support.fio2 = 0.45; b.h.o2HandsOff = 30;    // the player is holding it here
        G.advance(10);
      }
      return { high: high, later: b.h.o2Creep, floor: b.h.fio2Floor, ran: G.min };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.high > 0.2, "the creep is large the moment the oxygen goes up", r.high);
    ok(r.later < r.high, "and the floor drifts up so it is not flagged for ever",
       r.high.toFixed(2) + " -> " + r.later.toFixed(2));
    ok(r.floor <= 0.45, "without ever rising above where the baby actually is", r.floor);
  });

  suite("The lungs are part of what you hand over", async function () {
    var r = await shift({ seed: 606 }, function (G, w, D) {
      var b = G.babies[0], guard = 0;
      // runToEnd advances a whole shift per step, so walk it by hand to just before seven
      while (G.running && G.min < 690 && guard++ < 400) {
        if (clearDialog(G, D)) continue;
        G.advance(20);
      }
      b.support.fio2 = 0.6; b.h.pphn = 0.4; b.h.rds = 1.5; b.h.surfactant = 0.3;
      runToEnd(G, D);
      var txt = D.body.innerText;
      return { txt: txt, grade: (txt.match(/handover to the day team\s*\n\s*(.+)/) || [])[1] };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(/percent oxygen at handover/.test(r.txt), "60 percent at seven in the morning is a problem");
    ok(/lung blood vessels were still clamped/.test(r.txt), "so are clamped lung vessels");
    ok(/short of surfactant and none was ever given/.test(r.txt), "so is surfactant never given");
    ok(!/Outstanding|Strong shift/.test(r.grade || ""), "and none of that is an outstanding shift", r.grade);
  });


  /* ================================================================ reference ranges
     "WBC 6.2 / Hgb 9.4 / CRP 14" told a beginner only that numbers exist. */
  suite("A blood result says what normal would have been", async function () {
    var r = await shift({ seed: 2024 }, function (G, w, D) {
      var b = G.babies[0], CL = w.Clinical;
      // a count and a gas with one analyte clearly out of range each
      b.h.wbc = 12; b.h.hgb = 7.2; b.h.crp = 2;
      b.h.co2 = 70; b.h.baseDeficit = 2;   // a high CO2 drags the pH down too, as it should
      b.pending.push({ kind: "cbc", due: G.min });
      b.pending.push({ kind: "gas", due: G.min });
      G.advance(20);
      var cbc = b.labs.cbc, gas = b.labs.gas;
      // render the bedside so the parts actually go through the renderer
      var cot = D.querySelector(".pod-hit") || D.querySelector(".cot") || D.querySelector("[data-bed]");
      if (cot) cot.click();
      var labsHtml = (D.getElementById("labs") || {}).innerHTML || "";
      return { cbcParts: cbc && cbc.parts && cbc.parts.map(function (p) {
                 return p.label + "|" + p.bad + "|" + p.tip.slice(0, 24); }),
               gasParts: gas && gas.parts && gas.parts.map(function (p) { return p.label + "|" + p.bad; }),
               labsHtml: labsHtml,
               refKeys: Object.keys(CL.ref),
               narrative: !!(b.labs.cxr && b.labs.cxr.parts) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.cbcParts && r.cbcParts.length === 3, "a blood count comes back in three parts", (r.cbcParts || []).join(" "));
    ok(/^WBC\|false/.test(r.cbcParts[0]), "a normal white count is not marked", r.cbcParts[0]);
    ok(/^Hgb\|true/.test(r.cbcParts[1]), "a haemoglobin of 7.2 is", r.cbcParts[1]);
    ok(/^CRP\|false/.test(r.cbcParts[2]), "and a CRP of 2 is not", r.cbcParts[2]);
    ok(r.cbcParts.every(function (p) { return /Expected /.test(p); }),
       "every part carries the range it should be compared against");
    ok(/CO2\|true/.test((r.gasParts || []).join(" ")), "a gas marks a CO2 of 70", (r.gasParts || []).join(" "));
    ok(/base deficit\|false/.test((r.gasParts || []).join(" ")),
       "and leaves a base deficit of 2 alone", (r.gasParts || []).join(" "));
    ok(/data-tip="[^"]*Expected 5/.test(r.labsHtml), "the range reaches the page as hover text");
    ok(/class="lpart abn"/.test(r.labsHtml), "and the out-of-range number is marked on the page");
  });

  suite("Ranges on screen are the ranges in clinical.js", async function () {
    var r = await shift({ seed: 3, difficulty: "student" }, function (G, w, D) {
      var CL = w.Clinical, bad = [];
      Object.keys(CL.ref).forEach(function (k) {
        var e = CL.ref[k];
        if (!e.tip || !e.why) bad.push(k + ": missing tip or why");
        if (e.lo == null && e.hi == null) bad.push(k + ": no bound at all");
        if (e.lo != null && e.hi != null && e.lo >= e.hi) bad.push(k + ": lo is not below hi");
        // the tip must actually quote its own bound, or the two can drift
        /* Every bound the code marks against must appear in the sentence the player reads,
           or the two drift and the game teaches one range while flagging another. */
        [e.lo, e.hi].forEach(function (n) {
          if (n != null && String(e.tip).indexOf(String(n)) < 0)
            bad.push(k + ": the tip never mentions " + n);
        });
      });
      // and the game's own critical thresholds must not contradict the stated normal range
      var CLr = CL.ref;
      if (CLr.crp.hi !== 10) bad.push("CRP range and the crit flag disagree");
      if (CLr.co2.hi > 65) bad.push("the CO2 range reaches past the crisis threshold");
      if (CLr.hgb.lo < 8) bad.push("the Hgb floor is below the handover flag");
      return { bad: bad, n: Object.keys(CL.ref).length };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.n >= 6, "every analyte with a range has an entry", r.n);
    ok(!r.bad.length, "and each one is complete and self-consistent", r.bad.join(" | "));
  });


  /* ================================================================ THE NURSE
     Nothing in the game moved the oxygen except the player's slider, which quietly
     disabled every respiratory concern in it. */
  suite("The nurse titrates the oxygen", async function () {
    var r = await shift({ seed: 1212 }, function (G, w, D) {
      var b = G.babies.filter(function (x) { return x.support.mode !== "RA"; })[0];
      var CL = w.Clinical, start = b.support.fio2;

      /* Budget: a shift is 720 game minutes and G.advance is a no-op after that, so a
         fixture that runs past the end passes every "nothing changed" check for free. This
         one spends 200 + 200 + 210. */
      b.support.mode = "CPAP"; b.support.cpap = 6; b.h.apneaTend = 0;

      // a baby who needs more: she goes up, and stops at her ceiling
      b.h.rds = 2.2; b.h.surfactant = 0.30;
      for (var i = 0; i < 20; i++) G.advance(10);
      var up = b.support.fio2, ceil = b.h.o2Ceilinged;

      // a baby who needs less: she comes back down
      b.h.rds = 0; b.h.surfactant = 1; b.h.aspiration = 0; b.h.pphn = 0;
      for (var j = 0; j < 20; j++) G.advance(10);
      var down = b.support.fio2;

      // and she leaves the dial alone for a while after the player moves it
      b.support.fio2 = 0.60; b.h.o2HandsOff = CL.o2Nurse.handsOffMin;
      G.advance(10);
      var held = b.support.fio2;
      for (var k = 0; k < 20; k++) G.advance(10);
      var thenWeaned = b.support.fio2;

      return { start: start, up: up, down: down, ceiling: CL.o2Nurse.ceiling, ceilMin: ceil,
               held: held, thenWeaned: thenWeaned, ran: G.min, running: G.running };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.up > r.start, "she turns it up on a baby who is deteriorating", r.start + " -> " + r.up);
    ok(r.up <= r.ceiling + 0.001, "and stops at the ceiling rather than chasing it", r.up);
    ok(r.ceilMin > 0, "and the game records how long she has been stuck there", r.ceilMin);
    ok(r.down < r.up, "she weans a baby who no longer needs it", r.up + " -> " + r.down);
    ok(r.held === 0.6, "a change the player makes is not undone in the next minute", r.held);
    ok(r.running, "the fixture stayed inside one shift", "clock at " + Math.round(r.ran));
    ok(r.thenWeaned < 0.6, "but it is not left there for ever either", r.thenWeaned);
  });

  suite("She titrates on the baby, not on the monitor", async function () {
    /* The game teaches that a slipped probe reads 74 percent on a pink, wriggling baby and
       that turning the oxygen up would be the wrong answer. If the nurse chased that number
       the game would be making the mistake on the player's behalf. */
    var r = await shift({ seed: 1213 }, function (G, w, D) {
      /* A baby with genuinely nothing else pulling the saturation down, or this measures
         her answering a real desaturation rather than ignoring a fake one. */
      var b = G.babies.filter(function (x) { return x.support.mode !== "RA"; })[0];
      b.h.rds = 0; b.h.surfactant = 1; b.h.aspiration = 0; b.h.pphn = 0; b.h.apneaTend = 0;
      b.h.secretions = 0.05; b.h.ettDisplaced = false; b.h.sepsis = 0; b.h.pda = 0;
      b.support.mode = "CPAP"; b.support.cpap = 6; b.support.fio2 = 0.30;
      G.advance(30);
      var before = b.support.fio2, sat0 = b.mon.trueSat;
      /* Hold the artifact on across every tick, INCLUDING the one that draws the monitor:
         updateMonitor clears it when the nurse spots the probe, and a single assignment
         before an advance can be undone before the reading is taken. */
      for (var i = 0; i < 20; i++) {
        b.h.artifactProbe = true; b.h.artifactProbeAt = G.min;
        G.advance(5);
        b.h.artifactProbe = true;
      }
      G.advance(5);
      return { before: before, after: b.support.fio2, sat0: sat0,
               shown: b.mon.spo2, real: b.mon.trueSat };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.sat0 >= 90, "the baby was comfortable before the probe slipped", Math.round(r.sat0));
    ok(r.shown < r.real - 5, "the monitor really was lying", r.shown + " shown vs " + Math.round(r.real));
    ok(r.after <= r.before + 0.001, "and she did not turn the oxygen up for it",
       r.before + " -> " + r.after);
  });

  suite("RDS gets worse before it gets better", async function () {
    var r = await shift({ seed: 1214 }, function (G, w, D) {
      function lungs(b) { return { wob: w.Sim.workOfBreathing(b), fio2: b.support.fio2, co2: b.h.co2 }; }
      function quiet(b) {
        b.h.ptxPending = 0; b.h.ptx = false; b.h.sepsisLatent = 0; b.h.sepsis = 0; b.h.apneaTend = 0;
        b.support.mode = "CPAP"; b.support.cpap = 6; b.support.fio2 = 0.30;   // she needs a dial to turn
      }
      // BOTH babies in the one shift, stepped together, so neither runs past 07:00
      var sick = G.babies[0], mild = G.babies[1];
      quiet(sick); sick.h.surfactant = 0.40; sick.h.rds = 2.0; sick.h.ageH = 6;
      quiet(mild); mild.h.surfactant = 0.64; mild.h.rds = 0.85; mild.h.ageH = 6;
      var a = lungs(sick), m0 = w.Sim.workOfBreathing(mild);
      for (var i = 0; i < 60; i++) G.advance(10);
      return { a: a, z: lungs(sick), m0: m0, m1: w.Sim.workOfBreathing(mild),
               surf: sick.h.surfactant, rds: sick.h.rds, running: G.running };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.z.wob > r.a.wob, "an untreated severe baby is working harder by morning",
       r.a.wob.toFixed(2) + " -> " + r.z.wob.toFixed(2));
    ok(r.z.fio2 > r.a.fio2, "and needs more oxygen to stay in range",
       Math.round(r.a.fio2 * 100) + "% -> " + Math.round(r.z.fio2 * 100) + "%");
    ok(r.z.co2 > r.a.co2, "and is holding on to more carbon dioxide",
       Math.round(r.a.co2) + " -> " + Math.round(r.z.co2));
    ok(r.m1 <= r.m0 + 0.05, "while the benign one stays benign",
       r.m0.toFixed(2) + " -> " + r.m1.toFixed(2));
    ok(r.running, "and the fixture stayed inside one shift");
  });

  suite("Surfactant still works, and quickly", async function () {
    var r = await shift({ seed: 1215 }, function (G, w, D) {
      /* lungFunction, not workOfBreathing: a ventilator subtracts 0.55 from the work all on
         its own, so measuring the work across "put on a vent, then give surfactant" mostly
         measures the vent. What surfactant does is to the LUNG. */
      var b = G.babies[0];
      b.h.ptxPending = 0; b.h.sepsisLatent = 0; b.h.surfactant = 0.40; b.h.rds = 2.0; b.h.ageH = 6;
      // a baby who arrived on a tube brings secretions with them, which is a different problem
      b.h.secretions = 0.05; b.h.ettDisplaced = false; b.h.aspiration = 0; b.h.pphn = 0;
      b.support.mode = "VENT"; b.support.pip = 20; b.support.peep = 5; b.support.rate = 40;
      G.advance(10);
      var before = w.Sim.lungFunction(b), wob0 = w.Sim.workOfBreathing(b);
      w.NG.ACTIONS.surfactant.run(b, b.h);
      // hold the tube where it is: a tube that slips costs 0.42 of lung function on its own,
      // which is a different test, and it silently ate this one
      for (var i = 0; i < 24; i++) { b.h.ettDisplaced = false; G.advance(10); }
      return { before: before, after: w.Sim.lungFunction(b), wob0: wob0,
               wob1: w.Sim.workOfBreathing(b), surf: b.h.surfactant, rds: b.h.rds, running: G.running };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.after > r.before + 0.2, "the lungs open within a few hours of giving it",
       "lung function " + r.before.toFixed(2) + " -> " + r.after.toFixed(2));
    ok(r.wob1 < r.wob0, "and the baby is working less for it",
       r.wob0.toFixed(2) + " -> " + r.wob1.toFixed(2));
    ok(r.surf > 0.62, "and the lung is no longer short of surfactant", r.surf.toFixed(2));
  });

  suite("Carbon dioxide reaches the player", async function () {
    var r = await shift({ seed: 1216 }, function (G, w, D) {
      var b = G.babies[0], CL = w.Clinical;
      var def = w.Events.CONCERNS.filter(function (c) { return c.id === "tiring"; })[0];
      if (!def) return { missing: true };
      b.h.co2 = 40; b.h.co2Base = 40; G.advance(10);
      var quiet = def.cond(G, b);
      b.h.co2 = 70;                                   // a rise, which is what she notices
      var risen = def.cond(G, b);
      for (var i = 0; i < 60; i++) { b.h.co2 = 70; G.advance(10); }
      var settled = def.cond(G, b);                   // a new normal she has stopped chasing
      b.h.co2 = 84;
      return { quiet: quiet, risen: risen, settled: settled, worse: def.cond(G, b),
               say: def.say(G, b), accept: Object.keys(def.accept), wrong: Object.keys(def.wrong) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "the concern exists");
    ok(!r.quiet, "a normal carbon dioxide says nothing");
    ok(r.risen, "a rise above the baby's own baseline does");
    ok(!r.settled, "a level that has stopped moving stops being raised", "" + r.settled);
    ok(r.worse, "but a further climb reaches you again");
    ok(!/\b\d\d\b/.test(r.say.replace(/\d+ percent/g, "")),
       "she describes the baby and never quotes a number she could not have", r.say.slice(0, 60));
    ok(r.accept.indexOf("gas") >= 0, "a gas is the answer to it");
    ok(r.wrong.indexOf("__fio2up") >= 0 && r.wrong.indexOf("morphine") >= 0,
       "and more oxygen or more sedation are both marked wrong", r.wrong.join(","));
  });

  suite("Routine cares happen whether or not you decide anything", async function () {
    var r = await shift({ seed: 1217 }, function (G, w, D) {
      var b = G.babies[0], peaks = 0, last = 0, maxH = 0;
      b.h.handling = 0;
      for (var i = 0; i < 72; i++) {
        G.advance(10);
        maxH = Math.max(maxH, b.h.handling);
        if (b.h.handling > last + 0.2) peaks++;
        last = b.h.handling;
      }
      var settled = b.h.handling;
      for (var j = 0; j < 40; j++) { b.h.caresIn = 9999; G.advance(10); }
      return { peaks: peaks, maxH: maxH, settled: settled, after: b.h.handling };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.peaks >= 2, "a baby is handled several times a night by somebody other than you", r.peaks);
    ok(r.after < 0.12, "and handling settles again afterwards - it used to only ever accumulate",
       r.settled.toFixed(2) + " -> " + r.after.toFixed(2));
  });

  /* ============================================================ THE BIG ONE
     Every concern in the game is a thing the player is meant to be able to meet. Eight of
     seventeen never could: measured across 3,600 baby-ticks their condition was never once
     true, because they gated on a FiO2 nothing but the player could set. This suite is the
     guard against that ever being true again and nobody noticing. A concern must either
     turn up on its own across a spread of ordinary shifts, or have a named scenario here
     that reaches it. Adding one without either is a failing test, not a silent gap. */
  var NAMED_CASE = {
    /* Weaning is a decision, so these two only exist once the player has made it - which is
       the point of them. A baby ready to come off the tube, and a ventilator wound up past
       what the baby needs, are both things you do, not things you inherit. */
    extubatable:    function (b) { b.support.mode = "VENT"; b.support.pip = 14; b.support.peep = 5; b.support.rate = 20;
                                   b.support.fio2 = 0.25; b.h.rds = 0.1; b.h.surfactant = 1; b.h.co2 = 42;
                                   b.h.spontDrive = 1; b.h.fatigue = 0.05; b.h.morphineLevel = 0; },
    overventilated: function (b) { b.support.mode = "VENT"; b.support.pip = 28; b.support.peep = 5; b.support.rate = 55;
                                   b.h.rds = 0; b.h.surfactant = 1; b.h.secretions = 0.1; },
    // an open isolette is somebody's parent, and it does not happen every night
    cold:           function (b) { b.support.servo = false; b.support.isoOpen = true; b.h.coreTemp = 35.6; },
    // and these are real but uncommon - they turn up on their own, just not in six seeds
    pale:           function (b) { b.h.hgb = 7.6; b.labs.cbc = null; },
    needsoxygen:    function (b) { b.support.mode = "RA"; b.support.fio2 = 0.21;
                                   b.h.rds = 1.3; b.h.surfactant = 0.58; b.h.apneaTend = 0; },
    swinging:       function (b) { b.h.pphn = 0.45; b.h.pain = 0.6; b.h.handling = 0.8;
                                   b.support.mode = "NC"; b.support.fio2 = 0.45; },
    tubemoved:      function (b) { b.support.mode = "VENT"; b.h.ettDisplaced = true; },
    // a bleed that got bigger tonight: real, and thankfully not a nightly occurrence
    fontanelle:     function (b) { b.h.ivhWindow = true; b.h.ivhAtHandover = 1; b.h.ivhGrade = 2;
                                   b.h.fontanelleFull = true; b.labs.hus = null; }
  };

  suite("Every concern in the game can actually reach a player", async function () {
    var ids = null, natural = {}, errs = [];
    for (var i = 0; i < 6; i++) {
      var r = await shift({ seed: 6600 + i, allowDeath: false }, function (G, w, D) {
        var defs = w.Events.CONCERNS.filter(function (c) { return c.pool !== "parent"; });
        if (!ids) ids = defs.map(function (d) { return d.id; });
        var guard = 0;
        while (G.running && guard++ < 3000) {
          if (clearDialog(G, D)) continue;
          G.advance(10);
          G.babies.forEach(function (b) {
            defs.forEach(function (d) {
              var v = false;
              try { v = !!d.cond(G, b); } catch (e) { natural[d.id + " THREW"] = true; }
              if (v) natural[d.id] = (natural[d.id] || 0) + 1;
            });
          });
        }
      });
      errs = errs.concat(r.errs);
    }
    ok(!errs.length, "no exceptions across six shifts", errs.slice(0, 2).join(" | "));
    ok(!Object.keys(natural).some(function (k) { return /THREW/.test(k); }),
       "no concern's condition throws", Object.keys(natural).filter(function (k) { return /THREW/.test(k); }).join(","));

    var unmet = ids.filter(function (id) { return !natural[id] && !NAMED_CASE[id]; });
    ok(!unmet.length,
       "every concern either turns up on its own or has a named case here", unmet.join(", "));

    // and the named ones have to actually be reachable from the state they describe
    var gatedIds = Object.keys(NAMED_CASE).filter(function (id) { return ids.indexOf(id) >= 0; });
    var reached = await shift({ seed: 6700, allowDeath: false }, function (G, w, D) {
      var got = [];
      gatedIds.forEach(function (id, n) {
        var def = w.Events.CONCERNS.filter(function (c) { return c.id === id; })[0];
        var b = G.babies[n % G.babies.length];
        NAMED_CASE[id](b);
        for (var t = 0; t < 12; t++) G.advance(10);
        var hit = false;
        for (var u = 0; u < 12 && !hit; u++) { try { hit = !!def.cond(G, b); } catch (e) {} G.advance(10); }
        if (hit) got.push(id);
      });
      return { got: got };
    });
    ok(!reached.errs.length, "no exceptions setting up the gated cases", reached.errs.join(" | "));
    ok(reached.got.length === gatedIds.length,
       "and each named case really does reach its concern",
       "reached " + reached.got.join(",") + " of " + gatedIds.join(","));
  });

  suite("No single concern drowns out the rest", async function () {
    /* The high-saturation concern once fired 8.3 times a night - 2.4 times as often as
       anything else - because nobody in the game ever weaned any oxygen. */
    var raised = {}, shifts = 6, errs = [];
    for (var i = 0; i < shifts; i++) {
      var r = await shift({ seed: 6800 + i, allowDeath: false }, function (G, w, D) {
        var guard = 0;
        while (G.running && guard++ < 3000) { if (clearDialog(G, D)) continue; G.advance(20); }
        G.concerns.forEach(function (c) { raised[c.id] = (raised[c.id] || 0) + 1; });
      });
      errs = errs.concat(r.errs);
    }
    var ids = Object.keys(raised);
    var total = ids.reduce(function (a, k) { return a + raised[k]; }, 0);
    var worst = ids.sort(function (a, b) { return raised[b] - raised[a]; })[0];
    ok(!errs.length, "no exceptions", errs.slice(0, 2).join(" | "));
    ok(ids.length >= 10, "an ordinary shift raises a wide spread of concerns", ids.length + " kinds");
    ok(raised[worst] / shifts < 6,
       "and none of them is raised more than six times a night",
       worst + " at " + (raised[worst] / shifts).toFixed(1) + " per shift");
    ok(total / shifts < 40, "the unit is busy, not deafening", (total / shifts).toFixed(1) + " raises a shift");
  });


  /* ============================================================ the open porthole
     `cold` was the last concern with no natural route to it: the thermal model works, but
     every baby is on servo control, so nothing ever made one cold unless the player opened
     the isolette themselves. Somebody's parent leaves a porthole open, which is one of the
     most ordinary things that happens in a neonatal unit. */
  suite("A parent sometimes leaves the porthole open", async function () {
    var opened = 0, shifts = 8, errs = [], first = null, whoIsIt = {};
    for (var i = 0; i < shifts; i++) {
      var r = await shift({ seed: 7700 + i, allowDeath: false }, function (G, w, D) {
        var seen = {}, guard = 0, logged = null;
        while (G.running && guard++ < 3000) {
          if (clearDialog(G, D)) continue;
          G.advance(10);
          G.babies.forEach(function (b) {
            if (b.support.isoOpen && !seen[b.bed]) {
              seen[b.bed] = 1;
              whoIsIt[b.arch] = (whoIsIt[b.arch] || 0) + 1;
              // it may only happen to a baby small enough for it to matter, and never on a chest
              if (b.support.humidity < 50) whoIsIt.WRONG_BABY = true;
              /* Read the log NOW. The report replaces the whole page at 07:00, so anything
                 checked after the shift ends is checking the report, not the night. */
              if (logged == null)
                logged = /a hand through the porthole/.test(D.body.innerText) ||
                         G.logLines.some(function (l) { return /porthole/.test(l.m || ""); });
            }
          });
        }
        return { n: Object.keys(seen).length, log: logged };
      });
      errs = errs.concat(r.errs);
      opened += r.n;
      if (r.n && first == null) first = r.log;
    }
    ok(!errs.length, "no exceptions", errs.slice(0, 2).join(" | "));
    ok(opened > 0 && opened < shifts * 2,
       "it happens sometimes, and not on every cot", opened + " in " + shifts + " shifts");
    ok(!whoIsIt.WRONG_BABY, "only to babies in a humidified isolette", JSON.stringify(whoIsIt));
    ok(first !== false, "and the unit log says so when it happens");
  });

  suite("An open porthole is a problem you can see and fix", async function () {
    var r = await shift({ seed: 7702, allowDeath: false }, function (G, w, D) {
      var A = w.NG.ACTIONS, b = null, guard = 0;
      while (G.running && guard++ < 250 && !b) {
        G.advance(10);
        b = G.babies.filter(function (x) { return x.support.isoOpen; })[0];
      }
      if (!b) return { missing: true };
      var t0 = b.h.coreTemp;
      var offWhenOpen = A.closeiso.off(b), urgent = !!(A.closeiso.urgent && A.closeiso.urgent(b));
      for (var i = 0; i < 4; i++) G.advance(10);
      var cooled = b.h.coreTemp, coldMin = b.h.coldMinutes, drain = b.h.glucoseDrain;

      var c = G.concerns.filter(function (x) { return x.id === "cold" && x.bed === b.bed && !x.done; })[0];
      var said = c ? c.def.say(G, b) : "", summ = c ? c.def.summary(G, b) : "";

      // the nurse's own resolution path: she has to have been to the bedside for credit
      if (c) c.seen = true;
      var res = A.closeiso.run(b, b.h);
      w.NG.judgeConcern(b, "closeiso");
      var resolved = c ? !!c.done : null, offAfter = A.closeiso.off(b);
      for (var j = 0; j < 12; j++) G.advance(10);
      return { t0: t0, cooled: cooled, coldMin: coldMin, drain: drain,
               offWhenOpen: offWhenOpen, urgent: urgent, said: said, summ: summ,
               msg: res.msg, kind: res.kind, resolved: resolved, offAfter: offAfter,
               rewarmed: b.h.coreTemp, again: A.closeiso.run(b, b.h),
               /* Two entries is right and is the point: the action pays for noticing, the
                  concern pays for answering the person who asked. What must not happen is the
                  same one paying twice, so count the action's own line. */
               scored: G.scoreItems.filter(function (x) { return /^Closed the isolette/.test(x.why); }).length,
               fromConcern: G.scoreItems.filter(function (x) { return /Close the isolette/.test(x.why); }).length };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "a porthole was left open on this seed");
    ok(r.cooled < r.t0 - 0.8, "the baby cools, and fast",
       r.t0.toFixed(1) + " -> " + r.cooled.toFixed(1) + " in forty minutes");
    ok(r.drain > 1, "burning sugar to do it", "glucose drain " + r.drain);
    ok(!r.offWhenOpen && r.urgent, "the action is available and marked urgent while it is open");
    ok(/porthole is open/.test(r.said), "the nurse names the actual cause", r.said.slice(0, 70));
    ok(/isolette is open/.test(r.summ), "and so does the who-needs-you line", r.summ);
    ok(!/careless|should have|fault|blame/i.test(r.said),
       "without blaming the parent for it", r.said.slice(0, 70));
    ok(r.kind === "good" && r.resolved === true, "closing it resolves the concern", r.msg);
    ok(r.offAfter, "and the action goes away once it is shut");
    ok(r.rewarmed > r.cooled + 1, "the baby warms back up",
       r.cooled.toFixed(1) + " -> " + r.rewarmed.toFixed(1));
    ok(r.again.refused, "pressing it again is refused rather than scored twice", r.again.msg);
    ok(r.scored === 1, "spotting it is credited exactly once, however often it is pressed", r.scored);
    ok(r.fromConcern === 1, "and answering the nurse who asked is credited separately", r.fromConcern);
  });


  /* ============================================================ THE VENTILATOR
     No archetype started on a ventilator and no admission arrived on one, so `highpip`,
     `extubatable` and `wetchest` - and the whole pressure, rate, secretions and weaning
     system behind them - existed only if the player chose to intubate somebody. A third of
     the support model was behind a door nobody had a reason to open. */
  suite("Somebody is on a ventilator", async function () {
    var withVent = 0, couldVent = 0, shifts = 8, errs = [], settings = [], sheets = [], modes = {}, broke = [];
    for (var i = 0; i < shifts; i++) {
      var r = await shift({ seed: 6900 + i, allowDeath: false }, function (G, w, D) {
        var v = G.babies.filter(function (b) { return b.support.mode === "VENT"; });
        v.forEach(function (b) {
          settings.push({ ga: b.ga, pip: b.support.pip, limit: w.Clinical.pipLimit(b.ga),
                          co2: Math.round(b.h.co2), sec: b.h.secretions });
          sheets.push(b.handoff);
        });
        G.babies.forEach(function (b) { modes[b.support.mode] = (modes[b.support.mode] || 0) + 1; });
        /* Two archetypes can arrive on a tube, and a census of five drawn from eight does not
           always contain one. The invariant is not "every shift has a ventilated baby" - it
           is "every shift that COULD have one, does". */
        var could = G.babies.some(function (b) {
          return w.Patients.ARCHETYPES.some(function (a) { return a.key === b.arch && a.vent; });
        });
        return { n: v.length, could: could,
                 broke: could && !v.length ? G.babies.map(function (b) { return b.arch; }).join("+") : null };
      });
      errs = errs.concat(r.errs);
      if (r.n) withVent++;
      if (r.could) couldVent++;
      if (r.broke) broke.push(r.broke);
    }
    ok(!errs.length, "no exceptions", errs.slice(0, 2).join(" | "));
    ok(couldVent >= shifts - 2, "most censuses contain a baby who could be on a tube",
       couldVent + " of " + shifts);
    ok(!broke.length, "and every one of those shifts actually has one", broke.join(" | "));
    ok(withVent === couldVent, "which is the guarantee, not a coin flip",
       withVent + " vented of " + couldVent + " possible  (modes: " + JSON.stringify(modes) + ")");
    ok(settings.every(function (x) { return x.pip > x.limit; }),
       "and the settings they arrive on are over the limit for their gestation - there is something to wean",
       settings.map(function (x) { return x.pip + ">" + x.limit; }).join(" "));
    ok(settings.every(function (x) { return x.co2 > 32 && x.co2 < 60; }),
       "the carbon dioxide they start at is neither driven down nor climbing",
       settings.map(function (x) { return x.co2; }).join(","));
    ok(sheets.every(function (t) { return /ventilator|the tube/.test(t); }),
       "and the handover sheet says they are on a ventilator", (sheets[0] || "").slice(0, 90));
    ok(!sheets.some(function (t) { return /Still on CPAP/.test(t); }),
       "never that they are still on CPAP");
  });

  suite("Over-ventilating a baby costs something", async function () {
    var r = await shift({ seed: 5001, allowDeath: false }, function (G, w, D) {
      var b = G.babies.filter(function (x) { return x.support.mode === "VENT"; })[0];
      if (!b) return { missing: true };
      var def = w.Events.CONCERNS.filter(function (c) { return c.id === "overventilated"; })[0];
      G.advance(30);
      var restingCo2 = b.h.co2, quiet = def.cond(G, b);

      b.support.rate = 55; b.support.pip = 28;          // the mistake being taught
      for (var i = 0; i < 12; i++) G.advance(10);
      var driven = b.h.co2, fires = def.cond(G, b);
      for (var j = 0; j < 30; j++) G.advance(10);

      return { restingCo2: restingCo2, quiet: quiet, driven: driven, fires: fires,
               mins: b.h.hypocapMinutes, worst: b.h.hypocapWorst,
               say: def.say(G, b), wrong: Object.keys(def.wrong), accept: Object.keys(def.accept) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "there was a ventilated baby to over-ventilate");
    ok(!r.quiet, "the settings they arrive on are not already over-ventilating them", r.restingCo2);
    ok(r.driven < 30, "winding the rate and pressure up drives the carbon dioxide into the twenties",
       Math.round(r.restingCo2) + " -> " + Math.round(r.driven));
    ok(r.fires, "and the nurse notices - because the baby has stopped triggering");
    ok(r.mins > 120, "the time spent there is counted", Math.round(r.mins) + " minutes");
    ok(!/\bCO2\b|carbon dioxide/.test(r.say),
       "she describes a baby, not a number she could not have", r.say.slice(0, 60));
    ok(r.wrong.indexOf("__rateup") >= 0 && r.wrong.indexOf("__pipup") >= 0,
       "more rate and more pressure are both marked wrong", r.wrong.join(","));
    ok(r.accept.indexOf("__ratedown") >= 0, "and coming down on the rate is the answer");
  });

  suite("A driven-down carbon dioxide reaches the morning", async function () {
    var r = await shift({ seed: 5001, allowDeath: false }, function (G, w, D) {
      var b = G.babies.filter(function (x) { return x.support.mode === "VENT"; })[0];
      if (!b) return { missing: true };
      var guard = 0;
      while (G.running && guard++ < 3000) {
        if (clearDialog(G, D)) continue;
        if (b.support.mode === "VENT") { b.support.rate = 55; b.support.pip = 28; }
        G.advance(20);
      }
      var txt = D.body.innerText;
      return { txt: txt, mins: b.h.hypocapMinutes, worst: b.h.hypocapWorst,
               grade: (txt.match(/handover to the day team\s*\n\s*(.+)/) || [])[1] };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "there was a ventilated baby");
    ok(/driven down to/.test(r.txt), "the handover says the ventilator did it",
       (r.txt.match(/driven down to[^\n.]{0,60}/) || [])[0]);
    ok(r.worst < 30, "and how far down it went", Math.round(r.worst));
    ok(r.mins > 300, "and for how long", Math.round(r.mins) + " minutes");
    ok(!/Outstanding|Strong shift/.test(r.grade || ""),
       "a night spent over-ventilating a baby is not an outstanding shift", r.grade);
  });

  suite("A breathing tube can move, and the checklist finds it", async function () {
    var r = await shift({ seed: 6901, allowDeath: false }, function (G, w, D) {
      var b = G.babies.filter(function (x) { return x.support.mode === "VENT"; })[0];
      if (!b) return { missing: true };
      var def = w.Events.CONCERNS.filter(function (c) { return c.id === "tubemoved"; })[0];
      var lf0 = w.Sim.lungFunction(b);
      b.h.ettDisplaced = true;
      G.advance(10);
      var lf1 = w.Sim.lungFunction(b), fires = def.cond(G, b);
      var exam = w.Sim.examine ? null : null;
      // the emergency checklist has had a branch for this since the beginning
      var branch = w.Events.CRISES.dope.opts[0].run(G, b);
      return { lf0: lf0, lf1: lf1, fires: fires, branch: branch,
               cleared: !b.h.ettDisplaced, say: def.say(G, b), accept: Object.keys(def.accept) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "there was a ventilated baby");
    ok(r.lf1 < r.lf0 - 0.2, "a displaced tube costs real lung function",
       r.lf0.toFixed(2) + " -> " + r.lf1.toFixed(2));
    ok(r.fires, "the nurse sees one side of the chest not moving");
    ok(/quieter on the left|not lifting|barely moving/.test(r.say), "and says so", r.say.slice(0, 60));
    ok(r.accept.indexOf("intubate") >= 0 && r.accept.indexOf("cxr") >= 0,
       "re-siting it and a film are both right", r.accept.join(","));
    ok(r.branch && r.branch.ok && r.cleared,
       "and the emergency checklist branch that was written for it finally fires",
       (r.branch && r.branch.text || "").slice(0, 70));
  });

  suite("Tubes move on their own, occasionally", async function () {
    var slipped = 0, ventShifts = 0, errs = [];
    for (var i = 0; i < 10; i++) {
      var r = await shift({ seed: 6910 + i, allowDeath: false }, function (G, w, D) {
        var v = G.babies.filter(function (b) { return b.support.mode === "VENT"; });
        if (!v.length) return { vent: 0, slip: 0 };
        var seen = {}, guard = 0;
        while (G.running && guard++ < 3000) {
          if (clearDialog(G, D)) continue;
          G.advance(10);
          v.forEach(function (b) { if (b.h.ettDisplaced) seen[b.bed] = 1; });
        }
        return { vent: v.length, slip: Object.keys(seen).length };
      });
      errs = errs.concat(r.errs);
      if (r.vent) ventShifts++;
      slipped += r.slip;
    }
    ok(!errs.length, "no exceptions", errs.slice(0, 2).join(" | "));
    ok(ventShifts >= 5, "enough of these shifts had a ventilated baby to say anything", ventShifts + " of 10");
    ok(slipped > 0, "a tube moves on its own sometimes", slipped + " times in " + ventShifts + " shifts");
    ok(slipped <= ventShifts, "but not on every night - it is an event, not a certainty",
       slipped + " in " + ventShifts);
  });


  /* ==================================================== ONE SET OF NUMBERS
     js/clinical.js exists because the rule "a mean blood pressure should be at least the
     gestational age" had been implemented five different ways. It kept happening anyway:
     haemoglobin ended up with six numbers answering questions about the same measurement -
     the lab result shouted below 8, the skin went pale below 8.5, the handover flagged 8,
     the attending said 9, a transfusion was refused above 10 - and the hover text added
     later told the player to expect 9 to 22, so a value of 8.5 read as out of range and
     non-critical at once, an inch apart on the same screen.

     Reading the shipped source is the only check that actually catches this. Everything
     else tests behaviour, and drift IS the behaviour agreeing with itself while disagreeing
     with what it tells the player. */
  var OWNED = "hgb|co2|crp|wbc|glucose|coreTemp|trueSat|spo2|biliThreshold";
  var SOURCES = ["sim", "patients", "deliveries", "events", "game", "actions", "report"];

  suite("No file but clinical.js holds a clinical threshold", async function () {
    var offenders = [], read = 0, failed = [];
    for (var i = 0; i < SOURCES.length; i++) {
      var name = SOURCES[i], text = null;
      try {
        var resp = await fetch("../js/" + name + ".js?t=" + Date.now());
        if (resp.ok) text = await resp.text();
      } catch (e) {}
      if (text == null) { failed.push(name); continue; }
      read++;
      text.split("\n").forEach(function (line, n) {
        // a comparison of an owned measurement against a bare number
        var m = line.match(new RegExp("\\b(" + OWNED + ")\\s*[<>]=?\\s*-?\\d"));
        if (m) offenders.push(name + ".js:" + (n + 1) + "  " + line.trim().slice(0, 70));
      });
    }
    ok(!failed.length, "every source file could be read", failed.join(", "));
    ok(read === SOURCES.length, "all " + SOURCES.length + " of them", read);
    ok(!offenders.length,
       "and none of them compares a measurement against a number of its own",
       offenders.slice(0, 4).join("  |  "));
  });

  suite("The numbers agree with each other", async function () {
    var r = await shift({ seed: 11, difficulty: "student" }, function (G, w, D) {
      var CL = w.Clinical, bad = [];
      function want(cond, msg) { if (!cond) bad.push(msg); }

      // the range the player is shown IS the range the game acts on
      want(CL.ref.hgb.lo === CL.hgb.nadir, "the haemoglobin hover and the nadir have parted company");
      want(CL.ref.hgb.hi === CL.hgb.polycythaemia, "so have the hover and polycythaemia");
      want(CL.ref.co2.hi === CL.co2.permissiveHigh, "the CO2 hover and permissive hypercapnia have parted company");

      // and each set is internally ordered the way the medicine is
      want(CL.hgb.pale <= CL.hgb.nadir, "a baby cannot look pale above the expected nadir");
      want(CL.hgb.flagAt <= CL.hgb.nadir, "a result cannot be flagged above the expected nadir");
      want(CL.hgb.treated <= CL.hgb.transfuseAbove, "you cannot be refused a transfusion below the treated level");
      want(CL.co2.normalHigh < CL.co2.permissiveHigh, "permissive hypercapnia has to permit something");
      want(CL.co2.permissiveHigh < CL.co2.notEnough, "and stop short of not-enough");
      want(CL.co2.notEnough < CL.co2.critical, "which has to stop short of critical");
      want(CL.glucose.handoverBelow <= CL.glucose.low, "handing over a sugar cannot be stricter than the symptomatic threshold");
      want(CL.glucose.severe < CL.glucose.handoverBelow, "and the emergency has to be below it");
      want(CL.sat.handoverBelow > CL.sat.alarmRed, "a handover saturation sits above the red alarm");
      want(CL.sat.handoverBelow < CL.sat.targetLow, "and below the target");
      want(CL.temp.severe < CL.temp.hypothermia, "severe hypothermia is colder than moderate");
      want(CL.temp.hypothermia < CL.temp.coldStress, "which is colder than cold stress");

      /* And the tip a player reads has to quote every bound the code marks against, or the
         sentence and the number drift apart exactly the way they did before. */
      Object.keys(CL.ref).forEach(function (k) {
        var e = CL.ref[k];
        [e.lo, e.hi].forEach(function (v) {
          if (v != null && String(e.tip).indexOf(String(v)) < 0)
            bad.push(k + ": the hover never mentions " + v);
        });
      });
      return { bad: bad };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.bad.length, "every threshold is consistent with the ones it sits next to",
       r.bad.join(" | "));
  });


  /* ============================================================== THE BRAIN
     Fourteen ordinary shifts, seventy babies, every one grade 0 - and a deliberately
     worst-possible night only just crossed the line. So the head ultrasound could only ever
     say "no bleeding seen": three of its four results were dead text, and the whole handling
     and blood-pressure model had nothing to point at. */
  suite("Babies arrive with the bleeds they really have", async function () {
    var inWindow = 0, arrived = 0, grades = {}, sheets = [], errs = [], outside = 0;
    for (var i = 0; i < 10; i++) {
      var r = await shift({ seed: 17000 + i, allowDeath: false }, function (G, w, D) {
        var win = 0, arr = 0, g = {}, sheet = null, bad = 0;
        G.babies.forEach(function (b) {
          if (b.h.ivhWindow) win++;
          if (b.h.ivhAtHandover) {
            arr++; g[b.h.ivhAtHandover] = (g[b.h.ivhAtHandover] || 0) + 1;
            if (sheet == null) sheet = b.handoff;
            // it may only reach a baby young enough for it, and never a term one
            if (b.pma > 32) bad++;
          }
        });
        return { win: win, arr: arr, g: g, sheet: sheet, bad: bad };
      });
      errs = errs.concat(r.errs);
      inWindow += r.win; arrived += r.arr; outside += r.bad;
      Object.keys(r.g || {}).forEach(function (k) { grades[k] = (grades[k] || 0) + r.g[k]; });
      if (r.sheet && sheets.length < 2) sheets.push(r.sheet);
    }
    ok(!errs.length, "no exceptions", errs.slice(0, 2).join(" | "));
    ok(inWindow > 10, "some babies are young enough for it to be possible", inWindow + " across 10 shifts");
    ok(arrived > 0 && arrived < inWindow,
       "roughly a fifth of them arrive with one, and not all of them",
       arrived + " of " + inWindow);
    ok(!outside, "and never a baby past the window for it", outside);
    ok(!grades["3"], "an arriving bleed is a grade 1 or 2, not a grade 3", JSON.stringify(grades));
    ok(sheets.every(function (t) { return /head ultrasound showed a grade/.test(t); }),
       "the handover sheet says so - the day team scanned, so the player is told",
       (sheets[0] || "").slice(-110));
    ok(sheets.every(function (t) { return /settled|steady/.test(t); }),
       "and says what to do about it");
  });

  suite("What you do to a fragile brain matters", async function () {
    var r = await shift({ seed: 17001, allowDeath: false }, function (G, w, D) {
      var CL = w.Clinical;
      var b = G.babies.filter(function (x) { return x.h.ivhWindow; })[0];
      if (!b) return { missing: true };
      b.h.ivhGrade = 1; b.h.ivhAtHandover = 1; b.h.ivhThreshold = CL.ivh.knownThreshold;
      b.h.ivhAccum = 0;
      var hgb0 = b.h.hgb, apn0 = b.h.apneaTend;

      // everything the model says makes a matrix bleed, held on
      for (var i = 0; i < 60; i++) {
        b.h.handling = 2; b.h.map = 12; b.h.baseDeficit = 14;
        G.advance(10);
      }
      return { grade: b.h.ivhGrade, was: b.h.ivhAtHandover, full: !!b.h.fontanelleFull,
               hgbDrop: hgb0 - b.h.hgb, apnRise: b.h.apneaTend - apn0, running: G.running };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "there was a baby young enough for it");
    ok(r.running, "the fixture stayed inside one shift");
    ok(r.grade > r.was, "a bleed that already exists can extend", "grade " + r.was + " -> " + r.grade);
    ok(r.hgbDrop > 0.5, "and it is not just a line in a report - the count falls", r.hgbDrop.toFixed(1));
    ok(r.apnRise > 0, "the spells get worse", r.apnRise.toFixed(2));
    ok(r.full, "and the fontanelle comes up, which is how anybody notices at the cot");
  });

  suite("Handling is a risk, not a certainty", async function () {
    /* Uncapped, a player who examined and suctioned every forty minutes gave thirteen new
       bleeds to twenty babies. A game that teaches "never touch anybody" teaches nothing. */
    var events = 0, inWindow = 0, errs = [], pressure = [];
    for (var i = 0; i < 8; i++) {
      var r = await shift({ seed: 17100 + i, allowDeath: false }, function (G, w, D) {
        var A = w.NG.ACTIONS, win = G.babies.filter(function (b) { return b.h.ivhWindow; });
        var start = win.map(function (b) { return b.h.ivhGrade; });
        var guard = 0;
        while (G.running && guard++ < 3000) {
          if (clearDialog(G, D)) continue;
          if (G.min % 40 < 20) win.forEach(function (b) {
            try { A.examine.run(b, b.h); A.suction.run(b, b.h); } catch (e) {}
          });
          G.advance(20);
        }
        return { win: win.length,
                 worse: win.filter(function (b, ix) { return b.h.ivhGrade > start[ix]; }).length,
                 /* How far up the accumulator got, as a fraction of what it needed. A bleed is
                    a dice roll on top of this; the accumulator is the mechanism, and it is the
                    honest thing to assert on nine babies. */
                 pressure: win.map(function (b) { return b.h.ivhAccum / b.h.ivhThreshold; }) };
      });
      errs = errs.concat(r.errs);
      inWindow += r.win; events += r.worse;
      (r.pressure || []).forEach(function (p) { pressure.push(p); });
    }
    var worst = pressure.length ? Math.max.apply(null, pressure) : 0;
    var mean = pressure.length ? pressure.reduce(function (a, x) { return a + x; }, 0) / pressure.length : 0;
    ok(!errs.length, "no exceptions", errs.slice(0, 2).join(" | "));
    ok(inWindow > 5, "there were babies to hurt", inWindow);
    /* Asserting a bleed on nine babies at a real-world rate is asserting a coin flip. The
       mechanism is the honest thing to measure: how far up the accumulator handling drives
       them. That a full accumulator produces a bleed is proved deterministically by "What
       you do to a fragile brain matters" above. */
    ok(mean > 0.3, "handling a fragile baby all night drives every one of them towards a bleed",
       "mean " + mean.toFixed(2) + " of the threshold, worst " + worst.toFixed(2) +
       ", " + events + " actually bled");
    ok(worst > 0.6, "and takes the worst of them most of the way there", worst.toFixed(2));
    ok(events < inWindow * 0.6, "but it is a risk, not a certainty",
       events + " of " + inWindow);
  });

  suite("A bleed that got bigger reaches the morning", async function () {
    var r = await shift({ seed: 17002, allowDeath: false }, function (G, w, D) {
      var b = G.babies.filter(function (x) { return x.h.ivhWindow; })[0];
      if (!b) return { missing: true };
      var def = w.Events.CONCERNS.filter(function (c) { return c.id === "fontanelle"; })[0];
      b.h.ivhAtHandover = 1; b.h.ivhGrade = 2; b.h.fontanelleFull = true; b.labs.hus = null;
      G.advance(10);
      var fires = def.cond(G, b), say = def.say(G, b), wrong = Object.keys(def.wrong);
      // and it stops asking once somebody has actually scanned
      b.labs.hus = { v: "a grade 2 bleed", at: G.min };
      var quiet = !def.cond(G, b);
      var guard = 0;
      while (G.running && guard++ < 3000) { if (clearDialog(G, D)) continue; G.advance(20); }
      var txt = D.body.innerText;
      return { fires: fires, quiet: quiet, say: say, wrong: wrong, txt: txt };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "there was a baby young enough for it");
    ok(r.fires, "the nurse raises a bleed that has changed tonight");
    ok(r.quiet, "and stops once somebody has scanned");
    ok(/fontanelle|soft spot/.test(r.say) && /pale/.test(r.say),
       "she describes what she can actually feel and see", r.say.slice(0, 60));
    ok(r.wrong.indexOf("bolus") >= 0,
       "and a fast push of fluid is marked wrong, because that is how a grade 2 becomes a 3");
    ok(/bleed extended overnight/.test(r.txt),
       "the handover says it got bigger", (r.txt.match(/bleed extended[^\n.]{0,50}/) || [])[0]);
  });


  suite("A tube that has moved can actually be put back", async function () {
    /* Reported from a playtest: "I was advised a baby needed re-siting the tube, but the only
       options I saw were to extubate and then intubate, and it did not seem to work."
       Intubate was disabled the moment a baby was on a ventilator - which is exactly when a
       tube can slip - so the concern pointed at a greyed-out button and its own accept for
       `intubate` could never be reached. */
    var r = await shift({ seed: 6901, allowDeath: false }, function (G, w, D) {
      var A = w.NG.ACTIONS;
      var b = G.babies.filter(function (x) { return x.support.mode === "VENT"; })[0];
      if (!b) return { missing: true };
      // a baby whose settings the player has already spent the night weaning
      b.support.pip = 17; b.support.rate = 22; b.support.fio2 = 0.27;
      G.advance(10);
      var labelBefore = A.intubate.t(b), offBefore = A.intubate.off(b);

      b.h.ettDisplaced = true;
      var offNow = A.intubate.off(b), urgent = !!A.intubate.urgent(b), label = A.intubate.t(b);
      var lf0 = w.Sim.lungFunction(b);

      var res = A.intubate.run(b, b.h);
      var kept = { pip: b.support.pip, rate: b.support.rate, fio2: b.support.fio2 };
      G.advance(10);
      return { labelBefore: labelBefore, offBefore: offBefore, label: label, offNow: offNow,
               urgent: urgent, msg: res.msg, kind: res.kind, cleared: !b.h.ettDisplaced,
               mode: b.support.mode, kept: kept, lf0: lf0, lf1: w.Sim.lungFunction(b),
               scored: G.scoreItems.filter(function (x) { return /Re-sited/.test(x.why); }).length };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "there was a ventilated baby");
    ok(r.offBefore, "the button is off on a ventilated baby whose tube is where it should be");
    ok(!r.offNow, "and ON the moment the tube has moved - which is what it is for");
    ok(r.urgent, "and marked urgent, so it is findable");
    ok(r.labelBefore === "Intubate" && r.label === "Re-site the tube",
       "the button says what it will actually do", r.labelBefore + " -> " + r.label);
    ok(r.cleared && r.kind === "good", "pressing it puts the tube back", r.msg);
    ok(r.mode === "VENT", "without taking the baby off the ventilator to do it");
    ok(r.kept.pip === 17 && r.kept.rate === 22 && r.kept.fio2 === 0.27,
       "and without throwing away a night of weaning", JSON.stringify(r.kept));
    ok(r.lf1 > r.lf0 + 0.3, "the lung comes back", r.lf0.toFixed(2) + " -> " + r.lf1.toFixed(2));
    ok(r.scored === 1, "and it is credited once", r.scored);
  });

  suite("Taking the tube out takes the displaced tube out too", async function () {
    /* The other half of the same bug, and the nastier one: extubating left ettDisplaced set,
       so a baby on CPAP carried a 0.42 lung-function penalty with no cause on screen, nothing
       able to clear it, and no concern watching - because the one that reports a displaced
       tube only looks at ventilated babies. */
    var r = await shift({ seed: 6901, allowDeath: false }, function (G, w, D) {
      var A = w.NG.ACTIONS;
      var b = G.babies.filter(function (x) { return x.support.mode === "VENT"; })[0];
      if (!b) return { missing: true };
      b.h.ettDisplaced = true; b.h.spontDrive = 1; b.h.co2 = 42; b.h.rds = 0.1; b.h.surfactant = 1;
      G.advance(10);
      var lfDisplaced = w.Sim.lungFunction(b);
      A.extubate.run(b, b.h);
      G.advance(10);
      var def = w.Events.CONCERNS.filter(function (c) { return c.id === "tubemoved"; })[0];
      return { mode: b.support.mode, stillFlagged: !!b.h.ettDisplaced,
               lfDisplaced: lfDisplaced, lfAfter: w.Sim.lungFunction(b),
               anyoneWatching: def.cond(G, b) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.missing, "there was a ventilated baby");
    ok(r.mode !== "VENT", "the tube came out");
    ok(!r.stillFlagged, "so the game no longer thinks it is down a bronchus");
    ok(r.lfAfter > r.lfDisplaced, "and the phantom penalty goes with it",
       r.lfDisplaced.toFixed(2) + " -> " + r.lfAfter.toFixed(2));
    ok(!r.anyoneWatching, "with nothing left for the nurse to raise about a tube that is gone");
  });


  suite("You can live the same shift again", async function () {
    /* The point of it is a player who left the seed box empty, got a night worth repeating,
       and wants to do better in the same circumstance. So the seed handed back has to be the
       one the shift RESOLVED to, not the blank the player typed. */
    function signature(G) {
      return G.babies.map(function (b) {
        return [b.arch, b.puzzle.id, b.ga, b.dol, b.weightG, b.name, b.bed,
                b.support.mode, Math.round(b.support.fio2 * 100),
                b.h.ivhAtHandover, !!b.ventedAtHandover].join("/");
      }).join(" | ");
    }
    // a shift with NO seed given, the way most players start one
    var first = await shift({ seed: null, difficulty: "resident" }, function (G, w, D) {
      /* Take the signature BEFORE the night runs: the nurse titrates the oxygen, so an
         end-of-shift reading compares what the unit became against what the next one starts
         as, and fails on a feature that is working. */
      var sig = signature(G), btnAt = null, guard = 0;
      while (G.running && guard++ < 3000) { if (clearDialog(G, D)) continue; G.advance(30); }
      var b = D.getElementById("relive");
      if (b) btnAt = { label: b.textContent.trim(), tip: b.getAttribute("data-tip") || "" };
      return { sig: sig, seed: G.seedVal, cfgSeed: null, btn: btnAt,
               stored: JSON.parse(sessionStorage.getItem("nicuGameCfg") || "{}").seed };
    });
    ok(!first.errs.length, "no exceptions", first.errs.join(" | "));
    ok(first.btn, "the report offers the button");
    ok(/again/i.test(first.btn.label), "and says what it does", first.btn.label);
    ok(first.btn.tip.indexOf(String(first.seed)) >= 0,
       "and names the seed it will use", first.btn.tip.slice(0, 70));
    ok(first.seed > 0, "the shift resolved a seed of its own even though none was given", first.seed);

    // now do what the button does: hand that resolved seed back
    var second = await shift({ seed: first.seed, difficulty: "resident" }, function (G, w, D) {
      return { sig: signature(G), seed: G.seedVal };
    });
    ok(!second.errs.length, "no exceptions second time", second.errs.join(" | "));
    ok(second.sig === first.sig, "and the same night comes back, baby for baby",
       second.sig.slice(0, 80) + "  vs  " + first.sig.slice(0, 80));

    // and a different seed does NOT, or the check above proves nothing
    var other = await shift({ seed: first.seed + 1, difficulty: "resident" }, function (G, w, D) {
      return { sig: signature(G) };
    });
    ok(other.sig !== first.sig, "while the next seed along is a different night");
  });

  suite("Living it again keeps the settings, not just the seed", async function () {
    /* This test used to stub window.location and skip itself when it could not - and it could
       not, so it passed while the button it was checking did nothing at all. The button was
       not in the delegated handler's selector list. Measure the config write instead: it
       happens before the navigation, so it is observable whatever the browser does next. */
    var r = await shift({ seed: 4321, difficulty: "student", hints: false, allowDeath: false },
      function (G, w, D) {
        var guard = 0;
        while (G.running && guard++ < 3000) { if (clearDialog(G, D)) continue; G.advance(30); }
        var btn = D.getElementById("relive");
        var registered = !!(btn && btn.closest(w.NG.CLICKABLE));
        /* Move ONLY the seed aside. Wiping the whole stored config proves nothing - the
           handler reads it and writes it back, so a wiped one comes back wiped - but a
           sentinel in the one field the handler sets itself shows the click landed, while
           leaving the settings there to check they survive. */
        var before = JSON.parse(sessionStorage.getItem("nicuGameCfg") || "{}");
        before.seed = -1;
        try { sessionStorage.setItem("nicuGameCfg", JSON.stringify(before)); } catch (e) {}
        if (btn) btn.click();
        var after = {};
        try { after = JSON.parse(sessionStorage.getItem("nicuGameCfg") || "{}"); } catch (e) {}
        return { btn: !!btn, registered: registered, before: before, after: after,
                 seed: G.seedVal, babies: G.babies.length };
      });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.btn, "the button is on the report");
    ok(r.registered, "and the delegated click handler knows about it - it is not a dead button");
    ok(r.after.seed === r.seed, "pressing it writes back the seed this shift ran on",
       "was -1, now " + r.after.seed + ", shift ran on " + r.seed);
    ok(r.after.difficulty === "student", "with the level it was played at", r.after.difficulty);
    ok(r.after.hints === false, "the thinking-prompts setting", "" + r.after.hints);
    ok(r.after.allowDeath === false, "and the death setting", "" + r.after.allowDeath);
    ok(r.babies === 4, "and it really was a student shift, so those settings matter", r.babies);
  });


  /* ==================================================== NO DEAD BUTTONS
     One delegated click handler reads a selector list, and anything not named in it is a
     button that does nothing at all - no error, no clue, and it looks exactly like a button
     that works. It has happened twice. */
  suite("Every button on the page actually does something", async function () {
    var dead = [], seen = 0, errs = [];
    function sweep(D, w, where) {
      var sel = w.NG.CLICKABLE;
      [].slice.call(D.querySelectorAll("#stage button, #side button, #callout button, #people button"))
        .forEach(function (btn) {
          seen++;
          // a button inside a form control or a dialog wires itself up directly
          if (btn.closest(".dialog") || btn.closest("#scrim")) return;
          if (btn.onclick) return;
          if (!btn.closest(sel)) dead.push(where + ": " + (btn.id || btn.textContent.trim().slice(0, 28)));
        });
    }
    var r = await shift({ seed: 5007, allowDeath: false }, async function (G, w, D) {
      sweep(D, w, "ward");
      // a bedside with people waiting, which is where most of the buttons are
      var b = G.babies[0];
      b.h.co2 = 80; b.h.co2Base = 40; b.h.bili = b.h.biliThreshold + 3; b.h.hgb = 7.5; b.labs.cbc = null;
      G.advance(20); w.NG.render();
      D.dispatchEvent(new w.KeyboardEvent("keydown", { key: String(G.babies.indexOf(b) + 1), bubbles: true }));
      await new Promise(function (res) { setTimeout(res, 120); });
      sweep(D, w, "bedside");
      var faces = D.querySelectorAll("#people .person-btn[data-concern]").length;
      // and the report, which is where the two dead ones actually were
      var guard = 0;
      while (G.running && guard++ < 3000) { if (clearDialog(G, D)) continue; G.advance(30); }
      await new Promise(function (res) { setTimeout(res, 120); });
      sweep(D, w, "report");
      return { faces: faces };
    });
    errs = r.errs;
    ok(!errs.length, "no exceptions", errs.join(" | "));
    ok(seen > 20, "there were buttons to check", seen + " across ward, bedside and report");
    ok(r.faces >= 2, "including a cot with more than one person waiting at it", r.faces + " faces");
    ok(!dead.length, "and every one of them is wired to the click handler", dead.join("  |  "));
  });

  /* ================================================ ONE CONVERSATION AT A COT
     From a playtest: "were two people trying to talk to me at the same bed? was one's
     message covering the other's? it just got very busy." They were - the callout showed
     whichever concern had been raised first and nothing said the others existed. */
  suite("Two people at one cot do not talk over each other", async function () {
    var r = await shift({ seed: 5007, allowDeath: false }, async function (G, w, D) {
      var b = G.babies[0];
      function faces() {
        return [].slice.call(D.querySelectorAll("#people .person-btn[data-concern]"))
          .map(function (f) {
            return { key: f.getAttribute("data-concern"),
                     open: /\bopen\b/.test(f.className), settled: /settled/.test(f.className) };
          });
      }
      function said() {
        var el = D.querySelector("#callout .co-say");
        return el ? el.textContent.trim().slice(0, 40) : "";
      }
      async function tick(ms) { w.NG.render(); await new Promise(function (r2) { setTimeout(r2, ms || 120); }); }

      b.h.co2 = 80; b.h.co2Base = 40; b.h.bili = b.h.biliThreshold + 3; b.h.hgb = 7.5; b.labs.cbc = null;
      G.advance(20);
      D.dispatchEvent(new w.KeyboardEvent("keydown", { key: String(G.babies.indexOf(b) + 1), bubbles: true }));
      await tick(200);

      var first = faces(), firstSaid = said();
      var openCount = first.filter(function (f) { return f.open; }).length;

      // switch to somebody else who is waiting
      var waiting = first.filter(function (f) { return !f.open && !f.settled; })[0];
      var switched = null, switchedSaid = null;
      if (waiting) {
        D.querySelector('[data-concern="' + waiting.key + '"]').click();
        await tick(200);
        switched = faces(); switchedSaid = said();
      }

      // leave and come back: the choice has to survive it
      D.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await tick(150);
      D.dispatchEvent(new w.KeyboardEvent("keydown", { key: String(G.babies.indexOf(b) + 1), bubbles: true }));
      await tick(200);
      var backSaid = said();

      // and somebody urgent arriving must not hijack the sentence you are in
      b.support.mode = "CPAP"; b.h.rds = 2.2; b.h.surfactant = 0.3;
      G.advance(20); await tick(200);
      var afterUrgent = faces(), urgentSaid = said();

      return { first: first, firstSaid: firstSaid, openCount: openCount,
               switched: switched, switchedSaid: switchedSaid, backSaid: backSaid,
               afterUrgent: afterUrgent, urgentSaid: urgentSaid,
               waitingKey: waiting && waiting.key };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.first.length >= 2, "two colleagues really were waiting at one cot", r.first.length);
    ok(r.openCount === 1, "exactly one of them has the floor", r.openCount + " open");
    ok(r.waitingKey, "and the others are there as faces you can click", r.waitingKey);
    ok(r.switched && r.switched.filter(function (f) { return f.open; }).length === 1,
       "clicking one of them switches, rather than opening a second conversation");
    ok(r.switchedSaid && r.switchedSaid !== r.firstSaid,
       "and the callout is now that person", r.firstSaid + "  ->  " + r.switchedSaid);
    ok(r.backSaid === r.switchedSaid,
       "leaving the cot and coming back keeps you with the person you chose", r.backSaid);
    /* By keys, not by count: a settled face can expire in the same stretch and hold the
       total still while the row has completely changed. */
    ok(r.afterUrgent.some(function (f) { return /^risingwork/.test(f.key); }),
       "somebody new arriving joins the row",
       r.afterUrgent.map(function (f) { return f.key; }).join(" "));
    ok(r.urgentSaid === r.switchedSaid,
       "without taking the conversation off you mid-sentence", r.urgentSaid);
  });

  suite("A concern that settles is news, not a chore", async function () {
    /* From the same playtest: "I was quickly buried in old messages that wanted me to
       dismiss them." They queued in the who-needs-you panel as tasks and each one needed a
       click at its bed. */
    var r = await shift({ seed: 5100, allowDeath: false }, function (G, w, D) {
      var b = G.babies[0];
      var c = { key: "made-up:" + b.bed, id: "cold", def: w.Events.CONCERNS.filter(function (x) { return x.id === "cold"; })[0],
                bed: b.bed, who: "renata", at: G.min, seen: true, seenAt: G.min, done: false,
                stale: true, staleAt: G.min, said: "Never mind, it sorted itself out.",
                summaryText: "cold at 35.9 degrees" };
      G.concerns.push(c);
      w.NG.render();
      var inPanel = D.body.innerHTML.indexOf("made-up:") >= 0;
      var panelRows = D.querySelectorAll("#side .task").length;
      // it goes on its own, without anybody clicking anything
      for (var i = 0; i < 4; i++) G.advance(5);
      var goneAfter = c.done ? Math.round(G.min) : null;
      return { inPanel: inPanel, panelRows: panelRows, done: !!c.done,
               retracted: !!c.retracted, at: goneAfter };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(!r.inPanel, "a settled concern is not a row in the who-needs-you panel");
    ok(r.done && r.retracted, "and it clears itself without being dismissed", "gone by " + r.at);
  });


  /* ========================================================= THIS BABY'S NIGHT
     The unit log is one stream for five cots, so "what has been done for THIS baby, and
     when" meant reading past everybody else - and a chest film from four hours ago looked
     exactly like one from ten minutes ago. */
  suite("Each cot keeps its own history", async function () {
    var r = await shift({ seed: 5007, allowDeath: false }, async function (G, w, D) {
      var b = G.babies[0], other = G.babies[1];
      G.doAction(b, "examine"); G.advance(5);
      G.doAction(b, "cxr");     G.advance(30);
      G.doAction(b, "glucose"); G.advance(60);
      G.doAction(b, "comfort"); G.advance(120);
      G.doAction(other, "examine");                 // somebody else's night
      D.dispatchEvent(new w.KeyboardEvent("keydown", { key: String(G.babies.indexOf(b) + 1), bubbles: true }));
      await new Promise(function (res) { setTimeout(res, 250); });

      var rows = [].slice.call(D.querySelectorAll("#hist .hrow")).map(function (n) {
        return { time: n.querySelector(".htime").textContent.trim(),
                 what: n.querySelector(".hwhat").textContent.trim(),
                 ago: n.querySelector(".hago").textContent.trim() };
      });
      var labRows = [].slice.call(D.querySelectorAll("#labs .lrow")).map(function (n) {
        return n.innerText.replace(/\s+/g, " ");
      });
      return { rows: rows, labRows: labRows,
               mine: (b.history || []).length, theirs: (other.history || []).length,
               markup: (b.history || []).filter(function (e) { return /[<>]/.test(e.text); })
                         .map(function (e) { return e.text.slice(0, 40); }),
               theirNames: (other.history || []).map(function (e) { return e.text; }).join(" ") };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.rows.length >= 5, "the panel lists what happened at this cot", r.rows.length + " rows");
    ok(r.rows.every(function (x) { return /^\d\d:\d\d$/.test(x.time); }),
       "every line carries the clock time it happened at", (r.rows[0] || {}).time);
    ok(r.rows.every(function (x) { return /ago|just now/.test(x.ago); }),
       "and how long ago that was", (r.rows[0] || {}).ago);

    // newest first, which is what you want standing at a cot
    var first = r.rows[0].time, last = r.rows[r.rows.length - 1].time;
    ok(first >= last, "newest first", first + " ... " + last);

    ok(/requested/.test(r.rows.map(function (x) { return x.what; }).join(" ")),
       "an order that has gone off says so, rather than reading like a result");
    ok(!r.markup.length, "and nothing stored carries raw markup into the page", r.markup.join(" | "));

    ok(r.theirs > 0 && r.theirs < r.mine, "another cot keeps its own, separately",
       r.mine + " here, " + r.theirs + " there");
    ok(!/Chest X-ray/.test(r.theirNames), "with nothing of this baby's in it", r.theirNames.slice(0, 60));

    // the point of the whole thing: an old result looks old
    var film = r.labRows.filter(function (t) { return /Chest X-ray/.test(t); })[0] || "";
    ok(/\d\d:\d\d/.test(film) && /ago/.test(film),
       "and a result on the Results list shows its age", film.slice(0, 70));
  });

  suite("A history that does not run away with itself", async function () {
    var r = await shift({ seed: 5100, allowDeath: true }, function (G, w, D) {
      var guard = 0;
      while (G.running && guard++ < 3000) { if (clearDialog(G, D)) continue; G.advance(20); }
      var lens = G.babies.map(function (b) { return (b.history || []).length; });
      var stray = G.babies.filter(function (b) {
        return (b.history || []).some(function (e) {
          return G.babies.some(function (o) { return o !== b && e.text.indexOf(o.name) >= 0; });
        });
      }).map(function (b) { return b.name; });
      return { lens: lens, stray: stray,
               ordered: G.babies.every(function (b) {
                 var h = b.history || [];
                 for (var i = 1; i < h.length; i++) if (h[i].at < h[i - 1].at) return false;
                 return true;
               }) };
    });
    ok(!r.errs.length, "no exceptions", r.errs.join(" | "));
    ok(r.lens.every(function (n) { return n > 0 && n <= 60; }),
       "a whole night leaves a readable history, not a wall", r.lens.join("/"));
    ok(r.ordered, "kept in the order things happened");
    ok(!r.stray.length, "and no cot's history mentions another cot's baby", r.stray.join(", "));
  });

  // ---------------------------------------------------------------- runner
  async function run() {
    var host = document.getElementById("results"), total = 0, failed = 0;
    for (var i = 0; i < suites.length; i++) {
      out = [];
      var box = document.createElement("section");
      box.className = "suite running";
      box.innerHTML = "<h2>" + suites[i].name + "</h2><div class='rows'>running…</div>";
      host.appendChild(box);
      var crash = null;
      try { await suites[i].fn(); } catch (e) { crash = e.message + " | " + String(e.stack || "").split("\n")[1]; }
      if (crash) out.push({ pass: false, what: "the suite itself threw", detail: crash });
      var bad = out.filter(function (r) { return !r.pass; }).length;
      total += out.length; failed += bad;
      box.className = "suite " + (bad ? "fail" : "pass");
      box.querySelector(".rows").innerHTML = out.map(function (r) {
        return "<div class='row " + (r.pass ? "ok" : "no") + "'><span class='mark'>" +
          (r.pass ? "✓" : "✕") + "</span><span>" + r.what + "</span>" +
          (r.detail ? "<span class='detail'>" + r.detail + "</span>" : "") + "</div>";
      }).join("");
    }
    var head = document.getElementById("summary");
    head.className = failed ? "fail" : "pass";
    head.textContent = failed ? (failed + " of " + total + " checks failed")
                              : ("all " + total + " checks passed");
  }

  window.addEventListener("DOMContentLoaded", run);
})();
