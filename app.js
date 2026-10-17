import videos from './data/videos.js';
import * as store from './store.js';
import * as player from './player.js';
import readings from './data/readings.js';
import { VERSIONS, passageUrl, audioUrl } from './bible.js';
import { renderPlaylist } from './views/playlist.js';

const $ = (id) => document.getElementById(id);
const indexOf = (id) => videos.findIndex((v) => v.id === id);

store.load(videos[0].id);
if (indexOf(store.current()) < 0) store.setCurrent(videos[0].id);

function showError(msg, id) {
  const box = $('error');
  box.textContent = msg + ' ';
  if (id) {
    const a = document.createElement('a');
    a.href = `https://www.youtube.com/watch?v=${id}&t=${store.position(id)}s`;
    a.textContent = 'Open in YouTube';
    box.appendChild(a);
  }
  box.hidden = false;
}

// Chips pick which passage the Bible pane shows; the first passage of a new video loads automatically.
let shownVideo = null;
let shownIdx = 0;
let listening = false; // Listen swaps the pane to bible.com's audio page so playback stays inside the app

function renderPassages(video) {
  if (shownVideo !== video.id) { shownVideo = video.id; shownIdx = 0; }
  const box = $('passages');
  const frame = $('bible');
  const list = readings[video.day] || [];
  box.replaceChildren();
  list.forEach(([label, ref], i) => {
    const a = document.createElement('a');
    a.className = 'chip' + (i === shownIdx ? ' active' : '');
    a.textContent = label;
    a.href = passageUrl(ref, store.bibleVersion()); // fallback: opens in a new tab if scripting fails
    a.onclick = (e) => { e.preventDefault(); shownIdx = i; renderPassages(video); };
    box.appendChild(a);
  });
  if (list.length) {
    const toggle = document.createElement('a');
    toggle.className = 'chip toggle' + (listening ? ' active' : '');
    toggle.textContent = listening ? '📖' : '🔊';
    toggle.setAttribute('aria-label', listening ? 'Read' : 'Listen');
    toggle.href = '#';
    toggle.onclick = (e) => { e.preventDefault(); listening = !listening; renderPassages(video); };
    box.appendChild(toggle);
  }
  $('bibleWrap').hidden = !list.length;
  $('bibleWrap').classList.toggle('listen', listening);
  if (list.length) {
    const url = (listening ? audioUrl : passageUrl)(list[shownIdx][1], store.bibleVersion());
    if (frame.src !== url) frame.src = url;
  }
}

function refresh() {
  const id = store.current();
  const i = indexOf(id);
  renderPassages(videos[i]);
  $('where').textContent = `${videos[i].title} · ${i + 1} / ${videos.length}`;
  $('prev').disabled = i === 0;
  $('next').disabled = i === videos.length - 1;
  $('done').textContent = store.isDone(id) ? '✔ Done' : 'Mark done';
  $('done').classList.toggle('on', store.isDone(id));
  $('doneCount').textContent = `${store.doneCount()} / ${videos.length} done`;
}

function open(id) {
  store.setCurrent(id);
  $('error').hidden = true;
  player.cue(id, store.position(id));
  refresh();
}

function go(delta) {
  const i = indexOf(store.current()) + delta;
  if (i >= 0 && i < videos.length) open(videos[i].id);
}

function show(view) {
  for (const v of ['playerView', 'playlistView', 'settingsView']) $(v).hidden = v !== view;
  $('navPlayer').classList.toggle('active', view === 'playerView');
  $('navPlaylist').classList.toggle('active', view === 'playlistView');
  $('navSettings').classList.toggle('active', view === 'settingsView');
  if (view === 'playlistView') renderPlaylist($('list'), videos, store, (id) => { open(id); show('playerView'); }, refresh);
}

$('prev').onclick = () => go(-1);
$('next').onclick = () => go(1);
$('done').onclick = () => { store.toggleDone(store.current()); refresh(); };
$('navPlayer').onclick = () => show('playerView');
$('navPlaylist').onclick = () => show('playlistView');
$('navSettings').onclick = () => show('settingsView');

for (const v of VERSIONS) $('version').add(new Option(v.name, v.id, false, v.id === store.bibleVersion()));
$('version').onchange = (e) => { store.setBibleVersion(Number(e.target.value)); refresh(); };

function flush() { player.flush(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
addEventListener('pagehide', flush);

async function start() {
  $('retry').hidden = true;
  try {
    await player.mount($('yt'), {
      onTick: (t) => store.savePosition(store.current(), t),
      onEnded: () => {
        const id = store.current();
        store.savePosition(id, 0);
        if (!store.isDone(id)) store.toggleDone(id);
        go(1);
      },
      onError: (code) => showError(
        code === 100 ? 'This video was removed or is private.' : "This video can't be played in the app.",
        store.current(),
      ),
    });
    open(store.current());
  } catch (e) {
    showError(e.message);
    $('retry').hidden = false;
  }
}
$('retry').onclick = start;

refresh();
start();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
