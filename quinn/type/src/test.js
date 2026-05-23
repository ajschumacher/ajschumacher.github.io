import { el } from './dom.js';
import { loadProfile, saveProfile } from './storage.js';
import { CHAR_ORDER, charInfo, expectedFromKeyEvent } from './chars.js';
import { advanceThreshold, wpmFromMs } from './stats.js';
import { renderFlower } from './flower.js';
import { MIN_SAMPLES_FOR_ADVANCE } from './leveling.js';

const SEED_WPM = 41;
const SEED_MS = Math.round(60000 / (SEED_WPM * 5));

function seedPriorChars(profile, level) {
  for (let i = 0; i < level - 1; i++) {
    const c = CHAR_ORDER[i];
    const existing = profile.charStats[c];
    if (existing && existing.samples && existing.samples.length >= MIN_SAMPLES_FOR_ADVANCE) continue;
    profile.charStats[c] = {
      samples: Array(MIN_SAMPLES_FOR_ADVANCE).fill(SEED_MS),
      attempts: MIN_SAMPLES_FOR_ADVANCE,
      errors: 0,
    };
  }
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildProbeSamples(lo, hi, probe, previousLastChar) {
  const seen = new Set();
  const window = [];
  for (let i = Math.max(lo, probe - 2); i <= Math.min(hi, probe + 2); i++) {
    const c = CHAR_ORDER[i];
    if (!seen.has(c)) { seen.add(c); window.push(c); }
  }
  for (let i = lo; i <= hi && window.length < 5; i++) {
    const c = CHAR_ORDER[i];
    if (!seen.has(c)) { seen.add(c); window.push(c); }
  }
  const samples = window.slice(0, 5);
  shuffleInPlace(samples);
  let attempts = 0;
  while (samples.length > 1 && samples[0] === previousLastChar && attempts++ < 5) {
    shuffleInPlace(samples);
  }
  return samples;
}

export function renderTest(root, { profileId }, navigate) {
  const profile = loadProfile(profileId);
  if (!profile) {
    navigate('home');
    return;
  }

  const banner = el('div', { class: 'placement-banner' }, [
    el('h2', { class: 'placement-title', text: 'Quick warm-up!' }),
    el('p', {
      class: 'placement-hint',
      text: 'Type the letters as they appear. Some might be new — just give them your best try!',
    }),
  ]);
  const stage = el('div', { class: 'stage' });
  const progress = el('div', { class: 'placement-progress', text: '' });
  const cancelBtn = el('button', {
    class: 'secondary',
    text: 'Back to Home',
    onclick: () => navigate('home'),
  });

  root.append(
    el('div', { class: 'screen test' }, [
      banner,
      stage,
      progress,
      el('div', { class: 'placement-controls' }, [cancelBtn]),
    ])
  );

  const TRIAL_TIMEOUT_MS = 2000;

  const state = {
    lo: 0,
    hi: CHAR_ORDER.length - 1,
    probe: 0,
    samples: [],
    sampleIndex: 0,
    trialResults: [],
    targetStartMs: 0,
    flowerEl: null,
    locked: false,
    previousLastChar: null,
    probesDone: 0,
    currentWrong: false,
    finished: false,
    timeoutId: null,
  };

  function clearTrialTimeout() {
    if (state.timeoutId != null) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
  }

  function startProbe() {
    state.probe = Math.floor((state.lo + state.hi) / 2);
    state.samples = buildProbeSamples(
      state.lo,
      state.hi,
      state.probe,
      state.previousLastChar
    );
    state.sampleIndex = 0;
    state.trialResults = [];
    state.probesDone += 1;
    progress.textContent = `Round ${state.probesDone}`;
    showSample();
  }

  function showSample() {
    const previous = state.flowerEl;
    if (previous) {
      previous.classList.add('done');
      setTimeout(() => previous.remove(), 1000);
    }
    const ch = state.samples[state.sampleIndex];
    state.flowerEl = renderFlower(ch);
    stage.append(state.flowerEl);
    state.flowerEl.querySelectorAll('.ch').forEach((node, i) => {
      node.classList.toggle('current', i === 0);
    });
    state.targetStartMs = performance.now();
    state.currentWrong = false;
    state.locked = false;
    clearTrialTimeout();
    state.timeoutId = setTimeout(onTrialTimeout, TRIAL_TIMEOUT_MS);
  }

  function onTrialTimeout() {
    state.timeoutId = null;
    if (state.locked || state.finished) return;
    state.currentWrong = true;
    recordTrialAndNext(TRIAL_TIMEOUT_MS);
  }

  function shakeCurrent() {
    if (!state.flowerEl) return;
    const ch = state.flowerEl.querySelector('.ch');
    if (!ch) return;
    ch.classList.remove('shake');
    void ch.offsetWidth;
    ch.classList.add('shake');
  }

  function recordTrialAndNext(dtMs) {
    clearTrialTimeout();
    const ch = state.samples[state.sampleIndex];
    state.trialResults.push({
      wpm: wpmFromMs(dtMs),
      correct: !state.currentWrong,
      char: ch,
    });
    state.previousLastChar = ch;
    state.sampleIndex += 1;
    state.locked = true;
    if (state.sampleIndex >= state.samples.length) {
      setTimeout(finishProbe, 350);
    } else {
      setTimeout(showSample, 350);
    }
  }

  function onCorrect() {
    recordTrialAndNext(performance.now() - state.targetStartMs);
  }

  function onWrong() {
    state.currentWrong = true;
    shakeCurrent();
  }

  function finishProbe() {
    const wpms = state.trialResults.map(r => r.wpm).sort((a, b) => a - b);
    const med = wpms[wpms.length >> 1] || 0;
    const allCorrect = state.trialResults.every(r => r.correct);
    const threshold = advanceThreshold(state.probe + 1);
    const pass = allCorrect && med >= threshold;
    if (pass) state.lo = state.probe + 1;
    else state.hi = state.probe - 1;

    if (state.lo > state.hi) {
      finishTest();
      return;
    }
    startProbe();
  }

  function finishTest() {
    state.finished = true;
    state.locked = true;
    const level = Math.max(1, state.lo);
    profile.level = level;
    profile.lastPlayed = new Date().toISOString();
    saveProfile(profile);
    banner.querySelector('.placement-title').textContent =
      `All set! You're at Level ${level}.`;
    const nextChar = CHAR_ORDER[level - 1];
    const info = charInfo(nextChar);
    banner.querySelector('.placement-hint').textContent =
      info ? `We'll start with ${info.name}.` : '';
    progress.textContent = '';
    if (state.flowerEl) state.flowerEl.classList.add('done');
    setTimeout(() => navigate('practice', { profileId }), 1600);
  }

  function handleKey(e) {
    if (state.finished || state.locked) {
      e.preventDefault();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const expected = state.samples[state.sampleIndex];
    if (expected == null) return;

    if (expected === ' ') {
      if (e.key === ' ') { e.preventDefault(); onCorrect(); return; }
      if (e.key.length === 1 || e.key === 'Enter') { e.preventDefault(); onWrong(); }
      return;
    }
    if (expected === '\n') {
      if (e.key === 'Enter') { e.preventDefault(); onCorrect(); return; }
      if (e.key.length === 1) { e.preventDefault(); onWrong(); }
      return;
    }
    if (e.key.length !== 1 && e.key !== 'Enter') return;

    const matched = expectedFromKeyEvent(e, expected);
    if (matched != null) {
      e.preventDefault();
      onCorrect();
    } else {
      e.preventDefault();
      onWrong();
    }
  }

  window.addEventListener('keydown', handleKey);
  startProbe();

  return () => {
    clearTrialTimeout();
    window.removeEventListener('keydown', handleKey);
  };
}
