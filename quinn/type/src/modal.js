import { el } from './dom.js';

export function showModal({ title, children, onDismiss, dismissLabel = 'Got it!' }) {
  const btn = el('button', { class: 'primary modal-dismiss', text: dismissLabel });
  const titleEl = el('h2', { class: 'modal-title', text: title });
  const body = el('div', { class: 'modal-body' }, children);
  const card = el('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true' }, [
    titleEl,
    body,
    btn,
  ]);
  const backdrop = el('div', { class: 'modal-backdrop' }, [card]);

  function close() {
    window.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    onDismiss?.();
  }

  function onKey(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') close();
  }

  btn.addEventListener('click', close);
  document.body.append(backdrop);
  window.addEventListener('keydown', onKey, true);
  setTimeout(() => btn.focus(), 0);
}
