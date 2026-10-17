# PRD — Lecture Companion App

*Personal project, single user. Draft 2026-10-17. Source: lecture-companion-app-plan.md.*

## Problem
Watching a fixed 370-video YouTube playlist (애실쌤과 365성경읽기) daily on an Android phone means searching for the right video and scrubbing to where I stopped. I also want Bible passages, notes, and searchable transcripts alongside the lectures.

## Goals
- Open the app and resume the exact video and timestamp in one tap.
- Keep YouTube Premium benefits (ad-free, background play while driving).
- Grow in phases; each phase is useful on its own.

## Non-goals
- Public release, accounts, or sync across users.
- Publishing transcripts or translations (personal use only).
- Native Android app, iOS support, YouTube Data API at runtime.
- Audible integration (no deep links exist).

## User
Me, on Android (Chrome), YouTube Premium subscriber, mostly mobile, sometimes driving with screen off.

## Approach
PWA: plain HTML/CSS/JS, manifest, minimal service worker, installed to the home screen. Video IDs hardcoded. State in local storage.

## Phases and requirements

### Phase 1 — Resume playback
- Hardcoded list of the playlist's video IDs and titles.
- Embedded YouTube IFrame player.
- Save current video index and timestamp every few seconds; reopening resumes there.
- Per-video saved position.
- Next / previous; mark video done.
- Installable (manifest + service worker).
- **Gate (phone test):** installed PWA, Chrome signed into Premium account. Pass = no ads in the embed AND playback continues with screen off.
- **Gate result (2026-10-17, Galaxy S23):** no ads in the embed. A manual screen lock stopped playback at first (the original build); after adding Media Session controls (v3), locking manually and pressing play on the lock screen works. Playback while the screen is on is unaffected; the 15 s auto-lock does not trigger while a video plays in Chrome. Result: pass via lock-screen play. Approach A (embedded player) is final; the "Open in YouTube app" and "Set position" buttons were removed. Chrome is the supported browser (Samsung Internet's lock-screen play behaves differently).
- **Fallback (approach B):** if the gate fails, the app is a tracker + launcher that opens the YouTube app at `&t=seconds`; timestamp entered by hand or progress tracked per day only.

### Phase 2 — YouVersion Bible links
- Map each day/video to its reading (from the Notion schedules in the playlist description): `tools/readings.tsv`.
- Many days are several passages (Psalms interleaved, Gospel harmonies), so each day shows one tappable chip per passage.
- Links are `https://www.bible.com/bible/{versionId}/{OSIS ref}`: opens the YouVersion app on Android if installed, else the web reader. (Chosen over the `youversion://` scheme because it carries the version and has a built-in fallback.)
- Version switcher in Settings: NIV (111), NASB (100), KJV (1), 개역한글 (88), 새번역 (142). 개역개정 is not offered by YouVersion.
- Passages starting mid-chapter open that verse (or verse range); cross-chapter passages open at the start.
- Notion lists Day 105 twice; the second entry (삼하 18~19장) is treated as Day 106.

### Phase 3 — Progress / streak
- Count of done videos out of 370.
- Consistency over time (streak).

### Phase 4 — Transcripts and translation
- Korean transcripts via `yt-dlp` subtitle tracks, stored locally.
- English translation of the transcripts.
- Cross-check biblical and personal names against the Korean; auto-captions on Korean religious content will be rough.

### Phase 5 — Search and notes
- Search by Bible reference: list every lecture that mentions it.
- Notes tied to a video or timestamp.
- Visual references: frame screenshot at a timestamp, attached to a transcript entry (last, depends on Phase 4).

## Success criteria
- Phase 1: from a cold start, one tap resumes within a few seconds of where I stopped.
- Phase 1 gate result recorded (pass, or switched to approach B).
- Each later phase: used in my daily routine for a week before starting the next.

## Risks and constraints
- Android may pause embedded players when the screen locks.
- Embedded players do not always get Premium benefits; an app cannot sign into YouTube for the embed.
- Videos with embedding disabled will not play in the embed (fallback: open in the YouTube app).
- Playlist has 370 videos, not 365; extras must be identified before assuming day N = video N.
- Notion schedule format is unverified; the day-to-passage mapping may need manual cleanup.
- Auto-caption quality for Korean may be poor or unavailable for some videos.

## Open items
- Extract the 370 IDs/titles and identify the 5 extras.
- Fetch the Notion schedules.
- Reference app and UI/accessibility session (keep simple).
- Bible link method (Phase 2).
