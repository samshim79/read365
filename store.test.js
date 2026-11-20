import test from 'node:test';
import assert from 'node:assert';

const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = v; },
};
const store = await import('./store.js');
test.beforeEach(() => { for (const k in mem) delete mem[k]; });

test('empty storage starts at the first video', () => {
  store.load('a');
  assert.equal(store.current(), 'a');
  assert.equal(store.position('a'), 0);
});

test('position, current and done survive a reload', () => {
  store.load('a');
  store.setCurrent('b');
  store.savePosition('b', 123.9);
  store.toggleDone('a');
  store.load('a');
  assert.equal(store.current(), 'b');
  assert.equal(store.position('b'), 123);
  assert.equal(store.isDone('a'), true);
  assert.equal(store.doneCount(), 1);
});

test('toggleDone twice undoes it', () => {
  store.load('a');
  store.toggleDone('a');
  store.toggleDone('a');
  assert.equal(store.isDone('a'), false);
});

test('defaults: the reading videos, with 개역한글 text', () => {
  store.load('a');
  assert.equal(store.afterLecture(), 'videos');
  assert.equal(store.bibleVersion(), 88);
  assert.equal(store.activeVersion(), 88);
});

test('while the reading videos are on, only 개역한글 can be used; the saved choice comes back with the Bible app', () => {
  store.load('a');
  store.setAfterLecture('videos');
  store.setBibleVersion(142);
  assert.equal(store.versionAllowed(142), false);
  assert.equal(store.versionAllowed(88), true);
  assert.equal(store.activeVersion(), 88);
  store.setAfterLecture('bible');
  assert.equal(store.versionAllowed(142), true);
  assert.equal(store.activeVersion(), 142);
  store.load('a');
  assert.equal(store.bibleVersion(), 142); // remembered
});

test('a saved NIV choice becomes NASB', () => {
  store.setBibleVersion(111);
  store.load('a');
  assert.equal(store.bibleVersion(), 100);
});

test('streak counts consecutive days and survives a not-yet-done today', () => {
  mem['read365:v1'] = JSON.stringify({ done: { a: '2026-10-10', b: '2026-10-16', c: '2026-10-17', d: '2026-10-17', e: '2026-10-15' } });
  store.load('a');
  assert.equal(store.streak('2026-10-17'), 3); // 15, 16, 17
  assert.equal(store.streak('2026-10-18'), 3); // nothing today yet: streak still alive from yesterday
  assert.equal(store.streak('2026-10-19'), 0); // a full day missed
  assert.deepEqual(store.dayCounts()['2026-10-17'], 2);
});

test('prevDay crosses month and year boundaries', () => {
  assert.equal(store.prevDay('2026-03-01'), '2026-02-28');
  assert.equal(store.prevDay('2027-01-01'), '2026-12-31');
});

test('corrupt storage does not crash', () => {
  mem['read365:v1'] = '{not json';
  store.load('a');
  assert.equal(store.current(), 'a');
});
