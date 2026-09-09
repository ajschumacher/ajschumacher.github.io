/* NICU Night Shift — identity generation.
   A real unit is full of families from everywhere. Names, parents, skin tones and
   pronouns are drawn fresh every shift so no two nights feel the same. */
(function () {
  "use strict";

  var GIRL = ["Amara","Yuki","Nadia","Priya","Isla","Zuri","Mei","Sofia","Leila","Anouk","Freya","Ines",
    "Aaliyah","Rosa","Ndidi","Chiara","Marisol","Thandi","Elif","Noor","Sana","Kaia","Ruth","Alma",
    "Winnie","Esme","Talia","Ayla","Camila","Odile","Bea","Mira","Saoirse","Lucia","Hana","Yara",
    "Zoya","Neve","Imani","Greta","Simone","Dalia","Petra","Aisha","Maeve","Lior","Suri","Nia"];
  var BOY = ["Theo","Mateo","Kofi","Arjun","Otto","Ezra","Rafael","Idris","Jonah","Milo","Hiro","Silas",
    "Kwame","Nikolai","Tomas","Amir","Bo","Emeka","Rune","Santiago","Dev","Oskar","Ravi","Cyrus",
    "Malik","Anton","Joaquin","Tariq","Elias","Kenji","Bram","Hugo","Zane","Casimir","Ari","Nnamdi",
    "Ivo","Levi","Haruto","Soren","Yusuf","Dashiell","Remy","Osei","Lev","Wren","Kai","Abel"];
  var NEUTRAL = ["Wren","Rio","Sasha","Alex","Emery","Kai","Rowan","Isa","Noa","Ash","Marlow","Juno",
    "Bly","Ellis","Frankie","Indigo","Sol","Tamsin","Vesper","Quill"];

  var SURNAME = ["Okoye","Lindqvist","Nakamura","Ruiz","Petrov","Delacroix","Adeyemi","Haddad","Okonkwo",
    "Kowalski","Silva","Nguyen","Mbeki","Rossi","Fernandes","Kaur","Hassan","Novak","Bergstrom","Oyelaran",
    "Castellanos","Abebe","Lindgren","Vargas","Diallo","Marchetti","Sandoval","Achterberg","Bello","Cheng",
    "Iversen","Kalu","Moreau","Osei","Ferrara","Quintero","Rahman","Sorensen","Tanaka","Ubaldi","Varga",
    "Wanjiru","Yilmaz","Zabala","Farrow","Guerrero","Halvorsen","Ivanova","Jensen","Kirumira","Laurent",
    "Mensah","Nazario","Oduya","Pereira","Radic","Salcedo","Trevino","Ustinov","Villanueva","Whitcombe"];

  var PARENT_F = ["Hana","Astrid","Ngozi","Lucia","Irina","Manon","Fatima","Elena","Grace","Ayesha",
    "Beatriz","Karin","Nneka","Sylvie","Marta","Zahra","Oona","Delphine","Rosa","Ingrid","Chidinma",
    "Yolanda","Petra","Amina","Clara","Vera","Mariam","Solveig","Bisi","Renske"];
  var PARENT_M = ["Chidi","Nils","Ren","Dani","Pavel","Luc","Omar","Diego","Tobias","Kenji","Femi",
    "Aleksy","Mateus","Hakim","Bjorn","Ivan","Emeka","Pascal","Rafa","Andrei","Yaw","Stefan","Nabil",
    "Gustav","Tunde","Marek","Elias","Joaquin","Sami","Wim"];

  var TONES = ["a", "b", "c", "d"];

  var PRON = [
    { s: "she", o: "her", p: "her", S: "She", P: "Her", set: "f" },
    { s: "he",  o: "him", p: "his", S: "He",  P: "His", set: "m" },
    { s: "they", o: "them", p: "their", S: "They", P: "Their", set: "n" }
  ];

  /* Draw a whole family. `rng` is Sim.rnd so a seed reproduces a shift exactly.
     `used` is a Set of names already spent this shift, so nothing repeats. */
  function makeIdentity(rng, used, opts) {
    opts = opts || {};
    function pick(arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
    function pickUnused(arr, key) {
      for (var i = 0; i < 40; i++) {
        var v = pick(arr);
        if (!used[key + ":" + v]) { used[key + ":" + v] = 1; return v; }
      }
      return pick(arr);
    }

    var pr = opts.pronoun || (rng() < 0.06 ? PRON[2] : (rng() < 0.5 ? PRON[0] : PRON[1]));
    var pool = pr.set === "f" ? GIRL : pr.set === "m" ? BOY : NEUTRAL;
    var first = pickUnused(pool, "first");
    var surname = pickUnused(SURNAME, "sur");

    // one or two parents, named, with the surname
    var twoParents = rng() < 0.62;
    var pA = pickUnused(rng() < 0.72 ? PARENT_F : PARENT_M, "par");
    var pB = twoParents ? pickUnused(PARENT_M, "par") : null;
    var parents = twoParents ? (pA + " and " + pB + " " + surname) : (pA + " " + surname);

    return {
      name: first, surname: surname, tone: pick(TONES), pronoun: pr,
      parents: parents,
      parentName: pA,
      parentAvatar: "parent" + (1 + Math.floor(rng() * 3)),
      unnamed: false
    };
  }

  /* A baby born tonight is charted by surname until the parents choose a name.
     That is real, and it becomes a small moment later in the shift. */
  function makeNewbornIdentity(rng, used) {
    var id = makeIdentity(rng, used);
    id.chosenName = id.name;       // what the parents will pick, revealed later
    id.name = "Baby";
    id.unnamed = true;
    return id;
  }

  window.NameBank = { makeIdentity: makeIdentity, makeNewbornIdentity: makeNewbornIdentity, PRON: PRON };
})();
