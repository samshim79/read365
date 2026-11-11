// In-app Bible reader: shows a passage's text and reads it aloud, with recorded audio when the version has it
// (keeps playing with the screen locked) and otherwise the phone's built-in text-to-speech (stops on lock).
import { loadPassage } from './bible.js';

export const canSpeak = typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

let box = null;
let verses = [];   // [{ chapter, verse, text }]
let nodes = [];    // matching <p> elements
let heads = {};    // chapter -> its <h3>
let tracks = [];   // recorded audio for this passage: [{ chapter, url }]; empty = use text-to-speech
let title = '';
let audio = null;  // one <audio> element, reused for every chapter so playback carries on in the background
let lang = 'en-US';
let token = 0;     // bumped on every new passage and every stop; older speech/fetch callbacks see a stale token and quit
let playing = false;
let onState = () => {};
let beforeSpeak = () => {};
let onFinished = () => {};

export function setStateListener(fn) { onState = fn; }
export function setFinishedListener(fn) { onFinished = fn; } // runs when a passage is read to its end (not when stopped)
export function setBeforeSpeak(fn) { beforeSpeak = fn; } // runs when read-aloud starts, e.g. to pause the lecture
export const isPlaying = () => playing;

function setPlaying(v) { if (playing !== v) { playing = v; onState(v); } }

export function stop() {
  token++;
  if (canSpeak) speechSynthesis.cancel();
  if (audio) audio.pause();
  nodes.forEach((n) => n.classList.remove('now'));
  Object.values(heads).forEach((h) => h.classList.remove('now'));
  setPlaying(false);
}

function message(text, link) {
  box.replaceChildren();
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = text + ' ';
  if (link) {
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Open in YouVersion';
    p.appendChild(a);
  }
  box.appendChild(p);
}

// opts: { el, bolls, ref, endChapter, endVerse, lang, fallbackUrl, tracks, title }.
// Resolves true when there is something to read aloud: the text is showing, or recorded audio exists.
export async function show(opts) {
  stop();
  box = opts.el;
  lang = opts.lang;
  box.lang = lang.slice(0, 2);
  verses = [];
  nodes = [];
  heads = {};
  tracks = opts.tracks || [];
  title = opts.title || '';
  const mine = token;
  if (!opts.bolls) { message('This version has no open text source.', opts.fallbackUrl); return tracks.length > 0; }
  message('Loading…');
  try {
    const list = await loadPassage(opts.bolls, opts.ref, opts.endChapter, opts.endVerse);
    if (mine !== token) return false; // a newer passage was picked while this one loaded
    if (!list.length) throw new Error('no verses');
    verses = list;
    box.replaceChildren();
    let lastChapter = null;
    nodes = list.map((v, i) => {
      if (v.chapter !== lastChapter) {
        lastChapter = v.chapter;
        const h = document.createElement('h3');
        h.textContent = lang === 'ko-KR' ? `${v.chapter}장` : `Chapter ${v.chapter}`;
        heads[v.chapter] = h;
        box.appendChild(h);
      }
      const p = document.createElement('p');
      p.className = 'verse';
      const n = document.createElement('sup');
      n.textContent = v.verse;
      p.append(n, ' ', v.text);
      if (canSpeak || tracks.length) p.onclick = () => speak(i); // tap a verse to read from there (recorded audio: from its chapter)
      box.appendChild(p);
      return p;
    });
    box.scrollTop = 0;
    return true;
  } catch (e) {
    if (mine !== token) return false;
    message(tracks.length ? "Couldn't load the text. The audio still plays." : "Couldn't load the text.", opts.fallbackUrl);
    return tracks.length > 0;
  }
}

// Recorded audio, one file per chapter, starting at tracks[k]. A real media element, so it keeps playing on the lock screen.
function playTracks(k) {
  beforeSpeak();
  stop();
  const mine = token;
  if (!audio) audio = new Audio();
  setPlaying(true);
  const next = (i) => {
    if (mine !== token) return;
    Object.values(heads).forEach((h) => h.classList.remove('now'));
    if (i >= tracks.length) { setPlaying(false); onFinished(); return; }
    const head = heads[tracks[i].chapter];
    if (head) { head.classList.add('now'); head.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({ title: `${title} · ${tracks[i].chapter}`, artist: 'World English Bible', album: 'read365' });
    }
    audio.onended = () => next(i + 1);
    audio.onerror = () => { if (mine === token) stop(); };
    audio.src = tracks[i].url;
    audio.play().catch(() => { if (mine === token) stop(); }); // blocked or failed to load
  };
  next(k);
}

// Read verse by verse (short utterances are more reliable on Android than one long one).
export function speak(from = 0) {
  if (tracks.length) {
    const k = verses[from] ? tracks.findIndex((t) => t.chapter === verses[from].chapter) : 0;
    playTracks(Math.max(k, 0));
    return;
  }
  if (!canSpeak || !verses.length) return;
  beforeSpeak();
  stop();
  const mine = token;
  setPlaying(true);
  const next = (i) => {
    if (mine !== token) return;
    if (i >= verses.length) { setPlaying(false); nodes.forEach((n) => n.classList.remove('now')); onFinished(); return; }
    nodes.forEach((n, k) => n.classList.toggle('now', k === i));
    nodes[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
    const u = new SpeechSynthesisUtterance(verses[i].text);
    u.lang = lang;
    u.onend = () => next(i + 1);
    u.onerror = (e) => { if (mine === token && e.error !== 'interrupted' && e.error !== 'canceled') { stop(); } };
    speechSynthesis.speak(u);
  };
  next(from);
}

export function toggle() { if (playing) stop(); else speak(0); }
