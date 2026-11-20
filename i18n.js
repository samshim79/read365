// Interface text in English and Korean. The language is a Settings choice (store.language()); the Bible text itself
// follows the Bible version, not this setting.
import * as store from './store.js';

const S = {
  en: {
    loading: 'Loading...',
    retry: 'Retry',
    prev: '◀ Prev',
    next: 'Next ▶',
    markDone: 'Mark done',
    done: '✔ Done',
    navPlayer: 'Player',
    navPlaylist: 'Playlist',
    navProgress: 'Progress',
    navSettings: 'Settings',
    playlist: 'Playlist',
    progress: 'Progress',
    settings: 'Settings',
    language: 'Language',
    readingMode: 'Bible reading - video',
    modeVideos: 'Play the reading videos – 개역개정 (YouTube)',
    modeVideosEsv: 'Play the reading videos – ESV (YouTube)',
    modeBible: 'Open the reading in the Bible app',
    bibleVersion: 'Bible version',
    versionNote: 'The 개역개정 reading videos are in Korean, so the text is 개역한글. To use another version, choose “Open the reading in the Bible app”.',
    versionNoteEsv: 'The ESV reading videos go with the ESV text. To use another version, choose “Open the reading in the Bible app”.',
    day: (n) => `Day ${n}`,
    doneCount: (n, total) => `${n} / ${total} done`,
    readingNow: (label, i, n) => `Reading ${label} · ${i} / ${n}`,
    openInYouTube: 'Open in YouTube',
    openInYouVersion: 'Open in YouVersion',
    openInBibleApp: (label) => `Open ${label} in the Bible app ↗`,
    videoRemoved: 'This video was removed or is private.',
    videoBlocked: "This video can't be played in the app.",
    playerLoadFailed: 'Could not load the YouTube player. Check your connection.',
    readAloud: 'Read aloud',
    stopReading: 'Stop reading',
    playVideos: 'Play the reading videos',
    stopVideos: 'Stop the reading videos',
    listen: 'Listen on YouVersion',
    backToText: 'Back to the text',
    noTextSource: 'This version has no open text source.',
    textFailed: "Couldn't load the text.",
    textFailedAudio: "Couldn't load the text. The audio still plays.",
    toggleDone: 'Toggle done',
    pctDone: (p) => `${p}% done`,
    streakDays: (n) => `${n} day${n === 1 ? '' : 's'}`,
    currentStreak: 'current streak',
    dayDone: (day, n) => `${day}: ${n} done`,
    last4Weeks: 'last 4 weeks, today at the end',
  },
  ko: {
    loading: '불러오는 중...',
    retry: '다시 시도',
    prev: '◀ 이전',
    next: '다음 ▶',
    markDone: '완료',
    done: '✔ 완료됨',
    navPlayer: '성경읽기',
    navPlaylist: '목록',
    navProgress: '진행',
    navSettings: '설정',
    playlist: '목록',
    progress: '진행',
    settings: '설정',
    language: '언어',
    readingMode: '성경 읽기 - 영상',
    modeVideos: '성경 읽기 영상 – 개역개정 (YouTube)',
    modeVideosEsv: '성경 읽기 영상 – ESV (YouTube)',
    modeBible: '성경 앱에서 열기',
    bibleVersion: '성경 번역본',
    versionNote: '개역개정 성경 읽기 영상이 한국어라서 본문은 개역한글로 보입니다. 다른 번역본을 쓰려면 “성경 앱에서 열기”를 선택하세요.',
    versionNoteEsv: 'ESV 성경 읽기 영상에는 ESV 본문이 함께 보입니다. 다른 번역본을 쓰려면 “성경 앱에서 열기”를 선택하세요.',
    day: (n) => `${n}일차`,
    doneCount: (n, total) => `${n} / ${total} 완료`,
    readingNow: (label, i, n) => `${label} 읽는 중 · ${i} / ${n}`,
    openInYouTube: 'YouTube에서 열기',
    openInYouVersion: 'YouVersion에서 열기',
    openInBibleApp: (label) => `성경 앱에서 ${label} 열기 ↗`,
    videoRemoved: '삭제되었거나 비공개인 영상입니다.',
    videoBlocked: '앱에서 재생할 수 없는 영상입니다.',
    playerLoadFailed: 'YouTube 플레이어를 불러오지 못했습니다. 인터넷 연결을 확인하세요.',
    readAloud: '소리 내어 읽기',
    stopReading: '읽기 멈춤',
    playVideos: '성경 읽기 영상 재생',
    stopVideos: '성경 읽기 영상 멈춤',
    listen: 'YouVersion에서 듣기',
    backToText: '본문으로 돌아가기',
    noTextSource: '이 번역본은 앱에서 본문을 볼 수 없습니다.',
    textFailed: '본문을 불러오지 못했습니다.',
    textFailedAudio: '본문을 불러오지 못했습니다. 오디오는 계속 재생됩니다.',
    toggleDone: '완료 표시',
    pctDone: (p) => `${p}% 완료`,
    streakDays: (n) => `${n}일`,
    currentStreak: '연속 기록',
    dayDone: (day, n) => `${day}: ${n}개 완료`,
    last4Weeks: '최근 4주 (맨 끝이 오늘)',
  },
};

export const LANGUAGES = [['ko', '한국어'], ['en', 'English']];

// t('prev') or t('doneCount', 3, 365): the current language's text, falling back to English.
export function t(key, ...args) {
  const v = (S[store.language()] || S.en)[key] ?? S.en[key];
  return typeof v === 'function' ? v(...args) : v;
}

// Video titles in the data are "Day N"; show them in the current language.
export const videoTitle = (title) => {
  const m = /^Day (\d+)$/.exec(title);
  return m ? t('day', Number(m[1])) : title;
};

// Fills every element marked data-i18n="key" (its text) or data-i18n-label="key" (its aria-label).
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  document.documentElement.lang = store.language();
}
