import videos from './data/videos.js';
import * as store from './store.js';
import * as player from './player.js';
import readings from './data/readings.js';
import { VERSIONS, passageUrl } from './bible.js';
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

function renderPassages(video) {
  const box = $('passages');
  box.replaceChildren();
  for (const [label, ref] of readings[video.day] || []) {
    const a = document.createElement('a');
    a.className = 'chip';
    a.textContent = label;
    a.href = passageUrl(ref, store.bibleVersion());
    a.target = '_blank';
    a.rel = 'noopener';
    box.appendChild(a);
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
  if (view === 'playlistView') renderPlaylist($('list'), videos, store, (id) => { open(id); show('playerView'); });
}

$('prev').onclick = () => go(-1);
$('next').onclick = () => go(1);
$('done').onclick = () => { store.toggleDone(store.current()); refresh(); };
// Lock-screen controls: a silent looping <audio> keeps a media session alive so Android shows play/pause.
// Verified on Chrome (Galaxy S23); Samsung Internet behaves differently.
const keepAlive = new Audio('silence.wav');
keepAlive.loop = true;
let isPlaying = false;

function syncSession() {
  $('playPause').textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: videos[indexOf(store.current())].title, artist: 'Read365' });
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

function playNow() {
  keepAlive.play().catch(() => {});
  player.play();
  // If the video didn't actually start (blocked in the background), don't leave the silent loop pretending to play
  setTimeout(() => { if (!isPlaying) { keepAlive.pause(); syncSession(); } }, 3000);
}
function pauseNow() { player.pause(); }

$('playPause').onclick = () => (isPlaying ? pauseNow() : playNow());

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', playNow);
  ms.setActionHandler('pause', pauseNow);
  ms.setActionHandler('nexttrack', () => { go(1); playNow(); });
  ms.setActionHandler('previoustrack', () => { go(-1); playNow(); });
}

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
      onState: (code) => {
        // YT states: 1 playing, 0 ended, 2 paused, 5 cued. Buffering (3) and unstarted (-1) leave things as they are.
        if (code === 1) keepAlive.play().catch(() => {});
        else if (code === 0 || code === 2 || code === 5) keepAlive.pause();
        if (code === 1 || code === 0 || code === 2 || code === 5) isPlaying = code === 1;
        syncSession();
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
