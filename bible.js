// Bible text and links.
// Text comes from the open bolls.life API and is read inside the app (no embedded bible.com page, which went blank
// when the YouVersion app was already open). YouVersion links stay as an "open in app" fallback for versions bolls.life lacks.
// `bolls` is the bolls.life translation name; null = not available there, so only the YouVersion link is offered.
// (KRV, NIV, KJV were not checked against bolls.life's list from here; NASB is the least certain. A failed fetch shows the YouVersion link.)
// `yvAudio`: YouVersion has narrated audio for this version; 🎧 embeds its bible.com audio page in the pane.
export const VERSIONS = [
  { id: 111, name: 'NIV', bolls: 'NIV', lang: 'en-US', yvAudio: true },
  { id: 100, name: 'NASB', bolls: 'NASB', lang: 'en-US', yvAudio: true },
  { id: 1, name: 'KJV', bolls: 'KJV', lang: 'en-US', yvAudio: true },
  // World English Bible: public domain, with recorded per-chapter audio (see chapterAudioUrl). Recorded audio keeps
  // playing with the screen locked; text-to-speech does not. (YouVersion id 206 and the bolls name were not checked.)
  { id: 206, name: 'WEB (recorded audio)', bolls: 'WEB', lang: 'en-US', audio: true },
  { id: 88, name: '개역한글', bolls: 'KRV', lang: 'ko-KR' },
  { id: 142, name: '새번역', bolls: null, lang: 'ko-KR' },
  { id: 86, name: '현대인의성경', bolls: null, lang: 'ko-KR', yvAudio: true }, // has YouVersion audio (checked: NIV, NASB, KJV, 현대인의성경; not 개역한글/새번역)
];
export const versionById = (id) => VERSIONS.find((v) => v.id === id) || VERSIONS[0];

export const passageUrl = (ref, versionId) => `https://www.bible.com/bible/${versionId}/${ref}`;
// Audio pages are per chapter: GEN.8.1-3 -> GEN.8
export const audioUrl = (ref, versionId) => `https://www.bible.com/audio-bible/${versionId}/${ref.split('.').slice(0, 2).join('.')}`;

// bolls.life numbers the books 1-66 in the usual Protestant order.
const BOOKS = ('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN '
  + 'HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM '
  + 'HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV').split(' ');
export const bookNumber = (usfm) => BOOKS.indexOf(usfm) + 1;

// A reading [label, ref, endChapter, endVerse] -> { num, segments: [{ chapter, from, to }] }.
// from/to are verse numbers; null means "from the chapter's start" / "to the chapter's end".
export function passageRange(ref, endChapter = null, endVerse = null) {
  const [book, ch, spec] = ref.split('.');
  const num = bookNumber(book);
  if (!num) throw new Error(`unknown book in ${ref}`);
  const first = Number(ch);
  const [a, b] = spec ? spec.split('-').map(Number) : [null, null];
  let last = endChapter ?? first;
  let lastVerse = endVerse;
  if (endChapter == null && b != null) lastVerse = b; // GEN.8.1-3 (older data without end fields)
  if (last < first) last = first;
  const segments = [];
  for (let c = first; c <= last; c++) {
    segments.push({ chapter: c, from: c === first ? a : null, to: c === last ? lastVerse : null });
  }
  return { num, segments };
}

// Verse text from bolls.life is an HTML string (<i>, <br>, Strong's tags); keep plain text only.
export function plainText(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const cache = new Map(); // `${bolls}/${num}/${chapter}` -> verses; kept so flipping between chips doesn't refetch
async function chapterVerses(bolls, num, chapter) {
  const key = `${bolls}/${num}/${chapter}`;
  if (!cache.has(key)) {
    const res = await fetch(`https://bolls.life/get-text/${bolls}/${num}/${chapter}/`);
    if (!res.ok) throw new Error(`bolls.life ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) throw new Error('empty chapter');
    cache.set(key, rows.map((r) => ({ chapter, verse: r.verse, text: plainText(r.text) })));
  }
  return cache.get(key);
}

// Whole passage as [{ chapter, verse, text }, ...]; rejects if the text can't be fetched.
export async function loadPassage(bolls, ref, endChapter, endVerse) {
  const { num, segments } = passageRange(ref, endChapter, endVerse);
  const chapters = await Promise.all(segments.map((s) => chapterVerses(bolls, num, s.chapter)));
  return segments.flatMap((s, i) => chapters[i].filter((v) => (s.from == null || v.verse >= s.from) && (s.to == null || v.verse <= s.to)));
}

// Recorded audio: eBible.org's World English Bible (British Edition) set, one mp3 per chapter, free to download and use.
// File names look like eng-webbe_002_GEN_01.mp3 / eng-webbe_020_PSA_023.mp3 / eng-webbe_073_JHN_03.mp3:
// Old Testament books are numbered 002-040, New Testament 070-096; chapters are 2 digits (3 for Psalms).
export function chapterAudioUrl(usfm, chapter) {
  const n = bookNumber(usfm);
  if (!n) throw new Error(`unknown book ${usfm}`);
  const book = String(n <= 39 ? n + 1 : n + 30).padStart(3, '0');
  const ch = String(chapter).padStart(usfm === 'PSA' ? 3 : 2, '0');
  return `https://ebible.org/eng-webbe/mp3/eng-webbe_${book}_${usfm}_${ch}.mp3`;
}

// The chapters a passage touches, as [{ chapter, url }]. Audio is per chapter, so a mid-chapter passage plays whole chapters.
export function passageAudio(ref, endChapter = null) {
  const usfm = ref.split('.')[0];
  return passageRange(ref, endChapter).segments.map((s) => ({ chapter: s.chapter, url: chapterAudioUrl(usfm, s.chapter) }));
}
