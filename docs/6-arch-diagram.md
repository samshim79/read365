# Read365 Technical Architecture Diagrams

This document illustrates, in Mermaid, the system architecture based on `PRD.md` (phases, approach) and `5-project-principle.md` (structure). It contains nothing that conflicts with the preceding documents; on conflict, precedence is PRD > User Scenarios > Wireframes > Project Structure Design Principles > this document.

## 1. System Architecture (System Context)

```mermaid
graph TB
    subgraph Phone["Android phone (Chrome, installed PWA)"]
        Views["Views (Player, Playlist, Progress, Settings)"]
        Store["store.js (state + localStorage, key read365:v1)"]
        PlayerJs["player.js (IFrame API wrapper)"]
        Data["data/videos.js (hardcoded playlist)"]
        SW["Service worker (app-shell cache only)"]
        LS[("localStorage")]
    end

    YT["YouTube IFrame API + embedded player"]
    YTApp["YouTube app (Premium, approach B fallback)"]
    YV["YouVersion app (Phase 2)"]
    Host["Static host (GitHub Pages, HTTPS)"]

    Views --> Store
    Views --> PlayerJs
    Views --> Data
    Store <--> LS
    PlayerJs <-->|"play, seek, getCurrentTime"| YT
    Views -.->|"fallback: youtube.com/watch?v=ID&t=s"| YTApp
    Views -.->|"youversion://bible?reference=JHN.3"| YV
    Host -->|"app shell"| SW
    SW --> Views
```

## 2. Resume Flow

```mermaid
sequenceDiagram
    participant U as Sam
    participant V as Player view
    participant S as store.js
    participant P as player.js
    participant Y as YouTube embed

    U->>V: Open app
    V->>S: Get current video + saved position
    S-->>V: videoId, seconds
    V->>P: load(videoId, start = seconds)
    P->>Y: Create player with start time
    U->>Y: Tap play
    loop every 5 s, and on pause / hidden / pagehide
        P->>S: savePosition(videoId, getCurrentTime())
    end
    Y-->>P: Video ended
    P->>S: markDone(videoId), setCurrent(next)
    S-->>V: State changed
    V->>P: load(next, start = 0)
```

## 3. Phase 1 Playback Decision (Premium Gate)

```mermaid
graph TD
    Start["Install PWA, Chrome signed into Premium"]
    Ads{"Ads in the embed?"}
    Lock{"Plays with screen off?"}
    A["Keep approach A: embedded player, exact timestamps"]
    B["Switch to approach B: tracker + launcher, opens YouTube app at &t=seconds"]

    Start --> Ads
    Ads -->|No| Lock
    Ads -->|Yes| B
    Lock -->|Yes| A
    Lock -->|No| B

    style A fill:#90EE90
    style B fill:#FFD580
```

## 4. Phase Roadmap (Build Order)

```mermaid
graph LR
    P1["Phase 1: Resume playback + gate test"]
    P2["Phase 2: YouVersion links"]
    P3["Phase 3: Progress / streak"]
    P4["Phase 4: Transcripts + translation"]
    P5["Phase 5: Search + notes"]
    P1 --> P2 --> P3 --> P4 --> P5
```

## Reference: Core Design Principles

| Principle | Description |
|---|---|
| No backend | All state lives in `localStorage`; playlist is hardcoded; no YouTube Data API at runtime |
| Single state key | One versioned object (`read365:v1`), changed only through `store.js` |
| Save cadence | Every 5 seconds while playing, plus pause, `visibilitychange` and `pagehide` |
| Storage may fail | Every access in try/catch; app starts from video 1 if storage is empty |
| Service worker scope | App shell only; the YouTube player is never cached |
| Premium | Depends on Chrome's Google sign-in; the app cannot sign in for the embed; approach B is the fallback |
| Transcripts | Personal use only, gitignored, never published |
| Phase gating | Structure for Phase N+1 is not built during Phase N |

---

## Change History

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | 2026-10-17 | Initial architecture diagram draft: system context, resume flow, Premium gate decision, phase roadmap | Sam |
