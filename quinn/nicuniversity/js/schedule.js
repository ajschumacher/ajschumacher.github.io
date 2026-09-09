/* NICUniversity — the semester manifest. One entry per week; js/app.js flattens
   these into one ordered schedule. href is relative to the app root.
   href: null means "not built yet" — shown as coming soon.
   Slot ids are stored in progress (localStorage) — never rename an existing one. */
window.WEEKS = [
  {
    week: 1, unit: 1, label: "Week 1 · Fall Semester · Unit 1: Foundations",
    slots: [
      { id: "mon-seminar", day: "Monday", time: "9:00",  type: "lecture", course: "seminar",   sub: "Welcome to NICUniversity", href: "courses/seminar/week1.html",   quizId: "seminar-w1" },
      { id: "mon-chem",    day: "Monday", time: "10:30", type: "lecture", course: "chemistry", sub: "The Chemistry of a Breath", href: "courses/chemistry/week1.html", quizId: "chemistry-w1" },
      { id: "mon-bio",     day: "Monday", time: "1:00",  type: "lecture", course: "biology",   sub: "Cells: The Body's LEGO Bricks", href: "courses/biology/week1.html", quizId: "biology-w1" },
      { id: "tue-rec-seminar", day: "Monday", time: "2:30", type: "recitation", course: "seminar",   sub: "Homework: Notes practice", href: "recitations/week1/seminar.html",   hwId: "seminar-w1" },

      { id: "tue-rec-chem",    day: "Tuesday", time: "9:00",  type: "recitation", course: "chemistry", sub: "Homework: Atoms & air", href: "recitations/week1/chemistry.html", hwId: "chemistry-w1" },
      { id: "tue-rec-bio",     day: "Tuesday", time: "9:45",  type: "recitation", course: "biology",   sub: "Homework: Cells", href: "recitations/week1/biology.html",   hwId: "biology-w1" },
      { id: "tue-physics",     day: "Tuesday", time: "10:30", type: "lecture", course: "physics",  sub: "Pressure", href: "courses/physics/week1.html", quizId: "physics-w1" },
      { id: "tue-calc",        day: "Tuesday", time: "1:00",  type: "lecture", course: "calculus", sub: "How Fast Is the Baby Growing?", href: "courses/calculus/week1.html", quizId: "calculus-w1" },

      { id: "wed-rec-physics", day: "Wednesday", time: "9:00",  type: "recitation", course: "physics",  sub: "Homework: Pressure", href: "recitations/week1/physics.html", hwId: "physics-w1" },
      { id: "wed-rec-calc",    day: "Wednesday", time: "9:45",  type: "recitation", course: "calculus", sub: "Homework: Growth rates", href: "recitations/week1/calculus.html", hwId: "calculus-w1" },
      { id: "wed-stats",       day: "Wednesday", time: "10:30", type: "lecture", course: "statistics", sub: "What's Typical? The Apgar Score", href: "courses/statistics/week1.html", quizId: "statistics-w1" },
      { id: "wed-genetics",    day: "Wednesday", time: "1:00",  type: "lecture", course: "genetics",   sub: "The Instruction Book", href: "courses/genetics/week1.html", quizId: "genetics-w1" },

      { id: "thu-rec-stats",    day: "Thursday", time: "9:00",  type: "recitation", course: "statistics", sub: "Homework: What's typical?", href: "recitations/week1/statistics.html", hwId: "statistics-w1" },
      { id: "thu-rec-genetics", day: "Thursday", time: "9:45",  type: "recitation", course: "genetics",   sub: "Homework: The instruction book", href: "recitations/week1/genetics.html", hwId: "genetics-w1" },
      { id: "thu-psych",        day: "Thursday", time: "10:30", type: "lecture", course: "psychology", sub: "What a Baby's Brain Already Knows", href: "courses/psychology/week1.html", quizId: "psychology-w1" },
      { id: "thu-soc",          day: "Thursday", time: "1:00",  type: "lecture", course: "sociology",  sub: "Who Works in a NICU?", href: "courses/sociology/week1.html", quizId: "sociology-w1" },

      { id: "fri-rec-psych", day: "Friday", time: "9:00",  type: "recitation", course: "psychology", sub: "Homework: Baby science", href: "recitations/week1/psychology.html", hwId: "psychology-w1" },
      { id: "fri-rec-soc",   day: "Friday", time: "9:45",  type: "recitation", course: "sociology",  sub: "Homework: The NICU team", href: "recitations/week1/sociology.html", hwId: "sociology-w1" },
      { id: "fri-study",     day: "Friday", time: "10:30", type: "study", course: "general", sub: "Review sheet for the final", href: "study/week1.html" },
      { id: "fri-final",     day: "Friday", time: "1:00",  type: "exam",  course: "general", sub: "Week 1 Final Exam", href: "exams/week1-final.html", quizId: "final-w1", certificate: "print/week1/certificate-week1.pdf" }
    ]
  },
  {
    week: 2, unit: 1, label: "Week 2 · Fall Semester · Unit 1: Foundations",
    slots: [
      { id: "w2-mon-seminar", day: "Monday", time: "9:00",  type: "lecture", course: "seminar",   sub: "Finding the Big Idea", href: "courses/seminar/week2.html",   quizId: "seminar-w2" },
      { id: "w2-mon-chem",    day: "Monday", time: "10:30", type: "lecture", course: "chemistry", sub: "Acids, Bases, and the Blood Gas", href: "courses/chemistry/week2.html", quizId: "chemistry-w2" },
      { id: "w2-mon-bio",     day: "Monday", time: "1:00",  type: "lecture", course: "biology",   sub: "The Heart and the Blood", href: "courses/biology/week2.html", quizId: "biology-w2" },
      { id: "w2-mon-rec-seminar", day: "Monday", time: "2:30", type: "recitation", course: "seminar", sub: "Homework: Big-idea hunting", href: "recitations/week2/seminar.html", hwId: "seminar-w2" },

      { id: "w2-tue-rec-chem", day: "Tuesday", time: "9:00",  type: "recitation", course: "chemistry", sub: "Homework: Acids & bases", href: "recitations/week2/chemistry.html", hwId: "chemistry-w2" },
      { id: "w2-tue-rec-bio",  day: "Tuesday", time: "9:45",  type: "recitation", course: "biology",   sub: "Homework: Heart & blood", href: "recitations/week2/biology.html", hwId: "biology-w2" },
      { id: "w2-tue-physics",  day: "Tuesday", time: "10:30", type: "lecture", course: "physics",  sub: "Light", href: "courses/physics/week2.html", quizId: "physics-w2" },
      { id: "w2-tue-calc",     day: "Tuesday", time: "1:00",  type: "lecture", course: "calculus", sub: "How Much Piles Up?", href: "courses/calculus/week2.html", quizId: "calculus-w2" },

      { id: "w2-wed-rec-physics", day: "Wednesday", time: "9:00",  type: "recitation", course: "physics",  sub: "Homework: Light", href: "recitations/week2/physics.html", hwId: "physics-w2" },
      { id: "w2-wed-rec-calc",    day: "Wednesday", time: "9:45",  type: "recitation", course: "calculus", sub: "Homework: Totals", href: "recitations/week2/calculus.html", hwId: "calculus-w2" },
      { id: "w2-wed-stats",       day: "Wednesday", time: "10:30", type: "lecture", course: "statistics", sub: "Where Do You Stand? Percentiles", href: "courses/statistics/week2.html", quizId: "statistics-w2" },
      { id: "w2-wed-genetics",    day: "Wednesday", time: "1:00",  type: "lecture", course: "genetics",   sub: "The Heel Prick", href: "courses/genetics/week2.html", quizId: "genetics-w2" },

      { id: "w2-thu-rec-stats",    day: "Thursday", time: "9:00",  type: "recitation", course: "statistics", sub: "Homework: Percentiles", href: "recitations/week2/statistics.html", hwId: "statistics-w2" },
      { id: "w2-thu-rec-genetics", day: "Thursday", time: "9:45",  type: "recitation", course: "genetics",   sub: "Homework: Newborn screening", href: "recitations/week2/genetics.html", hwId: "genetics-w2" },
      { id: "w2-thu-psych",        day: "Thursday", time: "10:30", type: "lecture", course: "psychology", sub: "Bonding: The Invisible Rope", href: "courses/psychology/week2.html", quizId: "psychology-w2" },
      { id: "w2-thu-soc",          day: "Thursday", time: "1:00",  type: "lecture", course: "sociology",  sub: "Who Gets Care?", href: "courses/sociology/week2.html", quizId: "sociology-w2" },

      { id: "w2-fri-rec-psych", day: "Friday", time: "9:00",  type: "recitation", course: "psychology", sub: "Homework: Bonding", href: "recitations/week2/psychology.html", hwId: "psychology-w2" },
      { id: "w2-fri-rec-soc",   day: "Friday", time: "9:45",  type: "recitation", course: "sociology",  sub: "Homework: Who gets care?", href: "recitations/week2/sociology.html", hwId: "sociology-w2" },
      { id: "w2-fri-study",     day: "Friday", time: "10:30", type: "study", course: "general", sub: "Review sheet for the final", href: "study/week2.html" },
      { id: "w2-fri-final",     day: "Friday", time: "1:00",  type: "exam",  course: "general", sub: "Week 2 Final Exam", href: "exams/week2-final.html", quizId: "final-w2", certificate: "print/week2/certificate-week2.pdf" }
    ]
  },
  {
    week: 3, unit: 1, label: "Week 3 · Fall Semester · Unit 1: Foundations",
    slots: [
      { id: "w3-mon-seminar", day: "Monday", time: "9:00",  type: "lecture", course: "seminar",   sub: "Writing Like a Doctor", href: null, quizId: "seminar-w3" },
      { id: "w3-mon-chem",    day: "Monday", time: "10:30", type: "lecture", course: "chemistry", sub: "Soap, Water, and Surfactant", href: null, quizId: "chemistry-w3" },
      { id: "w3-mon-bio",     day: "Monday", time: "1:00",  type: "lecture", course: "biology",   sub: "Lungs and the Breathing Muscles", href: null, quizId: "biology-w3" },
      { id: "w3-mon-rec-seminar", day: "Monday", time: "2:30", type: "recitation", course: "seminar", sub: "Homework: A case note", href: null, hwId: "seminar-w3" },
      { id: "w3-tue-rec-chem", day: "Tuesday", time: "9:00",  type: "recitation", course: "chemistry", sub: "Homework: Surfactant", href: null, hwId: "chemistry-w3" },
      { id: "w3-tue-rec-bio",  day: "Tuesday", time: "9:45",  type: "recitation", course: "biology",   sub: "Homework: Lungs", href: null, hwId: "biology-w3" },
      { id: "w3-tue-physics",  day: "Tuesday", time: "10:30", type: "lecture", course: "physics",  sub: "Sound and Echoes", href: null, quizId: "physics-w3" },
      { id: "w3-tue-calc",     day: "Tuesday", time: "1:00",  type: "lecture", course: "calculus", sub: "Going Down: Negative Rates", href: null, quizId: "calculus-w3" },
      { id: "w3-wed-rec-physics", day: "Wednesday", time: "9:00",  type: "recitation", course: "physics",  sub: "Homework: Sound", href: null, hwId: "physics-w3" },
      { id: "w3-wed-rec-calc",    day: "Wednesday", time: "9:45",  type: "recitation", course: "calculus", sub: "Homework: Negative rates", href: null, hwId: "calculus-w3" },
      { id: "w3-wed-stats",       day: "Wednesday", time: "10:30", type: "lecture", course: "statistics", sub: "How Do We Know? The Fair Test", href: null, quizId: "statistics-w3" },
      { id: "w3-wed-genetics",    day: "Wednesday", time: "1:00",  type: "lecture", course: "genetics",   sub: "Punnett Squares: Passing It On", href: null, quizId: "genetics-w3" },
      { id: "w3-thu-rec-stats",    day: "Thursday", time: "9:00",  type: "recitation", course: "statistics", sub: "Homework: The fair test", href: null, hwId: "statistics-w3" },
      { id: "w3-thu-rec-genetics", day: "Thursday", time: "9:45",  type: "recitation", course: "genetics",   sub: "Homework: Punnett squares", href: null, hwId: "genetics-w3" },
      { id: "w3-thu-psych",        day: "Thursday", time: "10:30", type: "lecture", course: "psychology", sub: "Growing Up on Schedule", href: null, quizId: "psychology-w3" },
      { id: "w3-thu-soc",          day: "Thursday", time: "1:00",  type: "lecture", course: "sociology",  sub: "How NICUs Were Invented", href: null, quizId: "sociology-w3" },
      { id: "w3-fri-rec-psych", day: "Friday", time: "9:00",  type: "recitation", course: "psychology", sub: "Homework: Milestones", href: null, hwId: "psychology-w3" },
      { id: "w3-fri-rec-soc",   day: "Friday", time: "9:45",  type: "recitation", course: "sociology",  sub: "Homework: NICU history", href: null, hwId: "sociology-w3" },
      { id: "w3-fri-study",     day: "Friday", time: "10:30", type: "study", course: "general", sub: "Review sheet for the final", href: null },
      { id: "w3-fri-final",     day: "Friday", time: "1:00",  type: "exam",  course: "general", sub: "Week 3 Final Exam", href: null, quizId: "final-w3" }
    ]
  }
];
