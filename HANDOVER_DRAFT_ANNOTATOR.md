# Draft Annotator — Implementation Handover

## What This Is

A new feature within the existing SOS Draft Signal Review SPA. Users paste a 17Lands draft URL and walk through every pick writing freeform annotations (per-pick and per-card). They can also create "what-if" alternate timelines by picking different cards and seeing side-by-side pool comparisons.

## Architecture Decisions (Locked In)

| Decision | Choice | Rationale |
|---|---|---|
| Storage | SQLite via better-sqlite3 | Atomic writes, queryable, zero ops, single file |
| Auth model | Edit token in URL/localStorage | No user accounts. Author gets `?token=xyz`, saved to localStorage. Share button copies read-only URL |
| Draft log | Stored in review record (~50-100KB) | Self-contained artifact; survives 17Lands changes/downtime |
| Routing | App.tsx becomes router shell | Current content moves to `SignalReview` page component. Add react-router-dom |
| Save model | Debounced auto-save (2s after typing stops) | No data loss risk, trivial server load, "Saved" indicator in UI |
| Save payload | Full state replacement (PUT entire annotations + timelines) | Simple, idempotent, 50-100KB max |
| File structure | `src/annotator/` feature directory | Self-contained with own types, hooks, components, pages. Imports shared code from `src/data/` and `src/ui/components/` |
| Timeline logic | Pure function `computePool()` + hook wrapper | Testable without React, memoized in hook |
| Component reuse | Add optional callback props to CardDisplay | `onAnnotate?`, `onAltPick?` — existing usage unchanged |
| Invalid divergence | Skip + console.warn | Graceful degradation, UI never breaks |
| Test framework | Vitest + @testing-library/react + supertest | Native Vite integration, full component + API test coverage |

## Data Model

```typescript
interface DraftReview {
  id: string;              // UUID
  editToken: string;       // UUID, kept by author (never sent to readers)
  draftId: string;         // 17Lands draft ID
  draftLog: RawDraftPick[]; // cached copy of draft data
  annotations: PickAnnotation[];
  timelines: Timeline[];
  createdAt: string;
  updatedAt: string;
}

interface PickAnnotation {
  packNumber: number;
  pickNumber: number;
  note: string;            // freeform per-pick
  cardNotes: Record<string, string>; // card name → note
}

interface Timeline {
  id: string;
  name: string;            // e.g., "What if I went Prismari?"
  divergences: Divergence[];
}

interface Divergence {
  packNumber: number;
  pickNumber: number;
  altPick: string;         // card name chosen instead
}
```

## Data Flow

```
Creating a review:
  User pastes URL → extractDraftId() → fetchDraftLog() via proxy
    → POST /reviews { draftId, draftLog }
    → server creates UUID + editToken, stores in SQLite
    → returns { id, editToken }
    → frontend redirects to /review/{id}?token={editToken}
    → saves editToken to localStorage["review:{id}"]

Editing (auto-save):
  User types annotation → 2s debounce
    → PUT /reviews/{id} { annotations, timelines }
    → header: Authorization: Bearer {editToken}
    → server validates token → UPDATE SQLite row

Viewing (shared link):
  Reader opens /review/{id} (no token)
    → GET /reviews/{id}
    → server returns review JSON (minus editToken)
    → frontend checks localStorage for token → none found → read-only mode
```

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         React SPA                                │
│                                                                  │
│  /signal-review ──► SignalReview page (existing App content)    │
│  /annotate      ──► paste URL → creates review → redirect       │
│  /review/:id    ──► annotator workspace (edit or read-only)     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Annotator Workspace                      │       │
│  │                                                       │       │
│  │  ┌─────────┐  ┌──────────────┐  ┌───────────────┐   │       │
│  │  │PickNav  │  │ Pack + Cards │  │ Annotation    │   │       │
│  │  │(reused) │  │ (reused)     │  │ Panel (new)   │   │       │
│  │  └─────────┘  └──────────────┘  └───────────────┘   │       │
│  │                                                       │       │
│  │  ┌─────────────────────┐  ┌────────────────────────┐│       │
│  │  │ Timeline Switcher   │  │ Pool Comparison View   ││       │
│  │  │ [Actual] [What-if 1]│  │  Actual | Alternate    ││       │
│  │  └─────────────────────┘  └────────────────────────┘│       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
          │                              │
          │ fetch draft log              │ CRUD annotations
          ▼                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Express Server (extended proxy.ts)             │
│                                                                   │
│  /api/*           ──► passthrough to 17Lands (existing)          │
│  POST /reviews    ──► create review (returns UUID + edit token)  │
│  GET  /reviews/:id ──► fetch review JSON                         │
│  PUT  /reviews/:id ──► update review (requires edit token)       │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│  SQLite (single file)│
│  reviews.db          │
└──────────────────────┘
```

## File Structure

```
src/
├── data/              (shared — fetcher, types)
├── signals/           (signal review only)
├── model/             (signal review only)
├── ui/
│   ├── components/    (shared — CardDisplay, PickNavigator, etc.)
│   ├── hooks/         (signal review hooks)
│   ├── views/         (signal review views)
│   └── pages/
│       └── SignalReview.tsx  (current App.tsx content, moved here)
├── annotator/
│   ├── types.ts       (DraftReview, PickAnnotation, Timeline, Divergence)
│   ├── api.ts         (createReview, fetchReview, updateReview)
│   ├── computePool.ts (pure function: draftLog + divergences → Card[])
│   ├── hooks/
│   │   ├── useReview.ts        (load + auto-save with debounce)
│   │   └── useTimeline.ts      (memoized computePool wrapper)
│   ├── components/
│   │   ├── AnnotationPanel.tsx  (textarea per pick, card note popovers)
│   │   ├── TimelineSwitcher.tsx (tabs: Actual, What-if 1, What-if 2...)
│   │   └── PoolComparison.tsx   (side-by-side actual vs alternate pool)
│   └── pages/
│       ├── CreateReview.tsx    (/annotate route)
│       └── ReviewWorkspace.tsx (/review/:id route)
├── App.tsx            (router shell only)
└── main.tsx
server/
├── proxy.ts           (extend with review CRUD routes)
├── db.ts              (SQLite setup + queries)
└── reviews.db         (created at runtime, gitignored)
```

## Implementation Phases

### Phase 1: Foundation
1. `npm install react-router-dom better-sqlite3 @types/better-sqlite3 uuid`
2. `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom supertest @types/supertest`
3. Refactor `App.tsx` → router shell with routes
4. Move current App.tsx content → `src/ui/pages/SignalReview.tsx`
5. Create `server/db.ts` — SQLite init, table creation
6. Add CRUD routes to `server/proxy.ts` (POST, GET, PUT /reviews)
7. Verify existing signal review still works at `/signal-review`

### Phase 2: Core Annotator
1. Create `src/annotator/types.ts` (all interfaces above)
2. Create `src/annotator/api.ts` (createReview, fetchReview, updateReview)
3. Build `CreateReview` page — paste URL form, calls API, redirects
4. Build `ReviewWorkspace` page — loads review, determines edit/read-only
5. Build `AnnotationPanel` — textarea per pick, card click → note input
6. Implement `useReview` hook — loads data, manages state, auto-saves with 2s debounce
7. Add "Saving..." / "Saved" indicator

### Phase 3: Timeline / What-If
1. Implement `computePool(draftLog, divergences, upToPick)` pure function
2. Build `TimelineSwitcher` — create/rename/delete timelines, switch active
3. Add `onAltPick` prop to `CardDisplay` — click card in pack to set as alt pick for active timeline
4. Build `PoolComparison` — side-by-side card lists (actual pool left, alternate right)
5. Highlight divergent picks in the comparison view

### Phase 4: Tests
1. `computePool` unit tests: no divergences, single divergence, multiple divergences, invalid card (skip)
2. Server integration tests: POST creates review, GET returns without token, PUT with valid/invalid token, GET 404
3. Component tests: AnnotationPanel, TimelineSwitcher, PoolComparison, ReviewWorkspace (edit vs read-only)
4. Debounce behavior test: rapid edits → single PUT

## Server API Spec

### POST /reviews
```
Request:  { draftId: string, draftLog: RawDraftPick[] }
Response: { id: string, editToken: string }
Status:   201 Created
```

### GET /reviews/:id
```
Response: { id, draftId, draftLog, annotations, timelines, createdAt, updatedAt }
          (editToken is NEVER included in response)
Status:   200 OK | 404 Not Found
```

### PUT /reviews/:id
```
Headers:  Authorization: Bearer {editToken}
Request:  { annotations: PickAnnotation[], timelines: Timeline[] }
Response: { ok: true, updatedAt: string }
Status:   200 OK | 403 Forbidden | 404 Not Found
```

## SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  edit_token TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  draft_log TEXT NOT NULL,       -- JSON stringified RawDraftPick[]
  annotations TEXT NOT NULL DEFAULT '[]',  -- JSON stringified PickAnnotation[]
  timelines TEXT NOT NULL DEFAULT '[]',    -- JSON stringified Timeline[]
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Key Design Notes

- **computePool logic**: iterate picks 1..N. At each pick, check if active timeline has a divergence at that pack/pick. If yes, use altPick card name; if no, use actual pick. Return accumulated card list. If divergence card name not found in available[], skip it (use actual pick) and console.warn.
- **Edit mode detection**: on page load, check `localStorage["review:{id}"]` for editToken. If present, verify it works with a test PUT (or just trust it and handle 403 gracefully). If not present, render read-only.
- **Card notes UI**: clicking a card in the pack opens a small popover/inline input below it. Notes are keyed by card name in the PickAnnotation.cardNotes record.
- **Timeline pool display**: the "actual" pool is just computePool with no divergences. Both pools use the same render component, just with different data.

## Dependencies to Add

```json
{
  "dependencies": {
    "react-router-dom": "^6.x",
    "better-sqlite3": "^11.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "vitest": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "jsdom": "^24.x",
    "supertest": "^7.x",
    "@types/better-sqlite3": "^7.x",
    "@types/supertest": "^6.x",
    "@types/uuid": "^9.x"
  }
}
```

## TODOs (Future Work)

### Collaborative Annotations (Google Docs Mode)
Multiple users annotate same review simultaneously with real-time sync. Requires WebSocket server, CRDT/OT for conflict resolution, user presence indicators, and user accounts. Design direction: separate annotation layers per user (everyone sees their own + others' notes, color-coded by author). This is the stated end-goal for the tool.
**Depends on:** user accounts, WebSocket infrastructure.

### Signal Review Integration in Annotator
Show signal badges and archetype openness scores alongside annotations. Lets users compare their intuition against automated signal data in one view. The signal engine already exists — just needs to be wired into the annotator's pick context (pass signalMap + run engine per pick).
**Depends on:** annotator v1 shipped and stable.

### Review List / Dashboard
A `/reviews` page listing all reviews created by the current browser (via localStorage index). Shows draft ID, creation date, and link to each review. Simple localStorage scan + list rendering. No server changes needed.
**Depends on:** nothing (can build anytime after Phase 2).

### Pool Curve / Mana Analysis in Comparison View
Add mana curve chart and color pie breakdown to PoolComparison. Makes it visually obvious why one pool is better (e.g., "your actual pool has no 2-drops"). Uses existing Recharts dependency.
**Depends on:** Phase 3 (PoolComparison) shipped.

### Stickers & Freehand Annotation
Add sticker stamps (e.g., "bomb", "trap", "synergy", "meh") and freehand drawing/markup on card images or the pack view. Lets users visually tag cards beyond text notes. Likely needs an HTML Canvas or SVG overlay layer on top of the pack grid, with stroke data serialized into the review record. Stickers could be a predefined set or custom emoji.
**Depends on:** annotator v1 stable, canvas/SVG overlay infrastructure.
