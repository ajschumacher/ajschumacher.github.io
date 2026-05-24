import { el } from './dom.js';
import { charInfo } from './chars.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const PALETTES = [
  { petal: '#ffc4d6', edge: '#f490ad', center: '#ffe6a3' },
  { petal: '#ffd9a8', edge: '#f5a86b', center: '#fff1b8' },
  { petal: '#fff3a3', edge: '#e8c44b', center: '#ffd58e' },
  { petal: '#cdf3c0', edge: '#86c97b', center: '#fff1b8' },
  { petal: '#d1c8ff', edge: '#9d8df0', center: '#ffe6a3' },
  { petal: '#b8d6ff', edge: '#79a6f5', center: '#fff1b8' },
];

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function renderFlower(prompt) {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const swayDur = (4 + Math.random() * 2).toFixed(2) + 's';
  const startSway = (Math.random() * -3).toFixed(2) + 's';

  const wrapper = el('div', {
    class: 'flower',
    style: {
      '--petal': palette.petal,
      '--petal-edge': palette.edge,
      '--center': palette.center,
      '--sway-dur': swayDur,
      '--sway-delay': startSway,
    },
  });

  const body = el('div', { class: 'flower-body' });

  const svg = svgEl('svg', {
    class: 'flower-shape',
    viewBox: '-130 -130 260 260',
    'aria-hidden': 'true',
  });

  const petals = svgEl('g', { class: 'petals' });
  const N = 7;
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2;
    const cx = Math.cos(angle) * 60;
    const cy = Math.sin(angle) * 60;
    const rotDeg = (angle * 180) / Math.PI;
    const petal = svgEl('ellipse', {
      cx, cy, rx: 55, ry: 36,
      transform: `rotate(${rotDeg.toFixed(2)} ${cx} ${cy})`,
    });
    petals.append(petal);
  }
  svg.append(petals);
  svg.append(svgEl('circle', { class: 'flower-center', cx: 0, cy: 0, r: 50 }));
  body.append(svg);

  const text = el('div', { class: 'flower-text' });
  for (const c of prompt) {
    if (c === '\n') {
      // Zero-height span that forces a flex line-break; keeps .ch indices aligned
      text.append(el('span', { class: 'ch ch-newline' }));
    } else if (c === ' ') {
      // Real space between words — no highlight coloring
      text.append(el('span', { class: 'ch ch-space', text: ' ' }));
    } else {
      const info = charInfo(c);
      const label = info ? info.display : c;
      text.append(el('span', { class: 'ch', text: label }));
    }
  }
  body.append(text);

  wrapper.append(body);
  return wrapper;
}
