import { CHAR_ORDER } from './chars.js';
import {
  advanceThreshold,
  charMedianWpm,
  charSampleCount,
  unlockedChars,
} from './stats.js';

export const MIN_SAMPLES_FOR_ADVANCE = 5;

function meetsAdvancementCriteria(profile) {
  const T = advanceThreshold(profile.level);
  for (const c of unlockedChars(profile)) {
    if (charSampleCount(profile, c) < MIN_SAMPLES_FOR_ADVANCE) return false;
    if (charMedianWpm(profile, c) < T) return false;
  }
  return true;
}

export function isMaxLevel(profile) {
  return profile.level >= CHAR_ORDER.length;
}

export function canAdvance(profile) {
  if (isMaxLevel(profile)) return false;
  return meetsAdvancementCriteria(profile);
}

// True when the player is already at max level and has now met all advancement
// criteria — i.e. they "would" level up if there were a level 95.
export function hasMasteredEverything(profile) {
  if (!isMaxLevel(profile)) return false;
  return meetsAdvancementCriteria(profile);
}

export function nextCharToUnlock(profile) {
  return CHAR_ORDER[profile.level] || null;
}

export function advance(profile) {
  if (!canAdvance(profile)) return false;
  profile.level += 1;
  return true;
}
