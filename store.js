// State + persistence. Everything lives under one versioned localStorage key.
const KEY = 'read365:v1';
const fresh = () => ({ current: null, positions: {}, done: {}, bibleVersion: 111 });
let s = fresh();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage may be unavailable */ }
}

export function load(firstId) {
  s = fresh();
  try {
    const r = JSON.parse(localStorage.getItem(KEY));
    if (r && typeof r === 'object') s = { ...s, ...r };
  } catch { /* empty or corrupt: start fresh */ }
  if (!s.current) s.current = firstId;
}

export const current = () => s.current;
export const position = (id) => s.positions[id] || 0;
export const isDone = (id) => id in s.done;
export const doneCount = () => Object.keys(s.done).length;
export const bibleVersion = () => s.bibleVersion;
export function setBibleVersion(id) { s.bibleVersion = id; persist(); }

export function setCurrent(id) { s.current = id; persist(); }
export function savePosition(id, seconds) { s.positions[id] = Math.floor(seconds); persist(); }
export function toggleDone(id) {
  if (id in s.done) delete s.done[id];
  else s.done[id] = new Date().toISOString().slice(0, 10);
  persist();
}
