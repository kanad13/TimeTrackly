# Architecture

TimeTrackly is a single-user, local-first time tracker. This document explains what we built and why.

## Why This Design?

**Single-User, Local-First**
- All data stays on your machine (privacy by design)
- No authentication, no syncing complexity (simplicity)
- Works completely offline (reliability)
- No enterprise complexity like distributed locks or horizontal scaling (appropriateness)

**Local Client-Server**
- Frontend (HTML/JavaScript) and backend (Node.js) both run on your machine
- Server is the source of truth for all data
- No cloud dependencies, no APIs

## Core Decisions (Why + What)

### 1. Vanilla JavaScript, Not React/Vue/Svelte

**Why:** TimeTrackly is ~2,200 lines of code. Adding a framework means:
- 40-70KB bundle overhead (bloat)
- Build step required (friction)
- Framework learning curve (unnecessary for one person)
- Framework-specific patterns (overkill)

For a single-page app this simple, vanilla JavaScript is the right tool.

**What:** 7 ES6 modules with direct DOM manipulation
- `constants.js` - Configuration and magic numbers
- `utils.js` - UUID, formatting, sanitization, notifications
- `state.js` - Singleton state object + helper functions
- `api.js` - Server communication layer
- `ui.js` - DOM rendering and user interactions
- `reports.js` - Charts via Chart.js CDN
- `app.js` - Initialization and lifecycle

**Tradeoff:** Must manually re-render the DOM. Solution: discipline + code review. Always call `renderActiveTimers()` after state changes.

---

### 2. JSON Files, Not SQLite/PostgreSQL

**Why:** TimeTrackly is single-user and offline-first. A database means:
- Installation complexity (setup required)
- Extra dependencies (npm packages)
- Overkill for < 100KB of data
- Harder to inspect and debug
- Harder to backup manually

JSON files give you human-readable data you can inspect in any text editor.

**What:** Three files in project root
- `mtt-data.json` - Historical completed entries (array of objects)
- `mtt-active-state.json` - Currently running/paused timers (object with UUID keys)
- `mtt-suggestions.json` - User task suggestions (array of strings)

**Data Structures:**

Historical entry (mtt-data.json):
```json
{
  "project": "string",
  "task": "string",
  "totalDurationMs": number,
  "durationSeconds": number,
  "endTime": "ISO 8601 timestamp",
  "createdAt": "ISO 8601 timestamp",
  "notes": "string"
}
```

Active timer (mtt-active-state.json):
```json
{
  "uuid-key": {
    "project": "string",
    "task": "string",
    "startTime": "ISO 8601 or null",
    "accumulatedMs": number,
    "isPaused": boolean,
    "notes": "string"
  }
}
```

**Tradeoffs:**
- No query language (filter in JavaScript)
- Manual concurrent write safety (simple file locking works for single user)
- Manual validation (done on server before save)
- Scales to ~10MB before needing upgrade; path to SQLite exists if needed

---

### 3. ES6 Singleton State, Not Redux/MobX/Zustand

**Why:** For 2,200 lines of code, Redux-like patterns add bloat:
- Redux: 15KB library + action types + reducers + middleware (overkill)
- MobX: Decorators and magic (confusing)
- Zustand: 2KB but still an extra dependency
- Context API: Only exists in React (we use vanilla JS)

ES6 modules give you singleton state for free.

**What:** Single `state.js` exports an object that all modules import

```javascript
export const state = {
  historicalEntries: [],
  activeTimers: {},
  predefinedSuggestions: [],
  timerInterval: null,
  activeChartInstances: []
};
```

All modules import and mutate this same object:
```javascript
import { state } from "./state.js";
state.activeTimers[id] = newTimer;  // Works everywhere
```

**How it works:** ES6 module imports are cached. First import creates the object once; subsequent imports get the same reference.

**Tradeoffs:**
- No time-travel debugging (don't need it for this scale)
- No automatic logging middleware (manually use logger.js)
- Can accidentally mutate state without re-rendering (solution: discipline)

---

## System Architecture

### Data Flow

**On Startup:**
1. Frontend loads app.js
2. Fetch suggestions → historical entries → active timers from server
3. Initialize UI lifecycle handlers

**On User Action (Start, Pause, Resume, Delete):**
1. User clicks button → ui.js event handler
2. Mutate state.activeTimers
3. POST activeTimers to server (atomic write)
4. Call renderActiveTimers() to update DOM
5. Show error toast on failure, rollback state

**On Stop Timer:**
1. Calculate final duration
2. Move timer from activeTimers to historicalEntries
3. POST both changes to server (atomic writes)
4. Update DOM
5. On failure: rollback both changes, show error

### Backend

**Node.js Server (built-ins only: http, fs.promises, path)**

Core responsibilities:
- Serve frontend HTML/CSS/JS
- Validate incoming data (reject bad structure)
- Write files atomically (temp file → rename)
- Simple file locking (prevent concurrent writes)
- Structured JSON logging for debugging
- Health monitoring endpoint (/api/health)

Atomic writes prevent corruption: if power fails mid-write, old file is untouched.
File locking prevents two writes at once: sufficient for single-user.

### Frontend Reliability

**Error Handling:**
- Try-catch blocks with user notifications
- Global error and unhandledrejection handlers
- Rollback state on server save failure
- Graceful degradation if server unavailable

**State Rollback Pattern:**
```javascript
const previousState = { isPaused: timer.isPaused };
try {
  timer.isPaused = !timer.isPaused;
  await saveActiveStateToServer();
  renderActiveTimers();
} catch (error) {
  timer.isPaused = previousState.isPaused;  // Undo
  renderActiveTimers();
  showError("Failed to toggle timer");
}
```

**Memory Management:**
- Pause timer updates when tab hidden (visibility API)
- Warn users before closing with active timers (beforeunload)
- Destroy Chart.js instances before recreating
- Clean up intervals and event listeners

**Input Safety:**
- Sanitize dangerous chars (`<>"'`)
- Max length limits (100 chars for project/task)
- Proper CSV escaping in exports
- Validate ISO 8601 dates with fallback

## Implementation Patterns

### Module Organization

**Separation of Concerns:**
- `state.js` handles state, never touches DOM
- `ui.js` reads state and renders, never does API calls
- `api.js` handles network, never mutates state directly
- `utils.js` pure functions (formatting, validation)
- `app.js` wires everything together

**Code Quality:**
- Named constants replace magic numbers
- JSDoc type hints for IDE autocomplete
- Consistent error handling across modules
- Comprehensive test coverage (unit + E2E + API)

### Collapsible UI Design

Sections reduce visual clutter:
- **Start New Timer** - Collapsed by default (minimize distraction)
- **Active Timers** - Expanded by default (main feature)
- **Export Data** - Collapsed by default (infrequent use)

All sections use smooth CSS transitions and icons for feedback.

### Smart Input

Suggestions come from two sources:
1. User-editable `mtt-suggestions.json` file
2. Most recent unique `Project / Task` entries from history

Users can customize suggestions by editing the JSON file and refreshing the browser.

### Reports View

Separate tab with two charts (via Chart.js CDN):
- **Project Distribution** - Doughnut chart showing time per project
- **Daily Time Logged** - Bar chart for last 7 days

Deterministic color generation ensures the same project always gets the same color across charts.

## Health Monitoring

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T12:00:00.000Z",
  "uptime": 123.456,
  "dataFiles": {
    "data": true,
    "activeState": true,
    "suggestions": true
  }
}
```

**Usage:** Check server health with `npm run health` or visit `http://localhost:13331/api/health`

## Future Growth

If TimeTrackly grows:

**To 5,000+ lines of code:**
- Keep singleton approach (still works fine)
- Or split state.js into multiple objects (per feature)
- Or add tiny library like Zustand (~2KB, minimal refactor)

**If multi-user becomes needed:**
- Switch to real database (replace api.js, keep state.js structure)
- Or add sync layer (Yjs/Automerge)

Current code structure enables these paths because state, API, and UI are already separated.

## Further Reading

- [api.md](api.md) - Frontend module API reference
- [../tests/README.md](../tests/README.md) - Testing guide and patterns
- [../CONTRIBUTING.md](../CONTRIBUTING.md) - Development workflow
