import { clear } from './dom.js?v=1';
import { renderHome } from './home.js?v=1';
import { renderTest } from './test.js?v=1';
import { renderPractice } from './practice.js?v=1';

const root = document.getElementById('app');

const screens = {
  home: renderHome,
  test: renderTest,
  practice: renderPractice,
};

let activeCleanup = null;

function navigate(screen, params = {}) {
  const render = screens[screen];
  if (!render) {
    console.error('Unknown screen:', screen);
    return;
  }
  if (activeCleanup) {
    try { activeCleanup(); } catch (err) { console.error('cleanup error', err); }
    activeCleanup = null;
  }
  clear(root);
  const cleanup = render(root, params, navigate);
  if (typeof cleanup === 'function') activeCleanup = cleanup;
}

navigate('home');
