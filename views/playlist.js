// S2: scrolling list of all videos. Tap a row to open it; tap the mark to toggle done.
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function renderPlaylist(root, videos, store, onPick) {
  root.replaceChildren();
  videos.forEach((v, i) => {
    const row = document.createElement('li');
    const mark = document.createElement('button');
    mark.className = 'mark';
    mark.setAttribute('aria-label', 'Toggle done');
    mark.textContent = store.isDone(v.id) ? '✔' : '○';
    mark.onclick = () => { store.toggleDone(v.id); mark.textContent = store.isDone(v.id) ? '✔' : '○'; };

    const label = document.createElement('button');
    label.className = 'label' + (v.id === store.current() ? ' current' : '');
    const pos = store.position(v.id);
    label.textContent = `${i + 1}  ${v.title}` + (pos ? `  · ${fmt(pos)}` : '');
    label.onclick = () => onPick(v.id);

    row.append(mark, label);
    root.appendChild(row);
    if (v.id === store.current()) requestAnimationFrame(() => row.scrollIntoView({ block: 'center' }));
  });
}
