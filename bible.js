// YouVersion links. bible.com URLs open the YouVersion app on Android when installed, else the web reader.
export const VERSIONS = [
  { id: 111, name: 'NIV' },
  { id: 100, name: 'NASB' },
  { id: 1, name: 'KJV' },
  { id: 88, name: '개역한글' },
  { id: 142, name: '새번역' },
];

export const passageUrl = (ref, versionId) => `https://www.bible.com/bible/${versionId}/${ref}`;
