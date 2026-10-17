# Read365 Project Structure Design Principles

On the premise of `PRD.md`, `3-user-scenario.md` and `4-wireframes.md`, this document defines the structure, naming and quality principles before the codebase is laid out. On conflict, precedence is PRD > User Scenarios > Wireframes > this document.

## 1. Overview

- **Purpose**: Decide in advance "what goes where, and what we will not do" for a small solo PWA.
- **Applicable scope**: Directory structure, state handling, naming, testing and hosting principles for plain HTML/CSS/JS, a manifest and a service worker. Screen design is in document 4.
- **Relationship between documents**: PRD (scope, phases) → User Scenarios (flows) → Wireframes (screens) → **this document (code structure)** → Architecture Diagrams.

## 2. Top-Level Principles

1. **No build step, no framework.** Plain ES modules served as static files. Add tooling only when a phase needs it.
2. **No backend.** All state is local to the phone. The playlist is hardcoded data. No YouTube Data API at runtime.
3. **One responsibility per module.** Data (`videos.js`), state (`store.js`), player control (`player.js`), screens (`views/`). A view never touches `localStorage` directly.
4. **Never swallow failures silently.** Player errors, storage errors and failed deep links all show a visible message.
5. **Storage may be missing.** Every `localStorage` access is wrapped in try/catch and the app must still start from video 1.
6. **Do not make things more flexible than needed (YAGNI).** No plugin points, no config UI beyond Settings. Add them when a phase requires.
7. **Phase-gated.** Do not add Phase N+1 structure while building Phase N.

## 3. Dependency / State Principles

### 3.1 Dependency direction

- `views/` → `store.js` / `player.js` / `data/` → browser APIs. Lower modules never import views.
- Hardcoded data modules import nothing.

### 3.2 State

- One state object kept in `store.js`, persisted to `localStorage` under a single versioned key (`read365:v1`).
- Views read state through `store.js` getters and change it through its functions (`savePosition`, `markDone`, `setVersion`).
- Save position at most every 5 seconds, and on pause, `visibilitychange` and `pagehide`.

### 3.3 State shape (v1)

```
{
  current: <videoId>,
  positions: { <videoId>: <seconds> },
  done: { <videoId>: <ISO date done> },
  bibleVersion: 111            // Phase 2: YouVersion version id (NIV 111, NASB 100, KJV 1, 개역한글 88, 새번역 142)
}
```

## 4. Code / Naming Principles

- **Domain terms verbatim**: `video`, `playlist`, `position`, `done`, `passage`. A "video" is never renamed `lecture` or `item` in code.
- **Files**: lowercase, one module per file (`player.js`, `store.js`). Views are `views/<name>.js`.
- **Functions**: verb + noun (`savePosition`, `markDone`, `openPassage`).
- **Booleans**: `is`/`has` prefix.
- **Data file**: `data/videos.js` exports one array of `{ id, title, passage? }`, in playlist order.

## 5. Testing / Quality Principles

- **Required**: the one piece of real logic, `store.js` (resume position, done toggle, streak count in Phase 3), has one runnable check file `store.test.js` using `node:test` and `node:assert`. No framework.
- **Manual**: the Phase 1 gate is a manual phone test (ads, screen-off play) recorded in the PRD.
- **Not done**: browser E2E suite, CI pipeline, coverage floor.
- **Lint**: none initially. Add `oxlint` if the code grows.

## 6. Hosting / Security / Operations Principles

- **Hosting**: GitHub Pages from the `main` branch (assumption; any static HTTPS host works). Installability requires HTTPS.
- **Service worker**: caches the app shell only (HTML, JS, CSS, manifest, icons, `videos.js`). The YouTube player is never cached.
- **Cache versioning**: the service worker cache name carries a version string, bumped on release.
- **Third-party scripts**: only the YouTube IFrame API.
- **Transcripts and translations**: personal use only, never committed to the public repo or published. The repo is private; `transcripts/` is also listed in `.gitignore`.
- **Secrets**: none exist. No API keys or tokens in the repo.

## 7. Directory Structure

```
read365/
├── index.html                # App shell, loads app.js
├── app.js                    # Entry: init store, register service worker, route between views
├── style.css                 # Single stylesheet
├── store.js                  # State, persistence, resume logic
├── store.test.js             # node:test check for store.js
├── player.js                 # YouTube IFrame API wrapper (load, seek, periodic position)
├── bible.js                  # Phase 2: YouVersion link builder, version list
├── views/
│   ├── player.js             # S1
│   ├── playlist.js           # S2
│   ├── progress.js           # S3 (Phase 3)
│   └── settings.js           # S4 (Phase 2)
├── data/
│   └── videos.js             # Hardcoded playlist (id, title, passage)
├── manifest.webmanifest
├── sw.js                     # Service worker: app-shell cache only
├── icons/                    # PWA icons
├── tools/                    # Local scripts, not shipped (extract IDs, Phase 4 transcripts)
├── transcripts/              # Phase 4, gitignored
├── docs/                     # These documents
├── PRD.md
└── lecture-companion-app-plan.md
```

- `tools/` scripts (for example `yt-dlp` runs) are run by hand and are not part of the app.
- Phases 2-5 files appear only when their phase starts.

## 8. Change History

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | 2026-10-17 | Initial draft: principles, state shape, naming, testing, hosting and directory structure | Sam |
