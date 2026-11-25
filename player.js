// YouTube IFrame API wrapper. Cues videos (user taps play) and reports position every 5 s.
import { t } from './i18n.js';
let player;
let timer;
let onTick = () => {};
let onEnded = () => {};
let onError = () => {};
let resumeAt = 0;
let segment = null; // { start, end, checked, fired } while a reading video plays; null for a lecture
let loadedId = null; // the video last loaded or cued
// Whether the current video has played since it was loaded or cued. YouTube can report ENDED twice for one video
// (for example at a reading's endSeconds, then again once the lecture is cued after the last reading); only the first,
// after real playback, counts. Without this, the extra ENDED looked like the lecture ending and restarted the readings.
let playedSinceLoad = false;

const apiReady = () => new Promise((resolve, reject) => {
  if (window.YT && window.YT.Player) return resolve();
  window.onYouTubeIframeAPIReady = resolve;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => reject(new Error(t('playerLoadFailed')));
  document.head.appendChild(tag);
});

function tick() {
  // Only while playing/paused: a cued or loading player reports 0 and would wipe the saved position
  if (player && player.getPlayerState && [1, 2].includes(player.getPlayerState())) onTick(player.getCurrentTime());
}

function onStateChange(e) {
  const S = window.YT.PlayerState;
  if (e.data === S.PLAYING) {
    playedSinceLoad = true;
    // A reading video always starts at its passage's start. The player can ignore startSeconds (for example when
    // the same chapter video is loaded again, or a passage is tapped while it plays), so check once and seek.
    if (segment && !segment.checked) startAtPassage(segment);
    clearInterval(timer);
    timer = setInterval(tick, 5000);
  } else {
    clearInterval(timer);
    if (e.data === S.PAUSED) tick();
    // A reading video reloaded on the same chapter may not report PLAYING, so its end also counts once it has moved
    // past its start. After a cue (segment null, nothing played) an ENDED is a leftover and is ignored.
    if (e.data === S.ENDED && (playedSinceLoad || (segment && !segment.fired && player.getCurrentTime() > segment.start + 1))) {
      playedSinceLoad = false;
      segment = null;
      onEnded();
    }
    // Saved position at or past the end (video re-edited): restart from 0
    if (e.data === S.CUED && resumeAt && resumeAt >= player.getDuration() - 2) player.seekTo(0, true);
  }
}

// The end of a reading passage is watched here, not left to YouTube's endSeconds: at endSeconds YouTube pauses, and
// once the sound stops Android suspends the page (screen locked), so the next passage never started. Moving on while
// the sound is still playing keeps the page awake. A short timer is set when the end is near, for an exact stop.
let nearTimer;
function checkEnd() {
  const seg = segment;
  if (!seg || seg.end == null || seg.fired || !player || player.getPlayerState() !== 1) return;
  const left = seg.end - player.getCurrentTime();
  if (left <= 0.05) {
    seg.fired = true;
    playedSinceLoad = false;
    onEnded();
  } else if (left < 2.5) {
    clearTimeout(nearTimer);
    nearTimer = setTimeout(checkEnd, left * 1000);
  }
}

export async function mount(el, handlers) {
  ({ onTick, onEnded, onError } = handlers);
  await apiReady();
  await new Promise((resolve) => {
    player = new window.YT.Player(el, {
      width: '100%',
      height: '100%',
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => { setInterval(checkEnd, 250); resolve(); },
        onStateChange,
        onError: (e) => onError(e.data),
      },
    });
  });
}

export function cue(videoId, seconds) {
  clearTimeout(nearTimer);
  resumeAt = seconds;
  segment = null;
  loadedId = videoId;
  playedSinceLoad = false;
  player.cueVideoById({ videoId, startSeconds: seconds });
}

// Load and play a reading video now, from `start` seconds; at `end` seconds (watched in checkEnd) it reports the end.
// `stopAt` goes to YouTube as endSeconds, past the video's end: the player can keep a previous video's endSeconds when
// none is given, which cut chapters short.
export function load(videoId, start = 0, end, stopAt) {
  resumeAt = 0;
  clearTimeout(nearTimer);
  const seg = { start, end, checked: false, fired: false };
  segment = seg;
  const same = videoId === loadedId;
  loadedId = videoId;
  playedSinceLoad = false;
  player.loadVideoById({ videoId, startSeconds: start, endSeconds: stopAt });
  // Reloading the video that is already playing may not report PLAYING again, so check it directly too.
  if (same) setTimeout(() => { if (segment === seg) startAtPassage(seg); }, 600);
}

// The next passage is in the video that is playing now: seek there without reloading, so the sound never stops.
// False when that video isn't playing (then the caller loads it).
export function jump(videoId, start, end) {
  if (!player || videoId !== loadedId || ![1, 3].includes(player.getPlayerState())) return false;
  clearTimeout(nearTimer);
  segment = { start, end, checked: true, fired: false };
  playedSinceLoad = true;
  player.seekTo(start, true);
  return true;
}

function startAtPassage(seg) {
  seg.checked = true;
  if (Math.abs(player.getCurrentTime() - seg.start) > 2) player.seekTo(seg.start, true);
}

// Pause the lecture (used when read-aloud starts); the PAUSED state change saves the position
export function pause() { if (player && player.getPlayerState && player.getPlayerState() === 1) player.pauseVideo(); }

// Flush the position now (used on visibilitychange / pagehide)
export const flush = tick;
