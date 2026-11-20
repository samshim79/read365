// YouTube IFrame API wrapper. Cues videos (user taps play) and reports position every 5 s.
let player;
let timer;
let onTick = () => {};
let onEnded = () => {};
let onError = () => {};
let resumeAt = 0;
let segment = null; // { start, end, checked } while a reading video plays; null for a lecture

const apiReady = () => new Promise((resolve, reject) => {
  if (window.YT && window.YT.Player) return resolve();
  window.onYouTubeIframeAPIReady = resolve;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => reject(new Error('Could not load the YouTube player. Check your connection.'));
  document.head.appendChild(tag);
});

function tick() {
  // Only while playing/paused: a cued or loading player reports 0 and would wipe the saved position
  if (player && player.getPlayerState && [1, 2].includes(player.getPlayerState())) onTick(player.getCurrentTime());
}

function onStateChange(e) {
  const S = window.YT.PlayerState;
  if (e.data === S.PLAYING) {
    // A reading video must start at its passage. The player can ignore startSeconds (for example when the same
    // chapter video is loaded again for the next passage), so check once and seek if it started elsewhere.
    if (segment && !segment.checked) {
      segment.checked = true;
      const t = player.getCurrentTime();
      if (t < segment.start - 2 || t > segment.end) player.seekTo(segment.start, true);
    }
    clearInterval(timer);
    timer = setInterval(tick, 5000);
  } else {
    clearInterval(timer);
    if (e.data === S.PAUSED) tick();
    if (e.data === S.ENDED) onEnded();
    // Saved position at or past the end (video re-edited): restart from 0
    if (e.data === S.CUED && resumeAt && resumeAt >= player.getDuration() - 2) player.seekTo(0, true);
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
        onReady: resolve,
        onStateChange,
        onError: (e) => onError(e.data),
      },
    });
  });
}

export function cue(videoId, seconds) {
  resumeAt = seconds;
  segment = null;
  player.cueVideoById({ videoId, startSeconds: seconds });
}

// Load and play a reading video now, from `start` seconds to `end` seconds, where it reports ENDED.
export function load(videoId, start = 0, end) {
  resumeAt = 0;
  segment = { start, end, checked: false };
  player.loadVideoById({ videoId, startSeconds: start, endSeconds: end });
}

// Pause the lecture (used when read-aloud starts); the PAUSED state change saves the position
export function pause() { if (player && player.getPlayerState && player.getPlayerState() === 1) player.pauseVideo(); }

// Flush the position now (used on visibilitychange / pagehide)
export const flush = tick;
