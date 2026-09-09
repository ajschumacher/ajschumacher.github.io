/* NICU Night Shift — plain-language explanations.
   Anything abbreviated on screen can be hovered or tapped for a definition, and every
   action says what it is for before you commit to it. */
(function () {
  "use strict";

  // Acronyms and jargon. Keys are matched case-insensitively.
  var TERMS = {
    "NICU": "Neonatal Intensive Care Unit. The part of the hospital for the newest, smallest and sickest babies.",
    "SpO2": "Oxygen saturation. The percentage of the blood's haemoglobin that is carrying oxygen. Measured by the glowing probe on the foot.",
    "FiO2": "The fraction of oxygen in the air a baby is breathing. Ordinary room air is 21 percent. Anything above that is extra oxygen you are giving.",
    "MAP": "Mean arterial pressure. The average blood pressure across a whole heartbeat. In a preemie, a rough guide is that it should be at least the number of weeks they were born at.",
    "CPAP": "Continuous Positive Airway Pressure. A steady cushion of air through soft nose prongs that stops the lungs collapsing between breaths. The baby still does all the breathing.",
    "PEEP": "Positive End Expiratory Pressure. The pressure left in the lungs at the end of a breath out, so the air sacs never fully close.",
    "PIP": "Peak Inspiratory Pressure. The highest pressure the ventilator uses to push a breath in. Too high stretches and injures the lung.",
    "VENT": "Ventilator. A machine that delivers measured breaths through a tube in the windpipe, for a baby too small, sick or tired to breathe alone.",
    "ETT": "Endotracheal tube. The breathing tube that goes through the mouth into the windpipe.",
    "RDS": "Respiratory Distress Syndrome. Preemie lungs are short of surfactant, so the air sacs stick shut and every breath is hard work.",
    "BPD": "Bronchopulmonary dysplasia. Long-term lung scarring from being on support and oxygen for a long time. A big reason to be gentle.",
    "PDA": "Patent Ductus Arteriosus. A blood vessel that lets blood skip the lungs before birth and is supposed to seal afterwards. In preemies it often stays open.",
    "NEC": "Necrotising enterocolitis. A dangerous illness where part of a premature baby's bowel becomes inflamed and starts to die. Hours matter.",
    "IVH": "Intraventricular haemorrhage. Bleeding into the fluid spaces of a very premature baby's brain, graded 1 to 4.",
    "ROP": "Retinopathy of prematurity. Abnormal growth of the blood vessels in a preemie's eye, made worse by too much oxygen.",
    "TPN": "Total parenteral nutrition. A complete meal given straight into a vein, for babies whose gut is not ready for milk.",
    "GIR": "Glucose Infusion Rate, in milligrams per kilogram per minute. How fast sugar is being delivered into the blood. Calculated as (percent dextrose x mL/kg/day) divided by 144.",
    "NPO": "Nil by mouth. No milk into the stomach, so the gut can rest.",
    "UVC": "Umbilical venous catheter. A soft tube placed into a vein in the belly-button stump, so nothing has to be poked through the skin.",
    "CBC": "Complete blood count. Measures white cells (infection), haemoglobin (anaemia) and platelets.",
    "CRP": "C-reactive protein. A blood marker that rises with inflammation and infection.",
    "WBC": "White blood cell count. Very high or very low can both mean infection in a newborn.",
    "Hgb": "Haemoglobin, in grams per decilitre. The oxygen-carrying protein. Low means anaemic.",
    "apnea": "A pause in breathing. In preemies it happens because the brain's breathing centre is still immature.",
    "bradycardia": "A heart rate that is too slow. It usually follows an apnea. Nurses call the pair 'A's and B's'.",
    "surfactant": "The slippery, soap-like liquid that stops the lungs' air sacs sticking shut. Preemies do not make enough until about 34 weeks, and it can be given as a medicine.",
    "sepsis": "Infection spreading through the bloodstream. In a newborn it can look like nothing more than 'not quite right' until it is severe.",
    "bilirubin": "The yellow leftover from recycling worn-out red blood cells. Too much makes a baby jaundiced, and a great deal can damage the brain.",
    "kangaroo care": "Holding a baby skin to skin on a parent's bare chest. It steadies temperature, heart rate and breathing, and only a parent can give it.",
    "cap refill": "Press on the skin until it blanches, then time how long the pink takes to come back. Under about 2 seconds is good.",
    "residuals": "Milk left sitting in the stomach from the last feed. Green residuals in a preemie are a warning sign.",
    "pneumothorax": "An air leak. An over-stretched air sac pops and the escaping air squashes the lung. Sudden, one-sided, and does not improve with more oxygen.",
    "Apgar": "A 0 to 10 score of how a newborn is doing at 1 and 5 minutes after birth: heart rate, breathing, tone, reflex and colour, each worth 0, 1 or 2.",
    "DOPE": "The checklist for a ventilated baby who suddenly crashes: Displacement of the tube, Obstruction, Pneumothorax, Equipment failure.",

    "HR": "Heart rate: how many times the heart beats in a minute. Newborns are fast, usually 100 to 160. Yours is probably about 90.",
    "RR": "Respiratory rate: how many breaths the baby takes in a minute. Newborns breathe fast, usually 30 to 60. Yours is about 20.",
    "T": "Temperature, in degrees Celsius. A baby should sit between 36.5 and 37.5. Below 36.5 is too cold, and cold is dangerous for a preemie.",
    "bpm": "Beats per minute: how many times the heart beats in one minute.",
    "breaths": "Breaths per minute: how many times the baby breathes in one minute.",
    "mmHg": "Millimetres of mercury, the unit for blood pressure. It means how far the push would lift a column of the heavy liquid metal mercury.",
    "cmH2O": "Centimetres of water: the unit for the gentle pressures used in breathing support. It means how far the push would lift a column of water.",
    "kg": "Kilograms. One kilogram is a bit over two pounds. A full-term newborn is usually 3 to 4 kg, and the smallest babies here can be under 1 kg.",
    "pH": "How acidic the blood is. Normal is about 7.35 to 7.45. Lower means too much acid, which usually means the baby is not breathing out enough carbon dioxide or is short of blood flow.",
    "CO2": "Carbon dioxide: the waste gas the body makes and breathes out. If it builds up in the blood, the baby is not moving enough air.",
    "base deficit": "How much acid has built up in the blood from tissues not getting enough blood flow. A bigger number is worse.",
    "room air": "Ordinary air, with no extra oxygen added. It is 21 percent oxygen.",
    "RA": "Room air: no breathing support and no extra oxygen at all. The baby is breathing ordinary air, which is 21 percent oxygen. This is where every baby is trying to get to.",
    "NC": "Nasal cannula: two small soft prongs at the nostrils blowing a gentle flow of oxygen. More help than nothing, much less than CPAP. A common step on the way down off support.",
    "cannula": "Nasal cannula: two small soft prongs at the nostrils that blow a gentle flow of oxygen. Less support than CPAP.",
    "isolette": "The clear heated bed, also called an incubator. It keeps the air around the baby warm and moist, because preemies cannot keep themselves warm.",
    "humidity": "How much moisture is in the isolette air, as a percentage. Very premature skin leaks water, so their air is kept almost rainforest-humid.",
    "dextrose": "Sugar dissolved in water, given into a vein. D10 means 10 percent sugar. It is how a baby who cannot feed still gets energy.",
    "IV rate": "How much fluid runs into the vein each day, in millilitres per kilogram of the baby per day.",
    "feeds": "How much milk the baby is given each day, in millilitres per kilogram of the baby per day. Full feeds are usually about 150.",
    "spells": "Short episodes where a premature baby stops breathing and the heart slows, then comes back. Nurses call them A\'s and B\'s, after apnea and bradycardia.",
    "phototherapy": "Blue light treatment for jaundice. The light changes bilirubin into a form the body can get rid of without the liver.",
    "antibiotics": "Medicines that kill bacteria, given when an infection is suspected.",
    "caffeine": "The same molecule as in coffee, given as a daily medicine. It keeps a premature baby\'s breathing centre alert so they have fewer spells.",
    "skin to skin": "The baby lying bare-chested on a parent\'s bare chest. It keeps them warm and steadies their heart rate and breathing.",
    "culture": "Blood put in a warm bottle to see whether any bacteria grow in it. It takes hours to days to give an answer.",
    "gestational age": "How many weeks the baby grew inside before being born. Full term is about 40 weeks. Anything before 37 weeks is premature.",
    "day of life": "How many days old the baby is. Day 0 is the day they were born.",
    "mL/kg/d": "Millilitres per kilogram of the baby per day. Doses are given per kilogram so that a 0.6 kg baby and a 3 kg baby each get the right amount for their size.",
    "corrected age": "How many weeks old the baby would be if you counted from the due date instead of the birthday. It is how preemies are really measured.",

    /* ---- the spoken lingo: what a nurse actually says out loud at three in the
       morning. These are matched in ordinary prose by markup(), so the first time a
       term is used in a sentence it comes with a dotted underline and an answer. ---- */
    "bagging": "Squeezing a soft bag by hand to push breaths into a baby, through a mask on the face or down the breathing tube. It is what the team does to keep a baby going while you work out what is wrong.",
    "desaturation": "A fall in the oxygen saturation: the number from the probe on the foot dropping below where it should be. Staff shorten it to a desat.",
    "saturation": "The percentage of the blood carrying oxygen, read by the glowing probe on the foot. For a preemie on extra oxygen the target is usually 90 to 95.",
    "stimulate": "Rub the baby\'s back or the soles of the feet to remind them to breathe. It ends most spells, and the nurses do it without being asked.",
    "portholes": "The round hand-holes in the side of an isolette, with soft cuffs, so you can reach the baby without opening the bed and letting the warmth out.",
    "mottled": "Skin marbled with pale and purplish patches. It means blood is not reaching the skin properly, and in a newborn that is a serious sign.",
    "dusky": "Dark or bluish rather than pink. It means the blood is short of oxygen.",
    "grunting": "A short noise on every breath out. The baby is closing the voice box to hold pressure in and keep the air sacs open, making their own CPAP. It means hard work.",
    "retractions": "The skin sucking in between and under the ribs with each breath, because the baby is pulling far harder than usual to move air.",
    "flaring": "Nostrils widening with each breath. Another sign that breathing has become hard work.",
    "work of breathing": "How much effort breathing is costing the baby. You judge it by grunting, retractions, flaring and rate, not by any number on a screen.",
    "air sacs": "The tiny balloons at the ends of the airways, where oxygen crosses into the blood. Their proper name is alveoli.",
    "air leak": "Air that has escaped out of the lung into the space around it. A pneumothorax is the common kind.",
    "perfusion": "How well blood is actually reaching the tissues. Judged by colour, by how warm the skin is, and by how fast the pink comes back when you press.",
    "compliance": "How stretchy the lungs are. Stiff lungs, meaning low compliance, need more pressure to move the same air. That is why surfactant lets you turn the ventilator down.",
    "tension pneumothorax": "An air leak where the escaped air keeps building up, squashing the lung and the heart. It can kill within minutes, and a needle relieves it.",
    "wean": "To turn support down a step at a time as the baby needs less of it. Weaning is the direction of travel for every baby in the unit.",
    "extubation": "Taking the breathing tube out, usually onto CPAP. Every day with a tube in costs the lungs a little, so it is done as soon as it is safe.",
    "intubation": "Passing a breathing tube through the mouth into the windpipe, so a ventilator can take over the breathing.",
    "ventilation": "Moving air in and out of the lungs, which is how carbon dioxide gets breathed off. It is a different job from oxygenation, and a baby can fail at one and not the other.",
    "meconium": "The dark sticky first stool, formed before birth. A distressed baby can pass it early and breathe it in, which plugs and inflames the lungs.",
    "pulmonary hypertension": "The blood vessels in the lungs stay tight after birth, so blood skips past the lungs instead of picking up oxygen there. The saturation stays low however much oxygen you give.",
    "PPHN": "Persistent pulmonary hypertension of the newborn. The lung\'s blood vessels never relax after birth, so blood bypasses the lungs and the baby stays blue.",
    "shunting": "Blood taking a short cut past the lungs instead of going through them, so it never picks up oxygen.",
    "hypovolaemia": "Not enough fluid in the circulation for the heart to pump. It is one cause of a low blood pressure, and fluid given to a baby who does not have it does harm.",
    "hypoglycaemia": "Blood sugar too low. A newborn brain runs almost entirely on sugar and holds almost nothing in reserve.",
    "hypotension": "Blood pressure lower than it should be. The number matters less than whether blood is actually reaching the tissues.",
    "acidosis": "Acid built up in the blood. Usually it means the tissues are short of blood flow, or carbon dioxide is not being breathed out.",
    "hypoxia": "Not enough oxygen reaching the tissues.",
    "anaemia": "Too few red blood cells to carry oxygen well. Preemies become anaemic from growing fast, from making blood slowly, and from every test that takes blood off them.",
    "blood gas": "A few drops of blood that give the acid level, the carbon dioxide and the oxygen. It says whether a baby is failing to breathe carbon dioxide out, short of oxygen, or building up acid.",
    "septic screen": "The set of tests taken when infection is suspected: a blood count, a marker of inflammation, and a culture.",
    "septic": "Having sepsis: an infection spreading through the bloodstream.",
    "jaundice": "The yellow colour of skin and eyes when bilirubin builds up faster than the liver clears it.",
    "handover": "The formal telling of each baby\'s story from the shift going home to the shift coming on. Everything you were told at seven o\'clock came from handover.",
    "rounds": "The ward round, when the whole team walks bed to bed and makes the plan for each baby. It happens in the morning, which is a long way off.",
    "preterm": "Born before 37 weeks. The same thing as premature.",
    "sucrose": "A few drops of sugar water on the tongue just before something that hurts. It measurably reduces a newborn\'s pain response.",
    "nest": "Rolled cloth boundaries tucked around the baby so there is something to brace against, the way the womb did. It settles them and helps them grow.",
    "swaddled": "Wrapped snugly in a cloth with the arms tucked in, so the baby feels held rather than adrift.",
    "ductus": "The ductus arteriosus: the vessel that lets blood skip the lungs before birth and is meant to seal shut afterwards. In preemies it often stays open.",
    "duct": "Short for the ductus arteriosus, the vessel that should close after birth and often does not in a preemie. An open one sends extra blood through the lungs.",
    "murmur": "An extra sound between heartbeats, made by blood moving where it would normally be quiet. It is a clue, not a diagnosis.",
    "bounding": "Pulses that feel unusually strong and slapping. In a preemie it hints that a duct is open and blood is running off through it.",
    "pulse pressure": "The gap between the top and the bottom blood pressure numbers. A wide gap goes with an open duct.",
    "distended": "Swollen and tight. A distended belly in a preemie who is being fed is a warning sign.",
    "pneumatosis": "Bubbles of gas inside the wall of the bowel itself, seen on an X-ray. It is the finding that makes necrotising enterocolitis certain.",
    "lethargic": "Unusually still and hard to wake. In a newborn it is one of the earliest signs of being seriously unwell.",
    "jittery": "Fine trembling of the hands and chin when the baby is unwrapped. In a newborn, think low blood sugar first.",
    "tone": "How much a baby\'s muscles are doing. A well baby curls up and pushes back against you; an unwell one lies floppy.",
    "heel prick": "A small lance to the side of the heel for a few drops of blood. It is how most of the quick tests here are taken.",
    "loading dose": "A larger first dose that fills the body up quickly, before settling to a smaller daily one.",
    "inotrope": "A drip that makes the heart squeeze harder and tightens the blood vessels, to lift a blood pressure. Dopamine is the usual one here.",
    "transfusion": "Giving donated red blood cells into a vein, for a baby who has become anaemic.",
    "ibuprofen": "The medicine that makes a stubborn ductus arteriosus tighten and close. It is hard on the gut and the kidneys, so the duct has to be worth treating.",
    "cot card": "The card on the front of the bed with the baby\'s name on it. Writing a name on it is a bigger moment than it looks.",
    "preemie": "Ward shorthand for a premature baby: one born before 37 weeks.",
    "film": "Ward shorthand for an X-ray picture. A chest film shows the lungs and where a breathing tube sits; an abdominal film shows the bowel.",
    "insulin": "The hormone that moves sugar out of the blood and into the body. Too much of it drives the blood sugar down.",
    "steroids": "Steroid injections given to the mother before a premature birth. They speed the baby\'s lungs up, and they are one of the most effective treatments in the whole of newborn medicine.",
    "membranes": "The bag of fluid around the baby in the womb. Once it breaks, bacteria can travel up to the baby, so the longer that goes on before birth the higher the infection risk.",
    "section": "Caesarean section: the baby is born through an opening in the mother\'s abdomen rather than through the birth canal.",
    "haemolytic jaundice": "Jaundice caused by red blood cells being broken down faster than usual, so bilirubin is made faster than the liver can clear it. It climbs quickly and needs light early.",
    "blood group incompatibility": "The mother\'s immune system recognises the baby\'s red blood cells as foreign and attacks them. That is why the bilirubin climbs fast.",
    "early-onset sepsis": "Infection the baby picked up around the time of birth and which shows itself in the first three days. It comes from the mother, not from the unit.",
    "forceps": "Smooth curved blades placed around the baby\'s head to help lift them out. It is a hard birth for the baby.",
    "second stage": "The pushing part of labour. A long one is hard work for the baby as well as the mother.",
    "trace": "The continuous printout of the baby\'s heart rate during labour. Patterns in it are what make a team decide to deliver quickly.",
    "transient tachypnoea": "Wet lungs. The fluid that filled the lungs before birth has not all been cleared, so the baby breathes fast for a few hours and then gets better on its own.",
    "polycythaemia": "Too many red blood cells. The blood is thick and flows sluggishly, and there is a lot of it to recycle into bilirubin afterwards.",
    "containment": "Holding a baby\'s arms and legs gently tucked in with your hands, so they feel bounded rather than falling. It settles them without any medicine.",
    "infusion": "Fluid running steadily into a vein through a fine tube, hour after hour. Turning up the sugar in the infusion is how you stop a blood sugar falling again.",
    "long line": "A very fine tube threaded up a vein until its tip sits in a big vessel near the heart, so concentrated nutrition can run in without burning a small vein.",
    "bolus": "A measured dose of fluid run into a vein over a short time. Here it means ten millilitres for every kilogram the baby weighs.",
    "threshold": "The bilirubin level at which treatment starts. It is not one number: it depends on how many hours old the baby is and how premature they were.",
    "growth restricted": "The baby grew more slowly than expected in the womb, usually because the placenta was not delivering enough. They are born small even for their weeks.",
    "placenta": "The organ that fed the baby in the womb, passing oxygen and food across from the mother\'s blood.",
    "echocardiogram": "An ultrasound of the heart. It shows whether the ductus is still open and how much blood is running through it.",
    "red cells": "The cells in blood that carry oxygen. Too few of them is anaemia.",
    "full term": "Born at 37 weeks or later. A pregnancy runs about 40 weeks.",
    "late preterm": "Born between 34 and 37 weeks. Bigger and stronger than the tiny ones, but still prone to feeding trouble, jaundice and getting cold.",
    "weeing": "Passing urine. A baby who is weeing well has kidneys getting enough blood, which tells you more than any single blood pressure number.",
    "handling": "Everything that disturbs a baby: opening the bed, examining, repositioning, taking blood. It is not free. It costs them oxygen and stability.",
    "secretions": "Mucus in the airway or in the breathing tube. Enough of it gets in the way of air moving in and out.",
    "suction": "Passing a fine tube into the airway to draw the mucus out. It clears a blockage, and it is uncomfortable, so it is not done routinely.",
    "probe": "The sensor taped to the baby\'s foot. It shines light through the skin to read the oxygen saturation, and if it slips the number lies.",
    "critical": "This game\'s word for a baby whose vital signs are dangerously out of range right now. Minutes spent here are what add up to harm.",
    "diabetic mother": "A baby whose mother had diabetes. Extra sugar crossed to the baby before birth, so the baby made extra insulin. The moment the cord is cut the sugar supply stops and that insulin drives the baby\'s own sugar down."
  };

  // What each action is for, in plain language, shown before you commit.
  var ACTION_INFO = {
    examine:  "Lay hands on the baby. Colour, breathing effort, chest sounds, belly, pulses and cap refill. Costs five minutes and answers questions no monitor can.",
    comfort:  "Nest, swaddle, dim the light and offer a little sucrose. Lowers pain and stress, which is treatment, not decoration.",
    kangaroo: "Settle the baby skin to skin on a parent's chest. Steadies temperature, heart rate and breathing, and helps the family. Only possible when a parent is here.",
    suction:  "Clear secretions from the airway. Useful when the chest sounds wet or a tube may be blocked, but it is uncomfortable, so not routinely.",
    reposition: "Reseat the saturation probe and the ECG stickers. The answer when the number and the baby disagree.",
    glucose:  "A heel-prick blood sugar, back in five minutes. Cheap, fast, and explains a surprising number of problems.",
    gas:      "A blood gas: pH, carbon dioxide and base deficit. Tells you whether a baby is failing to breathe out CO2, or short of oxygen, or building up acid.",
    cbc:      "White cells for infection and haemoglobin for anaemia. Takes about forty minutes.",
    bili:     "A bilirubin level, to compare against the threshold for this baby's age in hours. Never judge jaundice by eye.",
    culture:  "Take blood to grow any bacteria in it. Must be taken BEFORE antibiotics start, or the result is worthless.",
    cxr:      "A chest X-ray. Shows the lungs, whether a breathing tube sits in the right place, and any air leak.",
    axr:      "An abdominal X-ray. Looking for the gas in the bowel wall that means necrotising enterocolitis.",
    hus:      "Ultrasound of the brain through the soft spot on the head. No radiation. This is how brain bleeds are found.",
    echo:     "Ultrasound of the heart. Shows whether the ductus is still open and how much it matters.",
    caffeine: "The standard medicine for apnea of prematurity. It keeps the immature breathing centre alert. A large trial showed babies given it came off support sooner and had less lung disease.",
    abx:      "Antibiotics for suspected infection. In a newborn, waiting for proof costs more than treating early does. Draw the culture first.",
    surfactant: "The missing slippery liquid, dripped straight into the lungs. Within minutes stiff lungs open up. Needs a breathing tube to give it through.",
    intubate: "Place a breathing tube into the windpipe so a ventilator can take over. A real procedure with real risk; not a first move.",
    extubate: "Take the breathing tube out and go back to CPAP. Do it as soon as it is safe, because tube days cost lungs.",
    bolus:    "Ten millilitres per kilo of fluid into a vein. Helps a baby who is genuinely short of circulating volume, and adds water to the lungs of one who is not.",
    d10:      "A dose of sugar straight into the vein for a low blood glucose. Fixes the moment; you also need to turn up the infusion so it does not fall again.",
    dopamine: "A drip that makes the heart squeeze harder and tightens the blood vessels, raising the blood pressure. Treats the number; find out why it was low.",
    ibuprofen: "The medicine that makes a stubborn ductus arteriosus tighten and close. It is hard on the gut and kidneys, so confirm the duct matters first.",
    transfuse: "Give red cells to an anaemic baby. Anaemia makes spells worse and makes babies pale and tired.",
    needle:   "Put a needle into the chest to release trapped air. Life-saving for a tension pneumothorax, harmful if there is no air there.",
    photo:    "Blue light that changes bilirubin into a form the body can flush out without the liver. Very safe. Eyes are covered.",
    npo:      "Stop milk feeds and let the stomach empty. The first move whenever you are worried about the gut.",
    talk:     "Sit down with the family and talk. Costs ten minutes and changes how an entire admission feels to them."
  };

  function lookup(term) {
    if (!term) return null;
    if (TERMS[term]) return TERMS[term];
    var k = Object.keys(TERMS).filter(function (t) { return t.toLowerCase() === String(term).toLowerCase(); })[0];
    return k ? TERMS[k] : null;
  }

  /* Acronyms are only marked up when they are written as acronyms, so the word "map"
     in a sentence is never mistaken for mean arterial pressure. */
  var ACRONYMS = ["NICU","SpO2","FiO2","CPAP","PEEP","PIP","VENT","ETT","RDS","BPD","PDA","NEC","IVH","ROP",
                  "TPN","GIR","NPO","UVC","CBC","CRP","WBC","Hgb","MAP","HR","RR","DOPE","Apgar","PPHN"];

  /* Every piece of lingo that should explain itself wherever it turns up in prose:
     what a colleague says, a handover, a nudge, an option, the log, the report.
     Left side is the surface form as it is written (plurals and tenses spelled out,
     because a NICU is not the place for clever stemming); right side is the TERMS key
     that answers it. Add the word here as well as to TERMS, or nothing will underline. */
  var PHRASES = {
    "bagging": "bagging", "bagged": "bagging", "bag-mask": "bagging", "bag and mask": "bagging",
    "desaturation": "desaturation", "desaturations": "desaturation", "desaturated": "desaturation",
    "desat": "desaturation", "desats": "desaturation", "desatted": "desaturation",
    "saturation": "saturation", "saturations": "saturation", "sats": "saturation",
    "spell": "spells", "spells": "spells",
    "apnea": "apnea", "apnoea": "apnea", "apneas": "apnea", "apnea of prematurity": "apnea",
    "bradycardia": "bradycardia", "bradycardias": "bradycardia", "brady": "bradycardia", "bradys": "bradycardia",
    "stimulate": "stimulate", "stimulated": "stimulate", "stimulating": "stimulate", "stimulation": "stimulate",
    "residual": "residuals", "residuals": "residuals",
    "portholes": "portholes", "porthole": "portholes",
    "isolette": "isolette", "incubator": "isolette",
    "mottled": "mottled", "mottling": "mottled",
    "dusky": "dusky",
    "grunting": "grunting", "grunt": "grunting", "grunts": "grunting",
    "retractions": "retractions", "retracting": "retractions",
    "flaring": "flaring",
    "work of breathing": "work of breathing",
    "air sacs": "air sacs", "air sac": "air sacs",
    "air leak": "air leak", "air leaks": "air leak",
    "pneumothorax": "pneumothorax", "tension pneumothorax": "tension pneumothorax",
    "perfusion": "perfusion", "perfused": "perfusion",
    "compliance": "compliance",
    "surfactant": "surfactant",
    "wean": "wean", "weans": "wean", "weaned": "wean", "weaning": "wean",
    "extubate": "extubation", "extubated": "extubation", "extubating": "extubation", "extubation": "extubation",
    "intubate": "intubation", "intubated": "intubation", "intubating": "intubation", "intubation": "intubation",
    "ventilator": "VENT", "ventilated": "VENT", "ventilation": "ventilation",
    "meconium": "meconium",
    "pulmonary hypertension": "pulmonary hypertension",
    "shunting": "shunting", "shunt": "shunting", "shunts": "shunting",
    "hypovolaemia": "hypovolaemia", "hypovolaemic": "hypovolaemia",
    "hypoglycaemia": "hypoglycaemia", "hypoglycaemic": "hypoglycaemia",
    "hypotension": "hypotension", "hypotensive": "hypotension",
    "acidosis": "acidosis", "acidotic": "acidosis",
    "hypoxia": "hypoxia", "hypoxic": "hypoxia",
    "anaemia": "anaemia", "anaemic": "anaemia",
    "base deficit": "base deficit",
    "blood gas": "blood gas",
    "blood culture": "culture", "blood cultures": "culture", "culture": "culture", "cultures": "culture",
    "septic screen": "septic screen", "septic": "septic", "sepsis": "sepsis",
    "jaundice": "jaundice", "jaundiced": "jaundice",
    "bilirubin": "bilirubin", "phototherapy": "phototherapy",
    "necrotising enterocolitis": "NEC",
    "retinopathy of prematurity": "ROP",
    "respiratory distress": "RDS",
    "chronic lung disease": "BPD", "bronchopulmonary dysplasia": "BPD",
    "brain bleed": "IVH", "intraventricular haemorrhage": "IVH",
    "patent ductus arteriosus": "PDA", "ductus arteriosus": "ductus",
    "ductus": "ductus", "duct": "duct", "ducts": "duct",
    "murmur": "murmur", "murmurs": "murmur",
    "bounding": "bounding", "pulse pressure": "pulse pressure",
    "distended": "distended", "distension": "distended",
    "pneumatosis": "pneumatosis",
    "lethargic": "lethargic", "lethargy": "lethargic",
    "jittery": "jittery", "jitteriness": "jittery",
    "tone": "tone",
    "cap refill": "cap refill",
    "heel prick": "heel prick", "heel-prick": "heel prick",
    "loading dose": "loading dose",
    "inotrope": "inotrope", "inotropes": "inotrope", "dopamine": "inotrope",
    "transfuse": "transfusion", "transfused": "transfusion", "transfusion": "transfusion",
    "ibuprofen": "ibuprofen",
    "caffeine": "caffeine", "antibiotics": "antibiotics",
    "kangaroo care": "kangaroo care", "kangaroo": "kangaroo care", "skin to skin": "skin to skin",
    "nest": "nest", "nested": "nest", "nesting": "nest",
    "swaddle": "swaddled", "swaddled": "swaddled",
    "sucrose": "sucrose",
    "cot card": "cot card",
    "preemie": "preemie", "preemies": "preemie",
    "film": "film", "films": "film", "chest film": "film", "abdominal film": "film",
    "insulin": "insulin",
    "steroids": "steroids", "antenatal steroids": "steroids",
    "membranes": "membranes", "ruptured membranes": "membranes",
    "section": "section", "caesarean": "section", "caesarean section": "section",
    "haemolytic jaundice": "haemolytic jaundice", "haemolytic": "haemolytic jaundice", "haemolysis": "haemolytic jaundice",
    "blood group incompatibility": "blood group incompatibility", "blood group difference": "blood group incompatibility",
    "early-onset sepsis": "early-onset sepsis",
    "forceps": "forceps",
    "second stage": "second stage",
    "trace": "trace", "heart-rate trace": "trace",
    "respiratory distress syndrome": "RDS",
    "transient tachypnoea": "transient tachypnoea", "tachypnoea": "transient tachypnoea",
    "polycythaemia": "polycythaemia",
    "containment": "containment",
    "infusion": "infusion", "drip": "infusion",
    "gestational diabetes": "diabetic mother",
    "long line": "long line", "central line": "long line",
    "bolus": "bolus", "boluses": "bolus",
    "threshold": "threshold", "thresholds": "threshold",
    "growth restricted": "growth restricted",
    "placenta": "placenta",
    "echocardiogram": "echocardiogram", "echo": "echocardiogram",
    "red cells": "red cells",
    "full term": "full term", "term baby": "full term", "term babies": "full term",
    "late preterm": "late preterm",
    "weeing": "weeing",
    "handling": "handling",
    "secretions": "secretions",
    "suction": "suction", "suctioned": "suction", "suctioning": "suction",
    "probe": "probe",
    "critical": "critical",
    "diabetic mother": "diabetic mother", "diabetic": "diabetic mother",
    "haemoglobin": "Hgb", "apgars": "Apgar",
    "handover": "handover", "rounds": "rounds",
    "preterm": "preterm",
    "room air": "room air", "cannula": "cannula", "nasal cannula": "cannula",
    "gestation": "gestational age", "gestations": "gestational age", "gestational age": "gestational age",
    "corrected age": "corrected age", "day of life": "day of life",
    "feeds": "feeds", "dextrose": "dextrose", "humidity": "humidity"
  };

  // Acronyms join the same table, keyed lower-case; markup() checks their capitalisation.
  ACRONYMS.forEach(function (a) { PHRASES[a.toLowerCase()] = a; });
  var ACRONYM_CASE = {};
  ACRONYMS.forEach(function (a) { ACRONYM_CASE[a.toLowerCase()] = a; });

  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  // Longest first, so "tension pneumothorax" wins over "pneumothorax".
  var SURFACES = Object.keys(PHRASES).sort(function (a, b) { return b.length - a.length; });
  var MARKUP_RE = new RegExp("\\b(" + SURFACES.map(reEsc).join("|") + ")\\b", "gi");

  /* Underline the lingo in a run of prose. One underline per term per passage: the point
     is to teach the word, not to turn every sentence into a field of dots. The text is
     already HTML-escaped by the caller, and replace() never rescans what it inserts,
     so the markup cannot land inside a tag it has just written. */
  function markup(text) {
    if (!text) return text;
    var seen = {};
    return String(text).replace(MARKUP_RE, function (m) {
      var low = m.toLowerCase();
      if (ACRONYM_CASE[low] && m !== ACRONYM_CASE[low]) return m;   // "map" is not MAP
      var key = PHRASES[low];
      if (!key || !TERMS[key] || seen[key]) return m;
      seen[key] = true;
      return '<abbr class="gl" data-term="' + key + '">' + m + "</abbr>";
    });
  }

  /* Wrap any visible text with its own explanation. Use when the meaning depends on
     context ("6" means six centimetres of water here) rather than on a fixed word. */
  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function tip(visible, explanation) {
    return '<span class="gl" data-tip="' + esc(explanation) + '">' + visible + "</span>";
  }
  /* Wrap text and look the explanation up from TERMS by key. */
  function term(visible, key) {
    return '<span class="gl" data-term="' + esc(key) + '">' + visible + "</span>";
  }

  window.Glossary = { TERMS: TERMS, ACTION_INFO: ACTION_INFO, lookup: lookup, markup: markup,
                      ACRONYMS: ACRONYMS, PHRASES: PHRASES, tip: tip, term: term };
})();
