/* NICU Night Shift — game loop, interface, scoring. */
(function () {
  "use strict";
  var S = window.Sim, P = window.Patients, EV = window.Events, A = window.Art,
      Snd = window.Sound, GL = window.Glossary, CL = window.Clinical;
  /* Internals shared with the files loaded alongside this one - js/report.js today.
     Everything on it is called at run time, so nothing here depends on load order. */
  var NG = window.NG || (window.NG = {});

  var SHIFT_START = 19 * 60, SHIFT_LEN = 12 * 60;

  /* ===================================================================
     HOW TIME MOVES

     There used to be 1x / 2x / 4x buttons, which were not speeds at all: "1x" ran the
     clock at about a hundred and twenty-five times real time. The player was being asked
     to set a number that meant nothing to them.

     Now nobody sets it. Where you are and what is waiting for you decide it:

       - with a baby, in the delivery room, or with the phone ringing, the clock walks:
         one real second is thirty seconds of the night. Long enough to feel the minutes,
         slow enough to think.
       - watching the whole unit with nothing happening, it runs on, and if you stand
         there it accelerates. That is how you get through the hour an echo takes.
       - a decision on screen stops it dead.

     Two kinds of interruption, and the difference matters. A HOLD is a baby in real
     trouble: no fast-forwarding past it, ever. A NOTICE is something new arriving - a
     colleague, a parent, a result - which resets the run-up so you get a beat to see it,
     and then lets the clock build again if you do nothing. If a waiting parent held the
     clock the way a red alarm does, the first conversation of the night would switch
     fast-forward off for good, because conversations never expire.
     =================================================================== */
  var FRAME_MS = 200;                  // how often the clock is looked at, in real time
  var RATE = {
    delivery: 1 / 60,                  // a resuscitation runs in real time. See below.
    bedside: 0.5,                      // game minutes per real second: 1s = 30s of the night
    ward: 1.5,                         // moving around the unit
    fast: 8                            // standing and letting the night run: 1 game hour / 7.5s
  };
  /* The delivery room is the one place in this game where the clock is honest, because it
     is the one place the medicine is written in seconds: the saturation target moves
     minute by minute, compressions come in thirty-second cycles, and the first minute is
     the first minute. Compressing that the way a twelve-hour shift is compressed would
     make the algorithm meaningless, so down there a second is a second.

     It is a different RATE, not a different clock. `d.sec` and the shift clock are both
     advanced from the same number in frame(), so they cannot drift. They used to: an
     action moved the resuscitation by its own cost in seconds and the shift by twice that
     in minutes, while the resuscitation itself froze solid between button presses - the
     baby's temperature fell only when you touched something. */
  var IDLE_BEFORE_FAST = 3.5;          // real seconds of nothing before the clock builds
  var RAMP_SECONDS = 2.5;              // and how long it takes to get there

  var G = window.G = {
    min: 0, babies: [], paused: true, running: false,
    // clock bookkeeping: minutes accumulated but not yet stepped, how far the visible
    // clock is behind the truth, and when the player last did or was shown anything
    acc: 0, clockLag: 0, clockCost: 0, clockRate: 0, lastInput: 0, lastNotice: 0,
    logLines: [], trust: 55, knowledge: 0, score: 0, scoreItems: [],
    difficulty: "resident", allowDeath: true, hints: true, nudges: true,
    view: { mode: "ward", bed: null },
    concerns: [], talks: [], watches: [], call: null, callHistory: {},
    fired: {}, cooldowns: {}, declined: {}, dialogOpen: false, dialogQueue: [],
    crisis: null, admissionDue: null, admissionDone: false, admissionColder: false,
    delivery: null, admissionFrom: null, admissionPoor: false, note: null,
    /* Which conversation is open at each bed, by concern key. Two colleagues can want you
       about the same baby, and before this the callout simply showed whichever had been
       raised first, with nothing to say the other was there - so one person's message
       silently covered another's. */
    openConcern: {},
    nameUsed: {}, seedVal: 1,
    metrics: { safetyCatches: 0, overrides: 0, calledForHelp: 0, exams: 0, draws: 0,
               concernsAnswered: 0, concernsMissed: 0, callsAnswered: 0, callsMissed: 0, talksOffered: 0,
               talksHad: 0 }
  };

  function $(id) { return document.getElementById(id); }
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function clockStr(m) {
    var t = (SHIFT_START + m) % 1440;
    return ("0" + Math.floor(t / 60)).slice(-2) + ":" + ("0" + Math.floor(t % 60)).slice(-2);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function gl(s) { return GL.markup(esc(s)); }
  /* Authored text may be a plain string or a function of the baby. Use a function whenever
     the line refers to the baby or to the colleague saying it, so pronouns and their verbs
     agree: "they are jittery", not "they is jittery". See the pronoun helper in names.js. */
  function say(v, b) { return typeof v === "function" ? v(G, b) : v; }

  /* The one place the game speaks to a screen reader. Called when something actually
     happens, never on a render, because the callout and the side panel rebuild their
     innerHTML every tick and would otherwise re-read the whole unit every few seconds.
     The zero-width reset makes two identical messages in a row announce twice. */
  function announce(msg) {
    var n = $("announcer");
    if (!n || !msg) return;
    n.textContent = "";
    n.textContent = String(msg).replace(/<[^>]*>/g, "");
  }
  G.announce = announce;

  /* A decision's label ends up in the report, so it has to end on a word. It was a hard
     slice at 54 characters, which produced entries like "Sit down and say honestly what you
     know, what you do n" in a section headed "Decisions that mattered". */
  function shortLabel(t, n) {
    t = String(t).replace(/["\u201c\u201d]/g, "").trim();
    n = n || 68;
    if (t.length <= n) return t;
    var cut = t.slice(0, n);
    var sp = cut.lastIndexOf(" ");
    return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.]$/, "") + "\u2026";
  }

  function log(msg, kind) {
    G.logLines.unshift({ t: clockStr(G.min), m: msg, k: kind || "" });
    if (G.logLines.length > 140) G.logLines.pop();
  }
  function addScore(n, why, kind) {
    G.score += n;
    if (why) G.scoreItems.push({ n: n, why: why, t: clockStr(G.min), kind: kind || "clinical" });
  }
  G.log = log; G.addScore = addScore;

  G.parentPresent = function (b) {
    if (b.died || b.discharged) return false;
    var h = (SHIFT_START + G.min) / 60 % 24;
    var w = b.visitWindow || [19, 23];
    if (w[0] <= w[1]) return h >= w[0] && h < w[1];
    return h >= w[0] || h < w[1];
  };

  /* Run the same night over. The stored config is reused rather than rebuilt so the level,
     the prompts and the death setting all come back identical - change any of those and it
     is a different shift wearing the same seed - and the seed written back is G.seedVal, the
     one this shift RESOLVED to, which is what makes it work for a player who left the box
     empty and got a random night worth repeating. */
  function reliveShift() {
    var cfg = {};
    try { cfg = JSON.parse(sessionStorage.getItem("nicuGameCfg") || "{}"); } catch (e) {}
    cfg.seed = G.seedVal;
    cfg.sound = Snd.isOn();
    try { sessionStorage.setItem("nicuGameCfg", JSON.stringify(cfg)); } catch (e) {}
    // location.search carries the build tag, so the reload is cache-busted the same way
    location.href = "game.html" + (location.search || "");
  }

  /* ------------------------------------------------------- this baby's night
     The unit log is one stream for five cots, so "what has actually been done for THIS baby,
     and when" meant reading past everybody else. Each cot keeps its own, and every entry
     carries the clock time it happened at - which is the whole point of it: a chest film from
     four hours ago and one from ten minutes ago are different pieces of information and used
     to look identical. */
  var HISTORY_MAX = 60;

  function recordHistory(b, kind, text) {
    if (!b || !text) return;
    if (!b.history) b.history = [];
    b.history.push({ at: G.min, t: clockStr(G.min), kind: kind, text: text });
    if (b.history.length > HISTORY_MAX) b.history.shift();
  }

  /* How long ago, in the units a person would say it in. Ages are the reason this exists. */
  function agoStr(min) {
    var d = Math.max(0, Math.round(G.min - min));
    if (d < 5) return "just now";
    if (d < 60) return d + " min ago";
    var hr = Math.floor(d / 60), rem = d % 60;
    return hr + "h" + (rem ? " " + rem + "m" : "") + " ago";
  }

  function byBed(n) { for (var i = 0; i < G.babies.length; i++) if (G.babies[i].bed === n) return G.babies[i]; return null; }

  /* An action's name may depend on the baby it is aimed at: "Intubate" and "Re-site the tube"
     are the same button doing the same job in two different situations, and calling the
     second one "Intubate" is why a player could not find it. */
  function actionLabel(id, b) {
    var a = NG.ACTIONS[id];
    if (!a) return null;
    return typeof a.t === "function" ? a.t(b) : a.t;
  }

  /* ------------------------------------------------------- the open porthole
     Somebody reaches in to touch their baby and the porthole does not quite click shut
     behind them. It is one of the most ordinary things that happens in a neonatal unit, it
     is nobody's fault, and it costs a 25-weeker half a degree in ten minutes.

     It exists here because `cold` was the last concern in the game with no natural route to
     it: the thermal model works, but every baby is on servo control, so nothing ever made
     one cold unless the player opened the isolette themselves. It also gives the shift a
     problem that is nothing to do with the illness in the cot and everything to do with the
     room - which is a fair share of what a night shift actually is.

     Only the humidified isolettes, which is to say only the babies small enough for it to
     matter, and never while a baby is on somebody's chest or in the middle of a crisis. */
  function checkPortholes(dt) {
    G.babies.forEach(function (b) {
      if (b.died || b.discharged || b.support.isoOpen) return;
      if (b.support.humidity < 50 || b.h.kangaroo || b.h.criticalRun > 5) return;
      if (b.h.portholeDone || !G.parentPresent(b)) return;
      if (S.rnd() > dt / 900) return;                  // about once in fifteen visited hours
      b.h.portholeDone = true;
      /* servo is deliberately left alone. The skin probe goes on working; what an open
         porthole does is vent the heat faster than the heater can replace it, and
         stepThermal already reads isoOpen ahead of servo. */
      b.support.isoOpen = true;
      log(b.parentName + " has been sitting with " + b.name + ", a hand through the porthole.", "");
      recordHistory(b, "event", "The isolette porthole was left open");
      setNote(b, "porthole", "The porthole on " + b.name + "'s isolette has been left open. " +
        b.pronoun.S + " " + b.pronoun.is + " losing heat to the room.");
    });
  }

  // ---------------------------------------------------------------- concerns
  /* How many people may be queuing for you at once. In a real unit, a nurse who cannot get
     the doctor does not add an eleventh name to a list - she deals with what she can and
     brings you the thing that will not wait. Without this the panel simply grew with the
     game: every concern added over the last few builds is another row that can be open at
     five in the morning, and a who-needs-you list nobody can read is the same as no list.
     Urgent always gets through, because a baby in trouble has to reach you. */
  var QUEUE_SOFT_CAP = 8;

  function raiseConcerns() {
    var openNow = G.concerns.filter(function (x) { return !x.done; }).length +
                  G.talks.filter(function (t) { return !t.done; }).length;
    EV.CONCERNS.forEach(function (c) {
      G.babies.forEach(function (b) {
        if (b.died || b.discharged) return;
        var key = c.id + ":" + b.bed;
        if (G.concerns.some(function (x) { return x.key === key && !x.done; })) return;
        if (G.cooldowns[key] && G.min - G.cooldowns[key] < (c.cooldown || 90)) return;
        if (openNow >= QUEUE_SOFT_CAP && c.severity !== "urgent") return;
        if (!c.cond(G, b)) return;
        openNow++;
        var whoId = typeof c.who === "function" ? c.who(b) : c.who;
        /* What a colleague says is frozen at the moment they say it. Re-evaluating say()
           on every render made the line track the monitor - "Temperature is 36.6. Cold
           babies burn through their sugar" after the baby had already warmed up - which
           is not how a person talks and left players arguing with a sentence nobody said. */
        G.concerns.push({ key: key, id: c.id, def: c, bed: b.bed, who: whoId,
                          at: G.min, seen: false, done: false, escalated: !!G.declined[key],
                          said: c.say(G, b), summaryText: c.summary(G, b) });
        G.cooldowns[key] = G.min;
        var line = EV.CHARS[whoId].name.split(",")[0] + " wants you at bed " + b.bed + " - " + c.summary(G, b);
        log(line, "hi");
        recordHistory(b, "asked", EV.CHARS[whoId].name.split(",")[0] + " raised: " + c.summary(G, b));
        announce(line);
        notice();
        Snd.attention(c.severity === "urgent");
      });
    });
  }

  // A live request outranks one that has already stood itself down.
  /* Everyone still waiting at this cot, most pressing first. A stood-down one always sorts
     last: it is a thing to read, not a thing to do. */
  function concernsAt(b) {
    return G.concerns.filter(function (c) { return c.bed === b.bed && !c.done; })
      .sort(function (x, y) { return concernRank(x) - concernRank(y) || x.at - y.at; });
  }
  function concernRank(c) {
    if (c.stale) return 9;
    return { urgent: 0, worry: 1, note: 2 }[c.def.severity];
  }

  /* ONE conversation at a time, and the player picks which. It stays picked until it is
     finished or somebody more urgent arrives - clicking between beds, answering the phone
     or a new nurse turning up must not silently swap the person you were mid-sentence with. */
  function openConcernFor(b) {
    var list = concernsAt(b);
    if (!list.length) { delete G.openConcern[b.bed]; return null; }
    var key = G.openConcern[b.bed], chosen = null, i;
    for (i = 0; i < list.length; i++) if (list[i].key === key) { chosen = list[i]; break; }
    /* Nothing takes over a live conversation - not a new arrival, however urgent, and not
       coming back to the cot later. Somebody more pressing sorts to the front of the row of
       faces and waits there to be picked, which is the whole point: a player mid-sentence
       with one colleague should never find themselves reading somebody else's message. The
       one exception is a card that has already stood itself down, which is not a
       conversation any more and steps aside for anybody who actually needs you. */
    if (chosen && chosen.stale && list[0] && !list[0].stale) chosen = null;
    if (!chosen) chosen = list[0];
    G.openConcern[b.bed] = chosen.key;
    return chosen;
  }
  function otherConcernsAt(b) {
    var open = G.openConcern[b.bed];
    return concernsAt(b).filter(function (c) { return c.key !== open; });
  }
  function activeConcernFor(b) {
    var c = openConcernFor(b);
    return c && !c.stale ? c : null;
  }

  function firstName(whoId) {
    var n = EV.CHARS[whoId] ? EV.CHARS[whoId].name : "";
    return n.split(",")[0].split(" ")[0] || n;
  }

  /* The callout is pinned to the top of the page and has to stay a readable size, so it
     carries the last two things that were said and no more. The log keeps the rest. */
  function pushReply(c, good, text) {
    announce(text);
    c.replies = c.replies || [];
    c.replies.push({ good: good, text: text, fresh: true });
    c.replies.forEach(function (r, i) { r.fresh = i === c.replies.length - 1; });
    if (c.replies.length > 2) c.replies.shift();
  }
  function replyClass(r) {
    var cls = r.good === true ? "good" : r.good === false ? "bad" : "neutral";
    if (r.fresh) { r.fresh = false; cls += " fresh"; }
    return cls;
  }
  function anyFresh(list, note) {
    return (list || []).some(function (r) { return r.fresh; }) || !!(note && note.fresh);
  }

  function judgeConcern(b, actionId) {
    /* Whoever asked, not whoever happens to be on screen. With two colleagues waiting at one
       cot, judging only the open conversation meant doing exactly what the second one asked
       for and being answered by the first - or by nobody. The one you are talking to gets
       first refusal; after that, anyone else here with an opinion about this action. */
    var c = activeConcernFor(b);
    if (!c || !c.seen || !((c.def.accept && c.def.accept[actionId]) || (c.def.wrong && c.def.wrong[actionId]))) {
      var alt = concernsAt(b).filter(function (x) {
        return !x.stale && x.seen &&
               ((x.def.accept && x.def.accept[actionId]) || (x.def.wrong && x.def.wrong[actionId]));
      })[0];
      if (alt) c = alt;
    }
    if (!c || !c.seen) return;
    var d = c.def, r = (d.accept && d.accept[actionId]) || null, bad = (d.wrong && d.wrong[actionId]) || null;
    // Anything else still gets an answer, so the player can always tell the game noticed.
    if (!r && !bad) {
      var who = firstName(c.who);
      var sum = d.summary(G, b);
      var lines = [
        who + " watches, then says: \"All right. But that does not tell us anything about " + sum + ".\"",
        who + " nods along. \"Fine by me. I am still worried about " + sum + ", though.\"",
        "\"Whatever you think,\" says " + who + ". \"It does not get us any further with " + sum + ".\""
      ];
      var line = lines[(c.replies ? c.replies.length : 0) % lines.length];
      pushReply(c, null, line);
      renderBedCallout(b);
      return;
    }
    if (r) {
      /* Credit is paid once per action per concern. An accept that does not resolve
         used to pay out again on every click, so a player could hold down one button
         and earn the judgement domain outright. The colleague still answers, and a
         resolving action still resolves - only the points are spent. */
      c.credited = c.credited || {};
      if (!c.credited[actionId]) {
        c.credited[actionId] = true;
        addScore(r.score, (actionLabel(actionId, b) || "Adjusted the settings") +
                          " for " + b.name + " when " + EV.CHARS[c.who].name.split(",")[0] + " asked");
      }
      var okText = say(r.fb, b);
      pushReply(c, true, okText);
      if (r.resolve) {
        c.done = true; c.resolvedAt = G.min; G.metrics.concernsAnswered++;
        setNote(b, "good", okText, { who: c.who, tag: "settled" });
      }
      Snd.ok();
    } else if (bad) {
      addScore(bad.score, (actionLabel(actionId, b) || "That adjustment") +
                          " was the wrong answer for " + b.name);
      var badText = say(bad.fb, b);
      pushReply(c, false, badText);
      Snd.bad();
    }
    if (r || bad) renderBedCallout(b);
  }

  function declineConcern(b) {
    var c = activeConcernFor(b);
    if (!c || !c.seen) return;
    var d = c.def.decline || { fb: "They accept it and move on.", score: -1, resolve: false };
    addScore(d.score, "Declined " + EV.CHARS[c.who].name.split(",")[0] + "'s concern about " + b.name);
    var good = d.score > 0 ? true : d.score < 0 ? false : null;
    var text = say(d.fb, b);
    pushReply(c, good, text);
    setNote(b, good === false ? "warn" : "good", text,
            { who: c.who, tag: d.resolve ? "settled" : "will ask again" });
    c.done = true; c.declinedAt = G.min;
    if (d.resolve) { G.metrics.concernsAnswered++; }
    else {
      // they were not persuaded: come back in a while, and say so next time
      G.declined[c.key] = (G.declined[c.key] || 0) + 1;
      G.cooldowns[c.key] = G.min - Math.max(0, (c.def.cooldown || 90) - 40);
    }
    (d.score > 0 ? Snd.ok : Snd.bad)();
    renderBedCallout(b);
    render();
  }

  /* Situations move on. Every tick, a request that no longer describes the baby either
     closes as a success (the player did something the colleague approved of, and it worked)
     or is stood down (it sorted itself out). Neither one nags, and neither one is scored
     against the player at handover - the night stopped asking. */
  function reviewConcerns() {
    G.concerns.forEach(function (c) {
      if (c.done || c.stale) return;
      var b = byBed(c.bed); if (!b || b.died || b.discharged) return;
      if (G.min - c.at < 15) return;                     // let it stand long enough to be seen
      var still = true;
      try { still = c.def.cond(G, b); } catch (e) { still = true; }
      if (still) return;
      var helped = (c.replies || []).some(function (r) { return r.good === true; });
      var who = firstName(c.who);
      if (helped) {
        c.done = true; c.resolvedAt = G.min; G.metrics.concernsAnswered++;
        var win = who + ": \"That has done it. " + (c.def.settled || "It has settled.") + "\"";
        pushReply(c, true, win);
        setNote(b, "good", win, { who: c.who, tag: "settled" });
        log(who + " is happy with bed " + c.bed + " now: " + c.summaryText + " has resolved.", "good");
        recordHistory(b, "good", who + " is happy: " + c.summaryText + " has resolved");
      } else {
        c.stale = true; c.staleAt = G.min;
        c.said = who + ": \"Never mind about " + b.name + ". " +
                 cap(c.def.settled || "It has sorted itself out.") + "\"";
        log(who + " stands down about bed " + c.bed + ": " + c.summaryText + " settled without you.", "");
        recordHistory(b, "settled", c.summaryText + " settled on its own");
      }
      if (G.view.mode === "bed" && G.babies[G.view.bed] === b) renderBedCallout(b);
    });
    /* Stood-down notes go quietly. One the player has read has done its job in a few seconds
       and should not need dismissing; one nobody ever came to see gets longer before it is
       written off, so it still turns up in the log and the tally. */
    G.concerns.forEach(function (c) {
      if (!c.stale || c.done) return;
      var life = c.seen ? 12 : 45;
      if (G.min - c.staleAt > life) { c.done = true; c.retracted = true; }
    });
  }

  function dismissConcern(b) {
    var c = openConcernFor(b);
    if (!c || !c.stale || c.done) return;
    c.done = true; c.retracted = true;
    Snd.click(); renderBedCallout(b); render();
  }

  function escalateConcerns() {
    G.concerns.forEach(function (c) {
      if (c.done || c.stale) return;
      var b = byBed(c.bed); if (!b || b.died) { c.done = true; return; }
      var age = G.min - c.at;
      var limit = c.def.severity === "urgent" ? 45 : c.def.severity === "worry" ? 75 : 110;
      if (!c.escalated && age > limit) {
        c.escalated = true;
        // they have looked again, so the line is re-frozen against what they see now
        c.said = c.def.say(G, b); c.summaryText = c.def.summary(G, b);
        var again = EV.CHARS[c.who].name.split(",")[0] + " asks again about bed " + c.bed + ". " + cap(c.summaryText) + ".";
        log(again, "warn");
        announce(again);
        notice();
        Snd.attention(true);
      }
      if (age > limit * 2.2) {
        c.done = true; c.missed = true; G.metrics.concernsMissed++;
        addScore(c.def.miss.score, "Never came to bed " + c.bed + ": " + c.summaryText);
        log(say(c.def.miss.fb, b), "bad");
      }
    });
  }

  // ------------------------------------------------------------------- talks
  function raiseTalks() {
    EV.TALKS.forEach(function (t) {
      if (t.target === "unit") {
        if (G.fired[t.id]) return;
        if (t.minMin && G.min < t.minMin) return;
        if (t.cond && !t.cond(G)) return;
        G.fired[t.id] = true;
        G.talks.push({ id: t.id, def: t, bed: null, who: t.who, at: G.min });
        G.metrics.talksOffered++;
        log(EV.CHARS[t.who].name.split(",")[0] + " " + t.badge + ".", "hi");
        notice();
      } else if (!t.pool) {
        G.babies.forEach(function (b) {
          var key = t.id + ":" + b.bed;
          if (G.fired[key]) return;
          if (t.minMin && G.min < t.minMin) return;
          if (!t.cond(G, b)) return;
          G.fired[key] = true;
          var who = t.who === "parent" ? "parent" : t.who === "nurse" ? EV.nurseFor(b) : t.who;
          G.talks.push({ id: t.id, def: t, bed: b.bed, who: who, at: G.min });
          G.metrics.talksOffered++;
          var nm = t.who === "parent" ? b.parentName : EV.CHARS[who].name.split(",")[0];
          log(nm + " " + t.badge + " at bed " + b.bed + ".", "hi");
          notice();
        });
      }
    });
    raisePoolTalks();
  }

  /* Pooled conversations (the families) are drawn without replacement, so the same
     two exchanges never come round again and again on one shift. */
  function raisePoolTalks() {
    var pool = EV.TALKS.filter(function (t) { return t.pool === "parent" && !G.fired[t.id]; });
    if (!pool.length) return;
    G.babies.forEach(function (b) {
      if (b.died || b.discharged) return;
      if (G.talks.some(function (x) { return x.bed === b.bed; })) return;          // one at a time
      if (G.min - (b.lastTalkAt || -999) < 70) return;                              // give them a rest
      var options = pool.filter(function (t) {
        if (t.minMin && G.min < t.minMin) return false;
        try { return t.cond(G, b); } catch (e) { return false; }
      });
      if (!options.length) return;
      var t = options[Math.floor(S.rnd() * options.length)];
      G.fired[t.id] = true;                       // used up for the whole shift
      b.lastTalkAt = G.min;
      var who = t.who === "parent" ? "parent" : t.who === "nurse" ? EV.nurseFor(b) : t.who;
      G.talks.push({ id: t.id, def: t, bed: b.bed, who: who, at: G.min });
      G.metrics.talksOffered++;
      var nm = t.who === "parent" ? b.parentName : EV.CHARS[who].name.split(",")[0];
      log(nm + " " + t.badge + " at bed " + b.bed + ".", "hi");
      notice();
      pool = pool.filter(function (x) { return x !== t; });
    });
  }

  /* Nobody waits all night. A conversation used to sit in the who-needs-you list from the
     moment it was offered until the player took it, so by five in the morning the panel
     was mostly ten-hour-old requests - a parent still waiting to ask about a photograph
     they had wanted at five past seven. Two ways they go:

       - a parent who has gone home cannot still be waiting at the cot
       - and a moment passes: after a couple of hours the question has stopped being live

     Letting them go also frees the one-conversation-per-baby slot, so more of the fourteen
     authored family conversations get seen in a night instead of the first four blocking
     the rest. It costs the player nothing they had not already lost by not going. */
  var TALK_LIFE = 150;

  function expireTalks() {
    G.talks = G.talks.filter(function (t) {
      var b = t.bed != null ? byBed(t.bed) : null;
      if (b && (b.died || b.discharged)) return false;
      var parentGone = t.def.who === "parent" && b && !G.parentPresent(b);
      var stale = G.min - t.at > TALK_LIFE;
      if (!parentGone && !stale) return true;
      var who = t.def.who === "parent" ? (b ? b.parentName : "A parent")
                                       : EV.CHARS[t.who].name.split(",")[0];
      log(parentGone ? who + " went home without getting to ask you."
                     : who + " stopped waiting to talk to you.", "");
      return false;
    });
  }

  function startTalk(talk) {
    var b = talk.bed ? byBed(talk.bed) : null;
    var d = talk.def;
    var isParent = d.who === "parent";
    var whoName = isParent ? b.parentName + ", " + b.name + "'s parent" : EV.CHARS[talk.who].name;
    var role = isParent ? "at the bedside" : EV.CHARS[talk.who].role;
    var av = isParent ? b.parentAvatar : EV.CHARS[talk.who].av;
    G.talks = G.talks.filter(function (x) { return x !== talk; });
    G.metrics.talksHad++;
    Snd.talk();
    showDialog({
      avatar: av, who: whoName, role: role, said: d.say(G, b), subject: b,
      nudge: d.nudge,
      opts: d.opts.map(function (o) {
        var label = say(o.label, b);
        return { label: label, hint: say(o.hint, b), run: function () {
          if (o.apply) o.apply(G, b);
          // tagged so a conversation cannot inflate the clinical-judgement domain
          if (o.score) addScore(o.score, shortLabel(label) + (b ? " (" + b.name + ")" : ""), "family");
          return { text: say(o.fb, b), kind: o.fbKind };
        } };
      })
    });
  }

  // ------------------------------------------------------------------- calls
  function updateCalls() {
    if (G.call) return;         // giveUpOnCall() handles an unanswered one, in real time
    for (var i = 0; i < EV.CALLS.length; i++) {
      var c = EV.CALLS[i];
      if (G.fired["call:" + c.id]) continue;
      if (c.studentSkip && G.difficulty === "student") continue;
      if (c.minMin && G.min < c.minMin) continue;
      if (c.cond && !c.cond(G)) continue;
      if ((G.callHistory[c.id] || 0) > 0 && G.min - (G.lastCallEnd || 0) < 60) continue;
      G.call = { def: c, rings: 0, since: G.min, startedAt: Date.now() };
      log("The phone is ringing. " + c.preview + ".", "hi");
      announce("The phone is ringing. " + c.preview + ".");
      notice();
      Snd.phone();
      return;
    }
  }

  G.answerPhone = function () {
    if (!G.call) return;
    var c = G.call.def;
    G.call = null; G.lastCallEnd = G.min;
    G.fired["call:" + c.id] = true;
    G.metrics.callsAnswered++;
    Snd.talk();
    if (c.onAnswer) {
      showDialog({
        avatar: EV.CHARS[c.who].av, who: EV.CHARS[c.who].name, role: EV.CHARS[c.who].role,
        said: c.say(G),
        opts: [{ label: c.answerLabel || "I will come down", hint: "Accepts the call", run: function () {
          c.onAnswer(G);
          return { text: c.answerFb || "You pull on a gown as you walk.", kind: "ok",
                   contLabel: c.answerBtn };
        } }]
      });
      return;
    }
    showDialog({
      avatar: EV.CHARS[c.who].av, who: EV.CHARS[c.who].name, role: EV.CHARS[c.who].role,
      said: c.say(G), nudge: c.nudge,
      opts: c.opts.map(function (o) {
        return { label: o.label, hint: o.hint, run: function () {
          if (o.apply) o.apply(G);
          if (o.score) addScore(o.score, shortLabel(o.label));
          return { text: o.fb, kind: o.fbKind };
        } };
      })
    });
  };

  G.acceptTransfer = function (colder) {
    G.admissionDue = G.min + 45; G.admissionColder = !!colder;
    log("Accepted a 29-week transfer. They are on their way.", "hi");
  };
  G.startDeliveryRoom = function () { G.summonDelivery(); };

  // ------------------------------------------------------------------ crises
  function checkCrisis() {
    if (G.crisis || G.dialogOpen) return;
    for (var i = 0; i < G.babies.length; i++) {
      var b = G.babies[i];
      if (b.died || b.discharged) continue;
      if (b.h.ptx && b.mon.trueSat < CL.sat.alarmRed + 2 && !b.h.ptxHandled) return startCrisis(b, "dope");
      if (b.h.sepsis > 0.82 && b.h.criticalRun > 25 && !b.h.shockHandled) return startCrisis(b, "shock");
      if (b.h.glucose < CL.glucose.severe && b.h.criticalRun > 15 && !b.h.hypoHandled) return startCrisis(b, "hypo");
    }
  }

  function startCrisis(b, kind) {
    G.crisis = { b: b, kind: kind };
    G.paused = true; Snd.red();
    announce("Emergency at bed " + b.bed + ". " + EV.CRISES[kind].title + ".");
    var c = EV.CRISES[kind];
    showDialog({
      avatar: "priya", who: "EMERGENCY - bed " + b.bed, role: b.name + ", " + b.ga + " weeks",
      said: c.line(b), crisis: true, subject: b, nudge: c.nudge,
      opts: c.opts.map(function (o) {
        return { label: o.label, hint: o.hint, run: function () {
          var r = o.run(G, b);
          addScore(r.score, (r.ok ? "Resolved" : "Attempted") + " " + c.title + " on " + b.name);
          if (r.ok) { G.crisis = null; b.h.criticalRun = 0; Snd.good(); } else Snd.bad();
          return { text: r.text, kind: r.ok ? "good" : "bad", keepCrisis: !r.ok };
        } };
      })
    });
  }

  // ------------------------------------------------------------------ dialog
  function showDialog(cfg) {
    if (!G.running && !cfg.final) return;
    if (G.dialogOpen || $("scrim")) {
      if (cfg.crisis) G.dialogQueue.unshift(cfg); else G.dialogQueue.push(cfg);
      return;
    }
    G.dialogOpen = true; G.paused = true;
    // Shuffle the choices. Otherwise the best option sits first almost every time and
    // can be picked without reading, which defeats the whole point.
    if (cfg.opts && cfg.opts.length > 1 && !cfg.keepOrder) {
      for (var sh = cfg.opts.length - 1; sh > 0; sh--) {
        var sj = Math.floor(S.rnd() * (sh + 1));
        var st = cfg.opts[sh]; cfg.opts[sh] = cfg.opts[sj]; cfg.opts[sj] = st;
      }
    }
    var scrim = el("div", "scrim"); scrim.id = "scrim";
    var d = el("div", "dialog");
    /* A real modal: named by the person speaking, marked so a screen reader ignores the
       unit behind it, and with focus held inside until a choice is made. There is
       deliberately no Escape-to-close - every dialog in this game is a decision that is
       scored, and letting the player dismiss one would be a way to skip it. */
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-modal", "true");
    d.setAttribute("aria-labelledby", "dlgWho");
    d.setAttribute("tabindex", "-1");
    d.innerHTML = '<div class="dlg-head"><div class="av">' + A.avatar(cfg.avatar) + "</div><div><div class='who' id='dlgWho'>" +
      esc(cfg.who) + "</div><div class='role'>" + esc(cfg.role || "") + "</div></div></div>";
    if (cfg.crisis) {
      d.appendChild(el("div", "crisis-banner",
        '<div style="font-size:1.6rem">&#9888;</div><div><div class="ct">' + esc(cfg.who) +
        '</div><div class="muted" style="font-size:.85rem">Decide now. The team is waiting on you.</div></div>'));
    }
    var body = el("div", "dlg-body");
    body.innerHTML = '<div class="said">' + gl(cfg.said) + "</div>";
    if (cfg.subject) {
      body.innerHTML += '<div class="muted" style="font-size:.86rem;margin-bottom:6px">Bed ' + cfg.subject.bed +
        " &middot; " + esc(cfg.subject.name) + " &middot; " + gl("SpO2") + " " + cfg.subject.mon.spo2 +
        "% &middot; HR " + cfg.subject.mon.hr + " &middot; " + gl(supportLabel(cfg.subject)) + "</div>";
    }
    if (cfg.nudge && G.nudges) body.innerHTML += '<div class="nudge">🤔 ' + gl(cfg.nudge) + "</div>";
    d.appendChild(body);
    var opts = el("div", "dlg-opts");
    cfg.opts.forEach(function (o) {
      var btn = el("button", "dlg-opt", "<div>" + gl(o.label) + "</div>" +
        (o.hint && G.nudges ? '<div class="oh">' + gl(o.hint) + "</div>" : ""));
      btn.onclick = function () {
        Snd.click();
        var res = o.run() || {};
        opts.remove();
        var fb = el("div", "feedback " + (res.kind === "good" ? "good" : res.kind === "bad" ? "bad" : ""));
        fb.innerHTML = '<div class="fh">' + (res.kind === "good" ? "Good call" : res.kind === "bad" ? "Think again" : "Noted") +
          "</div><div>" + gl(res.text || "") + "</div>";
        d.appendChild(fb);
        var cont = el("button", "btn", res.contLabel || (res.keepCrisis ? "Keep going" : "Back to the unit"));
        cont.style.marginTop = "14px";
        announce((res.kind === "good" ? "Good call. " : res.kind === "bad" ? "Think again. " : "") + (res.text || ""));
        cont.onclick = function () {
          scrim.remove(); G.dialogOpen = false;
          releaseFocus();
          // hold the crisis now: 350ms is long enough for something else to resolve it
          var again = res.keepCrisis && G.crisis;
          if (again) setTimeout(function () { if (G.crisis) startCrisis(again.b, again.kind); }, 350);
          else if (G.dialogQueue.length) { var n = G.dialogQueue.shift(); setTimeout(function () { showDialog(n); }, 250); }
          else { G.paused = false; render(); }
        };
        d.appendChild(cont); cont.focus();
        d.scrollTop = d.scrollHeight;
      };
      opts.appendChild(btn);
    });
    d.appendChild(opts);
    scrim.appendChild(d);
    document.body.appendChild(scrim);
    trapFocus(d, scrim);
    announce(cfg.who + ". " + cfg.said);
  }

  /* Focus management for the modal. Tab cycles inside it, focus lands on the dialog when
     it opens, and goes back to whatever the player was on when it closes. */
  var focusReturn = null, focusReturnKey = null;
  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && n.offsetParent !== null; });
  }
  function trapFocus(d, scrim) {
    focusReturn = document.activeElement;
    /* Remember the KEY as well as the node. A dialog can stand open across several clock
       ticks, and the panel behind it rebuilds on every one, so by the time it closes the
       node the player came from usually no longer exists. */
    focusReturnKey = focusReturn && focusReturn.getAttribute ? focusReturn.getAttribute("data-focus-key") : null;
    var first = focusables(d)[0];
    (first || d).focus();
    scrim.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = focusables(d);
      if (!f.length) { e.preventDefault(); return; }
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }
  function releaseFocus() {
    var back = focusReturn, key = focusReturnKey;
    focusReturn = null; focusReturnKey = null;
    if (!(back && document.contains(back) && back.offsetParent !== null) && key)
      back = document.querySelector('[data-focus-key="' + key.replace(/["\\]/g, "") + '"]');
    if (back && document.contains(back)) { try { back.focus(); return; } catch (e) {} }
    var st = $("stage"); if (st) st.focus();
  }


  /* ------------------------------------------------------- one click handler
     Everything the player can press inside the stage or the side panel says what it is
     in a data- attribute, and this reads it. Panels are free to rebuild themselves on the
     clock without rebinding anything, which is what the eight separate querySelectorAll
     loops here used to be for - and what an author had to remember to add a ninth of.
     The sliders keep their own listeners: they are built once by renderBed, they are not
     rebuilt on the clock, and each one closes over the value it is being compared to. */
  function currentBaby() {
    return G.view.mode === "bed" ? G.babies[G.view.bed] : null;
  }
  function findTalk(id, bed) {
    return G.talks.filter(function (x) {
      return x.id === id && String(x.bed == null ? "" : x.bed) === String(bed == null ? "" : bed);
    })[0];
  }

  /* Every clickable thing in the stage and the side panel has to be named here or the one
     delegated handler never sees it, and the button is silently dead - no error, no clue.
     It has happened twice: "Live this shift again" did nothing at all, and a face in the row
     of people at a cot could not be clicked to switch conversation. So the list is exported,
     and the suite walks the rendered page asserting that every button in it matches. */
  var CLICKABLE = "[data-bed],[data-act],[data-del],[data-talk],[data-concern],[data-go]," +
                  "[data-mode],[data-dex],[data-leave]," +
                  "#podDelivery,#btnBack,#delLeave,#declineConcern,#dismissConcern," +
                  "#startShift,#again,#relive";

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    /* Every clickable thing in the stage and the side panel has to be named here or the
       delegated handler never sees it. Two have been added since this list was last touched
       and both were silently dead: #relive did nothing at all, and a face in the row of
       people at a cot could not be clicked to switch conversation. */
    var n = t.closest(CLICKABLE);
    if (!n || n.disabled) return;
    var b = currentBaby();

    if (n.id === "startShift") return startShift();
    if (n.id === "again") { location.href = "index.html"; return; }
    if (n.id === "relive") return reliveShift();
    if (n.id === "btnBack") return backToWard();
    if (n.id === "delLeave") return leaveDelivery(false);
    if (n.hasAttribute && n.hasAttribute("data-leave")) return G.finishDelivery(n.getAttribute("data-leave"));
    if (n.id === "podDelivery") return G.enterDelivery();
    if (n.id === "declineConcern") return b && declineConcern(b);
    if (n.id === "dismissConcern") return b && dismissConcern(b);

    if (n.hasAttribute("data-del")) return G.doDelivery(n.getAttribute("data-del"));
    if (n.hasAttribute("data-act")) return b && G.doAction(b, n.getAttribute("data-act"));
    // conversations first: they are the only thing here that is about a person
    if (n.hasAttribute("data-concern")) {
      if (!b) return;
      var want = n.getAttribute("data-concern");
      var pick = G.concerns.filter(function (c) { return c.key === want && !c.done; })[0];
      if (!pick) return;
      G.openConcern[b.bed] = want;
      if (!pick.seen) { pick.seen = true; pick.seenAt = G.min; }
      Snd.click(); playerActed();
      renderBedCallout(b); renderBedPeople(b);
      announce(EV.CHARS[pick.who].name.split(",")[0] + ": " + cap(pick.summaryText));
      return;
    }
    if (n.hasAttribute("data-talk")) {
      var tb = n.hasAttribute("data-talk-bed") ? n.getAttribute("data-talk-bed") : (b ? b.bed : null);
      var talk = findTalk(n.getAttribute("data-talk"), tb);
      if (!talk) return;
      /* Go and stand where they are first. A conversation about a baby happens at that
         baby's cot, and arriving in the dialog from nowhere loses that. */
      if (talk.bed != null) {
        var at = G.babies.indexOf(byBed(talk.bed));
        if (at >= 0 && !(G.view.mode === "bed" && G.view.bed === at)) openBed(at);
      }
      return startTalk(talk);
    }
    if (n.hasAttribute("data-bed")) return openBed(+n.getAttribute("data-bed"));
    if (n.hasAttribute("data-go")) return openBed(+n.getAttribute("data-go"));
    if (n.hasAttribute("data-mode")) return b && setMode(b, n.getAttribute("data-mode"));
    if (n.hasAttribute("data-dex")) { if (b) { b.h.dexPct = +n.getAttribute("data-dex"); renderBed(); } return; }
  });

  // ------------------------------------------------------------------- clock
  /* Something that interrupts stops the clock dead. Without this the rest of a
     twenty-minute transfusion kept running behind the dialog the player was still
     reading, so a baby could go critical and die inside a single click nobody was
     given the chance to answer. Only an INTERRUPTION counts: a dialog that was
     already open when we started is the player deliberately spending time - sitting
     down with a parent costs ten minutes and must still cost them. */
  G.advance = function (mins) {
    var steps = Math.max(1, Math.round(mins / S.TICK));
    var wasBlocked = !!(G.crisis || G.dialogOpen);
    var spent = 0;
    for (var i = 0; i < steps; i++) {
      if (!wasBlocked && (G.crisis || G.dialogOpen)) break;
      stepWorld(S.TICK); spent += S.TICK;
    }
    // hand the face something to wind through, so the player watches the cost being paid
    if (spent) { G.clockLag += spent; showCost(spent + " min"); }
  };

  function stepWorld(dt) {
    if (G.min >= SHIFT_LEN) return;
    G.min += dt;
    var worst = null;
    G.babies.forEach(function (b) {
      if (b.died || b.discharged) return;
      var prev = b.alarm ? b.alarm.level : "none";
      (S.step(b, dt, G) || []).forEach(function (f) {
        if (/^(ptx|ett|nec|ivh|apnea-severe)$/.test(f.t)) recordHistory(b, "event", f.msg);
        if (f.t === "ptx") log(f.msg, "bad");
        else if (f.t === "ett") log(f.msg, "bad");
        else if (f.t === "nec" || f.t === "apnea-severe") log(f.msg, "warn");
        else if (f.t === "ivh") log(f.msg, "bad");
        else if (f.t === "artifact-fixed") log(f.msg, "");
      });
      if (b.alarm.level === "red" && prev !== "red") worst = "red";
      else if (b.alarm.level === "amber" && prev === "none" && worst !== "red") worst = "amber";
      if (b.alarm.level === "red") {
        b.h.redFor = (b.h.redFor || 0) + dt;
        if (b.h.redFor % 20 < dt) worst = worst || "red";     // monitors keep going
      } else b.h.redFor = 0;
      if (b.h.criticalRun > (G.difficulty === "student" ? 220 : 150) && G.allowDeath && !b.died) {
        b.died = true; b.diedAt = G.min;
        /* Everything anyone still wanted from this bedspace goes with them. A parent
           left in the "who needs you" list with "wants to talk" against a baby who has
           just died is the cruellest bug this game could have. */
        G.talks = G.talks.filter(function (t) { return t.bed !== b.bed; });
        G.concerns.forEach(function (c) { if (c.bed === b.bed && !c.done) { c.done = true; c.retracted = true; } });
        addScore(-40, b.name + " died after " + Math.round(b.h.criticalMinutes) + " minutes in a critical state");
        log(b.name + " could not be resuscitated. Time of death " + clockStr(G.min) + ".", "bad");
        Snd.bad();
        showDialog({
          avatar: "ingrid", who: "Dr. Ingrid Halvorsen", role: "Attending neonatologist",
          said: "I came in as fast as I could. " + b.name + " had been in trouble for a long time before anyone acted on it. " +
                "I want you to know two things. This happens in real units, to real teams, and it is the hardest part of this job. " +
                "And we are going to sit down together at the end of the shift and go through exactly what was happening. " +
                "That is not a punishment. That is how anybody learns this.",
          opts: [{ label: "Sit with the family", hint: "", run: function () { G.trust -= 20;
            return { text: "You sit with " + b.parentName + " for a long time and say very little. There is nothing to fix here, only someone to be with.", kind: "bad" }; } }]
        });
      }
    });
    /* Alarms re-fire on a game-time cadence, which at a fast clock means every couple of
       real seconds. The ear lives in real time, so the floor is real too. */
    if (worst) {
      var nowMs = Date.now();
      if (nowMs - (G.lastAlarmSound || 0) > 2500) {
        G.lastAlarmSound = nowMs;
        if (worst === "red") Snd.desat(); else Snd.amber();
      }
    }
    deliverResults();
    NG.runWatches();
    checkDeliveryAbandoned();
    checkPortholes(dt);
    raiseConcerns();
    reviewConcerns();
    escalateConcerns();
    raiseTalks();
    expireTalks();
    updateCalls();
    checkAdmission();
    checkCrisis();
    if (G.min >= SHIFT_LEN) NG.endShift();
  }

  /* How long a phone rings is a real-time question, not a game-time one: the player is the
     one listening to it. Eight sim ticks used to be forty game minutes, which at the pace
     the phone now sets would be eighty real seconds of ringing - so this is checked on the
     frame rather than on the tick, and answered in seconds. */
  var RING_SECONDS = 22;
  function giveUpOnCall() {
    if (!G.call || Date.now() - G.call.startedAt < RING_SECONDS * 1000) return;
    var def = G.call.def;
    G.callHistory[def.id] = (G.callHistory[def.id] || 0) + 1;
    G.call = null;
    /* The re-ring guard keys off lastCallEnd, which was once only set when a call was
       ANSWERED - so a call you let ring out started ringing again five minutes later. */
    G.lastCallEnd = G.min;
    if (G.callHistory[def.id] >= (def.persistent || 1)) {
      G.metrics.callsMissed++;
      if (def.onIgnoreAll) def.onIgnoreAll(G);
      G.fired["call:" + def.id] = true;
    } else {
      log("The phone stopped ringing.", "");
    }
    notice();
  }

  /* A baby in real trouble. While this is true the clock will not build, however long
     the player stands in the ward - you do not get to fast-forward past this. */
  function clockHeld() {
    return G.babies.some(function (b) { return !b.died && !b.discharged && b.alarm.level === "red"; }) ||
           G.concerns.some(function (c) {
             return !c.done && !c.stale && (c.def.severity === "urgent" || c.escalated);
           });
  }

  /* Something new has arrived. Resets the run-up so the player gets a beat to see it,
     without stopping the clock for good. Called when a colleague asks, a parent wants to
     talk, a result lands, or the phone starts. */
  function notice() { G.lastNotice = Date.now(); }
  G.notice = notice;
  function playerActed() { G.lastInput = Date.now(); }

  function clockRate() {
    if (!G.running || G.paused || G.dialogOpen || G.crisis) return 0;
    if (G.view.mode === "handover") return 0;
    if (G.view.mode === "delivery") return RATE.delivery;
    if (G.view.mode === "bed") return RATE.bedside;
    if (G.call) return RATE.bedside;              // the phone rings for a readable while
    /* A baby being born while you are somewhere else is at least as urgent as standing at
       a cot, and you certainly cannot fast-forward through it: the twenty-five minutes
       before the registrar takes over would otherwise pass in three real seconds. */
    if (G.delivery && G.delivery.state !== "done") return RATE.bedside;
    var held = clockHeld();
    // the moment a baby comes back from red is itself news; do not snap straight to full
    if (held !== G.wasHeld) { G.wasHeld = held; notice(); }
    /* A hold stops the clock RACING, it does not make it crawl. The first version made a
       red alarm pin the whole unit to the bedside rate, which sounds principled and plays
       badly: a baby you cannot fix yet - waiting on a gas, waiting on an echo - locked the
       player out of passing any time at all, so neglect was punished with tedium instead
       of with the handover report. */
    if (held) return RATE.ward;
    var idle = (Date.now() - Math.max(G.lastInput, G.lastNotice)) / 1000;
    if (idle < IDLE_BEFORE_FAST) return RATE.ward;
    var t = Math.min(1, (idle - IDLE_BEFORE_FAST) / RAMP_SECONDS);
    return RATE.ward + (RATE.fast - RATE.ward) * t;
  }

  /* The visible clock is allowed to lag the real one, and that lag is the whole of the
     cost animation: G.advance jumps the world instantly - six callers depend on it having
     finished when it returns - and the face winds forward afterwards. */
  /* What an action just cost, said in the units the player pressed it in: minutes at a
     bedside, seconds in the delivery room. It holds for its own moment rather than for as
     long as the face takes to wind, because a thirty-second cost winds in one frame. */
  function showCost(label) { G.clockCost = label; G.clockCostUntil = Date.now() + 1100; }
  function costLabel() { return Date.now() < (G.clockCostUntil || 0) ? G.clockCost : ""; }

  function windClock(dtReal) {
    if (G.clockLag <= 0) { G.clockLag = 0; return; }
    var per = Math.max(12, G.clockLag / 0.9);     // a big cost takes a little longer to spend
    G.clockLag = Math.max(0, G.clockLag - per * dtReal);
  }
  // what the player's clock reads: the world, minus the bit still winding on, plus the
  // minutes that have passed but not yet come due as a five-minute step
  function shownMin() {
    return Math.max(0, Math.min(SHIFT_LEN, G.min + G.acc - G.clockLag));
  }

  function frame() {
    if (!G.running) return;
    var t = Date.now();
    var raw = (t - (G.lastFrame || t)) / 1000;
    G.lastFrame = t;
    /* Frames are counted exactly, or not at all. Clamping a long gap instead of dropping it
       looked safer and was worse: a browser throttling a background tab to one frame a
       second had forty percent of every frame quietly thrown away, so the night ran at two
       thirds speed and both clocks drifted from real time without anything looking wrong.
       Anything over a second and a half was the machine being busy, not time passing.
       (document.hidden would be the obvious test and is not safe to rely on - it reads
       true in some embedded contexts, where it would stop the game dead.) */
    var dtReal = raw > 1.5 ? 0 : raw;

    var r = G.clockRate = clockRate();
    if (r > 0) {
      var gameMinutes = r * dtReal;
      /* The same slice of time, spent in both places at once - which is the whole point.
         It advances only while you are IN the room, and that is a claim about Priya rather
         than an exemption from the clock: left alone she holds the baby where it is, which
         is what a good RRT does and what the line at the top of the room promises. She
         cannot advance the algorithm, because that is the part that needed you. The cost
         of being away is the twenty-five minutes before the registrar takes it off you. */
      if (G.view.mode === "delivery" && G.delivery && G.delivery.state === "here") {
        DEL.advance(G.delivery, G.delivery.sc, gameMinutes * 60);
        updateDeliveryLive();
      }
      G.acc += gameMinutes;
      var stepped = 0;
      while (G.acc >= S.TICK && G.running && !G.dialogOpen && !G.crisis && stepped < 30) {
        G.acc -= S.TICK; stepWorld(S.TICK); stepped++;
      }
      if (stepped) render();
    }
    giveUpOnCall();
    windClock(dtReal);
    renderTop();
    G.timer = setTimeout(frame, FRAME_MS);
  }

  /* ------------------------------------------------------------------ lab parts
     A blood count used to come back as the bare string "WBC 6.2 / Hgb 9.4 / CRP 14", which
     tells a beginner only that numbers exist. Every analyte with a meaningful reference
     range now carries one, on hover, from js/clinical.js - so the range a clinician can
     argue with and the sentence the player reads are the same object - and the number that
     is actually out of range is marked, rather than the whole row going red as one.

     Narrative results (films, echo, culture) have no range and keep their plain sentence. */
  function part(key, label, value) {
    var r = CL.ref[key], v = parseFloat(value);
    var bad = !!r && ((r.lo != null && v < r.lo) || (r.hi != null && v > r.hi));
    var band = !r ? "" : r.lo != null && r.hi != null ? r.lo + "\u2013" + r.hi
             : r.hi != null ? "under " + r.hi : "over " + r.lo;
    /* "Expected", not "Normal". Two of these bands are not normal ranges: the CO2 ceiling is
       the one permissive hypercapnia allows, and the haemoglobin band runs from the
       physiological nadir to polycythaemia. They are the bounds the game marks against, and
       the sentence after them says what each end actually means. */
    return { label: label, value: value, bad: bad,
             tip: (band ? "Expected " + band + (r.unit ? " " + r.unit : "") + ". " : "") + (r ? r.tip : "") };
  }

  function labValueHtml(rec) {
    if (!rec.parts) return gl(rec.v);
    return rec.parts.map(function (p) {
      return GL.tip('<span class="lpart' + (p.bad ? " abn" : "") + '">' +
                    esc(p.label ? p.label + " " + p.value : p.value) + "</span>", p.tip);
    }).join(' <span class="lsep">/</span> ');
  }

  // ------------------------------------------------------------------ results
  function deliverResults() {
    G.babies.forEach(function (b) {
      b.pending = b.pending.filter(function (p) {
        if (G.min < p.due) return true;
        notice();                    // you sent for this; you should get a beat to read it
        var h = b.h, t;
        var before = Object.keys(b.labs).length;
        if (p.kind === "glucose") { var r = Math.round(h.glucose);
          b.labs.glucose = { v: r + " mg/dL", crit: r < 40 || r > 180, at: G.min,
            parts: [{ label: "", value: r + " mg/dL", bad: r < CL.glucose.low || r > 180,
              tip: "Expected over " + CL.glucose.low + " mg/dL. Under " + CL.glucose.low + " a baby goes " +
                   "jittery and starts having spells; under " + CL.glucose.severe + " the brain is at risk and it " +
                   "is an emergency. A bolus lifts it for an hour - it is the infusion rate that holds it up. " +
                   "The threshold really rises with age: in the first four hours of life a healthy newborn is " +
                   "allowed to sit lower than this while the milk gets going. One number is used here throughout." }] };
          log("Glucose on " + b.name + ": " + r, r < 40 ? "warn" : ""); }
        if (p.kind === "gas") { var ph = S.pHfrom(b).toFixed(2), co = Math.round(h.co2), be = Math.round(h.baseDeficit);
          b.labs.gas = { v: "pH " + ph + " / CO2 " + co + " / base deficit " + be, crit: ph < 7.2 || co > 65, at: G.min,
            parts: [part("pH", "pH", ph), part("co2", "CO2", co), part("baseDeficit", "base deficit", be)] };
          log("Gas on " + b.name + ": pH " + ph + ", CO2 " + co, ph < 7.2 ? "warn" : ""); }
        if (p.kind === "cbc") { var w = h.wbc.toFixed(1), hb = h.hgb.toFixed(1), cr = h.crp.toFixed(0);
          b.labs.cbc = { v: "WBC " + w + " / Hgb " + hb + " / CRP " + cr,
                         crit: h.wbc < CL.ref.wbc.lo || h.wbc > CL.ref.wbc.hi ||
                               h.hgb < CL.hgb.flagAt || h.crp > CL.ref.crp.hi, at: G.min,
                         parts: [part("wbc", "WBC", w), part("hgb", "Hgb", hb), part("crp", "CRP", cr)] };
          log("Blood count on " + b.name + ": WBC " + w + ", Hgb " + hb + ", CRP " + cr,
              (h.wbc < CL.ref.wbc.lo || h.hgb < CL.hgb.flagAt || h.crp > CL.ref.crp.hi) ? "warn" : ""); }
        if (p.kind === "bili") { var bl = h.bili.toFixed(1), th = h.biliThreshold.toFixed(0);
          b.labs.bili = { v: bl + " mg/dL, threshold " + th, crit: h.bili > h.biliThreshold, at: G.min,
            parts: [{ label: "", value: bl + " mg/dL", bad: h.bili > h.biliThreshold,
                      tip: "There is no single normal bilirubin. The threshold is drawn for this baby's " +
                           "gestation and age in hours and rises through the first days of life, which is " +
                           "why a level is meaningless without one - and why jaundice cannot be judged by eye." },
                    { label: "threshold", value: th,
                      tip: "Tonight's treatment threshold for " + b.name + ": " + th + " mg/dL, from " +
                           b.ga + " weeks gestation and " + b.dol + " days of life. Above it, " +
                           "start phototherapy. Light is cheap and very safe; kernicterus is neither." }] };
          log("Bilirubin on " + b.name + ": " + bl + " (threshold " + th + ")", h.bili > h.biliThreshold ? "warn" : ""); }
        if (p.kind === "axr") {
          if (p.chest) { t = h.ptx ? "a large air leak on one side with the lung collapsed" :
              h.ettDisplaced ? "the breathing tube is too low, in the right main bronchus" :
              h.rds > 1.3 ? "diffuse ground-glass lungs with air bronchograms - RDS" :
              h.secretions > 0.5 ? "patchy areas of collapse" : "lungs reasonably expanded, tube in a good position";
            b.labs.cxr = { v: t, crit: h.ptx || h.ettDisplaced, at: G.min }; }
          else { t = h.necGrade > 1.4 ? "gas in the wall of the bowel - pneumatosis. This is NEC." :
              h.necGrade > 0 ? "dilated loops of bowel, no pneumatosis yet" : "a normal bowel gas pattern";
            b.labs.axr = { v: t, crit: h.necGrade > 1.4, at: G.min }; }
          log("X-ray on " + b.name + ": " + t, (h.ptx || h.necGrade > 1.4) ? "bad" : "");
        }
        if (p.kind === "hus") { var g = h.ivhGrade;
          t = g === 0 ? "no bleeding seen" : g === 1 ? "a small grade 1 bleed in the germinal matrix" :
              g === 2 ? "a grade 2 bleed with some blood in the ventricle" : "a grade 3 bleed, the ventricle filling";
          b.labs.hus = { v: t, crit: g >= 3, at: G.min };
          log("Head ultrasound on " + b.name + ": " + t, g >= 2 ? "bad" : ""); }
        if (p.kind === "echo") {
          t = h.pda > 0.5 ? "a large patent ductus arteriosus with significant shunting" :
              h.pda > 0.2 ? "a small duct, not haemodynamically significant" : "the duct is closed and the heart is structurally normal";
          if (h.pphn > 0.2) t += "; pressures in the lung arteries are high (pulmonary hypertension)";
          b.labs.echo = { v: t, crit: h.pda > 0.5 || h.pphn > 0.2, at: G.min };
          log("Echo on " + b.name + ": " + t, h.pda > 0.5 ? "warn" : ""); }
        /* Every result, into this baby's own history with the time it came back on it. */
        var got = p.chest ? "cxr" : p.kind;
        if (b.labs[got]) recordHistory(b, "result", testName(got) + ": " + b.labs[got].v);
        return false;
      });
      if (b.h.cultureDrawn && !b.labs.culture && G.min - b.h.cultureAt > 300) {
        var pos = b.h.sepsis > 0.08;
        b.labs.culture = { v: pos ? "GROWING organisms at five hours" : "no growth so far", crit: pos, at: G.min };
        log("Blood culture on " + b.name + ": " + (pos ? "positive" : "no growth yet"), pos ? "bad" : "good");
        recordHistory(b, "result", "Blood culture: " + b.labs.culture.v);
        notice();
        if (pos && !b.h.abx) addScore(-6, "Culture grew on " + b.name + " with no antibiotics running");
      }
    });
  }

  // ---------------------------------------------------------------- admission
  function checkAdmission() {
    if (G.admissionDue == null || G.min < G.admissionDue) return;
    G.admissionDue = null;
    // there is one empty bedspace, and a transport and a delivery can both be offered
    if (G.babies.some(function (b) { return b.bed === 6 && !b.discharged && !b.died; })) {
      log("Bed six is already taken, so that baby went to the unit across town.", "warn");
      return;
    }
    G.admissionDone = true;
    finishAdmission();
  }

  /* ----------------------------------------------------------- delivery room
     Delivery is a place. The phone tells you a baby is coming and you hang up; the
     delivery room appears in the ward as somewhere to go, and you go there by clicking
     it. Inside it works like a bedside - a colleague tells you what they see, you press
     real controls, and each one answers - and you leave by deciding what happens to the
     baby. See js/deliveries.js for the scenarios and what they need. */
  var DEL = window.Deliveries;

  /* Chosen when the phone rings, not when you arrive, so the caller can tell you what is
     actually coming rather than describing a different baby. */
  G.pickDelivery = function () {
    if (!G.pendingDelivery) {
      G.pendingDelivery = DEL.SCENARIOS[Math.floor(S.rnd() * DEL.SCENARIOS.length) % DEL.SCENARIOS.length];
    }
    return G.pendingDelivery;
  };

  G.summonDelivery = function () {
    if (G.delivery) return;
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
    log("The delivery room is waiting for you. " + cap(sc.label) + ".", "hi");
    notice();
    render();          // the room has to appear in the ward now, not on the next tick
    Snd.attention(true);
  };

  /* The baby does not wait. Whether you never came or stepped out and did not come back,
     after twenty-five minutes the labour ward registrar does it instead of you. Standing
     in the room does not count as away, so nobody is punished for taking their time. */
  function checkDeliveryAbandoned() {
    var d = G.delivery;
    if (!d || d.state === "done") return;
    if (G.view.mode === "delivery") { d.awayAt = null; return; }
    if (d.awayAt == null) d.awayAt = d.state === "called" ? d.calledAt : G.min;
    if (G.min - d.awayAt < 25) return;
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
    if (d.state === "called") { d.state = "here"; d.arrivedAt = G.min; G.advance(3); }
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

  /* Which baby comes up to bed 6, resolved here rather than in finishAdmission, so a
     scenario whose right answer is that NOBODY comes up can still say who arrives on
     the path where the player admits them anyway. Without this the well 39-week baby
     you separated from her mother arrived in bed 6 as somebody else's 30-week preemie. */
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
      log("Taking Baby up from the delivery room to bed 6.", "hi");
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
         "next step without you. Come back within about twenty-five minutes, or the labour ward " +
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

  function finishAdmission() {
    if (!G.running) return;
    var from = G.admissionFrom, arr = from && from.arrival;
    var b = P.makeAdmission(G.difficulty, G.nameUsed, arr ? arr.archKey : null);
    b.bed = 6;
    b.visitWindow = [3, 7];
    if (arr) b.ga = from.ga;
    var poor = !!G.admissionPoor;
    if (arr) b.h.coreTemp = poor ? arr.tempIfPoor : arr.tempIfGood;
    else if (G.admissionColder) b.h.coreTemp = 35.4;
    // a good resuscitation leaves the lungs BETTER; the old floor of 0.55 quietly gave
    // a well term baby respiratory distress it had never had
    if (!poor && b.h.rds != null) b.h.rds = Math.max(0, b.h.rds - 0.35);
    b.h.uvc = true; b.h.dexPct = 10; b.h.ivRate = 80;
    G.babies.push(b);
    G.advance(20);
    log("New admission: Baby " + b.surname + ", " + b.ga + " weeks, to bed 6", "hi");
    showDialog({
      avatar: "renata", who: "Renata Cruz, RN", role: "Night nurse",
      said: "Bed six is set up and warm. Baby " + b.surname + " is settled on " + supportLabel(b) +
            ", temperature " + b.h.coreTemp.toFixed(1) + ". " +
            // "had" is past tense and does not conjugate, so this is safe for they/them too
            (poor ? b.pronoun.S + " had a harder time getting here than anybody wanted. " : "") +
            "The parents are still in theatre recovery, so " + b.pronoun.s +
            " " + b.pronoun.has + " no first name on the chart yet. Everything else is yours.",
      opts: [{ label: "Understood", hint: "", run: function () {
        return { text: "Warm, pink and sweet: temperature, oxygen and glucose. That is the whole of a good admission in three words.", kind: "good" }; } }]
    });
  }

  // ------------------------------------------------------------------ render
  function supportLabel(b) {
    var s = b.support, f = Math.round(s.fio2 * 100);
    if (s.mode === "RA") return "room air";
    if (s.mode === "NC") return "cannula " + f + "%";
    if (s.mode === "CPAP") return "CPAP " + s.cpap + " / " + f + "%";
    return "VENT " + s.pip + "/" + s.peep + " rate " + s.rate + " / " + f + "%";
  }
  function supportClass(b) {
    return b.support.mode === "VENT" ? "vent" : b.support.mode === "CPAP" ? "cpap" : b.support.mode === "NC" ? "nc" : "";
  }
  function displayName(b) { return (b.unnamed ? "Baby " + b.surname : b.name + " " + b.surname); }
  function bedAccent(b) { return "bed-c" + (((b.bed - 1) % 6) + 1); }

  /* The callout pins itself directly under the header, and the header can wrap to two
     lines on a narrow screen, so the offset is measured rather than guessed. */
  function syncStickyOffsets() {
    var head = $("stage") && $("stage").querySelector(".bedside-head");
    if (!head) return;
    $("stage").style.setProperty("--head-h", Math.round(head.getBoundingClientRect().height) + "px");
  }

  // ---- explain-everything helpers -------------------------------------------
  function lbs(g) {
    var t = g / 453.592, lb = Math.floor(t), oz = Math.round((t - lb) * 16);
    if (oz === 16) { lb++; oz = 0; }
    return lb + " lb " + oz + " oz";
  }
  function gaTip(b) {
    var now = (b.ga + b.dol / 7);
    return "Gestational age at birth: this baby grew for " + b.ga + " weeks inside before being born. " +
           "Full term is about 40 weeks, and anything before 37 is premature. Counting the days since, " +
           b.pronoun.s + " " + b.pronoun.is + " now about " + now.toFixed(0) + " weeks corrected.";
  }
  function dolTip(b) {
    return "Day of life: how many days old " + b.pronoun.s + " " + b.pronoun.is + ". Day 0 is the day of birth, so " +
           "day " + b.dol + " means " + (b.dol === 0 ? "born today" : b.dol + " day" + (b.dol === 1 ? "" : "s") + " ago") + ".";
  }
  function wtTip(b) {
    return "Weight: " + (b.weightG / 1000).toFixed(2) + " kilograms, about " + lbs(b.weightG) + ". " +
           "A full-term newborn is usually 3 to 4 kg. The smallest babies in a NICU can be under 1 kg.";
  }
  function fio2Tip(b) {
    var f = Math.round(b.support.fio2 * 100);
    return f <= 21 ? "21 percent oxygen, which is ordinary room air. No extra oxygen is being given."
      : f + " percent oxygen in the air " + b.pronoun.s + " " + b.pronoun.is + " breathing. Room air is 21 percent, so " +
        b.pronoun.s + " " + b.pronoun.is + " getting extra. Aim for the least that keeps the saturation in the low 90s.";
  }

  // gestation / age / weight / pronouns, each part hoverable
  function metaHtml(b, opts) {
    opts = opts || {};
    var wk = opts.short ? b.ga + "w" : b.ga + " weeks";
    var kg = (b.weightG / 1000).toFixed(2) + (opts.short ? "kg" : " kg");
    var parts = [
      GL.tip(wk, gaTip(b)),
      GL.tip("day " + b.dol, dolTip(b)),
      GL.tip(kg, wtTip(b))
    ];
    if (!opts.short) parts.push(GL.tip(b.pronoun.s + "/" + b.pronoun.o,
      "The words this baby's family uses for " + b.pronoun.o + ". Newborns too young to be named are often charted by surname alone."));
    return parts.join(" &middot; ");
  }

  // the support summary, with every number explained
  function supportHtml(b) {
    var s = b.support, f = Math.round(s.fio2 * 100);
    var ox = GL.tip(f + "%", fio2Tip(b));
    if (s.mode === "RA") return GL.term("room air", "room air");
    if (s.mode === "NC") return GL.term("cannula", "cannula") + " " + ox;
    if (s.mode === "CPAP") {
      return GL.term("CPAP", "CPAP") + " " +
        GL.tip(s.cpap, s.cpap + " centimetres of water: the steady pressure holding the lungs open between " +
          "breaths so they never fully collapse. Typical is 5 to 8.") + " / " + ox;
    }
    return GL.term("VENT", "VENT") + " " +
      GL.tip(s.pip, "Peak pressure " + s.pip + ": the hardest push the machine gives on each breath. " +
        "Gentler is better; much above 20 to 25 starts to injure a small baby's lungs.") + "/" +
      GL.tip(s.peep, "PEEP " + s.peep + ": the pressure left in the lungs at the end of each breath, so the " +
        "air sacs never fully close.") + " rate " +
      GL.tip(s.rate, s.rate + " machine breaths per minute.") + " / " + ox;
  }

  // one labelled vital, label explained, value explained in context
  function vitalHtml(label, value, term, valueTip) {
    return "<span>" + GL.term(label, term) + " <b>" +
      (valueTip ? GL.tip(value, valueTip) : value) + "</b></span>";
  }

  /* One definition of "the saturation is wrong", used by the cot card and by the bedside
     monitor. They were written out separately and would have drifted the moment either
     changed. Both now say the same thing the alarm says. */
  function lowSatFor(b) {
    return b.mon.spo2 < (b.support.fio2 > 0.21 ? CL.sat.alarmLowOnOxygen : CL.sat.alarmLowRoomAir);
  }
  function highSatFor(b) { return b.mon.spo2 > CL.sat.alarmHigh && b.support.fio2 > 0.21; }

  function hrTip(b) { return b.mon.hr + " beats per minute. Newborns normally run " + CL.hr.normalLow +
      " to " + CL.hr.normalHigh + " - much faster than you."; }
  function rrTip(b) { return b.mon.rr === 0 ? "No breaths being counted right now." :
                             b.mon.rr + " breaths per minute. Newborns normally take 30 to 60."; }
  function satTip(b) { return b.mon.spo2 + " percent of the blood's haemoglobin is carrying oxygen. " +
      "For a preemie on extra oxygen the aim is " + CL.sat.targetLow + " to " + CL.sat.targetHigh + ", not 100."; }
  function mapTip(b) { return "Mean blood pressure " + b.mon.map + ". A rough guide for a preemie is that it " +
                              "should be at least the number of weeks they were born at, here " + b.ga + "."; }
  function tempTip(b) { return b.mon.temp.toFixed(1) + " degrees Celsius. A baby should sit between " +
      CL.temp.normalLow + " and " + CL.temp.normalHigh + ". Below " + CL.temp.hypothermia +
      " is properly cold, and cold is dangerous."; }

  function vitalsHtml(b) {
    return vitalHtml("HR", b.mon.hr, "HR", hrTip(b)) +
           vitalHtml("SpO2", b.mon.spo2 + "%", "SpO2", satTip(b)) +
           vitalHtml("RR", b.mon.rr, "RR", rrTip(b)) +
           vitalHtml("MAP", b.mon.map, "MAP", mapTip(b)) +
           vitalHtml("T", b.mon.temp.toFixed(1), "T", tempTip(b));
  }

  /* Every panel here rebuilds its innerHTML on the clock, which destroys whatever the
     keyboard was standing on. Focus fell back to <body> every 2.4 seconds - so a keyboard
     player could tab to a cot and then find that Enter did nothing, because the button
     they were on no longer existed. Elements carry a stable data-focus-key and get it
     back after the rebuild. (The real fix is to stop rebuilding whole panels on a timer;
     that is a bigger change than this one.) */
  /* Writing innerHTML that is byte-for-byte what is already there is not free: it destroys
     and rebuilds every node underneath. In the delivery room that ran five times a second,
     which meant the button you were reaching for was a DIFFERENT ELEMENT by the time your
     mouse came back up - so the click never fired, and the tooltip you were reading
     flickered out from under the cursor. */
  function setHtml(el, html) {
    if (!el || el.__html === html) return false;
    el.__html = html;
    el.innerHTML = html;
    return true;
  }

  function keepFocus(root, redraw) {
    var a = document.activeElement;
    var key = (a && root && root.contains(a)) ? a.getAttribute("data-focus-key") : null;
    var scroll = root ? root.scrollTop : 0;
    redraw();
    if (root) root.scrollTop = scroll;
    if (!key || !root) return;
    var back = root.querySelector('[data-focus-key="' + key.replace(/["\\]/g, "") + '"]');
    if (back) { try { back.focus(); } catch (e) {} }
  }

  function testLabel(k) {
    var t = NG.TEST_LABEL[k];
    return t ? GL.tip(t[0], t[1]) : cap(k);
  }
  /* The same name with no markup on it. testLabel returns a hoverable span, and anything that
     is going to be escaped later - a history entry, an announcement - needs the words only, or
     the tag arrives on screen as text. */
  function testName(k) {
    var t = NG.TEST_LABEL[k];
    return t ? t[0] : cap(k);
  }

  function render() {
    renderTop();
    if (G.view.mode === "handover") return;      // the handover page owns the stage
    if (G.view.mode === "ward") renderWard();
    else if (G.view.mode === "delivery") { updateDeliveryLive(); renderSide(); return; }
    else if (G.view.mode === "bed") updateBedLive();
    renderSide();
  }

  /* The player is not driving the clock any more, so it has to say what it is doing and
     why - otherwise racing digits are just unexplained. */
  function renderClockState() {
    var n = $("clockState"); if (!n) return;
    var c = $("clock"), r = G.clockRate, txt = "", cls = "", cost = costLabel();
    if (cost) { txt = "+" + cost; cls = "cost"; }
    else if (G.paused) { txt = "held"; cls = "held"; }
    else if (r === 0) txt = "";
    else if (r > RATE.ward + 0.4) { txt = "running on"; cls = "fast"; }
    else if (r <= RATE.delivery) { txt = "in the delivery room"; cls = "slow"; }
    else if (r <= RATE.bedside) {
      txt = G.call ? "the phone is ringing"
          : G.view.mode === "bed" ? "at the bedside" : "they are waiting for you";
      cls = "slow";
    }
    else if (clockHeld()) { txt = "the unit is busy"; cls = "held"; }
    if (n.__t !== txt) { n.textContent = txt; n.__t = txt; }
    var want = "clock-state " + cls;
    if (n.className !== want) n.className = want;
    if (c) c.classList.toggle("winding", G.clockLag > 0.05);
  }

  function renderTop() {
    var shown = shownMin();
    $("clock").textContent = clockStr(shown);
    var left = Math.max(0, Math.round(SHIFT_LEN - shown));
    $("clockSub").textContent = Math.floor(left / 60) + "h " + (left % 60) + "m left";
    renderClockState();
    $("statTrust").innerHTML = "Family trust <b>" + Math.round(Math.max(0, Math.min(100, G.trust))) + "</b>";
    var lvl = $("statLevel");
    if (lvl && !lvl.dataset.set) {
      lvl.dataset.set = "1";
      var name = { student: "Student", resident: "Resident", attending: "Attending" }[G.difficulty];
      var bits = [G.nudges ? "prompts on" : "no prompts", G.allowDeath ? "deaths on" : "deaths off"];
      lvl.innerHTML = "<b>" + name + "</b> &middot; " + bits.join(" &middot; ");
      lvl.setAttribute("data-tip",
        name + " level. " +
        (G.difficulty === "student"
          ? "Four babies, nothing new arrives mid-shift, illnesses declare themselves slowly, and procedures rarely fail."
          : G.difficulty === "attending"
          ? "Five babies, illness declares itself fast, fragile brains, and procedures fail more often."
          : "Five babies, the phone rings, and something will arrive from the delivery room.") +
        (G.nudges ? " Thinking prompts are shown." : " No thinking prompts.") +
        (G.allowDeath ? " A baby can die if a crisis is ignored for a long time." : " Babies cannot die."));
    }
    var al = G.babies.filter(function (b) { return !b.died && b.alarm.level !== "none"; }).length;
    $("statAlarm").innerHTML = "Alarms <b>" + al + "</b>";
    /* On a phone the side panel is a sheet you open, so the button has to carry what is
       waiting behind it - otherwise closing the panel means losing the unit's only
       summary of who wants you. */
    var waiting = G.concerns.filter(function (c) { return !c.done; }).length + G.talks.length + al;
    var urgent = G.concerns.some(function (c) { return !c.done && !c.stale && c.def.severity === "urgent"; }) ||
                 G.babies.some(function (b) { return !b.died && b.alarm.level === "red"; });
    var sc = $("sideCount"), sb = $("btnSide");
    if (sc) sc.textContent = waiting;
    if (sb) {
      sb.className = "side-toggle" + (urgent ? " urgent" : "");
      // the word "Waiting" is hidden on a narrow phone, so the name lives here
      sb.setAttribute("aria-label", waiting === 0 ? "Nobody is waiting. Show the side panel"
        : waiting + " waiting" + (urgent ? ", one of them urgent" : "") + ". Show the side panel");
    }
    var pb = $("btnPause");
    pb.textContent = G.paused ? "▶ Resume" : "⏸ Pause";
    pb.setAttribute("aria-pressed", G.paused ? "true" : "false");
    var ph = $("btnPhone");
    ph.className = "phone-btn" + (G.call ? " ringing" : "");
    ph.innerHTML = G.call ? "☎ " + esc(G.call.def.preview) : "☎";
    ph.title = G.call ? "The phone is ringing" : "No calls";
  }

  /* What the cot card says out loud. A screen reader was getting a div full of loose
     numbers with no name and no way to activate it; this is the same information the
     sighted player takes in at a glance, in the order they take it in. */
  function podLabel(b, c, stale, tk) {
    var parts = ["Bed " + b.bed, displayName(b), b.ga + " weeks"];
    if (c) parts.push(EV.CHARS[c.who].name.split(",")[0] +
      (c.def.severity === "urgent" ? " needs you now" : " needs you") + ": " + c.summaryText);
    if (stale) parts.push(EV.CHARS[stale.who].name.split(",")[0] + " has stood down");
    if (tk) parts.push((tk.def.who === "parent" ? b.parentName : EV.CHARS[tk.who].name.split(",")[0]) +
      " " + tk.def.badge);
    if (b.alarm.level !== "none")
      parts.push((b.alarm.level === "red" ? "Red alarm" : "Amber alarm") + ": " + b.alarm.reasons.join(", "));
    parts.push("Heart rate " + b.mon.hr + ", saturation " + b.mon.spo2 + " percent, temperature " +
               b.mon.temp.toFixed(1) + ", on " + supportLabel(b));
    return parts.join(". ") + ".";
  }

  function renderWard() {
    var h = '<h2>The unit &middot; ' + G.babies.filter(function (b) { return !b.died; }).length + ' babies</h2><div class="ward">';
    G.babies.forEach(function (b, i) {
      if (b.died) {
        h += '<div class="pod empty"><div class="pod-head"><div><div class="pod-name">' + esc(displayName(b)) +
          '</div><div class="pod-meta">bed ' + b.bed + '</div></div></div>' +
          '<div class="muted" style="padding:18px 4px">This bedspace is quiet now.</div></div>';
        return;
      }
      var c = activeConcernFor(b), stale = !c && openConcernFor(b);
      var tk = G.talks.filter(function (t) { return t.bed === b.bed; })[0];
      var lvl = b.alarm.level;
      h += '<div class="pod ' + (lvl === "red" ? "alarm-red" : lvl === "amber" ? "alarm-amber" : "") +
        (c ? " has-concern concern-" + c.def.severity : "") + '">' +
        '<button type="button" class="pod-hit" data-bed="' + i + '" data-focus-key="bed-' + b.bed +
        '" aria-label="' + esc(podLabel(b, c, stale, tk)) + '"></button>';
      if (c || tk || stale) {
        h += '<div class="pod-flags">' +
          (c ? '<span class="flag ' + c.def.severity + '" title="' + esc(EV.CHARS[c.who].name) + '">' +
               A.miniAvatar(EV.CHARS[c.who].av) +
               "<span>" + (c.def.severity === "urgent" ? "needs you now" : "needs you") + "</span></span>" : "") +
          (stale ? '<span class="flag stood" title="' + esc(EV.CHARS[stale.who].name) + '">' +
               A.miniAvatar(EV.CHARS[stale.who].av) + "<span>all clear</span></span>" : "") +
          (tk ? '<span class="flag talk">' + A.miniAvatar(tk.def.who === "parent" ? b.parentAvatar : EV.CHARS[tk.who].av) +
               "<span>" + esc(tk.def.badge) + "</span></span>" : "") + "</div>";
      }
      h += '<div class="pod-head"><div><div class="pod-name">' + esc(displayName(b)) + "</div>" +
        '<div class="pod-meta">' + metaHtml(b, { short: true }) + "</div></div>" +
        '<div class="bed-no ' + bedAccent(b) + '">bed ' + b.bed + "</div></div>" +
        '<div class="pod-body"><div class="pod-baby">' + A.baby(seen(b)) + "</div><div class=\"vitals\">" +
        vT("hr", "HR", b.mon.hr, b.mon.hr < CL.hr.alarmLow || b.mon.hr > CL.hr.alarmHigh, hrTip(b)) +
        vT("spo2", "SpO2", b.mon.spo2, lowSatFor(b) || highSatFor(b), satTip(b)) +
        vT("rr", "RR", b.mon.rr, b.mon.rr === 0, rrTip(b)) +
        vT("bp", "MAP", b.mon.map, b.mon.map < b.ga + CL.map.flagAt, mapTip(b)) +
        vT("temp", "T", b.mon.temp.toFixed(1), b.mon.temp < CL.temp.coldStress || b.mon.temp > CL.temp.normalHigh, tempTip(b)) +
        "</div></div>" +
        '<div class="pod-foot"><span class="support-tag ' + supportClass(b) + '">' + supportHtml(b) + "</span>" + chips(b) + "</div></div>";
    });
    h += deliveryPod();
    keepFocus($("stage"), function () { $("stage").innerHTML = h + "</div>"; });
  }

  /* The delivery room sits in the ward like a bedspace, so that going there is a place you
     click rather than an overlay that happens to you. Quiet all night until it is not. */
  function deliveryPod() {
    var d = G.delivery, waiting = d && d.state === "called";
    if (!waiting && (!d || d.state !== "here")) {
      var been = d && d.state === "done";
      return '<div class="pod empty del-pod"><div class="pod-head"><div><div class="pod-name">Delivery room</div>' +
        '<div class="pod-meta">two floors down</div></div><div class="bed-no">DR</div></div>' +
        '<div class="muted" style="padding:18px 4px">' +
        (been ? "Nothing more from down there tonight." : "Nobody is asking for you. If a baby is coming, the phone rings first.") +
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
  function vT(c, l, v, bad, tipText) {
    var val = tipText ? GL.tip(v, tipText) : v;
    return '<div class="v ' + c + '"><span class="lbl">' + GL.term(l, l) + '</span><span class="val' + (bad ? " bad" : "") + '">' + val + "</span></div>";
  }
  function chip(cls, text, tipText) {
    return '<span class="chip ' + cls + '">' + GL.tip(text, tipText) + "</span>";
  }
  function chips(b) {
    var c = "";
    if (b.h.apneaNow) c += chip("bad", "apnea now", "Right now this baby has stopped breathing. Usually a gentle rub is all it takes to restart them.");
    if (b.h.spellsThisHour > 1) c += chip("warn", b.h.spellsThisHour + " spells this hour", GL.TERMS["spells"] + " More than usual is a signal that something has changed.");
    if (b.pending.length) c += chip("", b.pending.length + " pending", "Tests you have sent that have not come back yet.");
    if (b.h.photo) c += chip("", "phototherapy", GL.TERMS["phototherapy"]);
    if (b.h.abx) c += chip("good", "antibiotics", GL.TERMS["antibiotics"]);
    if (b.h.caffeine) c += chip("good", "caffeine", GL.TERMS["caffeine"]);
    if (b.h.kangaroo) c += chip("good", "skin to skin", GL.TERMS["skin to skin"]);
    if (G.parentPresent(b) && !b.h.kangaroo)
      c += chip("parent", esc(b.parentName) + " is here", "A parent is at the bedside right now. You can go and talk to them, or offer them skin to skin.");
    return c;
  }

  // ----------------------------------------------------------------- bedside
  function openBed(i) {
    var b = G.babies[i];
    if (!b) return;                      // never leave the view pointing at a cot that is not there
    G.view = { mode: "bed", bed: i };
    var c = openConcernFor(b);
    /* Everyone waiting here counts as seen, not only whoever is open. The row of faces shows
       each of them and what they want, so a player standing at this cot HAS met them - and
       crediting only the open one meant doing the right thing for the second nurse earned
       nothing at all. */
    concernsAt(b).forEach(function (x) { if (!x.seen) { x.seen = true; x.seenAt = G.min; } });
    Snd.click(); playerActed();
    document.body.classList.remove("side-open");
    var sb = $("btnSide"); if (sb) sb.setAttribute("aria-expanded", "false");
    renderBed();
    announce("Bedside, bed " + b.bed + ", " + displayName(b) + (c && !c.stale ? ". " + cap(c.summaryText) : ""));
    var st = $("stage");
    if (st) {
      st.scrollTop = 0;                     // you arrive at the top of a cot, not halfway down it
      st.classList.remove("arriving"); void st.offsetWidth; st.classList.add("arriving");
      st.focus();
    }
  }
  function backToWard() { G.view = { mode: "ward", bed: null }; render(); }

  function renderBed() {
    var b = G.babies[G.view.bed], s = b.support;
    var h = '<div class="bedside-head"><button class="btn ghost small" id="btnBack">&larr; The unit</button>' +
      '<span class="bed-badge ' + bedAccent(b) + '">' +
      GL.tip("bed " + b.bed, "Which bedspace in the unit. Staff often refer to a baby by bed number as well as by name. " +
             "Each bed keeps its own colour so you can see at a glance which one you are standing at.") +
      "</span>" +
      "<h2>" + esc(displayName(b)) + "</h2>" +
      '<span class="muted">' + metaHtml(b) + "</span></div>";
    h += '<div id="callout"></div><div id="people"></div>';
    h += '<div class="bed-grid"><div>' +
      '<div class="crib" id="crib"></div>' +
      '<div class="panel"><h4>Handover</h4><div class="muted" style="font-size:.9rem">' + gl(b.handoff) + "</div></div>" +
      '<div class="panel"><h4>Results</h4><div class="labs" id="labs"></div></div>' +
      '<div class="panel"><h4>This baby\u2019s night</h4><div class="hist" id="hist"></div></div></div><div>';
    h += '<div class="monitor" id="monitor"></div>';
    h += '<div class="panel"><h4>Respiratory support</h4>' +
      '<div class="ctl-row"><label>' + GL.tip("Mode", "How much breathing help this baby is getting, from none at all up to a ventilator doing the work.") + '</label><div class="seg" id="segMode">' +
      ["RA", "NC", "CPAP", "VENT"].map(function (m) {
        return '<button data-mode="' + m + '" class="' + (s.mode === m ? "on" : "") + '" data-term="' + m + '">' + m + "</button>";
      }).join("") + "</div></div>" +
      ctl("Oxygen", "rFio2", 21, 100, 1, Math.round(s.fio2 * 100), Math.round(s.fio2 * 100) + "%", "FiO2");
    if (s.mode === "CPAP") h += ctl("CPAP", "rCpap", 4, 9, 1, s.cpap, s.cpap + " " + GL.term("cmH2O", "cmH2O"), "CPAP");
    if (s.mode === "VENT") {
      h += ctl("Peak (PIP)", "rPip", 12, 30, 1, s.pip, String(s.pip), "PIP") +
           ctl("PEEP", "rPeep", 3, 9, 1, s.peep, String(s.peep), "PEEP") +
           ctl("Rate", "rRate", 15, 60, 1, s.rate, String(s.rate), "breaths");
    }
    h += ctl("Isolette", "rIso", 32, 38, 0.1, s.isoTemp, s.isoTemp.toFixed(1) + "°", "isolette") +
         ctl("Humidity", "rHum", 30, 90, 5, s.humidity, s.humidity + "%", "humidity") + "</div>";
    h += '<div class="panel"><h4>Fluids &amp; feeds</h4>' +
      '<div class="ctl-row"><label>' + GL.term("Dextrose", "dextrose") + '</label><div class="seg" id="segDex">' +
      [0, 5, 10, 12.5].map(function (d) { return '<button data-dex="' + d + '" class="' + (b.h.dexPct === d ? "on" : "") + '">' + (d ? "D" + d : "none") + "</button>"; }).join("") +
      "</div></div>" +
      ctl("IV rate", "rIv", 0, 150, 10, b.h.ivRate, b.h.ivRate + " " + GL.term("mL/kg/d", "mL/kg/d"), "IV rate") +
      ctl("Feeds", "rFeed", 0, 180, 10, b.h.feedsMlKgD, b.h.feedsMlKgD + " " + GL.term("mL/kg/d", "mL/kg/d"), "feeds") +
      '<div class="muted mono" style="font-size:.82rem" id="girLine"></div></div>';

    var groups = [["Assess", "assess"], ["Imaging", "imaging"], ["Treat", "treat"], ["Procedures", "proc"], ["Care", "care"]];
    groups.forEach(function (g) {
      h += '<div class="panel"><h4>' + g[0] + '</h4><div class="act-grid">';
      Object.keys(NG.ACTIONS).forEach(function (id) {
        if (NG.ACTIONS[id].g !== g[1]) return;
        h += '<button class="act" data-act="' + id + '" data-tip="' + esc(NG.ACTIONS[id].info || "") + '">' +
             '<span class="t">' + esc(actionLabel(id, b)) + '</span><span class="c">' + NG.ACTIONS[id].cost + " min</span>" +
             '<span class="qmark">?</span></button>';
      });
      h += "</div></div>";
    });
    $("stage").innerHTML = h + "</div></div>";
    function slider(id, vid, fmt, set, done) {
      var r = $(id); if (!r) return;
      r.oninput = function () {
        var out = $(vid);
        out.innerHTML = fmt(+r.value);                 // the readout was rebuilt; make it hoverable again
        set(+r.value); updateBedLive();
      };
      r.onchange = function () { if (done) done(+r.value); };
    }
    var f0 = s.fio2, p0 = s.pip;
    /* Moving the dial yourself buys a window in which the nurse leaves it alone. Without it
       she would quietly undo a deliberate change within a minute or two, which reads as the
       game arguing with you. */
    slider("rFio2", "vFio2", function (v) { return v + "%"; },
      function (v) { b.support.fio2 = v / 100; b.h.o2HandsOff = CL.o2Nurse.handsOffMin; },
      function (v) { var nf = v / 100; if (nf < f0 - 0.005) { G.noteChange(b, "__fio2down"); NG.watchO2(b); }
                     else if (nf > f0 + 0.005) { G.noteChange(b, "__fio2up"); NG.watchO2(b); } f0 = nf; });
    slider("rCpap", "vCpap", function (v) { return v + " " + GL.term("cmH2O", "cmH2O"); }, function (v) { b.support.cpap = v; });
    slider("rPip", "vPip", String, function (v) { b.support.pip = v; },
      function (v) { if (v < p0) G.noteChange(b, "__pipdown"); else if (v > p0) G.noteChange(b, "__pipup"); p0 = v; });
    slider("rPeep", "vPeep", String, function (v) { b.support.peep = v; });
    /* The rate was the one ventilator control with no note attached, so nothing could tell
       whether you had answered a rising CO2 - or driven one into the floor. */
    var rt0 = b.support.rate;
    slider("rRate", "vRate", String, function (v) { b.support.rate = v; },
      function (v) { if (v < rt0) G.noteChange(b, "__ratedown"); else if (v > rt0) G.noteChange(b, "__rateup"); rt0 = v; });
    slider("rIso", "vIso", function (v) { return v.toFixed(1) + "°"; },
      function (v) { b.support.isoTemp = v; b.support.servo = false; },
      function (v) { if (v > 36.4) { b.support.isoOpen = false; G.noteChange(b, "__warmer"); } });
    slider("rHum", "vHum", function (v) { return v + "%"; }, function (v) { b.support.humidity = v; });
    slider("rIv", "vIv", function (v) { return v + " " + GL.term("mL/kg/d", "mL/kg/d"); }, function (v) { b.h.ivRate = v; });
    var fd0 = b.h.feedsMlKgD;
    slider("rFeed", "vFeed", function (v) { return v + " " + GL.term("mL/kg/d", "mL/kg/d"); },
      function (v) { if (v > b.h.feedsMlKgD + 25) b.h.feedAdvanceStress += 0.35; b.h.feedsMlKgD = v; },
      function (v) { if (v > fd0) G.noteChange(b, "__feedup"); fd0 = v; });
    updateBedLive();
    syncStickyOffsets();
  }

  /* Changing the mode buttons is a shorthand for a procedure at either end: going up to
     VENT is an intubation, coming off it is an extubation, and both are scored as such. */
  /* Settling into a mode is one job, and it has to be the same job however you got there.
     It was written twice, and the second copy - the one you reach by weaning a ventilated
     baby - was missing the line that turns the oxygen off. Click a baby on VENT at sixty
     percent straight to RA and the panel said "room air" while the blender stayed at sixty:
     satFrom kept giving them the oxygen, o2Exposure kept accumulating, and the gentle-care
     domain marked the player down for oxygen the screen had told them they had stopped. */
  function applyMode(b, m) {
    b.support.mode = m;
    if (m === "RA") b.support.fio2 = 0.21;
    if (m === "CPAP" && !(b.support.cpap >= 4)) b.support.cpap = 6;
  }

  function setMode(b, m) {
    if (m === b.support.mode) return;
    if (m === "VENT") { G.doAction(b, "intubate"); renderBed(); return; }
    if (b.support.mode === "VENT") { G.doAction(b, "extubate"); applyMode(b, m); renderBed(); return; }
    applyMode(b, m);
    /* Changing the support was the one bedside control nothing could be judged on, so a
       nurse asking you to start some oxygen had no way to notice that you had. */
    G.noteChange(b, "__support");
    log(b.name + " changed to " + supportLabel(b));
    recordHistory(b, "did", "Support changed to " + supportLabel(b));
    G.advance(5);
    renderBed();
  }

  function ctl(label, id, min, max, step, val, txt, term) {
    return '<div class="ctl-row"><label>' + (term ? '<abbr class="gl" data-term="' + term + '">' + label + "</abbr>" : label) +
      '</label><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step +
      '" value="' + val + '"><span class="rv" id="v' + id.slice(1) + '">' + txt + "</span></div>";
  }

  /* A note is what the team said when there is no open concern holding the callout - a
     settled answer, or the unit refusing to carry an action out. It expires on its own. */
  function noteHtml(n) {
    var fresh = n.fresh ? " fresh" : ""; n.fresh = false;
    var ch = n.who ? EV.CHARS[n.who] : null;
    return '<div class="callout note-only ' + (n.kind === "good" ? "good" : "warn") + fresh + '">' +
      (ch ? '<div class="co-av">' + A.avatar(ch.av) + "</div>"
          : '<div class="co-av bed-note-icon">' + (n.kind === "good" ? "✓" : "!") + "</div>") +
      "<div class='co-body'><div class='co-who'>" + esc(ch ? ch.name : "The bedside") +
      (n.tag ? ' <span class="co-settled">' + esc(n.tag) + "</span>" : "") + "</div>" +
      "<div class='co-say'>" + gl(n.text) + "</div></div></div>";
  }

  function renderBedCallout(b) {
    var box = $("callout"); if (!box) return;
    var c = openConcernFor(b), note = noteFor(b);
    if (c && c.stale) {
      /* It stood itself down. This is news, not a task - and asking a player to click Dismiss
         on every one of them turned "it sorted itself out" into a chore, several beds deep by
         four in the morning. It reads for a few seconds and then goes on its own; the close
         button stays for anybody who wants it gone now. */
      var sch = EV.CHARS[c.who];
      var resolvedHtml = '<div class="callout resolved fading"><div class="co-av">' + A.avatar(sch.av) +
        "</div><div class='co-body'><div class='co-who'>" + esc(sch.name) +
        ' <span class="co-settled">settled on its own</span></div>' +
        "<div class='co-say'>" + gl(c.said) + "</div>" +
        '<div class="co-actions"><button type="button" class="btn ghost small" id="dismissConcern"' +
        ' data-focus-key="dismiss">Close</button></div></div></div>';
      keepFocus(box, function () { box.innerHTML = resolvedHtml; });
      return;
    }
    if (!c) {
      var fresh0 = anyFresh(null, note);
      keepFocus(box, function () { box.innerHTML = note ? noteHtml(note) : ""; });
      if (fresh0) box.scrollTop = box.scrollHeight;
      return;
    }
    var ch = EV.CHARS[c.who];
    var html = '<div class="callout ' + c.def.severity + '"><div class="co-av">' + A.avatar(ch.av) + "</div><div class='co-body'>" +
      "<div class='co-who'>" + esc(ch.name) + (c.escalated ? ' <span class="co-again">asking again</span>' : "") + "</div>" +
      "<div class='co-say'>" + gl(c.said) + "</div>";
    if (G.nudges && c.def.nudge) html += '<div class="nudge">🤔 ' + gl(c.def.nudge) + "</div>";
    // the nudge points at the principle; this points at the panel, for a player who knows
    // what is wrong and still cannot find the control
    if (G.nudges && c.def.help) html += '<div class="help">🧭 <b>Where to act.</b> ' + gl(c.def.help) + "</div>";
    (c.replies || []).forEach(function (r) {
      html += '<div class="co-reply ' + replyClass(r) + '">' + gl(r.text) + "</div>";
    });
    if (!c.replies) html += '<div class="co-hintline">Use the controls below and ' + esc(ch.name.split(",")[0]) +
      " will tell you what they think. If you disagree, you can say so.</div>";
    html += '<div class="co-actions"><button type="button" class="btn ghost small" id="declineConcern"' +
            ' data-focus-key="decline">Not now &mdash; I am not going to do that</button></div>';
    html += "</div></div>";
    var fresh = anyFresh(c.replies, note);
    if (note) html += noteHtml(note);
    keepFocus(box, function () { box.innerHTML = html; });
    if (fresh) box.scrollTop = box.scrollHeight;
  }

  /* ONE ROW, EVERYBODY. Colleagues waiting to speak used to be invisible - the callout showed
     one of them and nothing said the others existed - while parents and teaching moments had
     their own row of faces below. They are the same question to a player standing at a cot:
     who is here, and who am I talking to? So they share the row, the open one is marked, and
     clicking a face switches to that conversation instead of burying the last one. */
  /* Newest first, because at a cot the question is almost always "what just happened" - and
     the clock time is on every line, so the answer to "how long has that been true" is there
     without counting backwards. */
  function renderHistory(b) {
    var box = $("hist"); if (!box) return;
    var list = (b.history || []).slice().reverse();
    if (!list.length) {
      setHtml(box, '<div class="muted" style="font-size:.86rem">Nothing has happened at this cot yet tonight. ' +
        "Everything you do here, and every result that comes back, is listed with the time it happened.</div>");
      return;
    }
    var h = "";
    list.forEach(function (e) {
      h += '<div class="hrow ' + e.kind + '"><span class="htime">' + esc(e.t) + "</span>" +
           '<span class="hwhat">' + gl(e.text) + "</span>" +
           '<span class="hago">' + esc(agoStr(e.at)) + "</span></div>";
    });
    setHtml(box, h);
  }

  function renderBedPeople(b) {
    var box = $("people"); if (!box) return;
    var out = [], openKey = G.openConcern[b.bed];
    concernsAt(b).forEach(function (c) {
      var ch = EV.CHARS[c.who], isOpen = c.key === openKey;
      var cls = isOpen ? "person-btn open" : c.stale ? "person-btn settled" : "person-btn waiting";
      var tail = isOpen ? '<span class="pb-go">talking</span>'
               : c.stale ? '<span class="pb-go">settled</span>'
               : '<span class="pb-go">Speak &rarr;</span>';
      out.push('<button class="' + cls + ' sev-' + (c.stale ? "settled" : c.def.severity) +
        '" data-focus-key="cc-' + esc(c.key) + '" data-concern="' + esc(c.key) + '"' +
        (isOpen ? ' aria-current="true"' : "") + '>' + A.miniAvatar(ch.av) +
        "<span><b>" + esc(ch.name.split(",")[0]) + "</b> " +
        esc(c.stale ? "it settled" : c.summaryText) + "</span>" + tail + "</button>");
    });
    G.talks.filter(function (t) { return t.bed === b.bed; }).forEach(function (t) {
      var isP = t.def.who === "parent";
      var nm = isP ? b.parentName : EV.CHARS[t.who].name.split(",")[0];
      var av = isP ? b.parentAvatar : EV.CHARS[t.who].av;
      out.push('<button class="person-btn wants" data-focus-key="p-' + esc(t.id) + '" data-talk="' + t.id + '">' + A.miniAvatar(av) +
        "<span><b>" + esc(nm) + "</b> " + esc(t.def.badge) + "</span><span class='pb-go'>Talk &rarr;</span></button>");
    });
    if (G.parentPresent(b) && !G.talks.some(function (t) { return t.bed === b.bed && t.def.who === "parent"; })) {
      out.push('<div class="person-btn quiet">' + A.miniAvatar(b.parentAvatar) +
        "<span><b>" + esc(b.parentName) + "</b> is at the bedside</span></div>");
    }
    keepFocus(box, function () {
      box.innerHTML = out.length ? '<div class="people-row">' + out.join("") + "</div>" : "";
    });
  }

  function updateBedLive() {
    if (G.view.mode !== "bed") return;
    var b = G.babies[G.view.bed];
    if (!b || !$("monitor")) return;
    var look = seen(b);
    $("crib").innerHTML = A.isolette(look, { photo: b.h.photo, iso: b.support.isoTemp.toFixed(1),
      humidity: b.support.humidity, open: b.support.isoOpen }) + '<div class="look">' + describeLook(b, look) + "</div>";
    var m = b.mon;
    $("monitor").innerHTML = [
      ["hr", A.trace({ rate: m.hr }, "#5ef2a0", "ecg"), GL.tip(m.hr, hrTip(b)), GL.term("bpm", "bpm"), m.hr < CL.hr.alarmLow || m.hr > CL.hr.alarmHigh],
      ["spo2", A.trace(b.hist.spo2, "#6cb6ff"), GL.tip(m.spo2, satTip(b)), GL.term("% SpO2", "SpO2"), lowSatFor(b) || highSatFor(b)],
      ["rr", A.trace({ rate: m.rr }, "#ffc857", "resp"), GL.tip(m.rr, rrTip(b)), GL.term("breaths", "breaths"), m.rr === 0],
      ["bp", A.trace(b.hist.map, "#ff6b6b"),
        GL.tip(m.sys + "/" + m.dia + " (" + m.map + ")",
          "Blood pressure. The first number is the peak push as the heart squeezes, the second is the low point " +
          "between beats, and the number in brackets is the average, called the mean. For a preemie the mean " +
          "should be at least about " + b.ga + "."),
        GL.term("mmHg", "mmHg"), m.map < b.ga + CL.map.flagAt],
      ["temp", "", GL.tip(m.temp.toFixed(1), tempTip(b)), GL.tip("\u00B0C", GL.TERMS["T"]), m.temp < CL.temp.coldStress || m.temp > CL.temp.normalHigh]
    ].map(function (r) {
      return '<div class="mon-row ' + r[0] + '"><div class="mon-trace">' + r[1] + "</div><div class=\"mon-num\">" +
        '<span class="n' + (r[4] ? " bad" : "") + '">' + r[2] + '</span><span class="u">' + r[3] + "</span></div></div>";
    }).join("");
    var gir = ((b.h.dexPct * b.h.ivRate) / 144).toFixed(1);
    if ($("girLine")) $("girLine").innerHTML = '<abbr class="gl" data-term="GIR">Glucose infusion rate</abbr> = (' +
      b.h.dexPct + "% &times; " + b.h.ivRate + " mL/kg/day) &divide; 144 = <b>" + gir + " mg/kg/min</b>";
    var L = b.labs, out = "";
    if (b.findings) {
      out += '<div class="lrow"><span>Examination <span class="lage">' + clockStr(b.examinedAt) +
        " &middot; " + esc(agoStr(b.examinedAt)) + "</span></span><span></span></div>";
      b.findings.forEach(function (f) {
        out += '<div class="lrow"><span>' + f.k + '</span><span class="' + (f.bad ? "abn" : f.artifact ? "crit" : "") + '">' + gl(f.v) + "</span></div>";
      });
    }
    ["glucose", "gas", "cbc", "bili", "cxr", "axr", "hus", "echo", "culture"].forEach(function (k) {
      /* WITH ITS AGE. A chest film from four hours ago and one from ten minutes ago are
         different pieces of information, and they used to look identical on this list. */
      if (L[k]) out += '<div class="lrow"><span>' + testLabel(k) +
        (L[k].at != null ? ' <span class="lage">' + clockStr(L[k].at) + " &middot; " +
          esc(agoStr(L[k].at)) + "</span>" : "") +
        '</span><span class="' + (L[k].crit && !L[k].parts ? "crit" : "") + '">' +
        labValueHtml(L[k]) + "</span></div>";
    });
    b.pending.forEach(function (p) {
      out += '<div class="lrow"><span>' + testLabel(p.chest ? "cxr" : p.kind) + '</span><span class="pending">back at ' + clockStr(p.due) + "</span></div>";
    });
    if (!out) out = '<div class="muted">Nothing sent yet. Examining the baby costs five minutes and is usually more use than a test.</div>';
    $("labs").innerHTML = out;
    renderHistory(b);
    renderBedCallout(b);
    renderBedPeople(b);
    /* Availability and the lit-up state come off the action's own record, so there is no
       second list here to fall out of step with the first. */
    Array.prototype.forEach.call($("stage").querySelectorAll(".act"), function (n) {
      var a = NG.ACTIONS[n.getAttribute("data-act")];
      if (!a) return;
      n.disabled = !!(a.off && a.off(b));
      n.classList.toggle("on", !!(a.on && a.on(b)));
      n.classList.toggle("urgent", !!(a.urgent && a.urgent(b)));
      /* A label that depends on the baby has to follow the baby. renderBed only runs when you
         arrive at the cot, so a tube that slips while you are standing there would otherwise
         keep saying "Intubate" - which is the wrong instruction and a disabled-looking one. */
      if (typeof a.t === "function") {
        var lab = n.querySelector(".t"), want = a.t(b);
        if (lab && lab.textContent !== want) lab.textContent = want;
      }
    });
  }


  /* One description of the baby, used three ways: the caption under the crib, the
     accessible name on the drawing itself, and the ward card. They are built from the
     same look object the artwork is drawn from, so the picture, the sentence and what a
     screen reader hears can never disagree. */
  function lookClauses(b, look) {
    var s = [({ pink: "Pink and well perfused", pale: "Pale", dusky: "Dusky", mottled: "Mottled and grey" })[look.color]];
    if (look.jaundice > 0.3) s.push("visibly jaundiced");
    if (look.apneic) s.push("not breathing right now");
    else if (look.effort > 0.55) s.push("working hard to breathe");
    else if (look.effort > 0.3) s.push("mild retractions");
    else s.push("breathing comfortably");
    if (b.h.kangaroo) s.push("skin to skin with " + b.parentName);
    else s.push(look.awake ? "awake" : "asleep in a nest");
    return s;
  }
  function describeLook(b, look) { return lookClauses(b, look).join(" &middot; "); }

  // the look object, with the alt text the drawing should announce itself by
  function seen(b) {
    var look = S.appearance(b);
    look.alt = displayName(b) + ": " + lookClauses(b, look).join(", ") + ", on " + supportLabel(b) + ".";
    return look;
  }

  // ---------------------------------------------------------------- side bar
  function renderSide() {
    var h = "<h3>Who needs you</h3>";
    /* A parent with a question used to look almost exactly like a nurse who needs you now.
       Everything waiting is ranked by how much it can hurt if it waits, and the top two
       ranks are loud: a filled panel, a heavier bar, and a pulse, like the ringing phone. */
    var rows = [];
    function row(rank, pri, html) { rows.push({ rank: rank, html: html.replace("{pri}", pri) }); }
    /* Stood-down concerns are deliberately NOT here. "Settled on its own - dismiss it" is a
       chore wearing the clothes of a task, and several of them at four in the morning is a
       panel of things that do not need you sitting on top of the things that do. They read
       at the cot and they are in the log. */
    G.concerns.filter(function (c) { return !c.done && !c.stale; }).forEach(function (c) {
      var b = byBed(c.bed); if (!b) return;
      var sev = c.def.severity;
      var cls = { urgent: "red", worry: "amber", note: "blue" }[sev];
      var rank = { urgent: 1, worry: 3, note: 4 }[sev];
      var pri = { urgent: "pri-critical", worry: "pri-high", note: "" }[sev];
      var note = esc(cap(c.summaryText)) + (c.escalated ? " &middot; asking again" : "");
      row(rank, pri, '<button class="task ' + cls + ' {pri}" data-focus-key="c-' + esc(c.key) +
        '" data-go="' + G.babies.indexOf(b) + '">' +
        A.miniAvatar(EV.CHARS[c.who].av) +
        '<span><span class="tt">' + esc(EV.CHARS[c.who].name.split(",")[0]) + " at bed " + c.bed + "</span>" +
        '<span class="ts">' + note + "</span></span></button>");
    });
    G.talks.forEach(function (t) {
      var b = t.bed ? byBed(t.bed) : null;
      if (b && (b.died || b.discharged)) return;
      var isP = t.def.who === "parent";
      var nm = isP ? (b ? b.parentName : "A parent") : EV.CHARS[t.who].name.split(",")[0];
      var av = isP ? (b ? b.parentAvatar : "parent1") : EV.CHARS[t.who].av;
      /* data-talk-bed, NOT data-bed. A ward cot carries data-bed="<index into G.babies>"
         and this row carried data-bed="<bed number>" - the same attribute meaning two
         different things, and the click handler read the wrong one first. Clicking a parent
         who wanted you at bed 1 took you to bed 2 and opened no conversation; on the last
         cot in the census the index ran off the end and the click threw. */
      row(5, "", '<button class="task green" data-focus-key="t-' + esc(t.id + "-" + t.bed) +
        '" data-talk="' + t.id + '" data-talk-bed="' + (t.bed == null ? "" : t.bed) + '">' +
        A.miniAvatar(av) + '<span><span class="tt">' + esc(nm) + "</span>" +
        '<span class="ts">' + esc(t.def.badge) + (b ? " &middot; bed " + b.bed : "") + "</span></span></button>");
    });
    G.babies.forEach(function (b, i) {
      if (b.died || b.discharged) return;
      if (b.alarm.level !== "none") {
        var red = b.alarm.level === "red";
        /* A person at the bedside outranks the monitor about the same bed, so an amber
           alarm is folded into the concern rather than listed beside it. "Sitting high
           on extra oxygen" used to appear twice, once as Renata asking and once as a
           monitor, at two different priorities, with the machine ranked above her. A
           RED alarm is always shown: that one is the baby, not a colleague. */
        if (!red && activeConcernFor(b)) return;
        row(red ? 0 : 2, red ? "pri-critical" : "pri-high",
          '<button class="task ' + (red ? "red" : "amber") + ' {pri}" data-focus-key="a-' + b.bed +
          '" data-tip="' + esc("This is the monitor, not a colleague - nobody has come to tell you about it. " +
            "Clicking takes you to " + displayName(b) + " at bed " + b.bed + ".") +
          '" data-go="' + i + '">' +
          '<span class="task-icon">' + (red ? "🔴" : "🟠") + "</span>" +
          '<span><span class="tt">Bed ' + b.bed + " &middot; " + esc(b.name) + '</span><span class="ts">' +
          esc(b.alarm.reasons.join(", ")) + "</span></span></button>");
      }
    });
    rows.sort(function (x, y) { return x.rank - y.rank; });
    rows = rows.map(function (r) { return r.html; });
    h += rows.length ? rows.join("") :
      '<div class="muted" style="font-size:.88rem">Nobody is waiting on you. A good moment to examine a baby, or to sit with a family.</div>';

    /* The team strip used to be four names, a native `title` with the bare job description,
       and an amber dot that pulsed at you and was explained nowhere. The dot does mean
       something - it is the third place a request shows up, alongside the cot and the list
       above - so it stays, and now it says what it is. Hovering any of them says who they
       are, what they do, which cots they hold, and what they are waiting on you for. */
    h += "<h3>The team</h3><div class='team'>";
    ["renata", "desmond", "priya", "tomas"].forEach(function (k) {
      var ch = EV.CHARS[k];
      var mine = G.concerns.filter(function (c) { return !c.done && c.who === k; });
      var chats = G.talks.filter(function (t) { return t.who === k; });
      var wants = mine.length + chats.length > 0;
      // some roles end in a full stop and some do not; the tooltip should not care
      var tip = ch.name + ". " + ch.role.replace(/\s*\.?\s*$/, ".");
      if (mine.length) {
        var c0 = mine[0];
        tip += " Waiting on you at bed " + c0.bed + ": " + c0.summaryText +
               (mine.length > 1 ? ", and " + (mine.length - 1) + " more." : ".");
      } else if (chats.length) {
        tip += " " + cap(chats[0].def.badge) +
               (chats[0].bed != null ? ", at bed " + chats[0].bed + "." : ".");
      } else {
        tip += " Nothing from them right now.";
      }
      if (wants) tip += " The amber dot means somebody is waiting on you.";
      /* Clickable when they want something, using the same routing as the list above, so
         the pulsing dot is a thing you can act on rather than a thing you can only look at. */
      var go = "";
      if (mine.length) go = ' data-go="' + G.babies.indexOf(byBed(mine[0].bed)) + '"';
      else if (chats.length) go = ' data-talk="' + chats[0].id + '" data-talk-bed="' +
        (chats[0].bed == null ? "" : chats[0].bed) + '"';
      h += "<" + (wants ? "button" : "div") + ' class="tm' + (wants ? " wants" : "") +
        '" data-tip="' + esc(tip) + '"' + go + ">" +
        A.miniAvatar(ch.av) + "<span>" + esc(ch.name.split(",")[0]) + "</span>" +
        (wants ? '<span class="dot"></span>' : "") + "</" + (wants ? "button" : "div") + ">";
    });
    h += "</div>";

    h += "<h3>Shift log</h3><div class='log'>";
    G.logLines.slice(0, 24).forEach(function (e) {
      h += '<div class="le ' + e.k + '"><span class="lt">' + e.t + '</span><span class="lm">' + gl(e.m) + "</span></div>";
    });
    keepFocus($("side"), function () { $("side").innerHTML = h + "</div>"; });
  }

  /* ------------------------------------------------------- the bedside note
     Everything the team says back goes into the callout at the top of the page, which is
     sticky, so it is on screen wherever the player has scrolled to. That replaced an
     overlay card that had to be dismissed: with the callout pinned the card was saying the
     same thing twice and charging a click for it.

     A note is for the handful of messages that have no concern to attach to - an action the
     unit refused to carry out, mostly - so they still land somewhere visible instead of
     only in the log. It clears itself. */
  function atBedside(b) { return G.view.mode === "bed" && G.babies[G.view.bed] === b; }
  function setNote(b, kind, text, opts) {
    if (!text || !atBedside(b)) return;
    opts = opts || {};
    G.note = { bed: b.bed, kind: kind, text: text, at: G.min, fresh: true,
               who: opts.who || null, tag: opts.tag || null };
    announce(text);
    renderBedCallout(b);
  }
  function noteFor(b) {
    var n = G.note;
    if (!n || n.bed !== b.bed) return null;
    if (G.min - n.at > 25) { G.note = null; return null; }
    return n;
  }
  G.setNote = setNote;


  /* ---------------------------------------------------------------- tooltips
     ONE listener on the document, not one per element per render. Every panel here
     rebuilds its innerHTML on the clock, so the old attachTips(root) had to be called
     again after every redraw or the listeners were silently lost - a rule an author had
     to remember on every edit, and one the ward pods went without for a long time. With
     delegation there is nothing to remember and nothing to lose: markup that carries
     data-tip or data-term explains itself, wherever and whenever it appears. */
  var tipEl = null, tipFor = null;

  function tipTarget(node) {
    return node && node.closest ? node.closest("[data-tip],[data-term],.gl") : null;
  }
  function tipText(n) {
    return n.getAttribute("data-tip") || GL.lookup(n.getAttribute("data-term") || n.textContent) || "";
  }
  function showTip(n) {
    var txt = tipText(n);
    if (!txt) return hideTip();
    if (!tipEl) {
      tipEl = el("div", "tip-pop");
      tipEl.id = "tip-pop";
      tipEl.setAttribute("role", "tooltip");
      document.body.appendChild(tipEl);
    }
    tipEl.textContent = txt; tipEl.style.display = "block";
    var r = n.getBoundingClientRect();
    var left = Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - tipEl.offsetWidth - 14);
    var top = r.bottom + window.scrollY + 8;
    // flip above rather than run off the bottom of the window
    if (r.bottom + tipEl.offsetHeight + 16 > window.innerHeight) top = r.top + window.scrollY - tipEl.offsetHeight - 8;
    tipEl.style.left = Math.max(8, left) + "px";
    tipEl.style.top = Math.max(8, top) + "px";
    if (tipFor && tipFor !== n) tipFor.removeAttribute("aria-describedby");
    tipFor = n;
    // a focusable trigger should say where its description is; a span in prose need not
    if (n.tabIndex >= 0 || n.closest("button")) n.setAttribute("aria-describedby", "tip-pop");
  }
  function hideTip() {
    if (tipEl) tipEl.style.display = "none";
    if (tipFor) { tipFor.removeAttribute("aria-describedby"); tipFor = null; }
  }

  document.addEventListener("mouseover", function (e) {
    var n = tipTarget(e.target);
    if (n === tipFor) return;
    if (n) showTip(n); else hideTip();
  });
  document.addEventListener("focusin", function (e) {
    var n = tipTarget(e.target);
    if (n) showTip(n); else hideTip();
  });
  document.addEventListener("focusout", hideTip);
  // the tip is positioned in page coordinates, so it has to go when the page moves
  window.addEventListener("scroll", hideTip, true);
  window.addEventListener("resize", function () { hideTip(); syncStickyOffsets(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideTip(); });

  /* Tapping a term is how a touch player reads its definition, so the tap must not also
     reach whatever is underneath. The exception is a real button: inside one, a tap is a
     decision the player is making, and swallowing it would strand them on a dialog option
     they cannot choose. There, hover and focus still give the tip. */
  document.addEventListener("click", function (e) {
    var n = tipTarget(e.target);
    if (!n) { hideTip(); return; }
    if (n.closest("button")) return;
    if (n.classList.contains("gl") || n.classList.contains("qmark")) { e.stopPropagation(); showTip(n); }
  }, true);

  // ---------------------------------------------------------------- handover
  function handoverScreen() {
    G.view = { mode: "handover", bed: null };
    var h = '<div class="handover"><p class="kicker">19:00 &middot; handover from the day team</p>' +
      "<h1>Your unit tonight</h1>" +
      '<p class="lede">Renata and Desmond take you round the beds. Read each one; the clues that matter tonight ' +
      "are often already in the handover. Nothing is running yet, so take your time.</p>";
    G.babies.forEach(function (b) {
      h += '<div class="ho-card"><div class="ho-baby">' + A.baby(seen(b)) + "</div><div class='ho-txt'>" +
        "<div class='ho-head'><span class='ho-name'>" + esc(displayName(b)) + "</span>" +
        "<span class='bed-no'>bed " + b.bed + "</span></div>" +
        "<div class='ho-meta'>" + metaHtml(b) + " &middot; " + supportHtml(b) + "</div>" +
        "<p>" + gl(b.handoff) + "</p>" +
        "<div class='ho-vitals'>" + vitalsHtml(b) + "</div>" +
        "<div class='ho-fam muted'>Family: " + esc(b.parents) + "</div></div></div>";
    });
    h += '<div class="ho-foot"><p class="muted">Anything underlined can be hovered or tapped for a plain-language ' +
      "explanation: an abbreviation like " + gl("CPAP") + ", a number like the 6 in CPAP 6, and the ward lingo too, " +
      "so when somebody says they are " + gl("bagging") + " or that there were green " + gl("residuals") +
      ", you can find out what they mean. That works everywhere in the game.</p>" +
      '<button class="btn" id="startShift">I have the unit. Start the shift.</button></div></div>';
    $("stage").innerHTML = h;
    $("side").innerHTML = "<h3>Shift log</h3><div class='muted' style='font-size:.88rem'>The night has not started yet.</div>";
  }

  function startShift() {
    Snd.unlock(); Snd.ok();
    playerActed(); notice();
    G.view = { mode: "ward", bed: null };
    G.paused = false;
    log("Shift started", "hi");
    render();
  }

  // ------------------------------------------------------------------- start
  G.start = function (opts) {
    G.difficulty = opts.difficulty;
    /* One flag, and the title screen owns it. This used to be forced off at Attending
       regardless of the box, so ticking "Show thinking prompts" there did nothing while
       the note underneath cheerfully reported the settings were changed from the
       Attending defaults. The level still SETS the box - Attending defaults it off -
       but it no longer overrules the player afterwards. (There was also a separate
       G.hints, assigned here and read nowhere.) */
    G.nudges = opts.hints;
    G.allowDeath = opts.allowDeath;
    G.seedVal = opts.seed || Math.floor(Math.random() * 100000);
    S.seed(G.seedVal);
    G.babies = P.makeCensus(G.difficulty);
    G.nameUsed = G.babies.used || {};
    // parents visit in different, overlapping windows so the unit feels alive
    G.babies.forEach(function (b, i) {
      var starts = [[19, 23], [20, 24], [19.5, 22.5], [21, 2], [19, 21.5], [22, 3]];
      b.visitWindow = starts[i % starts.length];
    });
    if (G.difficulty !== "student") G.admissionDue = null;   // arrives only via the phone
    G.running = true; G.paused = true;
    $("seedLabel").textContent = "seed " + G.seedVal;
    renderTop();
    handoverScreen();
    frame();
  };

  /* Handed to js/report.js, which needs the same escaping, glossary markup and naming
     rules as everything else on screen so the report reads like the rest of the game. */
  NG.$ = $; NG.el = el; NG.esc = esc; NG.gl = gl; NG.cap = cap;
  NG.clockStr = clockStr; NG.byBed = byBed; NG.displayName = displayName;
  NG.supportLabel = supportLabel; NG.say = say;
  /* ...and what js/actions.js needs back: an action writes to the log, scores a decision,
     leaves a note at the bedside, and lets the colleague who asked judge what just happened. */
  NG.CLICKABLE = CLICKABLE;
  NG.recordHistory = recordHistory; NG.agoStr = agoStr;
  NG.log = log; NG.addScore = addScore; NG.setNote = setNote;
  NG.judgeConcern = judgeConcern; NG.render = render;

  function boot() {
    if (!$("stage")) return;
    $("btnPause").onclick = function () { G.paused = !G.paused; Snd.unlock(); playerActed(); renderTop(); };
    $("btnPhone").onclick = function () { Snd.unlock(); if (G.call) G.answerPhone(); };
    $("btnSound").onclick = function () {
      Snd.setOn(!Snd.isOn());
      var on = Snd.isOn();
      $("btnSound").textContent = on ? "🔊" : "🔇";
      $("btnSound").setAttribute("aria-pressed", on ? "true" : "false");
      $("btnSound").setAttribute("aria-label", on ? "Alarm sounds on" : "Alarm sounds off");
      if (on) Snd.ok();
    };
    $("btnEnd").onclick = function () { if (confirm("End the shift now and see the report?")) { G.min = SHIFT_LEN; NG.endShift(); } };
    var sideBtn = $("btnSide");
    if (sideBtn) sideBtn.onclick = function () {
      var open = document.body.classList.toggle("side-open");
      sideBtn.setAttribute("aria-expanded", open ? "true" : "false");
      Snd.click();
      (open ? $("side") : $("stage")).focus();
    };
    document.addEventListener("keydown", function (e) {
      if (G.dialogOpen) return;
      if (e.key === " ") { e.preventDefault(); G.paused = !G.paused; renderTop(); }
      if (e.key === "Escape") {
        if (document.body.classList.contains("side-open")) {
          document.body.classList.remove("side-open");
          var sb2 = $("btnSide"); if (sb2) { sb2.setAttribute("aria-expanded", "false"); sb2.focus(); }
          return;
        }
        if (G.view.mode === "bed") backToWard();
        else if (G.view.mode === "delivery") leaveDelivery(false);
      }
      if (e.key >= "1" && e.key <= "6" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        var i = +e.key - 1;
        if (G.babies[i] && !G.babies[i].died) openBed(i);
      }
    });
    /* Anything the player does keeps the clock at a walking pace. It only builds when
       they have genuinely stopped - which is exactly when letting the night run is what
       they want. mousemove is in here deliberately: someone reading the unit is not idle. */
    ["pointerdown", "keydown", "wheel", "mousemove"].forEach(function (ev) {
      window.addEventListener(ev, playerActed, { passive: true });
    });

    // browsers only allow audio after a real gesture; catch the first one anywhere
    ["pointerdown", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, function once() {
        Snd.unlock();
        window.removeEventListener(ev, once);
      }, { once: true });
    });
    var cfg = {};
    try { cfg = JSON.parse(sessionStorage.getItem("nicuGameCfg") || "{}"); } catch (e) {}
    Snd.setOn(cfg.sound !== false);
    $("btnSound").textContent = Snd.isOn() ? "🔊" : "🔇";
    G.start({ difficulty: cfg.difficulty || "resident", hints: cfg.hints !== false,
              allowDeath: cfg.allowDeath !== false, seed: cfg.seed });
  }

  // the scripts are written into the page by game.html, so by the time this runs the
  // document may already be parsed - waiting for an event that has been and gone would
  // mean the game simply never starts
  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
