/* NICU Night Shift — all sound is synthesised; no audio files, works offline.
   Browsers block audio until the user has interacted with the page, so everything
   routes through unlock(), which the game calls on the first click or keypress. */
(function () {
  "use strict";
  var ctx = null, on = true, master = null, unlocked = false;

  function init() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = 0.5;               // audible without being harsh
    master.connect(ctx.destination);
    return ctx;
  }

  function ready() {
    if (!on) return false;
    if (!init()) return false;
    if (ctx.state === "suspended") { ctx.resume(); return unlocked; }
    unlocked = true;
    return true;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!ready()) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol == null ? 0.55 : vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  var API = {
    setOn: function (v) { on = !!v; if (on) init(); },
    isOn: function () { return on; },
    unlock: function () {
      if (!init()) return;
      if (ctx.state === "suspended") ctx.resume().then(function () { unlocked = true; }, function () {});
      else unlocked = true;
    },
    state: function () { return ctx ? ctx.state : "none"; },

    // someone wants you: a warm two-note chime, more insistent when urgent
    attention: function (urgent) {
      tone(587, 0.13, "sine", 0.45);
      tone(784, 0.16, "sine", 0.45, 0.14);
      if (urgent) tone(784, 0.16, "sine", 0.4, 0.34);
    },
    amber: function () { tone(660, 0.13, "sine", 0.4); tone(560, 0.14, "sine", 0.4, 0.17); },
    red: function () { tone(950, 0.10, "square", 0.30); tone(950, 0.10, "square", 0.30, 0.15);
                       tone(950, 0.10, "square", 0.30, 0.30); },
    // the falling tone every NICU nurse knows
    desat: function () { tone(880, 0.55, "sine", 0.45, 0, 300); },
    phone: function () {
      tone(720, 0.10, "triangle", 0.45); tone(900, 0.10, "triangle", 0.45, 0.13);
      tone(720, 0.10, "triangle", 0.45, 0.32); tone(900, 0.10, "triangle", 0.45, 0.45);
    },
    talk: function () { tone(430, 0.07, "triangle", 0.3); },
    ok: function () { tone(620, 0.09, "sine", 0.4); tone(830, 0.13, "sine", 0.4, 0.10); },
    good: function () { tone(660, 0.09, "sine", 0.42); tone(880, 0.09, "sine", 0.42, 0.11);
                        tone(1170, 0.2, "sine", 0.42, 0.22); },
    bad: function () { tone(220, 0.24, "sawtooth", 0.3); tone(165, 0.32, "sawtooth", 0.28, 0.2); },
    click: function () { tone(1200, 0.035, "sine", 0.22); }
  };
  window.Sound = API;
})();
