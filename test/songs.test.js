import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKey, semitoneShift, describeShift, guessFromUrl, extractUrl, KEYS } from '../songs.js';

test('normalizeKey handles spellings and enharmonics', () => {
  assert.equal(normalizeKey('am'), 'Am');
  assert.equal(normalizeKey('A minor'), 'Am');
  assert.equal(normalizeKey('Db'), 'C#');
  assert.equal(normalizeKey('a#m'), 'Bbm');
  assert.equal(normalizeKey('F♯ major'), 'F#');
  assert.equal(normalizeKey('Gmaj'), 'G');
  assert.equal(normalizeKey('H'), '');
  assert.equal(normalizeKey(''), '');
  assert.equal(KEYS.length, 24);
});

test('semitoneShift picks the shortest direction', () => {
  assert.equal(semitoneShift('C', 'D'), 2);
  assert.equal(semitoneShift('C', 'Bb'), -2);
  assert.equal(semitoneShift('E', 'E'), 0);
  assert.equal(semitoneShift('Am', 'Cm'), 3);
  assert.equal(semitoneShift('G', 'C#'), 6);
  assert.equal(semitoneShift('', 'C'), null);
  assert.equal(describeShift('G', 'A'), 'Up 2 semitones (+2)');
  assert.equal(describeShift('G', 'F#'), 'Down 1 semitone (−1)');
});

test('guessFromUrl reads Ultimate Guitar links', () => {
  const g = guessFromUrl('https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-39144');
  assert.deepEqual(g, { title: 'Wonderwall', artist: 'Oasis', source: 'ultimate-guitar.com' });
  const h = guessFromUrl('https://tabs.ultimate-guitar.com/tab/the-beatles/let-it-be-chords-17427?app=1');
  assert.equal(h.title, 'Let It Be');
  assert.equal(h.artist, 'The Beatles');
});

test('guessFromUrl reads Tab4u links with Hebrew', () => {
  const url = 'https://www.tab4u.com/tabs/songs/1234_' + encodeURIComponent('אריק_איינשטיין_-_אני_ואתה') + '.html';
  const g = guessFromUrl(url);
  assert.equal(g.title, 'אני ואתה');
  assert.equal(g.artist, 'אריק איינשטיין');
  assert.equal(g.source, 'tab4u.com');
});

test('guessFromUrl falls back to the last path segment', () => {
  assert.equal(guessFromUrl('https://example.com/songs/hotel-california-chords.html').title, 'Hotel California');
  assert.deepEqual(guessFromUrl('not a url'), { title: '', artist: '', source: '' });
});

test('extractUrl finds a link inside shared text', () => {
  assert.equal(extractUrl('Check this https://example.com/a?b=1 out'), 'https://example.com/a?b=1');
  assert.equal(extractUrl('nothing here'), '');
});
