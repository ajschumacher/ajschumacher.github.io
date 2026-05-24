import { CHAR_ORDER, ENGLISH_FREQ } from './chars.js?v=1';

export const MAX_SAMPLES = 50;

export function median(samples) {
  if (!samples.length) return Infinity;
  const sorted = samples.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function wpmFromMs(ms) {
  if (!ms || !isFinite(ms) || ms <= 0) return 0;
  return 60000 / (ms * 5);
}

function ensureStats(profile, char) {
  const slot = profile.charStats[char];
  if (slot && Array.isArray(slot.samples)) return slot;
  const fresh = { samples: [], attempts: 0, errors: 0 };
  profile.charStats[char] = fresh;
  return fresh;
}

export function addSample(profile, char, ms) {
  const stats = ensureStats(profile, char);
  stats.samples.push(Math.max(1, Math.round(ms)));
  if (stats.samples.length > MAX_SAMPLES) stats.samples.shift();
  stats.attempts += 1;
}

export function addError(profile, char) {
  const stats = ensureStats(profile, char);
  stats.errors += 1;
  if (stats.samples.length) stats.samples.pop();
}

export function charMedianWpm(profile, char) {
  const stats = profile.charStats[char];
  if (!stats || !stats.samples || !stats.samples.length) return 0;
  return wpmFromMs(median(stats.samples));
}

export function charSampleCount(profile, char) {
  const stats = profile.charStats[char];
  return stats && stats.samples ? stats.samples.length : 0;
}

export function unlockedChars(profile) {
  return CHAR_ORDER.slice(0, profile.level);
}

export function playerWeightedWpm(profile) {
  const unlocked = unlockedChars(profile);
  if (!unlocked.length) return 0;
  let num = 0;
  let denom = 0;
  for (const c of unlocked) {
    const w = ENGLISH_FREQ[c] || 0;
    const wpm = charMedianWpm(profile, c);
    num += w * wpm;
    denom += w;
  }
  return denom > 0 ? num / denom : 0;
}

export function coverage(profile) {
  const unlocked = unlockedChars(profile);
  let s = 0;
  for (const c of unlocked) s += ENGLISH_FREQ[c] || 0;
  return s;
}

export function awphm(profile) {
  return Math.round(playerWeightedWpm(profile) * 100 * coverage(profile));
}

export function advanceThreshold(level) {
  if (level <= 1) return 4;
  if (level <= 32) return 4 + ((level - 1) / 31) * 4;
  if (level <= 58) return 8 + ((level - 32) / 26) * 4;
  return 12;
}

export function reviewThreshold(level) {
  return advanceThreshold(level) / 2;
}
