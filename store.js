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
// Dates are local calendar days (YYYY-MM-DD), not UTC, so a morning "done" counts for that day
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function prevDay(day) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function toggleDone(id) {
  if (id in s.done) delete s.done[id];
  else s.done[id] = localDate();
  persist();
}

// videos finished per day: { 'YYYY-MM-DD': count }
export function dayCounts() {
  const counts = {};
  for (const day of Object.values(s.done)) counts[day] = (counts[day] || 0) + 1;
  return counts;
}

// Consecutive days with at least one video done, ending today (or yesterday if nothing is done yet today)
export function streak(today = localDate()) {
  const counts = dayCounts();
  let day = counts[today] ? today : prevDay(today);
  let n = 0;
  while (counts[day]) { n++; day = prevDay(day); }
  return n;
}
