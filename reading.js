// Bible reading as YouTube videos, played in the lecture's own player. Two sources: 'ko', the 공동체성경읽기 chapter
// videos (개역개정), and 'esv', Crossway's ESV Bible Audio chapter videos. Each has its own checked verse times.
import koVideos from './data/reading-videos.js';
import koTimes from './data/verse-times.js';
import esvVideos from './data/reading-videos-esv.js';
import esvTimes from './data/verse-times-esv.js';
import { passageRange, loadChapter, verseTimes, measuredTimes } from './bible.js';

// bolls: the text used for an estimate where a time hasn't been checked
const SOURCES = { ko: { videos: koVideos, times: koTimes, bolls: 'KRV' }, esv: { videos: esvVideos, times: esvTimes, bolls: 'ESV' } };
const sourceOf = (source) => SOURCES[source] || SOURCES.ko;

// { id, duration } for a chapter, or null when there is no video for it
export function chapterVideo(usfm, chapter, source = 'ko') {
  const entry = (sourceOf(source).videos[usfm] || [])[chapter - 1];
  if (!entry) return null;
  const [id, seconds] = entry.split(':');
  return { id, duration: Number(seconds) };
}

// True when every chapter of every passage in a day's reading list has a video.
export function hasVideos(list, source = 'ko') {
  return list.length > 0 && list.every(([, ref, endChapter]) =>
    passageRange(ref, endChapter).segments.every((s) => chapterVideo(ref.split('.')[0], s.chapter, source)));
}

// The videos to play for a day's readings from passage `fromPassage` on, in order:
// [{ passage, label, chapter, id, duration, start, end }]. A passage that starts or stops mid-chapter gets estimated
// start/end seconds: measured where data/verse-times.js has the chapter, otherwise estimated (see verseTimes);
// if the chapter text for an estimate can't be fetched, the whole chapter plays.
// Resolves null when a chapter has no video.
export async function buildQueue(list, fromPassage = 0, source = 'ko') {
  if (!hasVideos(list, source)) return null;
  const src = sourceOf(source);
  const jobs = [];
  list.forEach(([label, ref, endChapter, endVerse], passage) => {
    if (passage < fromPassage) return;
    const usfm = ref.split('.')[0];
    for (const s of passageRange(ref, endChapter, endVerse).segments) {
      const video = chapterVideo(usfm, s.chapter, source);
      const whole = { passage, label, chapter: s.chapter, id: video.id, duration: video.duration, start: 0, end: undefined };
      if (s.from == null && s.to == null) { jobs.push(whole); continue; }
      const measured = src.times[`${usfm}.${s.chapter}`];
      const times = measured && measuredTimes(measured, s.from, s.to);
      if (times) { jobs.push({ ...whole, ...times }); continue; }
      jobs.push(loadChapter(src.bolls, usfm, s.chapter)
        .then((verses) => ({ ...whole, ...verseTimes(verses, video.duration, s.from, s.to) }))
        .catch(() => whole));
    }
  });
  return Promise.all(jobs);
}
