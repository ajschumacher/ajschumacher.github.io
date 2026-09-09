/* NICU Night Shift — SVG art. All drawn inline; no external assets. */
(function () {
  "use strict";

  // ---- skin tones by perfusion/color state -------------------------------
  var TONES = {
    // base, shadow  (baby's own complexion)
    a: ["#f6c390", "#e0a370"],
    b: ["#c98c5a", "#a97044"],
    c: ["#8a5a33", "#6f4526"],
    d: ["#ffd9b0", "#e8bd90"]
  };

  function tint(hex, mixHex, amt) {
    function p(h) { return [parseInt(h.substr(1,2),16), parseInt(h.substr(3,2),16), parseInt(h.substr(5,2),16)]; }
    var a = p(hex), b = p(mixHex), o = "#";
    for (var i = 0; i < 3; i++) {
      var v = Math.round(a[i] + (b[i] - a[i]) * amt);
      o += ("0" + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
    }
    return o;
  }

  // look = { tone, color:'pink'|'pale'|'dusky'|'mottled', jaundice:0..1,
  //          eyes:'open'|'closed'|'shielded', effort:0..1, support, photo, active:0..1 }
  function skinFor(look) {
    var base = (TONES[look.tone] || TONES.a)[0];
    var shade = (TONES[look.tone] || TONES.a)[1];
    if (look.color === "pale")    { base = tint(base, "#e8e2dc", .45); shade = tint(shade, "#e8e2dc", .35); }
    if (look.color === "dusky")   { base = tint(base, "#7f6f9e", .42); shade = tint(shade, "#6a5c8a", .40); }
    if (look.color === "mottled") { base = tint(base, "#b08aa0", .30); shade = tint(shade, "#8f6a80", .30); }
    if (look.jaundice > 0) {
      var j = Math.min(1, look.jaundice);
      base = tint(base, "#f5d44a", .40 * j); shade = tint(shade, "#d8b52e", .40 * j);
    }
    return [base, shade];
  }

  /* Baby lying in an isolette, seen from above-ish. w = width in px units of a 120x100 viewBox. */
  function baby(look) {
    look = look || {};
    var sk = skinFor(look), base = sk[0], shade = sk[1];
    var effort = look.effort || 0;
    var s = [];
    s.push('<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="baby">');

    // nest / blanket roll
    s.push('<ellipse cx="60" cy="62" rx="49" ry="29" fill="#3c4a60"/>');
    s.push('<ellipse cx="60" cy="60" rx="43" ry="24" fill="#4d5d76"/>');

    // photo-therapy glow
    if (look.photo) {
      s.push('<ellipse cx="60" cy="58" rx="52" ry="30" fill="#4fc3f7" opacity="' + (look.photo > 1 ? .30 : .18) + '"/>');
    }

    // body (swaddled or open)
    if (look.swaddled) {
      s.push('<ellipse cx="55" cy="60" rx="32" ry="20" fill="#3f6d8e"/>');
      s.push('<path d="M 30 56 Q 56 46 82 58" fill="none" stroke="#588fb4" stroke-width="2"/>');
    } else {
      s.push('<ellipse cx="55" cy="60" rx="30" ry="18" fill="' + base + '"/>');
      // arms up, frog-leg posture; more splayed when stressed
      var sp = 1 + (look.stress || 0) * 0.5;
      s.push('<ellipse cx="' + (40 - 3 * sp) + '" cy="' + (48 - 2 * sp) + '" rx="10" ry="6" fill="' + base + '" transform="rotate(-35 40 48)"/>');
      s.push('<ellipse cx="' + (40 - 3 * sp) + '" cy="' + (73 + 2 * sp) + '" rx="10" ry="6" fill="' + base + '" transform="rotate(35 40 73)"/>');
      s.push('<ellipse cx="34" cy="60" rx="9" ry="6" fill="' + shade + '" transform="rotate(-8 34 60)"/>');
      // diaper
      s.push('<path d="M 34 52 Q 26 60 34 69 L 44 66 Q 40 60 44 55 Z" fill="#eef2f7"/>');
    }

    // ribs retracting (visible work of breathing)
    if (!look.swaddled && effort > .35) {
      var o = Math.min(.55, effort * .6);
      s.push('<path d="M 58 52 q 4 8 0 16" fill="none" stroke="' + shade + '" stroke-width="1.6" opacity="' + o + '"/>');
      s.push('<path d="M 64 51 q 4 9 0 18" fill="none" stroke="' + shade + '" stroke-width="1.6" opacity="' + o + '"/>');
    }

    // head
    s.push('<circle cx="89" cy="58" r="19" fill="' + base + '"/>');
    // hat
    if (look.hat) {
      s.push('<path d="M 71 54 Q 74 40 88 40 Q 102 40 105 54 Q 88 48 71 54 Z" fill="' + (look.hat === "cpap" ? "#3f88c5" : "#ff6b6b") + '"/>');
    }
    // eyes
    if (look.eyes === "shielded") {
      s.push('<rect x="78" y="53" width="21" height="8" rx="4" fill="#141b28"/>');
    } else if (look.eyes === "open") {
      s.push('<circle cx="83" cy="57" r="2" fill="#141b28"/><circle cx="94" cy="57" r="2" fill="#141b28"/>');
    } else {
      s.push('<path d="M 80 57 q 3 2.5 6 0" fill="none" stroke="#141b28" stroke-width="1.6" stroke-linecap="round"/>');
      s.push('<path d="M 91 57 q 3 2.5 6 0" fill="none" stroke="#141b28" stroke-width="1.6" stroke-linecap="round"/>');
    }
    // mouth: grimace when in pain, open when working hard
    if (look.eyes !== "shielded") {
      if ((look.pain || 0) > .4) s.push('<path d="M 84 66 q 4 -3 8 0" fill="none" stroke="#8a3a3a" stroke-width="1.8" stroke-linecap="round"/>');
      else if (effort > .5)      s.push('<ellipse cx="88" cy="66" rx="3.4" ry="2.6" fill="#7d3d3d"/>');
      else                        s.push('<path d="M 84 65 q 4 3 8 0" fill="none" stroke="#8a3a3a" stroke-width="1.6" stroke-linecap="round"/>');
    }

    // respiratory support gear
    if (look.support === "VENT") {
      s.push('<path d="M 88 68 L 88 84 Q 88 92 104 96" fill="none" stroke="#dfe6ee" stroke-width="4.5" stroke-linecap="round"/>');
      s.push('<rect x="82" y="64" width="12" height="5" rx="2" fill="#c8d3e0"/>');
    } else if (look.support === "CPAP") {
      s.push('<rect x="83" y="60" width="11" height="5" rx="2.5" fill="#3f88c5"/>');
      s.push('<path d="M 83 62 Q 66 70 58 88" fill="none" stroke="#3f88c5" stroke-width="3.5" stroke-linecap="round"/>');
      s.push('<path d="M 94 62 Q 108 70 114 88" fill="none" stroke="#3f88c5" stroke-width="3.5" stroke-linecap="round"/>');
    } else if (look.support === "NC") {
      s.push('<path d="M 84 61 L 94 61" stroke="#5ef2a0" stroke-width="2.4" stroke-linecap="round"/>');
      s.push('<path d="M 84 61 Q 70 72 64 90" fill="none" stroke="#5ef2a0" stroke-width="2.2" stroke-linecap="round"/>');
    }

    // pulse-ox probe on the foot (or dangling if the probe is off)
    if (look.probeOff) {
      s.push('<rect x="18" y="78" width="14" height="7" rx="3.5" fill="#ff6b6b" opacity=".85"/>');
      s.push('<path d="M 25 82 Q 12 88 6 96" fill="none" stroke="#7d3a48" stroke-width="2"/>');
    } else {
      s.push('<rect x="27" y="55" width="13" height="10" rx="5" fill="#ff6b6b" opacity=".9"/>');
      s.push('<ellipse cx="33" cy="60" rx="9" ry="7" fill="#ff2e20" opacity=".22"/>');
      s.push('<path d="M 27 60 Q 14 72 8 92" fill="none" stroke="#7d3a48" stroke-width="2"/>');
    }

    // lines: umbilical / PICC
    if (look.uvc) s.push('<path d="M 50 60 Q 30 44 12 34" fill="none" stroke="#ffc857" stroke-width="2.2"/>');
    if (look.feedTube) s.push('<path d="M 90 64 Q 96 78 106 86" fill="none" stroke="#ffc857" stroke-width="2"/>');
    // ECG leads
    s.push('<circle cx="62" cy="54" r="2.6" fill="#fff" opacity=".85"/><circle cx="62" cy="66" r="2.6" fill="#fff" opacity=".85"/>');

    s.push("</svg>");
    return s.join("");
  }

  /* The isolette / bedspace, with the baby inside. */
  function isolette(look, opts) {
    opts = opts || {};
    var s = [];
    s.push('<svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="isolette">');
    if (opts.photo) s.push('<rect x="30" y="6" width="200" height="16" rx="7" fill="#1d2a3a"/>' +
      '<circle cx="70" cy="14" r="5" fill="#4fc3f7"/><circle cx="110" cy="14" r="5" fill="#4fc3f7"/>' +
      '<circle cx="150" cy="14" r="5" fill="#4fc3f7"/><circle cx="190" cy="14" r="5" fill="#4fc3f7"/>' +
      '<polygon points="40,22 220,22 236,120 24,120" fill="#4fc3f7" opacity=".14"/>');
    // stand
    s.push('<rect x="34" y="168" width="192" height="10" rx="5" fill="#1f2a3a"/>');
    s.push('<rect x="52" y="178" width="9" height="18" rx="4" fill="#2c3850"/><rect x="199" y="178" width="9" height="18" rx="4" fill="#2c3850"/>');
    // base cabinet
    s.push('<rect x="30" y="132" width="200" height="38" rx="9" fill="#27405c"/>');
    s.push('<rect x="42" y="142" width="52" height="17" rx="4" fill="#060a10"/>');
    s.push('<text x="68" y="155" font-size="11" fill="#5ef2a0" text-anchor="middle" font-family="monospace">' + (opts.iso || "36.8") + '&#176;</text>');
    if (opts.humidity) {
      s.push('<rect x="104" y="142" width="46" height="17" rx="4" fill="#060a10"/>');
      s.push('<text x="127" y="155" font-size="10" fill="#6cb6ff" text-anchor="middle" font-family="monospace">' + opts.humidity + '%</text>');
    }
    // warm lit interior so the baby reads clearly against a dark room
    s.push('<path d="M 38 132 L 38 74 Q 38 44 76 44 L 184 44 Q 222 44 222 74 L 222 132 Z" fill="#33445c"/>');
    s.push('<ellipse cx="130" cy="112" rx="86" ry="34" fill="#4a5f7d" opacity=".85"/>');
    // baby inside
    s.push('<g transform="translate(48,58) scale(1.38)">');
    s.push(baby(look).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, ""));
    s.push("</g>");
    // clear hood drawn over the top
    var hood = opts.open ? .06 : .17;
    s.push('<path d="M 38 132 L 38 74 Q 38 44 76 44 L 184 44 Q 222 44 222 74 L 222 132 Z" fill="#cfe6ff" opacity="' + hood + '" stroke="#6d90b6" stroke-width="2.5"/>');
    s.push('<circle cx="74" cy="120" r="9" fill="none" stroke="#6d90b6" stroke-width="2.5"/>');
    s.push('<circle cx="186" cy="120" r="9" fill="none" stroke="#6d90b6" stroke-width="2.5"/>');
    if (opts.open) s.push('<text x="130" y="36" font-size="11" fill="#ffc857" text-anchor="middle">portholes open</text>');
    s.push("</svg>");
    return s.join("");
  }

  /* Character avatars — simple, warm, distinct. */
  var AVATARS = {
    renata:  { skin: "#c98c5a", hair: "#2b2b33", style: "bun",   scrub: "#2ec4b6" },
    desmond: { skin: "#8a5a33", hair: "#1b1b20", style: "short", scrub: "#6cb6ff" },
    priya:   { skin: "#d9a066", hair: "#241c1c", style: "long",  scrub: "#b39ddb" },
    tomas:   { skin: "#e0a370", hair: "#4a3628", style: "short", scrub: "#ffffff" },
    ingrid:  { skin: "#f0c9a0", hair: "#c9a24a", style: "bob",   scrub: "#ffffff" },
    nell:    { skin: "#b07a4e", hair: "#5c3a7a", style: "curl",  scrub: "#ffc857" },
    parent1: { skin: "#c98c5a", hair: "#33251c", style: "long",  scrub: "#48607f" },
    parent2: { skin: "#8a5a33", hair: "#15151a", style: "short", scrub: "#5e5470" },
    parent3: { skin: "#f0c9a0", hair: "#7a4a2a", style: "bob",   scrub: "#6d5548" },
    phone:   { phone: true },
    you:     { skin: "#e0a370", hair: "#3a2a1e", style: "short", scrub: "#ffffff" }
  };

  function avatar(id) {
    var a = AVATARS[id] || AVATARS.renata;
    var s = ['<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="portrait">'];
    s.push('<circle cx="40" cy="40" r="38" fill="#212b3d"/>');
    if (a.phone) {
      s.push('<rect x="28" y="18" width="24" height="44" rx="7" fill="#2c3850" stroke="#4a5a78" stroke-width="2"/>');
      s.push('<rect x="32" y="24" width="16" height="26" rx="3" fill="#5ef2a0" opacity=".3"/>');
      s.push('<circle cx="40" cy="56" r="3" fill="#4a5a78"/>');
      s.push('<path d="M 58 26 q 7 -4 7 6" fill="none" stroke="#5ef2a0" stroke-width="2.4" stroke-linecap="round"/>');
      s.push('<path d="M 62 20 q 12 -6 12 12" fill="none" stroke="#5ef2a0" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>');
      s.push("</svg>"); return s.join("");
    }
    // shoulders / scrubs
    s.push('<path d="M 12 80 Q 12 56 40 56 Q 68 56 68 80 Z" fill="' + a.scrub + '"/>');
    s.push('<path d="M 40 56 L 34 80 M 40 56 L 46 80" stroke="rgba(0,0,0,.18)" stroke-width="2"/>');
    // head
    s.push('<circle cx="40" cy="36" r="18" fill="' + a.skin + '"/>');
    // hair
    if (a.style === "bun")   s.push('<path d="M 22 34 Q 24 16 40 16 Q 56 16 58 34 Q 48 26 40 27 Q 32 26 22 34 Z" fill="' + a.hair + '"/><circle cx="40" cy="13" r="7" fill="' + a.hair + '"/>');
    if (a.style === "short") s.push('<path d="M 22 34 Q 24 16 40 16 Q 56 16 58 34 Q 48 25 40 26 Q 32 25 22 34 Z" fill="' + a.hair + '"/>');
    if (a.style === "long")  s.push('<path d="M 20 36 Q 20 14 40 14 Q 60 14 60 36 L 60 52 Q 54 40 40 41 Q 26 40 20 52 Z" fill="' + a.hair + '"/>');
    if (a.style === "bob")   s.push('<path d="M 21 38 Q 21 15 40 15 Q 59 15 59 38 Q 52 30 40 31 Q 28 30 21 38 Z" fill="' + a.hair + '"/>');
    if (a.style === "curl")  s.push('<circle cx="28" cy="24" r="9" fill="' + a.hair + '"/><circle cx="40" cy="18" r="10" fill="' + a.hair + '"/><circle cx="52" cy="24" r="9" fill="' + a.hair + '"/>');
    // face
    s.push('<circle cx="34" cy="36" r="2.1" fill="#1b2230"/><circle cx="46" cy="36" r="2.1" fill="#1b2230"/>');
    s.push('<path d="M 35 44 q 5 4 10 0" fill="none" stroke="#1b2230" stroke-width="2" stroke-linecap="round"/>');
    // stethoscope for clinical staff
    if (id === "renata" || id === "desmond" || id === "ingrid") {
      s.push('<path d="M 30 58 Q 28 72 40 74 Q 52 72 50 58" fill="none" stroke="#1e2a3a" stroke-width="2.6"/>');
      s.push('<circle cx="40" cy="76" r="4" fill="#1e2a3a"/>');
    }
    s.push("</svg>");
    return s.join("");
  }

  /* Rolling monitor trace. vals = array of 0..1, color, kind */
  function trace(vals, color, kind) {
    var W = 240, H = 34, n = vals.length || 1, pts = [], i;
    if (kind === "ecg") {
      // draw a repeating QRS-ish waveform whose spacing follows the rate
      var d = "", x = 0, beats = Math.max(3, Math.round((vals.rate || 140) / 26));
      var step = W / beats;
      for (i = 0; i < beats; i++) {
        x = i * step;
        d += (i === 0 ? "M " : " L ") + x.toFixed(1) + " " + (H * .62);
        d += " L " + (x + step * .30).toFixed(1) + " " + (H * .62);
        d += " L " + (x + step * .36).toFixed(1) + " " + (H * .78);
        d += " L " + (x + step * .44).toFixed(1) + " " + (H * .10);
        d += " L " + (x + step * .52).toFixed(1) + " " + (H * .88);
        d += " L " + (x + step * .60).toFixed(1) + " " + (H * .62);
      }
      d += " L " + W + " " + (H * .62);
      return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    }
    if (kind === "resp") {
      var rate = vals.rate || 50;
      if (rate <= 0) {
        return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none"><path d="M 0 ' + (H * .5) +
               " L " + W + " " + (H * .5) + '" fill="none" stroke="' + color + '" stroke-width="1.6"/></svg>';
      }
      var br = Math.max(2, Math.round(rate / 11)), st = W / br;
      var dd = "M 0 " + (H * .8).toFixed(1);
      for (i = 0; i < br; i++) {
        var x0 = i * st;
        dd += " Q " + (x0 + st * .25).toFixed(1) + " " + (H * .10).toFixed(1) + " " + (x0 + st * .5).toFixed(1) + " " + (H * .48).toFixed(1);
        dd += " Q " + (x0 + st * .75).toFixed(1) + " " + (H * .92).toFixed(1) + " " + (x0 + st).toFixed(1) + " " + (H * .8).toFixed(1);
      }
      return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none"><path d="' + dd + '" fill="none" stroke="' + color + '" stroke-width="1.6"/></svg>';
    }
    // plain history sparkline
    for (i = 0; i < n; i++) {
      pts.push((i / Math.max(1, n - 1) * W).toFixed(1) + "," + (H - 3 - vals[i] * (H - 6)).toFixed(1));
    }
    return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none"><polyline points="' + pts.join(" ") +
           '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /* Title-screen scene: a dim NICU room at night. */
  function titleArt() {
    return '<svg viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A dim NICU at night">' +
      '<rect x="0" y="0" width="260" height="220" rx="16" fill="#101724"/>' +
      '<rect x="0" y="150" width="260" height="70" fill="#16202f"/>' +
      // window with moon
      '<rect x="176" y="24" width="62" height="76" rx="6" fill="#0b1220" stroke="#2c3850" stroke-width="2"/>' +
      '<circle cx="212" cy="50" r="13" fill="#e8eef8" opacity=".85"/><circle cx="207" cy="46" r="11" fill="#0b1220"/>' +
      '<circle cx="188" cy="80" r="1.6" fill="#e8eef8" opacity=".7"/><circle cx="228" cy="70" r="1.4" fill="#e8eef8" opacity=".5"/>' +
      // monitor on a pole
      '<rect x="30" y="26" width="72" height="48" rx="7" fill="#060a10" stroke="#24354d" stroke-width="2"/>' +
      '<polyline points="36,54 50,54 54,42 60,68 66,48 70,54 96,54" fill="none" stroke="#5ef2a0" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M 36 66 q 8 -10 16 0 q 8 10 16 0 q 8 -10 16 0" fill="none" stroke="#6cb6ff" stroke-width="1.6"/>' +
      '<rect x="63" y="74" width="5" height="46" fill="#2c3850"/>' +
      // isolette
      '<rect x="34" y="150" width="150" height="9" rx="4" fill="#1f2a3a"/>' +
      '<rect x="30" y="118" width="158" height="34" rx="8" fill="#27405c"/>' +
      '<path d="M 36 118 L 36 92 Q 36 74 62 74 L 156 74 Q 182 74 182 92 L 182 118 Z" fill="#9fd0ff" opacity=".14" stroke="#4a6a8c" stroke-width="2"/>' +
      '<ellipse cx="104" cy="108" rx="30" ry="11" fill="#f6c390"/>' +
      '<circle cx="134" cy="103" r="12" fill="#f6c390"/>' +
      '<path d="M 122 96 q 12 -9 24 0" fill="none" stroke="#8a5a33" stroke-width="3"/>' +
      '<path d="M 128 103 q 3 2 5 0 M 137 103 q 3 2 5 0" fill="none" stroke="#141b28" stroke-width="1.6" stroke-linecap="round"/>' +
      '<rect x="72" y="103" width="12" height="9" rx="4" fill="#ff6b6b" opacity=".9"/>' +
      '<ellipse cx="78" cy="107" rx="9" ry="7" fill="#ff2e20" opacity=".25"/>' +
      // a person standing watch
      '<circle cx="216" cy="132" r="13" fill="#c98c5a"/>' +
      '<path d="M 203 130 q 2 -16 13 -16 q 11 0 13 16 q -9 -7 -13 -6 q -4 -1 -13 6 z" fill="#2b2b33"/>' +
      '<path d="M 194 200 Q 194 152 216 152 Q 238 152 238 200 Z" fill="#2ec4b6"/>' +
      '<path d="M 208 154 q -2 12 8 13 q 10 -1 8 -13" fill="none" stroke="#134e49" stroke-width="2.4"/>' +
      '<text x="24" y="212" font-size="11" fill="#64748b" font-family="monospace">02:14</text>' +
      "</svg>";
  }

  /* Small circular portrait for lists, badges and task rows. */
  function miniAvatar(id) {
    return '<span class="mini-av">' + avatar(id) + "</span>";
  }

  window.Art = { baby: baby, isolette: isolette, avatar: avatar, miniAvatar: miniAvatar,
                 trace: trace, titleArt: titleArt, tint: tint };
})();
