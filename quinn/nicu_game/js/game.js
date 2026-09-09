/* NICU Night Shift — game loop, interface, scoring. */
(function () {
  "use strict";
  var S = window.Sim, P = window.Patients, EV = window.Events, A = window.Art,
      Snd = window.Sound, GL = window.Glossary;

  var SHIFT_START = 19 * 60, SHIFT_LEN = 12 * 60;
  var SPEEDS = { 1: 2400, 2: 1200, 4: 500 };

  var G = window.G = {
    min: 0, babies: [], speed: 1, paused: true, running: false,
    logLines: [], trust: 55, knowledge: 0, score: 0, scoreItems: [],
    difficulty: "resident", allowDeath: true, hints: true, nudges: true,
    view: { mode: "ward", bed: null },
    concerns: [], talks: [], watches: [], call: null, callHistory: {},
    fired: {}, cooldowns: {}, declined: {}, dialogOpen: false, dialogQueue: [],
    crisis: null, admissionDue: null, admissionDone: false, admissionColder: false,
    nameUsed: {}, seedVal: 1,
    metrics: { safetyCatches: 0, overrides: 0, calledForHelp: 0, exams: 0, draws: 0,
               concernsAnswered: 0, concernsMissed: 0, callsAnswered: 0, callsMissed: 0, talksOffered: 0,
               talksHad: 0, alarmsIgnored: 0 }
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

  function log(msg, kind) {
    G.logLines.unshift({ t: clockStr(G.min), m: msg, k: kind || "" });
    if (G.logLines.length > 140) G.logLines.pop();
  }
  function addScore(n, why) { G.score += n; if (why) G.scoreItems.push({ n: n, why: why, t: clockStr(G.min) }); }
  G.log = log; G.addScore = addScore;

  G.parentPresent = function (b) {
    if (b.died || b.discharged) return false;
    var h = (SHIFT_START + G.min) / 60 % 24;
    var w = b.visitWindow || [19, 23];
    if (w[0] <= w[1]) return h >= w[0] && h < w[1];
    return h >= w[0] || h < w[1];
  };

  // ------------------------------------------------------------------ orders
  var LAB_TIME = { glucose: 5, gas: 15, cbc: 40, bili: 25 };
  var IMG_TIME = { axr: 25, hus: 40, echo: 55 };

  G.orderLab = function (b, kind) {
    if (b.pending.some(function (p) { return p.kind === kind; })) return;
    b.pending.push({ kind: kind, due: G.min + LAB_TIME[kind], type: "lab" });
    if (kind !== "glucose") { b.h.draws++; b.h.hgb -= 0.35; b.h.painStim = 0.28; G.metrics.draws++; }
    else b.h.painStim = 0.15;
    b.h.handling += 0.6;
    log("Sent " + kind.toUpperCase() + " on " + b.name, "");
  };
  G.orderImaging = function (b, kind, chest) {
    if (b.pending.some(function (p) { return p.kind === kind && !!p.chest === !!chest; })) return;
    b.pending.push({ kind: kind, due: G.min + IMG_TIME[kind], type: "img", chest: chest });
    b.h.handling += 0.8;
    log("Ordered " + ({ axr: chest ? "chest X-ray" : "abdominal X-ray", hus: "head ultrasound", echo: "echocardiogram" })[kind] + " for " + b.name, "");
  };
  G.orderCulture = function (b) {
    if (b.h.cultureDrawn) return;
    b.h.cultureDrawn = true; b.h.cultureAt = G.min; b.h.draws++; b.h.painStim = 0.3;
    log("Blood culture drawn on " + b.name, "");
  };
  G.startAbx = function (b) {
    if (b.h.abx) return;
    if (!b.h.cultureDrawn) { log("Antibiotics started on " + b.name + " before a culture was drawn", "warn"); addScore(-2, "Antibiotics before the culture on " + b.name); }
    b.h.abx = true; b.h.abxMinutes = 0;
    log("Antibiotics started on " + b.name, "good");
  };

  // ----------------------------------------------------------------- actions
  var ACTIONS = {
    examine:  { t: "Examine", cost: 5, g: "assess" },
    glucose:  { t: "Glucose (heel)", cost: 5, g: "assess" },
    gas:      { t: "Blood gas", cost: 10, g: "assess" },
    cbc:      { t: "Blood count", cost: 10, g: "assess" },
    bili:     { t: "Bilirubin", cost: 10, g: "assess" },
    culture:  { t: "Blood culture", cost: 10, g: "assess" },
    cxr:      { t: "Chest X-ray", cost: 10, g: "imaging" },
    axr:      { t: "Abdominal X-ray", cost: 10, g: "imaging" },
    hus:      { t: "Head ultrasound", cost: 10, g: "imaging" },
    echo:     { t: "Echocardiogram", cost: 10, g: "imaging" },
    caffeine: { t: "Caffeine", cost: 5, g: "treat" },
    abx:      { t: "Antibiotics", cost: 10, g: "treat" },
    surfactant:{ t: "Surfactant", cost: 10, g: "treat" },
    photo:    { t: "Phototherapy", cost: 5, g: "treat" },
    d10:      { t: "Dextrose bolus", cost: 5, g: "treat" },
    bolus:    { t: "Fluid bolus", cost: 10, g: "treat" },
    dopamine: { t: "Dopamine", cost: 10, g: "treat" },
    ibuprofen:{ t: "Ibuprofen", cost: 5, g: "treat" },
    transfuse:{ t: "Transfuse", cost: 20, g: "treat" },
    npo:      { t: "Stop feeds", cost: 5, g: "treat" },
    intubate: { t: "Intubate", cost: 15, g: "proc" },
    extubate: { t: "Extubate", cost: 10, g: "proc" },
    suction:  { t: "Suction", cost: 5, g: "proc" },
    needle:   { t: "Needle the chest", cost: 10, g: "proc" },
    reposition:{ t: "Fix probe / leads", cost: 5, g: "proc" },
    comfort:  { t: "Comfort care", cost: 5, g: "care" },
    kangaroo: { t: "Kangaroo care", cost: 10, g: "care" }
  };

  G.doAction = function (b, id, opt) {
    opt = opt || {};
    var a = ACTIONS[id], h = b.h, msg = null, kind = "";
    if (!a) return;
    switch (id) {
      case "examine":
        G.metrics.exams++; b.findings = S.examine(b); b.examinedAt = G.min; msg = "Examined " + b.name; break;
      case "comfort":
        h.swaddled = true; h.pain = S.c01(h.pain - 0.35); h.comfortActs++; h.handling = Math.max(0, h.handling - 0.4);
        msg = b.name + " settled with containment and a dim light"; kind = "good"; break;
      case "kangaroo":
        if (!G.parentPresent(b)) { msg = "No parent at the bedside right now"; kind = "warn"; break; }
        h.kangaroo = true; h.swaddled = false; h.pain = S.c01(h.pain - 0.5); h.comfortActs++; G.trust += 8;
        msg = b.name + " is skin to skin with " + b.parentName; kind = "good"; break;
      case "suction":
        h.secretions = S.c01(h.secretions - 0.55); h.painStim = 0.2; h.handling += 0.5; msg = "Suctioned " + b.name; break;
      case "reposition":
        if (h.artifactProbe || h.artifactLead) { msg = "Reseated the sensors on " + b.name + " and the readings settle"; kind = "good"; }
        else msg = "The sensors on " + b.name + " were already sitting properly";
        h.artifactProbe = false; h.artifactProbeAt = 0; h.artifactLead = false; break;
      case "glucose": case "gas": case "cbc": case "bili": G.orderLab(b, id); break;
      case "culture": G.orderCulture(b); break;
      case "axr": G.orderImaging(b, "axr", false); break;
      case "cxr": G.orderImaging(b, "axr", true); break;
      case "hus": case "echo": G.orderImaging(b, id); break;
      case "caffeine":
        if (h.caffeine) { msg = b.name + " is already on caffeine"; kind = "warn"; break; }
        h.caffeine = true; msg = "Caffeine loaded for " + b.name; kind = "good"; break;
      case "abx": G.startAbx(b); break;
      case "surfactant":
        if (b.support.mode !== "VENT") { msg = "Surfactant needs a breathing tube first"; kind = "warn"; break; }
        h.surfTreatPending = 1; h.rds = S.c01(h.rds - 0.9); h.handling += 0.7;
        msg = "Surfactant given to " + b.name + ". The chest starts moving more easily within minutes"; kind = "good";
        watch(b, "sat", "surfactant"); break;
      case "intubate":
        if (b.support.mode === "VENT") { msg = b.name + " is already intubated"; kind = "warn"; break; }
        h.handling += 1.4; h.painStim = 0.35;
        if (S.chance(G.difficulty === "attending" ? 0.24 : G.difficulty === "student" ? 0.05 : 0.13)) {
          msg = "First attempt at intubating " + b.name + " failed. Second attempt successful."; kind = "warn"; h.painStim += 0.2;
        } else msg = b.name + " intubated";
        b.support.mode = "VENT"; b.support.pip = Math.max(16, Math.round(14 + 6 * h.rds));
        b.support.peep = 5; b.support.rate = 40; h.ettDisplaced = false; break;
      case "extubate":
        if (b.support.mode !== "VENT") { msg = b.name + " is not intubated"; kind = "warn"; break; }
        b.support.mode = "CPAP"; b.support.cpap = 6;
        if (h.spontDrive < 0.75 || h.co2 > 62 || S.lungFunction(b) < 0.45) {
          h.fatigue += 0.35; msg = b.name + " was extubated but is struggling. This may not hold"; kind = "warn";
          addScore(-3, "Extubated " + b.name + " before " + b.pronoun.s + " was ready");
        } else { msg = b.name + " extubated to CPAP and doing well"; kind = "good"; }
        break;
      case "bolus":
        if (h.hypovolemia > 0.25) { h.hypovolemia = S.c01(h.hypovolemia - 0.5); msg = "Fluid bolus given and the perfusion improves"; kind = "good"; }
        else { h.secretions += 0.12; msg = "Fluid bolus given, with no obvious improvement"; kind = "warn"; addScore(-2, "Fluid bolus without evidence of hypovolaemia"); }
        break;
      case "d10": h.d10bolus = 45; h.glucose += 30; msg = "Dextrose bolus given to " + b.name; kind = "good"; watch(b, "glucose", "dextrose"); break;
      case "dopamine": h.pressorInfusion = true; h.pressorDose = 1; msg = "Dopamine started on " + b.name; break;
      case "ibuprofen":
        if (h.pda < 0.2) { msg = "There is no significant duct to treat"; kind = "warn"; addScore(-2, "Treated a duct that was not open"); break; }
        h.pdaTreat = 240; h.gutTol = S.c01(h.gutTol - 0.08); msg = "Ibuprofen started for " + b.name + "'s duct"; kind = "good"; break;
      case "transfuse":
        if (h.hgb < 10) { h.hgb += 4; msg = "Red cells transfused and " + b.name + " looks pinker"; kind = "good"; }
        else { msg = b.name + " does not need blood"; kind = "warn"; addScore(-2, "Unnecessary transfusion"); }
        break;
      case "needle":
        if (h.ptx) { h.ptx = false; msg = "Air released. " + b.name + "'s saturation climbs almost at once"; kind = "good"; addScore(8, "Decompressed a pneumothorax"); }
        else { h.painStim = 0.4; h.handling += 1; msg = "No air found. There was no pneumothorax"; kind = "warn"; addScore(-4, "Needled a chest with no air leak"); }
        break;
      case "photo":
        h.photo = h.photo ? 0 : (h.bili > h.biliThreshold + 3 ? 2 : 1);
        msg = h.photo ? "Phototherapy started for " + b.name + (h.photo > 1 ? " (double)" : "") : "Phototherapy stopped for " + b.name;
        kind = "good"; break;
      case "npo": h.feedsMlKgD = 0; msg = b.name + " made nil by mouth, stomach decompressed"; kind = "good"; break;
    }
    if (msg) log(msg, kind);
    judgeConcern(b, id);
    if (!opt.silent) { G.advance(a.cost); render(); }
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

  function byBed(n) { for (var i = 0; i < G.babies.length; i++) if (G.babies[i].bed === n) return G.babies[i]; return null; }

  // ---------------------------------------------------------------- concerns
  function raiseConcerns() {
    EV.CONCERNS.forEach(function (c) {
      G.babies.forEach(function (b) {
        if (b.died || b.discharged) return;
        var key = c.id + ":" + b.bed;
        if (G.concerns.some(function (x) { return x.key === key && !x.done; })) return;
        if (G.cooldowns[key] && G.min - G.cooldowns[key] < (c.cooldown || 90)) return;
        if (!c.cond(G, b)) return;
        var whoId = typeof c.who === "function" ? c.who(b) : c.who;
        G.concerns.push({ key: key, id: c.id, def: c, bed: b.bed, who: whoId,
                          at: G.min, seen: false, done: false, escalated: !!G.declined[key] });
        G.cooldowns[key] = G.min;
        log(EV.CHARS[whoId].name.split(",")[0] + " wants you at bed " + b.bed + " - " + c.summary(G, b), "hi");
        Snd.attention(c.severity === "urgent");
      });
    });
  }

  function openConcernFor(b) {
    for (var i = 0; i < G.concerns.length; i++) {
      if (G.concerns[i].bed === b.bed && !G.concerns[i].done) return G.concerns[i];
    }
    return null;
  }

  function firstName(whoId) {
    var n = EV.CHARS[whoId] ? EV.CHARS[whoId].name : "";
    return n.split(",")[0].split(" ")[0] || n;
  }

  function pushReply(c, good, text) {
    c.replies = c.replies || [];
    c.replies.push({ good: good, text: text });
    if (c.replies.length > 3) c.replies.shift();
  }

  function judgeConcern(b, actionId) {
    var c = openConcernFor(b);
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
      pushReply(c, null, lines[(c.replies ? c.replies.length : 0) % lines.length]);
      renderBedCallout(b);
      return;
    }
    if (r) {
      addScore(r.score, (ACTIONS[actionId] ? ACTIONS[actionId].t : "Adjusted the settings") +
                        " for " + b.name + " when " + EV.CHARS[c.who].name.split(",")[0] + " asked");
      pushReply(c, true, r.fb);
      if (r.resolve) { c.done = true; c.resolvedAt = G.min; G.metrics.concernsAnswered++; }
      Snd.ok();
    } else if (bad) {
      addScore(bad.score, (ACTIONS[actionId] ? ACTIONS[actionId].t : "That adjustment") +
                          " was the wrong answer for " + b.name);
      pushReply(c, false, bad.fb);
      Snd.bad();
    }
    if (r || bad) renderBedCallout(b);
  }

  function declineConcern(b) {
    var c = openConcernFor(b);
    if (!c || !c.seen) return;
    var d = c.def.decline || { fb: "They accept it and move on.", score: -1, resolve: false };
    addScore(d.score, "Declined " + EV.CHARS[c.who].name.split(",")[0] + "'s concern about " + b.name);
    pushReply(c, d.score > 0 ? true : d.score < 0 ? false : null, d.fb);
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

  function escalateConcerns() {
    G.concerns.forEach(function (c) {
      if (c.done) return;
      var b = byBed(c.bed); if (!b || b.died) { c.done = true; return; }
      var age = G.min - c.at;
      var limit = c.def.severity === "urgent" ? 45 : c.def.severity === "worry" ? 75 : 110;
      if (!c.escalated && age > limit) {
        c.escalated = true;
        log(EV.CHARS[c.who].name.split(",")[0] + " asks again about bed " + c.bed + ". " + cap(c.def.summary(G, b)) + ".", "warn");
        Snd.attention(true);
      }
      if (age > limit * 2.2) {
        c.done = true; c.missed = true; G.metrics.concernsMissed++;
        addScore(c.def.miss.score, "Never came to bed " + c.bed + ": " + c.def.summary(G, b));
        log(c.def.miss.fb, "bad");
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
      pool = pool.filter(function (x) { return x !== t; });
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
        return { label: o.label, hint: o.hint, run: function () {
          if (o.apply) o.apply(G, b);
          if (o.score) addScore(o.score, o.label.replace(/"/g, "").slice(0, 54) + (b ? " (" + b.name + ")" : ""));
          return { text: o.fb, kind: o.fbKind };
        } };
      })
    });
  }

  // ------------------------------------------------------------------- calls
  function updateCalls() {
    if (G.call) {
      G.call.rings += 1;
      if (G.call.rings > 8) {   // unanswered: caller gives up for now
        var def = G.call.def;
        G.callHistory[def.id] = (G.callHistory[def.id] || 0) + 1;
        G.call = null;
        if (G.callHistory[def.id] >= (def.persistent || 1)) {
          G.metrics.callsMissed++;
          if (def.onIgnoreAll) def.onIgnoreAll(G);
          G.fired["call:" + def.id] = true;
        } else {
          log("The phone stopped ringing.", "");
        }
      }
      return;
    }
    for (var i = 0; i < EV.CALLS.length; i++) {
      var c = EV.CALLS[i];
      if (G.fired["call:" + c.id]) continue;
      if (c.studentSkip && G.difficulty === "student") continue;
      if (c.minMin && G.min < c.minMin) continue;
      if (c.cond && !c.cond(G)) continue;
      if ((G.callHistory[c.id] || 0) > 0 && G.min - (G.lastCallEnd || 0) < 60) continue;
      G.call = { def: c, rings: 0, since: G.min };
      log("The phone is ringing. " + c.preview + ".", "hi");
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
        opts: [{ label: "Go now", hint: "Leaves the unit for a while", run: function () {
          setTimeout(function () { c.onAnswer(G); }, 350);
          return { text: "You pull on a gown as you walk.", kind: "ok" };
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
          if (o.score) addScore(o.score, o.label.replace(/"/g, "").slice(0, 54));
          return { text: o.fb, kind: o.fbKind };
        } };
      })
    });
  };

  G.acceptTransfer = function (colder) {
    G.admissionDue = G.min + 45; G.admissionColder = !!colder;
    log("Accepted a 29-week transfer. They are on their way.", "hi");
  };
  G.startDeliveryRoom = function () { deliveryRoom(1); };

  // ------------------------------------------------------------------ crises
  var CRISES = {
    dope: {
      title: "Acute deterioration",
      line: function (b) {
        return b.name + "'s saturation has dropped into the 70s and is not coming back. Turning the oxygen up " +
               "is doing nothing. The heart rate is falling. Priya is bagging.";
      },
      nudge: "Sudden, one-sided, and unresponsive to oxygen. Run the DOPE checklist.",
      opts: [
        { label: "Check the tube position and listen to both sides of the chest", hint: "Rules out displacement and obstruction",
          run: function (b) {
            if (b.h.ettDisplaced) { b.h.ettDisplaced = false; return { ok: true, text: "The tube had slipped into the right main bronchus. Pulled back two centimetres and the chest lifts evenly again.", score: 8 }; }
            if (b.h.secretions > 0.5) { b.h.secretions = 0.1; return { ok: true, text: "A thick plug of secretions. Suctioned, and the chest moves again.", score: 8 }; }
            return { ok: false, text: "The tube is in the right place and the airway is clear. But listen again: the breath sounds are much quieter on one side.", score: 2 };
          } },
        { label: "Needle the chest for a pneumothorax", hint: "Releases trapped air, if there is any",
          run: function (b) {
            if (b.h.ptx) { b.h.ptx = false; b.h.ptxHandled = true; return { ok: true, text: "Air hisses out. The saturation climbs from the 70s to the 90s within a few breaths and the heart rate recovers. That was a tension pneumothorax.", score: 12 }; }
            b.h.painStim = 0.5; b.h.handling += 1.5;
            return { ok: false, text: "No air comes out. There was no pneumothorax, and you have put a needle into a baby's chest for nothing.", score: -6 };
          } },
        { label: "Turn the oxygen to 100 percent and keep bagging", hint: "Maximises oxygen while you think",
          run: function (b) { b.support.fio2 = 1; b.h.o2Exposure += 40;
            return { ok: false, text: "Full oxygen makes no difference at all, which is itself the clue. When oxygen does not fix hypoxia, the problem is not oxygen.", score: 0 }; } },
        { label: "Call Dr. Halvorsen to come in", hint: "Brings a senior to the bedside",
          run: function (b) { G.metrics.calledForHelp++;
            return { ok: false, text: "She is on her way and talks you through it: 'Sudden, one-sided, not responding to oxygen. Get a light on that chest and be ready to needle it.'", score: 4 }; } }
      ]
    },
    shock: {
      title: "Septic shock",
      line: function (b) { return b.name + " has gone grey and mottled. Cap refill is over five seconds and the blood pressure is collapsing."; },
      nudge: "In shock, treatment does not wait for laboratory confirmation.",
      opts: [
        { label: "Fluid bolus, antibiotics now, and call for help", hint: "Volume, antibiotics and another pair of hands",
          run: function (b) { b.h.hypovolemia = S.c01(b.h.hypovolemia - 0.5); G.startAbx(b); b.h.shockHandled = true;
            b.h.sepsis = S.c01(b.h.sepsis - 0.1); G.metrics.calledForHelp++;
            return { ok: true, text: "Volume, antibiotics, and another pair of hands. That is the whole of septic shock management in the first hour, in the right order.", score: 12 }; } },
        { label: "Start dopamine to bring the pressure up", hint: "Raises the blood pressure only",
          run: function (b) { b.h.pressorInfusion = true; b.h.pressorDose = 1;
            return { ok: false, text: "The number comes up a little. The baby is no better, because the infection is still running.", score: -2 }; } },
        { label: "Send a full set of labs and wait for the results", hint: "Gathers data before treating",
          run: function (b) { G.orderLab(b, "gas"); G.orderLab(b, "cbc");
            return { ok: false, text: "The labs can be drawn on the way past. They cannot be waited for.", score: -5 }; } }
      ]
    },
    hypo: {
      title: "Severe hypoglycaemia",
      line: function (b) { return b.name + "'s blood sugar is " + Math.round(b.h.glucose) + " and " + b.pronoun.s + " is jittery and hard to rouse."; },
      nudge: "Fix the moment, then make sure it stays fixed.",
      opts: [
        { label: "Dextrose bolus now, then turn up the sugar in the drip", hint: "Treats now and prevents the rebound fall",
          run: function (b) { b.h.d10bolus = 60; b.h.glucose += 35; b.h.dexPct = Math.max(b.h.dexPct, 12.5);
            b.h.ivRate = Math.max(b.h.ivRate, 80); b.h.hypoHandled = true;
            return { ok: true, text: "Bolus in, and the infusion turned up so it does not simply fall again. The glucose infusion rate is what holds it there.", score: 10 }; } },
        { label: "Give a bolus and recheck in an hour", hint: "Treats the moment only",
          run: function (b) { b.h.d10bolus = 45; b.h.glucose += 30;
            return { ok: false, text: "It comes up, then falls again. A bolus without increasing the infusion is a bounce, not a fix.", score: 2 }; } },
        { label: "Start a milk feed", hint: "Sugar by the slower route",
          run: function (b) { b.h.feedsMlKgD += 20;
            return { ok: false, text: "Far too slow for a sugar this low, and this baby is too unwell to feed safely.", score: -4 }; } }
      ]
    }
  };

  function checkCrisis() {
    if (G.crisis || G.dialogOpen) return;
    for (var i = 0; i < G.babies.length; i++) {
      var b = G.babies[i];
      if (b.died || b.discharged) continue;
      if (b.h.ptx && b.mon.trueSat < 82 && !b.h.ptxHandled) return startCrisis(b, "dope");
      if (b.h.sepsis > 0.82 && b.h.criticalRun > 25 && !b.h.shockHandled) return startCrisis(b, "shock");
      if (b.h.glucose < 25 && b.h.criticalRun > 15 && !b.h.hypoHandled) return startCrisis(b, "hypo");
    }
  }

  function startCrisis(b, kind) {
    G.crisis = { b: b, kind: kind };
    G.paused = true; Snd.red();
    var c = CRISES[kind];
    showDialog({
      avatar: "priya", who: "EMERGENCY - bed " + b.bed, role: b.name + ", " + b.ga + " weeks",
      said: c.line(b), crisis: true, subject: b, nudge: c.nudge,
      opts: c.opts.map(function (o) {
        return { label: o.label, hint: o.hint, run: function () {
          var r = o.run(b);
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
    d.innerHTML = '<div class="dlg-head"><div class="av">' + A.avatar(cfg.avatar) + "</div><div><div class='who'>" +
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
      var btn = el("button", "dlg-opt", "<div>" + gl(o.label) + "</div>" + (o.hint ? '<div class="oh">' + gl(o.hint) + "</div>" : ""));
      btn.onclick = function () {
        Snd.click();
        var res = o.run() || {};
        opts.remove();
        var fb = el("div", "feedback " + (res.kind === "good" ? "good" : res.kind === "bad" ? "bad" : ""));
        fb.innerHTML = '<div class="fh">' + (res.kind === "good" ? "Good call" : res.kind === "bad" ? "Think again" : "Noted") +
          "</div><div>" + gl(res.text || "") + "</div>";
        d.appendChild(fb);
        var cont = el("button", "btn", res.keepCrisis ? "Keep going" : "Back to the unit");
        cont.style.marginTop = "14px";
        cont.onclick = function () {
          scrim.remove(); G.dialogOpen = false;
          if (res.keepCrisis && G.crisis) setTimeout(function () { startCrisis(G.crisis.b, G.crisis.kind); }, 350);
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
    attachTips(d);
  }

  // ------------------------------------------------------------------- clock
  G.advance = function (mins) {
    var steps = Math.max(1, Math.round(mins / S.TICK));
    for (var i = 0; i < steps; i++) stepWorld(S.TICK);
  };

  function stepWorld(dt) {
    if (G.min >= SHIFT_LEN) return;
    G.min += dt;
    var worst = null;
    G.babies.forEach(function (b) {
      if (b.died || b.discharged) return;
      var prev = b.alarm ? b.alarm.level : "none";
      (S.step(b, dt, G) || []).forEach(function (f) {
        if (f.t === "ptx") log(f.msg, "bad");
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
    if (worst === "red") Snd.desat(); else if (worst === "amber") Snd.amber();
    deliverResults();
    runWatches();
    raiseConcerns();
    escalateConcerns();
    raiseTalks();
    updateCalls();
    checkAdmission();
    checkCrisis();
    if (G.min >= SHIFT_LEN) endShift();
  }

  function tick() {
    if (!G.running) return;
    if (!G.paused && !G.dialogOpen) stepWorld(S.TICK);
    render();
    G.timer = setTimeout(tick, SPEEDS[G.speed]);
  }

  // ------------------------------------------------------------------ results
  function deliverResults() {
    G.babies.forEach(function (b) {
      b.pending = b.pending.filter(function (p) {
        if (G.min < p.due) return true;
        var h = b.h, t;
        if (p.kind === "glucose") { var r = Math.round(h.glucose);
          b.labs.glucose = { v: r + " mg/dL", crit: r < 40 || r > 180, at: G.min };
          log("Glucose on " + b.name + ": " + r, r < 40 ? "warn" : ""); }
        if (p.kind === "gas") { var ph = S.pHfrom(b).toFixed(2), co = Math.round(h.co2), be = Math.round(h.baseDeficit);
          b.labs.gas = { v: "pH " + ph + " / CO2 " + co + " / base deficit " + be, crit: ph < 7.2 || co > 65, at: G.min };
          log("Gas on " + b.name + ": pH " + ph + ", CO2 " + co, ph < 7.2 ? "warn" : ""); }
        if (p.kind === "cbc") { var w = h.wbc.toFixed(1), hb = h.hgb.toFixed(1);
          b.labs.cbc = { v: "WBC " + w + " / Hgb " + hb, crit: h.wbc < 5 || h.wbc > 25 || h.hgb < 8, at: G.min };
          log("Blood count on " + b.name + ": WBC " + w + ", Hgb " + hb, (h.wbc < 5 || h.hgb < 8) ? "warn" : ""); }
        if (p.kind === "bili") { var bl = h.bili.toFixed(1), th = h.biliThreshold.toFixed(0);
          b.labs.bili = { v: bl + " mg/dL, threshold " + th, crit: h.bili > h.biliThreshold, at: G.min };
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
        return false;
      });
      if (b.h.cultureDrawn && !b.labs.culture && G.min - b.h.cultureAt > 300) {
        var pos = b.h.sepsis > 0.08;
        b.labs.culture = { v: pos ? "GROWING organisms at five hours" : "no growth so far", crit: pos, at: G.min };
        log("Blood culture on " + b.name + ": " + (pos ? "positive" : "no growth yet"), pos ? "bad" : "good");
        if (pos && !b.h.abx) addScore(-6, "Culture grew on " + b.name + " with no antibiotics running");
      }
    });
  }

  // ---------------------------------------------------------------- admission
  function checkAdmission() {
    if (G.admissionDue == null || G.admissionDone || G.min < G.admissionDue) return;
    G.admissionDone = true;
    finishAdmission();
  }

  var DR_STEPS = [
    { q: "You are in the delivery room. The baby is out at 29 weeks, floppy, not crying. What is the very first thing?",
      nudge: "Everything else works better once one basic thing is sorted.",
      opts: [
        { l: "Dry, wrap in plastic, hat on, under the warmer", h: "Prevents heat loss immediately", ok: true, s: 6,
          f: "Warm first. A 29-weeker loses heat terrifyingly fast, and cold makes everything else worse. The plastic wrap goes on before drying is even finished." },
        { l: "Suction the mouth and nose", h: "Clears the airway of fluid", ok: false, s: -2,
          f: "Routine suctioning is not recommended and it delays the things that matter." },
        { l: "Start chest compressions", h: "Circulates blood mechanically", ok: false, s: -4,
          f: "Far too early. Compressions come only after effective ventilation has failed to lift the heart rate." }
      ] },
    { q: "Warm and dry. Heart rate is 80 and there is no real breathing effort. Next?",
      nudge: "In a newborn, a slow heart is nearly always short of one thing.",
      opts: [
        { l: "Positive pressure ventilation with a mask", h: "Delivers breaths for the baby", ok: true, s: 8,
          f: "Right. In a newborn a slow heart rate is almost always an oxygen problem, and the fix is ventilation, not adrenaline and not compressions." },
        { l: "Give oxygen by mask and wait", h: "Offers oxygen passively", ok: false, s: -3,
          f: "Passive oxygen does nothing for a baby who is not moving air. This baby needs breaths given to them." },
        { l: "Intubate immediately", h: "Secures the airway with a tube", ok: false, s: -1,
          f: "Mask ventilation works for most babies and is faster. Intubation is for when the mask is not working." }
      ] },
    { q: "Thirty seconds of good mask ventilation: the chest is moving and the heart rate is 130. The baby is making some effort now.",
      nudge: "Use the least support that does the job.",
      opts: [
        { l: "Move to CPAP and watch the work of breathing", h: "Holds the lungs open without a tube", ok: true, s: 8,
          f: "Exactly. CPAP first is the modern approach for a preemie who is breathing, and it spares many babies a tube altogether." },
        { l: "Intubate and give surfactant now", h: "Commits to a tube and surfactant", ok: false, s: 0,
          f: "Defensible in a smaller baby, but this one is breathing and responding." },
        { l: "Wrap and take to the unit on room air", h: "No respiratory support", ok: false, s: -4,
          f: "A 29-weeker who needed help to start will not manage on nothing. The lungs are still stiff." }
      ] },
    { q: "One minute of age. Heart rate over 100, some breathing, arms slightly flexed, grimace to suction, body pink with blue hands and feet. What is the Apgar score?",
      nudge: "Five signs, each worth 0, 1 or 2. Count them one at a time.",
      opts: [
        { l: "7", h: "2 + 1 + 1 + 1 + 1", ok: true, s: 8,
          f: "Heart rate over 100 scores 2, slow irregular breathing 1, some flexion 1, grimace 1, blue extremities 1. Total 7 - and the score describes this minute, not this child's future." },
        { l: "10", h: "Full marks on every sign", ok: false, s: -2,
          f: "Almost nobody scores 10, because hands and feet are usually still blue." },
        { l: "3", h: "Low marks on every sign", ok: false, s: -2,
          f: "Too low. The heart rate alone scores 2, with breathing, tone, grimace and partial colour on top." }
      ] }
  ];

  function deliveryRoom(i) {
    if (!G.running) return;
    var st = DR_STEPS[i - 1];
    if (!st) { G.admissionDue = G.min; return; }
    showDialog({
      avatar: "priya", who: "Delivery room", role: "29 weeks &middot; step " + i + " of " + DR_STEPS.length,
      said: st.q, nudge: st.nudge,
      opts: st.opts.map(function (o) {
        return { label: o.l, hint: o.h, run: function () {
          addScore(o.s, "Delivery room: " + o.l.slice(0, 40));
          if (o.ok) { Snd.ok(); G.drGood = (G.drGood || 0) + 1; } else Snd.bad();
          setTimeout(function () { deliveryRoom(i + 1); }, 400);
          return { text: o.f, kind: o.ok ? "good" : "bad" };
        } };
      })
    });
  }

  function finishAdmission() {
    if (!G.running) return;
    var b = P.makeAdmission(G.difficulty, G.nameUsed);
    b.bed = 6;
    b.visitWindow = [3, 7];
    if (G.admissionColder) b.h.coreTemp = 35.4;
    if ((G.drGood || 0) >= 3) { b.h.coreTemp = 36.7; b.h.rds = Math.max(0.6, b.h.rds - 0.4); }
    b.h.uvc = true; b.h.dexPct = 10; b.h.ivRate = 80;
    G.babies.push(b);
    G.advance(20);
    log("New admission: Baby " + b.surname + ", 29 weeks, to bed 6", "hi");
    showDialog({
      avatar: "renata", who: "Renata Cruz, RN", role: "Night nurse",
      said: "Bed six is set up and warm. Baby " + b.surname + " is settled on CPAP, temperature " +
            b.h.coreTemp.toFixed(1) + ". The parents are still in theatre recovery, so " + b.pronoun.s +
            " has no first name on the chart yet. Everything else is yours.",
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
           b.pronoun.s + " is now about " + now.toFixed(0) + " weeks corrected.";
  }
  function dolTip(b) {
    return "Day of life: how many days old " + b.pronoun.s + " is. Day 0 is the day of birth, so " +
           "day " + b.dol + " means " + (b.dol === 0 ? "born today" : b.dol + " day" + (b.dol === 1 ? "" : "s") + " ago") + ".";
  }
  function wtTip(b) {
    return "Weight: " + (b.weightG / 1000).toFixed(2) + " kilograms, about " + lbs(b.weightG) + ". " +
           "A full-term newborn is usually 3 to 4 kg. The smallest babies in a NICU can be under 1 kg.";
  }
  function fio2Tip(b) {
    var f = Math.round(b.support.fio2 * 100);
    return f <= 21 ? "21 percent oxygen, which is ordinary room air. No extra oxygen is being given."
      : f + " percent oxygen in the air " + b.pronoun.s + " is breathing. Room air is 21 percent, so " +
        b.pronoun.s + " is getting extra. Aim for the least that keeps the saturation in the low 90s.";
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

  function hrTip(b) { return b.mon.hr + " beats per minute. Newborns normally run 100 to 160 - much faster than you."; }
  function rrTip(b) { return b.mon.rr === 0 ? "No breaths being counted right now." :
                             b.mon.rr + " breaths per minute. Newborns normally take 30 to 60."; }
  function satTip(b) { return b.mon.spo2 + " percent of the blood's haemoglobin is carrying oxygen. " +
                              "For a preemie on extra oxygen the aim is 90 to 95, not 100."; }
  function mapTip(b) { return "Mean blood pressure " + b.mon.map + ". A rough guide for a preemie is that it " +
                              "should be at least the number of weeks they were born at, here " + b.ga + "."; }
  function tempTip(b) { return b.mon.temp.toFixed(1) + " degrees Celsius. A baby should sit between 36.5 and 37.5. " +
                               "Below that is cold, and cold is dangerous."; }

  function vitalsHtml(b) {
    return vitalHtml("HR", b.mon.hr, "HR", hrTip(b)) +
           vitalHtml("SpO2", b.mon.spo2 + "%", "SpO2", satTip(b)) +
           vitalHtml("RR", b.mon.rr, "RR", rrTip(b)) +
           vitalHtml("MAP", b.mon.map, "MAP", mapTip(b)) +
           vitalHtml("T", b.mon.temp.toFixed(1), "T", tempTip(b));
  }

  function render() {
    renderTop();
    if (G.view.mode === "handover") return;      // the handover page owns the stage
    if (G.view.mode === "ward") renderWard();
    else if (G.view.mode === "bed") updateBedLive();
    renderSide();
  }

  function renderTop() {
    $("clock").textContent = clockStr(G.min);
    var left = Math.max(0, SHIFT_LEN - G.min);
    $("clockSub").textContent = Math.floor(left / 60) + "h " + (left % 60) + "m left";
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
      attachTips(lvl.parentNode);
    }
    var al = G.babies.filter(function (b) { return !b.died && b.alarm.level !== "none"; }).length;
    $("statAlarm").innerHTML = "Alarms <b>" + al + "</b>";
    ["1", "2", "4"].forEach(function (s) { $("sp" + s).className = G.speed == s ? "on" : ""; });
    $("btnPause").textContent = G.paused ? "▶ Resume" : "⏸ Pause";
    var ph = $("btnPhone");
    ph.className = "phone-btn" + (G.call ? " ringing" : "");
    ph.innerHTML = G.call ? "☎ " + esc(G.call.def.preview) : "☎";
    ph.title = G.call ? "The phone is ringing" : "No calls";
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
      var c = openConcernFor(b), tk = G.talks.filter(function (t) { return t.bed === b.bed; })[0];
      var lvl = b.alarm.level;
      h += '<div class="pod ' + (lvl === "red" ? "alarm-red" : lvl === "amber" ? "alarm-amber" : "") +
        (c ? " has-concern" : "") + '" data-bed="' + i + '">';
      if (c || tk) {
        h += '<div class="pod-flags">' +
          (c ? '<span class="flag ' + c.def.severity + '" title="' + esc(EV.CHARS[c.who].name) + '">' +
               A.miniAvatar(EV.CHARS[c.who].av) + "<span>needs you</span></span>" : "") +
          (tk ? '<span class="flag talk">' + A.miniAvatar(tk.def.who === "parent" ? b.parentAvatar : EV.CHARS[tk.who].av) +
               "<span>" + esc(tk.def.badge) + "</span></span>" : "") + "</div>";
      }
      h += '<div class="pod-head"><div><div class="pod-name">' + esc(displayName(b)) + "</div>" +
        '<div class="pod-meta">' + metaHtml(b, { short: true }) + "</div></div>" +
        '<div class="bed-no">bed ' + b.bed + "</div></div>" +
        '<div class="pod-body"><div class="pod-baby">' + A.baby(S.appearance(b)) + "</div><div class=\"vitals\">" +
        vT("hr", "HR", b.mon.hr, b.mon.hr < 100 || b.mon.hr > 190, hrTip(b)) +
        vT("spo2", "SpO2", b.mon.spo2, b.mon.spo2 < 89 || (b.mon.spo2 > 96 && b.support.fio2 > 0.21), satTip(b)) +
        vT("rr", "RR", b.mon.rr, b.mon.rr === 0, rrTip(b)) +
        vT("bp", "MAP", b.mon.map, b.mon.map < b.ga, mapTip(b)) +
        vT("temp", "T", b.mon.temp.toFixed(1), b.mon.temp < 36.3 || b.mon.temp > 37.6, tempTip(b)) +
        "</div></div>" +
        '<div class="pod-foot"><span class="support-tag ' + supportClass(b) + '">' + supportHtml(b) + "</span>" + chips(b) + "</div></div>";
    });
    $("stage").innerHTML = h + "</div>";
    Array.prototype.forEach.call($("stage").querySelectorAll(".pod[data-bed]"), function (n) {
      n.onclick = function () { openBed(+n.getAttribute("data-bed")); };
    });
    attachTips($("stage"));
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
    G.view = { mode: "bed", bed: i };
    var b = G.babies[i], c = openConcernFor(b);
    if (c && !c.seen) { c.seen = true; c.seenAt = G.min; }
    Snd.click();
    renderBed();
  }
  function backToWard() { G.view = { mode: "ward", bed: null }; render(); }

  function renderBed() {
    var b = G.babies[G.view.bed], s = b.support;
    var h = '<div class="bedside-head"><button class="btn ghost small" id="btnBack">&larr; The unit</button>' +
      "<h2>" + esc(displayName(b)) + "</h2>" +
      '<span class="muted">' +
      GL.tip("bed " + b.bed, "Which bedspace in the unit. Staff often refer to a baby by bed number as well as by name.") +
      " &middot; " + metaHtml(b) + "</span></div>";
    h += '<div id="callout"></div><div id="people"></div>';
    h += '<div class="bed-grid"><div>' +
      '<div class="crib" id="crib"></div>' +
      '<div class="panel"><h4>Handover</h4><div class="muted" style="font-size:.9rem">' + gl(b.handoff) + "</div></div>" +
      '<div class="panel"><h4>Results</h4><div class="labs" id="labs"></div></div></div><div>';
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
      Object.keys(ACTIONS).forEach(function (id) {
        if (ACTIONS[id].g !== g[1]) return;
        h += '<button class="act" data-act="' + id + '" data-tip="' + esc(GL.ACTION_INFO[id] || "") + '">' +
             '<span class="t">' + ACTIONS[id].t + '</span><span class="c">' + ACTIONS[id].cost + " min</span>" +
             '<span class="qmark">?</span></button>';
      });
      h += "</div></div>";
    });
    $("stage").innerHTML = h + "</div></div>";
    $("btnBack").onclick = backToWard;

    Array.prototype.forEach.call($("stage").querySelectorAll(".act"), function (n) {
      n.onclick = function () { G.doAction(b, n.getAttribute("data-act")); };
    });
    Array.prototype.forEach.call($("stage").querySelectorAll("#segMode button"), function (n) {
      n.onclick = function () {
        var m = n.getAttribute("data-mode");
        if (m === "VENT" && b.support.mode !== "VENT") { G.doAction(b, "intubate"); renderBed(); return; }
        if (b.support.mode === "VENT" && m !== "VENT") { G.doAction(b, "extubate"); b.support.mode = m; renderBed(); return; }
        b.support.mode = m; if (m === "RA") b.support.fio2 = 0.21;
        log(b.name + " changed to " + supportLabel(b)); G.advance(5); renderBed();
      };
    });
    Array.prototype.forEach.call($("stage").querySelectorAll("#segDex button"), function (n) {
      n.onclick = function () { b.h.dexPct = +n.getAttribute("data-dex"); renderBed(); };
    });
    function slider(id, vid, fmt, set, done) {
      var r = $(id); if (!r) return;
      r.oninput = function () {
        var out = $(vid);
        out.innerHTML = fmt(+r.value);
        attachTips(out);                 // the readout was rebuilt; make it hoverable again
        set(+r.value); updateBedLive();
      };
      r.onchange = function () { if (done) done(+r.value); };
    }
    var f0 = s.fio2, p0 = s.pip;
    slider("rFio2", "vFio2", function (v) { return v + "%"; }, function (v) { b.support.fio2 = v / 100; },
      function (v) { var nf = v / 100; if (nf < f0 - 0.005) { G.noteChange(b, "__fio2down"); watchO2(b); }
                     else if (nf > f0 + 0.005) { G.noteChange(b, "__fio2up"); watchO2(b); } f0 = nf; });
    slider("rCpap", "vCpap", function (v) { return v + " " + GL.term("cmH2O", "cmH2O"); }, function (v) { b.support.cpap = v; });
    slider("rPip", "vPip", String, function (v) { b.support.pip = v; },
      function (v) { if (v < p0) G.noteChange(b, "__pipdown"); else if (v > p0) G.noteChange(b, "__pipup"); p0 = v; });
    slider("rPeep", "vPeep", String, function (v) { b.support.peep = v; });
    slider("rRate", "vRate", String, function (v) { b.support.rate = v; });
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
    attachTips($("stage"));
  }

  function ctl(label, id, min, max, step, val, txt, term) {
    return '<div class="ctl-row"><label>' + (term ? '<abbr class="gl" data-term="' + term + '">' + label + "</abbr>" : label) +
      '</label><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step +
      '" value="' + val + '"><span class="rv" id="v' + id.slice(1) + '">' + txt + "</span></div>";
  }

  function recentlyResolvedFor(b) {
    var best = null;
    G.concerns.forEach(function (c) {
      if (c.bed !== b.bed || !c.done || c.missed) return;
      var at = c.resolvedAt != null ? c.resolvedAt : c.declinedAt;
      if (at == null || G.min - at > 20) return;
      if (!best || at > (best.resolvedAt != null ? best.resolvedAt : best.declinedAt)) best = c;
    });
    return best;
  }

  function renderBedCallout(b) {
    var box = $("callout"); if (!box) return;
    var c = openConcernFor(b);
    if (!c) {
      // show the outcome briefly, so doing the right thing visibly lands
      var done = recentlyResolvedFor(b);
      if (!done) { box.innerHTML = ""; return; }
      var dch = EV.CHARS[done.who];
      var last = (done.replies || [])[done.replies.length - 1];
      box.innerHTML = '<div class="callout resolved"><div class="co-av">' + A.avatar(dch.av) +
        "</div><div class='co-body'><div class='co-who'>" + esc(dch.name) +
        ' <span class="co-settled">settled</span></div>' +
        (last ? '<div class="co-reply ' + (last.good === true ? "good" : last.good === false ? "bad" : "neutral") +
                '">' + gl(last.text) + "</div>" : "") + "</div></div>";
      attachTips(box);
      return;
    }
    var ch = EV.CHARS[c.who];
    var html = '<div class="callout ' + c.def.severity + '"><div class="co-av">' + A.avatar(ch.av) + "</div><div class='co-body'>" +
      "<div class='co-who'>" + esc(ch.name) + (c.escalated ? ' <span class="co-again">asking again</span>' : "") + "</div>" +
      "<div class='co-say'>" + gl(c.def.say(G, b)) + "</div>";
    if (G.nudges && c.def.nudge) html += '<div class="nudge">🤔 ' + gl(c.def.nudge) + "</div>";
    (c.replies || []).forEach(function (r) {
      var cls = r.good === true ? "good" : r.good === false ? "bad" : "neutral";
      html += '<div class="co-reply ' + cls + '">' + gl(r.text) + "</div>";
    });
    if (!c.replies) html += '<div class="co-hintline">Use the controls below and ' + esc(ch.name.split(",")[0]) +
      " will tell you what they think. If you disagree, you can say so.</div>";
    html += '<div class="co-actions"><button type="button" class="btn ghost small" id="declineConcern">' +
            "Not now &mdash; I am not going to do that</button></div>";
    html += "</div></div>";
    box.innerHTML = html;
    var dec = document.getElementById("declineConcern");
    if (dec) dec.onclick = function () { declineConcern(b); };
    attachTips(box);
  }

  function renderBedPeople(b) {
    var box = $("people"); if (!box) return;
    var out = [];
    G.talks.filter(function (t) { return t.bed === b.bed; }).forEach(function (t) {
      var isP = t.def.who === "parent";
      var nm = isP ? b.parentName : EV.CHARS[t.who].name.split(",")[0];
      var av = isP ? b.parentAvatar : EV.CHARS[t.who].av;
      out.push('<button class="person-btn wants" data-talk="' + t.id + '">' + A.miniAvatar(av) +
        "<span><b>" + esc(nm) + "</b> " + esc(t.def.badge) + "</span><span class='pb-go'>Talk &rarr;</span></button>");
    });
    if (G.parentPresent(b) && !G.talks.some(function (t) { return t.bed === b.bed && t.def.who === "parent"; })) {
      out.push('<div class="person-btn quiet">' + A.miniAvatar(b.parentAvatar) +
        "<span><b>" + esc(b.parentName) + "</b> is at the bedside</span></div>");
    }
    box.innerHTML = out.length ? '<div class="people-row">' + out.join("") + "</div>" : "";
    Array.prototype.forEach.call(box.querySelectorAll("[data-talk]"), function (n) {
      n.onclick = function () {
        var t = G.talks.filter(function (x) { return x.id === n.getAttribute("data-talk") && x.bed === b.bed; })[0];
        if (t) startTalk(t);
      };
    });
  }

  function updateBedLive() {
    if (G.view.mode !== "bed") return;
    var b = G.babies[G.view.bed];
    if (!b || !$("monitor")) return;
    var look = S.appearance(b);
    $("crib").innerHTML = A.isolette(look, { photo: b.h.photo, iso: b.support.isoTemp.toFixed(1),
      humidity: b.support.humidity, open: b.support.isoOpen }) + '<div class="look">' + describeLook(b, look) + "</div>";
    var m = b.mon;
    $("monitor").innerHTML = [
      ["hr", A.trace({ rate: m.hr }, "#5ef2a0", "ecg"), GL.tip(m.hr, hrTip(b)), GL.term("bpm", "bpm"), m.hr < 100 || m.hr > 190],
      ["spo2", A.trace(b.hist.spo2, "#6cb6ff"), GL.tip(m.spo2, satTip(b)), GL.term("% SpO2", "SpO2"), m.spo2 < 89 || (m.spo2 > 96 && b.support.fio2 > 0.21)],
      ["rr", A.trace({ rate: m.rr }, "#ffc857", "resp"), GL.tip(m.rr, rrTip(b)), GL.term("breaths", "breaths"), m.rr === 0],
      ["bp", A.trace(b.hist.map, "#ff6b6b"),
        GL.tip(m.sys + "/" + m.dia + " (" + m.map + ")",
          "Blood pressure. The first number is the peak push as the heart squeezes, the second is the low point " +
          "between beats, and the number in brackets is the average, called the mean. For a preemie the mean " +
          "should be at least about " + b.ga + "."),
        GL.term("mmHg", "mmHg"), m.map < b.ga],
      ["temp", "", GL.tip(m.temp.toFixed(1), tempTip(b)), GL.tip("\u00B0C", GL.TERMS["T"]), m.temp < 36.3 || m.temp > 37.6]
    ].map(function (r) {
      return '<div class="mon-row ' + r[0] + '"><div class="mon-trace">' + r[1] + "</div><div class=\"mon-num\">" +
        '<span class="n' + (r[4] ? " bad" : "") + '">' + r[2] + '</span><span class="u">' + r[3] + "</span></div></div>";
    }).join("");
    var gir = ((b.h.dexPct * b.h.ivRate) / 144).toFixed(1);
    if ($("girLine")) $("girLine").innerHTML = '<abbr class="gl" data-term="GIR">Glucose infusion rate</abbr> = (' +
      b.h.dexPct + "% &times; " + b.h.ivRate + " mL/kg/day) &divide; 144 = <b>" + gir + " mg/kg/min</b>";
    var L = b.labs, out = "";
    if (b.findings) {
      out += '<div class="lrow"><span>Examination at ' + clockStr(b.examinedAt) + "</span><span></span></div>";
      b.findings.forEach(function (f) {
        out += '<div class="lrow"><span>' + f.k + '</span><span class="' + (f.bad ? "abn" : f.artifact ? "crit" : "") + '">' + gl(f.v) + "</span></div>";
      });
    }
    ["glucose", "gas", "cbc", "bili", "cxr", "axr", "hus", "echo", "culture"].forEach(function (k) {
      if (L[k]) out += '<div class="lrow"><span>' + testLabel(k) + '</span><span class="' + (L[k].crit ? "crit" : "") + '">' + gl(L[k].v) + "</span></div>";
    });
    b.pending.forEach(function (p) {
      out += '<div class="lrow"><span>' + testLabel(p.chest ? "cxr" : p.kind) + '</span><span class="pending">back at ' + clockStr(p.due) + "</span></div>";
    });
    if (!out) out = '<div class="muted">Nothing sent yet. Examining the baby costs five minutes and is usually more use than a test.</div>';
    $("labs").innerHTML = out;
    renderBedCallout(b);
    renderBedPeople(b);
    attachTips($("monitor"));
    attachTips($("girLine"));
    attachTips($("crib"));
    Array.prototype.forEach.call($("stage").querySelectorAll(".act"), function (n) {
      var id = n.getAttribute("data-act");
      if (id === "surfactant") n.disabled = b.support.mode !== "VENT";
      if (id === "intubate") n.disabled = b.support.mode === "VENT";
      if (id === "extubate") n.disabled = b.support.mode !== "VENT";
      if (id === "kangaroo") n.disabled = !G.parentPresent(b);
      if (id === "photo") n.classList.toggle("on", !!b.h.photo);
      if (id === "caffeine") n.classList.toggle("on", !!b.h.caffeine);
      if (id === "abx") n.classList.toggle("on", !!b.h.abx);
      if (id === "needle") n.classList.toggle("urgent", b.h.ptx && b.mon.spo2 < 85);
    });
    attachTips($("labs"));
  }

  var TEST_LABEL = {
    glucose: ["Blood sugar", "A heel-prick sugar level. Below about 45 is low, and a very low sugar can hurt a newborn's brain."],
    gas:     ["Blood gas", "A few drops of blood measured for acid (pH), carbon dioxide, and how much acid has built up. It tells you whether the baby is breathing well enough and getting enough blood flow."],
    cbc:     ["Blood count", "White cells, which rise or fall with infection, and haemoglobin, which shows anaemia."],
    bili:    ["Bilirubin", "The yellow chemical that causes jaundice. It is judged against a threshold for the baby's age in hours."],
    cxr:     ["Chest X-ray", "A picture of the lungs. Shows stiff lungs, a collapsed lung, an air leak, and whether a breathing tube sits in the right place."],
    axr:     ["Belly X-ray", "A picture of the bowel. Gas in the wall of the bowel means necrotising enterocolitis."],
    hus:     ["Head ultrasound", "A sound picture of the brain, taken through the soft spot on the head. No radiation. This is how brain bleeds are found."],
    echo:    ["Heart echo", "A sound picture of the beating heart. It shows whether the ductus is still open and whether it matters."],
    culture: ["Blood culture", "Blood kept warm to see whether bacteria grow in it. It takes hours to days, so antibiotics usually start before the answer arrives."]
  };
  function testLabel(k) {
    var t = TEST_LABEL[k];
    return t ? GL.tip(t[0], t[1]) : cap(k);
  }

  function describeLook(b, look) {
    var s = [({ pink: "Pink and well perfused", pale: "Pale", dusky: "Dusky", mottled: "Mottled and grey" })[look.color]];
    if (look.jaundice > 0.3) s.push("visibly jaundiced");
    if (b.h.apneaNow) s.push("not breathing right now");
    else if (look.effort > 0.55) s.push("working hard to breathe");
    else if (look.effort > 0.3) s.push("mild retractions");
    else s.push("breathing comfortably");
    if (b.h.kangaroo) s.push("skin to skin with " + b.parentName);
    else s.push(look.awake ? "awake" : "asleep in a nest");
    return s.join(" &middot; ");
  }

  // ---------------------------------------------------------------- side bar
  function renderSide() {
    var h = "<h3>Who needs you</h3>";
    var rows = [];
    G.concerns.filter(function (c) { return !c.done; }).forEach(function (c) {
      var b = byBed(c.bed); if (!b) return;
      rows.push('<button class="task ' + (c.def.severity === "urgent" ? "red" : c.def.severity === "worry" ? "amber" : "blue") +
        '" data-go="' + G.babies.indexOf(b) + '">' + A.miniAvatar(EV.CHARS[c.who].av) +
        '<span><span class="tt">' + esc(EV.CHARS[c.who].name.split(",")[0]) + " at bed " + c.bed + "</span>" +
        '<span class="ts">' + esc(cap(c.def.summary(G, b))) + (c.escalated ? " &middot; asking again" : "") + "</span></span></button>");
    });
    G.talks.forEach(function (t) {
      var b = t.bed ? byBed(t.bed) : null;
      var isP = t.def.who === "parent";
      var nm = isP ? (b ? b.parentName : "A parent") : EV.CHARS[t.who].name.split(",")[0];
      var av = isP ? (b ? b.parentAvatar : "parent1") : EV.CHARS[t.who].av;
      rows.push('<button class="task green" data-talk="' + t.id + '" data-bed="' + (t.bed == null ? "" : t.bed) + '">' +
        A.miniAvatar(av) + '<span><span class="tt">' + esc(nm) + "</span>" +
        '<span class="ts">' + esc(t.def.badge) + (b ? " &middot; bed " + b.bed : "") + "</span></span></button>");
    });
    G.babies.forEach(function (b, i) {
      if (b.died || b.discharged) return;
      if (b.alarm.level !== "none") {
        rows.push('<button class="task ' + (b.alarm.level === "red" ? "red" : "amber") + '" data-go="' + i + '">' +
          '<span class="task-icon">' + (b.alarm.level === "red" ? "🔴" : "🟠") + "</span>" +
          '<span><span class="tt">Bed ' + b.bed + " &middot; " + esc(b.name) + '</span><span class="ts">' +
          esc(b.alarm.reasons.join(", ")) + "</span></span></button>");
      }
    });
    h += rows.length ? rows.join("") :
      '<div class="muted" style="font-size:.88rem">Nobody is waiting on you. A good moment to examine a baby, or to sit with a family.</div>';

    h += "<h3>The team</h3><div class='team'>";
    ["renata", "desmond", "priya", "tomas"].forEach(function (k) {
      var wants = G.concerns.some(function (c) { return !c.done && c.who === k; }) ||
                  G.talks.some(function (t) { return t.who === k; });
      h += '<div class="tm' + (wants ? " wants" : "") + '" title="' + esc(EV.CHARS[k].role) + '">' +
        A.miniAvatar(EV.CHARS[k].av) + "<span>" + esc(EV.CHARS[k].name.split(",")[0]) + "</span>" +
        (wants ? '<span class="dot"></span>' : "") + "</div>";
    });
    h += "</div>";

    h += "<h3>Shift log</h3><div class='log'>";
    G.logLines.slice(0, 24).forEach(function (e) {
      h += '<div class="le ' + e.k + '"><span class="lt">' + e.t + '</span><span class="lm">' + gl(e.m) + "</span></div>";
    });
    $("side").innerHTML = h + "</div>";
    Array.prototype.forEach.call($("side").querySelectorAll("[data-go]"), function (n) {
      n.onclick = function () { openBed(+n.getAttribute("data-go")); };
    });
    Array.prototype.forEach.call($("side").querySelectorAll("[data-talk]"), function (n) {
      n.onclick = function () {
        var bed = n.getAttribute("data-bed");
        var t = G.talks.filter(function (x) { return x.id === n.getAttribute("data-talk") && String(x.bed == null ? "" : x.bed) === bed; })[0];
        if (t) startTalk(t);
      };
    });
    attachTips($("side"));
  }

  // ---------------------------------------------------------------- tooltips
  var tipEl = null;
  function attachTips(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-tip],abbr.gl,[data-term]"), function (n) {
      if (n.__tipped) return; n.__tipped = true;
      var get = function () {
        return n.getAttribute("data-tip") || GL.lookup(n.getAttribute("data-term") || n.textContent) || "";
      };
      var show = function (e) {
        var txt = get(); if (!txt) return;
        if (!tipEl) { tipEl = el("div", "tip-pop"); document.body.appendChild(tipEl); }
        tipEl.textContent = txt; tipEl.style.display = "block";
        var r = n.getBoundingClientRect();
        var top = r.bottom + window.scrollY + 8;
        var left = Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - tipEl.offsetWidth - 14);
        tipEl.style.left = Math.max(8, left) + "px"; tipEl.style.top = top + "px";
      };
      var hide = function () { if (tipEl) tipEl.style.display = "none"; };
      n.addEventListener("mouseenter", show);
      n.addEventListener("mouseleave", hide);
      n.addEventListener("focus", show);
      n.addEventListener("blur", hide);
      n.addEventListener("click", function (e) {
        if (n.classList.contains("gl") || n.classList.contains("qmark")) { e.stopPropagation(); show(e); }
      });
    });
  }

  // ------------------------------------------------------------------ report
  function endShift() {
    G.running = false; clearTimeout(G.timer);
    var ev = evaluateShift();
    var died = ev.died, pct = ev.pct, grade = ev.grade;

    var h = '<div class="report-wrap"><div class="muted mono">07:00 &middot; handover to the day team</div>' +
      '<div class="grade grade-' + (pct >= 76 ? "good" : pct >= 46 ? "mid" : "poor") + '">' + grade + "</div>" +
      '<p class="verdict">' + esc(verdictLine(ev)) + "</p>" +
      '<p class="muted" style="font-size:1.02rem">Twelve hours. ' + G.babies.filter(function (b) { return !b.died; }).length +
      " babies handed over" + (died.length ? ", and one who did not make it." : ".") + "</p>";

    died.forEach(function (b) {
      h += '<div class="card" style="border-color:#7d2a3a"><h3 style="color:#ff9d9d">' + esc(displayName(b)) +
        " died at " + clockStr(b.diedAt) + "</h3><p>" + esc(b.name) + " spent " + Math.round(b.h.criticalMinutes) +
        " minutes in a critical state during your shift. The team will hold a debrief later today, because that is " +
        "what good units do after a death.</p><div class=\"truth\" style=\"background:#241820\"><b>What was really happening:</b> " +
        esc(b.name) + " " + gl(b.puzzle.truth) + "<br><br><b>What would have changed it:</b> " + gl(b.puzzle.key) + "</div></div>";
    });

    h += '<div class="card"><h3>How the night went</h3>' +
      '<p class="muted" style="font-size:.9rem">Each part is judged against what the night actually asked of you. ' +
      "Anything that never came up is left out rather than counted in your favour.</p>";
    ev.domains.forEach(function (x) {
      var bd = band(x.v);
      h += '<div class="domain ' + bd.cls + '"><div class="dom-head"><span class="dom-name">' + esc(x.label) +
        '</span><span class="dom-rating">' + bd.word + '</span></div>' +
        '<div class="dom-bar"><i style="width:' + Math.round(x.v * 100) + '%"></i></div>' +
        '<div class="dom-detail">' + esc(x.detail) + "</div>" +
        (x.v < 0.62 ? '<div class="dom-short">' + esc(x.shortfall) + "</div>" : "") + "</div>";
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
      "</div></div>";

    if (ev.concerns.unhandled.length) {
      h += '<div class="card" style="border-color:#6b551b"><h3 style="color:var(--amber)">What nobody came to</h3>' +
        "<p class=\"muted\" style=\"font-size:.92rem\">These were raised during the night and never dealt with.</p><ul class=\"plain\">";
      ev.concerns.unhandled.slice(0, 8).forEach(function (u) {
        var b = byBed(u.bed);
        h += "<li><b>Bed " + u.bed + (b ? ", " + esc(b.name) : "") + "</b> &mdash; " +
             esc(EV.CHARS[u.who].name.split(",")[0]) + " raised " + esc(u.what.summary(G, b || G.babies[0])) + "</li>";
      });
      h += "</ul></div>";
    }

    h += '<div class="card"><h3>Bed by bed, and what was actually going on</h3>';
    G.babies.forEach(function (b) {
      var st = statusOf(b);
      h += '<div class="outcome ' + st.cls + '"><h4>' + esc(displayName(b)) + " &middot; bed " + b.bed +
        ' <span class="muted" style="font-weight:400">' + st.label + '</span></h4><div class="muted" style="font-size:.92rem">' +
        st.detail + '</div><div class="truth"><b>What was really happening:</b> ' + esc(b.name) + " " + gl(b.puzzle.truth) +
        "<br><br><b>The lesson:</b> " + gl(b.puzzle.key) + "</div></div>";
    });
    h += "</div>";

    var goods = G.scoreItems.filter(function (s) { return s.n > 0; }).sort(function (a, c) { return c.n - a.n; }).slice(0, 6);
    var bads = G.scoreItems.filter(function (s) { return s.n < 0; }).sort(function (a, c) { return a.n - c.n; }).slice(0, 6);
    h += '<div class="card"><h3>Decisions that mattered</h3>';
    if (goods.length) { h += "<p><b>Well judged</b></p><ul class='plain'>"; goods.forEach(function (s) { h += "<li>" + s.t + " &mdash; " + esc(s.why) + "</li>"; }); h += "</ul>"; }
    if (bads.length) { h += "<p style='margin-top:10px'><b>Worth revisiting</b></p><ul class='plain'>"; bads.forEach(function (s) { h += "<li>" + s.t + " &mdash; " + esc(s.why) + "</li>"; }); h += "</ul>"; }
    if (!goods.length && !bads.length) h += '<p class="muted">A quiet night with few decision points.</p>';
    h += "</div>";

    h += '<div class="card"><h3>What to try next shift</h3>' + tips(ev).map(function (t) {
      return '<div class="tip"><span class="ti">&rsaquo;</span><span>' + gl(t) + "</span></div>";
    }).join("") + "</div>";
    h += '<div class="opt-row"><button class="btn" id="again">Another shift</button>' +
      '<a class="btn ghost" href="index.html">Back to the title</a></div></div>';
    document.body.innerHTML = h;
    $("again").onclick = function () { location.href = "index.html"; };
    attachTips(document.body);
    saveBest(pct, grade);
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
      var k = keys[c.key] || (keys[c.key] = { handled: false, who: c.who, what: c.def, bed: c.bed });
      var settled = c.done && !c.missed && (c.resolvedAt != null ||
                     (c.declinedAt != null && c.def.decline && c.def.decline.resolve));
      if (settled) k.handled = true;
    });
    var ks = Object.keys(keys);
    var handled = ks.filter(function (k) { return keys[k].handled; });
    return { total: ks.length, handled: handled.length,
             unhandled: ks.filter(function (k) { return !keys[k].handled; }).map(function (k) { return keys[k]; }) };
  }

  function evaluateShift() {
    var d = [], m = G.metrics;

    // 1. did you go when your colleagues asked for you?
    var ct = concernTally();
    if (ct.total > 0) {
      d.push({ key: "response", w: 0.30, v: ct.handled / ct.total,
               label: "Answering your team",
               detail: ct.handled + " of " + ct.total + " concerns your colleagues raised were dealt with",
               shortfall: "Your team asked you to come to a bedside " + ct.total + " times and " +
                          (ct.total - ct.handled) + " of those went unanswered. When a nurse asks you to look at a baby, " +
                          "they have usually already noticed something real." });
    }

    // 2. when you did decide, were the decisions good ones?
    var good = 0, bad = 0;
    G.scoreItems.forEach(function (x) { if (x.n > 0) good += x.n; else bad += -x.n; });
    if (good + bad > 0) {
      d.push({ key: "judgement", w: 0.25, v: good / (good + bad),
               label: "Clinical judgement",
               detail: good + " points of good calls against " + bad + " of poor ones",
               shortfall: "A lot of the decisions you made worked against the babies rather than for them. " +
                          "The list below shows which ones." });
    }

    // 3. gentleness — only judged on the things you actually did
    var o2 = 0, press = 0, ventUsed = false, oxyUsed = false, painful = 0, comfort = 0;
    G.babies.forEach(function (b) {
      o2 += b.h.o2Exposure; press += b.h.volutrauma;
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
      d.push({ key: "gentle", w: 0.18, v: gv,
               label: "Gentle care",
               detail: "oxygen " + (o2 < 60 ? "well controlled" : o2 < 220 ? "over target at times" : "left high") +
                       ", " + m.draws + " blood draws" + (ventUsed ? ", ventilator " + (press < 1 ? "gentle" : "firm") : ""),
               shortfall: "Oxygen above target, high ventilator pressures and repeated blood draws all cost a " +
                          "premature baby something, even when the numbers on the monitor look fine at the time." });
    }

    // 4. the families
    var fparts = [Math.max(0, Math.min(1, (G.trust - 20) / 60))];
    if (m.talksOffered > 0) fparts.push(Math.min(1, m.talksHad / m.talksOffered));
    var fv = fparts.reduce(function (a, b2) { return a + b2; }, 0) / fparts.length;
    d.push({ key: "family", w: 0.17, v: fv,
             label: "The families",
             detail: "trust " + Math.round(Math.max(0, Math.min(100, G.trust))) + "%" +
                     (m.talksOffered ? ", " + m.talksHad + " of " + m.talksOffered + " conversations taken" : ""),
             shortfall: "Families are part of the care, not an interruption to it. People wanted to talk to you " +
                        "and mostly did not get the chance." });

    // 5. safety
    var sv = 1;
    if (m.overrides) sv -= 0.5 * m.overrides;
    G.babies.forEach(function (b) {
      if (b.labs.culture && b.labs.culture.crit && !b.h.abx) sv -= 0.3;
      if (b.h.criticalMinutes > 120) sv -= 0.2;
    });
    sv = Math.max(0, Math.min(1, sv));
    d.push({ key: "safety", w: 0.10, v: sv,
             label: "Keeping them safe",
             detail: m.overrides ? "a pharmacy dose query was overridden"
                   : G.babies.some(function (b) { return b.h.criticalMinutes > 120; })
                   ? "a baby spent hours in a critical state" : "no safety flags",
             shortfall: "Babies spent long stretches in a critical state, or a safety check was overruled." });

    // weights re-normalised across only the domains that applied
    var tw = d.reduce(function (a, x) { return a + x.w; }, 0);
    var pct = Math.round(d.reduce(function (a, x) { return a + x.v * x.w; }, 0) / tw * 100);

    // the weakest important domain caps the headline: no praising a holed shift
    var died = G.babies.filter(function (b) { return b.died; });
    var weak = d.filter(function (x) { return x.w >= 0.15 && x.v < 0.35; });
    var awful = d.filter(function (x) { return x.w >= 0.15 && x.v < 0.20; });
    if (weak.length) pct = Math.min(pct, 55);
    if (awful.length) pct = Math.min(pct, 40);
    if (died.length) pct = Math.min(pct, 28);
    pct = Math.max(0, Math.min(100, pct));

    var grade = died.length ? "A hard night"
      : pct >= 88 ? "Outstanding" : pct >= 76 ? "Strong shift" : pct >= 62 ? "Solid"
      : pct >= 46 ? "Rocky" : pct >= 30 ? "Difficult night" : "A rough night";

    d.sort(function (a, b2) { return a.v - b2.v; });
    return { domains: d, pct: pct, grade: grade, died: died, concerns: ct,
             weakest: d[0], failing: d.filter(function (x) { return x.v < 0.62; }) };
  }

  /* One honest sentence under the headline, naming the real problem. */
  function verdictLine(ev) {
    if (ev.died.length) return "A baby died during your shift. Everything else is secondary to that.";
    if (!ev.failing.length) return "Nothing to pick at. The unit was in good hands all night.";
    var w = ev.weakest;
    if (w.key === "response")
      return "You answered " + ev.concerns.handled + " of the " + ev.concerns.total +
             " things your team brought you. That is the single biggest thing to change.";
    if (w.key === "judgement") return "Several decisions went the wrong way tonight.";
    if (w.key === "gentle") return "The babies got through the night, but not gently.";
    if (w.key === "family") return "The medicine held together. The families were left out of it.";
    return "There were safety problems tonight that should not happen twice.";
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
      t.push("You never called the attending. Asking for help early is a senior skill, not a junior one.");
    if (!t.length)
      t.push("A genuinely well-run shift, with nothing left hanging. Try the next difficulty up, or a new seed for a different set of problems.");
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

  // ---------------------------------------------------------------- handover
  function handoverScreen() {
    G.view = { mode: "handover", bed: null };
    var h = '<div class="handover"><p class="kicker">19:00 &middot; handover from the day team</p>' +
      "<h1>Your unit tonight</h1>" +
      '<p class="lede">Renata and Desmond take you round the beds. Read each one; the clues that matter tonight ' +
      "are often already in the handover. Nothing is running yet, so take your time.</p>";
    G.babies.forEach(function (b) {
      h += '<div class="ho-card"><div class="ho-baby">' + A.baby(S.appearance(b)) + "</div><div class='ho-txt'>" +
        "<div class='ho-head'><span class='ho-name'>" + esc(displayName(b)) + "</span>" +
        "<span class='bed-no'>bed " + b.bed + "</span></div>" +
        "<div class='ho-meta'>" + metaHtml(b) + " &middot; " + supportHtml(b) + "</div>" +
        "<p>" + gl(b.handoff) + "</p>" +
        "<div class='ho-vitals'>" + vitalsHtml(b) + "</div>" +
        "<div class='ho-fam muted'>Family: " + esc(b.parents) + "</div></div></div>";
    });
    h += '<div class="ho-foot"><p class="muted">Anything underlined, like ' + gl("CPAP") + " or " + gl("SpO2") +
      ", can be hovered or tapped for a plain-language explanation. That works everywhere in the game.</p>" +
      '<button class="btn" id="startShift">I have the unit. Start the shift.</button></div></div>';
    $("stage").innerHTML = h;
    $("side").innerHTML = "<h3>Shift log</h3><div class='muted' style='font-size:.88rem'>The night has not started yet.</div>";
    attachTips($("stage"));
    $("startShift").onclick = function () {
      Snd.unlock(); Snd.ok();
      G.view = { mode: "ward", bed: null };
      G.paused = false;
      log("Shift started", "hi");
      render();
    };
  }

  // ------------------------------------------------------------------- start
  G.start = function (opts) {
    G.difficulty = opts.difficulty;
    G.hints = opts.hints;
    G.nudges = opts.difficulty !== "attending" && opts.hints;
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
    tick();
  };

  window.addEventListener("DOMContentLoaded", function () {
    if (!$("stage")) return;
    $("btnPause").onclick = function () { G.paused = !G.paused; Snd.unlock(); renderTop(); };
    ["1", "2", "4"].forEach(function (s) { $("sp" + s).onclick = function () { G.speed = +s; renderTop(); }; });
    $("btnPhone").onclick = function () { Snd.unlock(); if (G.call) G.answerPhone(); };
    $("btnSound").onclick = function () {
      Snd.setOn(!Snd.isOn());
      $("btnSound").textContent = Snd.isOn() ? "🔊" : "🔇";
      if (Snd.isOn()) Snd.ok();
    };
    $("btnEnd").onclick = function () { if (confirm("End the shift now and see the report?")) { G.min = SHIFT_LEN; endShift(); } };
    document.addEventListener("keydown", function (e) {
      if (G.dialogOpen) return;
      if (e.key === " ") { e.preventDefault(); G.paused = !G.paused; renderTop(); }
      if (e.key === "Escape" && G.view.mode === "bed") backToWard();
      if (e.key >= "1" && e.key <= "6") { var i = +e.key - 1; if (G.babies[i]) openBed(i); }
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
  });
})();
