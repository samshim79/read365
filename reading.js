// Bible reading as YouTube videos: the 공동체성경읽기 chapter videos (개역개정), played in the lecture's own player.
import videoMap from './data/reading-videos.js';
import verseTimesMap from './data/verse-times.js';
import { passageRange, loadChapter, verseTimes, measuredTimes } from './bible.js';

// { id, duration } for a chapter, or null when there is no video for it (the Old Testament isn't collected yet)
export function chapterVideo(usfm, chapter) {
  const entry = (videoMap[usfm] || [])[chapter - 1];
  if (!entry) return null;
  const [id, seconds] = entry.split(':');
  return { id, duration: Number(seconds) };
}

// True when every chapter of every passage in a day's reading list has a video.
export function hasVideos(list) {
  return list.length > 0 && list.every(([, ref, endChapter]) =>
    passageRange(ref, endChapter).segments.every((s) => chapterVideo(ref.split('.')[0], s.chapter)));
}

// The videos to play for a day's readings from passage `fromPassage` on, in order:
// [{ passage, label, chapter, id, duration, start, end }]. A passage that starts or stops mid-chapter gets estimated
// start/end seconds: measured where data/verse-times.js has the chapter, otherwise estimated (see verseTimes);
// if the chapter text for an estimate can't be fetched, the whole chapter plays.
// Resolves null when a chapter has no video.
export async function buildQueue(list, fromPassage = 0) {
  if (!hasVideos(list)) return null;
  const jobs = [];
  list.forEach(([label, ref, endChapter, endVerse], passage) => {
    if (passage < fromPassage) return;
    const usfm = ref.split('.')[0];
    for (const s of passageRange(ref, endChapter, endVerse).segments) {
      const video = chapterVideo(usfm, s.chapter);
      const whole = { passage, label, chapter: s.chapter, id: video.id, duration: video.duration, start: 0, end: undefined };
      if (s.from == null && s.to == null) { jobs.push(whole); continue; }
      const measured = verseTimesMap[`${usfm}.${s.chapter}`];
      if (measured) { jobs.push({ ...whole, ...measuredTimes(measured, s.from, s.to) }); continue; }
      jobs.push(loadChapter('KRV', usfm, s.chapter)
        .then((verses) => ({ ...whole, ...verseTimes(verses, video.duration, s.from, s.to) }))
        .catch(() => whole));
    }
  });
  return Promise.all(jobs);
}
