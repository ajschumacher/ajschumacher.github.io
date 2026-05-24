import { el } from './dom.js?v=1';

const KB_ROWS = [
  [
    ['`', 1, '`'], ['1', 1, '1'], ['2', 1, '2'], ['3', 1, '3'], ['4', 1, '4'],
    ['5', 1, '5'], ['6', 1, '6'], ['7', 1, '7'], ['8', 1, '8'], ['9', 1, '9'],
    ['0', 1, '0'], ['-', 1, '-'], ['=', 1, '='], ['⌫', 2, null],
  ],
  [
    ['Tab', 1.5, null], ['Q', 1, 'q'], ['W', 1, 'w'], ['E', 1, 'e'], ['R', 1, 'r'],
    ['T', 1, 't'], ['Y', 1, 'y'], ['U', 1, 'u'], ['I', 1, 'i'], ['O', 1, 'o'],
    ['P', 1, 'p'], ['[', 1, '['], [']', 1, ']'], ['\\', 1.5, '\\'],
  ],
  [
    ['Caps', 1.75, null], ['A', 1, 'a'], ['S', 1, 's'], ['D', 1, 'd'], ['F', 1, 'f'],
    ['G', 1, 'g'], ['H', 1, 'h'], ['J', 1, 'j'], ['K', 1, 'k'], ['L', 1, 'l'],
    [';', 1, ';'], ["'", 1, "'"], ['Enter', 2.25, '\n'],
  ],
  [
    ['Shift', 2.25, 'shiftL'], ['Z', 1, 'z'], ['X', 1, 'x'], ['C', 1, 'c'], ['V', 1, 'v'],
    ['B', 1, 'b'], ['N', 1, 'n'], ['M', 1, 'm'], [',', 1, ','], ['.', 1, '.'],
    ['/', 1, '/'], ['Shift', 2.75, 'shiftR'],
  ],
  [
    ['Ctrl', 1.25, null], ['Alt', 1.25, null], ['Cmd', 1.25, null],
    ['Space', 6.25, ' '],
    ['Cmd', 1.25, null], ['Alt', 1.25, null], ['Ctrl', 1.25, null],
  ],
];

export function renderKeyboard({ highlight, shiftHand } = {}) {
  const wrap = el('div', { class: 'kb' });
  for (const row of KB_ROWS) {
    const rowEl = el('div', { class: 'kb-row' });
    for (const [label, width, code] of row) {
      const classes = ['kb-key'];
      if (code === highlight) classes.push('kb-highlight');
      if (shiftHand === 'L' && code === 'shiftL') classes.push('kb-shift');
      if (shiftHand === 'R' && code === 'shiftR') classes.push('kb-shift');
      if (code === ' ') classes.push('kb-key-space');
      const key = el('div', {
        class: classes.join(' '),
        style: { width: `calc(var(--kb-unit) * ${width} + ${(width - 1) * 4}px)` },
        text: label,
      });
      rowEl.append(key);
    }
    wrap.append(rowEl);
  }
  return wrap;
}
