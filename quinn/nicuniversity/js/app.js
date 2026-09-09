/* NICUniversity — timetable, progress, Professor Mode, quiz engine, read-aloud, vocabulary.
   No dependencies; works from file:// */

(function () {
  "use strict";

  // =====================================================================
  // Courses & schedule. Weeks live in js/schedule.js (window.WEEKS); they are
  // flattened here into one ordered list so progress logic is week-agnostic.
  // href: null means "not built yet" — shown as coming soon.
  // =====================================================================
  var COURSES = {
    seminar:    { name: "Freshman Seminar", badge: "🎓", hw: "📓" },
    chemistry:  { name: "Chemistry 101",    badge: "⚗️", hw: "🧪" },
    biology:    { name: "Biology 101",      badge: "🔬", hw: "🧫" },
    physics:    { name: "Physics 101",      badge: "🧲", hw: "📐" },
    calculus:   { name: "Calculus 101",     badge: "📈", hw: "✏️" },
    statistics: { name: "Statistics 101",   badge: "📊", hw: "🎲" },
    genetics:   { name: "Genetics 101",     badge: "🧬", hw: "🔡" },
    psychology: { name: "Psychology 101",   badge: "🧠", hw: "👶" },
    sociology:  { name: "Sociology 101",    badge: "🏥", hw: "🗺️" },
    general:    { name: "NICUniversity",    badge: "🩺", hw: "📝" }
  };

  var WEEKS = window.WEEKS || [];
  var SCHEDULE = [];
  WEEKS.forEach(function (w) { w.slots.forEach(function (s) { s.week = w.week; SCHEDULE.push(s); }); });

  function weekOf(n) { for (var i = 0; i < WEEKS.length; i++) if (WEEKS[i].week === n) return WEEKS[i]; return null; }
  function weekBuilt(w) { return w.slots.some(function (s) { return !!s.href; }); }
  function slotById(id) { for (var i = 0; i < SCHEDULE.length; i++) if (SCHEDULE[i].id === id) return SCHEDULE[i]; return null; }

  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // =====================================================================
  // Progress store
  // =====================================================================
  var STORE_KEY = "nicuniversityProgress";

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
  }
  function quizRec(p, id) { p.quizzes = p.quizzes || {}; return p.quizzes[id]; }
  function hwRec(p, id) { p.homework = p.homework || {}; return p.homework[id]; }

  function passMark(total) { return Math.ceil(total * 0.7); }

  function slotDone(slot, p) {
    if (slot.type === "lecture" || slot.type === "exam") { var q = quizRec(p, slot.quizId); return !!(q && q.attempted); }
    if (slot.type === "recitation") { var h = hwRec(p, slot.hwId); return !!(h && h.done); }
    if (slot.type === "study") { return !!(p.study && p.study[slot.id]); }
    return false;
  }

  function weekDone(w, p) { return w.slots.every(function (s) { return !!s.href && slotDone(s, p); }); }

  function nextSlot(p) {
    for (var i = 0; i < SCHEDULE.length; i++) {
      if (!slotDone(SCHEDULE[i], p)) return SCHEDULE[i];
    }
    return null;
  }

  // relative path prefix from the current page to the app root
  function rootPrefix() {
    return document.body.getAttribute("data-root") || "";
  }

  // =====================================================================
  // Professor Mode (lightly gated: a 4-digit code the grown-up sets once)
  // =====================================================================
  function profOn() {
    try { return sessionStorage.getItem("nicuProf") === "1"; } catch (e) { return false; }
  }
  function setProf(on) {
    try { on ? sessionStorage.setItem("nicuProf", "1") : sessionStorage.removeItem("nicuProf"); } catch (e) {}
    document.body.classList.toggle("prof", on);
    var btn = document.getElementById("prof-toggle");
    if (btn) btn.textContent = on ? "🎓 Professor mode ON" : "🎓 Professor";
    document.dispatchEvent(new CustomEvent("profchange", { detail: { on: on } }));
  }

  function initProf() {
    var btn = document.getElementById("prof-toggle");
    if (!btn) return;
    setProf(profOn());
    btn.addEventListener("click", function () {
      if (profOn()) { setProf(false); toast("Professor mode off"); return; }
      var p = loadProgress();
      if (!p.profCode) {
        var code = prompt("Set a Professor code (4 digits). Professor mode shows answer keys and lets you enter paper scores.");
        if (code === null) return;
        if (!/^\d{4}$/.test(code.trim())) { alert("Please use exactly 4 digits."); return; }
        p.profCode = code.trim();
        saveProgress(p);
        setProf(true);
        toast("Professor code set. Professor mode is on.");
        return;
      }
      var entered = prompt("Enter the Professor code:");
      if (entered === null) return;
      if (entered.trim() === p.profCode) { setProf(true); toast("Professor mode on"); }
      else { alert("That's not the Professor code. (Students: nice try! 😄)"); }
    });
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  // =====================================================================
  // Home: week tabs, one week's timetable, badge shelf
  // =====================================================================
  function initHome() {
    var p = loadProgress();
    var next = nextSlot(p);
    var root = rootPrefix();
    if (!WEEKS.length) return;

    // Which week to show: #weekN in the URL, else the week of the next undone slot, else the last week.
    var m = /week(\d+)/.exec(location.hash || "");
    var built = WEEKS.filter(weekBuilt);
    var shown = m ? parseInt(m[1], 10) : (next ? next.week : (built.length ? built[built.length - 1].week : WEEKS[0].week));
    var W = weekOf(shown) || WEEKS[0];
    shown = W.week;

    var tabs = document.getElementById("week-tabs");
    if (tabs) {
      tabs.innerHTML = "";
      WEEKS.forEach(function (w) {
        var built = weekBuilt(w), done = weekDone(w, p);
        var a = document.createElement("a");
        a.href = "#week" + w.week;
        a.className = "week-tab" + (w.week === shown ? " active" : "") + (built ? "" : " soon") + (done ? " done" : "");
        a.innerHTML = "Week " + w.week + (done ? " ✓" : built ? "" : " <small>soon</small>");
        a.addEventListener("click", function (e) {
          e.preventDefault();
          history.replaceState(null, "", "#week" + w.week);
          initHome();
        });
        tabs.appendChild(a);
      });
    }
    var label = document.getElementById("week-label");
    if (label) label.textContent = "📅 " + W.label;

    var tt = document.getElementById("timetable");
    if (tt) {
      tt.innerHTML = "";
      DAYS.forEach(function (day) {
        var col = document.createElement("div");
        col.className = "day";
        col.innerHTML = "<h3>" + day + "</h3>";
        W.slots.filter(function (s) { return s.day === day; }).forEach(function (s) {
          var course = COURSES[s.course];
          var done = slotDone(s, p);
          var isNext = next && next.id === s.id;
          var seenNext = next ? SCHEDULE.indexOf(s) > SCHEDULE.indexOf(next) : false;
          var el = document.createElement(s.href ? "a" : "div");
          if (s.href) el.href = root + s.href;
          var cls = "slot c-" + s.course;
          var status;
          if (!s.href) { cls += " soon"; status = "Coming soon"; }
          else if (done) {
            cls += " done";
            if (s.type === "lecture") {
              var q = quizRec(p, s.quizId);
              status = q.done ? "✓ Attended · badge earned (" + q.best + "/" + q.total + ")" : "✓ Attended · best " + q.best + "/" + q.total;
            } else if (s.type === "exam") {
              var qe = quizRec(p, s.quizId);
              status = qe.done ? "✓ Passed! " + qe.best + "/" + qe.total : "✓ Taken · best " + qe.best + "/" + qe.total;
            } else if (s.type === "study") {
              status = "✓ Reviewed";
            } else {
              var h = hwRec(p, s.hwId);
              status = "✓ Graded " + h.score + "/" + h.total;
            }
          }
          else if (isNext) { cls += " next"; status = "👉 Next up"; }
          else if (seenNext) { status = next && s.week > next.week ? "Coming up" : "Later this week"; }
          else { status = "Open"; }
          el.className = cls;
          var lbl = s.type === "recitation" ? "Recitation: " + course.name
                  : s.type === "study" ? "Study Hall"
                  : s.type === "exam" ? "Final Exam"
                  : course.name;
          el.innerHTML = '<span class="slot-time">' + s.time + " · " + (s.type === "lecture" ? "Lecture" : s.type === "recitation" ? "Recitation" : s.type === "exam" ? "Exam" : "Study") + "</span>" +
                         '<span class="slot-title">' + lbl + "</span>" +
                         '<span class="slot-sub">' + s.sub + "</span>" +
                         '<span class="slot-status">' + status + "</span>";
          col.appendChild(el);
        });
        tt.appendChild(col);
      });
    }

    var banner = document.getElementById("next-banner");
    if (banner) {
      if (next && next.href) {
        var c = COURSES[next.course];
        banner.innerHTML = "<strong>Next on your schedule:</strong> Week " + next.week + ", " + next.day + " " + next.time + " — " +
          '<a href="' + root + next.href + '">' + (next.type === "recitation" ? "Recitation: " : next.type === "study" ? "" : next.type === "exam" ? "" : "") + (next.type === "study" ? "Study Hall" : next.type === "exam" ? next.sub : c.name) + "</a>";
      } else if (next) {
        banner.innerHTML = "<strong>You're all caught up!</strong> Week " + next.week + " is still being written. Check back soon.";
      } else {
        banner.innerHTML = "<strong>Every week so far is complete!</strong> 🎉";
      }
    }

    renderShelf(p, shown);
  }

  function renderShelf(p, weekNum) {
    var shelf = document.getElementById("badge-shelf");
    if (!shelf) return;
    shelf.innerHTML = "";
    var W = weekOf(weekNum) || WEEKS[WEEKS.length - 1];
    var earned = 0, total = 0;
    (W ? W.slots : []).forEach(function (s) {
      if (s.type !== "lecture" && s.type !== "exam") return;
      total++;
      var q = quizRec(p, s.quizId);
      var ok = q && q.done;
      if (ok) earned++;
      var span = document.createElement("span");
      span.className = "shelf-badge" + (ok ? "" : " locked");
      span.title = COURSES[s.course].name + (ok ? " — badge earned" : " — not yet");
      span.textContent = COURSES[s.course].badge;
      shelf.appendChild(span);
    });
    var label = document.getElementById("shelf-count");
    if (label) label.textContent = "Week " + (W ? W.week : "") + ": " + earned + " of " + total + " badges";
  }

  // =====================================================================
  // Transcript — one table per built week, newest first
  // =====================================================================
  function initTranscript() {
    var root = document.getElementById("transcript-root");
    if (!root) return;
    var p = loadProgress();
    var html = "";
    var weeksBuilt = 0, weeksDone = 0, diplomas = 0, badges = 0, badgeTotal = 0;
    WEEKS.slice().reverse().forEach(function (w) {
      if (!weekBuilt(w)) return;
      weeksBuilt++;
      if (weekDone(w, p)) weeksDone++;
      var rows = "";
      w.slots.filter(function (s) { return s.type === "lecture"; }).forEach(function (s) {
        var c = COURSES[s.course];
        var q = quizRec(p, s.quizId);
        badgeTotal++; if (q && q.done) badges++;
        var rec = w.slots.filter(function (r) { return r.type === "recitation" && r.course === s.course; })[0];
        var h = rec ? hwRec(p, rec.hwId) : null;
        rows += "<tr>" +
          "<td>" + c.name + "</td>" +
          "<td>" + (q ? q.best + "/" + q.total : '<span class="none">not taken</span>') + "</td>" +
          '<td class="stamp">' + (q && q.done ? c.badge : '<span class="none">—</span>') + "</td>" +
          "<td>" + (h ? h.score + "/" + h.total : (rec && rec.href ? '<span class="none">not graded</span>' : '<span class="none">—</span>')) + "</td>" +
          '<td class="stamp">' + (h && h.done ? c.hw : '<span class="none">—</span>') + "</td>" +
          "</tr>";
      });
      w.slots.filter(function (s) { return s.type === "exam"; }).forEach(function (s) {
        var q = quizRec(p, s.quizId);
        badgeTotal++; if (q && q.done) { badges++; diplomas++; }
        rows += '<tr><td><strong>' + s.sub + "</strong></td>" +
          "<td>" + (q ? q.best + "/" + q.total : '<span class="none">not taken</span>') + "</td>" +
          '<td class="stamp">' + (q && q.done ? COURSES.general.badge : '<span class="none">—</span>') + "</td>" +
          '<td colspan="2">' + (q && q.done
            ? "🎓 Week " + w.week + " complete" + (s.certificate ? ' — <a href="' + rootPrefix() + s.certificate + '" target="_blank" rel="noopener">print the diploma</a>' : "")
            : '<span class="none">pass the final to earn the Week ' + w.week + ' diploma</span>') + "</td></tr>";
      });
      html += '<h2 class="tr-week">' + w.label + "</h2>" +
        '<div class="table-scroll"><table class="numbers transcript"><thead>' +
        "<tr><th>Course</th><th>Lecture quiz</th><th>Badge</th><th>Homework</th><th>Stamp</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
    });
    root.innerHTML = html;
    var sum = document.getElementById("transcript-summary");
    if (sum) sum.textContent = weeksDone + " of " + weeksBuilt + " weeks complete · " + diplomas + (diplomas === 1 ? " diploma" : " diplomas") + " · " + badges + " of " + badgeTotal + " badges";
    var builtWeeks = WEEKS.filter(weekBuilt);
    renderShelf(p, builtWeeks.length ? builtWeeks[builtWeeks.length - 1].week : 1);
  }

  // =====================================================================
  // Study hall: mark reviewed
  // =====================================================================
  function initStudy() {
    var btn = document.getElementById("study-done");
    if (!btn) return;
    var slotId = btn.getAttribute("data-slot");
    function paint() {
      var p = loadProgress();
      var done = p.study && p.study[slotId];
      btn.textContent = done ? "✓ Study hall complete" : "I've reviewed the sheet — mark study hall done";
      btn.disabled = !!done;
    }
    btn.addEventListener("click", function () {
      var p = loadProgress(); p.study = p.study || {}; p.study[slotId] = true; saveProgress(p);
      toast("Study hall complete. Good luck on the final!"); paint();
    });
    paint();
  }

  // =====================================================================
  // Warm-up (spaced repetition) — LESSON.warmup: [{q, a}]
  // =====================================================================
  function initWarmup() {
    var L = window.LESSON;
    var root = document.getElementById("warmup-root");
    if (!L || !root || !L.warmup) return;
    var html = "";
    L.warmup.forEach(function (w, i) {
      html += '<div class="wq"><div class="wq-q">' + (i + 1) + ". " + w.q + "</div>" +
        "<details><summary>Show the answer</summary><div class=\"wq-a\">" + w.a + "</div></details></div>";
    });
    root.innerHTML = html;
  }

  // =====================================================================
  // Quiz engine (+ Professor Mode: answer key & paper-score entry)
  // =====================================================================
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function initQuiz() {
    var L = window.LESSON;
    var root = document.getElementById("quiz-root");
    if (!L || !root || !window.QUIZZES) return;
    var quiz = window.QUIZZES[L.quizId];
    if (!quiz) { root.textContent = "Quiz not found: " + L.quizId; return; }
    var qs = quiz.questions, total = qs.length, need = passMark(total);
    var idx = 0, score = 0;

    // tools row
    var tools = document.getElementById("quiz-tools");
    if (tools) {
      tools.innerHTML =
        (L.printQuiz ? '<a href="' + L.printQuiz + '" target="_blank" rel="noopener">🖨️ Print this quiz (PDF)</a>' : "") +
        '<button type="button" class="prof-only" id="btn-key">🔑 Show answer key</button>' +
        '<button type="button" class="prof-only" id="btn-paper">📝 Enter paper score</button>';
      var panel = document.getElementById("prof-panel");
      document.addEventListener("profchange", function (e) { if (!e.detail.on) panel.style.display = "none"; });
      tools.querySelector("#btn-key").addEventListener("click", function () {
        var list = qs.map(function (q, i) {
          return "<li><strong>" + "ABCD"[q.answer] + "</strong> — " + esc(q.explain) + "</li>";
        }).join("");
        panel.innerHTML = "<h4>Answer key: " + esc(quiz.title) + "</h4><ol class=\"key-list\">" + list + "</ol>" +
          '<button type="button" id="btn-close-panel">Close</button>';
        panel.style.display = "block";
        panel.querySelector("#btn-close-panel").addEventListener("click", function () { panel.style.display = "none"; });
      });
      tools.querySelector("#btn-paper").addEventListener("click", function () {
        panel.innerHTML = "<h4>Grading a paper quiz</h4>" +
          "<p>Enter how many she got right out of " + total + ". This records the score and awards the badge (need " + need + ") without clicking through the web quiz.</p>" +
          '<label>Number correct: <input type="number" id="paper-score" min="0" max="' + total + '"></label>' +
          '<button type="button" id="btn-save-paper">Record score</button>';
        panel.style.display = "block";
        panel.querySelector("#btn-save-paper").addEventListener("click", function () {
          var v = parseInt(panel.querySelector("#paper-score").value, 10);
          if (isNaN(v) || v < 0 || v > total) { alert("Enter a number from 0 to " + total + "."); return; }
          panel.style.display = "none";
          score = v;
          renderResult(true);
        });
      });
    }

    function renderQuestion() {
      var q = qs[idx];
      root.innerHTML =
        '<div class="quiz-progress">Question ' + (idx + 1) + " of " + total + " &nbsp;·&nbsp; Score so far: " + score + "</div>" +
        '<div class="quiz-q">' + esc(q.q) + "</div><div class=\"quiz-choices\"></div><div class=\"quiz-after\"></div>";
      var box = root.querySelector(".quiz-choices");
      q.choices.forEach(function (c, i) {
        var b = document.createElement("button");
        b.className = "quiz-choice"; b.type = "button";
        b.textContent = "ABCD"[i] + ".  " + c;
        b.addEventListener("click", function () { answer(i, b); });
        box.appendChild(b);
      });
    }

    function answer(i, btn) {
      var q = qs[idx], good = i === q.answer;
      if (good) score++;
      root.querySelectorAll(".quiz-choice").forEach(function (b, bi) {
        b.disabled = true;
        if (bi === q.answer) b.classList.add("correct");
      });
      if (!good) btn.classList.add("wrong");
      var after = root.querySelector(".quiz-after");
      var verdict = good ? ["Yes! 🎉", "Exactly right! ⭐", "You got it! 🙌", "Correct — nice thinking! 💡"][idx % 4]
                         : "Not quite — here's the real story:";
      after.innerHTML = '<div class="quiz-explain ' + (good ? "good" : "bad") + '"><div class="qe-verdict">' + esc(verdict) +
        "</div><div>" + esc(q.explain) + "</div></div>" +
        '<button class="quiz-next" type="button">' + (idx + 1 < total ? "Next question →" : "See my results →") + "</button>";
      var nb = after.querySelector(".quiz-next");
      nb.addEventListener("click", function () { idx++; idx < total ? renderQuestion() : renderResult(false); });
      nb.focus();
    }

    function renderResult(fromPaper) {
      var passed = score >= need;
      var p = loadProgress();
      p.quizzes = p.quizzes || {};
      var rec = p.quizzes[L.quizId] || { best: 0, total: total, done: false, attempted: false };
      rec.total = total; rec.attempted = true;
      if (score > rec.best) rec.best = score;
      if (passed) rec.done = true;
      p.quizzes[L.quizId] = rec;
      saveProgress(p);

      var badge = quiz.badge || "🏅";
      var src = fromPaper ? " (from the paper quiz)" : "";
      var html;
      if (passed && L.certificate) {
        var wslot = slotById(L.slotId), wn = wslot ? wslot.week : "";
        html = '<div class="quiz-result"><div class="qr-emoji">' + badge + "</div><h3>You passed the " + esc(quiz.title) + "!</h3>" +
          "<p>Score: <strong>" + score + " / " + total + "</strong>" + src + ". Nine courses, nine homeworks, one final — Week " + wn + " is complete. " +
          'Your diploma is ready to print: <a href="' + L.certificate + '" target="_blank" rel="noopener">Week ' + wn + ' Certificate (PDF)</a>.</p>' +
          '<button class="quiz-next" type="button" data-act="home">Back to the timetable</button>' +
          '<button class="quiz-next quiz-retry" type="button" data-act="retry">Take it again</button></div>';
      } else if (passed) {
        html = '<div class="quiz-result"><div class="qr-emoji">' + badge + "</div><h3>Badge earned!</h3>" +
          "<p>Score: <strong>" + score + " / " + total + "</strong>" + src + ". The <strong>" + esc(COURSES[quiz.course].name) +
          "</strong> badge is on your transcript.</p>" +
          '<button class="quiz-next" type="button" data-act="home">Back to the timetable</button>' +
          '<button class="quiz-next quiz-retry" type="button" data-act="retry">Take the quiz again</button></div>';
      } else {
        html = '<div class="quiz-result"><div class="qr-emoji">💪</div><h3>Not yet — but close!</h3>' +
          "<p>Score: <strong>" + score + " / " + total + "</strong>" + src + ". You need " + need + " for the badge. " +
          "Look back at the big-idea boxes and your notes, then try again. You've still attended the class, so the timetable moves on.</p>" +
          '<button class="quiz-next quiz-retry" type="button" data-act="retry">Try again</button>' +
          '<button class="quiz-next" type="button" data-act="home">Back to the timetable</button></div>';
      }
      root.innerHTML = html;
      root.querySelectorAll(".quiz-next").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.getAttribute("data-act") === "retry") { idx = 0; score = 0; renderQuestion(); }
          else location.href = rootPrefix() + "index.html";
        });
      });
    }

    renderQuestion();
  }

  // =====================================================================
  // Recitation page: homework score entry (Professor Mode)
  // =====================================================================
  function initRecitation() {
    var R = window.RECITATION;
    var root = document.getElementById("hw-root");
    if (!R || !root) return;

    function render() {
      var p = loadProgress();
      var h = hwRec(p, R.hwId);
      var status = h ? "<p><strong>✓ Graded:</strong> " + h.score + " / " + h.total + " points. Homework stamp earned " + COURSES[R.course].hw + "</p>"
                     : "<p class=\"muted\">Not graded yet. When the homework is done, the professor enters the score here.</p>";
      root.innerHTML = status +
        '<div class="prof-panel prof-only"><h4>Grade the homework</h4>' +
        "<p>Use the answer key, then enter the points earned (out of " + R.total + ").</p>" +
        '<label>Points: <input type="number" id="hw-score" min="0" max="' + R.total + '"' + (h ? ' value="' + h.score + '"' : "") + "></label>" +
        '<button type="button" id="hw-save">Record score</button></div>';
      root.querySelector("#hw-save").addEventListener("click", function () {
        var v = parseInt(root.querySelector("#hw-score").value, 10);
        if (isNaN(v) || v < 0 || v > R.total) { alert("Enter a number from 0 to " + R.total + "."); return; }
        var p2 = loadProgress();
        p2.homework = p2.homework || {};
        p2.homework[R.hwId] = { score: v, total: R.total, done: true };
        saveProgress(p2);
        toast("Homework recorded: " + v + "/" + R.total + " " + COURSES[R.course].hw);
        render();
      });
    }
    render();
  }

  // =====================================================================
  // Prev / next navigation along the schedule
  // =====================================================================
  function initNav() {
    var here = (window.LESSON && window.LESSON.slotId) || (window.RECITATION && window.RECITATION.slotId);
    var nav = document.getElementById("lesson-nav");
    if (!here || !nav) return;
    var i = -1;
    SCHEDULE.forEach(function (s, k) { if (s.id === here) i = k; });
    if (i < 0) return;
    var root = rootPrefix();
    function label(s) {
      var c = COURSES[s.course].name;
      return s.day + " " + s.time + " · " + (s.type === "recitation" ? "Recitation: " + c : s.type === "exam" ? "Final Exam" : s.type === "study" ? "Study Hall" : c);
    }
    var html = "";
    if (i > 0) {
      var prev = SCHEDULE[i - 1];
      html += prev.href ? '<a href="' + root + prev.href + '">← ' + label(prev) + "</a>" : "<span></span>";
    } else html += '<a href="' + root + 'index.html">← Timetable</a>';
    if (i < SCHEDULE.length - 1) {
      var next = SCHEDULE[i + 1];
      html += next.href ? '<a href="' + root + next.href + '">' + label(next) + " →</a>"
                        : '<a href="' + root + 'index.html">' + label(next) + " (coming soon) →</a>";
    }
    nav.innerHTML = html;
  }

  // =====================================================================
  // Vocabulary popovers — wraps words from window.VOCAB inside lesson text
  // =====================================================================
  var SKIP_SELECTOR = "script, style, a, button, summary, h1, h2, h3, h4, .kicker, .quiz-zone, .vocab, .vocab-pop, .read-controls, .topbar, .lesson-nav, .slot, .box-title, .cue-label";

  function initVocab() {
    var V = window.VOCAB;
    var main = document.querySelector("main");
    if (!V || !main || document.body.getAttribute("data-vocab") === "off") return;
    var words = Object.keys(V).sort(function (a, b) { return b.length - a.length; });
    var re = new RegExp("(^|[^A-Za-z-])(" + words.map(function (w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|") + ")(?![A-Za-z-])", "gi");

    var seen = {};
    var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var el = n.parentElement;
        if (!el || el.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var text = node.nodeValue;
      re.lastIndex = 0;
      var frag = null, last = 0, m;
      while ((m = re.exec(text)) !== null) {
        var key = m[2].toLowerCase();
        var block = node.parentElement.closest("p, li, dd, td") || node.parentElement;
        var blockKey = key + "@" + (block.__vid || (block.__vid = Math.random()));
        if (seen[blockKey]) continue;           // first occurrence per paragraph only
        seen[blockKey] = true;
        if (!frag) frag = document.createDocumentFragment();
        var start = m.index + m[1].length;
        frag.appendChild(document.createTextNode(text.slice(last, start)));
        var span = document.createElement("span");
        span.className = "vocab";
        span.setAttribute("data-word", key);
        span.setAttribute("tabindex", "0");
        span.textContent = m[2];
        frag.appendChild(span);
        last = start + m[2].length;
      }
      if (frag) {
        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });

    var pop = null;
    function closePop() { if (pop) { pop.remove(); pop = null; } }
    function openPop(span) {
      closePop();
      var key = span.getAttribute("data-word");
      var entry = V[key] || V[Object.keys(V).filter(function (k) { return k.toLowerCase() === key; })[0]];
      if (!entry) return;
      pop = document.createElement("div");
      pop.className = "vocab-pop";
      pop.innerHTML = '<button class="vp-close" type="button" aria-label="Close">×</button>' +
        '<div class="vp-word">' + esc(span.textContent) + ' <span class="vp-say">' + esc(entry.say || "") + "</span>" +
        '<button type="button" class="vp-speak">🔊 say it</button></div>' +
        '<p class="vp-def">' + esc(entry.def) + "</p>";
      document.body.appendChild(pop);
      var r = span.getBoundingClientRect();
      var left = Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - pop.offsetWidth - 12);
      pop.style.left = Math.max(8, left) + "px";
      pop.style.top = (r.bottom + window.scrollY + 8) + "px";
      pop.querySelector(".vp-close").addEventListener("click", closePop);
      pop.querySelector(".vp-speak").addEventListener("click", function () {
        speakText(span.textContent + ". " + entry.def, null);
      });
    }
    main.addEventListener("click", function (e) {
      var s = e.target.closest(".vocab");
      if (s) { e.preventDefault(); openPop(s); }
      else if (!e.target.closest(".vocab-pop")) closePop();
    });
    main.addEventListener("keydown", function (e) {
      var s = e.target.closest(".vocab");
      if (s && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPop(s); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePop(); });
  }

  // =====================================================================
  // Read-aloud (Web Speech API — uses the Mac's built-in voices, offline)
  // =====================================================================
  var TTS_PRON = [
    [/\bNICU\b/g, "nick you"], [/\bNICUniversity\b/g, "nick university"],
    [/\balveoli\b/gi, "al vee oh lie"], [/\balveolus\b/gi, "al vee oh lus"],
    [/\bisolette\b/gi, "eye so let"], [/\bbilirubin\b/gi, "billy rubin"],
    [/\bCPAP\b/g, "see pap"], [/\bSpO₂\b/g, "S P O 2"], [/\bmmHg\b/g, "millimeters of mercury"],
    [/H₂O/g, "H 2 O"], [/CO₂/g, "C O 2"], [/O₂/g, "O 2"], [/N₂/g, "N 2"], [/C₆H₁₂O₆/g, "C 6 H 12 O 6"],
    [/\bPriestley\b/g, "Preestly"], [/\bLeeuwenhoek\b/g, "Lay-ven-hook"], [/\bApgar\b/g, "Ap-gar"],
    [/\bmitochondria\b/gi, "my toe kon dree uh"], [/\bhemoglobin\b/gi, "hee moe glow bin"],
    [/\bneonatologist\b/gi, "nee oh nay tol o jist"], [/\bpreemie(s?)\b/gi, "preemee$1"],
    [/→/g, " becomes "], [/[✦★☆✓✔️🎉⭐💡📝🔊🖨️🔑👉🔒]/g, ""],
    [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ""]
  ];

  function ttsText(s) {
    TTS_PRON.forEach(function (p) { s = s.replace(p[0], p[1]); });
    return s.replace(/\s+/g, " ").trim();
  }

  var speech = {
    supported: "speechSynthesis" in window && "SpeechSynthesisUtterance" in window,
    rate: 1.0, voice: null, queue: [], current: null, reading: false
  };

  // macOS ships a pile of novelty voices (Zarvox, Bells, Bad News...). Keep the natural ones.
  var NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Agnes|Bruce|Vicki|Victoria|Princess|Hysterical|Pipe|Deranged/i;

  function goodVoices() {
    var voices = window.speechSynthesis.getVoices().filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
    var natural = voices.filter(function (v) { return !NOVELTY.test(v.name); });
    return natural.length ? natural : voices;
  }

  function pickVoice() {
    var voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    var en = goodVoices();
    var google = en.filter(function (v) { return /Google US English/i.test(v.name); });
    var pref = en.filter(function (v) { return /Samantha|Ava|Allison|Zoe|Karen|Serena|Daniel|Moira/i.test(v.name); });
    var enUS = en.filter(function (v) { return /en[-_]US/i.test(v.lang); });
    return google[0] || pref[0] || enUS[0] || en[0] || voices[0];
  }

  function splitSentences(text) {
    return text.match(/[^.!?]+[.!?]+["”’)]?|[^.!?]+$/g) || [text];
  }

  function stopSpeaking() {
    speech.queue = [];
    speech.reading = false;
    if (speech.supported) window.speechSynthesis.cancel();
    document.querySelectorAll(".readable.speaking").forEach(function (el) { el.classList.remove("speaking"); });
    speech.current = null;
  }

  // speak one element (or raw text) then call done()
  function speakText(text, el, done) {
    if (!speech.supported) return;
    window.speechSynthesis.cancel();
    if (el) { document.querySelectorAll(".readable.speaking").forEach(function (x) { x.classList.remove("speaking"); }); el.classList.add("speaking"); }
    var parts = splitSentences(ttsText(text));
    var i = 0;
    function next() {
      if (i >= parts.length) { if (el) el.classList.remove("speaking"); if (done) done(); return; }
      var u = new SpeechSynthesisUtterance(parts[i++]);
      u.rate = speech.rate;
      if (speech.voice) u.voice = speech.voice;
      u.onend = next;
      u.onerror = function () { if (el) el.classList.remove("speaking"); };
      window.speechSynthesis.speak(u);
    }
    next();
  }

  function initReadAloud() {
    var main = document.querySelector("main");
    var controls = document.getElementById("read-controls");
    if (!main || document.body.getAttribute("data-read") === "off") return;

    if (!speech.supported) {
      if (controls) controls.innerHTML = '<span class="no-speech">Read-aloud isn\'t available in this browser. Try Safari or Chrome.</span>';
      return;
    }
    var voiceSel = null;
    if (window.speechSynthesis.getVoices().length) speech.voice = pickVoice();
    window.speechSynthesis.onvoiceschanged = function () { if (!speech.voice) speech.voice = pickVoice(); if (voiceSel) fillVoices(); };

    // add a speaker button to every paragraph-like block
    var targets = main.querySelectorAll("p, li, dd");
    var readables = [];
    targets.forEach(function (el) {
      if (el.closest(".quiz-zone, .read-controls, .lesson-nav, .warmup summary, .vocab-pop, .slot")) return;
      if (!el.textContent.trim()) return;
      el.classList.add("readable");
      var b = document.createElement("button");
      b.className = "say-btn"; b.type = "button"; b.title = "Read this aloud"; b.setAttribute("aria-label", "Read this paragraph aloud");
      b.textContent = "🔊";
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (el.classList.contains("speaking")) { stopSpeaking(); return; }
        stopSpeaking();
        speakText(el.textContent, el);
      });
      el.insertBefore(b, el.firstChild);
      readables.push(el);
    });

    if (!controls) return;
    controls.innerHTML =
      '<span>🎧 Professor voice:</span>' +
      '<button type="button" class="primary" id="read-all">▶ Read this class</button>' +
      '<button type="button" id="read-stop">■ Stop</button>' +
      '<select id="read-rate" title="Speed"><option value="0.85">Slower</option><option value="1" selected>Normal</option><option value="1.15">Faster</option></select>' +
      '<select id="read-voice" title="Voice"></select>';
    voiceSel = controls.querySelector("#read-voice");
    function fillVoices() {
      if (!voiceSel) return;
      var voices = goodVoices();
      if (!voices.length) return;
      voiceSel.innerHTML = voices.map(function (v) {
        return '<option value="' + esc(v.name) + '"' + (speech.voice && v.name === speech.voice.name ? " selected" : "") + ">" + esc(v.name) + "</option>";
      }).join("");
    }
    fillVoices();
    voiceSel.addEventListener("change", function () {
      speech.voice = window.speechSynthesis.getVoices().filter(function (v) { return v.name === voiceSel.value; })[0] || speech.voice;
    });
    controls.querySelector("#read-rate").addEventListener("change", function (e) { speech.rate = parseFloat(e.target.value); });
    controls.querySelector("#read-stop").addEventListener("click", stopSpeaking);
    controls.querySelector("#read-all").addEventListener("click", function () {
      stopSpeaking();
      speech.reading = true;
      var i = 0;
      function nextEl() {
        if (!speech.reading || i >= readables.length) { speech.reading = false; return; }
        var el = readables[i++];
        if (!el.offsetParent) { nextEl(); return; }   // hidden (e.g., closed <details>)
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        speakText(el.textContent, el, nextEl);
      }
      nextEl();
    });
    window.addEventListener("beforeunload", stopSpeaking);
  }

  // =====================================================================
  document.addEventListener("DOMContentLoaded", function () {
    initProf();
    var page = document.body.getAttribute("data-page");
    if (page === "home") initHome();
    if (page === "transcript") initTranscript();
    initWarmup();
    initQuiz();
    initRecitation();
    initStudy();
    initNav();
    initVocab();
    initReadAloud();

    var reset = document.getElementById("reset-progress");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Erase all NICUniversity progress, badges, and the Professor code?")) {
        localStorage.removeItem(STORE_KEY); sessionStorage.removeItem("nicuProf"); location.reload();
      }
    });
  });

  window.NICU = { WEEKS: WEEKS, SCHEDULE: SCHEDULE, COURSES: COURSES, loadProgress: loadProgress };
})();
