import { WORDS } from './words.js?v=1';
import {
  unlockedChars,
  reviewThreshold,
  charMedianWpm,
  charSampleCount,
} from './stats.js?v=1';

const REVIEW_WEIGHT = 6;
const NEW_WEIGHT = 3;
const BASE_WEIGHT = 1;

const SENTENCE_PUNCT = new Set(['.', ',', ';', ':', '?', '!']);
const TRAILING_PUNCT = new Set(['.', ',', ';', ':', '?', '!', ')', ']', '}', '"', "'"]);
const LEADING_PUNCT = new Set(['(', '[', '{', '"', "'"]);

function isLetter(c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

function isLower(c) {
  return c >= 'a' && c <= 'z';
}

function isUpper(c) {
  return c >= 'A' && c <= 'Z';
}

function isDigit(c) {
  return c >= '0' && c <= '9';
}

function pickWeighted(items, weightOf) {
  let total = 0;
  for (const it of items) total += weightOf(it);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function pickAny(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeWeights(profile, unlocked) {
  const reviewT = reviewThreshold(profile.level);
  const latest = unlocked[unlocked.length - 1];
  return new Map(
    unlocked.map(c => {
      let w = BASE_WEIGHT;
      if (charSampleCount(profile, c) >= 5 && charMedianWpm(profile, c) < reviewT) {
        w = REVIEW_WEIGHT;
      }
      if (c === latest) w = Math.max(w, NEW_WEIGHT);
      return [c, w];
    })
  );
}

function wordsAvailable(unlockedSet, mustContain) {
  return WORDS.filter(w => {
    if (mustContain != null && !w.includes(mustContain)) return false;
    for (const c of w) {
      if (!unlockedSet.has(c)) return false;
    }
    return true;
  });
}

function makeNonsense(unlockedSet, anchor) {
  const letters = [...unlockedSet].filter(isLower);
  if (!letters.length) return anchor;
  const len = 2 + Math.floor(Math.random() * 2);
  const chars = [];
  for (let i = 0; i < len; i++) {
    chars.push(letters[Math.floor(Math.random() * letters.length)]);
  }
  if (anchor && isLower(anchor) && !chars.includes(anchor)) {
    chars[Math.floor(Math.random() * chars.length)] = anchor;
  }
  return chars.join('');
}

function maybeCapitalize(word, unlockedSet) {
  if (!word) return word;
  const first = word[0];
  if (!isLower(first)) return word;
  const upper = first.toUpperCase();
  if (!unlockedSet.has(upper)) return word;
  if (Math.random() < 0.25) return upper + word.slice(1);
  return word;
}

function pickWord(unlockedSet, anchor) {
  const candidates = wordsAvailable(unlockedSet, anchor);
  return pickAny(candidates);
}

function generateForLowercase(profile, unlockedSet, anchor) {
  const r = Math.random();
  if (r < 0.25) return anchor;
  const word = pickWord(unlockedSet, anchor);
  if (word) return maybeCapitalize(word, unlockedSet);
  return makeNonsense(unlockedSet, anchor);
}

function generateForCapital(unlockedSet, anchor) {
  const lower = anchor.toLowerCase();
  const starting = wordsAvailable(unlockedSet, lower).filter(w => w[0] === lower);
  if (starting.length) {
    const word = pickAny(starting);
    return anchor + word.slice(1);
  }
  const any = pickWord(unlockedSet, lower);
  if (any) return anchor + any.slice(1);
  return anchor;
}

function generateForSpace(unlockedSet) {
  const left = pickWord(unlockedSet) || makeNonsense(unlockedSet);
  const right = pickWord(unlockedSet) || makeNonsense(unlockedSet);
  return left + ' ' + maybeCapitalize(right, unlockedSet);
}

function generateForEnter(unlockedSet) {
  const left = pickWord(unlockedSet) || makeNonsense(unlockedSet);
  const right = pickWord(unlockedSet) || makeNonsense(unlockedSet);
  return left + '\n' + maybeCapitalize(right, unlockedSet);
}

function generateForPunct(unlockedSet, anchor) {
  const word = pickWord(unlockedSet) || makeNonsense(unlockedSet);
  if (!word) return anchor;
  if (TRAILING_PUNCT.has(anchor)) return word + anchor;
  if (LEADING_PUNCT.has(anchor)) return anchor + word;
  return anchor;
}

function generateForDigit(unlockedSet, anchor) {
  if (Math.random() < 0.4) {
    const digits = [...unlockedSet].filter(isDigit);
    const len = 2 + Math.floor(Math.random() * 3);
    const chars = [];
    for (let i = 0; i < len; i++) chars.push(pickAny(digits));
    if (!chars.includes(anchor)) {
      chars[Math.floor(Math.random() * chars.length)] = anchor;
    }
    return chars.join('');
  }
  return anchor;
}

export function nextPrompt(profile) {
  const unlocked = unlockedChars(profile);
  if (!unlocked.length) return 'f';
  if (unlocked.length === 1) return unlocked[0];

  const weights = computeWeights(profile, unlocked);
  const anchor = pickWeighted(unlocked, c => weights.get(c) || 0);
  const unlockedSet = new Set(unlocked);

  if (anchor === ' ') return generateForSpace(unlockedSet);
  if (anchor === '\n') return generateForEnter(unlockedSet);
  if (isUpper(anchor)) return generateForCapital(unlockedSet, anchor);
  if (isDigit(anchor)) return generateForDigit(unlockedSet, anchor);
  if (isLower(anchor)) return generateForLowercase(profile, unlockedSet, anchor);
  return generateForPunct(unlockedSet, anchor);
}
