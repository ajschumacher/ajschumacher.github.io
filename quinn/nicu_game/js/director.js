/* NICU Night Shift — the director.

   Who asks you for what, and when. Three separate systems, and js/events.js holds what
   each of them says:

     CONCERNS  a colleague notices something about one baby and comes to find you. You go
               to the cot, hear it, and then act with the real controls; the concern judges
               the action, not a menu choice.
     TALKS     someone wants a conversation, and you choose when to have it.
     CALLS     the phone rings, and you choose whether to pick it up.
     CRISES    the three set pieces, which unlike a concern you cannot walk away from.

   Plus the open porthole, which is the one thing in here that is nobody's decision: a
   parent sits with their baby, the porthole does not quite click shut, and a 25-weeker
   loses half a degree.

   Split out of game.js. Nothing changed in the move - the bodies are the ones that were
   there - and what they reach for outside this file is listed at the top rather than being
   implicit in a shared closure. Everything is looked up when it is CALLED, so the only
   load-order rule is that game.js comes first.                                       */
(function () {
  "use strict";
  var G = window.G, S = window.Sim, EV = window.Events, A = window.Art,
      Snd = window.Sound, GL = window.Glossary, CL = window.Clinical;
  var NG = window.NG || (window.NG = {});

  /* ---- What this file borrows, resolved at call time. ---- */
  function $(id) { return NG.$(id); }
  function esc(s) { return NG.esc(s); }
  function gl(s) { return NG.gl(s); }
  function cap(s) { return NG.cap(s); }
  function say(v, b) { return NG.say(v, b); }
  function log(m, k) { return NG.log(m, k); }
  function addScore(n, w, k) { return NG.addScore(n, w, k); }
  function announce(m) { return NG.announce(m); }
  function notice() { return NG.notice(); }
  function byBed(n) { return NG.byBed(n); }
  function clockStr(m) { return NG.clockStr(m); }
  function actionLabel(id, b) { return NG.actionLabel(id, b); }
  function recordHistory(b, k, t) { return NG.recordHistory(b, k, t); }
  function setNote(b, k, t, o) { return NG.setNote(b, k, t, o); }
  function shortLabel(t, n) { return NG.shortLabel(t, n); }
  function showDialog(cfg) { return NG.showDialog(cfg); }
  function render() { return NG.render(); }
  function renderBedCallout(b) { return NG.renderBedCallout(b); }
  function renderBedPeople(b) { return NG.renderBedPeople(b); }

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
  /* A flat 8 was tuned when the unit had nine kinds of concern in it. There are twenty-four
     now, eight of them urgent, and urgent was the only severity that bypassed the cap - so
     measured across eight shifts the queue sat at or over it 49 percent of the time, and
     while it did, the urgent ones starved out every quieter signal in the game: `jittery`
     forty-nine times, `murmur`, `yellow`, `cold`, `nocaffeine`. Those are the only things
     pointing at hypoglycaemia, the duct, jaundice and a cold baby.

     A player can ignore a row in a panel. They cannot act on something they were never told,
     and the panel already ranks by severity, so a longer list is not a louder one. The cap
     scales with the census and is a brake on a pile-up, not a permanent silence. */
  function queueCap() {
    var alive = G.babies.filter(function (b) { return !b.died && !b.discharged; }).length;
    return Math.max(6, alive * 3);
  }

  /* ===================================================================
     HOW OFTEN ONE PERSON SAYS ONE THING

     Measured across fourteen shifts, 58 percent of everything a colleague said was them
     saying something they had already said about the same baby - and it was WORSE for a
     player who engaged: 62 percent, and up to ten raises of a single concern at a single
     cot. Answering a concern closes it, which restarts its cooldown, so a condition you
     have acknowledged but not yet fixed comes straight back; leaving it open suppresses
     its own re-raise. The game was quieter if you ignored it.

     Two brakes, both of which a real unit has:

     A BUDGET. Nobody asks you the same thing indefinitely. They ask, they ask again, and
     then they either escalate past you or accept the plan and get on with their night -
     and the miss is already scored at handover either way, so nothing is lost by their
     stopping. Urgent gets more goes than a note, because a baby in trouble has to keep
     reaching you.

     A COOLDOWN THAT GROWS. The second time is sooner than the third. This spreads the
     goes a concern does have across the night instead of clustering them.

     Deliberately NOT a lower cap on the queue: the queue was not the problem. Twenty-four
     kinds of concern and eleven seen per shift is good variety - it was the same eleven
     saying themselves three and four times over.

     Measured over fourteen shifts each way, for a player who answers everything:

         raises a shift   40.3 -> 25.0
         of those, repeats 24.8 -> 9.5
         worst one concern at one cot   10x -> 4x
         DIFFERENT kinds of concern seen   11.1 -> 11.1, unchanged

     Three things it deliberately does not touch. Coverage is identical across all
     twenty-one concerns that appear - 14-in-14 stayed 14-in-14 and 3-in-14 stayed 3-in-14 -
     because a budget only ever blocks a third or fourth repeat, never a first mention. The
     scoring is identical, because concernTally already counted by key and repeats never
     inflated the denominator. And a baby who keeps deteriorating still reaches you: driven
     into septic shock, one baby still drew jittery, tiring, notright and lowbp, still set
     off the crisis, and was still named at handover - what a worsening baby does is bring
     you MORE voices, not the same one louder, which is both the truer picture and the
     better lesson. */
  var PACING = {
    budget: { urgent: 4, worry: 3, note: 2 },
    cooldownGrowth: 1.6
  };
  function raiseBudget(c) { return PACING.budget[c.severity] || 3; }
  function cooldownFor(c, key) {
    var n = (G.raiseCount && G.raiseCount[key]) || 0;
    return (c.cooldown || 90) * Math.pow(PACING.cooldownGrowth, n);
  }

  function raiseConcerns() {
    var openNow = G.concerns.filter(function (x) { return !x.done; }).length +
                  G.talks.filter(function (t) { return !t.done; }).length;
    var cap = queueCap();
    G.raiseCount = G.raiseCount || {};
    EV.CONCERNS.forEach(function (c) {
      G.babies.forEach(function (b) {
        if (b.died || b.discharged) return;
        var key = c.id + ":" + b.bed;
        if (G.concerns.some(function (x) { return x.key === key && !x.done; })) return;
        if ((G.raiseCount[key] || 0) >= raiseBudget(c)) return;
        if (G.cooldowns[key] && G.min - G.cooldowns[key] < cooldownFor(c, key)) return;
        if (openNow >= cap && c.severity !== "urgent") return;
        if (!c.cond(G, b)) return;
        openNow++;
        G.raiseCount[key] = (G.raiseCount[key] || 0) + 1;
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
      /* Charged once too. The accept above has been paid once per action per concern since
         a player could otherwise hold one button down and earn the judgement domain
         outright - and the penalty had no such guard, so nudging a slider up three times
         cost three times over for one mistake. The colleague still answers every press. */
      c.credited = c.credited || {};
      if (!c.credited[actionId]) {
        c.credited[actionId] = true;
        addScore(bad.score, (actionLabel(actionId, b) || "That adjustment") +
                            " was the wrong answer for " + b.name);
      }
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

  /* ---- And what it hands back. game.js and the render layer keep thin delegates, so no
     call site anywhere had to change. ---- */
  NG.PACING = PACING;          // exposed so the pacing can be measured and retuned in place
  NG.checkPortholes = checkPortholes;
  NG.raiseConcerns = raiseConcerns;
  NG.reviewConcerns = reviewConcerns;
  NG.escalateConcerns = escalateConcerns;
  NG.raiseTalks = raiseTalks;
  NG.expireTalks = expireTalks;
  NG.updateCalls = updateCalls;
  NG.checkCrisis = checkCrisis;
  NG.startCrisis = startCrisis;
  NG.startTalk = startTalk;
  NG.judgeConcern = judgeConcern;
  NG.declineConcern = declineConcern;
  NG.dismissConcern = dismissConcern;
  NG.concernsAt = concernsAt;
  NG.openConcernFor = openConcernFor;
  NG.activeConcernFor = activeConcernFor;
  NG.otherConcernsAt = otherConcernsAt;
  NG.firstName = firstName;
  NG.pushReply = pushReply;
  NG.replyClass = replyClass;
  NG.anyFresh = anyFresh;
})();
