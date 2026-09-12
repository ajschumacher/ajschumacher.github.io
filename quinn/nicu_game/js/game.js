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
    min: 0, babies: [], paused: true, running: false, ended: false,
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
  /* Dialog prose is authored as plain text with blank lines between paragraphs, because the
     same words have to go three places: the modal, this cot's history, and a screen reader.
     The blank lines become paragraphs HERE - after escaping and after the glossary has run -
     so a name or a number can never arrive as markup. Single-line text is left exactly as it
     was, so nothing that already fitted on one line moves. */
  function prose(s) {
    var t = gl(s);
    if (t.indexOf("\n") < 0) return t;
    return t.split(/\n{2,}/).map(function (para) {
      return "<p>" + para.replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }
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
  /* A phone call, not a lecture.

     THE CHOICE IS ONLY ON THE FIRST CALL. Opening a case with her, you decide how to do it:
     "I am not sure" gets a senior asking for the one thing that would settle it, and "here
     is what I am seeing" gets the reasoning. Once she is HOLDING the case, ringing back goes
     straight to the answer - being asked how you would like to phrase it for the fourth time
     is not what a telephone is like, and the player has already told her where they stand.

     The encouragement for ringing at all is said once, on the first call of the shift. */
  function attendingCall(b, first) {
    var reopening = !!b.h.consult;

    if (reopening) {
      var c = NG.consult(b, true);
      recordHistory(b, "did", "Dr. Halvorsen \u2014 \u201c" + c.headline + "\u201d");
      showDialog({
        avatar: "ingrid", who: "Dr. Ingrid Halvorsen", role: "Attending neonatologist, on the phone",
        subject: b, keepOrder: true,
        said: "\u201c" + cap(b.name) + ".\u201d No preamble.\n\n" + c.text,
        opts: [{ label: "Understood", hint: "", run: function () {
          if (c.mode === "follow") addScore(3, "Rang the attending back about " + b.name + " with what you had found");
          G.trust += 1;
          return { kind: "good", text: signOff(c) };
        } }]
      });
      return;
    }

    showDialog({
      avatar: "ingrid", who: "Dr. Ingrid Halvorsen", role: "Attending neonatologist, on the phone",
      said: "\u201cIngrid.\u201d She sounds wide awake, and not at all surprised. " +
            "\u201cTell me what you are seeing.\u201d",
      subject: b, keepOrder: true,
      nudge: "She only knows what you tell her. Say you are not sure and she will send you to find one thing out.",
      opts: [
        { label: "Talk her through what you are seeing", hint: "She reasons over everything you have",
          run: function () {
            addScore(3, "Thought out loud with the attending about " + b.name);
            G.trust += 2;
            var c = NG.consult(b, true);
            recordHistory(b, "did", "Dr. Halvorsen \u2014 \u201c" + c.headline + "\u201d");
            return { kind: "good", text: preface(c) + c.text };
          } },
        { label: "\u201cHonestly, I am not sure.\u201d", hint: "She asks you to go and find one thing out",
          run: function () {
            addScore(2, "Asked the attending for help without pretending to know");
            G.trust += 1;
            var c = NG.consult(b, false);
            recordHistory(b, "did", "Dr. Halvorsen asked \u2014 \u201c" + c.headline + "\u201d");
            return { kind: "good", text: (first ? "\u201cGood. The ones who never ring are the ones I worry about.\u201d\n\n" : "") + c.text };
          } }
      ]
    });
    if (first) log("You rang Dr. Halvorsen about " + b.name + ".", "hi");
  }

  /* At most one clause before she starts, and only when it is information rather than
     applause: that the story came off a screen, or that the examination is hours old. */
  function preface(c) {
    var p = c.picture;
    if (!p.exam)
      return "\u201cThat is all off a screen. Somebody needs to put their hands on " + p.her + ".\u201d\n\n";
    if (p.exam.stale)
      return "\u201cThat examination is " + Math.round(p.exam.ageMin / 60) + " hours old.\u201d\n\n";
    return "";
  }

  /* How she hangs up: what she is waiting for, in one line. */
  function signOff(c) {
    if (c.mode === "follow") return "\u201cGood. Ring me if it turns.\u201d";
    if (c.mode === "nothingnew") return "\u201cGo and do it, then.\u201d";
    if (c.mode === "changed") return "\u201cRing me back when you know more.\u201d";
    return "\u201cRing me back with it.\u201d";
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
  /* This one is called from exactly one place - inside a setTimeout inside a dialog
     button - which is why the split missed it and why nothing caught it for so long:
     a ReferenceError only happens on the line that runs, and that line only runs when
     a player gets a crisis WRONG. See the comment on the crisis hold below. */
  function startCrisis(b, kind) { return NG.startCrisis(b, kind); }
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
    /* The two flags that stop the night are set here and cleared by the button at the
       bottom of the dialog - so if BUILDING one throws, they are set with nothing on screen
       to clear them, and the clock is at rate zero for the rest of the shift with no way
       back. Every sentence below is assembled from game state (a name, a pronoun, a
       scenario's opts array), so this is not hypothetical. The error still gets out; it
       just does not get to take the night with it. */
    G.dialogOpen = true; G.paused = true;
    try { buildDialog(cfg); }
    catch (e) {
      var half = $("scrim"); if (half) half.remove();
      G.dialogOpen = false; G.paused = false;
      throw e;
    }
  }

  function buildDialog(cfg) {
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
    /* prose(), not gl(): what she says on a call-back is the whole consult and arrives here
       rather than in the feedback box, so its blank lines have to become paragraphs the same
       way. Single-line dialogue is untouched. */
    body.innerHTML = '<div class="said">' + prose(cfg.said) + "</div>";
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
          '</div><div class="fb-body">' + prose(res.text || "") + "</div>";
        d.appendChild(fb);
        var cont = el("button", "btn", res.contLabel || (res.keepCrisis ? "Keep going" : "Back to the unit"));
        cont.style.marginTop = "14px";
        announce((res.kind === "good" ? "Good call. " : res.kind === "bad" ? "Think again. " : "") + (res.text || ""));
        cont.onclick = function () {
          scrim.remove(); G.dialogOpen = false;
          releaseFocus();
          var again = res.keepCrisis && G.crisis;
          var next = !again && G.dialogQueue.length ? G.dialogQueue.shift() : null;
          /* HAND THE CLOCK BACK FIRST, always. Both branches below pass the night on to
             another dialog through a timer, and this used to leave G.paused true for them
             to inherit - so if that timer threw, or the dialog it opened bailed out at one
             of showDialog's two guards, the night stopped with nothing on screen to say
             why. That is exactly what happened: startCrisis had no delegate in this file
             after the split, so getting a crisis WRONG threw a ReferenceError inside the
             350ms timer and left G.crisis set and the clock at rate zero for the rest of
             the shift. Whatever opens next pauses it again on its own; a quarter second of
             clock is a cheap price for a game that cannot wedge.
             Nothing is lost on the crisis path either - clockRate() holds the clock at zero
             while G.crisis is set, which is the hold this line was really relying on. */
          G.paused = false;
          // hold the crisis now: 350ms is long enough for something else to resolve it
          if (again) setTimeout(function () {
            if (!G.crisis) return;
            /* And if it cannot be re-opened, the crisis is let go rather than left holding
               the clock down forever. A crisis that silently resolves is a bug; a night
               that stops dead is a bug the player cannot even report. */
            try { startCrisis(again.b, again.kind); }
            catch (e) { G.crisis = null; G.paused = false; render(); throw e; }
          }, 350);
          else if (next) setTimeout(function () { showDialog(next); }, 250);
          render();
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
    /* Picking a dextrose strength used to call renderBed(), which throws the whole bedside
       away and builds it again - so choosing D10 jumped the page back to the top. Nothing
       about the panel's SHAPE changes: the segment's own highlight and the glucose infusion
       rate line underneath it are both refreshed by updateBedLive() already, and render()
       reaches that. The "on" class is set here as well so the button answers the click in
       the same frame rather than on the next tick. */
    { attr: "data-dex",      run: function (n, b) {
        if (!b) return;
        var was = b.h.dexPct;
        b.h.dexPct = +n.getAttribute("data-dex");
        var box = n.parentNode;
        if (box) Array.prototype.forEach.call(box.querySelectorAll("[data-dex]"), function (m) {
          m.classList.toggle("on", m === n);
        });
        /* And it is a change to what is running into this baby, so a colleague who asked
           about the sugar can see that you answered them. Only on the way UP, the same way
           the feeds report only when they are advanced: turning the sugar down is not an
           answer to anything, and this was the one bedside control that reported nothing
           at all. */
        if (b.h.dexPct > was) G.noteChange(b, "__dex");
        render();
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
       a cot, and you certainly cannot fast-forward through it: the forty-five minutes
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

  function tick() {
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
         of being away is the forty-five minutes before the registrar takes it off you. */
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
  }

  /* The clock is not allowed to die. Re-arming the timer used to be the last statement of
     the tick, so any exception raised anywhere in it skipped that line - and a tick reaches
     into fourteen subsystems, the whole simulation, every panel on screen and both result
     queues. The night simply stopped, with a pending gas that would never come back and
     nothing on screen to say what had happened.
     The error is still thrown where window.onerror, the console and the test harness can
     all see it. It just does not get to take the game with it. */
  function frame() {
    if (!G.running) return;
    try { tick(); }
    catch (e) { setTimeout(function () { throw e; }, 0); }
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
            n: { glucose: r },
            parts: [{ label: "", value: r + " mg/dL", bad: r < CL.glucose.low || r > 180,
              tip: "Expected over " + CL.glucose.low + " mg/dL. Under " + CL.glucose.low + " a baby goes " +
                   "jittery and starts having spells; under " + CL.glucose.severe + " the brain is at risk and it " +
                   "is an emergency. A bolus lifts it for an hour - it is the infusion rate that holds it up. " +
                   "The threshold really rises with age: in the first four hours of life a healthy newborn is " +
                   "allowed to sit lower than this while the milk gets going. One number is used here throughout." }] };
          log("Glucose on " + b.name + ": " + r, r < 40 ? "warn" : ""); }
        if (p.kind === "gas") { var ph = S.pHfrom(b).toFixed(2), co = Math.round(h.co2), be = Math.round(h.baseDeficit);
          b.labs.gas = { v: "pH " + ph + " / CO2 " + co + " / base deficit " + be, crit: ph < 7.2 || co > 65, at: G.min,
            n: { ph: +ph, co2: co, baseDeficit: be },
            parts: [part("pH", "pH", ph), part("co2", "CO2", co), part("baseDeficit", "base deficit", be)] };
          log("Gas on " + b.name + ": pH " + ph + ", CO2 " + co, ph < 7.2 ? "warn" : ""); }
        if (p.kind === "cbc") { var w = h.wbc.toFixed(1), hb = h.hgb.toFixed(1), cr = h.crp.toFixed(0);
          b.labs.cbc = { v: "WBC " + w + " / Hgb " + hb + " / CRP " + cr,
                         crit: h.wbc < CL.ref.wbc.lo || h.wbc > CL.ref.wbc.hi ||
                               h.hgb < CL.hgb.flagAt || h.crp > CL.ref.crp.hi, at: G.min,
                         n: { wbc: +w, hgb: +hb, crp: +cr },
                         parts: [part("wbc", "WBC", w), part("hgb", "Hgb", hb), part("crp", "CRP", cr)] };
          log("Blood count on " + b.name + ": WBC " + w + ", Hgb " + hb + ", CRP " + cr,
              (h.wbc < CL.ref.wbc.lo || h.hgb < CL.hgb.flagAt || h.crp > CL.ref.crp.hi) ? "warn" : ""); }
        if (p.kind === "bili") { var bl = h.bili.toFixed(1), th = h.biliThreshold.toFixed(0);
          b.labs.bili = { v: bl + " mg/dL, threshold " + th, crit: h.bili > h.biliThreshold, at: G.min,
            n: { bili: +bl, threshold: +th },
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
            b.labs.cxr = { v: t, crit: h.ptx || h.ettDisplaced, at: G.min,
              /* A tag as well as the sentence. The player reads the sentence; the attending
                 on the phone needs to know WHICH of these she is being told about, and
                 picking it back out of prose is a bug waiting to happen. */
              f: h.ptx ? "ptx" : h.ettDisplaced ? "ettlow" : h.rds > 1.3 ? "rds"
                 : h.secretions > 0.5 ? "collapse" : "clear" }; }
          else { t = h.necGrade > 1.4 ? "gas in the wall of the bowel - pneumatosis. This is NEC." :
              h.necGrade > 0 ? "dilated loops of bowel, no pneumatosis yet" : "a normal bowel gas pattern";
            b.labs.axr = { v: t, crit: h.necGrade > 1.4, at: G.min,
              f: h.necGrade > 1.4 ? "nec" : h.necGrade > 0 ? "dilated" : "clear" }; }
          log("X-ray on " + b.name + ": " + t, (h.ptx || h.necGrade > 1.4) ? "bad" : "");
        }
        if (p.kind === "hus") { var g = h.ivhGrade;
          t = g === 0 ? "no bleeding seen" : g === 1 ? "a small grade 1 bleed in the germinal matrix" :
              g === 2 ? "a grade 2 bleed with some blood in the ventricle" : "a grade 3 bleed, the ventricle filling";
          b.labs.hus = { v: t, crit: g >= 3, at: G.min, n: { grade: g },
                         f: g === 0 ? "clear" : g >= 3 ? "big" : "bleed" };
          log("Head ultrasound on " + b.name + ": " + t, g >= 2 ? "bad" : ""); }
        if (p.kind === "echo") {
          t = h.pda > 0.5 ? "a large patent ductus arteriosus with significant shunting" :
              h.pda > 0.2 ? "a small duct, not haemodynamically significant" : "the duct is closed and the heart is structurally normal";
          if (h.pphn > 0.2) t += "; pressures in the lung arteries are high (pulmonary hypertension)";
          b.labs.echo = { v: t, crit: h.pda > 0.5 || h.pphn > 0.2, at: G.min,
                          f: h.pda > 0.5 ? "bigduct" : h.pda > 0.2 ? "smallduct" : "closed",
                          pphn: h.pphn > 0.2 };
          log("Echo on " + b.name + ": " + t, h.pda > 0.5 ? "warn" : ""); }
        /* Every result, into this baby's own history with the time it came back on it. */
        var got = p.chest ? "cxr" : p.kind;
        if (b.labs[got]) {
          recordHistory(b, "result", testName(got) + ": " + b.labs[got].v);
          /* AND SAID WHERE THE PLAYER IS STANDING. You sent for this a quarter of an hour
             ago and waited for it; it used to arrive by quietly appearing in a panel that
             may well be scrolled off the screen, with a line in the unit log nobody at a
             bedside can see. setNote only lands on the cot you are actually at, so a result
             for another baby stays as quiet as it was. The fourth of this family: the
             confirmations, the attending's advice, the follow-up watch, and now this. */
          setNote(b, b.labs[got].crit ? "warn" : "good",
                  testName(got) + " back: " + b.labs[got].v, { tag: "result" });
        }
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
  /* THE LOWEST EMPTY COT, not always bed six.

     An admission used to be put in bed 6 whatever else was true, which worked while there
     was exactly one of them and the census filled beds 1 to 5. Now a Student walks into
     three cots and an Attending can take two babies from the delivery room, so a fixed bed
     would leave gaps - beds 1, 2, 3 and then 6 - and two arrivals would land on top of
     each other.

     Six is the ceiling and the game is built to it: six bed colours, six keyboard
     shortcuts, and bedAccent counts modulo six. Past that the unit is genuinely full, and
     a full unit sending a baby elsewhere is a real thing that happens rather than an
     error - so it stays as the capacity valve. */
  var MAX_BEDS = 6;
  /* A bed number belongs to whoever was put in it, for the whole night. Dying does not
     give it back: the cot stays on the unit view reading "this bedspace is quiet now", it
     is still that baby's row in the report and still their line at handover. Letting an
     admission reuse it put two pods on screen both labelled bed 3, and byBed(3) - which is
     how concerns, conversations, the follow-up watches and the keyboard all find a baby -
     answered with the dead one, because it searches in census order.
     The cost is that a death narrows the unit by one cot for the rest of the shift, which
     is the truthful reading of a bedspace nobody has cleared yet. */
  function freeBed() {
    for (var n = 1; n <= MAX_BEDS; n++) {
      if (!G.babies.some(function (b) { return b.bed === n; })) return n;
    }
    return null;
  }

  function checkAdmission() {
    if (G.admissionDue == null || G.min < G.admissionDue) return;
    G.admissionDue = null;
    if (freeBed() == null) {
      log("There is no cot free, so that baby went to the unit across town.", "warn");
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
    b.bed = freeBed();
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
    log("New admission: Baby " + b.surname + ", " + b.ga + " weeks, to bed " + b.bed, "hi");
    showDialog({
      avatar: "renata", who: "Renata Cruz, RN", role: "Night nurse",
      said: "Bed " + b.bed + " is set up and warm. Baby " + b.surname + " is settled on " + supportLabel(b) +
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
    /* Every level gets at least one delivery now, and the Attending night gets two. How
       many are still to come is what tells the ward pod whether "nothing more from down
       there tonight" is true or a lie. */
    G.deliveriesExpected = G.difficulty === "attending" ? 2 : 1;
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
