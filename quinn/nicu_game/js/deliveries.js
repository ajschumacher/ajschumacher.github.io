/* NICU Night Shift — the delivery room.

   Delivery is a place, not a quiz. The phone tells you a baby is coming; you hang up,
   walk down there by clicking the delivery room in the ward, and then you work with the
   same controls-and-a-colleague loop as a bedside. When you are finished you decide what
   happens to the baby and walk back up.

   Two halves live here: SCENARIOS, which are the different babies you can be called to,
   and ACTIONS, which is everything you can do in the room. The physiology in between is
   deliberately thin - it is a resuscitation, not a twelve-hour shift - and lives in
   `advance()`. What makes each delivery feel different is which actions the baby needs
   and in which order, and that is authored per scenario.                              */
(function () {
  "use strict";

  /* --------------------------------------------------------------- ACTIONS
     cost: seconds of the resuscitation, which is also minutes off your shift clock.
     need(d, sc) -> true when this is the right move right now.
     Each returns { text, good } from run(); the engine adds the scoring.            */
  var ACTIONS = {
    cord: {
      t: "Delay cord clamping", cost: 60, g: "first",
      info: "Wait a minute before clamping the cord so blood keeps flowing from the placenta to the baby. It raises the blood count and, in preemies, lowers the risk of a brain bleed. Only for a baby who does not need resuscitating now.",
      run: function (d, sc) {
        if (d.clampedAt != null) return { text: "The cord is already clamped and cut.", good: null };
        d.clampedAt = d.sec;
        if (d.hr >= 100 && d.breathing > 0.5) {
          d.hgbBonus = true;
          return { good: true, text: "You keep your hands off and let the cord pulse for a full minute while the midwife dries " +
            "the baby on the mother. That minute is worth a surprising amount of blood." };
        }
        d.cordDelayHarm = true;
        return { good: false, text: "A minute is a long time to stand and watch a baby who is not breathing. " +
          "Delayed clamping is for the baby who does not need you yet." };
      }
    },
    warm: {
      t: "Dry, hat, warmer", cost: 30, g: "first",
      info: "Dry the baby, put a hat on, and get them under the radiant warmer - under 32 weeks, into a plastic bag without drying first. Cold makes everything else worse and it is the easiest thing to get right.",
      run: function (d, sc) {
        if (d.warm) return { text: "Already dried, hatted and under the warmer.", good: null };
        d.warm = true; d.wet = false;
        var bag = sc.ga < 32;
        return { good: true, text: (bag
          ? "Straight into the plastic bag without drying, hat on, under the warmer. At " + sc.ga +
            " weeks the skin loses water and heat almost as fast as you can put it back."
          : "Dried, hat on, under the warmer, wet towels away.") + " Warm first, always." };
      }
    },
    position: {
      t: "Position airway, stimulate", cost: 20, g: "first",
      info: "Head neutral, chin forward to open the airway, then rub the back or the soles of the feet. For many babies this is the whole resuscitation.",
      run: function (d, sc) {
        d.airway = true;
        if (d.breathing < 0.35) d.breathing += 0.12;
        if (d.hr < 100 && d.breathing < 0.3) {
          return { good: true, text: "Head neutral, chin forward, a brisk rub along the back. Some grimace, but no real breathing yet." };
        }
        return { good: true, text: "Head neutral, chin forward, a brisk rub along the back. The breathing picks up with the stimulation." };
      }
    },
    suction: {
      t: "Suction mouth and nose", cost: 20, g: "first",
      info: "Pass a soft catheter to clear the mouth and then the nose. Only when something is actually in the way: routine suctioning wastes the first minute and can slow the heart.",
      run: function (d, sc) {
        if (d.obstructed) {
          d.obstructed = false; d.suctioned = true;
          return { good: true, text: "You clear a mouthful of thick secretions and the chest starts to move properly with the next breath." };
        }
        d.suctioned = true; d.hr = Math.max(50, d.hr - 12);
        return { good: false, text: "Nothing much comes back, and the catheter in the throat slows the heart rate for a moment. " +
          "Routine suctioning is not recommended; it costs you the first minute and gives nothing." };
      }
    },
    hr: {
      t: "Check the heart rate", cost: 15, g: "assess",
      info: "Listen at the chest, or read the ECG dots once they are on. The heart rate is the single number that tells you whether what you are doing is working.",
      run: function (d, sc) {
        d.hrChecked = true;
        var s = d.hr >= 100 ? "over 100 and steady" : d.hr >= 60 ? "between 60 and 100 - too slow"
                                                    : "under 60";
        return { good: true, text: "Heart rate is " + Math.round(d.hr) + ": " + s + "." +
          (d.hr < 100 && !d.ppv ? " A slow newborn heart is nearly always short of air, not short of drugs." : "") };
      }
    },
    ppv: {
      t: "Mask ventilation (PPV)", cost: 30, g: "breathe",
      info: "Give breaths by hand through a mask, about 40 to 60 a minute, until the chest rises. This is the treatment for a newborn who is not breathing, and it fixes almost all of them.",
      run: function (d, sc) {
        if (d.intubated) return { text: "You are already ventilating through the tube.", good: null };
        if (d.hr >= 100 && d.breathing > 0.55) {
          d.ppv = true;
          return { good: false, text: "This baby is breathing and the heart rate is fine. Bagging a baby who does not need it " +
            "pushes gas into the stomach and gets in the way of the breathing they are already doing." };
        }
        d.ppv = true;
        if (!d.airway) {
          return { good: true, text: "You start giving breaths. The chest is barely moving - the head is not in a good position yet." };
        }
        d.ppvEffective = true;
        return { good: true, text: "Breaths going in, chest rising gently with each one. Now watch the heart rate: that is your read on whether it is working." };
      }
    },
    sopa: {
      t: "Reposition mask, open airway", cost: 20, g: "breathe",
      info: "The corrective steps when breaths are not working: reseat the mask, reposition the head, suction if needed, open the mouth, raise the pressure, and only then consider a tube.",
      run: function (d, sc) {
        if (!d.ppv) return { good: false, text: "There is nothing to correct yet - you are not giving breaths." };
        d.airway = true;
        if (d.obstructed) { d.obstructed = false; }
        if (d.ppvEffective) return { good: null, text: "You reseat the mask and check the head. It was already working." };
        d.ppvEffective = true;
        return { good: true, text: "A better seal and the chin lifted forward, and now the chest is moving with each breath. " +
          "Most failed mask ventilation is a seal or a head position, not a reason to reach for a tube." };
      }
    },
    o2up: {
      t: "More oxygen", cost: 10, g: "breathe",
      info: "Turn the blender up. Start a preterm baby at 21 to 30 percent and climb only if the saturation is not following the minute-by-minute target: 60s at one minute, 80s by five.",
      run: function (d, sc) {
        d.fio2 = Math.min(1, d.fio2 + 0.2);
        var behind = d.sat < satTarget(d.sec) - 4;
        return { good: behind, text: "Oxygen up to " + Math.round(d.fio2 * 100) + " percent. " +
          (behind ? "The saturation is behind where it should be for this minute, so that is the right direction."
                  : "The saturation was already where it should be for this minute. Extra oxygen in the first minutes is not free.") };
      }
    },
    o2down: {
      t: "Less oxygen", cost: 10, g: "breathe",
      info: "Turn the blender down. Newborn saturations are supposed to climb slowly over ten minutes; chasing them up to 95 percent in the first minutes does harm.",
      run: function (d, sc) {
        d.fio2 = Math.max(0.21, d.fio2 - 0.2);
        var high = d.sat > satTarget(d.sec) + 4;
        return { good: high, text: "Oxygen down to " + Math.round(d.fio2 * 100) + " percent. " +
          (high ? "Sensible: the saturation was ahead of the target for this minute."
                : "The saturation was not running high. Coming down now may leave this baby behind the target.") };
      }
    },
    intubate: {
      t: "Intubate", cost: 45, g: "breathe",
      info: "Pass a tube into the windpipe. In the delivery room it is for a baby whom mask ventilation has genuinely failed, or one who needs surfactant now.",
      run: function (d, sc) {
        if (d.intubated) return { text: "The tube is already in.", good: null };
        var justified = (d.ppv && !d.ppvEffective) || sc.needsTube;
        d.intubated = true; d.ppv = true; d.ppvEffective = true; d.airway = true;
        if (justified) {
          return { good: true, text: "Tube in, chest lifting evenly, mist in the tube with each breath. " +
            (sc.needsTube ? "At this gestation the tube was always the likely destination." : "Mask ventilation had genuinely failed, so this was the next step.") };
        }
        d.hr = Math.max(50, d.hr - 15);
        return { good: false, text: "The tube goes in, but the attempt itself costs half a minute of not breathing for a baby " +
          "the mask was managing. Intubation is for when the mask has failed, and it had not." };
      }
    },
    surf: {
      t: "Surfactant", cost: 30, g: "breathe",
      info: "The missing slippery liquid, dripped down the breathing tube. It needs a tube to give it through, and it turns stiff preterm lungs soft within minutes.",
      run: function (d, sc) {
        if (!d.intubated) return { good: false, text: "Surfactant needs a breathing tube to go down. There is not one." };
        if (d.surf) return { text: "Surfactant is already in.", good: null };
        d.surf = true;
        if (sc.wantsSurfactant) return { good: true, text: "Surfactant down the tube. Within a minute the chest is moving more for the same pressure." };
        return { good: false, text: "Surfactant into lungs that were not short of it. It is not harmless, and this baby did not need it." };
      }
    },
    cpap: {
      t: "CPAP", cost: 20, g: "breathe",
      info: "Soft prongs and a steady pressure holding the lungs open, with the baby doing all the breathing. For a preterm baby who is breathing but working, this is the modern answer and it spares many of them a tube.",
      run: function (d, sc) {
        if (d.intubated) return { good: false, text: "There is a tube in. CPAP is what you go to after it comes out, not while it is in." };
        if (d.breathing < 0.35 || d.hr < 100) {
          d.cpap = true;
          return { good: false, text: "CPAP holds lungs open for a baby who is breathing. This one is not breathing well enough yet - " +
            "they need breaths given to them first." };
        }
        d.cpap = true; d.ppv = false;
        return { good: true, text: "Off the bag and onto CPAP, breathing for themselves against a steady pressure. " +
          "Every baby who leaves this room without a tube is a small win for their lungs." };
      }
    },
    compress: {
      t: "Chest compressions", cost: 30, g: "circ",
      info: "Three compressions to one breath, over the lower sternum. Only after thirty seconds of ventilation that is definitely working, and only if the heart rate is still under 60.",
      run: function (d, sc) {
        if (d.hr >= 60) {
          d.hr = Math.max(50, d.hr - 8);
          return { good: false, text: "The heart rate is " + Math.round(d.hr) + ". Compressions on a heart that is beating well enough " +
            "interrupt the one thing that was helping, which is the breaths." };
        }
        if (!d.ppvEffective) {
          return { good: false, text: "The heart is slow because it is short of oxygen, and the breaths are not going in yet. " +
            "Compressions before effective ventilation is the classic wrong order." };
        }
        d.compress = true;
        return { good: true, text: "Three to one, hands around the chest, thumbs on the sternum. The right move at the right moment: " +
          "thirty seconds of working breaths first, then a heart rate still under 60." };
      }
    },
    adrenaline: {
      t: "Adrenaline", cost: 30, g: "circ",
      info: "Into a vein in the cord stump. The last step of the algorithm, for a heart rate still under 60 after good ventilation and compressions together.",
      run: function (d, sc) {
        if (!d.compress || d.hr >= 60) {
          return { good: false, text: "Adrenaline is the end of the algorithm, not a shortcut through it. Ventilation, then compressions, " +
            "then this - and only while the heart rate is still under 60." };
        }
        d.adrenaline = true; d.hr += 45;
        return { good: true, text: "Adrenaline through the cord line. The heart rate climbs over the next thirty seconds." };
      }
    },
    apgar: {
      t: "Score the Apgar", cost: 10, g: "assess",
      info: "Heart rate, breathing, tone, reflex and colour, each 0, 1 or 2, at one minute and again at five. It records how the minute went. It does not predict the child.",
      run: function (d, sc) {
        var s = apgarOf(d);
        var when = d.sec < 180 ? "one minute" : "five minutes";
        if (d.apgar1 == null) d.apgar1 = s; else d.apgar5 = s;
        return { good: true, text: "Apgar at " + when + " is " + s + " of 10: " + apgarBreakdown(d) +
          ". The score describes this minute, not this child's future." };
      }
    },
    skin: {
      t: "Baby to the mother", cost: 40, g: "decide",
      info: "Dry the baby on the mother's chest and leave them there. For a vigorous newborn this is the whole of the care, and separating them costs something real.",
      run: function (d, sc) {
        if (d.hr < 100 || d.breathing < 0.5) {
          return { good: false, text: "Not yet. A baby who is not breathing well cannot be assessed on somebody's chest, " +
            "and you would be handing a family a baby who still needs you." };
        }
        d.skinToSkin = true; d.warm = true;
        return { good: true, text: "Straight onto the mother's chest, dried there, a blanket over both of them. " +
          "Warm, watched, and not separated. This is the treatment." };
      }
    }
  };

  var GROUPS = [["The first minute", "first"], ["Assess", "assess"],
                ["Breathing", "breathe"], ["Circulation", "circ"], ["The family", "decide"]];

  /* ------------------------------------------------------------ PHYSIOLOGY
     Thin on purpose. Heart rate answers to ventilation, saturation climbs on the
     minute-by-minute target curve, temperature falls until somebody stops it.     */
  function satTarget(sec) {
    var m = sec / 60;
    if (m < 1) return 62;
    if (m < 2) return 68;
    if (m < 3) return 74;
    if (m < 4) return 80;
    if (m < 5) return 85;
    if (m < 10) return 90;
    return 93;
  }

  function advance(d, sc, sec) {
    var steps = Math.max(1, Math.round(sec / 10));
    for (var i = 0; i < steps; i++) {
      d.sec += 10;
      var vent = d.ppvEffective || (d.breathing > 0.5 && !d.obstructed);
      // heart rate follows air getting in, and nothing else
      var gain = sc.hrGain == null ? 1 : sc.hrGain;
      if (d.compress && d.hr < 60 && d.ppvEffective) d.hr += 3;
      else if (vent) d.hr += (d.hr < 120 ? 9 : (d.hr < 145 ? 3 : 0)) * (d.hr < 100 ? gain : 1);
      else d.hr -= d.hr > 60 ? 5 : 2;
      d.hr = Math.max(0, Math.min(175, d.hr));

      // breathing effort and tone both come back once they are oxygenated and warm
      if (vent && d.hr > 100 && !d.apnoeic) d.breathing = Math.min(1, d.breathing + 0.05);
      if (d.hr > 110 && d.sat > 75) d.tone = Math.min(1, d.tone + 0.035);
      if (!d.warm && d.temp < 36) d.breathing = Math.max(0, d.breathing - 0.01);

      // saturation chases the target, dragged down by poor ventilation and up by oxygen
      var reach = satTarget(d.sec) + (d.fio2 - 0.21) * 22 - (vent ? 0 : 18) - (sc.satPenalty || 0);
      d.sat += (reach - d.sat) * 0.25;
      d.sat = Math.max(30, Math.min(100, d.sat));

      // heat, which nobody gets back for free
      if (!d.warm) d.temp -= d.wet ? 0.06 : 0.03;
      else if (d.temp < 36.8) d.temp += 0.02;

      if (sc.tick) sc.tick(d);
    }
  }

  // The five signs, each 0, 1 or 2, scored once each so the breakdown adds up to the total.
  function apgarParts(d) {
    return [
      ["heart rate", d.hr >= 100 ? 2 : d.hr > 0 ? 1 : 0],
      ["breathing", d.breathing > 0.6 ? 2 : d.breathing > 0.15 ? 1 : 0],
      ["tone", d.tone > 0.6 ? 2 : d.tone > 0.2 ? 1 : 0],
      ["reflex", d.tone > 0.55 || d.breathing > 0.65 ? 2 : d.tone > 0.15 || d.breathing > 0.2 ? 1 : 0],
      ["colour", d.sat > 88 ? 2 : d.sat > 70 ? 1 : 0]
    ];
  }
  function apgarOf(d) {
    return apgarParts(d).reduce(function (t, p) { return t + p[1]; }, 0);
  }
  function apgarBreakdown(d) {
    return apgarParts(d).map(function (p) { return p[0] + " " + p[1]; }).join(", ");
  }

  /* --------------------------------------------------------------- SCENARIOS
     `arrival` is what comes up to the unit afterwards. A scenario with `arrival: null`
     is one where the right answer is that nobody comes up at all.                    */
  var SCENARIOS = [
    {
      id: "preterm29", ga: 29, weightG: 1240, wantsSurfactant: true,
      label: "29 weeks, preterm labour",
      call: "Delivery room on the line. They have a 29-weeker coming now, not in twenty minutes. They need someone down there.",
      brief: "Twenty-nine weeks, mum got both doses of steroids. Here she comes - floppy, blue, no cry. " +
             "The warmer is on and the bag is ready. Tell me what you want.",
      nudge: "Everything else works better once one basic thing is sorted, and it is not the one you reach for first.",
      help: "Under The first minute: dry and warm, then position the airway. Under Breathing: mask ventilation, then CPAP once " +
            "they are breathing for themselves. Watch the heart rate under Assess to see whether it is working.",
      start: { hr: 74, breathing: 0.12, tone: 0.2, temp: 36.1, sat: 52, fio2: 0.3, wet: true },
      wants: ["warm", "position", "ppv", "cpap"],
      arrival: { archKey: "rds", tempIfPoor: 35.3, tempIfGood: 36.8 },
      done: "Pink, breathing on CPAP, wrapped and warm. Ready to go up."
    },
    {
      id: "vigorous", ga: 39, weightG: 3380,
      label: "term baby, straightforward birth",
      call: "Delivery room. Nothing dramatic - a term baby, but the midwife would like a paediatrician in the room. " +
            "Standard request. Are you coming down?",
      brief: "Here she is - crying before her shoulders were out, good tone, pink up already. " +
             "Honestly I just wanted somebody in the room. What do you want to do?",
      nudge: "A vigorous newborn is not a problem to be solved. What does this baby actually need from you?",
      help: "Under The first minute, the cord can wait a minute. Under The family, Baby to the mother. " +
            "Most of the buttons on this page are wrong for this baby, and knowing that is the point.",
      start: { hr: 148, breathing: 0.85, tone: 0.8, temp: 36.9, sat: 62, fio2: 0.21, wet: true },
      wants: ["cord", "skin"],
      arrival: null,
      done: "Skin to skin with her mother, warm, feeding within the hour. Nothing for the unit."
    },
    {
      id: "meconium", ga: 41, weightG: 3620, satPenalty: 4,
      label: "term, thick meconium, not vigorous",
      call: "Delivery room, and this one they do want you for. Forty-one weeks, thick meconium in the liquor, " +
            "and the heart rate trace has been ugly for the last half hour.",
      brief: "Thick meconium everywhere, and he came out limp. Not crying, barely a gasp. " +
             "Do you want me to get the laryngoscope out and suck him out below the cords?",
      nudge: "The old teaching for meconium was to suction the airway first. The trials changed that. What comes first now?",
      help: "The answer is the ordinary one: warm and dry, open the airway, and give breaths. " +
            "Under Breathing, mask ventilation. The suction and the tube are the traps here.",
      start: { hr: 68, breathing: 0.08, tone: 0.15, temp: 36.6, sat: 46, fio2: 0.3, wet: true, obstructed: false },
      wants: ["warm", "position", "ppv"],
      arrival: { archKey: "term", tempIfPoor: 35.6, tempIfGood: 36.8 },
      done: "Breathing, pink enough, but this one is going to need watching for the next few hours."
    },
    {
      id: "brady", ga: 38, weightG: 3100, satPenalty: 6, apnoeic: true, hrGain: 0.3,
      label: "term, no heart rate at birth",
      call: "Delivery room, crash call. Placental abruption, they are running to theatre, and the baby is coming out flat. " +
            "Go now.",
      brief: "No output that I can hear. Nothing. He came out white. " +
             "I have started drying him - you tell me what you want and I will do it.",
      nudge: "There is one algorithm for this and its steps only work in order. What is step one?",
      help: "Breathing first, always: mask ventilation under Breathing, and Reposition mask if the chest is not moving. " +
            "Only then Circulation - compressions while the heart rate is under 60, and adrenaline after that.",
      start: { hr: 34, breathing: 0.02, tone: 0.05, temp: 36.4, sat: 38, fio2: 0.3, wet: true },
      wants: ["warm", "position", "ppv", "compress"],
      arrival: { archKey: "term", tempIfPoor: 35.2, tempIfGood: 36.6 },
      done: "A heart rate, a colour, and the beginnings of breathing. He needs cooling assessed upstairs, tonight."
    },
    {
      id: "late34", ga: 34, weightG: 2180,
      label: "34 weeks, grunting from the start",
      call: "Delivery room. Thirty-four weeks, unexplained preterm labour, no steroids in time. " +
            "Baby is out and grunting away. Can you come and look?",
      brief: "Thirty-four weeks, and she is grunting with every breath and pulling in under the ribs. " +
             "Heart rate is fine, she is crying between the grunts. She does not look happy though.",
      nudge: "She is breathing for herself and her heart rate is fine. What does a baby who is working hard need, and what would be too much?",
      help: "Warm her first, under The first minute. Then under Breathing, CPAP - she is breathing, she just needs the lungs held open. " +
            "Mask ventilation and a tube would both be more than this baby is asking for.",
      start: { hr: 142, breathing: 0.6, tone: 0.55, temp: 36.2, sat: 58, fio2: 0.21, wet: true },
      wants: ["warm", "cpap"],
      arrival: { archKey: "rds", tempIfPoor: 35.5, tempIfGood: 36.9 },
      done: "Settled on CPAP, grunting eased, working a lot less than she was."
    }
  ];

  window.Deliveries = { SCENARIOS: SCENARIOS, ACTIONS: ACTIONS, GROUPS: GROUPS,
                        advance: advance, satTarget: satTarget, apgarOf: apgarOf };
})();
