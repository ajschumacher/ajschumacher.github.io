/* NICU Night Shift — the delivery room, on screen.

   js/deliveries.js owns the five scenarios, the sixteen actions and the thin resuscitation
   physiology. This file is the other half: the room as a place you stand in - the timer,
   the baby, where things stand, the monitor, the checklist, and the decision about where
   the baby goes.

   Split out of game.js, which had grown to 2,870 lines doing eight separate jobs. Nothing
   here changed in the move: the bodies are the same ones, and what they reach for outside
   this file is now listed at the top instead of being implicit in a shared closure.

   Loads after game.js and talks to it through window.NG - the same seam actions.js and
   report.js already use. Everything is looked up when it is CALLED, never when the file
   loads, so there is no order to get wrong beyond game.js coming first.             */
(function () {
  "use strict";
  var G = window.G, S = window.Sim, EV = window.Events, A = window.Art,
      Snd = window.Sound, GL = window.Glossary, CL = window.Clinical;
  var NG = window.NG || (window.NG = {});

  /* How long the room waits before the labour ward registrar does it instead of you. It
     was twenty-five minutes, which is not long if the phone rings while you are part way
     through something at a cot - and missing the delivery room entirely is a poor way to
     lose the most involving five minutes in the game. */
  var ABANDON_AFTER = 45;

  /* ---- What this file borrows. Thin, and resolved at call time, so every body below is
     byte for byte the one that used to sit in game.js. ---- */
  function $(id) { return NG.$(id); }
  function esc(s) { return NG.esc(s); }
  function gl(s) { return NG.gl(s); }
  function cap(s) { return NG.cap(s); }
  function log(m, k) { return NG.log(m, k); }
  function addScore(n, w, k) { return NG.addScore(n, w, k); }
  function showCost(l) { return NG.showCost(l); }
  function playerActed() { return NG.playerActed(); }
  function notice() { return NG.notice(); }
  function render() { return NG.render(); }
  function setHtml(el, html) { return NG.setHtml(el, html); }
  function syncStickyOffsets() { return NG.syncStickyOffsets(); }
  function vT(c, l, v, bad, tip) { return NG.vT(c, l, v, bad, tip); }
  function anyFresh(list, note) { return NG.anyFresh(list, note); }
  function pushReply(c, good, text) { return NG.pushReply(c, good, text); }
  function replyClass(r) { return NG.replyClass(r); }

  /* ----------------------------------------------------------- delivery room
     Delivery is a place. The phone tells you a baby is coming and you hang up; the
     delivery room appears in the ward as somewhere to go, and you go there by clicking
     it. Inside it works like a bedside - a colleague tells you what they see, you press
     real controls, and each one answers - and you leave by deciding what happens to the
     baby. See js/deliveries.js for the scenarios and what they need. */
  var DEL = window.Deliveries;

  /* Chosen when the phone rings, not when you arrive, so the caller can tell you what is
     actually coming rather than describing a different baby.

     Drawn without replacement. An Attending night is called down twice, and being called
     to the same thirty-four weeker grunting on the warmer a second time would read as the
     game running out of ideas rather than as a second baby. */
  G.pickDelivery = function () {
    if (!G.pendingDelivery) {
      var used = G.deliveriesSeen || (G.deliveriesSeen = []);
      var pool = DEL.SCENARIOS.filter(function (sc) { return used.indexOf(sc.id) < 0; });
      if (!pool.length) pool = DEL.SCENARIOS;
      G.pendingDelivery = pool[Math.floor(S.rnd() * pool.length) % pool.length];
    }
    return G.pendingDelivery;
  };

  G.summonDelivery = function () {
    /* A FINISHED one does not block the next. G.delivery deliberately stays set after the
       room is done, because that is how the ward pod knows to stop inviting you down -
       so the guard has to be about a delivery still RUNNING, not about one having
       happened at all. */
    if (G.delivery && G.delivery.state !== "done") return;
    var sc = G.pickDelivery();
    var st = sc.start;
    G.delivery = {
      sc: sc, state: "called", calledAt: G.min, sec: 0,
      hr: st.hr, breathing: st.breathing, tone: st.tone, temp: st.temp, sat: st.sat,
      fio2: st.fio2, wet: !!st.wet, obstructed: !!st.obstructed, apnoeic: !!sc.apnoeic,
      warm: false, airway: false, ppv: false, ppvEffective: false, intubated: false,
      cpap: false, surf: false, compress: false, adrenaline: false, skinToSkin: false,
      apgar1: null, apgar5: null, clampedAt: null,
      skin: S.pick(["a", "b", "c", "d"]),
      good: 0, bad: 0, said: null, tookOver: false
    };
    G.delivery.said = sc.brief;
    G.pendingDelivery = null;
    (G.deliveriesSeen || (G.deliveriesSeen = [])).push(sc.id);
    log("The delivery room is waiting for you. " + cap(sc.label) + ".", "hi");
    notice();
    render();          // the room has to appear in the ward now, not on the next tick
    Snd.attention(true);
  };

  /* The baby does not wait. Whether you never came or stepped out and did not come back,
     after forty-five minutes the labour ward registrar does it instead of you. Standing
     in the room does not count as away, so nobody is punished for taking their time. */
  function checkDeliveryAbandoned() {
    var d = G.delivery;
    if (!d || d.state === "done") return;
    if (G.view.mode === "delivery") { d.awayAt = null; return; }
    if (d.awayAt == null) d.awayAt = d.state === "called" ? d.calledAt : G.min;
    if (G.min - d.awayAt < ABANDON_AFTER) return;
    var started = d.state === "here";
    d.state = "done"; d.tookOver = true;
    addScore(started ? -6 : -8, started ? "Walked out of the delivery room part way through"
                                        : "Never went to the delivery room");
    log(started ? "You did not go back down, and the labour ward registrar finished the resuscitation."
                : "Nobody went down to the delivery room. The registrar from the labour ward went instead.", "bad");
    if (d.sc.arrival) { G.admissionDue = G.min + 10; G.admissionFrom = arrivalOf(d.sc, true); G.admissionPoor = true; }
  }

  function enterDelivery() {
    var d = G.delivery; if (!d || d.state === "done") return;
    /* Three minutes, charged as three. G.advance rounds to whole five-minute ticks, so
       walking down to the delivery room cost the player five - the sub-tick accumulator is
       how the delivery room already charges its own thirty-second actions. */
    if (d.state === "called") {
      d.state = "here"; d.arrivedAt = G.min;
      G.acc += 3; showCost("3 min");
    }
    d.awayAt = null;
    G.view = { mode: "delivery", bed: null };
    Snd.click(); playerActed();
    /* render() deliberately leaves the delivery stage alone on the clock tick, so it does
       not redraw under the player's hands; drawing it is this function's job and
       doDelivery's. */
    render();
    renderDelivery();
  }
  G.enterDelivery = enterDelivery;

  function leaveDelivery(finished) {
    var d = G.delivery;
    if (d && !finished && d.state === "here") {
      d.awayAt = G.min;                        // the clock on somebody else taking over starts now
      log("You step out of the delivery room. Priya carries on bagging until you are back.", "warn");
    }
    G.view = { mode: "ward", bed: null };
    render();
  }

  function deliveryQuality(d) {
    var wanted = d.sc.wants || [];
    var hit = wanted.filter(function (id) { return d.did && d.did[id]; }).length;
    return { hit: hit, of: wanted.length, warm: d.temp >= 36.3, hr: d.hr >= 100,
             clean: d.bad === 0, ok: hit >= Math.ceil(wanted.length * 0.75) && d.hr >= 100 };
  }

  function deliveryReady(d) {
    return d.hr >= 100 && (d.breathing > 0.45 || d.intubated || d.cpap) && d.sec >= 120;
  }

  G.doDelivery = function (id) {
    var d = G.delivery; if (!d || d.state !== "here") return;
    var a = DEL.ACTIONS[id]; if (!a) return;
    var r = a.run(d, d.sc) || {};
    d.did = d.did || {}; d.did[id] = true;
    /* One cost, counted once. The action's seconds move the resuscitation, and the very
       same seconds go into the shift clock's accumulator - going through G.advance would
       round a thirty-second action up to a whole five-minute tick. */
    DEL.advance(d, d.sc, a.cost);
    G.acc += a.cost / 60;
    showCost(a.cost + " sec");
    if (r.good === true) { d.good++; addScore(3, "Delivery room: " + a.t); Snd.ok(); }
    else if (r.good === false) { d.bad++; addScore(-3, "Delivery room: " + a.t); Snd.bad(); }
    if (r.text) pushReply(d, r.good, r.text);
    if (!G.running) return;
    renderDelivery();
  };

  /* Which baby comes up to the unit, resolved here rather than in finishAdmission, so a
     scenario whose right answer is that NOBODY comes up can still say who arrives on
     the path where the player admits them anyway. Without this the well 39-week baby
     you separated from her mother arrived on the unit as somebody else's 30-week preemie.
     The cot itself is not known yet - it is the lowest free one eight minutes from now,
     and this line used to promise bed 6 whatever actually happened. */
  function arrivalOf(sc, admitted) {
    var arr = admitted && !sc.arrival ? sc.arrivalIfAdmitted : sc.arrival;
    return arr ? { arrival: arr, ga: sc.ga } : null;
  }

  /* `where` is "unit" or "mother", and it is the actual decision now rather than a
     consequence of whether the player happened to press an action earlier in the room. */
  G.finishDelivery = function (where) {
    var d = G.delivery; if (!d || d.state !== "here") return;
    if (!deliveryReady(d)) return;
    var stay = stayOption(d);
    if (where === "mother" && !stay.ok) return;             // the button is disabled anyway
    var q = deliveryQuality(d);
    d.state = "done"; d.finishedAt = G.min;
    /* Where the baby actually WENT, which is not the same as whether the player pressed
       "Baby to the mother" during the resuscitation. Putting her on her mother's chest for
       a minute and then carrying her upstairs is a real thing to do, and the closing line
       used to read the action instead of the decision - so admitting her printed "Skin to
       skin with her mother. Nothing for the unit." */
    d.wentTo = where === "mother" ? "mother" : "unit";

    if (where === "mother") {
      d.skinToSkin = true;
      // right for a baby who never needed you, and the game only offers it when that holds
      addScore(8, "Left a well baby with the parents instead of admitting them");
      log("You left the delivery room without a baby, which was the whole point of it.", "good");
    } else if (d.sc.arrival) {
      G.admissionDue = G.min + 8; G.admissionFrom = arrivalOf(d.sc, true); G.admissionPoor = !q.ok;
      log("Taking Baby up from the delivery room to the unit.", "hi");
    } else {
      /* A baby the room was built to send home with her mother, admitted anyway. If the
         option to leave her was open and the player took the unit instead, that is a
         decision and it costs. If they had already closed it - by bagging a baby who was
         breathing - the score for that was taken at the time. */
      if (stay.ok) addScore(-4, "Admitted a well baby who did not need admitting");
      log("A well term baby was admitted to the unit anyway, and separated from her mother for it.", "warn");
      G.admissionDue = G.min + 8; G.admissionFrom = arrivalOf(d.sc, true); G.admissionPoor = false;
    }
    /* The closing line has to describe the night the player actually had. It used to be
       one fixed sentence per scenario, so "nothing for the unit" printed one line above
       "a well term baby was admitted to the unit anyway". */
    var done = typeof d.sc.done === "function" ? d.sc.done(d, q)
             : (!q.ok && d.sc.doneRough) ? d.sc.doneRough : d.sc.done;
    log("Delivery room: " + done, q.ok ? "good" : "");
    leaveDelivery(true);
  };

  /* `d.tone` is MUSCLE tone, 0..1, and `d.skin` is the skin tone letter Art wants. The two
     used to collide on one name, so this read `d.sc.tone`, which no scenario has, and every
     baby born in the delivery room came out the same colour. */
  function deliveryLook(d) {
    var helped = d.ppvEffective || d.intubated;
    var working = d.breathing > 0.35 && d.breathing < 0.75 && !d.cpap && !d.intubated;
    return { tone: d.skin || "b",
             color: d.sat > 85 ? "pink" : d.sat > 65 ? "dusky" : "mottled",
             jaundice: 0, eyes: d.breathing > 0.5 ? "open" : "closed",
             apneic: d.breathing < 0.25 && !helped,
             pain: 0,
             effort: d.cpap || d.intubated ? 0.2 : working ? 0.7 : d.breathing >= 0.75 ? 0.25 : 0.1,
             support: d.intubated ? "VENT" : d.cpap ? "CPAP" : "RA",
             stress: 1 - d.tone, swaddled: false, hat: d.warm ? "warm" : null,
             awake: d.breathing > 0.5 };
  }

  function deliveryAlt(look, d) {
    look.alt = "The baby: " +
      ({ pink: "pink", dusky: "dusky", mottled: "mottled and grey" })[look.color] + ", " +
      (look.apneic ? "not breathing" : look.effort > 0.55 ? "working hard to breathe" : "breathing") + ", " +
      (d.warm ? "dried and under the warmer" : "still wet and uncovered") + ", heart rate " +
      Math.round(d.hr) + ", saturation " + Math.round(d.sat) + " percent.";
    return look;
  }

  /* Split the same way the bedside is, and for the same reason: the room is built once,
     and the parts that move - the timer, the baby, where things stand, the monitor, the
     gate on leaving - are refreshed on the clock. Rebuilding the whole page five times a
     second would take the buttons out from under the player's hands. */
  function deliveryTimer(d) {
    return Math.floor(d.sec / 60) + ":" + ("0" + Math.floor(d.sec % 60)).slice(-2);
  }

  function deliveryStandingHtml(d) {
    var r = DEL.response(d);
    return lrow("Warm", d.warm ? "dried, hat, warmer" : "still wet and uncovered", !d.warm) +
      lrow("Airway", d.intubated ? "breathing tube" : d.cpap ? "CPAP" : d.ppv ? (d.ppvEffective ? "mask, chest moving" : "mask, chest NOT moving") : d.airway ? "positioned" : "not opened", d.ppv && !d.ppvEffective) +
      lrow("Apgar", (d.apgar1 == null ? "not scored" : d.apgar1 + " at 1 min") +
                    (d.apgar5 == null ? "" : ", " + d.apgar5 + " at 5 min"), false) +
      // what the baby is saying back to you, which is the whole feedback loop of a resus
      '<div class="lrow del-response ' + (r.k || "") + '"><span>Response</span><span>' + gl(r.t) + "</span></div>";
  }

  // an arrow, so a number tells you which way it is going and not only where it is
  function arrow(dir) {
    return dir > 0 ? '<span class="tr up" title="rising">&#9650;</span>'
         : dir < 0 ? '<span class="tr down" title="falling">&#9660;</span>'
                   : '<span class="tr flat" title="steady">&#9644;</span>';
  }

  function deliveryMonitorHtml(d) {
    var tgt = DEL.satTarget(d.sec);
    return '<div class="vitals">' +
      vT("hr", "HR", Math.round(d.hr) + arrow(DEL.trend(d, "hr")), d.hr < CL.delivery.hrAdequate,
         Math.round(d.hr) + " beats per minute, and the arrow is which way it has moved in the last half minute. " +
         "This is your read on whether what you are doing is working. Under 100 in a newborn means they are short " +
         "of air until proven otherwise; under 60 after good breaths is when compressions start.") +
      vT("spo2", "SpO2", Math.round(d.sat) + '<span class="tgt">/' + tgt + "</span>" + arrow(DEL.trend(d, "sat")),
         d.sat < tgt - 5,
         Math.round(d.sat) + " percent against a target of about " + tgt + " for " + Math.max(1, Math.round(d.sec / 60)) +
         " minute" + (d.sec >= 120 ? "s" : "") + " of age - that is the second number. Newborn saturations are " +
         "supposed to climb slowly, so being under the target matters and being over it is not a prize.") +
      vT("rr", "Effort", d.breathing > 0.6 ? "good" : d.breathing > 0.25 ? "weak" : "none", d.breathing <= 0.25,
         "How much breathing the baby is doing for themselves, from none through occasional gasps to a proper cry.") +
      vT("temp", "T", d.temp.toFixed(1), d.temp < CL.temp.coldStress,
         d.temp.toFixed(1) + " degrees. Below 36.5 a newborn burns sugar and oxygen keeping warm, and a cold baby " +
         "resuscitates badly.") +
      "</div><div class=\"muted mono\" style=\"font-size:.82rem;margin-top:8px\">" +
      GL.tip("oxygen " + Math.round(d.fio2 * 100) + "%", "What the blender is set to. Start a preterm baby at 21 to 30 percent " +
             "and follow the saturation target rather than pushing it up.") + "</div>";
  }

  /* A checklist rather than a sentence. The three conditions never changed, but they were
     written out as prose only while they were unmet, so there was no way to see which of
     them you had already got - or to watch one tick over as you worked. */
  /* CAN THIS BABY STAY WITH HER MOTHER?
     The exit used to promise "decide where they go" and offer one button, because the
     decision had already been made earlier by whether you pressed "Baby to the mother"
     during the resuscitation. Now the exit IS the decision, which is what the sentence
     says and what happens in a real delivery room.

     A baby stays only if she never needed you: term enough, breathing for herself, warm,
     and never given breaths. That last one has a consequence worth having - bag a vigorous
     baby who did not need it and you have taken away the option of leaving her with her
     mother, which is exactly what an unnecessary intervention costs a family. */
  function stayOption(d) {
    var sc = d.sc;
    if (sc.ga < 36) return { ok: false, why: "at " + sc.ga + " weeks this baby needs the unit whatever else is true" };
    if (d.intubated) return { ok: false, why: "there is a breathing tube in" };
    if (d.cpap) return { ok: false, why: "this baby is on CPAP" };
    if (d.compress) return { ok: false, why: "a baby who needed compressions needs watching, for hours" };
    if (d.ppv) return { ok: false, why: "a baby who needed breaths given to them needs watching for a few hours" };
    if (d.breathing <= 0.6) return { ok: false, why: "not breathing well enough to be assessed on somebody's chest" };
    if (d.hr < CL.delivery.hrAdequate) return { ok: false, why: "the heart rate is only " + Math.round(d.hr) };
    /* Hypothermia, not cold stress. The first version of this barred a baby at 36.1 from
       her mother's chest, which is exactly backwards: skin to skin is how you warm a
       slightly cold newborn. Below 36 she needs a warmer first, and that is the unit. */
    if (d.temp < CL.temp.hypothermia)
      return { ok: false, why: "at " + d.temp.toFixed(1) + " she needs active warming first" };
    return { ok: true, why: "", cool: d.temp < CL.temp.normalLow };
  }

  function deliveryChecksHtml(d) {
    var checks = [
      [d.hr >= CL.delivery.hrAdequate, "Heart rate over 100", Math.round(d.hr)],
      /* "neither" read as nothing-is-happening on a baby whose effort was climbing nicely -
         the monitor said "weak" three inches away and the checklist said she had nothing.
         It now says which it is, so a player who is nearly there can tell. */
      [d.breathing > 0.45 || d.intubated || d.cpap, "Breathing, or held on CPAP or a tube",
       d.intubated ? "breathing tube" : d.cpap ? "CPAP"
         : d.breathing > 0.6 ? "breathing well" : d.breathing > 0.45 ? "breathing"
         : d.breathing > 0.25 ? "weak, not yet" : "not breathing"],
      [d.sec >= CL.delivery.minSecondsBeforeLeaving, "Two minutes since birth", deliveryTimer(d)]
    ];
    return checks.map(function (c) {
      return '<div class="del-check ' + (c[0] ? "done" : "") + '"><span class="tick">' +
        (c[0] ? "&#10003;" : "&#9711;") + "</span><span>" + c[1] +
        '</span><span class="val">' + esc(String(c[2])) + "</span></div>";
    }).join("");
  }

  // built once; only the disabled state and the reasons change afterwards
  function deliveryChoicesHtml(d) {
    return '<p class="muted del-gate" id="delGate"></p>' +
      '<div class="del-choices">' +
      '<button class="btn" data-leave="unit" data-focus-key="delUnit">Take the baby up to the unit</button>' +
      '<button class="btn ghost" data-leave="mother" data-focus-key="delMother">Leave the baby with the parents</button>' +
      '</div><p class="muted del-why" id="delWhy"></p>';
  }

  function updateDeliveryChoices(d) {
    var ready = deliveryReady(d), stay = stayOption(d);
    var gate = $("delGate"), why = $("delWhy");
    var unit = $("stage").querySelector('[data-leave="unit"]');
    var mother = $("stage").querySelector('[data-leave="mother"]');
    if (!unit || !mother) return;
    unit.disabled = !ready;
    mother.disabled = !ready || !stay.ok;
    if (gate) gate.textContent = ready
      ? "Stable enough to move. Where do they go?"
      : "Nobody leaves this room until all three are true.";
    if (why) why.textContent = !ready ? ""
      : stay.ok ? (stay.cool
          ? "Nothing here needs the unit, and a chest is the best warmer in the building."
          : "Nothing here needs the unit. Leaving them with their parents is a decision, not a default.")
        : "They cannot stay with the parents: " + stay.why + ".";
  }

  function updateDeliveryLive() {
    var d = G.delivery;
    if (!d || d.state !== "here" || G.view.mode !== "delivery") return;
    if (!$("delTimer")) return;                            // the room is not built yet
    setHtml($("delTimer"), GL.tip(deliveryTimer(d) + " since birth",
      "How long the baby has been out. The first minute is the one that matters most, and the saturation is " +
      "meant to climb slowly across the first ten."));
    setHtml($("delCrib"), A.baby(deliveryAlt(deliveryLook(d), d)));
    setHtml($("delStanding"), deliveryStandingHtml(d));
    setHtml($("delMonitor"), deliveryMonitorHtml(d));
    setHtml($("delChecks"), deliveryChecksHtml(d));
    // the buttons themselves are never rebuilt, so they cannot vanish mid-click
    updateDeliveryChoices(d);
  }

  function renderDelivery() {
    var d = G.delivery;
    if (!d || d.state !== "here") { G.view = { mode: "ward", bed: null }; render(); return; }
    var sc = d.sc;
    var h = '<div class="bedside-head"><button class="btn ghost small" id="delLeave">&larr; Step out to the unit</button>' +
      '<span class="bed-badge bed-c6">DR</span>' +
      "<h2>Delivery room</h2>" +
      '<span class="muted">' + esc(sc.label) + " &middot; <span id=\"delTimer\"></span></span></div>";
    h += '<p class="del-warn">Priya holds things steady while you are away, but she cannot take the ' +
         "next step without you. Come back within about forty-five minutes, or the labour ward " +
         "registrar takes over from you.</p>";

    h += '<div id="callout"></div>';
    h += '<div class="bed-grid"><div>' +
      '<div class="crib del-crib" id="delCrib"></div>' +
      '<div class="panel"><h4>What you were told</h4><div class="muted" style="font-size:.9rem">' +
      gl(sc.call) + "</div></div>" +
      '<div class="panel"><h4>Where things stand</h4><div class="labs" id="delStanding"></div></div>' +
      "</div><div>";

    h += '<div class="monitor del-monitor" id="delMonitor"></div>';

    DEL.GROUPS.forEach(function (g) {
      var ids = Object.keys(DEL.ACTIONS).filter(function (id) { return DEL.ACTIONS[id].g === g[1]; });
      if (!ids.length) return;
      h += '<div class="panel"><h4>' + g[0] + '</h4><div class="act-grid">';
      ids.forEach(function (id) {
        var a = DEL.ACTIONS[id];
        h += '<button class="act" data-del="' + id + '" data-focus-key="del-' + id +
             '" data-tip="' + esc(a.info) + '">' +
             '<span class="t">' + a.t + '</span><span class="c">' + a.cost + " sec</span>" +
             '<span class="qmark">?</span></button>';
      });
      h += "</div></div>";
    });

    h += '<div class="panel del-finish"><h4>When you are done here</h4>' +
         '<div id="delChecks"></div>' + deliveryChoicesHtml(d) + "</div>";

    $("stage").innerHTML = h + "</div></div>";
    updateDeliveryLive();
    renderDeliveryCallout();
    syncStickyOffsets();
  }

  function lrow(k, v, bad) {
    return '<div class="lrow"><span>' + esc(k) + '</span><span class="' + (bad ? "abn" : "") + '">' + gl(v) + "</span></div>";
  }

  function renderDeliveryCallout() {
    var d = G.delivery, box = $("callout"); if (!box || !d) return;
    var ch = EV.CHARS.priya;
    var html = '<div class="callout urgent"><div class="co-av">' + A.avatar(ch.av) + "</div><div class='co-body'>" +
      "<div class='co-who'>" + esc(ch.name) + "</div>" +
      "<div class='co-say'>" + gl(d.said) + "</div>";
    if (G.nudges && d.sc.nudge) html += '<div class="nudge">🤔 ' + gl(d.sc.nudge) + "</div>";
    if (G.nudges && d.sc.help) html += '<div class="help">🧭 <b>Where to act.</b> ' + gl(d.sc.help) + "</div>";
    var fresh = anyFresh(d.replies);
    (d.replies || []).forEach(function (r) {
      html += '<div class="co-reply ' + replyClass(r) + '">' + gl(r.text) + "</div>";
    });
    html += "</div></div>";
    box.innerHTML = html;
    if (fresh) box.scrollTop = box.scrollHeight;
  }

  /* The delivery room sits in the ward like a bedspace, so that going there is a place you
     click rather than an overlay that happens to you. Quiet all night until it is not. */
  function deliveryPod() {
    var d = G.delivery, waiting = d && d.state === "called";
    if (!waiting && (!d || d.state !== "here")) {
      /* "Nothing more tonight" has to be true. An Attending night is called down twice,
         so between the two this says the honest thing instead. */
      var done = (G.deliveriesSeen || []).length;
      var been = d && d.state === "done" && done >= (G.deliveriesExpected || 1);
      var between = d && d.state === "done" && !been;
      return '<div class="pod empty del-pod"><div class="pod-head"><div><div class="pod-name">Delivery room</div>' +
        '<div class="pod-meta">two floors down</div></div><div class="bed-no">DR</div></div>' +
        '<div class="muted" style="padding:18px 4px">' +
        (been ? "Nothing more from down there tonight."
              : between ? "Quiet down there for the moment. They will ring if that changes."
              : "Nobody is asking for you. If a baby is coming, the phone rings first.") +
        "</div></div>";
    }
    return '<div class="pod del-pod has-concern concern-urgent">' +
      '<button type="button" class="pod-hit" id="podDelivery" data-focus-key="delivery" aria-label="Delivery room, two floors down. ' +
      esc(d.sc.label) + '. ' + (waiting ? "They are waiting for you." : "You are part way through down here.") +
      '"></button>' +
      '<div class="pod-flags"><span class="flag urgent">' + A.miniAvatar(EV.CHARS.priya.av) +
      "<span>needs you now</span></span></div>" +
      '<div class="pod-head"><div><div class="pod-name">Delivery room</div>' +
      '<div class="pod-meta">' + esc(d.sc.label) + "</div></div><div class=\"bed-no\">DR</div></div>" +
      '<div class="muted" style="padding:14px 4px 6px">' +
      (waiting ? "They are waiting for you. Click to go down."
               : "You are part way through down here. Click to go back.") +
      "</div></div>";
  }

  /* ---- And what it hands back. game.js keeps thin delegates of these, so its own call
     sites did not have to change either. ---- */
  NG.checkDeliveryAbandoned = checkDeliveryAbandoned;
  NG.leaveDelivery = leaveDelivery;
  NG.updateDeliveryLive = updateDeliveryLive;
  NG.renderDelivery = renderDelivery;
  NG.deliveryPod = deliveryPod;
  NG.enterDelivery = enterDelivery;
})();
