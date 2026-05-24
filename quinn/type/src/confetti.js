const COLORS = [
  '#FF3D67', // vivid red-pink
  '#FF6B2B', // orange
  '#FFD426', // yellow
  '#3DFF7A', // lime green
  '#00CFFF', // sky blue
  '#B44DFF', // purple
  '#FF4DB8', // hot pink
  '#FFFFFF', // white
];

export function launchConfetti() {
  const container = document.createElement('div');
  Object.assign(container.style, {
    position:      'fixed',
    inset:         '0',
    pointerEvents: 'none',
    zIndex:        '200',
    overflow:      'hidden',
  });
  document.body.appendChild(container);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // All pieces burst from a cluster near the center of the screen
  const originX = vw * 0.50;
  const originY = vh * 0.25;

  const N = 160;
  for (let i = 0; i < N; i++) {
    const piece = document.createElement('div');
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Mix of thin strips (papery) and dots
    const isStrip = Math.random() > 0.4;
    const w = isStrip ? 5 + Math.random() * 5   : 8 + Math.random() * 8;
    const h = isStrip ? 13 + Math.random() * 12 : w;
    const circle = !isStrip && Math.random() > 0.35;

    // Starting position: tight cluster around origin
    const startX = originX + (Math.random() - 0.5) * vw * 0.12;
    const startY = originY + (Math.random() - 0.5) * vh * 0.08;

    // Launch in a random direction with upward bias so pieces fan out like an explosion
    const angle    = Math.random() * Math.PI * 2;
    const speed    = 160 + Math.random() * 340;
    const velX     = Math.cos(angle) * speed;
    const velY     = Math.sin(angle) * speed - speed * 0.35; // upward bias

    // Gentle gravity — less than real so pieces float nicely
    const gravity  = 380 + Math.random() * 180;  // px/s²
    const dur      = 2.8 + Math.random() * 1.4;  // s — slow, floaty
    const delay    = Math.random() * 0.5;         // tight burst: all pieces launch within 0.5s
    const startRot = Math.random() * 360;
    const rotRate  = (280 + Math.random() * 500) * (Math.random() < 0.5 ? 1 : -1); // deg/s

    Object.assign(piece.style, {
      position:     'absolute',
      left:         `${startX}px`,
      top:          `${startY}px`,
      width:        `${w}px`,
      height:       `${h}px`,
      background:   color,
      borderRadius: circle ? '50%' : '2px',
    });
    container.appendChild(piece);

    // Sample the parabolic trajectory at 10 evenly-spaced time points.
    // Horizontal motion has gentle air-drag so pieces don't fly too far sideways.
    const STEPS = 10;
    const keyframes = [];
    for (let s = 0; s <= STEPS; s++) {
      const frac = s / STEPS;
      const t    = frac * dur;
      const drag = Math.pow(0.88, s);          // exponential horizontal drag
      const x    = velX * t * drag;
      const y    = velY * t + 0.5 * gravity * t * t;
      const rot  = startRot + rotRate * frac;

      // Fade in fast at start, hold full opacity, then dissolve near the end
      let opacity;
      if      (frac < 0.07) opacity = frac / 0.07;
      else if (frac > 0.72) opacity = 1 - (frac - 0.72) / 0.28;
      else                  opacity = 1;

      keyframes.push({
        offset:    frac,
        transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
        opacity:   Math.max(0, Math.min(1, opacity)),
      });
    }

    piece.animate(keyframes, {
      duration: dur * 1000,
      delay:    delay * 1000,
      fill:     'both',   // hide piece before its delay fires (opacity 0 at keyframe 0)
      easing:   'linear', // physics equations handle the curve
    });
  }

  // Remove container after all pieces have finished
  setTimeout(() => container.remove(), (0.5 + 4.2 + 0.5) * 1000);
}
