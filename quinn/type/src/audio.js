let ctx = null;
let enabled = false;

function getContext() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.18, attack = 0.006, decay = 0 } = {}) {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  if (decay > 0) {
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.3), t0 + attack + decay);
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function setAudioEnabled(on) {
  enabled = !!on;
  if (enabled) getContext();
}

export function isAudioEnabled() {
  return enabled;
}

export function playChime() {
  if (!enabled) return;
  tone(659.25, 0.22, { vol: 0.16, type: 'sine' });
  setTimeout(() => tone(987.77, 0.32, { vol: 0.14, type: 'sine' }), 80);
}

export function playTick() {
  if (!enabled) return;
  tone(220, 0.05, { vol: 0.08, type: 'sine' });
}

export function playFanfare() {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    setTimeout(() => tone(f, 0.32, { vol: 0.18, type: 'triangle' }), i * 110);
  });
}
