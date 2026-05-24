const FINGERS = {
  LP: { hand: 'L', finger: 'pinky' },
  LR: { hand: 'L', finger: 'ring' },
  LM: { hand: 'L', finger: 'middle' },
  LI: { hand: 'L', finger: 'index' },
  RI: { hand: 'R', finger: 'index' },
  RM: { hand: 'R', finger: 'middle' },
  RR: { hand: 'R', finger: 'ring' },
  RP: { hand: 'R', finger: 'pinky' },
  RT: { hand: 'R', finger: 'thumb' },
};

const KEY_FINGER = {
  '`': 'LP', '1': 'LP', 'q': 'LP', 'a': 'LP', 'z': 'LP',
  '2': 'LR', 'w': 'LR', 's': 'LR', 'x': 'LR',
  '3': 'LM', 'e': 'LM', 'd': 'LM', 'c': 'LM',
  '4': 'LI', '5': 'LI',
  'r': 'LI', 't': 'LI',
  'f': 'LI', 'g': 'LI',
  'v': 'LI', 'b': 'LI',
  '6': 'RI', '7': 'RI',
  'y': 'RI', 'u': 'RI',
  'h': 'RI', 'j': 'RI',
  'n': 'RI', 'm': 'RI',
  '8': 'RM', 'i': 'RM', 'k': 'RM', ',': 'RM',
  '9': 'RR', 'o': 'RR', 'l': 'RR', '.': 'RR',
  '0': 'RP', 'p': 'RP', ';': 'RP', '/': 'RP',
  '-': 'RP', '=': 'RP', '[': 'RP', ']': 'RP', "'": 'RP', '\\': 'RP',
  ' ': 'RT', '\n': 'RP',
};

const SHIFT_BASE = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  '_': '-', '+': '=', '{': '[', '}': ']',
  ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
  '~': '`', '|': '\\',
};

function baseKeyOf(char) {
  if (char >= 'A' && char <= 'Z') return char.toLowerCase();
  if (SHIFT_BASE[char]) return SHIFT_BASE[char];
  return char;
}

function isShifted(char) {
  if (char >= 'A' && char <= 'Z') return true;
  if (SHIFT_BASE[char]) return true;
  return false;
}

const FINGER_NAME = { pinky: 'pinky', ring: 'ring', middle: 'middle', index: 'index', thumb: 'thumb' };

function handLabel(h) { return h === 'L' ? 'left' : 'right'; }

function fingerPhrase(hand, finger) {
  if (finger === 'thumb') return `${handLabel(hand)} thumb`;
  return `${handLabel(hand)} ${FINGER_NAME[finger]} finger`;
}

function displayOf(char) {
  if (char === ' ') return '␣';
  if (char === '\n') return '↵';
  return char;
}

function spokenName(char) {
  if (char === ' ') return 'Space';
  if (char === '\n') return 'Enter';
  if (char >= 'A' && char <= 'Z') return `capital ${char}`;
  return `\`${char}\``;
}

function buildInfo(char) {
  const base = baseKeyOf(char);
  const fingerCode = KEY_FINGER[base];
  if (!fingerCode) throw new Error(`No finger assigned for base key "${base}" (char "${char}")`);
  const { hand, finger } = FINGERS[fingerCode];
  const shifted = isShifted(char);
  const shiftHand = shifted ? (hand === 'L' ? 'R' : 'L') : null;
  return {
    char,
    display: displayOf(char),
    name: spokenName(char),
    baseKey: base,
    hand,
    finger,
    shifted,
    shiftHand,
    instruction: instructionFor(char, { hand, finger, shifted, shiftHand }),
  };
}

function isLetter(char) {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}

function quotedDisplay(char) {
  const d = displayOf(char);
  return isLetter(char) ? d : `"${d}"`;
}

function instructionFor(char, { hand, finger, shifted, shiftHand }) {
  if (char === ' ') return 'Press the Space bar with your right thumb.';
  if (char === '\n') return 'Press Enter with your right pinky finger.';
  const fingerStr = fingerPhrase(hand, finger);
  if (!shifted) {
    return `Press ${quotedDisplay(char)} with your ${fingerStr}.`;
  }
  const shiftStr = `${handLabel(shiftHand)} Shift with your ${handLabel(shiftHand)} pinky`;
  return `Hold ${shiftStr}, then press ${quotedDisplay(char)} with your ${fingerStr}.`;
}

export const CHAR_ORDER = [
  'f', 'j',
  'd', 'k', 's', 'l', 'a', ';',
  'g', 'h',
  ' ',
  'r', 'u',
  'e', 'i', 'w', 'o', 'q', 'p',
  't', 'y',
  '\n',
  'v', 'm',
  'c', ',', 'x', '.', 'z', '/',
  'b', 'n',
  'F', 'J', 'D', 'K', 'S', 'L', 'A', 'G', 'H',
  'R', 'U', 'E', 'I', 'W', 'O', 'Q', 'P', 'T', 'Y',
  'V', 'M', 'C', 'X', 'Z', 'B', 'N',
  '4', '7', '3', '8', '5', '6', '2', '9', '1', '0',
  '$', '&', '#', '*', '%', '^', '@', '(', '!', ')',
  "'", '[', ']', '-', '=', '`',
  '"', '{', '}', '_', '+', '~', ':', '<', '>', '?',
];

const INFO = Object.fromEntries(CHAR_ORDER.map(c => [c, buildInfo(c)]));
const INDEX = Object.fromEntries(CHAR_ORDER.map((c, i) => [c, i]));

export function charInfo(char) {
  return INFO[char];
}

export function charIndex(char) {
  return INDEX[char];
}

export function expectedFromKeyEvent(e, expected) {
  if (expected === ' ') return e.key === ' ' ? ' ' : null;
  if (expected === '\n') return e.key === 'Enter' ? '\n' : null;
  if (e.key === expected) return expected;
  return null;
}

const FREQ_RAW = {
  // Lowercase letters (approx English text frequencies, %)
  e: 12.7, t: 9.1, a: 8.2, o: 7.5, i: 7.0, n: 6.7, s: 6.3, h: 6.1, r: 6.0,
  d: 4.3, l: 4.0,
  c: 2.8, u: 2.8, m: 2.4, w: 2.4, f: 2.2, g: 2.0, y: 2.0, p: 1.9,
  b: 1.5, v: 1.0, k: 0.8,
  j: 0.15, x: 0.15, q: 0.10, z: 0.07,
  // Whitespace
  ' ': 18.0,
  '\n': 0.5,
  // Common punctuation
  '.': 1.5, ',': 1.3, "'": 0.30, '"': 0.30, '-': 0.20,
  '?': 0.10, '!': 0.06, ';': 0.05, ':': 0.05,
  '(': 0.04, ')': 0.04, '/': 0.05,
  // Less common
  '[': 0.005, ']': 0.005, '{': 0.001, '}': 0.001,
  '=': 0.05, '+': 0.02, '_': 0.02, '*': 0.02,
  '@': 0.01, '#': 0.01, '$': 0.01, '%': 0.01, '^': 0.005, '&': 0.005,
  '~': 0.001, '`': 0.001, '<': 0.005, '>': 0.005,
  // Digits — small, roughly even, 1 most common
  '0': 0.40, '1': 0.60, '2': 0.40, '3': 0.40, '4': 0.40,
  '5': 0.40, '6': 0.40, '7': 0.40, '8': 0.40, '9': 0.40,
};

// Capital letters: ~3% of their lowercase counterpart.
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  FREQ_RAW[c] = (FREQ_RAW[c.toLowerCase()] || 0) * 0.03;
}

const FREQ_TOTAL = CHAR_ORDER.reduce((acc, c) => acc + (FREQ_RAW[c] || 0), 0);

export const ENGLISH_FREQ = Object.fromEntries(
  CHAR_ORDER.map(c => [c, (FREQ_RAW[c] || 0) / FREQ_TOTAL])
);

export function coverageFraction(unlockedChars) {
  let s = 0;
  for (const c of unlockedChars) s += ENGLISH_FREQ[c] || 0;
  return s;
}
