/* NICU Night Shift — the attending on the phone.

   She used to be an oracle: the old attendingSteer read hidden state directly and returned
   one sentence off a fixed eleven-branch chain. Measured over 288 calls, seventy percent of
   her advice went to a player who had neither examined the baby nor had a result back.

   What she is now:

   1. PICTURE   Only what you could have told her down a telephone - the monitor and how it
                has moved, the settings and where they started, the examination if you did
                one, the results that are back. Nothing here reads b.h for a diagnosis.

   2. SITUATION Weighed, not chained. A RESULT THAT IS BACK BEATS A HUNCH: you went and got
                it, so she reads it first. (A player found a gas with a CO2 of 68 being
                ignored. Two causes: nothing outranked a hunch, and every CO2 comparison
                read CL.ref.co2.hi, which does not exist - the band defines lo and nothing
                else - so `co2 > undefined` was false every time.)

   3. MEMORY    b.h.consult records what she said and what she asked for. Bring that thing
                back and she reads it and moves on, whatever the topic has become.

   THREE THINGS, EVERY TIME. What we know, what to do next, and why - in that order, in her
   voice, with the actual numbers in it. No differential lists, no "watch for" appendix, no
   praise for having rung. Earlier drafts ran to seventeen hundred characters and read like
   a textbook held up to the receiver; the rule now is that every clause is either a fact
   she has been given, an instruction, or the reasoning that connects them.

   TWO DOORS, AND ONLY ON THE FIRST CALL. "I am not sure" gets a senior asking for the one
   thing that would settle it. "Here is what I am seeing" gets the reasoning. Once she is
   holding the case, ringing back goes straight to the answer - being asked how you want to
   phrase it for the fourth time is not what a phone call is like.

   AND EVERY SENTENCE CONJUGATES. A singular "they" takes a plural verb, so nothing here
   concatenates a verb after pronoun.s - it is p.pr.is, p.pr.has, p.pr.v("look").       */
(function () {
  "use strict";
  var G = window.G, CL = window.Clinical;
  var NG = window.NG || (window.NG = {});

  function cap(s) { return NG.cap(s); }

  // ------------------------------------------------------------------ picture
  function exam(b) {
    if (!b.findings) return null;
    var e = { ageMin: G.min - (b.examinedAt || 0) };
    b.findings.forEach(function (f) { e[f.k.toLowerCase().replace(/ /g, "")] = f.v; });
    e.stale = e.ageMin > 90;
    return e;
  }
  function has(e, key, re) { return !!(e && e[key] && re.test(e[key])); }

  function satSwing(b, n) {
    var h = b.hist && b.hist.spo2; if (!h || h.length < 12) return 0;
    var w = h.slice(-(n || 24)), lo = 1, hi = 0;
    w.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    return Math.round((hi - lo) * 40);
  }

  function picture(b) {
    var m = b.mon, sup = b.support, st = b.startSnapshot || {}, e = exam(b);
    var p = {
      b: b, name: b.name, pr: b.pronoun,
      she: b.pronoun.s, her: b.pronoun.o, hers: b.pronoun.p,
      ga: b.ga, dol: b.dol, pma: Math.round(b.pma),
      sat: m.spo2, hr: m.hr, rr: m.rr, map: m.map, temp: m.temp,
      pulsePressure: m.sys - m.dia,
      mode: sup.mode, fio2: Math.round(sup.fio2 * 100), pip: sup.pip, peep: sup.peep,
      ventRate: sup.rate, isoOpen: sup.isoOpen,
      fio2Start: Math.round((st.fio2 != null ? st.fio2 : sup.fio2) * 100),
      exam: e, labs: b.labs || {},
      spells: Math.max(b.h.spellsThisHour || 0, b.h.spellsPrevHour || 0),
      onAbx: !!b.h.abx, feeding: b.h.feedsMlKgD > 0, photo: !!b.h.photo,
      did: {}, sent: 0
    };
    (b.history || []).forEach(function (r) { if (r.kind === "did") p.did[r.text] = true; });
    ["glucose", "gas", "cbc", "bili"].forEach(function (k) { if (p.labs[k]) p.sent++; });
    p.o2Up = p.fio2 - p.fio2Start;
    p.vented = p.mode === "VENT";
    p.supported = p.mode !== "RA";
    p.working = has(e, "breathing", /working hard|retractions/);
    p.hardWork = has(e, "breathing", /working hard/);
    p.swing = satSwing(b, 24);
    /* The whole stored night, not just the last two hours. Clamped lung vessels SWING until
       they stop swinging and simply sit low - which is the end of that story, not a different
       one. A baby who was labile an hour ago and is now steadily hypoxic on ninety percent is
       not a fresh air leak, and the difference is in the trace the player has been watching
       all night. Without this she offered "hands on her and a light on that chest" to exactly
       the baby a player lost. */
    p.swungEarlier = satSwing(b, 72);
    p.gas = p.labs.gas && p.labs.gas.n;
    p.cbc = p.labs.cbc && p.labs.cbc.n;
    p.sugar = p.labs.glucose && p.labs.glucose.n;
    return p;
  }

  function ago(min) {
    if (min < 15) return "just now";
    if (min < 75) return Math.round(min / 5) * 5 + " minutes ago";
    return "about " + Math.round(min / 60) + (min < 105 ? " hour" : " hours") + " ago";
  }
  function labAge(p, k) { return p.labs[k] ? Math.round(G.min - p.labs[k].at) : null; }

  function abnormal(p) {
    var out = [];
    if (p.gas && (p.gas.co2 > CL.co2.permissiveHigh || p.gas.ph < CL.ref.pH.lo || p.gas.baseDeficit > CL.ref.baseDeficit.hi)) out.push("gas");
    if (p.cbc && (p.cbc.crp > CL.ref.crp.hi || p.cbc.hgb < CL.hgb.flagAt || p.cbc.wbc < CL.ref.wbc.lo || p.cbc.wbc > CL.ref.wbc.hi)) out.push("cbc");
    if (p.sugar && p.sugar.glucose < CL.glucose.treated) out.push("glucose");
    if (p.labs.bili && p.labs.bili.n && p.labs.bili.n.bili > p.labs.bili.n.threshold - 2) out.push("bili");
    ["cxr", "axr", "hus", "echo"].forEach(function (k) {
      if (p.labs[k] && p.labs[k].f && p.labs[k].f !== "clear" && p.labs[k].f !== "closed") out.push(k);
    });
    return out;
  }

  // --------------------------------------------------------------- situations
  /* know  the facts she has been given, said back with the numbers in them
     now   one instruction
     why   the reasoning that joins them, and what would prove it wrong
     ask   the single thing she wants when the player says "I am not sure"       */
  var SITUATIONS = [

    /* THE ONE THAT KILLED A BABY. A player reported a meconium-aspiration baby with clamped
       lung vessels dying at 00:45 having found the diagnosis, and the attending they rang
       told them "hands on her and a light on that chest, now" - which is the single worst
       thing you can do to those vessels, and which she said in the same breath as "and while
       I have you, minimal handling".

       Three guards now, because one was not enough. This situation outranks everything when
       an echo has SHOWN the pressures are high; swinging outranks suddendrop when the
       saturation is low AND moving; and suddendrop refuses to fire at all once the echo is
       back. She cannot recommend handling this baby by any route. */
    { id: "pphnKnown",
      when: function (p) {
        return (p.labs.echo && p.labs.echo.pphn && labAge(p, "echo") < 600) ? 120 : 0;
      },
      know: function (p) {
        return "The echo shows the pressures in the lung arteries are high. Saturation " + p.sat +
               " on " + p.fio2 + " percent, and you already know why.";
      },
      now: function (p) {
        return "Nothing to " + p.her + ". Nest " + p.her + ", dim the light, cluster the cares, and keep the oxygen up.";
      },
      why: function (p) {
        return "Blood is going past the lungs rather than through them, so more oxygen has less and less to act on — " +
               "and every time somebody touches " + p.her + " the pressure rises again and the saturation follows it down. " +
               "Being left alone IS the treatment here, not a kindness, and it is one you have to keep choosing: the settling " +
               "wears off after about three hours. And do not go looking for anything else. You are not short of information on this " +
               "baby, you are short of quiet — another film, another gas, another pair of hands all cost you saturation and " +
               "tell you nothing you do not already know.";
      },
      ask: function (p) {
        return "Do not do anything to " + p.her + ". Nest " + p.her + ", dim the light, and tell me in twenty minutes what the saturation has done.";
      },
      expect: ["comfort", "kangaroo", "morphine"],
      follow: function (p) {
        if (p.sat >= CL.sat.targetLow)
          return { know: "Saturation " + p.sat + ". That is the vessels opening up.",
                   now: "Keep doing exactly what you are doing, and renew the settling before it lapses.",
                   why: "It comes back down the moment the protection stops, so this is not a problem you fix once. An hour at a time, all night, and " + p.she + " " + p.pr.v("get") + " to morning." };
        return { know: "Saturation " + p.sat + " still.",
                 now: "More of the same, and morphine if " + p.she + " " + p.pr.is + " fighting you at all.",
                 why: "These vessels relax over hours rather than minutes, so a number that has not moved yet is not a treatment that has failed. What would worry me is somebody deciding to DO something about it." };
      } },

    { id: "suddendrop",
      when: function (p) {
        /* Never on a baby whose echo has already answered the question. A low saturation on
           high oxygen in confirmed pulmonary hypertension is the disease behaving exactly as
           it does - not a pneumothorax waiting to be found by pressing on the chest. */
        if (p.labs.echo && p.labs.echo.pphn) return 0;
        /* A pneumothorax is SUDDEN. A baby who has been swinging all night and is now sitting
           low on nearly pure oxygen is a story that has been running for hours, and sending
           somebody to press on that chest is the worst thing on the list. */
        if (p.swungEarlier >= 15 && p.fio2 >= 70) return 0;
        return (p.sat < CL.sat.alarmRed && p.fio2 >= 55) ? 100 : 0;
      },
      know: function (p) {
        return "Saturation " + p.sat + " on " + p.fio2 + " percent" +
               (p.swing >= 8 ? ", and you say it moves about" : ", and it is sitting there") +
               ". You have given " + p.her + " the oxygen and it has not worked.";
      },
      now: function (p) { return "Hands on " + p.her + " and a light on that chest, now."; },
      why: function (p) {
        return "When the number will not follow the dial it is not the air sacs — it is an air leak, " +
               (p.vented ? "a tube that has slipped or blocked, " : "") + "or the lung vessels shutting. " +
               "One look tells you which: one side quieter is a leak, " +
               (p.vented ? "poor and EQUAL is the tube, " : "") + "and nothing to find means the vessels.";
      },
      ask: function (p) { return "Listen to both sides of that chest and tell me whether one is quieter. Ring me straight back."; },
      expect: ["examine"],
      follow: function (p) {
        if (has(p.exam, "chest", /decreased on one side|asymmetric/))
          return { know: "One side quieter, chest asymmetric. That is an air leak.",
                   now: "Needle it. Do not wait for a film.",
                   why: "A tension pneumothorax kills by stopping the heart filling, not by stopping the lung. Minutes matter and a film costs you twenty. The saturation should climb within a few breaths — if it does not, you were in the wrong place or it was not that." };
        if (has(p.exam, "chest", /barely hear anything|poor and equal/))
          return { know: "Poor and equal air entry. That is the tube, not the lung.",
                   now: "Suction first, and re-site the tube if that changes nothing.",
                   why: "Equal means whatever is wrong is above the split — a plug or a tube out of position. Suction is thirty seconds and re-intubation is fifteen minutes, so you try them in that order. The chest lifting evenly is your answer, not the number." };
        return { know: "Air entry equal, nothing to find on the chest.",
                 now: "Echo, and nobody touches " + p.her + " while you wait.",
                 why: "With the airway and the chest excluded, blood is going past the lungs rather than through them. That is why oxygen does nothing. If the saturation climbs on its own once you stop handling " + p.her + ", that is close to diagnostic on its own." };
      } },

    { id: "gasback",
      when: function (p) {
        if (!p.gas || labAge(p, "gas") > 240) return 0;
        var g = p.gas;
        return (g.co2 > CL.co2.permissiveHigh || g.ph < CL.ref.pH.lo || g.baseDeficit > CL.ref.baseDeficit.hi) ? 92 : 0;
      },
      know: function (p) {
        var g = p.gas;
        return "pH " + g.ph.toFixed(2) + ", CO2 " + g.co2 + ", base deficit " + g.baseDeficit +
               (labAge(p, "gas") > 20 ? ", from " + ago(labAge(p, "gas")) : "") +
               (p.working ? ", and you say " + p.she + " " + p.pr.is + " working for it" : "") + ".";
      },
      now: function (p) {
        var g = p.gas;
        if (g.co2 > CL.co2.notEnough)
          return p.vented ? "Check that tube and suction, then take the rate up."
                          : "Stop adding oxygen and start helping " + p.her + " breathe. Intubate " + p.her + ".";
        if (g.baseDeficit > CL.ref.baseDeficit.hi) return "Volume now, and culture and antibiotics while it runs.";
        if (g.co2 > CL.co2.permissiveHigh) return "Leave the oxygen and change the ventilation. Repeat the gas in an hour.";
        return "Repeat it in an hour before you act on it.";
      },
      why: function (p) {
        var g = p.gas, hiCo2 = g.co2 > CL.co2.permissiveHigh, bd = g.baseDeficit > CL.ref.baseDeficit.hi;
        if (hiCo2 && bd)
          return "Both halves are wrong, and they mean different things. The CO2 is a lung that cannot clear it; the base deficit of " +
                 g.baseDeficit + " is tissues short of blood, making acid. The second one is the one that kills " + p.her +
                 ", so it goes first — and no amount of oxygen touches either.";
        if (hiCo2)
          return "A CO2 of " + g.co2 + " is ventilation, not oxygenation" +
                 (p.working ? ", and effort that has been going on for hours does not continue — babies fail suddenly" : "") +
                 ". Stiff lungs and a tiring baby look identical from here and both need the same thing tonight. If the CO2 falls once " +
                 "you are doing the breathing, it was the lungs.";
        if (bd)
          return "The CO2 is acceptable, so this is not a lung problem — " + p.she + " " + p.pr.is +
                 " making acid because the tissues are not getting enough blood. Volume is the test and the treatment at once: " +
                 "if the next deficit is smaller, you were right.";
        return "A pH below " + CL.ref.pH.lo + " with neither half dramatic is either early or a bad sample — a squeeze out of a cold heel reads acidotic on a well baby. One gas is a point; two is a direction.";
      },
      ask: function (p) { return "Read me the gas — pH, CO2 and base deficit — and tell me how hard " + p.she + " " + p.pr.is + " working."; },
      expect: ["gas", "examine", "intubate", "vent"],
      follow: function (p) {
        var g = p.gas;
        if (g.co2 > CL.co2.notEnough)
          return { know: "CO2 still " + g.co2 + ".",
                   now: p.vented ? "Tube checked, then rate up." : "Intubate " + p.her + ".",
                   why: "Past " + CL.co2.notEnough + " the ventilation is not enough whatever the oxygen reads, and " +
                        (p.hardWork ? "a baby working this hard at this hour will tire, and they tire suddenly" :
                                      "a CO2 that high with little effort means " + p.she + " " + p.pr.has + " already stopped fighting it") +
                        ". Watch the effort rather than the number — a baby who stops working may be better or may be giving up." };
        if (g.co2 <= CL.co2.permissiveHigh && g.baseDeficit <= CL.ref.baseDeficit.hi)
          return { know: "CO2 " + g.co2 + ", base deficit " + g.baseDeficit + ". That is a better gas.",
                   now: "Nothing. Leave " + p.her + " alone.",
                   why: "Whatever you changed worked, and the commonest mistake now is to keep changing things. One more gas in four hours tells you it is a trend rather than a good moment." };
        if (g.baseDeficit > CL.ref.baseDeficit.hi)
          return { know: "Base deficit still " + g.baseDeficit + ".",
                   now: "More volume, and find the infection.",
                   why: "The acid half has not moved, so the cause is still running. A deficit that shrinks means you are ahead of it; one that grows means you are not, and it is the clearest number you have for that." };
        return { know: "CO2 " + g.co2 + ", base deficit " + g.baseDeficit + " — better, not fixed.",
                 now: "Name which half is still wrong, and treat that one.",
                 why: "Treating both at once means you learn nothing from either. The base deficit is the one to follow; if it is climbing it was never the lungs." };
      } },

    { id: "swinging",
      when: function (p) {
        /* It counts as swinging if it swung tonight, even if it has gone quiet since. */
        var swung = Math.max(p.swing, p.swungEarlier);
        if (swung < 12 || p.fio2 < 35) return 0;
        if (p.sat < CL.sat.alarmRed && swung >= 15) return 105;
        return 78;
      },
      /* A LOW SATURATION THAT IS ALSO SWINGING IS NOT AN AIR LEAK. suddendrop returns 100 on
         any saturation under the red line at high oxygen, so it outranked this unconditionally
         - and it sends the player to put hands on the chest, which is the one thing that makes
         pulmonary hypertension worse. Traced on a baby sitting at 79 on 85 percent with a
         24-point swing: she said "hands on her and a light on that chest, now" and then, in the
         same breath, "and while I have you, minimal handling". The swing was in her picture the
         whole time. */
      know: function (p) {
        if (p.swing < 12 && p.swungEarlier >= 12)
          return "It was swinging " + p.swungEarlier + " points earlier and now it is just sitting at " + p.sat +
                 " on " + p.fio2 + " percent. That is not it settling.";
        return "Swinging " + p.swing + " points, on " + p.fio2 + " percent to hold " + p.her + " there.";
      },
      now: function (p) { return "Minimal handling for half an hour — cluster the cares, lights down, and tell the nurse nobody touches " + p.her + "."; },
      why: function (p) {
        return "A lung problem is steady; it sits low and stays low. Something that swings is being opened and closed, and the two " +
               "candidates are the lung vessels and pain. Both get worse with handling, so half an hour of being left alone is the " +
               "test and the first treatment at once. If the saturation climbs and steadies, you have your answer without an echo.";
      },
      ask: function (p) { return "Leave " + p.her + " completely undisturbed for twenty minutes and tell me what the saturation does."; },
      expect: ["examine", "echo"],
      follow: function (p) {
        if (p.labs.echo && p.labs.echo.pphn)
          return { know: "Pressures in the lung arteries are high on the echo. That is your answer.",
                   now: "Nest " + p.her + ", dim the light, cluster the cares, oxygen up. Nothing else.",
                   why: "Blood is going past the lungs, so the treatment is not more oxygen and it is certainly not more tests — it is fewer insults. Every handling episode raises the pressure again, which is why the saturation falls each time a porthole opens. The settling wears off after about three hours, so it is a thing you keep choosing all night." };
        if (has(p.exam, "overall", /grimacing|fists/))
          return { know: "Grimacing, fists clenched. " + cap(p.she) + " " + p.pr.is + " in pain.",
                   now: "Treat the pain, then hands off.",
                   why: "Pain swings a saturation exactly like clamped vessels do, and it is the one of the two you can fix in ten minutes. If the swings settle with " + p.her + ", it was never the vessels — and you have avoided an echo and an hour." };
        return { know: "Nothing on the examination to hang it on.",
                 now: "Echo, undisturbed while you wait.",
                 why: "You have excluded the cheap explanation, so now it is worth paying for the expensive test. What " + p.she + " " + p.pr.does + " while nobody is touching " + p.her + " is still the most useful thing you will see tonight." };
      } },

    { id: "o2creep",
      when: function (p) {
        if (!p.supported) return 0;
        if (p.o2Up < 7 && p.fio2 < 40) return 0;
        return 70 + Math.min(8, p.o2Up / 3);
      },
      know: function (p) {
        return (p.o2Up >= 4 ? "Oxygen from " + p.fio2Start + " to " + p.fio2 + " percent since seven"
                            : cap(p.she) + " " + p.pr.is + " on " + p.fio2 + " percent") +
               (p.working ? ", and you say " + p.she + " " + p.pr.is + " working for it" : "") + ".";
      },
      now: function (p) {
        return p.gas ? "Another gas — I want the trend, not the number — and hands on " + p.her + " while you wait."
                     : "Examine " + p.her + ", then send a gas.";
      },
      why: function (p) {
        return "A creeping oxygen requirement means something in the lungs has changed since the day team went home, and at " +
               p.ga + " weeks that is stiff lungs running out of surfactant, " +
               (p.vented ? "secretions, or a tube that has slipped" : "an infection, or a duct opening") +
               ". The gas separates them: a CO2 that is up with that much work is stiff lungs and nothing you do to the dial " +
               "will help. If the oxygen keeps creeping after you turn the " + (p.vented ? "pressure" : "CPAP") +
               " up, you are not treating the right thing.";
      },
      ask: function (p) { return "Get me a gas, and tell me how hard " + p.she + " " + p.pr.is + " working while you are there."; },
      expect: ["gas", "examine"],
      follow: function (p) {
        if (has(p.exam, "chest", /coarse, wet/))
          return { know: "Coarse and wet on both sides.",
                   now: "Suction " + p.her + ", then look at the oxygen again.",
                   why: "Secretions do everything stiff lungs do and cost a catheter to fix. I have watched people intubate a baby who needed suctioning. If the oxygen falls back, that was the whole thing." };
        if (has(p.exam, "heart", /bounding|systolic murmur/))
          return { know: "Bounding pulses and a murmur, with the oxygen creeping.",
                   now: "Echo. Do not treat it on a murmur.",
                   why: "A duct floods the lungs with blood that should be going to the body, which is exactly this picture. But ibuprofen is hard on a gut and a kidney, and most ducts close on their own — so the echo is not a formality, it is the difference between treating and harming." };
        return { know: "Nothing new from the chest, and still no gas.",
                 now: "Send the gas.",
                 why: "I cannot take stiff lungs off the list without one, and that is the diagnosis that needs treating tonight rather than in the morning." };
      } },

    { id: "bloods",
      when: function (p) {
        if (!p.cbc || labAge(p, "cbc") > 300) return 0;
        var c = p.cbc;
        return (c.crp > CL.ref.crp.hi || c.wbc < CL.ref.wbc.lo || c.wbc > CL.ref.wbc.hi) ? 84 : 0;
      },
      know: function (p) { return "White count " + p.cbc.wbc + ", CRP " + p.cbc.crp + "."; },
      now: function (p) {
        return p.onAbx ? "Cover is on. Go and look at " + p.her + " again, and find the source."
                       : "Culture, then antibiotics. Now.";
      },
      why: function (p) {
        var c = p.cbc;
        return (c.wbc < CL.ref.wbc.lo
                 ? "A LOW white count is the worrying one in a newborn — the marrow is being consumed faster than it can produce, which is what overwhelming infection does. "
                 : "") +
               "A CRP is telling you about six hours ago, so it confirms and never clears: two normal ones a day apart is what makes infection unlikely, not one. " +
               "The decision is made on the baby; the count is corroboration.";
      },
      ask: function (p) { return "Read me the white count and the CRP, and tell me whether " + p.she + " " + p.pr.v("look") + " right to you."; },
      expect: ["culture", "abx", "examine"],
      follow: function (p) {
        if (p.onAbx)
          return { know: "Antibiotics running.",
                   now: "A belly film if " + p.she + " " + p.pr.is + " fed, a head scan if " + p.she + " " + p.pr.is + " under thirty weeks.",
                   why: "Treatment does not tell you the diagnosis, and the two sources that change what else you do are the gut and the head. Whether " + p.she + " " + p.pr.v("look") + " better in two hours is information in its own right." };
        return { know: "Still nothing started.",
                 now: "Culture, then antibiotics.",
                 why: "That is the one thing I want changed before we hang up. If I am wrong " + p.she + " " + p.pr.has + " had two days of antibiotics; if you are wrong " + p.she + " " + p.pr.is + " in shock by six." };
      } },

    { id: "spells",
      when: function (p) { return p.spells >= 2 ? 66 : 0; },
      know: function (p) { return p.spells + " spells in an hour, at " + p.pma + " weeks."; },
      now: function (p) {
        return p.sugar ? "Culture and antibiotics. The sugar is back and it is not that."
                       : "Sugar first — it is four minutes — then examine " + p.her + ".";
      },
      why: function (p) {
        return "Spells at this age are not news; a change from " + p.hers + " own baseline is, and infection is the one that " +
               "will not wait. The sugar is cheap enough to exclude before anything else" +
               (p.sent >= 3 ? ", and with " + p.sent + " tests sent tonight anaemia is worth a thought too" : "") +
               ". Prematurity is the answer you arrive at last, not first, because it is the one you cannot treat.";
      },
      ask: function (p) { return "Get me a sugar, and tell me whether " + p.she + " " + p.pr.v("look") + " right when your hands are on " + p.her + "."; },
      expect: ["glucose", "examine", "culture"],
      follow: function (p) {
        if (p.sugar && p.sugar.glucose < CL.glucose.low)
          return { know: "Sugar of " + p.sugar.glucose + ".",
                   now: "Bolus, then turn the infusion up.",
                   why: "That will cause spells on its own, and it is reversible in minutes. The bolus treats the next ten minutes and the infusion treats the next ten hours — a bolus alone is a bounce, and you will be back here." };
        if (has(p.exam, "overall", /does not look right|lethargic/))
          return { know: cap(p.she) + " " + p.pr.does + " not look right, with more spells than yesterday.",
                   now: "Culture now, antibiotics straight after.",
                   why: "That sentence is the most reliable sign in neonatal medicine and it beats every number on your screen. Perfusion goes next, and the blood pressure last — by the time that moves you are behind." };
        return { know: "Nothing new since we spoke.",
                 now: "Examine " + p.her + ", and culture if " + p.she + " " + p.pr.v("look") + " off.",
                 why: "Infection is the one I cannot leave on the list untreated, and the examination is the only thing that will move it." };
      } },

    { id: "notright",
      when: function (p) {
        var e = p.exam; if (!e) return 0;
        var w = 0;
        if (has(e, "overall", /does not look right|lethargic/)) w = 74;
        if (has(e, "color", /mottled|grey|pale|dusky/)) w = Math.max(w, 64);
        if (has(e, "caprefill", /^[4-9]/)) w = Math.max(w, 64);
        return p.onAbx ? Math.max(0, w - 30) : w;
      },
      /* Name what they actually found. "Does not look right" on its own is the sentence a
         senior repeats BACK to you, and repeating it without the findings that produced it
         is the one place this whole rewrite was still doing platitude rather than fact. */
      know: function (p) {
        var bits = [];
        if (has(p.exam, "color", /mottled|grey|pale|dusky/)) bits.push(p.exam.color);
        if (has(p.exam, "caprefill", /^[4-9]/)) bits.push("refill " + p.exam.caprefill);
        if (has(p.exam, "overall", /does not look right|lethargic/)) bits.push("and " + p.she + " " + p.pr.does + " not look right to you");
        if (!bits.length) bits.push(cap(p.she) + " " + p.pr.does + " not look right to you");
        return cap(bits.join(", ")) + ".";
      },
      now: function (p) {
        return p.onAbx ? "Cover is on, so find what it has not covered — feel the belly and the fontanelle."
                       : "Culture and antibiotics, in that order.";
      },
      why: function (p) {
        return "The numbers are a lagging indicator and a baby who looks wrong is an early one. Sepsis turns this into shock " +
               "inside two hours, so it goes first whatever else is on the list — " +
               (p.feeding ? "the gut is the other candidate worth feeling for, because NEC presents exactly like this before the belly is dramatic"
                          : "a bleed in the head is the other one, and at " + p.ga + " weeks these are the days for it") +
               ". Follow perfusion, not blood pressure.";
      },
      ask: function (p) { return "Tell me the cap refill and what the belly feels like. Those two and I will know what I think."; },
      expect: ["culture", "abx", "axr", "hus"],
      follow: function (p) {
        if (p.labs.axr && p.labs.axr.f === "nec")
          return { know: "Gas in the wall of the bowel. That is NEC.",
                   now: "Feeds off, tube on free drainage, antibiotics, and get the surgeons told.",
                   why: "Pneumatosis is the diagnosis and nothing else looks like it. The belly is now the observation that matters — hourly, and a wall that changes colour is an emergency, not a note." };
        if (p.labs.hus && p.labs.hus.n && p.labs.hus.n.grade >= 2)
          return { know: "A grade " + p.labs.hus.n.grade + " bleed on the scan.",
                   now: "Steady pressure, steady CO2, and handle " + p.her + " as little as you can.",
                   why: "There is nothing to do TO a bleed and a great deal to do around it: swings in blood pressure and swings in CO2 are what extend one. The family should hear it tonight, briefly, and properly in the morning." };
        return { know: "Still nothing started.",
                 now: "Culture, then antibiotics.",
                 why: "Everything else on that list can wait an hour. Sepsis cannot, and the cost of being wrong is two days of antibiotics." };
      } },

    { id: "belly",
      when: function (p) {
        var e = p.exam; if (!e) return 0;
        if (has(e, "abdomen", /distended, firm|discoloured/)) return 82;
        if (has(e, "abdomen", /fuller than earlier|green residuals/)) return 62;
        return 0;
      },
      know: function (p) { return "A belly that is changing, green up the tube, in a baby who is being fed."; },
      now: function (p) { return "Stop the feeds, belly film, and start antibiotics."; },
      why: function (p) {
        return "NEC and a gut that is simply not ready are identical at this stage, and only the film separates them — gas in the " +
               "bowel wall is the answer and nothing else looks like it. The arithmetic is the whole decision: if I am wrong, " +
               p.she + " " + p.pr.has + " lost a few hours of milk. If you are wrong, " + p.she + " " + p.pr.v("lose") +
               " bowel, and " + p.she + " " + p.pr.v("keep") + " that for life.";
      },
      ask: function (p) { return "Feel that belly properly — tell me whether it is tight and what colour the skin over it is."; },
      expect: ["axr", "stopfeeds", "abx", "culture"],
      follow: function (p) {
        if (p.labs.axr && p.labs.axr.f === "nec")
          return { know: "Pneumatosis on the film.",
                   now: "Nil by mouth, free drainage, antibiotics, surgeons, and tell the family tonight.",
                   why: "You acted before the film and the film agreed with you, which is the right order. Platelets fall early and fast in this, so a count is worth sending alongside." };
        if (p.labs.axr && p.labs.axr.f === "dilated")
          return { know: "Dilated loops, no pneumatosis.",
                   now: "Feeds stay off, antibiotics stay on, film again in six hours.",
                   why: "That is an early film rather than a clean one. When a belly keeps changing and the film is normal, it is the belly telling the truth." };
        return { know: "No film yet.",
                 now: "Film, feeds off, antibiotics.",
                 why: "The film is the only thing standing between you and knowing, and the feeds coming off costs nothing while you wait." };
      } },

    { id: "sugar",
      when: function (p) {
        if (p.sugar && p.sugar.glucose < CL.glucose.treated) return 80;
        if (has(p.exam, "overall", /jittery|tremulous/)) return 60;
        return 0;
      },
      know: function (p) {
        return p.sugar ? "Sugar of " + p.sugar.glucose + "." : "Jittery and tremulous, and no sugar measured.";
      },
      now: function (p) {
        if (!p.sugar) return "Send a sugar. It is four minutes.";
        return (p.did["Dextrose bolus"] || p.did["Bolus"])
          ? "Turn the infusion rate up. Not another bolus."
          : "Bolus, and turn the drip up in the same breath.";
      },
      /* The reasoning has to explain the instruction that was just given. This used to
         lecture about boluses versus infusions while telling the player to go and take a
         heel prick, which is a senior answering a question nobody asked. */
      why: function (p) {
        if (!p.sugar)
          return "Jitteriness is a low sugar until a number says otherwise, and it is the cheapest thing on the list to " +
                 "exclude — a heel prick, four minutes, and free. Everything else that causes it takes longer to find and " +
                 "none of it is helped by leaving the sugar unknown.";
        return "The brain does not wait while you work out the cause, so it gets corrected first and explained second. " +
               "A bolus treats ten minutes and the infusion treats ten hours — that is why a bolus alone bounces. " +
               "If it will not stay up, the causes are a rate too low for " + p.hers + " weight, a line that has tissued, " +
               "or something burning it faster than you are giving it: sepsis, cold, or work of breathing.";
      },
      ask: function (p) { return "Send a sugar, and tell me what the dextrose and the IV rate are set to."; },
      expect: ["glucose", "dextrose", "examine"],
      follow: function (p) {
        if (p.sugar && p.sugar.glucose >= CL.glucose.treated)
          return { know: "Sugar " + p.sugar.glucose + ". Better.",
                   now: "Leave the infusion where it is and recheck in half an hour.",
                   why: "It came up because you put sugar in, which is not the same as the reason having gone away. A baby who needs repeated boluses has a second problem, and it is usually temperature or sepsis." };
        if (p.sugar)
          return { know: "Still " + p.sugar.glucose + " after what you have given.",
                   now: "Infusion rate up properly, and check the line is actually in.",
                   why: "A sugar that will not stay up is not a feeding problem any more. Look at the cannula site before anything clever — it is embarrassing how often that is the answer." };
        return { know: "Still no number.", now: "Send a sugar.",
                 why: "Jitteriness that settles after a bolus tells you the answer before the lab does, but you need the number to know how far you have to go." };
      } },

    { id: "duct",
      when: function (p) {
        var w = 0;
        if (has(p.exam, "heart", /bounding|systolic murmur/)) w = 68;
        else if (has(p.exam, "heart", /soft murmur/)) w = 52;
        if (p.pulsePressure >= 28 && p.dol >= 2) w = Math.max(w, 54);
        return p.labs.echo ? Math.max(0, w - 25) : w;
      },
      know: function (p) {
        return "Bounding pulses, pulse pressure " + p.pulsePressure + ", " + p.dol + " days old.";
      },
      now: function (p) { return "Echo before you treat."; },
      why: function (p) {
        return "That is the age a duct opens and that is what an open one feels like, but the question is not whether it is there — " +
               "most are, and most close on their own. It is whether it is big enough to matter. Ibuprofen is hard on a gut and a " +
               "kidney, so treating a murmur is all risk and no benefit. The oxygen requirement over the next few hours is better " +
               "evidence than the murmur is.";
      },
      ask: function (p) { return "Feel the pulses and tell me whether they bound, and read me the top and bottom blood pressure."; },
      expect: ["echo"],
      follow: function (p) {
        var e = p.labs.echo;
        if (e && e.f === "bigduct")
          return { know: "A large duct with significant shunting.",
                   now: "If the gut is happy, treat it. If the belly is off at all, do not.",
                   why: "Now it is a real decision rather than a finding: closing it risks the gut and the kidneys, leaving it costs lung. Once you start, urine output and the belly are hourly observations, not daily ones." };
        if (e && e.f === "smallduct")
          return { know: "Small, and not haemodynamically significant.",
                   now: "Nothing.",
                   why: "Most of these close by themselves and the treatment is worse than the disease. If the oxygen climbs over the next day somebody should look again, but not tonight." };
        if (e) return { know: "Duct closed, heart structurally normal.",
                        now: "Look elsewhere for the oxygen.",
                        why: "That is an echo doing its proper job — it has excluded something, which is worth as much as finding it. Whatever is driving the oxygen is not the heart." };
        return { know: "No echo yet.", now: "Get it.",
                 why: "I am not treating a murmur down a telephone, and the pulse pressure alone will not settle it." };
      } },

    { id: "jaundice",
      when: function (p) {
        var bl = p.labs.bili && p.labs.bili.n;
        if (bl && bl.bili > bl.threshold - 2) return 58;
        if (!p.labs.bili && has(p.exam, "skin", /jaundiced/)) return 56;
        return 0;
      },
      know: function (p) {
        var bl = p.labs.bili && p.labs.bili.n;
        return bl ? "Bilirubin " + bl.bili + " against a threshold of " + bl.threshold + " for " + p.her + "."
                  : "Visibly jaundiced, and no level sent.";
      },
      now: function (p) {
        if (!p.labs.bili) return "Send a level.";
        return p.photo ? "Keep the light on and recheck in six hours." : "Start phototherapy.";
      },
      why: function (p) {
        return "There is no normal bilirubin — the threshold is drawn for " + p.hers + " gestation and age in hours and rises " +
               "through the first days, so a level without one means nothing and you cannot grade it by eye. Light is cheap and " +
               "very safe; kernicterus is neither. What decides whether somebody comes in tonight is the RATE: a level that jumps " +
               "between samples is a different disease from one that drifts.";
      },
      ask: function (p) { return "Send a bilirubin and read me the level and the threshold together."; },
      expect: ["bili", "photo"],
      follow: function (p) {
        var bl = p.labs.bili && p.labs.bili.n;
        if (bl && p.photo && bl.bili > bl.threshold)
          return { know: "Still " + bl.bili + ", above the line, with the light on.",
                   now: "More light surface, and send a blood count.",
                   why: "Ordinary jaundice turns around under light, so one that does not is asking a different question. A falling haemoglobin alongside a rising bilirubin is haemolysis, and that needs somebody to come in." };
        if (bl) return { know: "Level " + bl.bili + ", threshold " + bl.threshold + ".",
                         now: bl.bili > bl.threshold ? "Phototherapy." : "No light needed yet. Recheck against the rising threshold.",
                         why: "You have both numbers, which is the whole decision — the gap between them, not the level. Babies under lights lose more water than people expect, so watch the fluids if it goes on." };
        return { know: "Still no level.", now: "Send one.",
                 why: "Without the threshold beside it a bilirubin is not interpretable, and by eye you will miss it entirely on some babies' skin." };
      } },

    { id: "pale",
      when: function (p) {
        if (p.cbc && p.cbc.hgb < CL.hgb.flagAt) return 60;
        if (!p.cbc && has(p.exam, "color", /pale/)) return 50;
        return 0;
      },
      know: function (p) {
        return (p.cbc ? "Haemoglobin " + p.cbc.hgb + ". " : "Pale, and no count. ") +
               "You have sent " + p.sent + " tests tonight.";
      },
      now: function (p) {
        if (!p.cbc) return "Send a count, and add up what has been taken this week.";
        return (p.spells >= 2) ? "Transfuse " + p.her + "." : "Watch it. Recheck tomorrow.";
      },
      why: function (p) {
        return "They do not make red cells well for the first months and every test we send takes some away, so the commonest " +
               "cause is us. The decision is made on the baby rather than the number — spells, work of breathing, whether " + p.she +
               " " + p.pr.is + " feeding and growing — because every transfusion is a decision you cannot take back. " +
               "A fall that is fast rather than slow is bleeding, and that is a different problem.";
      },
      ask: function (p) { return "Send a blood count, and tell me what colour " + p.she + " " + p.pr.is + " against the sheet."; },
      expect: ["cbc", "transfuse"],
      follow: function (p) {
        if (p.cbc && p.cbc.hgb < CL.hgb.flagAt && p.spells >= 2)
          return { know: "Haemoglobin " + p.cbc.hgb + ", and spelling with it.",
                   now: "Transfuse.",
                   why: "It is not the number that tips this, it is the number plus a baby who is struggling to do the same things. If the spells settle over the next few hours, that was your answer." };
        if (p.cbc && p.cbc.crp > CL.ref.crp.hi)
          return { know: "And the CRP is " + p.cbc.crp + ".",
                   now: "Culture and antibiotics if they are not already running.",
                   why: "That changes the conversation — this is not just anaemia. A CRP is slow, so a normal early one would not have cleared " + p.her + " either." };
        if (p.cbc) return { know: "Low, but " + p.she + " " + p.pr.is + " coping.",
                            now: "Watch. Recheck tomorrow.",
                            why: "Transfusing a baby who is managing buys you nothing and costs " + p.her + " an exposure. Spells, feeding and a creeping oxygen need are what would change my mind." };
        return { know: "No count yet.", now: "Send one.",
                 why: "And add up what has been taken this week while you wait — that total is often the whole explanation." };
      } },

    { id: "ventsettings",
      when: function (p) { return !p.vented ? 0 : p.pip > 24 ? 56 : p.pip > 21 ? 44 : 0; },
      know: function (p) { return "Peak pressure " + p.pip + ", rate " + p.ventRate + "."; },
      now: function (p) { return "Send a gas, then wean the pressure."; },
      why: function (p) {
        return "Lungs remember the pressure they were given, for years, and settings creep up because every change was reasonable " +
               "at the time and nobody owned the weaning. Let the CO2 run a little high on purpose — that is a choice, not a " +
               "failure. The number to be frightened of is a LOW one: it clamps the vessels in the brain, which is how you cause " +
               "the injury you are trying to prevent.";
      },
      ask: function (p) { return "Get me a gas. I do not wean on a guess."; },
      expect: ["gas", "vent"],
      follow: function (p) {
        var g = p.gas;
        if (g && g.co2 < CL.ref.co2.lo)
          return { know: "CO2 of " + g.co2 + " — too low.",
                   now: "Rate down first, then pressure. Now.",
                   why: "On a preemie brain that is not a harmless number. Aim for the high end of normal rather than the middle, and repeat the gas in an hour." };
        if (g && g.co2 > CL.co2.permissiveHigh)
          return { know: "CO2 " + g.co2 + " on that pressure.",
                   now: "Listen and suction before you go up.",
                   why: cap(p.she) + " " + p.pr.is + " not over-ventilated, " + p.she + " " + p.pr.is + " not clearing it, which is a different problem with a different answer. Whether the chest moves is worth more than the number you have dialled in." };
        if (g) return { know: "A reasonable gas on a peak pressure of " + p.pip + ".",
                        now: "Down a couple of points, then gas " + p.her + " again.",
                        why: cap(p.she) + " " + p.pr.is + " doing better than the settings think " + p.she + " " + p.pr.is + ". If " + p.she + " " + p.pr.v("start") + " working after the change, you came down too fast — that is the signal to watch, not the saturation." };
        return { know: "No gas.", now: "Send one.",
                 why: "Weaning without one is guessing in a direction that costs either lung or brain." };
      } },

    { id: "pressure",
      when: function (p) {
        var under = (p.ga + CL.map.concernAt) - p.map;
        return under > 0 ? 58 + Math.min(10, under) : 0;
      },
      know: function (p) { return "Mean pressure " + p.map + " at " + p.ga + " weeks."; },
      now: function (p) {
        return p.exam ? "Send a gas for the base deficit."
                      : "Go and feel " + p.her + " — cap refill and how the feet feel.";
      },
      why: function (p) {
        return "The rule that the mean should match the gestation was made up and has never been shown to help anybody, so it is a " +
               "reason to look rather than to treat. The question is whether that number is doing harm, and the base deficit " +
               "answers it: a well-perfused baby with a low number needs watching, and a poorly perfused baby with a normal number " +
               "needs treating. Treating the number itself is how babies end up on dopamine who never needed it.";
      },
      ask: function (p) { return "Tell me the cap refill and how the feet feel, and send a gas for the base deficit."; },
      expect: ["examine", "gas", "bolus"],
      follow: function (p) {
        var g = p.gas;
        if (g && g.baseDeficit > CL.ref.baseDeficit.hi)
          return { know: "Base deficit " + g.baseDeficit + ".",
                   now: "Volume, and look hard for sepsis at the same time.",
                   why: "That settles it — " + p.she + " " + p.pr.is + " making acid to keep going, so the number is doing harm. A deficit that clears after volume is the treatment working; one that does not means the cause is still running." };
        if (g) return { know: "Base deficit " + g.baseDeficit + ", which is fine.",
                        now: "Nothing.",
                        why: cap(p.she) + " " + p.pr.is + " perfusing despite the number, and that is the answer to the only question worth asking. Urine output is what would change my mind." };
        if (has(p.exam, "caprefill", /^[4-9]/) || has(p.exam, "color", /mottled|grey/))
          return { know: "Slow refill and the colour off.",
                   now: "Bolus now, and a gas — do not wait for the gas.",
                   why: "The number has company, and company is what turns a number into a patient. Whether the refill improves with the volume is your answer within twenty minutes." };
        return { know: "Perfusion all right.", now: "Watch " + p.her + ".",
                 why: "I am still not treating the number. Refill and urine output are the things that would move me, and the pressure is the last thing to go." };
      } },

    { id: "cold",
      when: function (p) { return p.temp < CL.temp.coldStress ? 52 : 0; },
      know: function (p) {
        return "Temperature " + p.temp.toFixed(1) + (p.isoOpen ? ", and the incubator is open" : "") + ".";
      },
      now: function (p) {
        return (p.isoOpen ? "Shut the portholes, then warm " + p.her + " — servo on." : "Warm " + p.her + ", servo on.");
      },
      why: function (p) {
        return "A cold baby burns sugar faster, makes acid, and responds badly to everything else you are about to do, so this " +
               "goes first even though it does not look like the emergency. " +
               (p.isoOpen ? "A porthole that has not clicked shut takes half a degree an hour off a baby this size, and it is nobody's fault. "
                          : "") +
               "What matters is whether " + p.she + " " + p.pr.v("stay") + " warm: a preemie with an infection goes COLD rather " +
               "than hot, so one who slides back down after you have warmed " + p.her + " is not a heating problem.";
      },
      ask: function (p) { return "Check the portholes and the servo, warm " + p.her + ", and tell me in half an hour whether it held."; },
      expect: ["examine", "warm"],
      follow: function (p) {
        if (p.temp >= CL.temp.coldStress)
          return { know: "Temperature " + p.temp.toFixed(1) + ". Warm again.",
                   now: "Servo on, and leave " + p.her + " alone.",
                   why: "Notice how much easier the rest of " + p.hers + " numbers look now — that is the point of doing it first. Sliding back down is the thing that would worry me." };
        return { know: "Still " + p.temp.toFixed(1) + " after warming.",
                 now: "Examine " + p.her + " and think about infection.",
                 why: "If warming has not worked it is not a warming problem. A cold preemie with a septic screen pending gets antibiotics, not another blanket." };
      } },

    { id: "imaging",
      when: function (p) {
        var f = p.labs.cxr && p.labs.cxr.f, h = p.labs.hus && p.labs.hus.n;
        if (f && f !== "clear") return 86;
        if (h && h.grade >= 2) return 80;
        return 0;
      },
      know: function (p) {
        var f = p.labs.cxr && p.labs.cxr.f;
        if (f === "ptx") return "The film shows an air leak with the lung down.";
        if (f === "ettlow") return "The tube is in the right main bronchus.";
        if (f === "rds") return "Ground-glass with air bronchograms.";
        if (f === "collapse") return "Patchy collapse on the film.";
        return "A grade " + p.labs.hus.n.grade + " bleed on the scan.";
      },
      now: function (p) {
        var f = p.labs.cxr && p.labs.cxr.f;
        if (f === "ptx") return "Needle it, then a drain.";
        if (f === "ettlow") return "Pull the tube back two centimetres and listen to both sides.";
        if (f === "rds") return "Surfactant if " + p.she + " " + p.pr.is + " due it, and get the pressure right rather than the oxygen.";
        if (f === "collapse") return "Suction, then look at the oxygen again.";
        return "Steady pressure, steady CO2, minimal handling — and tell the parents tonight.";
      },
      why: function (p) {
        var f = p.labs.cxr && p.labs.cxr.f;
        if (f === "ptx") return "A leak under tension kills by stopping the heart filling, so it is drained rather than watched. The saturation should answer you within a few breaths.";
        if (f === "ettlow") return "That is why one side is doing all the work, and why the oxygen has not responded to anything you have changed. Measure at the lip and expect to suction the side it was pushed into.";
        if (f === "rds") return "That film IS the diagnosis — stiff lungs, evenly. More oxygen does nothing for lungs that are closed; pressure opens them, and surfactant keeps them open.";
        if (f === "collapse") return "Patchy usually means secretions rather than disease, which is good news and a cheap fix. If it does not improve after suction, it is worth a second look.";
        return "There is nothing to do TO a bleed and a great deal to do around it: swings in blood pressure and swings in CO2 are what make one bigger. A film is a moment — the oxygen requirement over the next hour is the disease.";
      },
      ask: function (p) { return "Read me what the film actually says, word for word."; },
      expect: ["examine", "gas", "needle", "surf"],
      follow: function (p) {
        return { know: "Done.", now: "Look at " + p.her + " again, and see whether it worked.",
                 why: "The film is history now and the baby is the thing in front of you. The oxygen and the work of breathing answer this, not another film." };
      } }
  ];

  /* Nothing wrong is still worth a call - it is the only time anybody is taught what to look
     for BEFORE it matters. Concrete, though: the first draft of this was three paragraphs of
     reassurance, which is the definition of a platitude. */
  function notable(p) {
    if (p.o2Up >= 4) return "the oxygen is up from " + p.fio2Start + " to " + p.fio2 + " percent since seven";
    if (p.fio2 >= 30) return cap(p.she) + " " + p.pr.is + " holding on " + p.fio2 + " percent";
    if (p.spells >= 1) return "there has been a spell in the last hour";
    if (p.vented) return cap(p.she) + " " + p.pr.is + " on the ventilator at " + p.pip + " over " + p.peep;
    if (p.temp >= CL.temp.feverAmber) return "the temperature is " + p.temp.toFixed(1);
    if (p.hr >= 180) return "the heart rate is " + p.hr;
    if (p.mode === "RA") return cap(p.she) + " " + p.pr.is + " in air";
    return "the numbers are where the day team left them";
  }

  var QUIET = {
    id: "quiet",
    know: function (p) {
      return cap(notable(p)) + ", temperature " + p.temp.toFixed(1) +
             (p.exam ? ", and the examination is unremarkable." : ", and nobody has examined " + p.her + ".");
    },
    now: function (p) {
      return p.exam ? "Nothing on " + p.her + ". Go to the babies who are asking for you."
                    : "Lay hands on " + p.her + ".";
    },
    why: function (p) {
      return p.exam
        ? "A flat trend and a baby who looks comfortable is a well baby, and treating one is its own harm. Three things would " +
          "change that: the oxygen requirement creeping up, more spells than " + p.she + " " + p.pr.v("have") + " been having, " +
          "and a temperature that will not sit still. Any of those and I would rather be woken."
        : "Everything you have given me came off a screen, and sepsis and a duct and a bleed all have an hour or two where the " +
          "numbers are still normal. Five minutes of colour, belly, pulses and whether " + p.she + " " + p.pr.v("look") +
          " right answers questions the monitor cannot, and it is what lets you believe the monitor later.";
    },
    ask: function (p) {
      return "Go and look at " + p.her + " — colour, belly, pulses, and whether " + p.she + " " + p.pr.v("look") +
             " right. Ring me back with that.";
    },
    expect: ["examine"],
    follow: function (p) {
      var e = p.exam;
      if (!e) return { know: "Still nobody has looked.", now: "Lay hands on " + p.her + ".",
                       why: "I cannot take anything off the list from here." };
      if (has(e, "breathing", /working hard|retractions/))
        return { know: cap(p.she) + " " + p.pr.is + " working, on " + p.fio2 + " percent, and everything else is normal.",
                 now: "Nothing tonight. Write the work of breathing down so tomorrow can tell whether it changed.",
                 why: "Effort without a rising oxygen need means stiff lungs that " + p.she + " " + p.pr.is + " still winning against. The moment the oxygen creeps alongside that effort, " + p.she + " " + p.pr.has + " stopped winning, and that is the call I want." };
      if (has(e, "heart", /soft murmur/))
        return { know: "A soft murmur, nothing else.",
                 now: "Leave it.",
                 why: "Most murmurs in a preemie mean nothing and hunting them is how babies get tests they did not need. It becomes a duct worth proving when it has company: bounding pulses, a wide pulse pressure, a creeping oxygen need. Two of those and I would echo " + p.her + "." };
      return { know: "You looked, and found a well baby.",
               now: "Nothing. Spend the time where you are needed.",
               why: "A normal examination you did yourself is what lets you trust the monitor for the rest of the night. The oxygen creeping, more spells than yesterday, or a temperature that wanders are what would change it." };
    }
  };

  function weighed(p) {
    return SITUATIONS.map(function (s) { return { s: s, w: s.when(p) || 0 }; })
                     .filter(function (x) { return x.w > 0; })
                     .sort(function (a, b) { return b.w - a.w; });
  }
  function situationFor(p) {
    var ranked = weighed(p);
    return ranked.length ? ranked[0].s : QUIET;
  }

  /* One secondary thing, and only when it is concrete enough to act on. */
  var ASIDE = {
    suddendrop:   function (p) { return "that saturation comes first, whatever else we have said"; },
    gasback:      function (p) { return "repeat that gas in an hour and treat the trend"; },
    pphnKnown:    function (p) { return "nobody touches " + p.her + " unless they have to, and that includes for tests"; },
    swinging:     function (p) { return "minimal handling, while you are doing the rest"; },
    o2creep:      function (p) { return "the oxygen is up from " + p.fio2Start + " to " + p.fio2 + " tonight — that wants an explanation before morning"; },
    bloods:       function (p) { return "that white count of " + p.cbc.wbc + " does not sit unactioned"; },
    spells:       function (p) { return p.spells + " spells in an hour is a change, not a baseline"; },
    notright:     function (p) { return "you told me " + p.she + " " + p.pr.does + " not look right, and I have not forgotten it"; },
    belly:        function (p) { return "if that belly is changing at all, feeds stop tonight"; },
    sugar:        function (p) { return "the sugar gets corrected first"; },
    duct:         function (p) { return "if the oxygen keeps creeping, that duct is next"; },
    jaundice:     function (p) { return "a bilirubin before morning"; },
    pale:         function (p) { return "add up what has been taken off " + p.her + " this week"; },
    ventsettings: function (p) { return "that peak pressure of " + p.pip + " wants coming down once tonight is sorted"; },
    pressure:     function (p) { return "a mean of " + p.map + " — look at perfusion, do not treat the number"; },
    imaging:      function (p) { return "act on that film rather than filing it"; },
    cold:         function (p) { return cap(p.she) + " " + p.pr.is + " " + p.temp.toFixed(1) + ". Warm " + p.her + " first"; }
  };

  /* Two situations can be about the SAME number, and then the second one is not a useful
     aside - it is the first one disagreeing with itself. Traced on the baby this was found
     with: she said "minimal handling, nobody touches her" and then, in the next breath,
     "and while I have you, that saturation comes first, whatever else we have said". */
  var SAME_SUBJECT = {
    pphnKnown:  ["suddendrop", "swinging", "o2creep"],
    swinging:   ["suddendrop", "o2creep", "pphnKnown"],
    suddendrop: ["swinging", "o2creep"],
    o2creep:    ["swinging", "suddendrop"],
    gasback:    ["ventsettings"],
    bloods:     ["pale"],
    pale:       ["bloods"]
  };
  function alsoWorth(p, chosen) {
    var skip = SAME_SUBJECT[chosen.id] || [];
    var ranked = weighed(p).filter(function (x) {
      return x.s !== chosen && x.w >= 50 && ASIDE[x.s.id] && skip.indexOf(x.s.id) < 0;
    });
    return ranked.length ? "And while I have you — " + ASIDE[ranked[0].s.id](p) + "." : null;
  }

  // ----------------------------------------------------------------- the call
  /* What we know, what to do next, and why. Every time, in that order. Plain text with
     blank lines, because the same words go to the modal, to this cot's history and to a
     screen reader. */
  function consultText(p, s, follow) {
    var know = follow ? follow.know : s.know(p);
    var now = follow ? follow.now : s.now(p);
    var why = follow ? follow.why : s.why(p);
    var parts = ["“" + know + "”", "Do — " + now, "Why — " + why];
    var also = alsoWorth(p, s);
    if (also) parts.push(also);
    return parts.join("\n\n");
  }

  function delivered(p, prev) {
    if (!prev || !prev.expect) return false;
    var b = p.b, since = prev.at;
    return prev.expect.some(function (want) {
      if (want === "examine") return b.examinedAt > since;
      if (p.labs[want] && p.labs[want].at > since) return true;
      return (b.history || []).some(function (r) {
        return r.kind === "did" && r.at > since && r.text.toLowerCase().indexOf(want) >= 0;
      });
    });
  }
  function didAnything(p, prev) {
    if (!prev) return false;
    var b = p.b, since = prev.at;
    return (b.history || []).some(function (r) { return r.kind === "did" && r.at > since; }) ||
           Object.keys(p.labs).some(function (k) { return p.labs[k] && p.labs[k].at > since; }) ||
           b.examinedAt > since;
  }

  /* `told` is which door the player went through on the FIRST call: true for "here is what
     I am seeing", false for "I am not sure". Every call after that is told = true, because
     once she is holding the case she just tells you. */
  function consult(b, told) {
    var p = picture(b);
    var prev = b.h.consult || null;
    var s = situationFor(p);
    var sameThread = prev && prev.id === s.id;
    var answered = delivered(p, prev);
    var mode, body;

    if (!told) {
      mode = prev && sameThread && !didAnything(p, prev) ? "askagain" : "ask";
      body = (mode === "askagain" ? "“Same question as last time. " : "“") + s.ask(p) + "”";
    } else if (!prev || prev.mode === "ask" || prev.mode === "askagain") {
      mode = "first"; body = consultText(p, s, null);
    } else if (answered) {
      mode = "follow"; body = consultText(p, s, s.follow(p, prev));
    } else if (sameThread) {
      mode = "nothingnew";
      body = "“Nothing new since we spoke " + ago(G.min - prev.at) + ".”\n\nDo — " + s.now(p) + "\n\nWhy — " + s.why(p);
    } else { mode = "changed"; body = "“That is not what you told me " + ago(G.min - prev.at) + ".”\n\n" + consultText(p, s, null); }

    b.h.consult = { id: s.id, at: G.min, mode: mode, expect: s.expect || [] };
    return { picture: p, situation: s, mode: mode, text: body,
             headline: told === false ? s.ask(p) : s.know(p) };
  }

  NG.consult = consult;
  NG.consultPicture = picture;
  NG.consultSituations = SITUATIONS;
  NG.consultAbnormal = abnormal;
})();
