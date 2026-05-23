import { el } from './dom.js';
import {
  listProfiles,
  createProfile,
  deleteProfile,
  exportProfile,
  importProfile,
  touchLastPlayed,
} from './storage.js';
import { awphm } from './stats.js';

export function renderHome(root, _params, navigate) {
  const message = el('p', { class: 'message' });

  function showError(text) {
    message.classList.remove('ok');
    message.textContent = text;
  }

  function showOk(text) {
    message.classList.add('ok');
    message.textContent = text;
  }

  function play(profile) {
    touchLastPlayed(profile);
    navigate(profile.level === 0 ? 'test' : 'practice', { profileId: profile.id });
  }

  const profiles = listProfiles().sort((a, b) =>
    (b.lastPlayed || '').localeCompare(a.lastPlayed || '')
  );

  const list = el('div', { class: 'profile-list' });
  if (profiles.length === 0) {
    list.append(
      el('p', {
        class: 'empty',
        text: 'No players yet — type a name below to get started.',
      })
    );
  } else {
    for (const profile of profiles) {
      list.append(renderRow(profile, { play, navigate, showError }));
    }
  }

  const nameInput = el('input', {
    type: 'text',
    placeholder: 'New player name',
    maxlength: '30',
    autocomplete: 'off',
  });
  const createBtn = el('button', { class: 'primary', type: 'submit', text: 'Create' });

  const newForm = el(
    'form',
    {
      class: 'new-profile',
      onsubmit: e => {
        e.preventDefault();
        try {
          const profile = createProfile(nameInput.value);
          play(profile);
        } catch (err) {
          showError(err.message);
        }
      },
    },
    [nameInput, createBtn]
  );

  const importInput = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    class: 'hidden-file',
    id: 'import-input',
  });
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const profile = await importProfile(file);
      if (profile) {
        showOk(`Loaded "${profile.name}".`);
        navigate('home');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      importInput.value = '';
    }
  });
  const importLabel = el('label', {
    for: 'import-input',
    class: 'link-button',
    text: 'Import a saved player…',
  });

  const container = el('div', { class: 'screen home' }, [
    el('h1', { class: 'title', text: 'Type Game' }),
    el('p', { class: 'subtitle', text: 'Who is typing today?' }),
    list,
    newForm,
    el('div', { class: 'import' }, [importLabel, importInput]),
    message,
  ]);

  root.append(container);
  if (profiles.length === 0) nameInput.focus();
}

function renderRow(profile, { play, navigate, showError }) {
  const meta =
    profile.level > 0
      ? `Level ${profile.level} · AWPHM ${awphm(profile)}`
      : 'New player — needs a quick placement first';

  const playBtn = el('button', {
    class: 'primary',
    text: profile.level > 0 ? 'Play' : 'Start',
    onclick: () => play(profile),
  });

  const exportBtn = el('button', {
    class: 'secondary',
    text: 'Export',
    onclick: () => {
      try {
        exportProfile(profile.id);
      } catch (err) {
        showError(err.message);
      }
    },
  });

  const deleteBtn = el('button', {
    class: 'danger',
    text: 'Delete',
    onclick: () => {
      if (confirm(`Delete player "${profile.name}"? This can't be undone.`)) {
        deleteProfile(profile.id);
        navigate('home');
      }
    },
  });

  return el('div', { class: 'profile-row' }, [
    el('div', { class: 'info' }, [
      el('div', { class: 'name', text: profile.name }),
      el('div', { class: 'meta', text: meta }),
    ]),
    el('div', { class: 'actions' }, [playBtn, exportBtn, deleteBtn]),
  ]);
}
