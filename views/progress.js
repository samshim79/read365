// S3: how many videos are done, the current streak, and the last 28 days at a glance.
const DAYS_SHOWN = 28;

export function renderProgress(root, store, total) {
  const done = store.doneCount();
  const pct = Math.round((done / total) * 100);
  const streak = store.streak();
  const counts = store.dayCounts();

  const days = [];
  for (let day = store.localDate(), i = 0; i < DAYS_SHOWN; i++, day = store.prevDay(day)) days.unshift(day);

  root.replaceChildren();
  const add = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    root.appendChild(el);
    return el;
  };

  add('p', 'big', `${done} / ${total}`);
  const track = add('div', 'track');
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuenow', pct);
  track.setAttribute('aria-valuemin', 0);
  track.setAttribute('aria-valuemax', 100);
  const fill = document.createElement('div');
  fill.style.width = `${pct}%`;
  track.appendChild(fill);
  add('p', 'muted', `${pct}% done`);

  add('p', 'big', `${streak} day${streak === 1 ? '' : 's'}`);
  add('p', 'muted', 'current streak');

  const strip = add('div', 'strip');
  for (const day of days) {
    const cell = document.createElement('div');
    cell.className = counts[day] ? 'on' : '';
    cell.title = `${day}: ${counts[day] || 0} done`;
    strip.appendChild(cell);
  }
  add('p', 'muted', 'last 4 weeks, today at the end');
}
