// In-app Bible reader: shows a passage's text and reads it aloud with the phone's built-in text-to-speech.
import { loadPassage } from './bible.js';

export const canSpeak = typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

let box = null;
let verses = [];   // [{ chapter, verse, text }]
let nodes = [];    // matching <p> elements
let lang = 'en-US';
let token = 0;     // bumped on every new passage and every stop; older speech/fetch callbacks see a stale token and quit
let playing = false;
let onState = () => {};
let beforeSpeak = () => {};

export function setStateListener(fn) { onState = fn; }
export function setBeforeSpeak(fn) { beforeSpeak = fn; } // runs when read-aloud starts, e.g. to pause the lecture
export const isPlaying = () => playing;

function setPlaying(v) { if (playing !== v) { playing = v; onState(v); } }

export function stop() {
  token++;
  if (canSpeak) speechSynthesis.cancel();
  nodes.forEach((n) => n.classList.remove('now'));
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

// opts: { el, bolls, ref, endChapter, endVerse, lang, fallbackUrl }. Resolves true when the text is showing.
export async function show(opts) {
  stop();
  box = opts.el;
  lang = opts.lang;
  box.lang = lang.slice(0, 2);
  verses = [];
  nodes = [];
  const mine = token;
  if (!opts.bolls) { message('This version has no open text source.', opts.fallbackUrl); return false; }
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
        box.appendChild(h);
      }
      const p = document.createElement('p');
      p.className = 'verse';
      const n = document.createElement('sup');
      n.textContent = v.verse;
      p.append(n, ' ', v.text);
      if (canSpeak) p.onclick = () => speak(i); // tap a verse to read from there
      box.appendChild(p);
      return p;
    });
    box.scrollTop = 0;
    return true;
  } catch (e) {
    if (mine === token) message("Couldn't load the text.", opts.fallbackUrl);
    return false;
  }
}

// Read verse by verse (short utterances are more reliable on Android than one long one).
export function speak(from = 0) {
  if (!canSpeak || !verses.length) return;
  beforeSpeak();
  stop();
  const mine = token;
  setPlaying(true);
  const next = (i) => {
    if (mine !== token) return;
    if (i >= verses.length) { setPlaying(false); nodes.forEach((n) => n.classList.remove('now')); return; }
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
