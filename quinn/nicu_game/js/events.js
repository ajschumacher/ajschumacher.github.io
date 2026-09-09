/* NICU Night Shift — the people.

   Three separate systems, deliberately:

   CONCERNS  a colleague notices something about a specific baby and asks you to come.
             You go to the bedside, hear what they saw, and then DO something with the
             real controls. The concern judges your action, not a menu choice.
   TALKS     someone wants a conversation. You choose when to have it. These are the
             only multiple-choice moments, because a conversation genuinely is one.
   CALLS     the phone rings. You decide whether to pick it up. Important callers ring
             back; unimportant ones give up.                                          */
(function () {
  "use strict";
  var S = window.Sim, NB = window.NameBank;

  var SHE = NB.PRON[0], HE = NB.PRON[1];

  var CHARS = {
    renata:  { name: "Renata Cruz, RN",      role: "Night nurse, beds 1-3. Twenty years here.", av: "renata", pr: SHE },
    desmond: { name: "Desmond Oyelaran, RN", role: "Night nurse, beds 4-6. Two years in.",      av: "desmond", pr: HE },
    priya:   { name: "Priya Raman, RRT",     role: "Respiratory therapist",                      av: "priya", pr: SHE },
    tomas:   { name: "Tomas Alvarez, PharmD", role: "NICU pharmacist",                           av: "tomas", pr: HE },
    ingrid:  { name: "Dr. Ingrid Halvorsen", role: "Attending neonatologist, on call from home", av: "ingrid", pr: SHE },
    nell:    { name: "Nell Okafor",          role: "Unit clerk",                                 av: "nell", pr: SHE },
    phone:   { name: "Switchboard",          role: "",                                           av: "phone", pr: SHE }
  };

  function nurseFor(b) { return b.bed <= 3 ? "renata" : "desmond"; }
  // the pronoun of whichever nurse holds this bed, for lines they say about themselves
  function nursePr(b) { return CHARS[nurseFor(b)].pr; }
  function pct(b) { return Math.round(b.support.fio2 * 100); }
  function Cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ==================================================================== CONCERNS
     accept  : actions that address the concern  -> { fb, score, resolve }
     partial : reasonable but incomplete         -> { fb, score, resolve? }
     wrong   : actively counterproductive        -> { fb, score }
     miss    : what it costs if you never come                                    */
  var CONCERNS = [
    {
      id: "spells", who: nurseFor, severity: "worry", cooldown: 150,
      cond: function (G, b) { return b.h.spells >= 3 && b.h.spellsThisHour >= 2 && !b.h.abx; },
      summary: function (G, b) { return "having repeated spells"; },
      say: function (G, b) {
        return "That is " + b.h.spellsThisHour + " spells this hour, and I have had to stimulate " +
               b.pronoun.o + " every time. " + b.pronoun.S + " " + b.pronoun.was + " quiet all day. Something is different tonight.";
      },
      nudge: "A change from a baby's own baseline is the signal. What makes a preemie suddenly have more spells?",
      help: "Under Assess: a blood count, a sugar, a culture. Under Treat: antibiotics if you think this is" +
            " infection. The question is what changed tonight, so look before you reach for a dial.",
      settled: "The spells have settled by themselves and the hour has been quiet.",
      accept: {
        culture: { fb: "Good. Culture first, then antibiotics can go in.", score: 4, resolve: false },
        abx: { fb: "Antibiotics running. Increasing spells in a baby with risk factors is sepsis until proven otherwise.", score: 7, resolve: true },
        cbc: { fb: "Sensible. Anaemia and infection both show up here.", score: 4, resolve: false },
        glucose: { fb: "Quick and cheap. Low sugar causes spells too.", score: 3, resolve: false },
        examine: { fb: "You lay hands on " + "the baby before ordering anything. Always the right first move.", score: 3, resolve: false }
      },
      wrong: {
        photo: { fb: "Phototherapy has nothing to do with spells.", score: -2 }
      },
      decline: { fb: function (G, b) { var n = nursePr(b);
        return "\"Alright.\" " + n.S + " " + n.does + " not look convinced, and " + n.s + " " + n.is +
               " right not to be. A baby whose spell count has changed deserves an explanation."; }, score: -3, resolve: false },
      miss: { fb: "The spells kept coming all night and nobody looked for a cause.", score: -6 }
    },
    {
      id: "probe", who: nurseFor, severity: "worry", cooldown: 60,
      cond: function (G, b) { return b.h.artifactProbe && b.h.artifactProbeAt >= 10; },
      summary: function () { return "a saturation reading that does not fit"; },
      say: function (G, b) {
        return "The monitor says " + b.mon.spo2 + " percent. But look at " + b.pronoun.o +
               " - pink, wriggling, breathing away. Do you want me to turn the oxygen up?";
      },
      nudge: "The monitor and the baby are telling you different things. Only one of them can be wrong.",
      help: "Nothing here needs a drug. Under Procedures, Fix probe / leads reseats the sensor; under Assess," +
            " Examine tells you whether to believe the monitor or the baby. You can also decline to turn the" +
            " oxygen up.",
      settled: "The probe has settled back onto the foot and the trace looks honest again.",
      accept: {
        reposition: { fb: "The probe had worked its way off the foot. Machines report; humans judge.", score: 7, resolve: true },
        examine: { fb: "You look at the baby first. Pink, warm, active - so the number is the thing that is wrong.", score: 5, resolve: false }
      },
      wrong: {
        __fio2up: { fb: "You have just given oxygen to a baby who was already pink. The probe was the problem.", score: -4 }
      },
      decline: { fb: "\"Good - I did not want to turn it up either.\" Refusing to chase a number you do not trust is exactly right. The probe is still not reading properly though.", score: 3, resolve: false },
      miss: { fb: "The probe stayed off for a long time, and nobody could trust that monitor all night.", score: -3 }
    },
    {
      id: "highsat", who: nurseFor, severity: "note", cooldown: 90,
      cond: function (G, b) { return b.support.fio2 > 0.23 && b.h.highSatMinutes > 25 && !b.h.artifactProbe; },
      summary: function (G, b) { return "sitting high on extra oxygen"; },
      say: function (G, b) {
        return b.pronoun.S + " " + b.pronoun.has + " been at " + b.mon.spo2 + " percent on " + pct(b) +
               " percent oxygen for a while now. Shall we come down?";
      },
      nudge: "Ninety to ninety-five is the target for a preemie on oxygen. What is the harm in sitting above it?",
      help: "In the Respiratory support panel, the Oxygen slider. Small steps, then watch the saturation come" +
            " down into the nineties.",
      settled: "The saturation has come back into the target range on its own.",
      accept: {
        __fio2down: { fb: "Right. Above 95 on extra oxygen is where retinopathy of prematurity comes from.", score: 6, resolve: true }
      },
      wrong: {
        __fio2up: { fb: "The wrong direction entirely. Oxygen is a medicine with a dose.", score: -5 }
      },
      decline: { fb: "\"You are the doctor.\" But time spent above 95 percent on extra oxygen is time the eyes and lungs are paying for.", score: -3, resolve: false },
      miss: { fb: "Hours of unnecessary oxygen, and the eyes and lungs keep the bill.", score: -4 }
    },
    {
      id: "risingwork", who: "priya", severity: "urgent", cooldown: 100,
      cond: function (G, b) { return b.support.fio2 >= 0.45 && b.support.mode !== "VENT" && S.workOfBreathing(b) > 0.5; },
      summary: function (G, b) { return "working hard on " + pct(b) + " percent oxygen"; },
      say: function (G, b) {
        return "We are up to " + pct(b) + " percent on CPAP and " + b.pronoun.s + " " + b.pronoun.is + " working hard for it - " +
               "grunting, deep retractions. This baby is telling us something.";
      },
      nudge: "More oxygen only helps if the air sacs are open. What opens stiff lungs?",
      help: "Assess for a blood gas or a chest film; Treat for surfactant, which needs a tube first from" +
            " Procedures. More oxygen on the slider is not the answer here.",
      settled: "The work of breathing has eased off and the oxygen need has come back down.",
      accept: {
        gas: { fb: "A gas will tell you whether this is an oxygen problem or a ventilation problem.", score: 5, resolve: false },
        surfactant: { fb: "Surfactant fixes the actual problem instead of pushing more oxygen through stiff lungs.", score: 8, resolve: true },
        intubate: { fb: "A tube, so surfactant can go down it. Priya is already drawing it up.", score: 5, resolve: false },
        cxr: { fb: "A chest film will show you what those lungs actually look like.", score: 4, resolve: false }
      },
      wrong: {
        __fio2up: { fb: "You can only push oxygen so far into lungs that will not open.", score: -4 }
      },
      decline: { fb: function (G, b) {
        return "Priya raises an eyebrow. \"I will keep bagging if " + b.pronoun.s + " " + b.pronoun.v("tire") +
               ", then.\" A baby working this hard on this much oxygen rarely improves by being left."; }, score: -4, resolve: false },
      miss: { fb: "The baby wore out slowly and nobody changed the plan.", score: -7 }
    },
    {
      id: "highpip", who: "priya", severity: "worry", cooldown: 120,
      cond: function (G, b) { return b.support.mode === "VENT" && b.support.pip > (b.ga < 30 ? 21 : 25); },
      summary: function (G, b) { return "on a high ventilator pressure"; },
      say: function (G, b) {
        return "Peak pressure is " + b.support.pip + " on a baby this size. Gentle ventilation, remember. " +
               "Pressure can heal and pressure can tear.";
      },
      nudge: "You can lower the pressure directly, or make the lungs need less of it. Both are on the panel.",
      help: "In the Respiratory support panel, the Peak (PIP) slider comes down directly. Treat, and" +
            " surfactant, makes the lungs need less of it in the first place.",
      settled: "The peak pressure has come back to somewhere reasonable.",
      accept: {
        __pipdown: { fb: "Lower pressure, and we tolerate a higher CO2 to spare the lungs. That trade is how chronic lung disease rates came down.", score: 6, resolve: true },
        surfactant: { fb: "Treating the compliance rather than the dial. Now the pressure can come down honestly.", score: 6, resolve: true }
      },
      wrong: {
        __pipup: { fb: "Higher still. Those lungs will remember this in six weeks.", score: -5 }
      },
      decline: { fb: "\"Understood.\" Priya writes the pressure in the notes. Lungs remember the pressure they were given.", score: -3, resolve: false },
      miss: { fb: "Hours at a damaging pressure.", score: -5 }
    },
    {
      id: "cold", who: nurseFor, severity: "worry", cooldown: 80,
      cond: function (G, b) { return b.h.coreTemp < 36.2; },
      summary: function (G, b) { return "cold at " + b.h.coreTemp.toFixed(1) + " degrees"; },
      say: function (G, b) {
        return "Temperature is " + b.h.coreTemp.toFixed(1) + ". " +
               (b.support.isoOpen ? "The portholes have been open a while. " : "") +
               "Cold babies burn through their sugar and start having spells.";
      },
      nudge: "Warmth is not a comfort measure in a preemie. It is treatment.",
      help: "In the Respiratory support panel, the Isolette slider sets the bed temperature. Under Care," +
            " kangaroo care warms a baby better than any machine, if a parent is here.",
      settled: "The temperature has come back up into range.",
      accept: {
        __warmer: { fb: "Isolette closed and the heat up. Warm, pink and sweet, in that order.", score: 6, resolve: true },
        kangaroo: { fb: "A parent's chest holds a baby's temperature beautifully, and steadies the heart rate too.", score: 7, resolve: true },
        comfort: { fb: "Nested and covered. It helps, but check the isolette settings too.", score: 2, resolve: false }
      },
      wrong: {},
      decline: { fb: "\"I will keep checking it.\" A cold baby burns sugar and oxygen it needed for growing.", score: -3, resolve: false },
      miss: { fb: "The baby stayed cold, burning sugar and oxygen it needed for growing.", score: -5 }
    },
    {
      id: "residuals", who: nurseFor, severity: "urgent", cooldown: 150,
      cond: function (G, b) { return b.h.feedsMlKgD > 0 && b.h.residuals > 0.5; },
      summary: function () { return "green residuals and a fuller belly"; },
      say: function (G, b) {
        return "I pulled back four millilitres of green residual before the feed, and " + b.pronoun.p +
               " belly looks fuller than it did at the start of the shift.";
      },
      nudge: "In a preemie, green residuals plus a changing belly has one name until you prove otherwise.",
      help: "Treat has Stop feeds and antibiotics; Imaging has the abdominal X-ray; Assess has a culture and" +
            " Examine. Whatever else you do, the feeds are the first thing to deal with.",
      settled: "The residuals have cleared and the belly is soft again.",
      accept: {
        npo: { fb: "Feeds stopped and the stomach decompressed. The first move every time.", score: 6, resolve: false },
        axr: { fb: "The film will show gas in the bowel wall if this is necrotising enterocolitis.", score: 5, resolve: false },
        abx: { fb: "Antibiotics started. In suspected NEC, early is everything.", score: 6, resolve: true },
        culture: { fb: "Culture before the antibiotics. Good discipline.", score: 3, resolve: false },
        examine: { fb: "You feel the belly yourself: fuller, and the child does not like it being touched.", score: 4, resolve: false }
      },
      wrong: {
        __feedup: { fb: "You have increased the feeds on a belly that is already failing.", score: -8 }
      },
      decline: { fb: function (G, b) { var n = nursePr(b);
        return "\"Right.\" " + n.S + " " + n.does + " not move away. Green residuals and a changing belly in a preemie is " +
               "the one thing nobody regrets taking seriously."; }, score: -5, resolve: false },
      miss: { fb: "The belly kept distending while the feeds kept running.", score: -9 }
    },
    {
      id: "yellow", who: nurseFor, severity: "note", cooldown: 200,
      cond: function (G, b) { return b.h.bili > 9 && !b.h.photo && !b.labs.bili; },
      summary: function () { return "looking more jaundiced"; },
      say: function (G, b) {
        return b.pronoun.S + " " + b.pronoun.v("look") + " more yellow to me than this morning - down onto the chest now. " +
               "Shall I get you a level?";
      },
      nudge: "Eyes are unreliable for jaundice, especially on darker skin. What would give you a number?",
      help: "Under Assess, Bilirubin gives you the number to judge it against. Under Treat, Phototherapy is" +
            " the light.",
      settled: "The jaundice looks no worse, and a level has come back within range.",
      accept: {
        bili: { fb: "A level, read against the threshold for this baby's age in hours. Never judge by eye.", score: 6, resolve: true },
        photo: { fb: "Light is very safe, so starting is defensible. Get a level too, so you know when to stop.", score: 4, resolve: false }
      },
      wrong: {},
      decline: { fb: "\"If you are sure.\" Jaundice cannot be judged by eye, especially on darker skin. This is how babies get hurt by something entirely preventable.", score: -4, resolve: false },
      miss: { fb: "Nobody ever measured the bilirubin.", score: -6 }
    },
    {
      id: "lowbp", who: nurseFor, severity: "worry", cooldown: 90,
      cond: function (G, b) { return b.mon.map < b.ga - 2 && b.h.pressors === 0; },
      summary: function (G, b) { return "a mean blood pressure of " + b.mon.map; },
      say: function (G, b) {
        return "Mean pressure is " + b.mon.map + ". The old rule says at least the gestational age, which would be " +
               b.ga + " for " + b.pronoun.o + ".";
      },
      nudge: "Experts genuinely disagree about when a low number needs treating. What tells you whether this baby is actually delivering blood?",
      help: "Assess and Examine tells you whether this baby is actually delivering blood; a blood gas gives" +
            " you the base deficit. Treat has a fluid bolus and dopamine. Declining is a real option if the" +
            " baby looks well.",
      settled: "The blood pressure has come up on its own and the baby stayed well perfused throughout.",
      accept: {
        examine: { fb: "Cap refill, warmth, how the baby looks. A warm, pink, weeing baby with a lowish number may need nothing at all.", score: 7, resolve: true },
        gas: { fb: "A base deficit tells you whether the tissues are actually short of blood.", score: 5, resolve: false },
        bolus: { fb: "Volume helps if the baby is genuinely dry. If not, it goes to the lungs.", score: 2, resolve: true },
        dopamine: { fb: "It will lift the number. Whether it helps depends on why it was low, and you have not found that out.", score: 0, resolve: true }
      },
      wrong: {},
      decline: { fb: function (G, b) {
        return "\"Fair enough - " + b.pronoun.s + " " + b.pronoun.is + " warm and " + b.pronoun.s + " " + b.pronoun.is +
               " weeing.\" Choosing to watch a well-perfused baby with a lowish number is a real clinical decision, not a dodge."; }, score: 2, resolve: true },
      miss: { fb: "The pressure stayed low and nobody worked out why.", score: -5 }
    },
    {
      id: "murmur", who: nurseFor, severity: "note", cooldown: 240,
      cond: function (G, b) { return b.h.pda > 0.45 && !b.labs.echo; },
      summary: function () { return "a murmur and bounding pulses"; },
      say: function (G, b) {
        return "Listen to " + b.pronoun.o + " - there is a murmur, and the pulses feel like little water hammers. " +
               "The oxygen need has crept up all evening too.";
      },
      nudge: "A murmur is a finding, not a diagnosis. What would show you the duct itself?",
      help: "Under Imaging, the Echocardiogram shows the duct itself. Examine, under Assess, gives you the" +
            " pulses. Ibuprofen under Treat is a decision for after you have looked, not before.",
      settled: "The murmur is quieter and the oxygen need has stopped creeping up.",
      accept: {
        echo: { fb: "The echo shows how big the duct is and whether it matters. Then you can decide.", score: 7, resolve: true },
        examine: { fb: "Bounding pulses and a wide pulse pressure. Now get a picture of that duct.", score: 3, resolve: false }
      },
      wrong: {
        ibuprofen: { fb: "Treating a duct you have not looked at. Ibuprofen is hard on the gut and kidneys.", score: -3 }
      },
      decline: { fb: "\"I will put it in the notes for the morning.\" Reasonable. Many ducts can wait for daylight and a proper echo list.", score: 0, resolve: true },
      miss: { fb: "The duct kept shunting all night.", score: -4 }
    },
    {
      id: "nocaffeine", who: "tomas", severity: "note", cooldown: 300,
      cond: function (G, b) { return b.ga < 32 && !b.h.caffeine && b.h.spells >= 2; },
      summary: function () { return "no caffeine on the chart"; },
      say: function (G, b) {
        return "I noticed " + b.pronoun.s + " " + b.pronoun.is + " under 32 weeks and having spells, but there is no caffeine " +
               "on the chart. Shall I send a loading dose?";
      },
      nudge: "There is one medicine with strong long-term trial evidence for apnea of prematurity.",
      help: "Under Treat, Caffeine. It is one button and it is the best-evidenced thing on this unit.",
      settled: "Caffeine is on the chart now and the spells have eased.",
      accept: {
        caffeine: { fb: "Loaded. Two thousand babies in one trial: off support sooner, less lung disease, better outcomes as toddlers.", score: 7, resolve: true }
      },
      wrong: {},
      decline: { fb: "\"No problem.\" Tomas files the chart. Caffeine is one of the few NICU medicines with clear long-term benefit, so it is worth a second thought.", score: -3, resolve: false },
      miss: { fb: "The spells went on without the one medicine proven to reduce them.", score: -5 }
    },
    {
      id: "jittery", who: nurseFor, severity: "worry", cooldown: 90,
      cond: function (G, b) { return b.h.glucose < 42 && !b.labs.glucose; },
      summary: function () { return "jittery and hard to settle"; },
      say: function (G, b) {
        return b.pronoun.S + " " + b.pronoun.is + " jittery - tremulous when I unwrap " + b.pronoun.o + ", and hard to settle. " +
               "Could be a lot of things.";
      },
      nudge: "One of the causes takes five minutes and a heel prick to rule out.",
      help: "Under Assess, Glucose (heel). Five minutes and a heel prick, before anything else.",
      settled: "The jitteriness has settled and the baby is feeding and sleeping normally.",
      accept: {
        glucose: { fb: "A sugar first. Jitteriness in a newborn is hypoglycaemia until you have a number.", score: 7, resolve: true },
        examine: { fb: "A careful look. Now get a sugar.", score: 3, resolve: false }
      },
      wrong: {
        comfort: { fb: "Settling helps a distressed baby, but it will not fix a blood sugar.", score: -1 }
      },
      decline: { fb: "\"Okay.\" Jitteriness in a newborn is a low blood sugar until a number says otherwise, and the test takes five minutes.", score: -5, resolve: false },
      miss: { fb: "Nobody ever checked a blood sugar on a jittery baby.", score: -7 }
    },
    {
      id: "wetchest", who: "priya", severity: "note", cooldown: 90,
      cond: function (G, b) { return b.h.secretions > 0.55; },
      summary: function () { return "a wet-sounding chest"; },
      say: function (G, b) {
        return "The chest sounds coarse and wet, and the numbers on the ventilator have drifted. " +
               "I think " + b.pronoun.s + " " + b.pronoun.v("need") + " clearing.";
      },
      nudge: "Something simple and mechanical is in the way.",
      help: "Under Procedures, Suction. This one is mechanical, not pharmacological.",
      settled: "The chest sounds clear again and the ventilator numbers have settled.",
      accept: { suction: { fb: "A good clear-out, and the chest moves properly again.", score: 5, resolve: true } },
      wrong: { __fio2up: { fb: "More oxygen past a blocked tube achieves very little.", score: -3 } },
      decline: { fb: function (G, b) {
        return "\"I will leave " + b.pronoun.o + " be then.\" A partly blocked tube does not clear itself."; }, score: -2, resolve: false },
      miss: { fb: "The tube stayed partly blocked for hours.", score: -4 }
    },
    {
      id: "extubatable", who: "priya", severity: "note", cooldown: 300,
      cond: function (G, b) {
        return b.support.mode === "VENT" && b.support.fio2 <= 0.30 && b.support.pip <= 18 &&
               b.h.spontDrive > 0.9 && b.h.co2 < 55 && G.min > 180;
      },
      summary: function () { return "ready to come off the ventilator"; },
      say: function (G, b) {
        return b.pronoun.S + " " + b.pronoun.is + " on minimal settings and breathing over the ventilator nicely. " +
               "Shall we try coming out?";
      },
      nudge: "One medicine makes extubation succeed more often. Give it before you pull the tube.",
      help: "Under Treat, Caffeine before you pull the tube. Then either the Extubate button under" +
            " Procedures, or the mode buttons at the top of Respiratory support.",
      settled: "The window has passed for now; the settings have crept back up and this is no longer the moment.",
      accept: {
        caffeine: { fb: "Caffeine first. It is one of the best-proven things in the whole unit.", score: 5, resolve: false },
        extubate: { fb: "Out and onto CPAP. Every extra tube day costs lungs.", score: 6, resolve: true }
      },
      wrong: {},
      decline: { fb: "\"Fine by me - we will try in the morning with the full team.\" Defensible. Extubating with more people around is a genuine consideration.", score: 1, resolve: true },
      miss: { fb: "An extra night on the tube that was not needed.", score: -3 }
    },
    {
      id: "pale", who: nurseFor, severity: "note", cooldown: 240,
      cond: function (G, b) { return b.h.hgb < 8.5 && !b.labs.cbc; },
      summary: function () { return "looking pale"; },
      say: function (G, b) {
        return b.pronoun.S + " " + b.pronoun.v("look") + " washed out to me, and " + b.pronoun.v("tire") + " quickly with handling. " +
               "We have taken a lot of blood off " + b.pronoun.o + " this fortnight.";
      },
      nudge: "Every blood draw takes blood from a baby who cannot spare it. What does that add up to?",
      help: "Under Assess, Blood count gives you a haemoglobin. Under Treat, Transfuse gives red cells -" +
            " bolder without a number first.",
      settled: "The colour looks better tonight and the handling is being tolerated well.",
      accept: {
        cbc: { fb: "A haemoglobin will tell you. Anaemia makes spells worse and babies tired.", score: 6, resolve: true },
        transfuse: { fb: "Red cells given. Bold without a number, but this baby did need them.", score: 3, resolve: true }
      },
      wrong: {},
      decline: { fb: "\"Alright.\" Anaemia makes spells worse and babies tired, and it is a blood count away from being certain.", score: -2, resolve: false },
      miss: { fb: "The anaemia went unrecognised.", score: -4 }
    }
  ];

  /* ===================================================================== TALKS
     These are conversations, so they stay multiple choice. Hints describe what the
     reply DOES; the nudge points at the principle without naming the answer.      */
  var TALKS = [
    {
      id: "parent-okay", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.min > 40 && G.parentPresent(b); },
      badge: "wants to talk",
      say: function (G, b) {
        return "Sorry to stop you. I know you are busy. It is just that nobody has really told me anything. " +
               "Is " + b.name + " going to be okay?";
      },
      nudge: "A frightened parent is asking for the truth, not for comfort. Both are possible at once.",
      opts: [
        { label: "Sit down and say honestly what you know, what you do not, and what happens next",
          hint: "Costs ten minutes of your shift", apply: function (G, b) { G.trust += 12; G.advance(10); },
          fb: "You sat down. That alone changes the conversation. Families remember for the rest of their lives whether someone told them the truth kindly.",
          fbKind: "good", score: 7 },
        { label: function (G, b) { return "\"" + b.pronoun.S + " " + b.pronoun.is + " doing very well, try not to worry.\""; },
          hint: "Reassures them and takes a moment", apply: function (G, b) { G.trust += 2; },
          fb: "Kindly meant. But false reassurance costs you their trust the moment something changes, and in a NICU something usually changes.",
          fbKind: "ok", score: 0 },
        { label: "\"I will come and find you after rounds.\"",
          hint: "Defers the conversation", apply: function (G, b) { G.trust -= 6; },
          fb: "Sometimes necessary. But a parent left alone with a monitor for hours fills the silence with the worst thing they can imagine.",
          fbKind: "bad", score: -3 }
      ]
    },
    {
      id: "parent-blame", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.min > 200 && G.parentPresent(b) && b.ga < 33; },
      badge: "wants to talk",
      say: function (G, b) {
        return "Can I ask you something? I keep going over it. I carried heavy shopping the week before. " +
               "I did not rest enough. Did I do this? Did I make " + b.pronoun.o + " come early?";
      },
      nudge: "Answer the question that was asked before you explain the science.",
      opts: [
        { label: "\"No. This is not something you caused.\" Then explain what we do and do not know",
          hint: "A direct answer, then the nuance", apply: function (G, b) { G.trust += 12; G.advance(10); },
          fb: "The clearest kindness is a direct answer. Most preterm birth has no identifiable cause, and parents carry the guilt for years unless someone lifts it off them explicitly.",
          fbKind: "good", score: 7 },
        { label: "\"There are many causes of preterm birth and we often cannot identify one.\"",
          hint: "Accurate, and leaves the question open", apply: function (G, b) { G.trust += 4; },
          fb: "True, and they will hear it as a maybe. When a parent asks 'did I cause this', they need the word no before they need the nuance.",
          fbKind: "ok", score: 2 },
        { label: "\"Let us focus on today rather than looking backwards.\"",
          hint: "Redirects away from the question", apply: function (G, b) { G.trust -= 4; },
          fb: "It sounds supportive and lands as an evasion. The question does not go away; it just stops being asked out loud.",
          fbKind: "bad", score: -3 }
      ]
    },
    {
      id: "parent-hold", who: "nurse", target: "baby", pool: "parent",
      cond: function (G, b) {
        return G.parentPresent(b) && !b.h.kangaroo && b.h.criticalRun < 5 &&
               b.mon.spo2 > 90 && b.support.mode !== "VENT" && G.min > 90;
      },
      badge: "has a suggestion",
      say: function (G, b) {
        return b.parentName + " has been sitting beside the isolette for two hours without touching anything. " +
               "I think they are afraid to ask. " + b.name + " is stable right now. Shall I get them settled for skin to skin?";
      },
      nudge: "There is one treatment on this unit that only a parent can give.",
      opts: [
        { label: "Yes, set up kangaroo care", hint: "Baby out of the isolette and onto a parent's chest",
          apply: function (G, b) { b.h.kangaroo = true; b.h.swaddled = false; b.h.pain = S.c01(b.h.pain - 0.4); G.trust += 10; b.h.comfortActs++; },
          fb: "Skin to skin steadies temperature, heart rate and breathing, helps the milk come in, and gives a frightened parent something real to do. Only they can give it.",
          fbKind: "good", score: 7 },
        { label: "Not tonight, there is too much going on", hint: "Baby stays undisturbed in the isolette",
          apply: function (G, b) { G.trust -= 5; },
          fb: "Sometimes right for an unstable baby. This one was stable, and a chance to be a parent went by.",
          fbKind: "ok", score: -1 }
      ]
    },
    {
      id: "parent-name", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return b.unnamed && G.min > 120 && G.parentPresent(b); },
      badge: "has news",
      say: function (G, b) {
        return "We have decided on a name. We were waiting, because... well. You do not want to name someone " +
               "and then lose them, do you. But " + b.pronoun.s + " " + b.pronoun.has + " got through the night so far. " +
               b.pronoun.S + " " + b.pronoun.is + " " + b.chosenName + ".";
      },
      nudge: "This is not a clinical decision. It is a moment.",
      opts: [
        { label: "Write the name on the cot card yourself and say it out loud",
          hint: "Costs a couple of minutes",
          apply: function (G, b) { b.name = b.chosenName; b.unnamed = false; G.trust += 14; G.advance(5); G.nameMoment = b.name; },
          fb: function (G, b) { return "You wrote it on the card and used it. Naming a baby who has been 'Baby " +
                b.surname + "' for a day is the moment a family starts to believe there will be a future."; },
          fbKind: "good", score: 6 },
        { label: "\"Lovely. I will update the chart.\"", hint: "Records it and moves on",
          apply: function (G, b) { b.name = b.chosenName; b.unnamed = false; G.trust += 4; },
          fb: "The chart is updated. It was also a moment, and it went past quite fast.",
          fbKind: "ok", score: 2 }
      ]
    },

    {
      id: "parent-home", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.min > 60 && G.parentPresent(b); },
      badge: "wants to talk",
      say: function (G, b) {
        return "Everyone keeps saying \"one day at a time\". I understand that. But I have to tell work something, " +
               "and my mother keeps asking. How long is " + b.name + " going to be here?";
      },
      nudge: "You genuinely do not know. There is still an honest answer.",
      opts: [
        { label: "Explain the usual milestones: breathing, feeding, growing, holding a temperature",
          hint: "Gives them a map rather than a date",
          apply: function (G, b) { G.trust += 10; G.advance(5); },
          fb: "You cannot give a date, but you can give a map. Families cope far better with 'here are the four things that have to happen' than with silence.",
          fbKind: "good", score: 6 },
        { label: "Give them the rough rule of thumb: often around the original due date",
          hint: "A single number they can hold on to",
          apply: function (G, b) { G.trust += 6; },
          fb: "A reasonable rule for a preemie, and useful, as long as you say plainly that it can move in either direction.",
          fbKind: "good", score: 4 },
        { label: "\"It is really impossible to say at this stage.\"", hint: "Accurate and closes the subject",
          apply: function (G, b) { G.trust -= 5; },
          fb: "True, and it leaves them with nothing at all to plan around. Uncertainty is not a reason to say nothing.",
          fbKind: "bad", score: -3 }
      ]
    },
    {
      id: "parent-hear", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && G.min > 30; },
      badge: "has a question",
      say: function (G, b) {
        return "This is going to sound silly. Can " + b.pronoun.s + " hear me? I have been talking to " +
               b.pronoun.o + " but I feel like I am talking to a machine.";
      },
      nudge: "Hearing switches on well before most of these babies are born.",
      opts: [
        { label: "Yes. Tell them hearing works from about 24 weeks, and that their voice is the familiar one",
          hint: "Answers it and gives them something to do",
          apply: function (G, b) { G.trust += 10; },
          fb: "Hearing is working from around 24 to 25 weeks, so a preemie has been listening to that voice for months. Telling a parent this changes what they do at the bedside for the rest of the admission.",
          fbKind: "good", score: 6 },
        { label: "\"Probably, though we cannot really know.\"", hint: "Cautious",
          apply: function (G, b) { G.trust += 1; },
          fb: "We can know, and we do. This is one of the few questions with a clean, cheerful, evidence-backed answer.",
          fbKind: "ok", score: 0 }
      ]
    },
    {
      id: "parent-alarms", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && b.h.spells >= 1; },
      badge: "looks frightened",
      say: function (G, b) {
        return "Every time that alarm goes off my heart stops. " + b.pronoun.Is + " " + b.pronoun.s + " dying? Nobody ever runs, " +
               "so either it is fine or everyone has stopped caring, and I cannot tell which.";
      },
      nudge: "They are reading the room correctly. They just do not have the key to it.",
      opts: [
        { label: "Explain what the alarms mean and why calm is not indifference",
          hint: "Teaches them to read the room",
          apply: function (G, b) { G.trust += 12; G.advance(5); },
          fb: "Parents live at the mercy of a monitor they cannot read. Ten minutes teaching them which alarms matter turns terror into something manageable.",
          fbKind: "good", score: 7 },
        { label: "\"Try not to watch the numbers. Watch your baby.\"", hint: "Redirects their attention",
          apply: function (G, b) { G.trust += 5; },
          fb: "Genuinely good advice, and the same advice we give ourselves. It lands better with a little explanation attached.",
          fbKind: "good", score: 4 },
        { label: "\"The alarms go off all the time, do not worry about them.\"", hint: "Dismisses the alarms",
          apply: function (G, b) { G.trust -= 6; },
          fb: "It is meant kindly and it teaches them that nobody is really watching. They will worry more, not less.",
          fbKind: "bad", score: -4 }
      ]
    },
    {
      id: "parent-milk", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && G.min > 90; },
      badge: "wants to talk",
      say: function (G, b) {
        return "I have been pumping every three hours and getting almost nothing. A few drops. It feels " +
               "pointless and I am so tired. Should I just stop?";
      },
      nudge: "Those few drops are not a small thing, and there is a reason to say so.",
      opts: [
        { label: "Tell them those drops are medicine, and get the lactation team to help",
          hint: "Values the drops and brings in an expert",
          apply: function (G, b) { G.trust += 12; G.advance(5); },
          fb: "Early drops of colostrum are given as mouth care and are genuinely protective; human milk substantially lowers the risk of necrotising enterocolitis. Say that out loud, and get them real help rather than encouragement alone.",
          fbKind: "good", score: 7 },
        { label: "\"Do whatever is easiest for you. Formula is fine.\"", hint: "Removes the pressure entirely",
          apply: function (G, b) { G.trust += 2; },
          fb: "Kind, and sometimes exactly right for an exhausted parent. But this one was asking for a reason to keep going, and there is a good one.",
          fbKind: "ok", score: 1 },
        { label: "\"You really should keep going, it is best for the baby.\"", hint: "Encourages without help",
          apply: function (G, b) { G.trust -= 4; },
          fb: "Pressure without practical help is how parents end up feeling they failed at something nobody supported them to do.",
          fbKind: "bad", score: -3 }
      ]
    },
    {
      id: "parent-photo", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && b.h.criticalRun < 5; },
      badge: "has a small request",
      say: function (G, b) {
        return "Would it be alright if I took a photo? My partner has not met " + b.pronoun.o + " yet. " +
               "I did not want to just do it without asking.";
      },
      nudge: "Nothing clinical hangs on this one.",
      opts: [
        { label: "Of course. Offer to take one with them in it too", hint: "Says yes and adds something",
          apply: function (G, b) { G.trust += 8; },
          fb: "Yes, and the offer matters. Families who lose a baby often have almost no photographs, and families who take one home have a record of where it started.",
          fbKind: "good", score: 5 },
        { label: "Yes, that is fine", hint: "Says yes", apply: function (G, b) { G.trust += 4; },
          fb: "Easy yes, and the right one.", fbKind: "good", score: 3 },
        { label: "Ask them to wait until the ward round is finished", hint: "Defers a harmless request",
          apply: function (G, b) { G.trust -= 3; },
          fb: "There was no reason to say no. Small refusals accumulate into a feeling of not being welcome at your own baby's cot.",
          fbKind: "bad", score: -2 }
      ]
    },
    {
      id: "parent-sibling", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && G.min > 120; },
      badge: "has a question",
      say: function (G, b) {
        return "My six-year-old wants to know whether " + b.pronoun.s + " " + b.pronoun.has + " a favourite colour yet, and " +
               "whether the tubes hurt. I did not know what to tell her.";
      },
      nudge: "A six-year-old asked a real question and deserves a real answer.",
      opts: [
        { label: "Answer both honestly at a six-year-old's level, and invite her to visit",
          hint: "Takes the child's question seriously",
          apply: function (G, b) { G.trust += 10; },
          fb: "Newborns see high contrast best, not colours, and we work hard to keep the tubes from hurting. Siblings who are told the truth and allowed to visit cope far better than siblings who are protected from it.",
          fbKind: "good", score: 6 },
        { label: "Suggest she draws a picture for the cot", hint: "Gives the sibling a job",
          apply: function (G, b) { G.trust += 7; },
          fb: "A lovely answer. Giving a sibling a job at the cotside is one of the kindest small things a unit does.",
          fbKind: "good", score: 5 },
        { label: "\"She is a bit young to understand all this.\"", hint: "Deflects the child's question",
          apply: function (G, b) { G.trust -= 4; },
          fb: "Six-year-olds understand a great deal when somebody bothers to explain it. Left unexplained, they invent something worse.",
          fbKind: "bad", score: -3 }
      ]
    },
    {
      id: "parent-hat", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && G.min > 150; },
      badge: "brought something",
      say: function (G, b) {
        return "My aunt knitted this hat. It is probably far too big and I know there are rules about what " +
               "can go in the incubator, but I wanted to bring something that was not from a hospital.";
      },
      nudge: "There is no medical problem here at all.",
      opts: [
        { label: "Put it on " + "and tell them it helps keep the head warm", hint: "Accepts it and finds it a use",
          apply: function (G, b) { G.trust += 9; b.h.hat = true; },
          fb: "A hat genuinely does reduce heat loss from a newborn's head, so this is both kind and useful. Something from home in a plastic box full of hospital equipment matters more than it looks.",
          fbKind: "good", score: 5 },
        { label: "Keep it by the cot until " + "the baby is bigger", hint: "Accepts it without using it",
          apply: function (G, b) { G.trust += 5; },
          fb: "Fine, and gently disappointing. It could have gone on.", fbKind: "ok", score: 2 },
        { label: "Explain that outside items are not allowed in the incubator", hint: "Applies the rule strictly",
          apply: function (G, b) { G.trust -= 6; },
          fb: "Most units are happy with clean clothing from home. Reaching for a rule here costs you something you will want later.",
          fbKind: "bad", score: -4 }
      ]
    },
    {
      id: "parent-asleep", who: "nurse", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && G.min > 200; },
      badge: "has a suggestion",
      say: function (G, b) {
        return b.parentName + " has been in that chair since the afternoon and has just fallen asleep sitting up. " +
               "Do you want me to wake them for the ward round, or let them be?";
      },
      nudge: "Exhausted parents are not being lazy. They are running a marathon nobody trained them for.",
      opts: [
        { label: "Let them sleep, and write an update for when they wake", hint: "Protects their sleep, keeps them informed",
          apply: function (G, b) { G.trust += 9; },
          fb: "Sleep is the thing NICU families lose first and need most. A written update means they lose nothing by resting.",
          fbKind: "good", score: 6 },
        { label: "Wake them - they will want to be part of the round", hint: "Includes them in the decision-making",
          apply: function (G, b) { G.trust += 3; },
          fb: "Defensible: many parents are furious to be left out of rounds. Asking them beforehand which they would prefer is better still.",
          fbKind: "ok", score: 2 }
      ]
    },
    {
      id: "parent-nextdoor", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && G.babies.length > 2 && G.min > 180; },
      badge: "wants to ask something",
      say: function (G, b) {
        return "The baby in the next bed - it went very quiet over there earlier and there were a lot of people. " +
               "Is that little one alright?";
      },
      nudge: "You are being asked for information that is not yours to give.",
      opts: [
        { label: "Explain kindly that you cannot discuss another family, and ask how they are doing",
          hint: "Declines and turns back to them",
          apply: function (G, b) { G.trust += 7; },
          fb: "Exactly right, and the turn back matters. What they are really saying is that watching it happen frightened them.",
          fbKind: "good", score: 6 },
        { label: "Give a general reassurance that the other baby is being looked after",
          hint: "Says something without details",
          apply: function (G, b) { G.trust += 3; },
          fb: "Harmless enough, though even confirming there was an emergency is more than is yours to share.",
          fbKind: "ok", score: 1 },
        { label: "Tell them briefly what happened", hint: "Answers the question directly",
          apply: function (G, b) { G.trust -= 8; G.metrics.confidentiality = true; },
          fb: "Never. The family you are speaking to will also, correctly, wonder what you say about them to the next bed.",
          fbKind: "bad", score: -8 }
      ]
    },
    {
      id: "parent-guilt-work", who: "parent", target: "baby", pool: "parent",
      cond: function (G, b) { return G.parentPresent(b) && G.min > 240; },
      badge: "wants to talk",
      say: function (G, b) {
        return "I have to go back to work on Monday. I have used all my leave sitting here. " +
               "What kind of parent leaves their baby in intensive care to go to work?";
      },
      nudge: "This is not really a medical question, and it still needs answering.",
      opts: [
        { label: "Tell them plainly that going to work is also caring for this baby, and offer the social worker",
          hint: "Reframes it and brings in practical help",
          apply: function (G, b) { G.trust += 11; G.advance(5); },
          fb: "Keeping a job and a home is part of caring for a child who will need both. Naming that out loud, and pointing at the person whose actual job is to help, lifts a real weight.",
          fbKind: "good", score: 7 },
        { label: "\"Everybody has to do what they have to do.\"", hint: "Accepting, without much else",
          apply: function (G, b) { G.trust += 2; },
          fb: "Gentle, and it leaves the guilt exactly where it was.", fbKind: "ok", score: 1 }
      ]
    },
    {
      id: "teach-o2", who: "desmond", target: "unit", once: true, minMin: 140,
      badge: "has a question",
      say: function () {
        return "Can I ask you something, while it is quiet? Everyone says keep the preemies at 90 to 95. " +
               "But surely more oxygen is safer? Why would we ever want a saturation lower than 100?";
      },
      nudge: "Think about what oxygen does to tissue that is still being built.",
      opts: [
        { label: "Too much oxygen damages the growing blood vessels in a preemie's eyes and lungs",
          hint: "Explains the harm", apply: function (G) { G.knowledge++; },
          fb: "Correct, and there is a history behind it: an epidemic of blindness in the 1940s and 50s before anyone realised oxygen was the cause. Later trials found aiming too low costs lives, so 90 to 95 is the compromise.",
          fbKind: "good", score: 5 },
        { label: "The alarms are set that way, so we follow them", hint: "Defers to the protocol",
          apply: function () {},
          fb: "The alarms are set that way because of the harm, not the other way round. Desmond deserves the real answer.",
          fbKind: "ok", score: 0 },
        { label: "It saves oxygen, which is expensive", hint: "A resource explanation",
          apply: function () {},
          fb: "Not the reason at all. Oxygen is a medicine with a dose, and above the target it damages eyes and lungs.",
          fbKind: "bad", score: -2 }
      ]
    },
    {
      id: "teach-caffeine", who: "desmond", target: "unit", once: true, minMin: 340,
      badge: "has a question",
      say: function () {
        return "One more. Caffeine. It feels like a joke medicine, giving babies coffee. Does it actually do " +
               "anything, or is it just tradition?";
      },
      nudge: "There is a large randomised trial behind this one.",
      opts: [
        { label: "It keeps the immature breathing centre alert, and a large trial showed lasting benefit",
          hint: "Explains the mechanism and the evidence", apply: function (G) { G.knowledge++; },
          fb: "Right on both counts. Two thousand babies, randomised: less lung disease, off support sooner, better motor outcomes years later. One of the best-proven drugs in newborn medicine.",
          fbKind: "good", score: 5 },
        { label: "It is mostly tradition, but harmless", hint: "Honest uncertainty",
          apply: function () {},
          fb: "Caffeine is one of the few NICU treatments with strong long-term trial evidence. Worth knowing well.",
          fbKind: "ok", score: 0 }
      ]
    },
    {
      id: "attending", who: "ingrid", target: "unit", once: true, minMin: 230,
      badge: "checking in",
      say: function () {
        return "It is Ingrid. I am at home but wide awake. Talk me through the unit, and tell me honestly which " +
               "baby is worrying you most tonight.";
      },
      nudge: "Saying a worry out loud is how you find the gap in your own reasoning.",
      opts: [
        { label: "Name the baby worrying you most and say why", hint: "Thinks out loud with a senior",
          apply: function (G) { G.knowledge++; G.trust += 4; G.metrics.calledForHelp++; },
          fb: "Good. Ingrid asks two sharp questions and tells you to call again any time. Asking for help is a senior skill, not a junior one.",
          fbKind: "good", score: 6 },
        { label: "\"Everything is under control, no concerns.\"", hint: "Keeps the call short",
          apply: function (G) { G.metrics.overconfident = true; },
          fb: "In a unit with this many sick babies, no concerns is rarely true. Ingrid pauses a moment before she says goodnight.",
          fbKind: "bad", score: -3 }
      ]
    }
  ];

  /* ===================================================================== CALLS
     The phone rings. You choose whether to answer. Important callers ring back.   */
  var CALLS = [
    {
      id: "delivery", who: "nell", minMin: 150, urgent: true, persistent: 3, studentSkip: true,
      preview: "Delivery room",
      // the scenario is chosen now, so Nell describes the baby you are actually going to
      say: function (G) { return G.pickDelivery().call; },
      onAnswer: function (G) { G.summonDelivery(); },
      answerFb: "You hang up. The delivery room is two floors down and it is now sitting in the unit view, " +
                "waiting for you. Click it when you are ready to go.",
      answerBtn: "Hang up",
      onIgnoreAll: function (G) {
        G.log("The delivery room called three times and gave up. Another team went instead.", "warn");
        G.addScore(-8, "Missed a delivery room call");
      }
    },
    {
      id: "transport", who: "phone", minMin: 200, urgent: false, persistent: 2, studentSkip: true,
      preview: "Referring hospital",
      say: function () {
        return "The referring hospital across the county. They have a woman in labour at 29 weeks and no " +
               "neonatal beds. They want to send her before she delivers. Do you have room?";
      },
      opts: [
        { label: "Yes, send the mother now, before she delivers", hint: "Mother travels; baby is born here",
          apply: function (G) { G.acceptTransfer(); },
          fb: "Right call. A baby born in the hospital that can care for it does better than one born elsewhere and transported afterwards. That is what regionalisation of newborn care means.",
          fbKind: "good", score: 6 },
        { label: "Let her deliver there and we will collect the baby", hint: "Baby travels instead of the mother",
          apply: function (G) { G.acceptTransfer(true); },
          fb: "It works, but every transport of a fragile newborn carries risk. Given the choice, move the mother.",
          fbKind: "ok", score: 1 },
        { label: "No, we are full", hint: "Declines the transfer",
          apply: function (G) { G.metrics.refusedTransfer = true; },
          fb: "Sometimes the honest answer. Tonight you had the space and the staff, and that baby will now be born somewhere without a ventilator.",
          fbKind: "bad", score: -4 }
      ]
    },
    {
      id: "parenthome", who: "phone", minMin: 280, urgent: false, persistent: 1,
      preview: "A parent, from home",
      say: function (G) {
        var b = G.babies[0];
        return "It is a mother calling from home. She cannot get in tonight - no car, and the other children " +
               "are asleep. She is asking how her baby is.";
      },
      opts: [
        { label: "Take the call yourself and describe the night so far", hint: "Costs ten minutes",
          apply: function (G) { G.trust += 10; G.advance(10); },
          fb: "Ten minutes. Families who cannot be at the bedside are the ones most likely to feel shut out of their own baby's life.",
          fbKind: "good", score: 6 },
        { label: "Ask the bedside nurse to call her back", hint: "Delegates to whoever knows the baby best",
          apply: function (G) { G.trust += 5; },
          fb: "Good delegation. The bedside nurse often gives the better update anyway.",
          fbKind: "good", score: 4 }
      ],
      onIgnoreAll: function (G) { G.trust -= 8; G.log("The mother who called from home did not get through.", "warn"); }
    },
    {
      id: "pharmcheck", who: "tomas", minMin: 90, urgent: true, persistent: 4,
      preview: "Pharmacy",
      cond: function (G) { return G.babies.some(function (b) { return b.h.pressorInfusion; }); },
      say: function (G) {
        var b = G.babies.filter(function (x) { return x.h.pressorInfusion; })[0] || G.babies[0];
        return "I am checking your dopamine order for bed " + b.bed + ". The way it is written, the dose works out " +
               "about ten times what I would expect for a baby of " + (b.weightG / 1000).toFixed(2) + " kilos. " +
               "Can we go through it together before I make it up?";
      },
      opts: [
        { label: "Yes. Read it back to me and we will recalculate together", hint: "Two people check one calculation",
          apply: function (G) { G.metrics.safetyCatches++; G.babies.forEach(function (b) { if (b.h.pressorInfusion) b.h.pressorDose = 1; }); },
          fb: "This is how NICUs stay safe: a pharmacist who checks, and a prescriber who welcomes the check. A decimal point in the wrong place can kill a baby this size.",
          fbKind: "good", score: 8 },
        { label: "The order is fine, please make it up as written", hint: "Overrides the query",
          apply: function (G) { G.metrics.overrides++; G.babies.forEach(function (b) { if (b.h.pressorInfusion) { b.h.pressorDose = 2.4; b.h.pain += 0.15; } }); },
          fb: "Overriding a pharmacist who has stopped to query a dose is one of the most dangerous things anybody does in a hospital.",
          fbKind: "bad", score: -8 }
      ],
      onIgnoreAll: function (G) {
        G.log("Pharmacy could not reach you and held the dopamine.", "warn");
        G.addScore(-3, "Pharmacy could not reach you about a dose query");
      }
    }
  ];

  window.Events = { CONCERNS: CONCERNS, TALKS: TALKS, CALLS: CALLS, CHARS: CHARS, nurseFor: nurseFor };
})();
