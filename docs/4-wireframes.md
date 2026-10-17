# Read365 Wireframes

Screen design written on the premise of `PRD.md` and `3-user-scenario.md`. It contains nothing that conflicts with them and does not cover non-goals. Precedence: PRD > User Scenarios > this document.

## 1. Overview

- **Purpose**: Make the Phase 1-3 requirements concrete at the level of screens, as the basis for the front-end build. Phases 4-5 screens are sketched only.
- **Audience**: The solo developer. A self-check document, not a design-tool artifact. A dedicated UI and accessibility session (PRD open items) may revise this.
- **Applicable scope**: Mobile first (Android Chrome PWA). One layout, usable on desktop but not designed for it. No login screens (no accounts).

## 2. Information Architecture / Screen Flow

### 2.1 Screen List

| # | Screen | Phase | Related scenario |
|---|---|---|---|
| S1 | Player (home) | 1 | 3.1, 3.2, 3.3, 3.5 |
| S2 | Playlist | 1 | 3.3, 3.4 |
| S3 | Progress | 3 | 3.7 |
| S4 | Settings | 2 | 3.5 |
| S5 | Transcript panel (on S1) | 4 | 3.8 |
| S6 | Search | 5 | 3.8 |
| S7 | Notes | 5 | 3.8 |

Common navigation: a bottom bar with `Player` / `Playlist` / `Progress` / `Settings`. Items appear as their phase ships.

### 2.2 Screen Flow

```
        ┌─────────────── bottom nav ───────────────┐
        │ Player │ Playlist │ Progress │ Settings   │
        └────┬──────────┬──────────┬──────────┬─────┘
             ▼          ▼          ▼          ▼
            S1         S2         S3         S4
             ▲          │
             └──tap row─┘      (S1 opens at the saved timestamp)

 App launch ──▶ S1 (last video, saved timestamp)
```

## 3. Wireframes by Screen

### S1. Player (home)

```
┌──────────────────────────────┐
│ Day 12 · 12 / 370            │
│ John 3  [Open Bible]         │  ← Phase 2
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │      YouTube player       │ │
│ └──────────────────────────┘ │
│  04:12 / 31:40               │
│  [◀ Prev] [✔ Mark done] [Next ▶] │
├──────────────────────────────┤
│ Player  Playlist Progress ⚙  │
└──────────────────────────────┘
```

**Components**
- Header: video position in playlist, title, passage label and "Open Bible" button (Phase 2)
- YouTube IFrame player, 16:9, full width
- Prev / Mark done / Next buttons, each at least 44x44px
- Error area for embed-disabled or offline states, with an "Open in YouTube" button

**Behavior**: loads the saved video and seeks to its saved timestamp; saves every 5 seconds; on video end marks done and loads the next.

### S2. Playlist

```
┌──────────────────────────────┐
│ Playlist            [Jump ▾] │
├──────────────────────────────┤
│ ✔ 1  Day 1 title             │
│ ✔ 2  Day 2 title             │
│ ▶ 3  Day 3 title   12:40     │  ← current, saved position
│   4  Day 4 title             │
│   ...                        │
└──────────────────────────────┘
```

**Components**: scrolling list of 370 rows (done mark, number, title, saved position), "Jump to current" control, long-press or ✔ tap toggles done. Tapping a row opens S1 on that video.

### S3. Progress (Phase 3)

```
┌──────────────────────────────┐
│ 142 / 370 done               │
│ [██████░░░░░░░░░░]  38%      │
│ Streak: 9 days               │
│ Last 4 weeks: ▇▇▁▇▇▇▇ ...    │
└──────────────────────────────┘
```

**Components**: done count and bar, current streak, simple per-day activity strip. No charts library.

### S4. Settings (Phase 2)

**Components**: Bible version selector (NIV, NASB, KJV, Korean versions), a "Reset saved progress" button behind a confirm dialog, an app version line.

### Phases 4-5 (sketch only)

- **S5 Transcript panel**: scrolling Korean/English lines under the player; tapping a line seeks to it.
- **S6 Search**: one input accepting a Bible reference; results are a list of lectures with matching lines.
- **S7 Notes**: notes tied to a video or timestamp, listed per video and reachable from search results.

## 4. Responsive Strategy

| Item | Rule |
|---|---|
| Target | Android Chrome PWA, portrait. One layout |
| Wider screens | Content max width ~640px, centered |
| Touch targets | Minimum 44x44px |
| Navigation | Bottom bar (4 items), no hamburger |
| Fonts | At least 16px body text |

## 5. Common UI Elements

- **Done mark**: ✔ in front of the row and in S1's button state.
- **Loading**: a simple "Loading player..." line until the YouTube API is ready.
- **Errors**: shown next to the player in S1; never silent.
- **Empty states**: S3 shows "0 / 370" rather than an empty screen.

## 6. Change History

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | 2026-10-17 | Initial draft: overview, screen flow, 4 detailed screens plus 3 sketched, responsive strategy | Sam |
