# Development Guide and Architecture Deep Dive

- This document consolidates the architectural constraints, design rationale, and strategic roadmap for **TimeTrackly**
- It serves as the definitive guide for current and future developers, including AI agents

## 1. Design Philosophy: Single-User, Local-First

- **Core Principle:** `TimeTrackly` is designed explicitly for single-user, local-only operation
  - This is not a limitation—it's an intentional design choice that shapes every architectural decision

### 1.1. Why Single-User, Local-First?

- **Privacy by Design:** All data stays on your machine
- **Simplicity:** No authentication, no user management, no multi-tenancy complexity
  - The architecture remains straightforward and maintainable
- **Reliability:** No network dependencies means no connectivity issues, no API rate limits, no service outages
- **Control:** You own your data completely
  - Human-readable JSON files can be backed up, version-controlled, or migrated easily
- **Performance:** Direct file I/O without network overhead provides instant responsiveness

### 1.2. Architectural Implications

- This design philosophy means:
  - **No Enterprise Complexity:** Features like advanced security controls, distributed systems patterns, or horizontal scaling are intentionally absent—they would add complexity without providing value for single-user use
  - **Simple File Locking:** Basic file locking suffices since only one user accesses the system
    - No need for distributed locks or complex concurrency controls
  - **Git as Backup:** Since the application runs in a Git repository, version control serves as the backup and recovery mechanism
    - No need for separate backup infrastructure
  - **Direct File I/O:** The server uses simple file operations
    - This is appropriate for single-user workloads and keeps dependencies minimal
  - **Local Health Monitoring:** The health endpoint serves as a quick diagnostic tool for the maintainer, not as part of a complex monitoring infrastructure
- **Important for AI Agents and Future Developers:** When suggesting improvements or analyzing issues, always consider this `single-user, local-first` context
  - Solutions should prioritize simplicity, maintainability, and appropriateness for personal use over `enterprise-grade` complexity

## 2. Architectural Model: Local Client-Server

- `TimeTrackly` operates on a self-contained, local client-server model, without any external cloud dependencies
- The server acts as the definitive source of truth for all application data, both in-progress and completed

### 2.1. Core Components

- **Frontend:** A modular JavaScript application served via `index.html` with 7 ES6 modules handling different concerns:
  - `constants.js`: Application-wide constants and configuration
  - `utils.js`: Utility functions (`UUID` generation, formatting, sanitization, notifications)
  - `state.js`: State management and timer calculations
  - `api.js`: Server communication layer with error handling
  - `ui.js`: `DOM` manipulation, timer controls, and rendering
  - `reports.js`: Chart generation and analytics visualization
  - `app.js`: Application initialization and lifecycle management
- All modules use modern `ES6 import/export` syntax with comprehensive `JSDoc` documentation
- **Backend:** A lightweight, local `Node.js` micro-server (`server.js`) responsible for:
  - Serving the frontend and static assets with proper `MIME` types
  - Handling all data persistence operations with `atomic writes`
  - Request validation and input sanitization
  - Structured `JSON logging` for observability
  - Health monitoring endpoint (`/api/health`)
  - Graceful shutdown and error handling
- **Data Persistence:** Three distinct, human-readable `JSON` files in the project's root directory function as the local database and configuration
  - `mtt-data.json`: Stores the permanent record of all `completed` time entries
  - `mtt-active-state.json`: Stores a real-time snapshot of all `currently running or paused` timers, enabling session persistence
  - `mtt-suggestions.json`: Stores a user-editable list of predefined `Project / Task` combinations for the smart input field

### 2.2. Data Persistence and Model

- **Technology:** Local file system via `Node.js fs.promises` module with `atomic write` operations
- **Data Safety:** Files are written `atomically` using a `temp-file + rename` pattern to prevent corruption during crashes or interruptions
- **Data Files:**
  - `mtt-data.json`: An array of historical time entry records
  - `mtt-active-state.json`: A `JSON` object representing the `activeTimers` state
  - `mtt-suggestions.json`: An array of strings (e.g., "My Project / My Task") used to populate the input suggestions
- **Data Model (Historical Entry in `mtt-data.json`):**

| Field             | Type   | Description                                       |
| :---------------- | :----- | :------------------------------------------------ |
| `project`         | String | Top-level category (crucial for grouping)         |
| `task`            | String | Nested activity detail                            |
| `totalDurationMs` | Number | The accurate, accumulated time in milliseconds    |
| `durationSeconds` | Number | Human-readable, rounded duration at save time     |
| `endTime`         | String | Time when stopped, stored as an `ISO 8601` string |
| `createdAt`       | String | Time when created, stored as an `ISO 8601` string |
| `notes`           | String | User-entered notes/comments about the task        |

- **Data Model (Active Timer in `mtt-active-state.json`):**
  - The file contains a single `JSON` object where each key is a `UUID`

| Field           | Type    | Description                                                             |
| :-------------- | :------ | :---------------------------------------------------------------------- |
| `project`       | String  | The project name for the running task.                                  |
| `task`          | String  | The task name for the running task.                                     |
| `startTime`     | String  | `ISO 8601` string of when the timer was last resumed, or `null`.        |
| `accumulatedMs` | Number  | Milliseconds accumulated while the timer was running but is now paused. |
| `isPaused`      | Boolean | `true` if the timer is currently paused.                                |
| `notes`         | String  | User-entered notes/comments about the task (editable while running).    |

- **Data Flow (Event-Driven Synchronization):**
  - The application uses an `event-driven` model to ensure the server's state is always synchronized with the client's actions, providing high data durability
  - **On Startup:**
    - The frontend loads `app.js` as an `ES6 module`, which orchestrates initialization
    - The `api.js` module makes a `GET` request to `/api/suggestions` to fetch the user-defined suggestions
    - It then makes a `GET` request to `/api/data` to fetch all historical entries
    - Finally, it makes a `GET` request to `/api/active-state` to fetch the last known running timers, restoring the previous session perfectly
    - The `app.js` module initializes `lifecycle` handlers (`visibility change`, `beforeunload`, `error boundaries`)
  - **On State Change (Start, Pause, Resume, Delete):**
    - User actions trigger functions in `ui.js` that modify the `state.js` module's `activeTimers` object
    - Immediately following the `in-memory` change, `api.js` sends the entire `activeTimers` object via a `POST` request to `/api/active-state`
    - The server performs an `atomic write`, ensuring the running state is always backed up safely
    - `Error handling` with user notifications ensures any failures are communicated clearly
  - **On `Stop Timer`:**
    - The final duration is calculated by `state.js`, and the timer is removed from the `in-memory activeTimers` object
    - The completed entry is added to the `in-memory historicalEntries` array
    - The `api.js` module sends two `POST` requests asynchronously: one to `/api/active-state` with the updated (smaller) `activeTimers` object, and another to `/api/data` with the updated (larger) `historicalEntries` array
    - Both writes are `atomic`, preventing data corruption if the system crashes during the save operation

## 3. Design and User Experience (`UX`) Rationale

### 3.1. Hierarchical Organization

- **Pattern:** Active tasks are rendered using a `Collapsible Accordion Pattern` based on the `Project name`
- **UX Goal:** To manage complexity
  - By allowing users to collapse unrelated projects, the `UI` remains focused even when tracking many concurrent tasks
  - Tasks are sorted alphabetically by `project name` for predictable grouping

### 3.2. Advanced Timer Controls

- The system provides robust controls to handle `real-world workflow` interruptions
- **Pause/Resume:**

  - **Mechanism:** When paused, the `startTime` is nullified, and the elapsed time is stored in `accumulatedMs`
    - When resumed, `startTime` is set back to `Date.now()`
    - The state is saved to the server on each toggle
  - **UX:** Paused timers receive a visual indicator (`orange border`) and their buttons switch to `Resume`

- ![](/assets/020-ui_timer_with_notes.png)
  _Active timers display real-time duration and control buttons_
  _Paused timers show orange border and resume option_

- **Delete (Discard):** Allows users to remove accidental or incomplete timers from the active list without generating a permanent record
  - This action also syncs with the server
- **Notes/Comments:** Each timer includes a textarea for adding detailed notes or comments
  - **Mechanism:** Notes are stored in the `notes` field and auto-saved on blur (when user clicks away)
  - **UX:** Notes persist when stopping timers and are included in CSV exports for comprehensive record-keeping

### 3.3. Collapsible UI Sections

- The interface uses collapsible sections to reduce visual clutter and improve focus
- **Start New Timer Section:** Contains the input field and start button
  - **Default State:** Collapsed to minimize distraction once timers are running
  - **Color:** Indigo background for visibility
- **Active Timers Section:** Displays all running and paused timers
  - **Default State:** Expanded (main feature of the app)
  - **Color:** Green background to indicate active/running state
- **Data Export Section:** Contains the CSV export button
  - **Default State:** Collapsed (infrequently used feature)
  - **Color:** Gray background for utility functions
- All sections use smooth CSS transitions and rotating chevron icons for visual feedback

### 3.4. Smart Input

- **Mechanism:** The `<datalist>` dynamically provides suggestions by combining a user-editable `mtt-suggestions.json` file and the most recent unique `Project / Task` strings from the `historicalEntries` data
- **UX Goal:** Reduce typing and ensure consistency in data entry, vital for accurate reporting
  - Users can customize their primary suggestions by editing the `JSON` file and refreshing the browser

### 3.5. Reports View

- **Pattern:** A separate `tabbed interface` switches between the active Tracker and the `Reports` view
- **Implementation:** The `reports.js` module uses `Chart.js` via `CDN` to dynamically generate two charts based on all historical data loaded from the server:
  - **Project Time Distribution (Doughnut Chart):** Shows percentage of time spent per project
  - **Daily Time Logged (Bar Chart):** Shows total time logged for the last 7 days
- **Color Consistency:** The `utils.js` module provides deterministic color generation ensuring the same project always gets the same color across charts

### 3.6. Input Validation & Error Handling

- The application provides clear, actionable error messages for invalid input
- Empty or whitespace-only task names are rejected with helpful guidance
- Error messages use color-coded styling (red for errors) for immediate recognition

![Error Validation](/assets/030-ui_error_validation.png)
_Clear error messages guide users to correct input issues_

## 4. Implementation Details

### 4.1. Modular Frontend Architecture

- The frontend is organized into 7 `ES6` modules, each with a single, `well-defined responsibility`:
  - `index.html`: Minimal `HTML` structure that loads the `module system`
  - `constants.js`: Application-wide constants and configuration
  - `utils.js`: Utility functions (`UUID` generation, formatting, sanitization, notifications)
  - `state.js`: State management and timer calculations
  - `api.js`: Server communication layer with error handling
  - `ui.js`: `DOM` manipulation, timer controls, and rendering
  - `reports.js`: Chart generation and analytics visualization
  - `app.js`: Application initialization and lifecycle management
- Each module uses `ES6 import/export` syntax with comprehensive `JSDoc` documentation, making the codebase `maintainable` and easy to understand

### 4.1.1. Error Handling and Robustness

- **Input Validation:** All user inputs are validated and sanitized before use

  - Project and task names are trimmed and deduplicated using case-insensitive comparison
  - Notes can contain any characters but are properly escaped in CSV exports
  - Invalid dates from server are handled gracefully with fallback to current time

- **State Rollback:** When operations fail, state is rolled back to previous state

  - Timer pause/resume: If save fails, timer state is reverted
  - Notes changes: If save fails, notes value is reverted to previous state

- **Error Notifications:** All errors are communicated to user via toast notifications

  - Failed timer operations show "Failed to toggle timer. Please try again."
  - Failed notes saves show "Failed to save notes. Please try again."
  - Export failures show "Failed to export data. Please try again."

- **Export Resilience:** CSV export uses try-finally to ensure button is re-enabled on success or failure

### 4.2. Backend Implementation

- The `Node.js` server uses `modern async` patterns throughout:
- **Async/Await:** All file operations use `fs.promises` with `async/await` for `clean, readable` code
- **Data Integrity:**
  - `Atomic file` writes using a `temp-file + rename` pattern prevent corruption during crashes
  - `Simple file locking` prevents concurrent write conflicts
  - Request validation with `1MB payload` size limits
- **Observability:**
  - Structured `JSON logging` (`info`, `error`, `warn` levels) for debugging
  - `/api/health` endpoint monitors server status and `data file availability`
  - `Environment variables` (`PORT`, `DATA_DIR`) for configuration flexibility

### 4.3. Frontend Reliability

- **Error Handling:**

  - Comprehensive `try-catch` blocks with user-friendly notifications
  - Global `error` and `unhandledrejection` handlers
  - Graceful degradation when server unavailable
  - Report rendering protected against missing Chart.js library

- **Memory Management:**

  - `Visibility change` listener pauses timer updates when tab hidden
  - `Beforeunload` handler warns users about active timers
  - Proper cleanup of intervals and event listeners
  - Chart.js instances properly destroyed before creating new ones to prevent memory leaks

- **Input Safety:**
  - Sanitization removes dangerous characters (`<>"'`)
  - Length limits prevent excessive data entry (max 100 chars for project/task)
  - Proper CSV escaping prevents injection attacks in exports
  - Date parsing validates ISO format with fallback

### 4.4. Code Organization

- Named constants replace magic numbers throughout
- Comprehensive JSDoc comments provide type information
- Consistent error handling patterns across all modules
- Separation of concerns enables easier testing and maintenance
- Duplicate detection uses case-insensitive keys to prevent confusion

## 5. Health Monitoring

- The server includes a dedicated health endpoint for diagnostic purposes:
- **Endpoint:** `GET /api/health`
- **Response:**

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

- **Usage:** Check server health with `npm run health` or access directly at `http://localhost:13331/api/health`
