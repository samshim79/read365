# Lecture Companion App — Plan

*Personal project. Status: ready to build Phase 1. Last updated 2026-10-17. See PRD.md.*

## Goal
- Resume a fixed YouTube lecture playlist exactly where I left off, mainly on my phone, instead of searching every time.
- Build it myself for the satisfaction of it, without reinventing the wheel where an existing tool already fits (e.g. playlist.tools is a ready-made web player that remembers video and timestamp).
- I mostly watch on mobile (Android), so it must work well there.

## Playlist
- **애실쌤과 365성경읽기** by 생터성경사역원
- https://youtube.com/playlist?list=PLN0CvF5J-mpCg0_mjw8a0yT6LHErhrvxZ
- 370 videos (not 365; check the extras before assuming day 1 = video 1).
- The playlist description links to Notion pages with the Old/New Testament reading schedules. These may give the day-to-passage mapping.

## Core approach
- Playlist is fixed, so **hardcode the video IDs**; no YouTube Data API needed at runtime.
- Build as a **PWA**: plain HTML/CSS/JS plus a manifest and a minimal service worker, installed to the home screen.
- Save last video index and timestamp in local storage every few seconds; reopening resumes there.
- Native app development (Kotlin, Flutter, etc.) is a bigger lift and not needed.

## Features
1. **Resume tracking**: video plus timestamp, per video.
2. **YouVersion Bible links**: each lecture opens the matching passage.
   - URL scheme: `youversion://bible?reference=JHN.3` (OSIS book abbreviations; chapters and verse ranges work).
   - Bible version switcher: NIV, NASB, KJV, and Korean versions.
3. **Transcription pipeline**: Korean transcripts first (e.g. `yt-dlp` pulling subtitle tracks for the playlist), personal use only, never published.
4. **English translation**: translate the Korean transcripts, then cross-check biblical and personal names against the Korean before relying on them. Auto-captions on Korean religious content will be rough.
5. **Search by passage**: type a Bible reference and see every lecture that mentions it.
6. **Notes layer**: my own notes tied to a video or timestamp.
7. **Progress/streak tracker**: how many of the 370 are done, and consistency over time.
8. **Visual references**: screenshot the frame at the timestamp when she points at an image or graph, attached to the transcript entry.

## Phases (decided 2026-10-17)
1. **Resume playback**: embedded player, hardcoded IDs, video + timestamp in local storage, next/prev, mark done.
2. **YouVersion Bible links** (needs the Notion day-to-passage mapping).
3. **Progress / streak tracker.**
4. **Transcripts + English translation.**
5. **Search by passage + notes** (visual references last; they depend on transcripts).

## Playback decision (Phase 1 gate)
Premium (ad-free, background play while driving) is the priority.
- **A (try first):** embedded YouTube player in the installed PWA, Chrome signed into the Premium account. Exact timestamp tracking.
- **Test on phone:** (1) no ads in the embed, (2) playback continues with screen off.
- **B (fallback if either fails):** app becomes tracker + launcher that opens the YouTube app at `&t=seconds`, where Premium works natively. Timestamp is entered by hand, or progress is tracked per day only.
- **YouVersion integration:** test-first; decide the method in Phase 2.

**Gate result (2026-10-17, Galaxy S23):** no ads in the embed. Playback first stopped on manual screen lock; after adding Media Session lock-screen controls, locking manually and pressing play on the lock screen works. The 15 s auto-lock does not kick in while a video is playing in Chrome. The Media Session workaround later misbehaved and was rolled back to the plain Phase 1 player (no lock-screen controls). Approach A is final: the "Open in YouTube app" and "Set position" buttons were removed. Chrome is the supported browser; Samsung Internet's lock-screen play behaves differently.

## Account / login
- An app cannot sign into YouTube for the embed. Premium benefits depend on Chrome's own Google sign-in, so the "log in through the app" goal is replaced by the Phase 1 test above.

## Known limits
- Audible: no public deep link to a specific chapter or timestamp, so it is not feasible.
- iOS background playback is stricter than Android (not an issue here, since I'm on Android).
- Videos with embedding disabled won't play in an embedded player.

## UI / design (separate session)
- Keep it simple.
- Find a reference app whose look I like, then do a dedicated UI and accessibility session.

## Next steps
- ~~Pull the exact list of 370 video IDs and titles; check the extra 5 videos.~~ Done 2026-10-17 (`tools/playlist.tsv`, `tools/build-videos.py`). Playlist order is scrambled (e.g. Days 360-365 sit near position 186), so the app orders by day number. Extras (5, listed after Day 365): 2 intro lectures "365 성경읽기 OT 1강/2강", 2 untitled-day talks ("My Bible, Crumbling Like a Cracker", "A Bible that is difficult to read"), and a duplicate Day 222 upload.
- Phase 1 built; deploy to GitHub Pages and run the Premium / screen-off test on the phone.
- Fetch the Notion reading schedules and map days to YouVersion references (before Phase 2).
- UI design session (before or during Phase 1, keep it simple).
- Transcription and translation pipeline (Phase 4).
