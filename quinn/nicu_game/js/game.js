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
    difficulty: "resident", allowDeath: true, nudges: true,
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
  /* One copy, in js/util.js. The escaper that used to live here did not escape the double
     quote, and twenty-eight of its call sites below sit inside a quoted attribute. */
  var U = window.Util;
  function cap(s) { return U.cap(s); }
  function esc(s) { return U.esc(s); }
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

  /* ------------------------------------------------- ringing the attending
     A PHONE CALL SHOULD BE A PHONE CALL. The action returned its answer as a result message
     with kind "good", and doAction only turns a result into a bedside note when the kind is
     "warn" or "bad" - so the single most information-dense thing in the game delivered Dr.
     Halvorsen's entire paragraph of advice into the unit log, at the bottom of a side panel
     that is not even open at a bedside. A player pressing it saw ten minutes disappear and
     nothing else happen, which is exactly what a playtest reported.

     It is a modal now, in the same shape as the call she makes to you, and she asks first.
     Both answers get the steer: committing to a view scores more, but saying you are not
     sure is why you rang, and this game does not punish that. */
  function attendingCall(b, steer, first) {
    var opened = "\u201cIngrid.\u201d She sounds wide awake, and not at all surprised. " +
                 "\u201cBefore I say anything \u2014 tell me what you are seeing.\u201d";
    showDialog({
      avatar: "ingrid", who: "Dr. Ingrid Halvorsen", role: "Attending neonatologist, on the phone",
      said: opened, subject: b, keepOrder: true,
      nudge: "Saying it out loud is how you find the gap in your own reasoning. She will steer you either way.",
      opts: [
        { label: "Talk her through what you are seeing", hint: "Commits to a reading, which she can then correct",
          run: function () {
            addScore(3, "Thought out loud with the attending about " + b.name);
            G.trust += 2;
            return { kind: "good", text: "She listens all the way to the end without interrupting. " +
                     "Then: \u201c" + steer + "\u201d" };
          } },
        { label: "\u201cHonestly, I am not sure. That is why I rang.\u201d", hint: "Says the true thing",
          run: function () {
            addScore(2, "Asked the attending for help without pretending to know");
            G.trust += 1;
            return { kind: "good", text: "\u201cGood,\u201d she says, and means it. \u201cThe ones who never " +
                     "ring are the ones I worry about.\u201d Then: \u201c" + steer + "\u201d" };
          } }
      ]
    });
    if (first) log("You rang Dr. Halvorsen about " + b.name + ".", "hi");
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


  /* ------------------------------------------------------------- the director
     Who asks you for what and when - concerns, conversations, the phone, the three crises,
     and the porthole somebody's parent leaves open - is five hundred lines of its own job,
     and it lives in js/director.js now. These are the things the clock and the click
     router ask of it, kept as delegates so no call site here had to change. */
  function checkPortholes(dt) { return NG.checkPortholes(dt); }
  function raiseConcerns() { return NG.raiseConcerns(); }
  function reviewConcerns() { return NG.reviewConcerns(); }
  function escalateConcerns() { return NG.escalateConcerns(); }
  function raiseTalks() { return NG.raiseTalks(); }
  function expireTalks() { return NG.expireTalks(); }
  function updateCalls() { return NG.updateCalls(); }
  function checkCrisis() { return NG.checkCrisis(); }
  function startTalk(t) { return NG.startTalk(t); }
  function declineConcern(b) { return NG.declineConcern(b); }
  function dismissConcern(b) { return NG.dismissConcern(b); }
  function concernsAt(b) { return NG.concernsAt(b); }
  function openConcernFor(b) { return NG.openConcernFor(b); }
  function activeConcernFor(b) { return NG.activeConcernFor(b); }
  function anyFresh(list, note) { return NG.anyFresh(list, note); }

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

  /* ONE TABLE, AND THE SELECTOR COMES OUT OF IT.

     Every clickable thing in the stage and the side panel has to be reachable by the one
     delegated handler, and it used to take two edits to make that true: a name in a
     selector string, and an arm in an if-chain below it. Doing one and not the other gives
     a button that is silently dead - no error, no clue - and it had happened twice: "Live
     this shift again" did nothing at all, and a face in the row of people at a cot could
     not be clicked to switch conversation.

     Now there is one list. The selector is derived from it, so a handler cannot be added
     without also being matched, and a match cannot exist without a handler. The suite still
     walks the rendered page checking every button is covered - but it is now checking a
     property that is hard to break rather than one that was easy to. */
  var CLICKS = [
    { id: "startShift",      run: function () { startShift(); } },
    { id: "toTitle",         run: function () { location.href = "index.html"; } },
    { id: "relive",          run: function () { reliveShift(); } },
    { id: "btnBack",         run: function () { backToWard(); } },
    { id: "delLeave",        run: function () { leaveDelivery(false); } },
    { id: "podDelivery",     run: function () { G.enterDelivery(); } },
    { id: "declineConcern",  run: function (n, b) { if (b) declineConcern(b); } },
    { id: "dismissConcern",  run: function (n, b) { if (b) dismissConcern(b); } },

    { attr: "data-leave",    run: function (n) { G.finishDelivery(n.getAttribute("data-leave")); } },
    { attr: "data-del",      run: function (n) { G.doDelivery(n.getAttribute("data-del")); } },
    { attr: "data-act",      run: function (n, b) { if (b) G.doAction(b, n.getAttribute("data-act")); } },

    // conversations first: they are the only thing here that is about a person
    { attr: "data-concern",  run: function (n, b) {
        if (!b) return;
        var want = n.getAttribute("data-concern");
        var pick = G.concerns.filter(function (c) { return c.key === want && !c.done; })[0];
        if (!pick) return;
        G.openConcern[b.bed] = want;
        if (!pick.seen) { pick.seen = true; pick.seenAt = G.min; }
        Snd.click(); playerActed();
        renderBedCallout(b); renderBedPeople(b);
        announce(EV.CHARS[pick.who].name.split(",")[0] + ": " + cap(pick.summaryText));
      } },

    { attr: "data-talk",     run: function (n, b) {
        var tb = n.hasAttribute("data-talk-bed") ? n.getAttribute("data-talk-bed") : (b ? b.bed : null);
        var talk = findTalk(n.getAttribute("data-talk"), tb);
        if (!talk) return;
        /* Go and stand where they are first. A conversation about a baby happens at that
           baby's cot, and arriving in the dialog from nowhere loses that. */
        if (talk.bed != null) {
          var at = G.babies.indexOf(byBed(talk.bed));
          if (at >= 0 && !(G.view.mode === "bed" && G.view.bed === at)) openBed(at);
        }
        startTalk(talk);
      } },

    { attr: "data-bed",      run: function (n) { openBed(+n.getAttribute("data-bed")); } },
    { attr: "data-go",       run: function (n) { openBed(+n.getAttribute("data-go")); } },
    { attr: "data-jump",     run: function (n) { jumpToPanel(n.getAttribute("data-jump")); } },
    { attr: "data-mode",     run: function (n, b) { if (b) setMode(b, n.getAttribute("data-mode")); } },
    { attr: "data-dex",      run: function (n, b) {
        if (!b) return;
        b.h.dexPct = +n.getAttribute("data-dex");
        renderBed();
      } }
  ];

  var CLICKABLE = CLICKS.map(function (c) {
    return c.id ? "#" + c.id : "[" + c.attr + "]";
  }).join(",");

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var n = t.closest(CLICKABLE);
    if (!n || n.disabled) return;
    var b = currentBaby();
    for (var i = 0; i < CLICKS.length; i++) {
      var c = CLICKS[i];
      if (c.id ? n.id === c.id : (n.hasAttribute && n.hasAttribute(c.attr))) return c.run(n, b);
    }
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
     Delivery is a place, and the room on screen now lives in js/deliveryroom.js - it was
     four hundred lines of this file doing a job that is neither the clock nor the director.
     These are the handful of things the rest of the game asks of it, kept as delegates so
     no call site here had to change.

     DEL is the other half - the scenarios and the thin resuscitation physiology, in
     js/deliveries.js - and frame() still needs it directly: a resuscitation advances on the
     same slice of time as the shift clock, and that is the one place the two are kept from
     drifting apart. */
  var DEL = window.Deliveries;
  function checkDeliveryAbandoned() { return NG.checkDeliveryAbandoned(); }
  function leaveDelivery(finished) { return NG.leaveDelivery(finished); }
  function updateDeliveryLive() { return NG.updateDeliveryLive(); }
  function deliveryPod() { return NG.deliveryPod(); }

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
    /* Everything above changes what this baby is, so the opening numbers and the snapshot
       the report measures them against are both taken now, after the last of it. They used
       to be taken inside build(), several adjustments ago. */
    P.settle(b);
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



  /* ---------------------------------------------------------------- tooltips
     ONE listener on the document, not one per element per render. Every panel here
     rebuilds its innerHTML on the clock, so the old attachTips(root) had to be called
     again after every redraw or the listeners were silently lost - a rule an author had
     to remember on every edit, and one the ward pods went without for a long time. With
     delegation there is nothing to remember and nothing to lose: markup that carries
     data-tip or data-term explains itself, wherever and whenever it appears. */
  var tipEl = null, tipFor = null;

  function tipTarget(node) {
    return node && node.closest ? node.closest("[data-tip],[data-term],.gl,.qmark") : null;
  }
  function tipText(n) {
    /* The "?" badge carries no text of its own - it is a handle on the button it sits in,
       so it reads that button's blurb rather than duplicating the string. */
    if (n.classList && n.classList.contains("qmark")) {
      var owner = n.closest("[data-tip]");
      return owner ? owner.getAttribute("data-tip") : "";
    }
    return n.getAttribute("data-tip") || GL.lookup(n.getAttribute("data-term") || n.textContent) || "";
  }
  function showTip(n) {
    var txt = tipText(n);
    if (!txt) return hideTip();
    /* ...or if the one we made has been thrown away. The report replaces the whole body,
       which takes this node with it - and the old check was `if (!tipEl)`, so every hover
       on the report screen filled a detached div with exactly the right definition and
       showed it to nobody. Measured on a finished shift: 23 glossary terms and one
       data-tip, none of them reachable, on the one screen the game exists to teach from. */
    if (!tipEl || !document.contains(tipEl)) {
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
    /* THE ONE THING INSIDE A BUTTON THAT IS NOT THE BUTTON. The "?" badge exists so a
       player can read what an action does before spending ten minutes of the night on it -
       and on a touchscreen it could not be read at all. closest() walked straight past the
       badge to the .act it sits in, the guard below saw a button and bailed, and the tap
       ran the action instead of explaining it. Hover and keyboard focus had always worked,
       so this was invisible on a desktop and total on a phone: every bedside action and all
       sixteen in the delivery room. It has to be handled BEFORE the button guard. */
    if (n.classList.contains("qmark")) {
      e.stopPropagation(); e.preventDefault();
      showTip(n);
      return;
    }
    if (n.closest("button")) return;
    if (n.classList.contains("gl")) { e.stopPropagation(); showTip(n); }
  }, true);

  /* ------------------------------------------------------------- the screen
     Everything the player looks at - the unit, the bedside, the side panel and the small
     army of helpers that turn hidden state into something readable - is nine hundred lines
     of its own job, and lives in js/ui.js now. These are the parts the clock, the click
     router and the handover sheet ask for, kept as delegates so no call site here changed. */
  function render() { return NG.render(); }
  function renderTop() { return NG.renderTop(); }
  function renderBed() { return NG.renderBed(); }
  function renderBedCallout(b) { return NG.renderBedCallout(b); }
  function renderBedPeople(b) { return NG.renderBedPeople(b); }
  function openBed(i) { return NG.openBed(i); }
  function backToWard() { return NG.backToWard(); }
  function setMode(b, m) { return NG.setMode(b, m); }
  function setNote(b, k, t, o) { return NG.setNote(b, k, t, o); }
  function syncStickyOffsets() { return NG.syncStickyOffsets(); }
  function jumpToPanel(slug) { return NG.jumpToPanel(slug); }
  function supportLabel(b) { return NG.supportLabel(b); }
  function supportHtml(b) { return NG.supportHtml(b); }
  function displayName(b) { return NG.displayName(b); }
  function metaHtml(b, o) { return NG.metaHtml(b, o); }
  function vitalsHtml(b) { return NG.vitalsHtml(b); }
  function testName(k) { return NG.testName(k); }
  function seen(b) { return NG.seen(b); }

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
    // == null, not falsy, for the same reason the title screen uses isNaN: 0 is a seed
    G.seedVal = opts.seed == null ? Math.floor(Math.random() * 100000) : opts.seed;
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
  NG.clockStr = clockStr; NG.byBed = byBed; NG.say = say;
  /* displayName, supportLabel and setNote are registered by js/ui.js, which owns them now.
     Re-exporting this file's delegates here would have pointed NG.setNote at a function
     whose whole body is `return NG.setNote(...)` - a stack overflow the moment anybody
     left a note at a bedside. */
  /* ...and what js/actions.js needs back: an action writes to the log, scores a decision,
     leaves a note at the bedside, and lets the colleague who asked judge what just happened. */
  NG.CLICKABLE = CLICKABLE;
  NG.recordHistory = recordHistory; NG.agoStr = agoStr;
  NG.attendingCall = attendingCall;
  NG.log = log; NG.addScore = addScore;
  /* ...and what the three files split out of this one borrow back. Every one of them is
     looked up when it is CALLED, so beyond "game.js first" there is no order to get wrong -
     render, setNote, supportLabel and the rest now travel the other way, registered from
     js/ui.js, and the director registers judgeConcern, pushReply, replyClass and anyFresh. */
  NG.showCost = showCost; NG.playerActed = playerActed; NG.notice = notice;
  NG.announce = announce; NG.actionLabel = actionLabel; NG.shortLabel = shortLabel;
  NG.showDialog = showDialog; NG.labValueHtml = labValueHtml;
  NG.clockHeld = clockHeld; NG.costLabel = costLabel; NG.shownMin = shownMin;
  /* The shift's own constants. The clock lives here, so these do too - js/ui.js needs the
     length of a night to say how much of it is left, and the rate table to say in words
     what the clock is currently doing. */
  NG.SHIFT_LEN = SHIFT_LEN; NG.SHIFT_START = SHIFT_START; NG.RATE = RATE;
  NG.hideTip = hideTip;

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
