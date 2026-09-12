/* NICU Night Shift — physiology engine.
   The player never sees this state. They see monitors, exams and labs, which are
   derived from it (with noise and artifact). Everything they do writes back here. */
(function () {
  "use strict";
  var CL = window.Clinical;

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
    /* Pulmonary hypertension is labile, and that lability IS the sign. A baby with clamped
       lung vessels desaturates when handled or upset and comes back up when left alone, which
       is why the nurse's line is "it swings, and it does not follow the dial". Tying the size
       of the hit to pain makes the swing real rather than described. */
    /* The lability rides on HANDLING as much as pain. Pain decays within the hour, so a
       pain-only term left a pulmonary-hypertensive baby looking completely steady between
       one set of cares and the next; handling is the thing that lingers after anybody has
       touched this baby, and lingering is what makes the swing visible. */
    if (b.h.pphn)
      s -= 20 * b.h.pphn * (1 + 1.4 * b.h.pain + 0.9 * Math.min(1, b.h.handling));
    return clamp(s, 30, 100);
  }

  // Minute ventilation vs demand -> CO2
  function co2Target(b) {
    var h = b.h, sup = b.support;
    var drive = h.spontDrive * (1 - 0.55 * h.fatigue) * (h.apneaNow ? 0.05 : 1);
    if (sup.mode === "VENT") drive *= 0.45;                        // machine takes over some work
    var machine = sup.mode === "VENT" ? clamp((sup.pip - sup.peep) * sup.rate * 0.0018, 0, 1.5) : 0;
    var mv = (drive + machine) * (0.55 + 0.45 * lungFunction(b));
    var demand = 1.0 + 0.25 * h.sepsis + 0.15 * (b.h.coreTemp > CL.temp.feverAmber ? 1 : 0);
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
               - 0.25 * (h.coreTemp < CL.temp.hypothermia ? 1 : 0) + 0.18 * h.pressors);
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
    if (h.coreTemp < CL.temp.severe) hr -= 14;
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
    else if (p < 0.62 || h.hgb < CL.hgb.pale) color = "pale";
    return {
      tone: b.tone,
      color: color,
      jaundice: c01((h.bili - 6) / 12),
      eyes: h.photo ? "shielded" : (h.pain > 0.45 || (h.awake && !h.apneaNow) ? "open" : "closed"),
      // workOfBreathing() is 0 during a spell, because a baby who is not breathing is
      // not working at it. The picture needs to know the difference between that and calm.
      apneic: !!h.apneaNow,
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
    if (h.coreTemp < CL.temp.hypothermia) { h.coldMinutes += dt; h.glucoseDrain = 1.5; } else h.glucoseDrain = 1;
  }

  function stepRespiratory(b, dt) {
    var h = b.h, sup = b.support;

    // natural surfactant maturation + treatment effect
    if (h.surfTreatPending > 0) {
      var d = Math.min(h.surfTreatPending, dt / 45);
      h.surfactant = c01(h.surfactant + d * 0.55);
      h.surfTreatPending -= d;
    }
    /* THE NATURAL HISTORY OF RDS, which used to run backwards. Severity decayed from the
       first tick and surfactant matured at a flat rate, so an untreated severe RDS baby
       measurably improved across a night - saturations 90 to 95, work of breathing 0.76
       down to 0.55 - while the debrief told the player CPAP was never going to hold those
       lungs open. Real surfactant deficiency worsens for the first day or so, because a
       lung too immature to make it is consuming what little it has, and only turns the
       corner as production ramps at 48 to 72 hours.

       Everything here is scaled by how DEFICIENT the lung actually is, so the benign "mild"
       puzzle at 0.58-0.68 barely moves while the real one at 0.36-0.44 deteriorates all
       night - which is the difference the player is being asked to spot. */
    var RC = CL.rdsCourse, ageH = h.ageH;
    var makes = ageH < RC.worseUntilH ? RC.earlyMakeFrac : ageH < RC.matureFromH ? RC.midMakeFrac : 1;
    h.surfactant = c01(h.surfactant + 0.00016 * dt * makes);
    var short = Math.max(0, RC.shortOf - h.surfactant);
    if (ageH < RC.worseUntilH && short > 0) {
      h.surfactant = c01(h.surfactant - RC.consumePerMin * dt);     // burning what it has
      // NOT c01 on severity: it runs 0 to about 2.2, and surfactant treatment takes 0.9 off
      h.rds = clamp(h.rds + RC.worsenPerMin * short * dt, 0, 2.5);
    } else {
      h.rds = clamp(h.rds * (1 - 0.00030 * dt), 0, 2.5);
    }

    // secretions build on the vent; suctioning clears them
    if (sup.mode === "VENT") h.secretions = c01(h.secretions + 0.00035 * dt);
    else h.secretions = c01(h.secretions - 0.00020 * dt);

    /* A TUBE THAT MOVES. h.ettDisplaced has existed since the beginning - it costs 0.42 of
       lung function, it shows on a film, it shows on examination, and the emergency
       checklist has a branch written for finding it - and nothing ever set it. The whole
       feature was reachable only by reading the source. A tube in a 900 gram baby has about
       a centimetre of margin, and handling is what uses it up. */
    /* Not while settling. Those ticks exist to make the OPENING numbers self-consistent,
       not to let the night start early - the same reason settling suppresses apnea and
       routine cares - and a baby handed over with the tube already down a bronchus is a
       problem nobody was told about. */
    if (sup.mode === "VENT" && !h.ettDisplaced && !(b.world && b.world.settling) &&
        chance((CL.ett.slipBaseline + CL.ett.slipPerHandling * h.handling) * dt)) {
      h.ettDisplaced = true;
      b.flags.push({ t: "ett", msg: b.name + "'s chest is not lifting evenly - the tube may have moved" });
    }

    /* HYPOCAPNIA. The game taught permissive hypercapnia carefully and taught nothing about
       the other end: a baby given surfactant on a ventilator settled at a CO2 of 22 and sat
       there all night for free. Blowing the carbon dioxide down clamps the cerebral
       arteries, and in a preterm brain that is a white-matter injury mechanism. */
    /* Only when the MACHINE is doing it. A baby breathing for themselves with a low CO2 is
       usually blowing it off to compensate for an acidosis, which is the right thing to be
       doing and is a finding about the base deficit rather than a harm to charge anybody
       for. The handover line says "held there by the ventilator", and it has to be true. */
    if (sup.mode === "VENT" && h.co2 < CL.hypocapnia.harmBelow) {
      h.hypocapMinutes += dt;
      h.hypocapWorst = Math.min(h.hypocapWorst == null ? 999 : h.hypocapWorst, h.co2);
    }

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
      var over = Math.max(0, sup.pip - CL.pipLimit(b.ga));
      h.bpd += over * 0.0016 * dt / TICK;
      h.volutrauma += over * 0.002 * dt / TICK;
      /* 0.0016 per point over per tick meant a baby inherited two points above the limit had
         roughly a coin-flip pneumothorax across one night, which turned "the settings have
         crept up, please wean them" into a death sentence for a baby with nothing else wrong.
         Real ventilator-associated air leak runs at a few percent. The lung injury above it
         is unchanged: pressure still costs BPD from the first minute, quietly, which is the
         lesson - the air leak is the dramatic version and should be the rarer one. */
      if (!h.ptx && over > 0 && chance(over * 0.0004 * (dt / TICK))) {
        h.ptx = true; h.ptxAt = b.world ? b.world.min : 0;
        b.flags.push({ t: "ptx", msg: b.name + " has developed a pneumothorax" });
      }
    }
    if (sup.mode === "CPAP" && sup.cpap > 8 && !h.ptx && chance((sup.cpap - 8) * 0.0011 * (dt / TICK))) {
      h.ptx = true; b.flags.push({ t: "ptx", msg: b.name + " has developed a pneumothorax" });
    }

    // oxygen exposure (retina/lung injury accumulator)
    /* Two different questions, and they were being answered with one number.
       HARM is continuous and starts at the target: an eye does not wait for an alarm, so
       o2Exposure accrues from targetHigh and is invisible, which means its frequency does
       not matter. An ALERT - the amber alarm, and the nurse who comes to suggest weaning -
       needs a margin, or it goes off about a point of ordinary trace wander. Gating the
       nurse on the harm number had her raising it twelve times a night, which drowned every
       other thing a colleague had to say. */
    if (sup.fio2 > 0.21 && b.mon.spo2 > CL.sat.alarmHigh) h.highSatMinutes = (h.highSatMinutes || 0) + dt;
    else h.highSatMinutes = 0;
    /* The mirror of it, and it was missing. A baby in room air who is quietly sitting under
       the target has nothing to titrate - the nurse cannot turn up oxygen that is not running
       - so the only thing the unit can do is come and ask you to start some. */
    /* Paused, not reset, through a spell. Resetting meant an apnoeic baby's counter never
       got anywhere, and measured, every low saturation on a room-air baby WAS a spell - so
       the concern that wanted a baby whose baseline is under target could never see one. */
    if (!h.apneaNow) {
      if (b.mon.trueSat < CL.sat.targetLow) h.lowSatMinutes = (h.lowSatMinutes || 0) + dt;
      else h.lowSatMinutes = 0;
    }
    if (sup.fio2 > 0.21 && b.mon.spo2 > CL.sat.targetHigh)
      h.o2Exposure += dt * (sup.fio2 - 0.21) * (b.mon.spo2 - CL.sat.targetHigh) * 0.02;
    if (sup.fio2 > 0.6) h.o2Exposure += dt * 0.02;

    /* The oxygen creep. A rising requirement is the earliest thing a unit gets, and until now
       nothing measured it - the only respiratory concern waited for 45 percent, by which point
       the baby is already in trouble. Floor tracks the lowest this baby has needed tonight, so
       creep is "how far above your own best are you", not a comparison with anybody else. The
       floor drifts slowly back up so that a baby who genuinely recovers stops being flagged
       forever for one good hour at the start of the shift. */
    if (h.fio2Floor === undefined || sup.fio2 < h.fio2Floor) h.fio2Floor = sup.fio2;
    /* The floor only forgives a baby who is actually WELL. Drifting it up unconditionally
       also forgave a baby pinned at the nurse's ceiling and still under target - measured,
       the creep on one such baby fell from 0.14 back to 0.06 across the night while nothing
       about them improved, so the concern that watches it would fire once and then go quiet
       on the baby who needed it most. */
    else if (b.mon.trueSat >= CL.sat.targetLow)
      /* Slower than any clinical climb, deliberately. At the old 0.00015 the floor rose
         faster than a deteriorating baby's requirement did, so it erased the very trend it
         existed to measure: a baby whose oxygen went 30 to 36 across a night registered a
         creep of 0.02, and the concern watching it never fired. */
      h.fio2Floor = Math.min(sup.fio2, h.fio2Floor + dt * 0.00003);
    h.o2Creep = sup.fio2 - h.fio2Floor;

    /* A slow-following CO2 baseline, so "it has risen" can be asked as well as "it is high".
       Same trick as the oxygen floor: a baby who settles at a new normal stops triggering,
       one who is still climbing keeps doing so. */
    if (h.co2Base == null) h.co2Base = h.co2;
    else h.co2Base += (h.co2 - h.co2Base) * Math.min(1, dt / CL.co2Concern.baseFollowMin);

    // gas exchange
    var lf = lungFunction(b);
    var tgt = co2Target(b);
    h.co2 += (tgt - h.co2) * 0.30 * (dt / TICK);
    // metabolic acidosis accumulates with poor perfusion / sepsis / hypoxia
    var lactateDrive = (1 - perfusion(b)) * 1.4 + (b.mon.spo2 < CL.sat.alarmRed ? 0.9 : 0) + h.necGrade * 0.5;
    h.baseDeficit += (lactateDrive * 6 - h.baseDeficit) * 0.06 * (dt / TICK);
    h.baseDeficit = clamp(h.baseDeficit, 0, 26);

    // fatigue: working hard for a long time wears a preemie out
    var wob = workOfBreathing(b);
    h.fatigue = c01(h.fatigue + (wob > 0.55 ? 0.0016 : -0.0012) * dt);
    h.spontDrive = c01(0.55 + 0.55 * (b.pma - 26) / 12 - 0.35 * h.sepsis
                       - 0.25 * (h.glucose < CL.glucose.low ? 1 : 0)
                       - 0.3 * (h.coreTemp < CL.temp.hypothermia ? 1 : 0)) + 0.35;
    if (h.caffeine) h.spontDrive += 0.22;
    /* Morphine is a level, not a switch. It takes about forty minutes to reach full effect
       and a couple of hours to clear, so stopping it before you pull a tube is a plan you
       have to make in advance rather than a button you press on the way. */
    h.morphineLevel = c01(h.morphineLevel + (h.morphine ? 0.025 : -0.007) * dt);
    h.spontDrive -= 0.35 * h.morphineLevel;
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
    mult *= 1 + 1.5 * h.sepsis + 0.7 * (h.glucose < CL.glucose.low ? 1 : 0)
              + 0.6 * (h.coreTemp < CL.temp.hypothermia ? 1 : 0) + 0.6 * (1 - h.hgb / 15)
              + 0.8 * h.fatigue + (h.necGrade > 0 ? 0.5 : 0);
    mult *= 1 + 0.5 * h.morphineLevel;      // the same drug that takes the pain away takes the drive
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
    /* What the baby makes for itself between feeds. A term baby with a liver full of
       glycogen holds its own for hours; a growth-restricted baby was born with almost
       none. This FILLS the gap rather than adding on top of a running drip, which is
       why a baby on no sugar at all still sits somewhere sensible unless something is
       actively wrong with it - and why turning the infusion up is what fixes one that
       is not. Without this, every baby with no drip and no feeds converged on 12. */
    var own = 46 * (h.glycogen == null ? 0.8 : h.glycogen);
    var use = 4.5 * h.glucoseDrain + 3 * h.sepsis;
    /* Hyperinsulinism does not hold still. A baby making too much of its own insulin
       and given no sugar keeps falling, so an ignored hypoglycaemia gets worse across
       the night instead of settling at a safe number; a decent infusion rate is what
       reverses it, and a bolus on its own is not. This is the drive the authored
       puzzles carry, so a hypoglycaemia puzzle is genuinely hypoglycaemic and a baby
       that drew a different puzzle is not. */
    if (h.hypoDriveMax > 0)
      h.hypoDrive = clamp(h.hypoDrive + (h.glucose < CL.glucose.hyperinsulinismRamp ? 0.02 : -0.04) * dt, 0, h.hypoDriveMax);
    var tgt = 28 + Math.max(supply, own) - use - h.hypoDrive
            + (h.iugr ? -10 : 0) + (h.motherDiabetic && b.dol < 2 ? -14 : 0);
    if (h.d10bolus > 0) { tgt += 45; h.d10bolus -= dt; }
    h.glucose += (clamp(tgt, 12, 260) - h.glucose) * 0.35 * (dt / TICK) + noise(1.2);
    h.glucose = clamp(h.glucose, 8, 400);
    if (h.glucose < CL.glucose.low) h.hypoMinutes += dt;
    if (h.glucose < CL.glucose.severe) { h.severeHypoMinutes += dt; }
  }

  function stepBili(b, dt) {
    var h = b.h;
    var prodPerDay = 0.45 + 2.4 * h.hemolysis + (b.ga < 34 ? 0.35 : 0);
    var clearPerDay = 0.20 + h.photo * (h.photo > 1 ? 1.5 : 1.05) + (h.feedsMlKgD / 160) * 0.4;
    h.bili += (prodPerDay - clearPerDay) * (dt / 1440);
    h.bili = clamp(h.bili, 0.4, 40);
    // threshold rises with age and gestation; below 35w it is much lower
    var thr = CL.biliThreshold(b.ga, b.dol);
    h.biliThreshold = thr;
    if (h.bili > thr + CL.bili.dangerMargin) h.biliDangerMinutes += dt;
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
    /* A bleed that has already happened no longer CLOSES the window. Extension of an
       existing haemorrhage is the thing gentle handling and a steady blood pressure are
       actually for, and closing the window on the first one meant the baby you most need to
       protect was the one nothing could happen to. */
    if (b.pma > 32) { h.ivhWindow = false; }
    if (!h.ivhWindow || h.ivhGrade >= 3) return;
    var swing = Math.abs(h.map - mapTarget(b)) / 12;
    var phStress = Math.abs(pHfrom(b) - 7.35) * 5;
    /* Cerebral vasoconstriction from a driven-down CO2 belongs in exactly this sum: it is
       the same white-matter and periventricular injury the rest of these terms describe. */
    var lowCo2 = b.support.mode === "VENT" ? Math.max(0, CL.hypocapnia.harmBelow - h.co2) / 5 : 0;
    /* Handling is capped. Uncapped, a player who examined and suctioned every forty minutes
       gave thirteen new bleeds to twenty babies - a certainty rather than a risk, which
       teaches nothing except not to touch anybody. Handling should make a bad outcome more
       likely, not inevitable. */
    var risk = (swing + phStress + Math.min(1, h.handling) * 1.1 + (h.ptx ? 1.6 : 0) +
                h.sepsis * 0.6 + lowCo2 * 1.2) * CL.ivh.riskPerMin * dt;
    h.ivhAccum += risk;
    if (h.ivhAccum > h.ivhThreshold) {
      var was = h.ivhGrade;
      if (was === 0) h.ivhGrade = h.ivhAccum > h.ivhThreshold * 1.8 ? 3 : (chance(0.6) ? 1 : 2);
      else h.ivhGrade = Math.min(3, was + 1);
      /* Reset and raise the bar, so one bad stretch does not cascade to a grade 3 inside an
         hour - but a night that stays bad can still take a baby the whole way. */
      h.ivhAccum = 0;
      h.ivhThreshold *= CL.ivh.extendRaises;
      /* A grade 3 is not a line in a report. It bleeds into the ventricle, so the count
         falls, and it presses on a brainstem that was barely coping, so the spells get
         worse. That is how anybody notices one at the cot. */
      if (h.ivhGrade >= 2) {
        h.hgb = Math.max(6, h.hgb - (h.ivhGrade === 3 ? 2.2 : 0.9));
        h.apneaTend += h.ivhGrade === 3 ? 0.5 : 0.2;
        h.fontanelleFull = true;
      }
      b.flags.push({ t: "ivh", msg: was
        ? b.name + "'s bleed looks bigger - grade " + was + " has become grade " + h.ivhGrade
        : b.name + " may have had a brain bleed" });
    }
  }

  function stepComfort(b, dt) {
    var h = b.h;
    /* Handling settles. This decay used to live inside stepBrain, BELOW its early return for
       any baby outside the brain-bleed window - so for every baby over 32 weeks, and for
       every baby who had already bled, handling accumulated all night and never came down.
       Measured on a term baby it went 0.33, 0.66, 0.99 in perfect steps, one per set of
       cares, with no decay at all. It belongs here: it is a stress quantity, not a
       neurological one, and everything that reads it needs it to be able to fall. */
    h.handling = Math.max(0, h.handling - 0.02 * (dt / TICK));
    if (h.protectedMin > 0) h.protectedMin = Math.max(0, h.protectedMin - dt);
    // the strongest thing on the ladder, and the only one with a cost attached
    var decay = 0.0022 + 0.0080 * h.morphineLevel +
                (h.kangaroo ? 0.0038 : h.swaddled ? 0.0013 : 0);
    h.pain = c01(h.pain - decay * dt + (h.painStim ? h.painStim : 0));
    h.painStim = 0;
    if (h.pain > 0.5) h.painMinutes += dt;
    h.awake = h.pain > 0.35 || h.apneaNow ? true : (h.awake ? chance(0.7) : chance(0.15));
    if (h.kangaroo) { h.kangarooMinutes += dt; }

    /* Clamped lung vessels, and what actually moves them. In a real unit the treatment for
       pulmonary hypertension short of nitric oxide is minimal handling, adequate oxygen and
       sedation, and it genuinely works - the vessels relax over hours. Equally, a distressed
       or repeatedly disturbed baby spirals the other way. Nothing moved h.pphn before this,
       so the debrief could tell you the vessels stayed shut no matter what you did. */
    if (h.pphn > 0) {
      /* Relaxation has to be EARNED, and h.swaddled is not the way to ask. Every baby in the
         unit starts swaddled - it is the default state, not an intervention - so crediting it
         handed every pulmonary-hypertensive baby a cure for free: traced, one went from 0.38
         to 0.11 across a night on which nobody did anything at all.

         protectedMin is the honest version: minutes of deliberately protected care still
         running, set by comfort care and by kangaroo care and ticking down. It makes minimal
         handling something you have to keep coming back to, which is what it is, and it means
         a well-managed baby ends the night meaningfully better while a neglected one ends it
         where they started. Nobody cures this by morning. */
      var calm = (h.protectedMin > 0 ? 1 : 0) + (h.kangaroo ? 1 : 0) + (h.morphineLevel > 0.2 ? 1 : 0);
      /* 0.00016 could not cover the range. Measured, perfect play - echo, the attending
         called, comfort care kept up all night - took a worst-case 0.45 baby only to 0.35,
         so they were still flagged at handover for a problem they had actually managed. A
         player who does everything right has to be able to finish the job. */
      var relax = 0.00024 * calm * dt;
      if (b.support.fio2 >= 0.5) relax += 0.00010 * dt;      // oxygen is a pulmonary vasodilator
      var clamp2 = (0.00030 * h.handling + 0.00016 * Math.max(0, h.pain - 0.45)) * dt;
      h.pphn = c01(h.pphn - relax + clamp2);
    }
  }

  /* ======================================================================
       THE NURSE AT THE COT
     ======================================================================
     Titrating oxygen to hold a baby in the target range is the most frequent thing a NICU
     nurse does, and nothing in this game did it: the only writer of support.fio2 was the
     player's slider. Measured, every baby in a neglected shift ended on exactly the oxygen
     it started on, a desaturating baby sat at 79 percent for hours with nobody responding,
     and the high-saturation concern fired eight times a night because nobody weaned either.

     It also silently disabled the whole respiratory arc. risingwork, risingoxygen and
     swinging all gate on a FiO2 that only the player could have set, so a baby working at
     0.76 - grunting, deep retractions - drew no comment all night if the dial happened to
     read 30 percent. With her doing this, a rising oxygen requirement becomes the earliest
     thing the unit shows you, which is what it is in life.

     Three deliberate choices:
       - she reads trueSat, not the monitor. She is at the cot and can see the baby, so a
         slipped probe does not make her turn the oxygen up - which would have had the game
         doing the wrong thing on the player's behalf and killed the artifact lesson.
       - up fast, down slow. Safety is urgent; weaning is a conversation, and keeping it
         slow leaves the decision - and the credit for it - with the player.
       - she stops at a ceiling. Past that she wants a doctor at the cot rather than another
         adjustment, and that is exactly where the concerns take over.               */
  function stepNursing(b, dt) {
    var h = b.h, sup = b.support, N = CL.o2Nurse;
    if (sup.mode === "RA") return;               // room air is 21 percent by definition
    if (h.o2HandsOff > 0) { h.o2HandsOff = Math.max(0, h.o2HandsOff - dt); return; }
    if (h.apneaNow) return;                      // she stimulates through a spell, she does not chase it

    var s = b.mon.trueSat;
    if (s < CL.sat.targetLow && sup.fio2 < N.ceiling)
      sup.fio2 = Math.min(N.ceiling, sup.fio2 + N.upPerMin * dt);
    else if (s > N.weanAbove && sup.fio2 > 0.21)
      sup.fio2 = Math.max(0.21, sup.fio2 - N.downPerMin * dt);
    sup.fio2 = Math.round(sup.fio2 * 100) / 100;

    // how long she has been out of room to manoeuvre, which is what she comes to tell you
    if (sup.fio2 >= N.ceiling - 0.005 && s < CL.sat.targetLow) h.o2Ceilinged += dt;
    else h.o2Ceilinged = 0;
  }

  /* Routine cares happen to a baby whether or not a doctor decides anything, and nothing in
     the game generated handling except the player. A pulmonary-hypertensive baby therefore
     looked perfectly stable all night - measured, one sat at 95 percent for twelve hours on
     pphn of 0.34 - because the lability that IS the diagnosis needs something to be labile
     about. This is the unit's own heartbeat: it makes a fragile baby show you they are
     fragile, and it gives comfort care and morphine something to work against. */
  function stepCares(b, dt) {
    var h = b.h, N = CL.o2Nurse;
    h.caresIn = (h.caresIn == null ? N.caresEveryMin * (0.3 + 0.7 * rnd()) : h.caresIn) - dt;
    if (h.caresIn > 0) return;
    h.caresIn = N.caresEveryMin * (0.75 + 0.5 * rnd());
    if (h.kangaroo) return;                       // she is not taking a baby off a chest for obs
    /* Protected care is not a flag, it is an instruction to the unit: cluster the cares, do
       them together and gently, and leave the baby alone in between. So while it is running
       the routine obs cost a fraction of what they otherwise would. Without this, "protected"
       babies still accrued the full handling of every set of cares all night - which is why
       pressing Comfort care once and walking away did nothing on the one diagnosis where
       minimal handling IS the treatment. */
    var gentle = (h.swaddled ? 0.55 : 1) * (h.protectedMin > 0 ? 0.3 : 1);
    h.handling += N.caresHandling * gentle;
    h.painStim += N.caresPain * gentle;
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
    var onOxygen = b.support.fio2 > 0.21;
    var lowSat = onOxygen ? CL.sat.alarmLowOnOxygen : CL.sat.alarmLowRoomAir;
    if (m.spo2 < CL.sat.alarmRed) rate("red", "SpO2 " + m.spo2 + "%");
    else if (m.spo2 < lowSat) rate("amber", "SpO2 " + m.spo2 + "%");
    if (m.spo2 > CL.sat.alarmHigh && onOxygen && h.highSatMinutes > CL.sat.highForMinutes)
      rate("amber", "SpO2 " + m.spo2 + "% on oxygen for a while");
    if (m.hr < CL.hr.alarmRed) rate("red", "HR " + m.hr);
    else if (m.hr < CL.hr.alarmLow || m.hr > CL.hr.alarmHigh) rate("amber", "HR " + m.hr);
    if (m.rr === 0 && !h.apneaNow) rate("amber", "apnea alarm");
    if (m.rr === 0 && h.apneaNow) rate("red", "apnea");
    if (m.map < b.ga + CL.map.alarmRedAt) rate("red", "MAP " + m.map);
    else if (m.map < b.ga + CL.map.alarmAmberAt) rate("amber", "MAP " + m.map);
    if (m.temp < CL.temp.severe) rate("red", "temp " + m.temp.toFixed(1));
    else if (m.temp < CL.temp.hypothermia) rate("amber", "temp " + m.temp.toFixed(1));
    if (m.temp > CL.temp.feverRed) rate("red", "temp " + m.temp.toFixed(1));
    else if (m.temp > CL.temp.feverAmber) rate("amber", "temp " + m.temp.toFixed(1));
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
    /* The count resets on the hour, which is right for the nurse's "that is three this hour"
       and wrong for anybody asking how the night has been going: a player who has watched
       four spells at 01:58 is told about none of them at 02:01. The hour that just ended is
       kept, because the player saw it happen. */
    if (world.min % 60 < dt) { b.h.spellsPrevHour = b.h.spellsThisHour || 0; b.h.spellsThisHour = 0; }
    b.h.ageH += dt / 60;                          // the baby is getting older during the shift
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
    stepNursing(b, dt);                           // AFTER the monitor: she reacts to this minute
    if (!(world && world.settling)) stepCares(b, dt);
    b.alarm = alarmState(b);
    if (world && world.settling && b.h.apneaTendSaved != null) { b.h.apneaTend = b.h.apneaTendSaved; }

    // crisis accounting: how long has this baby been in real trouble?
    var bad = (b.mon.trueSat < CL.sat.alarmRed) || (b.mon.trueHr < CL.hr.alarmRed) ||
              (b.h.map < b.ga + CL.map.criticalAt) ||
              (b.h.sepsis > 0.8) || (b.h.glucose < CL.glucose.severe) || (b.h.necGrade > 2.4) ||
              (b.h.co2 > CL.co2.critical) || (b.h.baseDeficit > 18);
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
    // the same number the nurse used when she came to tell you: they cannot disagree now
    else if (h.glucose < CL.glucose.low) f.push({ k: "Overall", v: "jittery, tremulous", bad: true });
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
