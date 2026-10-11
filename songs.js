// Pure helpers for keys and chord links. No DOM access, so they can be tested in Node.

export const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const ALIASES = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb', Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C' };

// Every selectable key, majors then minors: ["C", "C#", ..., "Cm", "C#m", ...]
export const KEYS = [...NOTES, ...NOTES.map((n) => n + 'm')];

// "a#m", "Bb minor", "F# Major", "Am" -> { note: "Bb", minor: true } (or null if unrecognised)
export function parseKey(input) {
  if (!input) return null;
  const m = String(input).trim().match(/^([A-Ga-g])\s*([#b♯♭]?)\s*(m|min|minor|maj|major)?$/i);
  if (!m) return null;
  let note = m[1].toUpperCase() + (m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : m[2]);
  note = ALIASES[note] || note;
  if (!NOTES.includes(note)) return null;
  const quality = (m[3] || '').toLowerCase();
  // A lone "m" is minor; "maj"/"major" or nothing is major.
  return { note, minor: quality === 'm' || quality === 'min' || quality === 'minor' };
}

export function normalizeKey(input) {
  const k = parseKey(input);
  return k ? k.note + (k.minor ? 'm' : '') : '';
}

// Semitones to move from one key to another, as the shortest shift (-5..+6). null if either key is missing.
export function semitoneShift(fromKey, toKey) {
  const a = parseKey(fromKey);
  const b = parseKey(toKey);
  if (!a || !b) return null;
  let d = (NOTES.indexOf(b.note) - NOTES.indexOf(a.note) + 12) % 12;
  if (d > 6) d -= 12;
  return d;
}

export function describeShift(fromKey, toKey) {
  const d = semitoneShift(fromKey, toKey);
  if (d === null) return '';
  if (d === 0) return 'Same as original';
  const n = Math.abs(d);
  return `${d > 0 ? 'Up' : 'Down'} ${n} semitone${n === 1 ? '' : 's'} (${d > 0 ? '+' : '−'}${n})`;
}

const SUFFIX = /[-_ ](chords?|tabs?|tab|ukulele|bass|guitar[-_ ]pro|power|official|drums|lyrics|acoustic|ver\d*)([-_ ]\d+)*$/i;

function tidy(s) {
  return s
    .replace(/\.(html?|php|aspx?)$/i, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(s) {
  // Only touch all-lowercase Latin words, so Hebrew and existing capitals are left alone.
  return s.replace(/\b[a-z][a-z']*/g, (w) => w[0].toUpperCase() + w.slice(1));
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

// Best-effort guess of { title, artist, source } from a chords URL. Fields may be empty.
export function guessFromUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return { title: '', artist: '', source: '' };
  }
  const source = url.hostname.replace(/^(www|tabs|m)\./, '');
  const parts = url.pathname.split('/').filter(Boolean).map(safeDecode);

  // Ultimate Guitar: /tab/<artist>/<song>-chords-12345
  if (source.includes('ultimate-guitar') && parts[0] === 'tab' && parts.length >= 3) {
    return {
      title: titleCase(tidy(parts[2].replace(SUFFIX, ''))),
      artist: titleCase(tidy(parts[1])),
      source,
    };
  }

  // Tab4u: /tabs/songs/12345_Artist_-_Song.html
  if (source.includes('tab4u') && parts.length) {
    const name = parts[parts.length - 1].replace(/\.html?$/i, '').replace(/^\d+_/, '');
    const [artist, ...rest] = name.split('_-_');
    if (rest.length) return { title: tidy(rest.join(' - ')), artist: tidy(artist), source };
    return { title: tidy(name), artist: '', source };
  }

  // Anything else: use the last meaningful path segment.
  const last = [...parts].reverse().find((p) => /[^\d\W_]/u.test(p)) || '';
  const cleaned = last.replace(/\.(html?|php|aspx?)$/i, '').replace(SUFFIX, '');
  // Common "artist - song" slug pattern.
  const split = cleaned.split(/\s+-\s+|_-_/);
  if (split.length === 2) return { title: titleCase(tidy(split[1])), artist: titleCase(tidy(split[0])), source };
  return { title: titleCase(tidy(cleaned)), artist: '', source };
}

// Pull a URL out of arbitrary shared text (phones often share "Song name https://...").
export function extractUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0] : '';
}
