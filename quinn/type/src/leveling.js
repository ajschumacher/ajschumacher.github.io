import { CHAR_ORDER } from './chars.js';
import {
  advanceThreshold,
  charMedianWpm,
  charSampleCount,
  unlockedChars,
} from './stats.js';

export const MIN_SAMPLES_FOR_ADVANCE = 5;

export function canAdvance(profile) {
  if (profile.level >= CHAR_ORDER.length) return false;
  const T = advanceThreshold(profile.level);
  for (const c of unlockedChars(profile)) {
    if (charSampleCount(profile, c) < MIN_SAMPLES_FOR_ADVANCE) return false;
    if (charMedianWpm(profile, c) < T) return false;
  }
  return true;
}

export function nextCharToUnlock(profile) {
  return CHAR_ORDER[profile.level] || null;
}

export function advance(profile) {
  if (!canAdvance(profile)) return false;
  profile.level += 1;
  return true;
}
