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

test('corrupt storage does not crash', () => {
  mem['read365:v1'] = '{not json';
  store.load('a');
  assert.equal(store.current(), 'a');
});
