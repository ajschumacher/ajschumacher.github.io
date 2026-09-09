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
    "HR": "Heart rate, in beats per minute. Newborns normally run 100 to 160.",
    "RR": "Respiratory rate: breaths per minute. Newborns normally take 30 to 60.",
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
    "gestational age": "How many weeks a baby grew inside before being born. Full term is about 40 weeks.",
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
    "spells": "Short episodes where a premature baby stops breathing and the heart slows. Nurses call them A\'s and B\'s.",
    "phototherapy": "Blue light treatment for jaundice. The light changes bilirubin into a form the body can get rid of without the liver.",
    "antibiotics": "Medicines that kill bacteria, given when an infection is suspected.",
    "caffeine": "The same molecule as in coffee, given as a daily medicine. It keeps a premature baby\'s breathing centre alert so they have fewer spells.",
    "skin to skin": "The baby lying bare-chested on a parent\'s bare chest. It keeps them warm and steadies their heart rate and breathing.",
    "culture": "Blood put in a warm bottle to see whether any bacteria grow in it. It takes hours to days to give an answer.",
    "gestational age": "How many weeks the baby grew inside before being born. Full term is about 40 weeks. Anything before 37 weeks is premature.",
    "day of life": "How many days old the baby is. Day 0 is the day they were born.",
    "mL/kg/d": "Millilitres per kilogram of the baby per day. Doses are given per kilogram so that a 0.6 kg baby and a 3 kg baby each get the right amount for their size.",
    "corrected age": "How many weeks old the baby would be if you counted from the due date instead of the birthday. It is how preemies are really measured."
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

  // Wrap known acronyms in a piece of HTML so they become hoverable.
  var ACRONYMS = ["SpO2","FiO2","CPAP","PEEP","PIP","VENT","ETT","RDS","BPD","PDA","NEC","IVH","ROP",
                  "TPN","GIR","NPO","UVC","CBC","CRP","WBC","Hgb","MAP","HR","RR","DOPE","Apgar"];
  function markup(text) {
    if (!text) return text;
    var re = new RegExp("\\b(" + ACRONYMS.join("|") + ")\\b", "g");
    return String(text).replace(re, function (m) {
      return '<abbr class="gl" data-term="' + m + '">' + m + "</abbr>";
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
                      ACRONYMS: ACRONYMS, tip: tip, term: term };
})();
