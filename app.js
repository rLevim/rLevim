import { NOTES, KEYS, normalizeKey, parseKey, describeShift, guessFromUrl, extractUrl } from './songs.js';

const STORAGE_KEY = 'band-songbook.songs.v1';
const $ = (sel) => document.querySelector(sel);

const form = $('#song-form');
const keyPicker = $('#key-picker');
const list = $('#songs');

let songs = load();
let selectedNote = '';
// Last title/artist we filled in automatically, so we don't overwrite what the user typed.
let autoFilled = { title: '', artist: '' };

// ---------- storage ----------

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch {
    toast('Could not save — is storage blocked in this browser?');
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function sameUrl(a, b) {
  const clean = (u) => String(u || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  return clean(a) === clean(b);
}

// Insert or update. Returns 'added' or 'updated'.
function upsert(song) {
  const idx = songs.findIndex((s) => (song.id && s.id === song.id) || sameUrl(s.url, song.url));
  if (idx >= 0) {
    songs[idx] = { ...songs[idx], ...song, id: songs[idx].id, updatedAt: Date.now() };
    persist();
    return 'updated';
  }
  songs.push({ ...song, id: newId(), addedAt: Date.now() });
  persist();
  return 'added';
}

// ---------- form ----------

function buildKeyControls() {
  for (const note of NOTES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = note;
    b.dataset.note = note;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.addEventListener('click', () => selectNote(selectedNote === note ? '' : note));
    keyPicker.append(b);
  }
  const orig = form.elements.originalKey;
  const filter = $('#key-filter');
  for (const k of KEYS) {
    orig.append(new Option(k, k));
    filter.append(new Option(k, k));
  }
}

function selectNote(note) {
  selectedNote = note;
  for (const b of keyPicker.children) b.setAttribute('aria-checked', String(b.dataset.note === note));
  updateHint();
}

function currentKey() {
  return selectedNote ? selectedNote + form.elements.mode.value : '';
}

function setKey(key) {
  const k = parseKey(key);
  selectNote(k ? k.note : '');
  form.elements.mode.value = k && k.minor ? 'm' : '';
  updateHint();
}

function updateHint() {
  const orig = form.elements.originalKey.value;
  const key = currentKey();
  $('#shift-hint').textContent = orig && key ? `From the chords page: ${describeShift(orig, key)}` : '';
}

function fillFromUrl() {
  const url = form.elements.url.value.trim();
  const g = guessFromUrl(url);
  for (const field of ['title', 'artist']) {
    const input = form.elements[field];
    // Only overwrite if empty or still holding our previous guess.
    if (g[field] && (!input.value || input.value === autoFilled[field])) input.value = g[field];
  }
  autoFilled = { title: g.title, artist: g.artist };
  const existing = songs.find((s) => sameUrl(s.url, url));
  if (existing && !form.elements.id.value) toast(`Already saved in ${existing.key || 'no key'} — saving will update it`);
}

function resetForm() {
  form.reset();
  form.elements.id.value = '';
  autoFilled = { title: '', artist: '' };
  selectNote('');
  $('#save-btn').textContent = 'Save song';
  $('#add-title').textContent = 'Add a song';
  $('#cancel-btn').hidden = true;
  form.querySelector('details').open = false;
}

function editSong(id) {
  const s = songs.find((x) => x.id === id);
  if (!s) return;
  resetForm();
  const el = form.elements;
  el.id.value = s.id;
  el.url.value = s.url || '';
  el.title.value = s.title || '';
  el.artist.value = s.artist || '';
  el.originalKey.value = s.originalKey || '';
  el.capo.value = s.capo ?? '';
  el.notes.value = s.notes || '';
  setKey(s.key);
  form.querySelector('details').open = Boolean(s.originalKey || s.capo || s.notes);
  $('#save-btn').textContent = 'Update song';
  $('#add-title').textContent = 'Edit song';
  $('#cancel-btn').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onSubmit(e) {
  e.preventDefault();
  const el = form.elements;
  const url = el.url.value.trim();
  const key = currentKey();
  if (!url) return toast('Paste a chords link first');
  if (!key) return toast('Pick the key you play it in');
  const guess = guessFromUrl(url);
  const capo = el.capo.value === '' ? null : Math.max(0, Math.min(12, Number(el.capo.value)));
  const result = upsert({
    id: el.id.value || undefined,
    url,
    key,
    title: el.title.value.trim() || guess.title || url,
    artist: el.artist.value.trim(),
    originalKey: el.originalKey.value,
    capo,
    notes: el.notes.value.trim(),
    source: guess.source,
  });
  toast(result === 'added' ? `Saved in ${key}` : `Updated — now in ${key}`);
  resetForm();
  render();
}

// ---------- list ----------

function render() {
  const q = $('#search').value.trim().toLowerCase();
  const keyFilter = $('#key-filter').value;
  const sort = $('#sort').value;

  let rows = songs.filter((s) => {
    if (keyFilter && s.key !== keyFilter) return false;
    if (!q) return true;
    return [s.title, s.artist, s.key, s.notes, s.source].some((v) => String(v || '').toLowerCase().includes(q));
  });

  const byTitle = (a, b) => String(a.title).localeCompare(String(b.title), undefined, { sensitivity: 'base' });
  if (sort === 'key') rows.sort((a, b) => KEYS.indexOf(a.key) - KEYS.indexOf(b.key) || byTitle(a, b));
  else if (sort === 'recent') rows.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  else rows.sort(byTitle);

  list.replaceChildren(...rows.map(songItem));
  $('#empty').hidden = songs.length > 0;
  $('#empty').textContent = songs.length
    ? ''
    : 'No songs yet. Paste a chords link above, pick the key and save.';
  if (songs.length && !rows.length) {
    $('#empty').hidden = false;
    $('#empty').textContent = 'No songs match.';
  }
  $('#count').textContent = songs.length ? `${songs.length} song${songs.length === 1 ? '' : 's'}` : '';
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== ''));
  return node;
}

function songItem(s) {
  const meta = [s.artist, s.source, s.capo ? `Capo ${s.capo}` : '', s.originalKey ? describeShift(s.originalKey, s.key) : '']
    .filter(Boolean)
    .join(' · ');
  const link = el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', textContent: s.title });

  const edit = el('button', { type: 'button', className: 'link', textContent: 'Edit' });
  edit.addEventListener('click', () => editSong(s.id));
  const del = el('button', { type: 'button', className: 'link danger', textContent: 'Delete' });
  del.addEventListener('click', () => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    songs = songs.filter((x) => x.id !== s.id);
    persist();
    render();
    toast('Deleted');
  });

  return el(
    'li',
    { className: 'song' },
    el('div', { className: 'key-badge', title: `Key: ${s.key}`, textContent: s.key || '?' }),
    el(
      'div',
      { className: 'song-main' },
      el('div', { className: 'song-title', dir: 'auto' }, link),
      meta ? el('div', { className: 'song-meta', dir: 'auto', textContent: meta }) : null,
      s.notes ? el('div', { className: 'song-meta', dir: 'auto', textContent: s.notes }) : null,
      el(
        'div',
        { className: 'song-actions' },
        el('a', { className: 'open', href: s.url, target: '_blank', rel: 'noopener noreferrer', textContent: 'Open chords ↗' }),
        edit,
        del,
      ),
    ),
  );
}

// ---------- share & backup ----------

function listAsText() {
  return [...songs]
    .sort((a, b) => String(a.title).localeCompare(String(b.title)))
    .map((s) => `${s.title}${s.artist ? ' – ' + s.artist : ''}: ${s.key}${s.capo ? ` (capo ${s.capo})` : ''}\n${s.url}`)
    .join('\n\n');
}

async function copyList() {
  if (!songs.length) return toast('Nothing to copy yet');
  try {
    await navigator.clipboard.writeText(listAsText());
    toast('Copied — paste it in the band chat');
  } catch {
    toast('Copy failed in this browser');
  }
}

function exportFile() {
  if (!songs.length) return toast('Nothing to export yet');
  const blob = new Blob([JSON.stringify({ app: 'band-songbook', version: 1, songs }, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `songbook-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.songs;
    if (!Array.isArray(incoming)) throw new Error('bad file');
    let added = 0;
    let updated = 0;
    for (const s of incoming) {
      if (!s || !s.url) continue;
      const r = upsert({ ...s, id: undefined, key: normalizeKey(s.key) || s.key || '' });
      r === 'added' ? added++ : updated++;
    }
    render();
    toast(`Imported: ${added} new, ${updated} updated`);
  } catch {
    toast('That file is not a songbook export');
  }
}

// ---------- quick add via link (?url=…&key=…) and phone share sheet ----------

function handleIncoming() {
  const p = new URLSearchParams(location.search);
  if (![...p.keys()].length) return;
  const url = p.get('url') || extractUrl(p.get('text')) || extractUrl(p.get('title'));
  history.replaceState(null, '', location.pathname);
  if (!url) return;
  const key = normalizeKey(p.get('key'));
  form.elements.url.value = url;
  fillFromUrl();
  // Shared page titles are usually better than our slug guess, but sites append " - Chords" etc.
  const sharedTitle = p.get('title') && !extractUrl(p.get('title')) ? p.get('title') : '';
  if (p.get('song')) form.elements.title.value = p.get('song');
  else if (sharedTitle && !form.elements.title.value) form.elements.title.value = sharedTitle;
  if (p.get('artist')) form.elements.artist.value = p.get('artist');
  if (key) {
    setKey(key);
    // Link and key both given: keep it straight away.
    form.requestSubmit();
  } else {
    toast('Link added — now pick the key');
    keyPicker.querySelector('button')?.focus();
  }
}

// ---------- misc ----------

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function init() {
  buildKeyControls();
  form.addEventListener('submit', onSubmit);
  form.elements.url.addEventListener('input', fillFromUrl);
  form.elements.originalKey.addEventListener('change', updateHint);
  for (const r of form.elements.mode) r.addEventListener('change', updateHint);
  $('#cancel-btn').addEventListener('click', resetForm);

  if (navigator.clipboard?.readText) {
    const paste = $('#paste-btn');
    paste.hidden = false;
    paste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const url = extractUrl(text) || text.trim();
        if (!url) return toast('Clipboard is empty');
        form.elements.url.value = url;
        fillFromUrl();
      } catch {
        toast('Allow clipboard access, or paste into the box');
      }
    });
  }

  for (const id of ['#search', '#key-filter', '#sort']) $(id).addEventListener('input', render);
  $('#copy-btn').addEventListener('click', copyList);
  $('#export-btn').addEventListener('click', exportFile);
  $('#import-input').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importFile(f);
    e.target.value = '';
  });

  render();
  handleIncoming();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
