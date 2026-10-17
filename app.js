import videos from './data/videos.js';
import * as store from './store.js';
import * as player from './player.js';
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

function refresh() {
  const id = store.current();
  const i = indexOf(id);
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
  for (const v of ['playerView', 'playlistView']) $(v).hidden = v !== view;
  $('navPlayer').classList.toggle('active', view === 'playerView');
  $('navPlaylist').classList.toggle('active', view === 'playlistView');
  if (view === 'playlistView') renderPlaylist($('list'), videos, store, (id) => { open(id); show('playerView'); });
}

$('prev').onclick = () => go(-1);
$('next').onclick = () => go(1);
$('done').onclick = () => { store.toggleDone(store.current()); refresh(); };
// Approach B: hand off to the YouTube app (Premium background play) at the saved position
$('ytOpen').onclick = () => {
  player.flush();
  player.pause();
  const id = store.current();
  $('ytOpen').href = `https://www.youtube.com/watch?v=${id}&t=${store.position(id)}s`;
};

// Accepts "m:ss", "h:mm:ss" or plain seconds
$('setPos').onclick = () => {
  const id = store.current();
  const raw = prompt('Stopped at (m:ss)', '');
  if (!raw) return;
  const seconds = raw.split(':').reduce((t, n) => t * 60 + Number(n), 0);
  if (!Number.isFinite(seconds) || seconds < 0) return showError('Enter the time like 12:34.');
  store.savePosition(id, seconds);
  open(id);
};

// Lock-screen controls: a silent looping <audio> keeps a media session alive so Android shows play/pause.
// ponytail: whether the YouTube embed keeps playing with the screen locked is untested; verify on the phone.
const keepAlive = new Audio('silence.wav');
keepAlive.loop = true;
let isPlaying = false;

function syncSession() {
  $('playPause').textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: videos[indexOf(store.current())].title, artist: 'Read365' });
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

function playNow() { keepAlive.play().catch(() => {}); player.play(); }
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
      onState: (playing) => { isPlaying = playing; if (playing) keepAlive.play().catch(() => {}); syncSession(); },
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
