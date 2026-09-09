/* NICU Tutor — progress tracking + quiz engine. No dependencies; works from file:// */

(function () {
  "use strict";

  // ---------- lesson manifest ----------
  var LESSONS = [
    { id: "01", file: "01-isolette.html",       badge: "🐣", title: "The Isolette" },
    { id: "02", file: "02-pulse-ox.html",       badge: "❤️‍🔥", title: "The Pulse Oximeter" },
    { id: "03", file: "03-monitor.html",        badge: "📈", title: "The Monitor" },
    { id: "04", file: "04-blood-pressure.html", badge: "🎈", title: "Blood Pressure" },
    { id: "05", file: "05-breathing.html",      badge: "🌬️", title: "CPAP & the Ventilator" },
    { id: "06", file: "06-feeding.html",        badge: "🥛", title: "Feeding Tubes & IV Lines" },
    { id: "07", file: "07-bili-lights.html",    badge: "💙", title: "The Bili Lights" },
    { id: "08", file: "08-imaging.html",        badge: "🔍", title: "Seeing Inside" },
    { id: "rounds", file: "rounds.html",        badge: "🩺", title: "Your NICU Rounds" }
  ];

  var STORE_KEY = "nicuTutorProgress";

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* private mode: play on without saving */ }
  }

  function passMark(total) { return Math.ceil(total * 0.7); }

  // ---------- home page ----------
  function initHome() {
    var progress = loadProgress();

    // lesson cards
    LESSONS.forEach(function (lesson) {
      var card = document.querySelector('[data-lesson-card="' + lesson.id + '"]');
      if (!card) return;
      var rec = progress[lesson.id];
      var status = card.querySelector(".lc-status");
      if (rec && rec.done) {
        card.classList.add("done");
        if (status) status.textContent = "✓ Badge earned! Best score: " + rec.best + "/" + rec.total;
      } else if (rec && rec.best != null) {
        if (status) status.textContent = "Tried it — best score " + rec.best + "/" + rec.total + ". Try again!";
      } else {
        if (status) status.textContent = "Not started yet";
      }
    });

    // badge shelf
    var shelf = document.getElementById("badge-shelf");
    if (shelf) {
      var earned = 0;
      LESSONS.forEach(function (lesson) {
        var rec = progress[lesson.id];
        var span = document.createElement("span");
        span.className = "shelf-badge" + (rec && rec.done ? "" : " locked");
        span.title = lesson.title + (rec && rec.done ? " — earned!" : " — not earned yet");
        span.textContent = lesson.badge;
        shelf.appendChild(span);
        if (rec && rec.done) earned++;
      });
      var label = document.getElementById("shelf-count");
      if (label) label.textContent = earned + " of " + LESSONS.length + " badges earned";
    }

    // reset button
    var reset = document.getElementById("reset-progress");
    if (reset) {
      reset.addEventListener("click", function () {
        if (confirm("Erase all progress and badges? This can't be undone.")) {
          localStorage.removeItem(STORE_KEY);
          location.reload();
        }
      });
    }
  }

  // ---------- quiz engine ----------
  function initQuiz() {
    var lesson = window.LESSON;
    if (!lesson || !lesson.quiz || !lesson.quiz.length) return;
    var root = document.getElementById("quiz-root");
    if (!root) return;

    var idx = 0;
    var score = 0;
    var total = lesson.quiz.length;

    function esc(s) {
      var d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    function renderQuestion() {
      var q = lesson.quiz[idx];
      root.innerHTML =
        '<div class="quiz-progress">Question ' + (idx + 1) + " of " + total +
        " &nbsp;·&nbsp; Score so far: " + score + "</div>" +
        '<div class="quiz-q">' + esc(q.q) + "</div>" +
        '<div class="quiz-choices"></div>' +
        '<div class="quiz-after"></div>';

      var choicesEl = root.querySelector(".quiz-choices");
      q.choices.forEach(function (choice, i) {
        var btn = document.createElement("button");
        btn.className = "quiz-choice";
        btn.type = "button";
        btn.textContent = choice;
        btn.addEventListener("click", function () { answer(i, btn); });
        choicesEl.appendChild(btn);
      });
    }

    function answer(i, btn) {
      var q = lesson.quiz[idx];
      var good = i === q.answer;
      if (good) score++;

      var buttons = root.querySelectorAll(".quiz-choice");
      buttons.forEach(function (b, bi) {
        b.disabled = true;
        if (bi === q.answer) b.classList.add("correct");
      });
      if (!good) btn.classList.add("wrong");

      var after = root.querySelector(".quiz-after");
      var verdict = good
        ? ["Yes! 🎉", "Exactly right! ⭐", "You got it! 🙌", "Correct — nice thinking! 💡"][idx % 4]
        : "Not quite — here's the real story:";
      after.innerHTML =
        '<div class="quiz-explain ' + (good ? "good" : "bad") + '">' +
        '<div class="qe-verdict">' + esc(verdict) + "</div>" +
        "<div>" + esc(q.explain) + "</div></div>" +
        '<button class="quiz-next" type="button">' +
        (idx + 1 < total ? "Next question →" : "See my results →") +
        "</button>";
      after.querySelector(".quiz-next").addEventListener("click", function () {
        idx++;
        if (idx < total) renderQuestion();
        else renderResult();
      });
      after.querySelector(".quiz-next").focus();
    }

    function renderResult() {
      var need = passMark(total);
      var passed = score >= need;

      // save progress
      var progress = loadProgress();
      var rec = progress[lesson.id] || { best: 0, total: total, done: false };
      rec.total = total;
      if (score > rec.best) rec.best = score;
      if (passed) rec.done = true;
      progress[lesson.id] = rec;
      saveProgress(progress);

      var manifest = null;
      for (var i = 0; i < LESSONS.length; i++) {
        if (LESSONS[i].id === lesson.id) manifest = LESSONS[i];
      }
      var badge = manifest ? manifest.badge : "🏅";

      var html;
      if (passed) {
        html =
          '<div class="quiz-result">' +
          '<div class="qr-emoji">' + badge + "</div>" +
          "<h3>Badge earned!</h3>" +
          "<p>You scored <strong>" + score + " out of " + total + "</strong>. " +
          "The badge for <strong>" + esc(lesson.title || "this lesson") + "</strong> is now on your shelf.</p>" +
          '<button class="quiz-next" type="button" data-act="home">Back to all lessons</button>' +
          '<button class="quiz-next quiz-retry" type="button" data-act="retry">Take the quiz again</button>' +
          "</div>";
      } else {
        html =
          '<div class="quiz-result">' +
          '<div class="qr-emoji">💪</div>' +
          "<h3>So close!</h3>" +
          "<p>You scored <strong>" + score + " out of " + total + "</strong>. " +
          "You need " + need + " to earn the badge. Doctors re-read things all the time — " +
          "scroll up, look again, and try the quiz once more.</p>" +
          '<button class="quiz-next quiz-retry" type="button" data-act="retry">Try again</button>' +
          "</div>";
      }
      root.innerHTML = html;
      root.querySelectorAll(".quiz-next").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.getAttribute("data-act") === "retry") {
            idx = 0; score = 0; renderQuestion();
          } else {
            location.href = lesson.home || "../index.html";
          }
        });
      });
    }

    renderQuestion();
  }

  // ---------- prev/next lesson nav ----------
  function initLessonNav() {
    var lesson = window.LESSON;
    if (!lesson) return;
    var nav = document.getElementById("lesson-nav");
    if (!nav) return;

    var i = -1;
    for (var k = 0; k < LESSONS.length; k++) {
      if (LESSONS[k].id === lesson.id) i = k;
    }
    if (i < 0) return;

    var html = "";
    if (i > 0) {
      var prev = LESSONS[i - 1];
      html += '<a href="' + prev.file + '">← Lesson ' + prev.id.replace(/^0/, "") + ": " + prev.title + "</a>";
    } else {
      html += "<span></span>";
    }
    if (i < LESSONS.length - 1) {
      var next = LESSONS[i + 1];
      var label = next.id === "rounds" ? "Final challenge: " + next.title : "Lesson " + next.id.replace(/^0/, "") + ": " + next.title;
      html += '<a href="' + next.file + '">' + label + " →</a>";
    }
    nav.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "home") initHome();
    initQuiz();
    initLessonNav();
  });
})();
