# Development Guide and Architecture Deep Dive

- This document consolidates the architectural constraints, design rationale, and strategic roadmap for the Multi-Task Time Tracker (MTTT).
- It serves as the definitive guide for current and future developers, including AI agents.

## 0. Design Philosophy: Single-User, Local-First

**Core Principle:** MTTT is designed explicitly for single-user, local-only operation. This is not a limitation—it's an intentional design choice that shapes every architectural decision.

### Why Single-User, Local-First?

- **Privacy by Design:** All data stays on your machine. No external services, no cloud sync, no data transmission.
- **Simplicity:** No authentication, no user management, no multi-tenancy complexity. The architecture remains straightforward and maintainable.
- **Reliability:** No network dependencies means no connectivity issues, no API rate limits, no service outages.
- **Control:** You own your data completely. Human-readable JSON files can be backed up, version-controlled, or migrated easily.
- **Performance:** Direct file I/O without network overhead provides instant responsiveness.

### Architectural Implications

This design philosophy means:

1. **No Enterprise Complexity:** Features like advanced security controls, distributed systems patterns, or horizontal scaling are intentionally absent—they would add complexity without providing value for single-user use.

2. **Simple File Locking:** Basic file locking suffices since only one user accesses the system. No need for distributed locks or complex concurrency controls.

3. **Git as Backup:** Since the application runs in a Git repository, version control serves as the backup and recovery mechanism. No need for separate backup infrastructure.

4. **Direct File I/O:** The server uses simple file operations. This is appropriate for single-user workloads and keeps dependencies minimal.

5. **Local Health Monitoring:** The health endpoint serves as a quick diagnostic tool for the maintainer, not as part of a complex monitoring infrastructure.

**Important for AI Agents and Future Developers:** When suggesting improvements or analyzing issues, always consider this single-user, local-first context. Solutions should prioritize simplicity, maintainability, and appropriateness for personal use over enterprise-grade complexity.

## 1. Architectural Model: Local Client-Server

- The MTTT operates on a self-contained, local client-server model, without any external cloud dependencies. The server acts as the definitive source of truth for all application data, both in-progress and completed.

### 1.1. Core Components

- **Frontend:** A modular JavaScript application served via `index.html` with 7 ES6 modules handling different concerns:

  - `constants.js`: Application-wide constants and configuration
  - `utils.js`: Utility functions (UUID generation, formatting, sanitization, notifications)
  - `state.js`: State management and timer calculations
  - `api.js`: Server communication layer with error handling
  - `ui.js`: DOM manipulation, timer controls, and rendering
  - `reports.js`: Chart generation and analytics visualization
  - `app.js`: Application initialization and lifecycle management

  All modules use modern ES6 import/export syntax with comprehensive JSDoc documentation.

- **Backend:** A lightweight, local Node.js micro-server (`server.js`) responsible for:

  - Serving the frontend and static assets with proper MIME types
  - Handling all data persistence operations with atomic writes
  - Request validation and input sanitization
  - Structured JSON logging for observability
  - Health monitoring endpoint (`/api/health`)
  - Graceful shutdown and error handling

- **Data Persistence:** Three distinct, human-readable JSON files in the project's root directory function as the local database and configuration.
  - `mtt-data.json`: Stores the permanent record of all **completed** time entries.
  - `mtt-active-state.json`: Stores a real-time snapshot of all **currently running or paused** timers, enabling session persistence.
  - `mtt-suggestions.json`: Stores a user-editable list of predefined "Project / Task" combinations for the smart input field.

### 1.2. Data Persistence and Model

- **Technology:** Local file system via Node.js `fs.promises` module with atomic write operations.
- **Data Safety:** Files are written atomically using a temp-file + rename pattern to prevent corruption during crashes or interruptions.
- **Data Files:**

  - `mtt-data.json`: An array of historical time entry records.
  - `mtt-active-state.json`: A JSON object representing the `activeTimers` state.
  - `mtt-suggestions.json`: An array of strings (e.g., `"My Project / My Task"`) used to populate the input suggestions.

- **Data Model (Historical Entry in `mtt-data.json`):**

| Field             | Type   | Description                                     |
| ----------------- | ------ | ----------------------------------------------- |
| `project`         | String | Top-level category (crucial for grouping)       |
| `task`            | String | Nested activity detail                          |
| `totalDurationMs` | Number | The accurate, accumulated time in milliseconds  |
| `durationSeconds` | Number | Human-readable, rounded duration at save time   |
| `endTime`         | String | Time when stopped, stored as an ISO 8601 string |
| `createdAt`       | String | Time when created, stored as an ISO 8601 string |

- **Data Model (Active Timer in `mtt-active-state.json`):**
  - The file contains a single JSON object where each key is a UUID.

| Field           | Type    | Description                                                             |
| --------------- | ------- | ----------------------------------------------------------------------- |
| `project`       | String  | The project name for the running task.                                  |
| `task`          | String  | The task name for the running task.                                     |
| `startTime`     | String  | ISO 8601 string of when the timer was last resumed, or `null`.          |
| `accumulatedMs` | Number  | Milliseconds accumulated while the timer was running but is now paused. |
| `isPaused`      | Boolean | `true` if the timer is currently paused.                                |

- **Data Flow (Event-Driven Synchronization):**
  - The application uses an event-driven model to ensure the server's state is always synchronized with the client's actions, providing high data durability.
  - **On Startup:**
    1. The frontend loads `app.js` as an ES6 module, which orchestrates initialization.
    2. The `api.js` module makes a `GET` request to `/api/suggestions` to fetch the user-defined suggestions.
    3. It then makes a `GET` request to `/api/data` to fetch all historical entries.
    4. Finally, it makes a `GET` request to `/api/active-state` to fetch the last known running timers, restoring the previous session perfectly.
    5. The `app.js` module initializes lifecycle handlers (visibility change, beforeunload, error boundaries).
  - **On State Change (Start, Pause, Resume, Delete):**
    1. User actions trigger functions in `ui.js` that modify the `state.js` module's `activeTimers` object.
    2. Immediately following the in-memory change, `api.js` sends the entire `activeTimers` object via a `POST` request to `/api/active-state`.
    3. The server performs an atomic write, ensuring the running state is always backed up safely.
    4. Error handling with user notifications ensures any failures are communicated clearly.
  - **On `Stop Timer`:**
    1. The final duration is calculated by `state.js`, and the timer is removed from the in-memory `activeTimers` object.
    2. The completed entry is added to the in-memory `historicalEntries` array.
    3. The `api.js` module sends two `POST` requests asynchronously: one to `/api/active-state` with the updated (smaller) `activeTimers` object, and another to `/api/data` with the updated (larger) `historicalEntries` array.
    4. Both writes are atomic, preventing data corruption if the system crashes during the save operation.

## 2. Design and User Experience (UX) Rationale

### 2.1. Hierarchical Organization

- **Pattern:** Active tasks are rendered using a Collapsible Accordion Pattern based on the Project name.
- **UX Goal:** To manage complexity
  - By allowing users to collapse unrelated projects, the UI remains focused even when tracking many concurrent tasks.
  - Tasks are sorted alphabetically by project name for predictable grouping.

### 2.2. Advanced Timer Controls

- The system provides robust controls to handle real-world workflow interruptions.
- **Pause/Resume:**
  - **Mechanism:** When paused, the `startTime` is nullified, and the elapsed time is stored in `accumulatedMs`. When resumed, `startTime` is set back to `Date.now()`. The state is saved to the server on each toggle.
  - **UX:** Paused timers receive a visual indicator (orange border) and their buttons switch to Resume.
- **Delete (Discard):** Allows users to remove accidental or incomplete timers from the active list without generating a permanent record. This action also syncs with the server.

### 2.3. Smart Input

- **Mechanism:** The `<datalist>` dynamically provides suggestions by combining a user-editable `mtt-suggestions.json` file and the most recent unique Project / Task strings from the `historicalEntries` data.
- **UX Goal:** Reduce typing and ensure consistency in data entry, vital for accurate reporting. Users can customize their primary suggestions by editing the JSON file and refreshing the browser.

### 2.4. Reports View

- **Pattern:** A separate tabbed interface switches between the active Tracker and the Reports view.
- **Implementation:** The `reports.js` module uses Chart.js via CDN to dynamically generate two charts based on all historical data loaded from the server:
  - **Project Time Distribution (Doughnut Chart):** Shows percentage of time spent per project.
  - **Daily Time Logged (Bar Chart):** Shows total time logged for the last 7 days.
- **Color Consistency:** The `utils.js` module provides deterministic color generation ensuring the same project always gets the same color across charts.

## 3. Implementation Details

### 3.1. Modular Frontend Architecture

The frontend is organized into 7 ES6 modules, each with a single, well-defined responsibility:

- **130-line index.html:** Minimal HTML structure that loads the module system
- **constants.js:** Application-wide constants and configuration
- **utils.js:** Utility functions (UUID generation, formatting, sanitization, notifications)
- **state.js:** State management and timer calculations  
- **api.js:** Server communication layer with error handling
- **ui.js:** DOM manipulation, timer controls, and rendering
- **reports.js:** Chart generation and analytics visualization
- **app.js:** Application initialization and lifecycle management

Each module uses ES6 import/export syntax with comprehensive JSDoc documentation, making the codebase maintainable and easy to understand.

### 3.2. Backend Implementation

The Node.js server uses modern async patterns throughout:

**Async/Await:** All file operations use `fs.promises` with async/await for clean, readable code.

**Data Integrity:**
- Atomic file writes using temp-file + rename pattern prevent corruption during crashes
- Simple file locking prevents concurrent write conflicts
- Request validation with 1MB payload size limits

**Observability:**
- Structured JSON logging (info, error, warn levels) for debugging
- `/api/health` endpoint monitors server status and data file availability
- Environment variables (PORT, DATA_DIR) for configuration flexibility

### 3.3. Frontend Reliability

**Error Handling:**
- Comprehensive try-catch blocks with user-friendly notifications
- Global error and unhandledrejection handlers
- Graceful degradation when server unavailable

**Memory Management:**
- Visibility change listener pauses timer updates when tab hidden
- Beforeunload handler warns users about active timers
- Proper cleanup of intervals and event listeners

**Input Safety:**
- Sanitization removes dangerous characters (`<>"'`)
- Length limits prevent excessive data entry
- Validation before server submission

### 3.4. Code Organization

- Named constants replace magic numbers throughout
- Comprehensive JSDoc comments provide type information
- Consistent error handling patterns across all modules
- Separation of concerns enables easier testing and maintenance

## 4. Health Monitoring

The server includes a dedicated health endpoint for diagnostic purposes:

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-31T12:00:00.000Z",
  "uptime": 123.456,
  "dataFiles": {
    "data": true,
    "activeState": true,
    "suggestions": true
  }
}
```

**Usage:** Check server health with `npm run health` or access directly at `http://localhost:13331/api/health`.
