// Lines a chapter's verses up against a reading video's auto-generated transcript, to find when each verse starts.
// Used by tools/measure-verse-times (run in a browser on youtube.com, where the transcript panel can be read) and by
// its tests. Pure function, no I/O.
//
// verses:   [[verseNumber, text], ...] in order (any Korean translation; 개역한글 text works for 개역개정 audio)
// segments: [[seconds, text], ...] the transcript lines as YouTube shows them, in order. A line whose seconds
//           could not be read is [null, "M:SS ... text"] and is parsed here.
// duration: the video's length in seconds
// Returns   [startSecondsOfVerse1, startSecondsOfVerse2, ...], one decimal, increasing.

const HANGUL = /[가-힣]/;

function parseSegments(segments) {
  const out = [];
  for (let [t, text] of segments) {
    if (t == null) {
      const m = /^(\d+):(\d{2})\s+(?:\d+\s+\w+,?\s*)+(.*)$/.exec(text);
      if (!m) continue;
      t = Number(m[1]) * 60 + Number(m[2]);
      text = m[3];
    }
    out.push([t, text.replace(/\[[^\]]*\]/g, '')]); // drop [음악] and the like
  }
  return out;
}

export function alignVerses(verses, segments, duration) {
  // The transcript as one string of Hangul syllables, each with a time spread evenly across its line
  const segs = parseSegments(segments);
  const tChars = [];
  const tTimes = [];
  segs.forEach(([t, text], i) => {
    const next = i + 1 < segs.length ? segs[i + 1][0] : duration;
    const chars = [...text].filter((c) => HANGUL.test(c));
    // A line rarely lasts more than ~8 s of speech; a longer gap before the next line is music or silence
    const span = Math.min(Math.max(next - t, 0.5), chars.length * 0.35 + 1);
    chars.forEach((c, j) => { tChars.push(c); tTimes.push(t + (span * j) / chars.length); });
  });

  // The verses as one string, remembering where each verse starts
  const vChars = [];
  const vStart = [];
  for (const [, text] of verses) {
    vStart.push(vChars.length);
    for (const c of text) if (HANGUL.test(c)) vChars.push(c);
  }

  // Longest common subsequence between the two strings gives matched character pairs
  const n = vChars.length;
  const m = tChars.length;
  const W = m + 1;
  const dp = new Uint16Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * W + j] = vChars[i] === tChars[j]
        ? dp[(i + 1) * W + j + 1] + 1
        : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
    }
  }
  const timeAt = new Array(n).fill(null); // time of each verse character that was matched
  for (let i = 0, j = 0; i < n && j < m;) {
    if (vChars[i] === tChars[j]) { timeAt[i] = tTimes[j]; i++; j++; }
    else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) i++;
    else j++;
  }

  // Fill unmatched characters by interpolating between matched neighbours (by character position)
  const matched = [];
  timeAt.forEach((t, i) => { if (t != null) matched.push(i); });
  const first = segs.length ? segs[0][0] : 0;
  const at = (i) => {
    if (timeAt[i] != null) return timeAt[i];
    let lo = -1;
    let hi = -1;
    for (const k of matched) { if (k < i) lo = k; else { hi = k; break; } }
    const tLo = lo < 0 ? first : timeAt[lo];
    const tHi = hi < 0 ? duration : timeAt[hi];
    const iLo = lo < 0 ? 0 : lo;
    const iHi = hi < 0 ? n : hi;
    return tLo + ((tHi - tLo) * (i - iLo)) / Math.max(iHi - iLo, 1);
  };

  // A verse starts at its first character; a lone coincidental match is not trusted, so prefer the first
  // character that begins a run of 2 matches within the verse's first few characters.
  const starts = vStart.map((s, k) => {
    const end = k + 1 < vStart.length ? vStart[k + 1] : n;
    for (let i = s; i < Math.min(end - 1, s + 6); i++) {
      if (timeAt[i] != null && timeAt[i + 1] != null && timeAt[i + 1] - timeAt[i] < 1.5) {
        return Math.max(0, timeAt[i] - (i - s) * 0.25); // back up for the characters before it
      }
    }
    return at(s);
  });
  for (let k = 1; k < starts.length; k++) if (starts[k] < starts[k - 1]) starts[k] = starts[k - 1];
  return starts.map((t) => Math.round(t * 10) / 10);
}
