import { el } from './dom.js';
import { loadProfile, saveProfile } from './storage.js';
import { CHAR_ORDER, charInfo, expectedFromKeyEvent } from './chars.js';
import { advanceThreshold } from './stats.js';
import { renderFlower } from './flower.js';
import { MIN_SAMPLES_FOR_ADVANCE } from './leveling.js';
import { showModal } from './modal.js';
import { renderKeyboard } from './keyboard.js';

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

// Only printable characters are used in placement — no space or enter,
// since their display glyphs (␣ ↵) confuse new users.
const TESTABLE = CHAR_ORDER.filter(c => c !== ' ' && c !== '\n');

const MAX_TRIALS = 15;

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

  // Binary search state.  lo/hi are indices into TESTABLE.
  // A boundary only "hardens" after two consecutive fails or two consecutive passes
  // with no intervening failure on that probe.
  const state = {
    lo: 0,
    hi: TESTABLE.length - 1,
    probe: Math.floor((TESTABLE.length - 1) / 2),
    consecutivePasses: {},   // probe index → count
    consecutiveFails: {},    // probe index → count
    lastSoftFailProbe: null, // probe that failed once — candidate for retry after a soft pass
    trialsLeft: MAX_TRIALS,
    lastSuccessTestableIndex: -1, // TESTABLE index of most recent correct trial
    flowerEl: null,
    locked: false,
    finished: false,
    timeoutId: null,
  };

  function clearTrialTimeout() {
    if (state.timeoutId != null) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
  }

  function showChar() {
    const previous = state.flowerEl;
    if (previous) {
      previous.classList.add('done');
      setTimeout(() => previous.remove(), 1000);
    }
    const ch = TESTABLE[state.probe];
    state.flowerEl = renderFlower(ch);
    stage.append(state.flowerEl);
    state.flowerEl.querySelectorAll('.ch').forEach((node, i) => {
      node.classList.toggle('current', i === 0);
    });
    // Timeout is derived from the advance threshold for this character's level,
    // using the same WPM formula as practice mode: maxMs = 60000 / (wpm * 5).
    // This means easy early chars (f, j) allow ~3 s; hard late chars (?, ") allow ~1 s.
    const charOrderIndex = CHAR_ORDER.indexOf(ch);
    const level = charOrderIndex + 1;
    const timeoutMs = Math.round(60000 / (advanceThreshold(level) * 5));

    state.locked = false;
    clearTrialTimeout();
    state.timeoutId = setTimeout(() => onResult(false), timeoutMs);
  }

  function shakeCurrent() {
    if (!state.flowerEl) return;
    const ch = state.flowerEl.querySelector('.ch');
    if (!ch) return;
    ch.classList.remove('shake');
    void ch.offsetWidth;
    ch.classList.add('shake');
  }

  // Called with passed=true on correct keystroke, false on wrong key or timeout.
  // A wrong key is an immediate fail — the user doesn't need to retype the correct key.
  function onResult(passed) {
    clearTrialTimeout();
    if (state.locked || state.finished) return;
    state.locked = true;
    state.trialsLeft -= 1;

    const P = state.probe;

    if (passed) {
      state.lastSuccessTestableIndex = P;
      state.consecutiveFails[P] = 0;
      state.consecutivePasses[P] = (state.consecutivePasses[P] || 0) + 1;
      // Passing the soft-fail probe clears it
      if (state.lastSoftFailProbe === P) state.lastSoftFailProbe = null;
    } else {
      shakeCurrent();
      state.consecutivePasses[P] = 0;
      state.consecutiveFails[P] = (state.consecutiveFails[P] || 0) + 1;
    }

    // End the test when trials are exhausted
    if (state.trialsLeft <= 0) {
      setTimeout(finishTest, 350);
      return;
    }

    // Harden the boundary if we've seen two consecutive outcomes at this probe
    if (passed && (state.consecutivePasses[P] || 0) >= 2) {
      state.lo = P + 1;
      state.lastSoftFailProbe = null;
    } else if (!passed && (state.consecutiveFails[P] || 0) >= 2) {
      state.hi = P - 1;
      state.lastSoftFailProbe = null;
    } else if (!passed) {
      // First failure — record as soft fail for possible retry
      state.lastSoftFailProbe = P;
    }

    if (state.lo > state.hi) {
      setTimeout(finishTest, 350);
      return;
    }

    // Choose next probe
    if (passed) {
      if ((state.consecutivePasses[P] || 0) >= 2) {
        // Hard pass confirmed — standard midpoint of remaining range
        state.probe = Math.floor((state.lo + state.hi) / 2);
      } else if (state.lastSoftFailProbe != null) {
        // Soft pass after a soft fail — retry the failed probe
        state.probe = state.lastSoftFailProbe;
      } else {
        // Soft pass, no pending soft fail — explore to the right
        state.probe = Math.min(Math.floor((P + 1 + state.hi) / 2), state.hi);
      }
    } else {
      if ((state.consecutiveFails[P] || 0) >= 2) {
        // Hard fail confirmed — standard midpoint of remaining range
        state.probe = Math.floor((state.lo + state.hi) / 2);
      } else {
        // Soft fail — explore to the left (within lo..P-1)
        const leftHi = P - 1;
        if (leftHi < state.lo) {
          // No room to go left; treat as a hard fail immediately
          state.hi = P - 1;
          state.lastSoftFailProbe = null;
          if (state.lo > state.hi) {
            setTimeout(finishTest, 350);
            return;
          }
          state.probe = Math.floor((state.lo + state.hi) / 2);
        } else {
          state.probe = Math.floor((state.lo + leftHi) / 2);
        }
      }
    }

    setTimeout(showChar, 350);
  }

  function finishTest() {
    state.finished = true;
    state.locked = true;
    clearTrialTimeout();

    // Level = one more than the most recent successful char in CHAR_ORDER terms.
    // This seeds the proven char and leaves the next one as the fresh challenge.
    let level = 1;
    if (state.lastSuccessTestableIndex >= 0) {
      const successChar = TESTABLE[state.lastSuccessTestableIndex];
      const charOrderIndex = CHAR_ORDER.indexOf(successChar);
      level = Math.min(charOrderIndex + 2, CHAR_ORDER.length);
    }

    profile.level = level;
    seedPriorChars(profile, level);
    profile.lastPlayed = new Date().toISOString();
    saveProfile(profile);

    banner.querySelector('.placement-title').textContent = `All set! You're at Level ${level}.`;
    banner.querySelector('.placement-hint').textContent = '';
    progress.textContent = '';
    if (state.flowerEl) state.flowerEl.classList.add('done');

    const startChar = CHAR_ORDER[level - 1];
    const info = charInfo(startChar);
    const titleLabel =
      startChar === ' ' ? 'New: Space!'
      : startChar === '\n' ? 'New: Enter!'
      : startChar >= '0' && startChar <= '9' ? `Starting number: ${info.display}`
      : startChar >= 'A' && startChar <= 'Z' ? `Starting capital: ${info.display}`
      : startChar >= 'a' && startChar <= 'z' ? `Starting letter: ${info.display}`
      : `Starting symbol: ${info.display}`;
    const bigChar = el('div', { class: 'big-char', text: info.display });
    const instruction = el('p', { class: 'instruction', text: info.instruction });
    const kb = renderKeyboard({ highlight: info.baseKey, shiftHand: info.shiftHand });
    showModal({
      title: titleLabel,
      children: [bigChar, instruction, kb],
      dismissLabel: "Let's go!",
      onDismiss: () => navigate('practice', { profileId }),
    });
  }

  function handleKey(e) {
    if (state.finished || state.locked) {
      e.preventDefault();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Ignore non-printing keys (arrows, function keys, lone Shift, etc.)
    if (e.key.length !== 1 && e.key !== 'Enter') return;

    const expected = TESTABLE[state.probe];
    if (expected == null) return;

    e.preventDefault();
    const matched = expectedFromKeyEvent(e, expected);
    onResult(matched != null);
  }

  function startTest() {
    window.addEventListener('keydown', handleKey);
    showChar();
  }

  // Show a ready overlay so the player can read the instructions and get their
  // hands on the keyboard before the first character appears.
  const readyOverlay = el('div', { class: 'ready-overlay' }, [
    el('p', { class: 'ready-message', text: 'Place your fingers on the keyboard, then press any key to begin.' }),
  ]);
  stage.append(readyOverlay);

  function handleReadyKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length !== 1 && e.key !== 'Enter') return;
    e.preventDefault();
    window.removeEventListener('keydown', handleReadyKey);
    readyOverlay.remove();
    startTest();
  }
  window.addEventListener('keydown', handleReadyKey);

  return () => {
    clearTrialTimeout();
    window.removeEventListener('keydown', handleReadyKey);
    window.removeEventListener('keydown', handleKey);
  };
}
