# Read365 User Scenarios

Taking `lecture-companion-app-plan.md` and `PRD.md` as given, this document organizes the actual usage flows as scenarios. It contains nothing that conflicts with the PRD and does not cover its non-goals. If this document conflicts with the PRD, the PRD wins.

## 1. Overview

- **Purpose**: Baseline scenarios to verify step by step "in what order I actually use the app", as the basis for screen design and the manual test checklist.
- **Audience**: The solo developer (the author).
- **Authoring policy**: Single user, so one persona. Phases 1-3 are written in full; Phases 4-5 are written at outline level because their design depends on what Phase 1-3 use teaches (PRD Phases section).

## 2. Persona

| Name | Type | Needs |
|---|---|---|
| Sam | Android user, YouTube Premium subscriber, works through the 365 Bible reading lecture playlist daily | Resume the exact video and timestamp in one tap, keep Premium benefits (ad-free, screen-off play while driving), see the day's passage, track progress |

## 3. Core Scenarios

### 3.1 First Install and Premium Gate Test (Phase 1)

1. Sam opens the hosted app URL in Chrome (signed into the Premium Google account) and chooses "Install app / Add to Home screen".
2. Sam launches it from the home screen. It opens full screen on video 1 at 0:00.
3. Sam plays the video and checks that no ads appear in the embed.
4. Sam locks the screen. After a minute he checks whether audio is still playing.
5. If both checks pass, approach A is kept. If either fails, the app switches to approach B (scenario 3.6) and the result is recorded in the PRD.

### 3.2 Resume Where I Left Off (Phase 1)

1. Sam taps the app icon.
2. The app reads the saved state from local storage (last video, its saved timestamp).
3. The player loads that video and seeks to the saved timestamp. Sam taps play.
4. While playing, the app saves the current video and timestamp every 5 seconds. Pausing, switching tabs and closing also trigger a save.
5. Sam closes the app mid-video. The next launch resumes within a few seconds of where he stopped.

### 3.3 Finish a Video and Move On (Phase 1)

1. A video reaches its end.
2. The app marks it done, then loads the next video in playlist order at 0:00 (no autoplay beyond the player's own behavior; Sam taps play).
3. Sam can also tap Next / Previous at any time. Each video keeps its own saved timestamp, so going back resumes it where he left it.
4. Sam can mark a video done or not done manually from the playlist screen.

### 3.4 Pick a Specific Video (Phase 1)

1. Sam opens the playlist screen.
2. He scrolls to a video, sees its done mark and any saved position, and taps it.
3. The player opens that video at its saved timestamp (or 0:00 if none).

### 3.5 Open Today's Passage in YouVersion (Phase 2)

1. On the player screen, the video's passage label is shown (for example "John 3").
2. Sam taps "Open Bible". The app launches `youversion://bible?reference=JHN.3` in the chosen version.
3. If the YouVersion app is not installed or the link fails, the app shows a message and offers the web Bible URL instead.
4. Sam changes the Bible version (NIV, NASB, KJV, Korean versions) in settings. The choice is remembered.

### 3.6 Fallback Mode: Launcher (Approach B, only if the Phase 1 gate fails)

1. Sam taps the app icon. It shows the current video and the last known position.
2. Sam taps "Open in YouTube". The YouTube app opens the video at `&t=seconds`, where Premium works natively.
3. On return, Sam enters where he stopped (minutes:seconds) or just taps Done. The app saves it and picks the next video.

### 3.7 Check Progress (Phase 3)

1. Sam opens the progress screen.
2. It shows how many of the 370 videos are done, and the current streak of consecutive days with at least one video finished.
3. A video marked done on a given day counts toward that day.

### 3.8 Transcripts, Search and Notes (Phases 4-5, outline)

1. Sam opens a video's transcript (Korean, with English translation) beside the player and taps a line to seek.
2. Sam types a Bible reference in search and gets every lecture that mentions it.
3. Sam adds a note to a video or a timestamp and sees it later from the video or from search.
4. Sam attaches a frame screenshot at a timestamp to a transcript entry.

## 4. Exception / Edge Case Scenarios

| # | Situation | System handling | Basis |
|---|---|---|---|
| 1 | Opening the app offline | App shell loads from the service worker; player area shows "You're offline" | PRD Approach |
| 2 | A video has embedding disabled | Player shows a clear message and an "Open in YouTube" button | PRD Risks |
| 3 | A video was removed or made private | Player error shown; Sam can skip to the next video | PRD Risks |
| 4 | Local storage is cleared by the browser | App starts from video 1 at 0:00, no crash | PRD Approach |
| 5 | Saved timestamp is beyond the video length (video was re-edited) | Player clamps to the start | PRD Phase 1 |
| 6 | The first load of the YouTube player script fails | Error message with a retry button | PRD Risks |
| 7 | Android pauses playback when the screen locks | Recorded as a gate failure; approach B is used | PRD Phase 1 gate |
| 8 | The playlist has 370 videos but Sam expects day N = video N | Videos are shown by playlist position; the extras are labeled once identified | PRD Risks |
| 9 | YouVersion link does not resolve | Fall back to the web Bible link | Scenario 3.5 |
| 10 | Pressing Next on the last video | Stay on the last video; Next is disabled | PRD Phase 1 |

## 5. Change History

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | 2026-10-17 | Initial draft: overview, persona, 8 scenarios, 10 edge cases | Sam |
