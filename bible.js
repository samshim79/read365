// YouVersion links. bible.com URLs open the YouVersion app on Android when installed, else the web reader.
export const VERSIONS = [
  { id: 111, name: 'NIV' },
  { id: 100, name: 'NASB' },
  { id: 1, name: 'KJV' },
  { id: 88, name: '개역한글' },
  { id: 142, name: '새번역' },
  { id: 86, name: '현대인의성경' }, // the Korean version here with audio (checked: NIV, NASB, KJV, 현대인의성경; not 개역한글/새번역)
];

export const passageUrl = (ref, versionId) => `https://www.bible.com/bible/${versionId}/${ref}`;
// Audio pages are per chapter: GEN.8.1-3 -> GEN.8
export const audioUrl = (ref, versionId) => `https://www.bible.com/audio-bible/${versionId}/${ref.split('.').slice(0, 2).join('.')}`;
