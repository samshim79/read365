import videos from './data/videos.js';
import * as store from './store.js';
import * as player from './player.js';
import readings from './data/readings.js';
import { VERSIONS, versionById, passageUrl, audioUrl, passageAudio } from './bible.js';
import * as reader from './reader.js';
import { renderPlaylist } from './views/playlist.js';
import { renderProgress } from './views/progress.js';

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
let loadedKey = null; // what the pane currently shows, so unrelated refreshes (Mark done) don't reload it or stop read-aloud
let speakChip = null;
let advanceAfterReading = false; // set when the lecture ends: read the day's passages, then move on to the next lecture
let autoSpeak = false; // set when read-aloud moves on to the next passage by itself, so it keeps reading once that text loads

function paintSpeakChip() {
  if (!speakChip) return;
  const on = reader.isPlaying();
  speakChip.textContent = on ? '⏹' : '🔊';
  speakChip.setAttribute('aria-label', on ? 'Stop reading' : 'Read aloud');
  speakChip.classList.toggle('active', on);
}
reader.setStateListener(paintSpeakChip);
reader.setBeforeSpeak(() => player.pause()); // don't talk over the lecture
// A day can have several passages (e.g. day 288 has four): when one finishes, carry on with the next chip.
reader.setFinishedListener(() => {
  const video = videos[indexOf(store.current())];
  if (shownIdx < (readings[video.day] || []).length - 1) { shownIdx++; autoSpeak = true; renderPassages(video); }
  else if (advanceAfterReading) { advanceAfterReading = false; go(1); }
});

function renderPassages(video) {
  if (shownVideo !== video.id) { shownVideo = video.id; shownIdx = 0; }
  const box = $('passages'); // one row of passage chips under the title
  const tools = $('tools');  // 🔊 and ↗, on the title row at the right
  const list = readings[video.day] || [];
  const version = versionById(store.bibleVersion());
  box.replaceChildren();
  tools.replaceChildren();
  speakChip = null;
  list.forEach(([label, ref], i) => {
    const a = document.createElement('a');
    a.className = 'chip' + (i === shownIdx ? ' active' : '');
    a.textContent = label;
    a.href = passageUrl(ref, version.id); // fallback: opens YouVersion in a new tab if scripting fails
    a.onclick = (e) => { e.preventDefault(); advanceAfterReading = false; shownIdx = i; renderPassages(video); };
    box.appendChild(a);
  });
  const active = box.querySelector('.chip.active'); // the row scrolls sideways when a day has many passages
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('bibleWrap').hidden = !list.length;
  if (!list.length) { reader.stop(); loadedKey = null; return; }
  const [label, ref, endChapter, endVerse] = list[shownIdx];
  // Listen mode: YouVersion's narrated audio page (bible.com) in the pane, for versions that have it.
  const listening = store.listen() && !!version.yvAudio;
  const frame = $('bible');
  frame.hidden = !listening;
  $('reader').hidden = listening;
  if (version.yvAudio) {
    const ear = document.createElement('a');
    ear.className = 'chip toggle' + (listening ? ' active' : '');
    ear.textContent = '🎧';
    ear.setAttribute('aria-label', listening ? 'Back to the text' : 'Listen on YouVersion');
    ear.href = '#';
    ear.onclick = (e) => { e.preventDefault(); advanceAfterReading = false; store.setListen(!listening); renderPassages(video); };
    tools.appendChild(ear);
  }
  if (listening) {
    reader.stop();
    loadedKey = null; // so the text reloads when Listen is turned off
    const url = audioUrl(ref, version.id);
    if (frame.dataset.url !== url) { frame.dataset.url = url; frame.src = url; }
  } else if (frame.dataset.url) {
    delete frame.dataset.url;
    frame.src = 'about:blank'; // stops the narration
  }
  const tracks = version.audio ? passageAudio(ref, endChapter) : []; // recorded audio plays on the lock screen; text-to-speech doesn't
  if (!listening && (tracks.length || (reader.canSpeak && version.bolls))) {
    speakChip = document.createElement('a');
    speakChip.className = 'chip toggle';
    speakChip.href = '#';
    speakChip.onclick = (e) => {
      e.preventDefault();
      if (reader.isPlaying()) advanceAfterReading = false; // stopped by hand: stay on this lecture
      reader.toggle();
    };
    tools.appendChild(speakChip);
    paintSpeakChip();
  }
  const yv = document.createElement('a');
  yv.className = 'chip';
  yv.textContent = '↗';
  yv.setAttribute('aria-label', 'Open in YouVersion');
  yv.href = passageUrl(ref, version.id);
  yv.target = '_blank';
  yv.rel = 'noopener';
  tools.appendChild(yv);
  const key = `${video.id}|${shownIdx}|${version.id}`;
  if (!listening && key !== loadedKey) {
    loadedKey = key;
    const resume = autoSpeak;
    autoSpeak = false;
    reader.show({ el: $('reader'), bolls: version.bolls, ref, endChapter, endVerse, lang: version.lang, fallbackUrl: passageUrl(ref, version.id), tracks, title: label })
      .then((ok) => {
        if (ok) { if (resume) reader.speak(0); }
        else if (advanceAfterReading) { advanceAfterReading = false; go(1); } // the text didn't load: move on as before
      });
  }
}

// The lecture ended: read all of today's passages aloud from the first one. False if there is nothing to read.
function readDay(video) {
  const list = readings[video.day] || [];
  const version = versionById(store.bibleVersion());
  if (store.listen() && version.yvAudio) return list.length > 0; // Listen mode: stay on this lecture so the narration can be played
  if (!list.length || !(version.audio || (reader.canSpeak && version.bolls))) return false;
  advanceAfterReading = true;
  autoSpeak = true;
  shownIdx = 0;
  loadedKey = null; // reload so the first passage starts from the top
  renderPassages(video);
  return true;
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
  advanceAfterReading = false;
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
  for (const v of ['playerView', 'playlistView', 'progressView', 'settingsView']) $(v).hidden = v !== view;
  $('navPlayer').classList.toggle('active', view === 'playerView');
  $('navPlaylist').classList.toggle('active', view === 'playlistView');
  $('navProgress').classList.toggle('active', view === 'progressView');
  if (view === 'progressView') renderProgress($('progress'), store, videos.length);
  $('navSettings').classList.toggle('active', view === 'settingsView');
  if (view === 'playlistView') renderPlaylist($('list'), videos, store, (id) => { open(id); show('playerView'); }, refresh);
}

$('prev').onclick = () => go(-1);
$('next').onclick = () => go(1);
$('done').onclick = () => { store.toggleDone(store.current()); refresh(); };
$('navPlayer').onclick = () => show('playerView');
$('navPlaylist').onclick = () => show('playlistView');
$('navProgress').onclick = () => show('progressView');
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
        refresh();
        if (!readDay(videos[indexOf(id)])) go(1);
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
