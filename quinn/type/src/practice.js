import { el } from './dom.js';
import { loadProfile, saveProfile, touchLastPlayed } from './storage.js';
import { expectedFromKeyEvent, charInfo } from './chars.js';
import { addSample, addError, awphm } from './stats.js';
import { renderFlower } from './flower.js';
import { nextPrompt } from './prompts.js';
import { canAdvance, advance, nextCharToUnlock, hasMasteredEverything, isMaxLevel } from './leveling.js';
import { renderKeyboard } from './keyboard.js';
import { showModal } from './modal.js';
import {
  setAudioEnabled,
  isAudioEnabled,
  playChime,
  playTick,
  playFanfare,
} from './audio.js';
import { launchConfetti } from './confetti.js';

function renderHud(profile, navigate) {
  const levelEl = el('span', { class: 'hud-level', text: isMaxLevel(profile) ? 'Expert' : `Level ${profile.level}` });
  const awphmEl = el('span', { class: 'hud-awphm', text: `AWPHM: ${awphm(profile)}` });
  const soundBtn = el('button', {
    class: 'secondary sound-toggle',
    text: profile.audio.sfxOn ? 'Sound on' : 'Sound off',
    onclick: () => {
      profile.audio.sfxOn = !profile.audio.sfxOn;
      saveProfile(profile);
      setAudioEnabled(profile.audio.sfxOn);
      soundBtn.textContent = profile.audio.sfxOn ? 'Sound on' : 'Sound off';
    },
  });
  const homeBtn = el('button', {
    class: 'secondary',
    text: 'Home',
    onclick: () => navigate('home'),
  });
  const hud = el('div', { class: 'hud' }, [
    el('div', { class: 'hud-info' }, [
      el('span', { class: 'hud-name', text: profile.name }),
      levelEl,
      awphmEl,
    ]),
    el('div', { class: 'hud-actions' }, [soundBtn, homeBtn]),
  ]);
  hud._refresh = () => {
    levelEl.textContent = isMaxLevel(profile) ? 'Expert' : `Level ${profile.level}`;
    awphmEl.textContent = `AWPHM: ${awphm(profile)}`;
  };
  return hud;
}

export function renderPractice(root, { profileId }, navigate) {
  const profile = loadProfile(profileId);
  if (!profile) {
    navigate('home');
    return;
  }
  if (profile.level === 0) {
    navigate('test', { profileId });
    return;
  }

  touchLastPlayed(profile);
  setAudioEnabled(!!profile.audio.sfxOn);

  const hud = renderHud(profile, navigate);
  const capsHint = el('div', { class: 'caps-hint hidden', text: 'Caps Lock is on' });
  const stage = el('div', { class: 'stage' });
  root.append(el('div', { class: 'screen practice' }, [hud, capsHint, stage]));

  const state = {
    prompt: '',
    typedIndex: 0,
    targetStartMs: 0,
    flowerEl: null,
    locked: false,
  };

  function refreshHighlight() {
    if (!state.flowerEl) return;
    const chars = state.flowerEl.querySelectorAll('.ch');
    chars.forEach((c, i) => {
      c.classList.toggle('typed', i < state.typedIndex);
      c.classList.toggle('current', i === state.typedIndex);
    });
  }

  function loadNext() {
    const previous = state.flowerEl;
    if (previous) {
      previous.classList.add('done');
      setTimeout(() => previous.remove(), 1200);
    }
    state.prompt = nextPrompt(profile);
    state.typedIndex = 0;
    state.targetStartMs = performance.now();
    state.flowerEl = renderFlower(state.prompt);
    stage.append(state.flowerEl);
    refreshHighlight();
  }

  function shakeCurrent() {
    if (!state.flowerEl) return;
    const ch = state.flowerEl.querySelectorAll('.ch')[state.typedIndex];
    if (!ch) return;
    ch.classList.remove('shake');
    void ch.offsetWidth;
    ch.classList.add('shake');
  }

  function onCorrect(char) {
    const now = performance.now();
    const dt = now - state.targetStartMs;
    addSample(profile, char, dt);
    state.typedIndex += 1;
    state.targetStartMs = now;
    refreshHighlight();
    saveProfile(profile);
    hud._refresh();
    if (state.typedIndex >= state.prompt.length) {
      playChime();
      state.locked = true;
      setTimeout(maybeLevelUpOrContinue, 350);
    }
  }

  function maybeLevelUpOrContinue() {
    if (canAdvance(profile)) {
      const nextChar = nextCharToUnlock(profile);
      playFanfare();
      launchConfetti();
      showLevelUpModal(nextChar, () => {
        advance(profile);
        saveProfile(profile);
        hud._refresh();
        state.locked = false;
        loadNext();
      });
    } else if (hasMasteredEverything(profile) && !profile.masteryAchieved) {
      profile.masteryAchieved = true;
      saveProfile(profile);
      playFanfare();
      launchConfetti();
      showCongratsModal(() => {
        state.locked = false;
        loadNext();
      });
    } else {
      state.locked = false;
      loadNext();
    }
  }

  function showCongratsModal(onDismiss) {
    const bigChar = el('div', { class: 'big-char', text: '★' });
    const message = el('p', {
      class: 'instruction',
      text: 'Amazing! You\'ve mastered all 94 characters. You\'re a true keyboard expert.',
    });
    showModal({
      title: 'You\'re an Expert!',
      children: [bigChar, message],
      dismissLabel: 'Keep typing!',
      onDismiss,
    });
  }

  function showLevelUpModal(char, onDismiss) {
    const info = charInfo(char);
    const titleLabel =
      char === ' ' ? 'New: Space!'
      : char === '\n' ? 'New: Enter!'
      : char >= '0' && char <= '9' ? `New number: ${info.display}`
      : char >= 'A' && char <= 'Z' ? `New capital: ${info.display}`
      : char >= 'a' && char <= 'z' ? `New letter: ${info.display}`
      : `New symbol: ${info.display}`;
    const bigChar = el('div', { class: 'big-char', text: info.display });
    const instruction = el('p', { class: 'instruction', text: info.instruction });
    const kb = renderKeyboard({ highlight: info.baseKey, shiftHand: info.shiftHand });
    showModal({
      title: titleLabel,
      children: [bigChar, instruction, kb],
      onDismiss,
    });
  }

  function onWrong() {
    const expected = state.prompt[state.typedIndex];
    addError(profile, expected);
    saveProfile(profile);
    shakeCurrent();
    playTick();
    hud._refresh();
  }

  function updateCapsHint(e) {
    if (typeof e.getModifierState !== 'function') return;
    const on = e.getModifierState('CapsLock');
    capsHint.classList.toggle('hidden', !on);
  }

  function handleKey(e) {
    updateCapsHint(e);
    if (state.locked) {
      e.preventDefault();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const expected = state.prompt[state.typedIndex];
    if (expected == null) return;

    if (expected === '\n') {
      if (e.key === 'Enter') {
        e.preventDefault();
        onCorrect('\n');
        return;
      }
      if (e.key.length === 1 || e.key === 'Backspace') {
        e.preventDefault();
        onWrong();
      }
      return;
    }

    if (expected === ' ') {
      if (e.key === ' ') {
        e.preventDefault();
        onCorrect(' ');
        return;
      }
      if (e.key.length === 1 || e.key === 'Enter') {
        e.preventDefault();
        onWrong();
      }
      return;
    }

    if (e.key.length !== 1 && e.key !== 'Enter') return;

    const matched = expectedFromKeyEvent(e, expected);
    if (matched != null) {
      e.preventDefault();
      onCorrect(expected);
    } else {
      e.preventDefault();
      onWrong();
    }
  }

  window.addEventListener('keydown', handleKey);
  loadNext();

  return () => {
    window.removeEventListener('keydown', handleKey);
  };
}
