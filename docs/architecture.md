# Architecture

TimeTrackly is a single-user, local-first time tracker. This document explains what we built and why.

## 1. Why This Design?

### 1.1. Single-User, Local-First

- All data stays on your machine (privacy by design)
- No authentication, no syncing complexity (simplicity)
- Works completely offline (reliability)
- No enterprise complexity like distributed locks or horizontal scaling (appropriateness)

### 1.2. Local Client-Server

- Frontend (HTML/JavaScript) and backend (Node.js) both run on your machine
- Server is the source of truth for all data
- No cloud dependencies, no APIs

## 2. Core Decisions (Why + What)

### 2.1. Vanilla JavaScript, Not React/Vue/Svelte

- **Why:** ~2K lines doesn't justify 40-70KB framework overhead + build step + learning curve.
- **What:** 8 ES6 modules (constants, utils, state, api, ui, reports, app, logger) with direct DOM manipulation.
- **Tradeoff:** Manual DOM re-rendering. Solution: discipline + always call `renderActiveTimers()` after state changes.

### 2.2. JSON Files, Not SQLite/PostgreSQL

- **Why:** Single-user, offline-first. Database adds setup complexity + dependencies for <100KB data. Human-readable files are easier to inspect and backup.
- **What:** Three files: `mtt-data.json` (historical entries), `mtt-active-state.json` (active timers), `mtt-suggestions.json` (user suggestions).
- **Data Structures:**
  - Historical entry (`mtt-data.json`):
    ```json
    {
      "project": "string",
      "task": "string",
      "totalDurationMs": number,
      "durationSeconds": number,
      "endTime": "ISO 8601",
      "createdAt": "ISO 8601",
      "notes": "string"
    }
    ```
  - Active timer (`mtt-active-state.json`):
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
- **Tradeoffs:** No query language. Manual validation. Scales to ~10MB; path to SQLite exists if needed.

### 2.3. ES6 Singleton State, Not Redux/MobX/Zustand

- **Why:** ~2K lines doesn't need Redux (15KB + ceremony), MobX (magical), Zustand (extra dependency), or Context API (React-only).
- **What:** Single `state.js` exports an object all modules import and mutate:

  ```javascript
  export const state = {
  	historicalEntries: [],
  	activeTimers: {},
  	predefinedSuggestions: [],
  	timerInterval: null,
  	activeChartInstances: [],
  };

  // Used everywhere
  import { state } from "./state.js";
  state.activeTimers[id] = newTimer;
  ```

- **ES6 module caching:** First import creates it once; all imports share the same reference.
- **Tradeoffs:** No time-travel debugging or middleware. Can accidentally mutate without re-rendering (solution: discipline).

## 3. System Architecture

### 3.1. Data Flow

#### 3.1.1. On Startup

- Frontend loads `app.js`
- Fetch suggestions → historical entries → active timers from server
- Initialize UI lifecycle handlers

#### 3.1.2. On User Action (Start, Pause, Resume, Delete)

- User clicks button → `ui.js` event handler
- Mutate `state.activeTimers`
- POST `activeTimers` to server (atomic write)
- Call `renderActiveTimers()` to update DOM
- Show error toast on failure, rollback state

#### 3.1.3. On Stop Timer

- Calculate final duration
- Move timer from `activeTimers` to `historicalEntries`
- POST both changes to server (atomic writes)
- Update DOM
- On failure: rollback both changes, show error

### 3.2. Backend

- **Node.js Server:** Built-ins only: `http`, `fs.promises`, `path`
- **Core responsibilities:**
  - Serve frontend HTML/CSS/JS
  - Validate incoming data (reject bad structure)
  - Write files atomically (temp file → rename)
  - Simple file locking (prevent concurrent writes)
  - Structured JSON logging for debugging
  - Health monitoring endpoint (`/api/health`)
- **Atomic writes:** Prevent corruption if power fails mid-write; old file remains untouched.
- **File locking:** Prevents two writes at once; sufficient for single-user.

### 3.3. Frontend Reliability

#### 3.3.1. Error Handling

- Try-catch blocks with user notifications
- Global error and unhandledrejection handlers
- Rollback state on server save failure
- Graceful degradation if server unavailable

#### 3.3.2. State Rollback Pattern

```javascript
const previousState = { isPaused: timer.isPaused };
try {
	timer.isPaused = !timer.isPaused;
	await saveActiveStateToServer();
	renderActiveTimers();
} catch (error) {
	timer.isPaused = previousState.isPaused; // Undo
	renderActiveTimers();
	showError("Failed to toggle timer");
}
```

#### 3.3.3. Memory Management

- Pause timer updates when tab hidden (visibility API)
- Warn users before closing with active timers (beforeunload)
- Destroy Chart.js instances before recreating
- Clean up intervals and event listeners

#### 3.3.4. Input Safety

- Sanitize dangerous chars (`<>"'`)
- Max length limits (100 chars for project/task)
- Proper CSV escaping in exports
- Validate ISO 8601 dates with fallback

## 4. Implementation Patterns

### 4.1. Module Organization

#### 4.1.1. Separation of Concerns

- `state.js` handles state, never touches DOM
- `ui.js` reads state and renders, never does API calls
- `api.js` handles network, never mutates state directly
- `utils.js` pure functions (formatting, validation)
- `app.js` wires everything together

#### 4.1.2. Code Quality

- Named constants replace magic numbers
- JSDoc type hints for IDE autocomplete
- Consistent error handling across modules
- Comprehensive test coverage (unit + E2E + API)

### 4.2. Collapsible UI Design

- Sections reduce visual clutter:
  - **Start New Timer:** Collapsed by default (minimize distraction)
  - **Active Timers:** Expanded by default (main feature)
  - **Export Data:** Collapsed by default (infrequent use)
- All sections use smooth CSS transitions and icons for feedback.

### 4.3. Smart Input

- Suggestions come from two sources:
  - User-editable `mtt-suggestions.json` file
  - Most recent unique `Project / Task` entries from history
- Users can customize suggestions by editing the JSON file and refreshing the browser.

### 4.4. Reports View

- Separate tab with two charts (via Chart.js CDN):
  - **Project Distribution:** Doughnut chart showing time per project
  - **Daily Time Logged:** Bar chart for last 7 days
- Deterministic color generation ensures the same project always gets the same color across charts.

## 5. Health Monitoring

### 5.1. Endpoint

- `GET /api/health`

### 5.2. Response

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
	timer.isPaused = previousState.isPaused; // Undo
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

### 5.2. Response

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

### 5.3. Usage

- Check server health with `npm run health` or visit `http://localhost:13331/api/health`

## 6. Future Growth

### 6.1. To 5,000+ lines of code

- Keep singleton approach (still works fine)
- Or split `state.js` into multiple objects (per feature)
- Or add tiny library like Zustand (~2KB, minimal refactor)

### 6.2. If multi-user becomes needed

- Switch to real database (replace `api.js`, keep `state.js` structure)
- Or add sync layer (Yjs/Automerge)

### 6.3. Architecture flexibility

- Current code structure enables these paths because state, API, and UI are already separated.

## 7. Further Reading

- [API Reference](/docs/api.md) - Frontend module API reference
- [Tests](/tests/README.md) - Testing guide and patterns
- [Development Workflow](/docs/contributing.md) - Development workflow
