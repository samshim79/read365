import test from 'node:test';
import assert from 'node:assert';
import readings from './data/readings.js';
import { bookNumber, passageRange, plainText, loadPassage, chapterAudioUrl, passageAudio, verseTimes, TIMING } from './bible.js';
import readingsAll from './data/readings.js';
import { chapterVideo, hasVideos, buildQueue } from './reading.js';
import { measuredTimes } from './bible.js';
import { alignVerses } from './tools/align-verses.mjs';

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

// Ten verses of equal length in a 100 s video: after the intro/outro, each verse gets an equal share
const even = Array.from({ length: 10 }, (_, i) => ({ verse: i + 1, text: '가'.repeat(20) }));
const share = (100 - TIMING.intro - TIMING.outro) / 10;

test('verseTimes: a whole chapter plays from 0 with no end', () => {
  assert.deepEqual(verseTimes(even, 100, null, null), { start: 0, end: undefined });
  assert.deepEqual(verseTimes(even, 100, 1, 10), { start: 0, end: undefined });
});

test('verseTimes: a middle range starts a little early and ends a little late', () => {
  const { start, end } = verseTimes(even, 100, 4, 6);
  assert.equal(start, Math.round(TIMING.intro + 3 * share - TIMING.lead));
  assert.equal(end, Math.round(TIMING.intro + 6 * share + TIMING.tail));
});

test('verseTimes: longer verses take proportionally longer', () => {
  const uneven = [{ verse: 1, text: '가'.repeat(300) }, { verse: 2, text: '가'.repeat(100) }];
  const { start } = verseTimes(uneven, 200, 2, null);
  assert.ok(start > 140 && start < 150, String(start));
});

test('reading videos: every chapter in the schedule has one, Old and New Testament', () => {
  assert.deepEqual(chapterVideo('LUK', 8), { id: '1OqbrDzKlpo', duration: 472 });
  assert.deepEqual(chapterVideo('GEN', 1), { id: 'NbGHNcPhlUY', duration: 349 });
  for (const [day, list] of Object.entries(readingsAll)) {
    if (list && list.length) assert.ok(hasVideos(list), `day ${day}`);
  }
});

test('buildQueue: one video per chapter, with times only where a passage is partial', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => Array.from({ length: 50 }, (_, i) => ({ verse: i + 1, text: '가'.repeat(30) })) });
  const q = await buildQueue([['눅 12:1-13:9', 'LUK.12.1', 13, 9], ['눅 8:18-21', 'LUK.8.18-21', 8, 21]]);
  assert.deepEqual(q.map((s) => [s.passage, s.chapter, s.id]), [[0, 12, 'dmUiUwCPJIE'], [0, 13, 'ndvvmN9NXUQ'], [1, 8, '1OqbrDzKlpo']]);
  assert.deepEqual([q[0].start, q[0].end], [0, undefined]);       // Luke 12 from verse 1 to its end
  assert.ok(q[1].start === 0 && q[1].end > 0 && q[1].end < 308);   // Luke 13 stops after verse 9
  assert.ok(q[2].start > 0 && q[2].end > q[2].start);              // Luke 8:18-21 has both
  assert.deepEqual((await buildQueue([['창 1', 'GEN.1', null, null]])).map((s) => s.id), ['NbGHNcPhlUY']); // Old Testament too
});

test('buildQueue: plays the whole chapter when the text for timing is unavailable', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  const q = await buildQueue([['막 10:1-12', 'MRK.10.1', 10, 12]]);
  assert.deepEqual(q.map((s) => [s.chapter, s.start, s.end]), [[10, 0, undefined]]);
});

test('measuredTimes: from just before verse from\'s card to just after verse to+1\'s card', () => {
  const cards = { 2: 10, 4: 30, 5: 40 };
  assert.deepEqual(measuredTimes(cards, 2, 3), { start: 9.7, end: 30.3 });
  assert.deepEqual(measuredTimes(cards, 1, 5), { start: 0, end: undefined });
  assert.deepEqual(measuredTimes(cards, 4, 4), { start: 29.7, end: 40.3 }); // a lone verse
  assert.equal(measuredTimes(cards, 3, 4), null); // no card for the start verse: caller estimates
});

test('buildQueue uses checked verse-card times (day 278: 마4:12, 막1:14, 눅3:19-20)', async () => {
  globalThis.fetch = async () => { throw new Error('no network needed for measured chapters'); };
  const q = await buildQueue([['마 4:12', 'MAT.4.12', 4, 12], ['막 1:14', 'MRK.1.14', 1, 14], ['눅 3:19-20', 'LUK.3.19-20', 3, 20]]);
  assert.deepEqual(q.map((s) => [s.chapter, s.start, s.end]), [[4, 81.6, 86.8], [1, 102, 109.5], [3, 155.6, 171.2]]);
});

test('alignVerses finds verse starts in a transcript, skipping music and garbled lines', () => {
  const verses = [[1, '태초에 하나님이 천지를 창조하시니라'], [2, '땅이 혼돈하고 공허하며'], [3, '하나님이 가라사대 빛이 있으라 하시매 빛이 있었고']];
  const segments = [[0, '[음악]'], [3, '태초에 하나님이 천지를 창조하시니라'], [9, '땅이 혼돈하고 공허하며 하나님이'], [15, '가라사대 빛이 있으라 하시매 빛이 있었고']];
  const s = alignVerses(verses, segments, 22);
  assert.ok(Math.abs(s[0] - 3) < 1, String(s));
  assert.ok(Math.abs(s[1] - 9) < 1, String(s));
  assert.ok(s[2] > 11 && s[2] < 15, String(s));
});

test('ESV reading videos: every chapter has one, and they are separate from the Korean set', async () => {
  assert.deepEqual(chapterVideo('MAT', 1, 'esv'), { id: 'w0YrWsAQ9U8', duration: 234 });
  assert.deepEqual(chapterVideo('JOB', 23, 'esv'), { id: 'WxZx6mOEhak', duration: 125 });
  for (const [day, list] of Object.entries(readingsAll)) {
    if (list && list.length) assert.ok(hasVideos(list, 'esv'), `day ${day}`);
  }
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  const q = await buildQueue([['창 1', 'GEN.1', null, null]], 0, 'esv');
  assert.deepEqual(q.map((s) => s.id), ['oUMxJrCYW2s']);
});
