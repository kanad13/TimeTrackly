# TimeTrackly Frontend API Documentation

Complete reference for all frontend modules and their public interfaces.

## Table of Contents

1. [app.js](#appjs) - Application Orchestrator
2. [state.js](#statejs) - State Management
3. [ui.js](#uijs) - UI and User Interactions
4. [api.js](#apijs) - Server Communication
5. [reports.js](#reportsjs) - Charts and Analytics
6. [utils.js](#utilsjs) - Utility Functions
7. [constants.js](#constantsjs) - Application Constants
8. [logger.js](#loggerjs) - Logging and Error Handling

---

## app.js

Main application orchestrator responsible for initialization and lifecycle management.

### Exported Functions

#### `initializeApp(): Promise<void>`

Initializes the application and sets up the user interface.

**Execution Sequence:**
1. Initializes DOM element references
2. Sets up notes modal handlers
3. Attaches event listeners for buttons and collapsible sections
4. Loads suggestions from server
5. Loads historical data from server (FATAL if fails)
6. Loads active timers from server
7. Renders active timers on screen
8. Populates suggestions in datalist
9. Starts timer display if timers exist

**Throws:** Error if data file cannot be loaded from server

**Called:** Automatically on page load via `window.addEventListener("load")`

#### `setupLifecycleHandlers(): void`

Sets up global event handlers for application lifecycle management.

**Handles:**
- `visibilitychange` - Pauses timer updates when tab is hidden
- `beforeunload` - Warns about active timers and cleans up
- Global `error` - Catches uncaught exceptions
- Unhandled `rejection` - Catches unhandled promise rejections

**Called:** During initialization from window load event

---

## state.js

Centralized state management using ES6 module singleton pattern.

### Exported State Object

```javascript
export const state = {
  historicalEntries: [],        // Array of completed timer entries
  predefinedSuggestions: [],    // Array of task suggestions
  activeTimers: {},             // Object mapping UUID -> timer object
  timerInterval: null,          // setInterval reference (or null)
  activeChartInstances: []      // Array of Chart.js instances
}
```

### Timer Object Structure

```javascript
{
  project: "string",           // Project name
  task: "string",              // Task description
  startTime: Date | null,      // When timer started (null if paused)
  accumulatedMs: number,       // Milliseconds accumulated when paused
  isPaused: boolean,           // Whether timer is paused
  notes: "string"              // User notes
}
```

### Historical Entry Object Structure

```javascript
{
  project: "string",           // Project name
  task: "string",              // Task description
  totalDurationMs: number,     // Total duration in milliseconds
  durationSeconds: number,     // Duration in seconds
  endTime: "ISO string",       // When timer ended
  createdAt: "ISO string",     // When timer started
  notes: "string"              // User notes
}
```

### Exported Functions

#### `calculateElapsedMs(timer): number`

Calculates elapsed time for a timer.

**Parameters:**
- `timer` - Timer object

**Returns:** Elapsed milliseconds (handles running vs paused state)

#### `clearTimerInterval(): void`

Clears the timer update interval and stops updates.

**Purpose:** Stop continuous timer display updates and free CPU

#### `hasRunningTimers(): boolean`

Checks if there are any active timers.

**Returns:** true if activeTimers object contains any timers

---

## ui.js

User interface module handling DOM manipulation and user interactions.

### DOM Element Initialization

#### `initDOMElements(): void`

Caches references to frequently used DOM elements.

**Must be called first** before any UI operations.

**Elements cached:**
- Input fields (topicInput, notesModalTextarea)
- Buttons (startButton, exportButton, notesModalSave, etc.)
- Display containers (activeTimersList, reportsDashboard)
- Modals (notesModal, notesModalBackdrop)

### Timer Management

#### `startNewTimer(): Promise<void>`

Creates and starts a new timer.

**Input validation:**
- Accepts "Project / Task" or "Project" format
- Sanitizes input (removes special characters)
- Max 100 characters per project/task
- Prevents duplicate timers (case-insensitive)

**Throws:** Logs error and shows notification to user (doesn't throw)

**Updates state:** Adds to `state.activeTimers` and `state.historicalEntries`

#### `toggleTimer(id: string): Promise<void>`

Pauses or resumes a specific timer.

**Parameters:**
- `id` - UUID of the timer

**Behavior:**
- If running: Pauses it (accumulates time, clears startTime)
- If paused: Resumes it (sets new startTime)
- Rolls back on server save failure

#### `stopTimer(id: string): Promise<void>`

Stops a timer and moves it to historical data.

**Parameters:**
- `id` - UUID of the timer

**Behavior:**
- Calculates final duration
- Removes from activeTimers
- Adds to historicalEntries
- Persists to server
- Discards timers with zero duration

#### `deleteTimer(id: string): Promise<void>`

Deletes a timer without saving to history.

**Parameters:**
- `id` - UUID of the timer

**Error Handling:** Rolls back deletion if server save fails

### Notes Modal

#### `openNotesModal(activityId: string): void`

Opens the notes editing modal for a timer.

**Parameters:**
- `activityId` - UUID of the timer

**Behavior:**
- Displays modal with timer's current notes
- Updates title with task name
- Focuses textarea for immediate editing

#### `closeNotesModal(): void`

Closes the notes modal without saving.

**Behavior:** Any unsaved changes are discarded

#### `saveNotesModal(): Promise<void>`

Saves notes from modal to timer state.

**Behavior:**
- Updates timer's notes field
- Persists to server
- Rolls back on failure
- Shows notification to user

#### `initNotesModal(): void`

Sets up event listeners for modal interactions.

**Handles:**
- Close button clicks
- Cancel button clicks
- Save button clicks
- Backdrop clicks
- ESC key press

### Rendering

#### `renderActiveTimers(): void`

Renders all active timers grouped by project.

**Display structure:**
- Projects (collapsible headers with task count)
- Task rows (duration, status, action buttons)
- Action buttons: Pause/Resume, Stop, Delete, Notes

**Updates:**
- DOM structure
- Active timer count badge
- Collapses/expands project sections

#### `startTimerDisplay(): void`

Starts the timer update loop.

**Behavior:**
- Creates setInterval that updates every second
- Prevents duplicate intervals
- Updates duration display for all timers

#### `updateTimerDisplay(): void`

Updates timer durations every second.

**Updates:** All visible timer durations in real-time

### Data Export

#### `exportData(): void`

Exports all historical data as a CSV file.

**Behavior:**
- Generates CSV with all historical entries
- Includes: project, task, endTime, duration, notes
- Properly escapes CSV special characters
- Filename: `time_tracker_export_YYYY-MM-DD.csv`

**Shows notification** on success/failure

### Suggestions

#### `populateSuggestions(): void`

Populates autocomplete suggestions.

**Sources:**
- Predefined suggestions from server
- Recent activities from historical entries
- Eliminates duplicates
- Formats as "Project / Task"

---

## api.js

Server communication layer handling all HTTP requests.

### Data Loading

#### `loadDataFromServer(): Promise<Array>`

Loads historical time entries from server.

**Endpoint:** `GET /api/data`

**Returns:** Array of historical entry objects

**Error handling:** FATAL - shows critical error and halts app

**When called:** During app initialization

#### `loadActiveStateFromServer(): Promise<Object>`

Loads currently running timers from server.

**Endpoint:** `GET /api/active-state`

**Returns:** Object mapping UUID -> timer object

**Error handling:** Recoverable - continues with empty state

**When called:** During app initialization

#### `loadSuggestionsFromServer(): Promise<Array>`

Loads predefined task suggestions from server.

**Endpoint:** `GET /api/suggestions`

**Returns:** Array of suggestion strings

**Error handling:** Recoverable - continues with empty array

**When called:** During app initialization

### Data Saving

#### `saveDataToServer(): Promise<void>`

Saves historical entries to server.

**Endpoint:** `POST /api/data`

**Payload:** Array of historical entry objects (stringified JSON)

**When called:**
- When a timer is stopped
- When data is imported
- When data is exported (reads current)

**Error handling:** Logs error, may show notification

#### `saveActiveStateToServer(): Promise<void>`

Saves active timers to server.

**Endpoint:** `POST /api/active-state`

**Payload:** Object of active timers (stringified JSON)

**When called:**
- When timer is started, paused, resumed, or deleted
- When notes are saved
- After any state change

**Error handling:** Logs error, shows notification for critical saves

### Error Responses

All endpoints may return errors with these fields:
```javascript
{
  message: "Error description"
}
```

---

## reports.js

Charts and analytics for time tracking data.

### Reporting

#### `switchTab(tabName: string): void`

Switches between Tracker and Reports tabs.

**Parameters:**
- `tabName` - "tracker" or "reports"

**Behavior:**
- Hides/shows content based on tab
- Automatically renders reports when switching to reports tab
- Clears existing charts

#### `renderReportsView(): void`

Renders all charts and analytics.

**Charts rendered:**
- Doughnut chart: Time by project
- Bar chart: Daily hours (last 7 days)

**Data aggregation:**
- Calculates total time per project (case-insensitive)
- Calculates daily totals
- Uses deterministic color assignment

**Memory management:** Destroys old Chart.js instances before creating new ones

---

## utils.js

Utility functions for common operations.

### UUID Generation

#### `generateUUID(): string`

Generates a unique identifier for timers.

**Returns:** RFC4122 v4 UUID format string

**Browser compatibility:**
- Uses `crypto.randomUUID()` if available (modern browsers)
- Falls back to Math.random() based implementation for older browsers

**Impact:** Timer IDs must be unique (collisions cause data corruption)

### Duration Formatting

#### `formatDuration(seconds: number): string`

Formats duration in seconds to HH:MM:SS format.

**Parameters:**
- `seconds` - Duration in seconds

**Returns:** Formatted string (e.g., "01:23:45")

**Always pads** to 2 digits with leading zeros

### Input Sanitization

#### `sanitizeInput(str: string): string`

Sanitizes user input to prevent issues with special characters.

**Parameters:**
- `str` - Input string

**Returns:** Sanitized string (max 100 characters)

**Removes:**
- Whitespace (leading/trailing)
- HTML special characters: `< > " '`
- Trims to MAX_INPUT_LENGTH (100 chars)

**Purpose:**
- Prevents JSON serialization issues
- Prevents HTML injection
- Ensures CSV compatibility
- Prevents UI layout issues

### Task Key Generation

#### `getRunningTasksKey(project: string, task: string): string`

Creates a unique key for identifying running tasks.

**Returns:** Lowercase key in format `"project:task"`

**Purpose:** Case-insensitive duplicate detection

### Color Management

#### `getDistinctColors(count: number): string[]`

Generates an array of distinct colors for charts.

**Parameters:**
- `count` - Number of colors needed

**Returns:** Array of hex color codes from CHART_COLORS palette

**Behavior:** Cycles through palette (colors repeat if count > palette size)

**Deterministic:** Same count always produces same colors in same order

### Notifications

#### `showNotification(message: string, type: string, duration?: number): void`

Displays a notification message to the user.

**Parameters:**
- `message` - Notification text
- `type` - "success", "error", "info", or "warning"
- `duration` - Milliseconds to show (0 = indefinite, default = NOTIFICATION_DURATION)

**Behavior:**
- Creates fixed notification in top-right corner
- Auto-removes after duration
- Fades out before removal

---

## constants.js

Application-wide constants and configuration values.

### Time Constants

```javascript
MS_PER_SECOND: 1000
MS_PER_MINUTE: 60000
MS_PER_HOUR: 3600000
MS_PER_DAY: 86400000
```

### UI Constants

```javascript
MAX_INPUT_LENGTH: 100              // Max project/task name length
TIMER_UPDATE_INTERVAL: 1000        // Timer display refresh rate (ms)
NOTIFICATION_DURATION: 4000        // Default notification visibility (ms)
NOTIFICATION_FADE_DURATION: 300    // Fade animation duration (ms)
STATUS_MESSAGE_DURATION: 3000      // Error/status message visibility (ms)
STARTUP_NOTIFICATION_DURATION: 2000 // App startup message visibility (ms)
```

### Report Constants

```javascript
REPORT_DAYS_DEFAULT: 7             // Days to show in daily chart
```

### Chart Colors

```javascript
CHART_COLORS: [
  "#4f46e5", // indigo
  "#f97316", // orange
  "#10b981", // green
  "#ef4444", // red
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16"  // lime
]
```

---

## logger.js

Centralized logging and error handling system.

### Log Functions

#### `logDebug(message: string, context?: Object): void`

Logs a debug message (detailed diagnostic info).

#### `logInfo(message: string, context?: Object): void`

Logs an info message (general application flow).

#### `logWarn(message: string, category?: string, context?: Object): void`

Logs a warning message (non-critical issues).

#### `logError(message: string, category?: string, error?: Error, context?: Object): void`

Logs an error message (issues affecting functionality).

#### `logFatal(message: string, error?: Error, context?: Object): void`

Logs a fatal error (critical issues breaking app).

### Error Handlers

#### `handleNetworkError(operation: string, error: Error, isFatal?: boolean): Object`

Handles server communication failures.

**Returns:**
```javascript
{
  userMessage: "string",    // Message to show user
  isDismissible: boolean    // Whether user can dismiss error
}
```

#### `handleValidationError(field: string, reason: string, value: any): Object`

Handles input validation failures.

#### `handlePersistenceError(operation: string, error: Error, isFatal?: boolean): Object`

Handles data save/load failures.

#### `handleStateError(action: string, error: Error, rollbackData?: Object): Object`

Handles state update failures.

#### `handleUIError(component: string, error: Error): Object`

Handles UI rendering failures.

### Utility Functions

#### `withErrorHandling(promise: Promise, operation: string, category?: string): Promise`

Wraps an async operation with error logging.

**Parameters:**
- `promise` - Promise to wrap
- `operation` - Description of operation
- `category` - Error category

**Returns:** Original promise with error handling attached

### Error Categories

```javascript
NETWORK       // Server communication
VALIDATION    // Input validation
PERSISTENCE   // Data save/load
UI            // UI rendering
STATE         // State management
UNEXPECTED    // Uncaught exceptions
```

---

## Module Dependency Graph

```
app.js (entry point)
├── state.js (state management)
├── ui.js (user interactions)
│   ├── state.js
│   ├── api.js (data persistence)
│   │   ├── state.js
│   │   └── logger.js
│   ├── utils.js (helpers)
│   │   └── constants.js
│   ├── constants.js
│   └── reports.js (charts)
│       ├── state.js
│       └── constants.js
├── api.js
│   └── logger.js
├── reports.js
│   └── constants.js
├── utils.js
│   └── constants.js
└── logger.js
```

---

## State Flow

```
User Action (start/pause/stop/delete timer)
    ↓
ui.js (handles user input)
    ↓
state.js (updates in-memory state)
    ↓
api.js (persists to server)
    ↓
ui.js (re-renders display)
    ↓
logger.js (logs any errors)
```

---

## Error Handling Flow

```
Operation Fails
    ↓
logger.js (logs with category and context)
    ↓
Determine Error Type
    ├─→ Network: handleNetworkError()
    ├─→ Validation: handleValidationError()
    ├─→ Persistence: handlePersistenceError()
    ├─→ State: handleStateError() + rollback
    └─→ UI: handleUIError()
    ↓
Return error info with user message
    ↓
ui.js (shows notification or rolls back)
```

---

## Best Practices

1. **Always use logger module** for error handling
2. **Use constants** instead of magic numbers
3. **Validate inputs** with sanitizeInput()
4. **Handle errors** with try-catch and proper logging
5. **Render after state changes** using renderActiveTimers()
6. **Test error paths** with network failures and invalid data
7. **Check domElements** before UI operations (null check pattern)
8. **Use notifications** for user-facing errors

---

## Deprecations and Migration

- Old global error messages → use logger.js module
- Inline magic numbers → use constants.js
- Direct DOM operations → use cached domElements references
- Unstructured logging → use logger.js functions
