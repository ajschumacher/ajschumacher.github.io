/* NICU Night Shift — the three helpers everything needs.

   Small, pure, and loaded first. Nothing in here knows about the game; it is here because
   the same three functions had been written more than once each and one of the copies was
   wrong.

   THE ESCAPER, AND WHY THERE IS ONLY ONE NOW.
   There were two. game.js built a detached <div>, set textContent and read innerHTML back,
   which escapes &, < and > and does NOT escape the double quote. glossary.js did it with
   four regex replaces and did escape it. That difference was invisible until you looked at
   where the first one is used: twenty-eight of its call sites in game.js sit inside a
   quoted HTML attribute - data-tip, aria-label, data-focus-key, title.

   Measured on the string `she said "not right" again`:

       <button data-tip="she said "not right" again">

   ...parses as a tooltip reading `she said ` plus three invented attributes named `not`,
   `right"` and `again"`. No authored string in the game contains a double quote today, so
   nothing is broken right now - but every concern summary, action blurb, colleague name and
   baby name flows through those call sites, and the first author to write a quoted phrase
   into one would have got a mangled tooltip and no error to explain it.

   So: one escaper, and it is the careful one. */
(function () {
  "use strict";

  /* Null and undefined come out as an empty string rather than the words "null" and
     "undefined", which is what the DOM-based version did and what every caller assumes. */
  function esc(s) {
    return s == null ? "" : String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cap(s) {
    s = s == null ? "" : String(s);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* Which of the six bed colours this cot wears. Identical copies of this lived in game.js
     and report.js, so the report could have drifted out of step with the unit it was
     describing - the one place where a colour actually has to mean the same thing twice. */
  function bedAccent(b) { return "bed-c" + (((b.bed - 1) % 6) + 1); }

  window.Util = { esc: esc, cap: cap, bedAccent: bedAccent };
})();
