/* NICU Night Shift — everything on screen.

   The unit, the bedside, the side panel, the handover sheet, and the small army of helpers
   that turn hidden state into something a person can read: the monitor rows, the cot cards,
   the tooltips-with-context, the "this baby's night" history, the row of faces at a cot.

   ONE RULE RUNS THROUGH ALL OF IT. Every panel here rebuilds its innerHTML on the clock,
   several times a second, so anything that survives a redraw has to be re-established
   afterwards - which is what setHtml, keepFocus and data-focus-key are for. Writing HTML
   that is byte for byte what is already there is not free: it destroys and rebuilds every
   node underneath, and the button you were reaching for becomes a different element before
   your mouse comes back up.

   Split out of game.js. Nothing changed in the move; what this file reaches for outside
   itself is listed at the top instead of being implicit in a shared closure, and everything
   is looked up when it is CALLED, so game.js coming first is the only load-order rule. */
(function () {
  "use strict";
  var G = window.G, S = window.Sim, EV = window.Events, A = window.Art,
      Snd = window.Sound, GL = window.Glossary, CL = window.Clinical, U = window.Util;
  var NG = window.NG || (window.NG = {});

  /* The clock's own constants, read once at load. game.js is parser-blocking and runs to
     completion before this file is even parsed, so these are already there - and unlike a
     function, a number has nothing to gain from being looked up later. */
  var SHIFT_LEN = NG.SHIFT_LEN, SHIFT_START = NG.SHIFT_START, RATE = NG.RATE;

  /* ---- What this file borrows, resolved at call time. ---- */
  function $(id) { return NG.$(id); }
  function el(t, c, h) { return NG.el(t, c, h); }
  function esc(s) { return NG.esc(s); }
  function gl(s) { return NG.gl(s); }
  function cap(s) { return NG.cap(s); }
  function clockStr(m) { return NG.clockStr(m); }
  function agoStr(m) { return NG.agoStr(m); }
  function byBed(n) { return NG.byBed(n); }
  function announce(m) { return NG.announce(m); }
  function notice() { return NG.notice(); }
  function playerActed() { return NG.playerActed(); }
  function actionLabel(id, b) { return NG.actionLabel(id, b); }
  function recordHistory(b, k, t) { return NG.recordHistory(b, k, t); }
  function log(m, k) { return NG.log(m, k); }
  function labValueHtml(rec) { return NG.labValueHtml(rec); }
  function clockHeld() { return NG.clockHeld(); }
  function costLabel() { return NG.costLabel(); }
  function shownMin() { return NG.shownMin(); }
  function hideTip() { return NG.hideTip(); }
  /* ...and from the director, which owns who is waiting at a cot */
  function concernsAt(b) { return NG.concernsAt(b); }
  function openConcernFor(b) { return NG.openConcernFor(b); }
  function activeConcernFor(b) { return NG.activeConcernFor(b); }
  function anyFresh(list, note) { return NG.anyFresh(list, note); }
  function replyClass(r) { return NG.replyClass(r); }
  /* ...and the delivery room, which sits in the ward like a bedspace */
  function deliveryPod() { return NG.deliveryPod(); }
  function updateDeliveryLive() { return NG.updateDeliveryLive(); }

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
  function bedAccent(b) { return U.bedAccent(b); }

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

  /* ------------------------------------------------- where to act, as a place to go
     Every one of the twenty-four concerns already names the panel its answer lives in -
     "Under Assess: a blood count, a sugar, a culture" - and then the panel was two screens
     away. Measured at 1024x768 on a cot with a live concern: the bedside stage is 2,757
     pixels tall in a 697 pixel viewport and the first action button sits 1,365 pixels down.
     So a player who knew exactly what to do still had to go hunting for it, and the loop
     was hear, scroll, scroll, act.

     The panel names are marked up the same way the glossary marks up its terms: one list,
     matched in prose, so not one of the twenty-four help strings had to be re-authored and
     a new panel only has to be named here. */
  var PANELS = ["Respiratory support", "Fluids & feeds", "Assess", "Imaging", "Treat",
                "Procedures", "Care"];
  function panelSlug(name) { return name.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z]+/g, "-"); }
  var PANEL_RE = new RegExp("\\b(" + PANELS.map(function (p) {
    return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ & /, " (?:&amp;|&) ");
  }).join("|") + ")\\b", "g");

  /* Only in the prose. gl() has already run by this point, so the text is peppered with
     <abbr data-term="kangaroo care"> and data-tip attributes that contain these very words -
     and rewriting inside one would put a button in the middle of a tag. */
  function outsideTags(html, fn) {
    return String(html).replace(/(<[^>]*>)|([^<]+)/g, function (m, tag, text) {
      return tag ? tag : fn(text);
    });
  }
  function panelJumps(html) {
    return outsideTags(html, function (text) {
      return text.replace(PANEL_RE, function (m) {
        return '<button type="button" class="jump" data-jump="' + panelSlug(m) + '">' + m + "</button>";
      });
    });
  }
  /* Scrolled by hand, a frame at a time. scrollTo({behavior:"smooth"}) is the obvious way
     to do this and it is not reliable: measured in the browser this was developed in, the
     call is accepted without complaint and the element simply never moves - scrollTop sat
     at 0 for a full second while a plain assignment worked immediately. A jump that
     silently does nothing is the worst possible outcome for a control whose entire job is
     to take you somewhere, so the tween is ours. */
  function glide(el, to, instant) {
    var from = el.scrollTop, dist = to - from;
    if (instant || Math.abs(dist) < 2) { el.scrollTop = to; return; }
    var ms = Math.min(420, 140 + Math.abs(dist) * 0.3), t0 = 0, done = false;
    /* A belt to go with the braces: requestAnimationFrame does not run at all in a hidden
       or throttled document, so on its own the tween would leave the page exactly where it
       was - the same silent no-op this function was written to avoid, just one layer down.
       If the frames never come, land it anyway. */
    var snap = setTimeout(function () { if (!done) { el.scrollTop = to; done = true; } }, ms + 90);
    requestAnimationFrame(function step(ts) {
      if (done) return;
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / ms);
      el.scrollTop = from + dist * (1 - Math.pow(1 - k, 3));      // ease out
      if (k < 1) requestAnimationFrame(step);
      else { done = true; clearTimeout(snap); }
    });
  }

  function jumpToPanel(slug) {
    var stage = $("stage");
    var p = stage && stage.querySelector('[data-panel="' + slug.replace(/["\\]/g, "") + '"]');
    if (!p) return;
    Snd.click(); playerActed();
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Scrolled by hand rather than with scrollIntoView, because the thing that sent you
       here is pinned over the top of where you are going. The callout is sticky and can be
       270 pixels of colleague; measured at 1024x768, scrollIntoView({block:"center"}) put
       the Assess panel's heading and its first row of buttons underneath it. Land the panel
       just below whatever the callout is currently occupying. */
    var sr = stage.getBoundingClientRect(), pr = p.getBoundingClientRect();
    var co = $("callout"), overlay = 0;
    if (co) overlay = Math.max(0, co.getBoundingClientRect().bottom - sr.top);
    var to = stage.scrollTop + (pr.top - sr.top) - overlay - 12;

    /* Focus and flash BEFORE the scroll, never after. Calling focus() while a smooth scroll
       is in flight cancels it - the panel lit up and took the keyboard, and the page sat
       exactly where it was, which is the one failure that looks like nothing happened. */
    p.setAttribute("tabindex", "-1");
    try { p.focus({ preventScroll: true }); } catch (e) {}
    p.classList.remove("landed"); void p.offsetWidth; p.classList.add("landed");

    glide(stage, to, still);
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
    /* Nothing to draw into once the shift is over. stepWorld() can end the night in the
       middle of frame()'s step loop, and that loop then called render() against a page the
       report had already replaced - so every shift that ran to seven in the morning threw
       an uncaught TypeError out of $("clock") as the report appeared. */
    if (!G.running) return;
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
    // frame() calls this on its way out too, after the report may have taken the bar away
    if (!$("clock")) return;
    var shown = shownMin();
    $("clock").textContent = clockStr(shown);
    var left = Math.max(0, Math.round(SHIFT_LEN - shown));
    $("clockSub").textContent = Math.floor(left / 60) + "h " + (left % 60) + "m left";
    renderClockState();
    /* The word is wrapped so a narrow screen can drop it and keep the number, and the
       accessible name carries what the word said - hiding a label must not delete it. */
    var trustN = Math.round(Math.max(0, Math.min(100, G.trust)));
    var st = $("statTrust");
    st.innerHTML = '<span class="ico" aria-hidden="true">\uD83D\uDC6A</span>' +
                   '<span class="lbl">Family trust </span><b>' + trustN + "</b>";
    st.setAttribute("aria-label", "Family trust " + trustN + " percent");
    st.setAttribute("data-tip", "How much the families on this unit feel included and informed. " +
      "Sitting down with a parent raises it; leaving somebody waiting, or not picking up when they " +
      "ring, lowers it. It is one of the five things the shift is scored on.");
    var lvl = $("statLevel");
    if (lvl && !lvl.dataset.set) {
      lvl.dataset.set = "1";
      var name = { student: "Student", resident: "Resident", attending: "Attending" }[G.difficulty];
      var bits = [G.nudges ? "prompts on" : "no prompts", G.allowDeath ? "deaths on" : "deaths off"];
      lvl.innerHTML = "<b>" + name + '</b><span class="lbl"> &middot; ' + bits.join(" &middot; ") + "</span>";
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
    var sa = $("statAlarm");
    sa.innerHTML = '<span class="ico" aria-hidden="true">\uD83D\uDD14</span>' +
                   '<span class="lbl">Alarms </span><b>' + al + "</b>";
    sa.setAttribute("aria-label", al + (al === 1 ? " alarm" : " alarms") + " sounding");
    sa.setAttribute("data-tip", "How many babies have a monitor alarming right now, amber or red.");
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
    h += '<div class="panel" data-panel="respiratory-support"><h4>Respiratory support</h4>' +
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
    h += '<div class="panel" data-panel="fluids-feeds"><h4>Fluids &amp; feeds</h4>' +
      '<div class="ctl-row"><label>' + GL.term("Dextrose", "dextrose") + '</label><div class="seg" id="segDex">' +
      [0, 5, 10, 12.5].map(function (d) { return '<button data-dex="' + d + '" class="' + (b.h.dexPct === d ? "on" : "") + '">' + (d ? "D" + d : "none") + "</button>"; }).join("") +
      "</div></div>" +
      ctl("IV rate", "rIv", 0, 150, 10, b.h.ivRate, b.h.ivRate + " " + GL.term("mL/kg/d", "mL/kg/d"), "IV rate") +
      ctl("Feeds", "rFeed", 0, 180, 10, b.h.feedsMlKgD, b.h.feedsMlKgD + " " + GL.term("mL/kg/d", "mL/kg/d"), "feeds") +
      '<div class="muted mono" style="font-size:.82rem" id="girLine"></div></div>';

    var groups = [["Assess", "assess"], ["Imaging", "imaging"], ["Treat", "treat"], ["Procedures", "proc"], ["Care", "care"]];
    groups.forEach(function (g) {
      h += '<div class="panel" data-panel="' + panelSlug(g[0]) + '"><h4>' + g[0] + '</h4><div class="act-grid">';
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
    if (G.nudges && c.def.help)
      html += '<div class="help">🧭 <b>Where to act.</b> ' + panelJumps(gl(c.def.help)) + "</div>";
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

  /* ---- And what it hands back. ---- */
  NG.render = render; NG.renderTop = renderTop;
  NG.renderBedCallout = renderBedCallout; NG.renderBedPeople = renderBedPeople;
  NG.openBed = openBed; NG.backToWard = backToWard; NG.setMode = setMode;
  NG.renderBed = renderBed;
  NG.supportLabel = supportLabel; NG.displayName = displayName;
  NG.supportHtml = supportHtml; NG.metaHtml = metaHtml; NG.vitalsHtml = vitalsHtml;
  NG.setNote = setNote; NG.seen = seen;
  NG.setHtml = setHtml; NG.keepFocus = keepFocus; NG.vT = vT;
  NG.syncStickyOffsets = syncStickyOffsets; NG.jumpToPanel = jumpToPanel;
  NG.testName = testName; NG.testLabel = testLabel;
})();
