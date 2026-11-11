import test from 'node:test';
import assert from 'node:assert';
import readings from './data/readings.js';
import { bookNumber, passageRange, plainText, loadPassage, chapterAudioUrl, passageAudio } from './bible.js';

test('book numbers follow the standard order', () => {
  assert.equal(bookNumber('GEN'), 1);
  assert.equal(bookNumber('PSA'), 19);
  assert.equal(bookNumber('SNG'), 22);
  assert.equal(bookNumber('MAT'), 40);
  assert.equal(bookNumber('REV'), 66);
});

test('whole chapters across a range', () => {
  assert.deepEqual(passageRange('GEN.1', 3, null).segments, [
    { chapter: 1, from: null, to: null }, { chapter: 2, from: null, to: null }, { chapter: 3, from: null, to: null },
  ]);
});

test('a single chapter has no end fields', () => {
  assert.deepEqual(passageRange('JHN.9', null, null).segments, [{ chapter: 9, from: null, to: null }]);
});

test('verse range inside one chapter', () => {
  assert.deepEqual(passageRange('NUM.9.1-14', 9, 14).segments, [{ chapter: 9, from: 1, to: 14 }]);
  assert.deepEqual(passageRange('NUM.9.1-14').segments, [{ chapter: 9, from: 1, to: 14 }]); // older data without end fields
});

test('mid-chapter start through a later chapter and verse', () => {
  assert.deepEqual(passageRange('NUM.18.1', 20, 13).segments, [
    { chapter: 18, from: 1, to: null }, { chapter: 19, from: null, to: null }, { chapter: 20, from: null, to: 13 },
  ]);
});

test('mid-chapter start through whole later chapters', () => {
  assert.deepEqual(passageRange('JHN.7.11', 8, null).segments, [
    { chapter: 7, from: 11, to: null }, { chapter: 8, from: null, to: null },
  ]);
});

test('a lone verse', () => {
  assert.deepEqual(passageRange('JHN.4.3', 4, 3).segments, [{ chapter: 4, from: 3, to: 3 }]);
});

test('every reading in the schedule resolves to a book and chapters', () => {
  for (const day of Object.values(readings)) {
    for (const [, ref, ec, ev] of day) {
      const { num, segments } = passageRange(ref, ec, ev);
      assert.ok(num >= 1 && num <= 66, ref);
      assert.ok(segments.length >= 1 && segments.length <= 20, `${ref} -> ${segments.length} chapters`);
    }
  }
});

test('plainText strips tags and entities', () => {
  assert.equal(plainText('In the <i>beginning</i> God<br/>created &amp; made'), 'In the beginning God created & made');
});

test('loadPassage trims the first and last chapter to the verse range', async () => {
  const rows = (n) => Array.from({ length: n }, (_, i) => ({ verse: i + 1, text: `v${i + 1}` }));
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => rows(5) };
  };
  const got = await loadPassage('TST', 'GEN.1.4', 2, 2);
  assert.deepEqual(got.map((v) => `${v.chapter}:${v.verse}`), ['1:4', '1:5', '2:1', '2:2']);
  assert.deepEqual(calls, ['https://bolls.life/get-text/TST/1/1/', 'https://bolls.life/get-text/TST/1/2/']);
});

test('loadPassage rejects when the API errors', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  await assert.rejects(loadPassage('NOPE', 'GEN.1', null, null));
});

test('recorded audio file names match eBible.org (names seen on its file list)', () => {
  const base = 'https://ebible.org/eng-webbe/mp3/eng-webbe_';
  assert.equal(chapterAudioUrl('GEN', 1), base + '002_GEN_01.mp3');
  assert.equal(chapterAudioUrl('PSA', 23), base + '020_PSA_023.mp3');
  assert.equal(chapterAudioUrl('PSA', 119), base + '020_PSA_119.mp3');
  assert.equal(chapterAudioUrl('MAT', 1), base + '070_MAT_01.mp3');
  assert.equal(chapterAudioUrl('JHN', 3), base + '073_JHN_03.mp3');
  assert.equal(chapterAudioUrl('1JN', 1), base + '092_1JN_01.mp3');
  assert.equal(chapterAudioUrl('JUD', 1), base + '095_JUD_01.mp3');
  assert.equal(chapterAudioUrl('REV', 22), base + '096_REV_22.mp3');
});

test('a passage plays every chapter it touches', () => {
  assert.deepEqual(passageAudio('LUK.12.1', 13).map((t) => t.chapter), [12, 13]);
  assert.deepEqual(passageAudio('LUK.8.18-21', 8).map((t) => t.chapter), [8]);
});
