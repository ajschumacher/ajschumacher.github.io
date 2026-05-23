const INDEX_KEY = 'typeGame.profiles';
const PROFILE_PREFIX = 'typeGame.profile.';
const SCHEMA_VERSION = 1;

function profileKey(id) {
  return PROFILE_PREFIX + id;
}

function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY)) || [];
  } catch {
    return [];
  }
}

function writeIndex(idx) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'p-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function blankProfile(name) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: makeId(),
    name,
    createdAt: new Date().toISOString(),
    level: 0,
    charStats: {},
    audio: { sfxOn: false },
    lastPlayed: null,
  };
}

export function listProfiles() {
  return readIndex()
    .map(({ id }) => loadProfile(id))
    .filter(Boolean);
}

export function loadProfile(id) {
  const raw = localStorage.getItem(profileKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(profileKey(profile.id), JSON.stringify(profile));
  const idx = readIndex();
  const i = idx.findIndex(p => p.id === profile.id);
  const entry = { id: profile.id, name: profile.name };
  if (i === -1) idx.push(entry);
  else idx[i] = entry;
  writeIndex(idx);
}

export function createProfile(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Please enter a name.');
  const clash = listProfiles().find(
    p => p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (clash) throw new Error(`A player named "${trimmed}" already exists.`);
  const profile = blankProfile(trimmed);
  saveProfile(profile);
  return profile;
}

export function deleteProfile(id) {
  localStorage.removeItem(profileKey(id));
  writeIndex(readIndex().filter(p => p.id !== id));
}

export function exportProfile(id) {
  const profile = loadProfile(id);
  if (!profile) throw new Error('Profile not found.');
  const blob = new Blob([JSON.stringify(profile, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = profile.name.replace(/[^a-z0-9_-]+/gi, '_');
  a.href = url;
  a.download = `${safeName || 'profile'}.typegame.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function sanitizeImport(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('That file does not look like a saved profile.');
  }
  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Saved profile is missing a name.');
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    id: typeof data.id === 'string' && data.id ? data.id : makeId(),
    name: data.name.trim(),
    createdAt: data.createdAt || new Date().toISOString(),
    level: Number.isFinite(data.level) ? data.level : 0,
    charStats: data.charStats && typeof data.charStats === 'object' ? data.charStats : {},
    audio: data.audio && typeof data.audio === 'object'
      ? { sfxOn: !!data.audio.sfxOn }
      : { sfxOn: false },
    lastPlayed: data.lastPlayed || null,
  };
}

export async function importProfile(file, { confirm: confirmFn } = {}) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const incoming = sanitizeImport(data);
  const existingById = loadProfile(incoming.id);
  const existingByName = listProfiles().find(
    p => p.id !== incoming.id && p.name.toLowerCase() === incoming.name.toLowerCase()
  );
  const existing = existingById || existingByName;
  if (existing) {
    const ask = confirmFn || (msg => Promise.resolve(window.confirm(msg)));
    const proceed = await ask(`A player named "${existing.name}" already exists. Replace it?`);
    if (!proceed) return null;
    if (existing.id !== incoming.id) deleteProfile(existing.id);
  }
  saveProfile(incoming);
  return incoming;
}

export function touchLastPlayed(profile) {
  profile.lastPlayed = new Date().toISOString();
  saveProfile(profile);
}
