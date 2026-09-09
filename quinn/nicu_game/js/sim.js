/* NICU Night Shift — physiology engine.
   The player never sees this state. They see monitors, exams and labs, which are
   derived from it (with noise and artifact). Everything they do writes back here. */
(function () {
  "use strict";

  var TICK = 5;                       // minutes of game time per tick
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function c01(v) { return clamp(v, 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // seeded RNG so a shift can be replayed / shared
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rng = mulberry32(1);
  function seed(s) { rng = mulberry32(s); }
  function rnd() { return rng(); }
  function rrange(a, b) { return a + rng() * (b - a); }
  function pick(arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
  function chance(p) { return rng() < p; }
  function noise(scale) { return (rng() + rng() + rng() - 1.5) * scale; }   // ~gaussian

  // ======================================================================
  //  DERIVED PHYSIOLOGY
  // ======================================================================

  // How well the lungs work right now: 0 (solid) .. 1 (perfect)
  function lungFunction(b) {
    var h = b.h, sup = b.support;
    var peep = 0;
    if (sup.mode === "CPAP") peep = sup.cpap * 0.026;
    else if (sup.mode === "VENT") peep = sup.peep * 0.030;
    else if (sup.mode === "NC") peep = 0.015;
    var vent = 0;
    if (sup.mode === "VENT") vent = clamp((sup.pip - sup.peep) * 0.017 * (sup.rate / 40), 0, 0.30);
    var lf = 0.10 + 0.80 * h.surfactant - 0.085 * h.rds + peep + vent
           - 0.42 * h.secretions - (h.ptx ? 0.34 : 0) - 0.16 * h.sepsis
           - 0.15 * h.pda - 0.30 * h.aspiration - (h.ettDisplaced ? 0.42 : 0);
    if (h.necGrade > 1) lf -= 0.08;               // distended belly splints the diaphragm
    return c01(lf);
  }

  // SpO2 from oxygen supply, saturating curve tuned to real-ish values
  function satFrom(b, lf) {
    var supply = b.support.fio2 * lf;
    var s = 100 * (1 - 0.5 * Math.exp(-14.3 * supply));
    if (b.h.apneaNow) s -= 8 + 22 * b.h.apneaDepth;
    if (b.h.pphn) s -= 10 * b.h.pphn;
    return clamp(s, 30, 100);
  }

  // Minute ventilation vs demand -> CO2
  function co2Target(b) {
    var h = b.h, sup = b.support;
    var drive = h.spontDrive * (1 - 0.55 * h.fatigue) * (h.apneaNow ? 0.05 : 1);
    if (sup.mode === "VENT") drive *= 0.45;                        // machine takes over some work
    var machine = sup.mode === "VENT" ? clamp((sup.pip - sup.peep) * sup.rate * 0.0018, 0, 1.5) : 0;
    var mv = (drive + machine) * (0.55 + 0.45 * lungFunction(b));
    var demand = 1.0 + 0.25 * h.sepsis + 0.15 * (b.h.coreTemp > 37.6 ? 1 : 0);
    return clamp(42 + 46 * (1 - mv / demand), 22, 105);
  }

  function pHfrom(b) {
    var resp = -0.008 * (b.h.co2 - 40);
    var metab = -0.10 * b.h.baseDeficit / 6;
    return clamp(7.40 + resp + metab, 6.85, 7.65);
  }

  function perfusion(b) {
    var h = b.h;
    return c01(1 - 0.45 * h.hypovolemia - 0.65 * h.sepsis - 0.20 * h.pda
               - 0.25 * (h.coreTemp < 36.0 ? 1 : 0) + 0.18 * h.pressors);
  }

  function mapTarget(b) {
    var h = b.h;
    var base = b.ga + 4 + Math.min(10, b.dol * 0.5);
    return base * (0.45 + 0.55 * perfusion(b)) + h.pressors * 4.5;
  }

  function heartRate(b) {
    var h = b.h;
    var hr = 138 + (40 - b.pma) * 1.1;
    hr += 26 * h.pain + 24 * h.sepsis + 16 * h.hypovolemia + 10 * h.pda;
    hr += (h.coreTemp - 36.8) * 9;
    hr -= 12 * (1 - h.hgb / 15);
    if (h.apneaNow) hr -= 55 * h.apneaDepth;
    if (h.coreTemp < 35.8) hr -= 14;
    if (h.caffeine) hr += 6;
    return clamp(hr, 40, 220);
  }

  function respRate(b) {
    var h = b.h;
    if (b.support.mode === "VENT" && h.spontDrive < 0.5) return b.support.rate;
    var rr = 46 + 34 * (h.co2 - 45) / 25 + 26 * h.rds / 3 + 14 * h.sepsis - 10 * h.fatigue;
    if (h.apneaNow) rr = 0;
    if (b.support.mode === "VENT") rr = Math.max(rr, b.support.rate);
    return clamp(rr, 0, 110);
  }

  function workOfBreathing(b) {
    var lf = lungFunction(b), h = b.h;
    var w = (1 - lf) * 1.15 + 0.35 * h.rds / 3 - (b.support.mode === "VENT" ? 0.55 : 0)
          - (b.support.mode === "CPAP" ? 0.18 : 0) + 0.2 * h.necGrade / 3;
    if (h.apneaNow) w = 0;
    return c01(w);
  }

  // The visible baby: this is what "look at the baby" reveals.
  function appearance(b) {
    var h = b.h, p = perfusion(b);
    var s = (b.mon.trueSat != null) ? b.mon.trueSat : b.mon.spo2;
    var color = "pink";
    if (s < 80 || (s < 86 && p < 0.55)) color = "dusky";
    else if (p < 0.45 || h.sepsis > 0.55) color = "mottled";
    else if (p < 0.62 || h.hgb < 8.5) color = "pale";
    return {
      tone: b.tone,
      color: color,
      jaundice: c01((h.bili - 6) / 12),
      eyes: h.photo ? "shielded" : (h.pain > 0.45 || (h.awake && !h.apneaNow) ? "open" : "closed"),
      effort: workOfBreathing(b),
      support: b.support.mode,
      photo: h.photo,
      pain: h.pain,
      stress: c01(h.pain * 0.7 + h.sepsis * 0.3),
      swaddled: !!h.swaddled,
      hat: b.support.mode === "CPAP" ? "cpap" : (h.hat ? "warm" : null),
      probeOff: !!h.artifactProbe,
      uvc: !!h.uvc,
      feedTube: !!h.feedTube,
      awake: h.awake
    };
  }

  // ======================================================================
  //  SYSTEM UPDATES  (one tick = 5 minutes)
  // ======================================================================

  function stepThermal(b, dt) {
    var h = b.h, sup = b.support;
    var eq;
    if (sup.isoOpen) eq = 35.4 - 0.02 * (100 - sup.humidity);
    else if (sup.servo) eq = 36.9;
    else eq = 36.9 - (36.5 - (sup.isoTemp - 0.2)) * 0.9;
    eq -= 0.6 * h.sepsis * (chance(0.5) ? 1 : -1) * 0.5;          // temp instability with sepsis
    if (h.kangaroo) eq = 37.0;
    var k = sup.isoOpen ? 0.30 : 0.11;
    h.coreTemp += (eq - h.coreTemp) * k * (dt / TICK) + noise(0.02);
    h.coreTemp = clamp(h.coreTemp, 32, 40);
    if (h.coreTemp < 36.0) { h.coldMinutes += dt; h.glucoseDrain = 1.5; } else h.glucoseDrain = 1;
  }

  function stepRespiratory(b, dt) {
    var h = b.h, sup = b.support;

    // natural surfactant maturation + treatment effect
    if (h.surfTreatPending > 0) {
      var d = Math.min(h.surfTreatPending, dt / 45);
      h.surfactant = c01(h.surfactant + d * 0.55);
      h.surfTreatPending -= d;
    }
    h.surfactant = c01(h.surfactant + 0.00016 * dt);              // slowly gets better on its own
    h.rds = c01(h.rds * (1 - 0.00030 * dt));

    // secretions build on the vent; suctioning clears them
    if (sup.mode === "VENT") h.secretions = c01(h.secretions + 0.00035 * dt);
    else h.secretions = c01(h.secretions - 0.00020 * dt);

    // a scripted air leak (one of Theo's possible puzzles) declares itself mid-shift
    if (h.ptxPending > 0) {
      h.ptxPending -= dt;
      if (h.ptxPending <= 0 && !h.ptx) {
        h.ptx = true;
        b.flags.push({ t: "ptx", msg: b.name + " has suddenly desaturated and is not responding to oxygen" });
      }
    }

    // pressure injury: high PIP over time -> lung injury and pneumothorax risk
    if (sup.mode === "VENT") {
      var over = Math.max(0, sup.pip - (b.ga < 30 ? 20 : 24));
      h.bpd += over * 0.0016 * dt / TICK;
      h.volutrauma += over * 0.002 * dt / TICK;
      if (!h.ptx && over > 0 && chance(over * 0.0016 * (dt / TICK))) {
        h.ptx = true; h.ptxAt = b.world ? b.world.min : 0;
        b.flags.push({ t: "ptx", msg: b.name + " has developed a pneumothorax" });
      }
    }
    if (sup.mode === "CPAP" && sup.cpap > 8 && !h.ptx && chance((sup.cpap - 8) * 0.0011 * (dt / TICK))) {
      h.ptx = true; b.flags.push({ t: "ptx", msg: b.name + " has developed a pneumothorax" });
    }

    // oxygen exposure (retina/lung injury accumulator)
    if (sup.fio2 > 0.21 && b.mon.spo2 > 96) h.highSatMinutes = (h.highSatMinutes || 0) + dt;
    else h.highSatMinutes = 0;
    if (sup.fio2 > 0.21 && b.mon.spo2 > 95) h.o2Exposure += dt * (sup.fio2 - 0.21) * (b.mon.spo2 - 95) * 0.02;
    if (sup.fio2 > 0.6) h.o2Exposure += dt * 0.02;

    // gas exchange
    var lf = lungFunction(b);
    var tgt = co2Target(b);
    h.co2 += (tgt - h.co2) * 0.30 * (dt / TICK);
    // metabolic acidosis accumulates with poor perfusion / sepsis / hypoxia
    var lactateDrive = (1 - perfusion(b)) * 1.4 + (b.mon.spo2 < 80 ? 0.9 : 0) + h.necGrade * 0.5;
    h.baseDeficit += (lactateDrive * 6 - h.baseDeficit) * 0.06 * (dt / TICK);
    h.baseDeficit = clamp(h.baseDeficit, 0, 26);

    // fatigue: working hard for a long time wears a preemie out
    var wob = workOfBreathing(b);
    h.fatigue = c01(h.fatigue + (wob > 0.55 ? 0.0016 : -0.0012) * dt);
    h.spontDrive = c01(0.55 + 0.55 * (b.pma - 26) / 12 - 0.35 * h.sepsis
                       - 0.25 * (h.glucose < 45 ? 1 : 0) - 0.3 * (h.coreTemp < 36 ? 1 : 0)) + 0.35;
    if (h.caffeine) h.spontDrive += 0.22;
    if (h.morphine) h.spontDrive -= 0.35;
    h.spontDrive = clamp(h.spontDrive, 0.05, 1.6);
    return lf;
  }

  function stepApnea(b, dt) {
    var h = b.h, sup = b.support;
    if (h.apneaNow) {
      h.apneaLen += dt;
      h.apneaDepth = c01(h.apneaDepth + 0.28 * (dt / TICK));
      // resolution: self-resolving, or the nurse notices, or the player intervenes
      var selfRes = 0.30 + 0.35 * (h.caffeine ? 1 : 0);
      if (h.stimulated || chance(selfRes)) { endApnea(b); }
      else if (h.apneaLen >= 15) {
        h.severeSpells++;
        b.flags.push({ t: "apnea-severe", msg: b.name + " is not self-resolving" });
        endApnea(b);
      }
      return;
    }
    var base = h.apneaTend;
    var mult = 1;
    if (h.caffeine) mult *= 0.34;
    if (sup.mode === "CPAP") mult *= 0.68;
    if (sup.mode === "VENT") mult *= 0.10;
    mult *= 1 + 1.5 * h.sepsis + 0.7 * (h.glucose < 45 ? 1 : 0)
              + 0.6 * (h.coreTemp < 36.1 ? 1 : 0) + 0.6 * (1 - h.hgb / 15)
              + 0.8 * h.fatigue + (h.necGrade > 0 ? 0.5 : 0);
    if (h.morphine) mult *= 1.5;
    var p = base * mult * (dt / 60) * 0.9;
    if (chance(p)) {
      h.apneaNow = true; h.apneaLen = 0; h.apneaDepth = 0.25 + rnd() * 0.3;
      h.spells++; h.spellsThisHour++;
      b.flags.push({ t: "apnea", msg: b.name + " is having a spell" });
    }
  }
  function endApnea(b) {
    b.h.apneaNow = false; b.h.apneaLen = 0; b.h.apneaDepth = 0; b.h.stimulated = false;
  }

  function stepCardio(b, dt) {
    var h = b.h;
    // hypovolemia resolves with fluid, worsens with sepsis/losses
    h.hypovolemia = c01(h.hypovolemia + (0.00022 * h.sepsis - 0.00012) * dt);
    // PDA: may close on its own; medication helps a lot
    if (h.pdaTreat > 0) { h.pda = c01(h.pda - 0.0016 * dt); h.pdaTreat -= dt; }
    else if (b.pma > 30) h.pda = c01(h.pda - 0.00006 * dt);
    // pressors wear off if not maintained
    if (!h.pressorInfusion) h.pressors = Math.max(0, h.pressors - 0.02 * (dt / TICK));
    else h.pressors = h.pressorDose;

    var m = mapTarget(b);
    h.map += (m - h.map) * 0.4 * (dt / TICK) + noise(0.4);
    h.mapSwing = Math.max(h.mapSwing, Math.abs(m - h.map));
  }

  function stepMetabolic(b, dt) {
    var h = b.h;
    // GIR (mg/kg/min) = (%dextrose x mL/kg/day) / 144   — the real formula
    h.gir = (h.dexPct * h.ivRate) / 144;
    var supply = h.gir * 11 + h.feedsMlKgD * 0.28;
    var use = 4.5 * h.glucoseDrain + 3 * h.sepsis;
    var tgt = 28 + supply - use + (h.iugr ? -10 : 0) + (h.motherDiabetic && b.dol < 2 ? -14 : 0);
    if (h.d10bolus > 0) { tgt += 45; h.d10bolus -= dt; }
    h.glucose += (clamp(tgt, 12, 260) - h.glucose) * 0.35 * (dt / TICK) + noise(1.2);
    h.glucose = clamp(h.glucose, 8, 400);
    if (h.glucose < 40) h.hypoMinutes += dt;
    if (h.glucose < 25) { h.severeHypoMinutes += dt; }
  }

  function stepBili(b, dt) {
    var h = b.h;
    var prodPerDay = 0.45 + 2.4 * h.hemolysis + (b.ga < 34 ? 0.35 : 0);
    var clearPerDay = 0.20 + h.photo * (h.photo > 1 ? 1.5 : 1.05) + (h.feedsMlKgD / 160) * 0.4;
    h.bili += (prodPerDay - clearPerDay) * (dt / 1440);
    h.bili = clamp(h.bili, 0.4, 40);
    // threshold rises with age and gestation; below 35w it is much lower
    var thr = (b.ga >= 38 ? 15 : b.ga >= 35 ? 13 : 10) + Math.min(5, b.dol * 1.6);
    h.biliThreshold = thr;
    if (h.bili > thr + 5) h.biliDangerMinutes += dt;
  }

  function stepInfection(b, dt) {
    var h = b.h;
    if (h.sepsis > 0) {
      var rate = h.abx ? -0.00060 : 0.00075 * (1 + 1.4 * h.sepsis);
      h.sepsis = c01(h.sepsis + rate * dt);
      if (h.sepsis > 0.75) h.shockMinutes += dt;
    }
    if (h.sepsisLatent > 0 && !h.abx) {
      h.sepsisLatent -= dt;
      if (h.sepsisLatent <= 0) { h.sepsis = Math.max(h.sepsis, 0.12); }
    }
    if (h.abxMinutes >= 0 && h.abx) h.abxMinutes += dt;
    // white count and CRP drift with the infection
    h.wbc += ((h.sepsis > 0.4 ? (chance(0.5) ? 3.5 : 24) : 12) - h.wbc) * 0.02 * (dt / TICK);
    h.crp += ((h.sepsis * 60) - h.crp) * 0.012 * (dt / TICK);
  }

  function stepGut(b, dt) {
    var h = b.h;
    var stress = 0.5 * h.sepsis + 0.3 * (1 - perfusion(b)) + h.feedAdvanceStress;
    h.gutTol = c01(h.gutTol + (0.00035 - stress * 0.0011) * dt);
    h.feedAdvanceStress = Math.max(0, h.feedAdvanceStress - 0.0006 * dt);
    if (h.feedsMlKgD > 0 && h.gutTol < 0.35) h.residuals = c01(h.residuals + 0.0012 * dt);
    else h.residuals = c01(h.residuals - 0.0009 * dt);
    if (h.gutTol < 0.24 && h.feedsMlKgD > 0) {
      h.necRisk += 0.0022 * dt;
      if (h.necRisk > 1 && h.necGrade === 0) {
        h.necGrade = 1;
        b.flags.push({ t: "nec", msg: b.name + "'s belly is becoming distended" });
      }
    }
    if (h.necGrade > 0) {
      var worse = (h.feedsMlKgD > 0 ? 0.0011 : -0.0004) + (h.abx ? -0.0006 : 0.0004);
      h.necGrade = clamp(h.necGrade + worse * dt, 0, 3);
    }
  }

  function stepBrain(b, dt) {
    var h = b.h;
    if (b.pma > 32 || h.ivhGrade > 0) { h.ivhWindow = false; }
    if (!h.ivhWindow) return;
    var swing = Math.abs(h.map - mapTarget(b)) / 12;
    var phStress = Math.abs(pHfrom(b) - 7.35) * 5;
    var risk = (swing + phStress + h.handling * 0.5 + (h.ptx ? 1.6 : 0) + h.sepsis * 0.6) * 0.00035 * dt;
    h.ivhAccum += risk;
    h.handling = Math.max(0, h.handling - 0.02 * (dt / TICK));
    if (h.ivhAccum > h.ivhThreshold && h.ivhGrade === 0) {
      h.ivhGrade = h.ivhAccum > h.ivhThreshold * 1.8 ? 3 : (chance(0.6) ? 1 : 2);
      b.flags.push({ t: "ivh", msg: b.name + " may have had a brain bleed" });
    }
  }

  function stepComfort(b, dt) {
    var h = b.h;
    var decay = h.kangaroo ? 0.006 : (h.swaddled ? 0.0035 : 0.0022);
    h.pain = c01(h.pain - decay * dt + (h.painStim ? h.painStim : 0));
    h.painStim = 0;
    if (h.pain > 0.5) h.painMinutes += dt;
    h.awake = h.pain > 0.35 || h.apneaNow ? true : (h.awake ? chance(0.7) : chance(0.15));
    if (h.kangaroo) { h.kangarooMinutes += dt; }
  }

  // ======================================================================
  //  MONITOR (what the player actually sees) — including artifact
  // ======================================================================

  function updateMonitor(b, dt) {
    var h = b.h, lf = lungFunction(b);
    var trueSat = satFrom(b, lf);
    var trueHr = heartRate(b);
    var trueRr = respRate(b);

    // artifacts: probes slip, leads come off. The baby is fine; the number is not.
    var settling = b.world && b.world.settling;
    if (!settling && !h.artifactProbe && chance(0.0022 * (dt / TICK) * (h.awake ? 2.2 : 1))) {
      h.artifactProbe = true; h.artifactProbeAt = 0;
      b.flags.push({ t: "artifact", msg: b.name + "'s saturation probe reads low" });
    }
    if (h.artifactProbe) {
      h.artifactProbeAt += dt;
      // the bedside nurse spots it themselves before too long
      if (h.artifactProbeAt > 35 && chance(0.35)) {
        h.artifactProbe = false; h.artifactProbeAt = 0;
        b.flags.push({ t: "artifact-fixed", msg: "The nurse repositioned " + b.name + "'s saturation probe" });
      }
    }
    if (!settling && !h.artifactLead && chance(0.0010 * (dt / TICK))) { h.artifactLead = true; h.artifactLeadAt = 0; }
    else if (h.artifactLead) {
      h.artifactLeadAt = (h.artifactLeadAt || 0) + dt;
      if (h.artifactLeadAt > 25 && chance(0.5)) {
        h.artifactLead = false; h.artifactLeadAt = 0;
        b.flags.push({ t: "artifact-fixed", msg: "The nurse restuck " + b.name + "'s ECG lead" });
      }
    }

    var shownSat = h.artifactProbe ? clamp(trueSat - rrange(14, 34), 40, 99) : trueSat + noise(0.7);
    var shownHr = h.artifactLead ? (chance(0.5) ? 0 : clamp(trueHr + rrange(-70, 70), 0, 240)) : trueHr + noise(2.2);

    b.mon.spo2 = Math.round(clamp(shownSat, 30, 100));
    b.mon.hr = Math.round(clamp(shownHr, 0, 240));
    b.mon.rr = Math.round(clamp(trueRr + noise(2), 0, 120));
    b.mon.map = Math.round(clamp(h.map + noise(0.8), 8, 90));
    b.mon.sys = Math.round(b.mon.map * 1.42);
    b.mon.dia = Math.round(b.mon.map * 0.78 - (h.pda > 0.4 ? 6 * h.pda : 0));
    b.mon.temp = Math.round((h.coreTemp + noise(0.03)) * 10) / 10;
    b.mon.trueSat = trueSat;
    b.mon.trueHr = trueHr;

    // rolling history for trend lines
    b.hist.spo2.push(clamp((b.mon.spo2 - 60) / 40, 0, 1));
    b.hist.hr.push(clamp((b.mon.hr - 60) / 140, 0, 1));
    b.hist.map.push(clamp((b.mon.map - 15) / 45, 0, 1));
    ["spo2", "hr", "map"].forEach(function (k) { if (b.hist[k].length > 72) b.hist[k].shift(); });
  }

  // ======================================================================
  //  ALARMS
  // ======================================================================

  function alarmState(b) {
    var m = b.mon, h = b.h, worst = "none", reasons = [];
    function rate(level, why) {
      reasons.push(why);
      if (level === "red") worst = "red";
      else if (level === "amber" && worst !== "red") worst = "amber";
    }
    var lowSat = b.support.fio2 > 0.21 ? 89 : 88;
    if (m.spo2 < 80) rate("red", "SpO2 " + m.spo2 + "%");
    else if (m.spo2 < lowSat) rate("amber", "SpO2 " + m.spo2 + "%");
    if (m.spo2 > 96 && b.support.fio2 > 0.21 && h.highSatMinutes > 25) rate("amber", "SpO2 " + m.spo2 + "% on oxygen for a while");
    if (m.hr < 90) rate("red", "HR " + m.hr);
    else if (m.hr < 100 || m.hr > 190) rate("amber", "HR " + m.hr);
    if (m.rr === 0 && !h.apneaNow) rate("amber", "apnea alarm");
    if (m.rr === 0 && h.apneaNow) rate("red", "apnea");
    if (m.map < b.ga - 6) rate("red", "MAP " + m.map);
    else if (m.map < b.ga - 1) rate("amber", "MAP " + m.map);
    if (m.temp < 36.2) rate("amber", "temp " + m.temp.toFixed(1));
    if (m.temp < 35.8) rate("red", "temp " + m.temp.toFixed(1));
    if (m.temp > 37.8) rate("amber", "temp " + m.temp.toFixed(1));
    return { level: worst, reasons: reasons };
  }

  // ======================================================================
  //  MAIN STEP
  // ======================================================================

  function step(b, dt, world) {
    if (b.discharged || b.died) return;
    if (world && world.settling) { b.h.apneaTendSaved = b.h.apneaTend; b.h.apneaTend = 0; }
    b.world = world;
    b.flags = [];
    b.h.spellsThisHour = (world.min % 60 < dt) ? 0 : b.h.spellsThisHour;
    stepThermal(b, dt);
    stepRespiratory(b, dt);
    stepApnea(b, dt);
    stepCardio(b, dt);
    stepMetabolic(b, dt);
    stepBili(b, dt);
    stepInfection(b, dt);
    stepGut(b, dt);
    stepBrain(b, dt);
    stepComfort(b, dt);
    updateMonitor(b, dt);
    b.alarm = alarmState(b);
    if (world && world.settling && b.h.apneaTendSaved != null) { b.h.apneaTend = b.h.apneaTendSaved; }

    // crisis accounting: how long has this baby been in real trouble?
    var bad = (b.mon.trueSat < 80) || (b.mon.trueHr < 90) || (b.h.map < b.ga - 5) ||
              (b.h.sepsis > 0.8) || (b.h.glucose < 25) || (b.h.necGrade > 2.4) ||
              (b.h.co2 > 85) || (b.h.baseDeficit > 18);
    if (bad) { b.h.criticalMinutes += dt; b.h.criticalRun += dt; }
    else b.h.criticalRun = Math.max(0, b.h.criticalRun - dt * 2);
    return b.flags;
  }

  // ======================================================================
  //  EXAM — what a careful look actually finds
  // ======================================================================

  function examine(b) {
    var h = b.h, f = [], lf = lungFunction(b), p = perfusion(b), wob = workOfBreathing(b);
    var ap = appearance(b);

    f.push({ k: "Color", v: ({ pink: "pink and well perfused", pale: "pale", dusky: "dusky", mottled: "mottled and grey" })[ap.color],
             bad: ap.color !== "pink" });
    if (ap.jaundice > 0.25) f.push({ k: "Skin", v: "visibly jaundiced" + (ap.jaundice > 0.6 ? " down onto the belly and legs" : " over the face and chest"), bad: ap.jaundice > 0.55 });
    var capr = 1.5 + (1 - p) * 4.5;
    f.push({ k: "Cap refill", v: capr.toFixed(1) + " seconds", bad: capr > 3 });

    if (h.apneaNow) f.push({ k: "Breathing", v: "not breathing right now — apneic", bad: true });
    else if (wob > 0.6) f.push({ k: "Breathing", v: "working hard: grunting, flaring, deep retractions", bad: true });
    else if (wob > 0.35) f.push({ k: "Breathing", v: "mild retractions, some tachypnea", bad: true });
    else f.push({ k: "Breathing", v: "comfortable, easy effort", bad: false });

    if (h.ptx) f.push({ k: "Chest", v: "breath sounds noticeably decreased on one side; chest looks asymmetric", bad: true });
    else if (h.secretions > 0.5) f.push({ k: "Chest", v: "coarse, wet sounds — needs suctioning", bad: true });
    else if (h.ettDisplaced) f.push({ k: "Chest", v: "air entry poor and equal — you can barely hear anything", bad: true });
    else f.push({ k: "Chest", v: "air entry equal both sides", bad: false });

    if (h.pda > 0.45) f.push({ k: "Heart", v: "a systolic murmur, and the pulses feel bounding", bad: true });
    else if (h.pda > 0.2) f.push({ k: "Heart", v: "possible soft murmur", bad: false });
    else f.push({ k: "Heart", v: "no murmur, normal pulses", bad: false });

    if (h.necGrade > 1.4) f.push({ k: "Abdomen", v: "distended, firm, and discoloured; no bowel sounds", bad: true });
    else if (h.necGrade > 0 || h.residuals > 0.5) f.push({ k: "Abdomen", v: "fuller than earlier, with green residuals", bad: true });
    else f.push({ k: "Abdomen", v: "soft, normal bowel sounds", bad: false });

    if (h.sepsis > 0.45) f.push({ k: "Overall", v: "just does not look right — lethargic, poor tone", bad: true });
    else if (h.pain > 0.5) f.push({ k: "Overall", v: "grimacing, fists clenched, hard to settle", bad: true });
    else if (h.glucose < 40) f.push({ k: "Overall", v: "jittery, tremulous", bad: true });
    else f.push({ k: "Overall", v: "resting comfortably in a nest", bad: false });

    if (h.artifactProbe) f.push({ k: "Probe", v: "the saturation probe has slipped off the foot — the number was wrong", bad: false, artifact: true });
    if (h.artifactLead) f.push({ k: "Leads", v: "one ECG lead has come unstuck", bad: false, artifact: true });

    h.handling += 0.25;
    return f;
  }

  window.Sim = {
    TICK: TICK, clamp: clamp, c01: c01, lerp: lerp,
    seed: seed, rnd: rnd, rrange: rrange, pick: pick, chance: chance, noise: noise,
    step: step, examine: examine, appearance: appearance, alarmState: alarmState,
    lungFunction: lungFunction, perfusion: perfusion, mapTarget: mapTarget,
    pHfrom: pHfrom, workOfBreathing: workOfBreathing, endApnea: endApnea
  };
})();
