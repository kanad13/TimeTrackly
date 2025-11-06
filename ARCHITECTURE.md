# TimeTrackly - Comprehensive Architecture Overview

## Project Type & Framework
- **Type**: Single-Page Application (SPA) - Local-First Time Tracking
- **Frontend Framework**: Vanilla JavaScript (ES6 modules) - No React/Vue/frameworks
- **Backend**: Node.js local server (data persistence)
- **Styling**: Tailwind CSS (CDN) + Custom CSS (Material Design)
- **Charts**: Chart.js (CDN)
- **Icons**: Material Icons (Google Fonts)

## Design Philosophy
- **Single-User, Local-First**: No authentication, no cloud
- **Privacy-First**: All data stored locally in JSON files
- **Offline-First**: Works completely offline with local server
- **Modular**: ES6 modules for clean separation of concerns
- **No External Dependencies**: Vanilla JS, CDN-only libraries

---

## Folder Structure

```
TimeTrackly/
├── index.html                    # Entry point, minimal HTML shell
├── js/                          # Frontend application (ES6 modules)
│   ├── app.js                   # Main orchestrator & lifecycle management
│   ├── state.js                 # Centralized state management
│   ├── ui.js                    # DOM manipulation & user interactions
│   ├── api.js                   # Server communication layer
│   ├── reports.js               # Chart generation & analytics
│   ├── utils.js                 # Shared utility functions
│   └── constants.js             # Configuration values
├── server.cjs                    # Node.js backend server
├── assets/                       # Screenshots & documentation
│   └── *.png                    # UI screenshots
├── docs/                        # Documentation
├── tests/                       # Test suite
│   ├── unit/                   # Unit tests
│   ├── e2e/                    # End-to-end tests
│   └── fixtures/               # Test data
├── mtt-data.json               # Historical time entries (persisted)
├── mtt-active-state.json       # Currently running timers (persisted)
├── mtt-suggestions.json        # Task suggestions (persisted)
└── package.json                # Project metadata
```

---

## Frontend Architecture

### 1. Entry Point: index.html
- **Role**: Minimal HTML shell with CDN dependencies
- **Key Elements**:
  - Tailwind CSS CDN for styling
  - Chart.js CDN for visualizations
  - Material Icons CDN for UI icons
  - Roboto font from Google Fonts
  - Custom Material Design elevation shadows
  - Single `<script type="module" src="js/app.js">` entry point

### 2. Module Structure (ES6 Modules)

#### **app.js** - Main Orchestrator
- **Responsibilities**:
  - Initialize DOM references
  - Load data from server
  - Render initial UI
  - Set up event listeners
  - Manage application lifecycle

- **Initialization Order** (CRITICAL):
  1. Initialize DOM elements first
  2. Load data from server (suggestions, historical, active state)
  3. Render UI with loaded data
  4. Start timer display if running timers exist
  5. Set up lifecycle handlers (visibility, unload, errors)

- **Lifecycle Handlers**:
  - `visibilitychange`: Pause timer updates when tab hidden (CPU optimization)
  - `beforeunload`: Warn about active timers, cleanup intervals
  - `error`/`unhandledrejection`: Global error handling

#### **state.js** - Centralized State Management
- **Role**: "Model" in MVC pattern - holds all application data
- **Why Module-Scoped State**: ES6 modules are singletons; importing state.js multiple times gives the SAME state object
- **No Redux/Complex Libraries**: Simple, effective for single-user app

- **State Structure**:
  ```javascript
  {
    historicalEntries: [     // Completed time entries
      {
        project: "string",
        task: "string",
        totalDurationMs: number,
        durationSeconds: number,
        endTime: ISO string,
        createdAt: ISO string,
        notes: "string"
      }
    ],
    predefinedSuggestions: ["Project / Task", ...],
    activeTimers: {          // Currently running timers (keyed by UUID)
      "uuid-1": {
        project: "string",
        task: "string",
        startTime: Date | null,
        accumulatedMs: number,
        isPaused: boolean,
        notes: "string"
      }
    },
    timerInterval: setInterval reference,
    activeChartInstances: [Chart.js instances for cleanup]
  }
  ```

- **Timer Lifecycle**:
  1. **Created**: `activeTimers[id]` with `startTime = now`, `isPaused = false`
  2. **Paused**: `isPaused = true`, `accumulatedMs` updated, `startTime = null`
  3. **Resumed**: `isPaused = false`, `startTime = now` (accumulatedMs preserved)
  4. **Stopped**: Removed from `activeTimers`, added to `historicalEntries`
  5. **Deleted**: Removed from `activeTimers` (not saved to history)

- **Helper Functions**:
  - `calculateElapsedMs(timer)`: Total elapsed time including paused durations
  - `clearTimerInterval()`: Cleanup interval
  - `hasRunningTimers()`: Check if any timers running

#### **ui.js** - DOM Manipulation & User Interactions
- **Role**: "Controller" in MVC pattern - responds to user actions, updates view
- **Size**: Largest module (~600 lines)

- **Key Responsibilities**:
  1. DOM element manipulation (read inputs, render UI)
  2. Timer lifecycle: start, pause, resume, stop, delete
  3. Input validation & sanitization
  4. Notes/comments management
  5. CSV export generation
  6. Real-time timer display updates

- **DOM References** (initialized in `initDOMElements()`):
  - `topicInput`: Project/Task input field
  - `startButton`: Start timer button
  - `exportButton`: Export data button
  - `activeTimersList`: Container for active timer cards
  - `activeCount`: Counter display
  - `noActiveMessage`: Empty state message
  - And others...

- **Key Functions**:
  - `renderActiveTimers()`: Renders all timers grouped by project with collapsible sections
  - `startTimerDisplay()`: Starts setInterval for real-time updates (1 second)
  - `updateTimerDisplay()`: Updates all timer durations every second
  - `startNewTimer()`: Validates input, checks duplicates, creates timer
  - `toggleTimer()`: Pause/resume a timer
  - `stopTimer()`: Finish timer, save to history
  - `deleteTimer()`: Remove timer without saving
  - `exportData()`: Generate CSV file with proper escaping
  - `populateSuggestions()`: Populate datalist with recent activities

- **Active Timers Rendering Structure**:
  ```
  Project Header (collapsible)
    └── Task Card (Material Design)
        ├── Task Name + Status (Paused/Running)
        ├── Time Display (HH:MM:SS format)
        ├── Action Buttons (Pause/Resume, Stop, Delete)
        └── Notes Textarea (auto-save on blur)
  ```

- **Duplicate Detection**: Prevents multiple timers for same project/task (case-insensitive)

- **Notes Feature**:
  - Auto-save on textarea blur
  - Persist when stopping timers
  - Included in CSV exports
  - Stored as empty strings if empty

- **CSV Export Format**:
  - Includes: project, task, endTime, durationSeconds, durationMinutes, totalDurationMs, notes
  - Proper quote escaping for CSV compatibility
  - Filename: `time_tracker_export_YYYY-MM-DD.csv`

#### **api.js** - Server Communication Layer
- **Role**: ONLY place where fetch() calls occur
- **Pattern**: Abstract server communication from other modules

- **Endpoints**:
  - `GET /api/data`: Load historical entries
  - `POST /api/data`: Save historical entries
  - `GET /api/active-state`: Load running timers
  - `POST /api/active-state`: Save running timers
  - `GET /api/suggestions`: Load task suggestions

- **Error Handling Strategy**:
  - **Fatal Errors** (throw + stop app):
    - `loadDataFromServer()`: Can't proceed without historical data
  - **Recoverable Errors** (notify + continue):
    - `loadActiveStateFromServer()`: Can start fresh
    - `loadSuggestionsFromServer()`: Can work with empty list
    - `saveDataToServer()`: Notifies user but continues
    - `saveActiveStateToServer()`: Notifies user of data loss risk

- **Synchronization Approach**:
  - Event-driven, NOT real-time sync
  - Every timer action triggers a save
  - Server is source of truth; browser is cache
  - No polling or websockets needed

#### **reports.js** - Charts & Analytics
- **Responsibilities**:
  - Tab switching (Tracker ↔ Reports)
  - Chart generation using Chart.js
  - Data aggregation for visualizations

- **Charts Provided**:
  1. **Project Time Distribution** (Doughnut): % of time per project
  2. **Daily Time Logged** (Bar): Hours logged per day (last 7 days)

- **Key Functions**:
  - `switchTab(targetTab)`: Toggle between tracker and reports views
  - `renderReportsView()`: Generate charts from historical data

- **Critical Design Detail - Chart Destruction**:
  - MUST destroy existing Chart.js instances before creating new ones
  - Without this, memory leaks occur
  - Chart.js creates canvas contexts and event listeners that aren't garbage collected

- **Color Consistency**:
  - Projects sorted alphabetically
  - Assigned colors in order (deterministic)
  - Same project always gets same color

#### **utils.js** - Shared Utility Functions
- **Categories**:
  1. **Data Generation**: `generateUUID()` using Web Crypto API
  2. **Formatting**: `formatDuration()` (HH:MM:SS), `getRunningTasksKey()`
  3. **Validation**: `sanitizeInput()` - removes quotes, brackets, length limits
  4. **Visualization**: `getDistinctColors()` for charts
  5. **User Feedback**: `showNotification()` - toast-style notifications

- **Input Sanitization**:
  - Removes: `< > " '` (prevent JSON/HTML issues)
  - Max length: 100 characters (prevent UI layout breakage)
  - Not security (single-user), but prevents data corruption

- **Notifications**:
  - Toast-style, top-right corner
  - Color-coded: red (error), green (success), blue (info)
  - Auto-dismiss with optional persistence (duration=0)

#### **constants.js** - Configuration Values
- **Time Constants**:
  - `MS_PER_SECOND`: 1000
  - `MS_PER_MINUTE`: 60000
  - `MS_PER_HOUR`: 3600000
  - `MS_PER_DAY`: 86400000

- **App Configuration**:
  - `MAX_INPUT_LENGTH`: 100 (prevents excessively long names)
  - `TIMER_UPDATE_INTERVAL`: 1000ms (1 second - balances smoothness vs CPU)
  - `NOTIFICATION_DURATION`: 4000ms (4 seconds)
  - `REPORT_DAYS_DEFAULT`: 7 (weekly view)

- **Chart Colors**:
  - 10-color palette: indigo, orange, green, red, blue, amber, violet, pink, cyan, lime
  - Assigned by project alphabetically
  - High contrast, accessible

---

## Styling Architecture

### Tailwind CSS (Utility-First)
- **Framework**: Utility-first CSS framework via CDN
- **Classes Used Throughout**: `flex`, `grid`, `py-4`, `text-gray-700`, etc.
- **Color Scheme**: 
  - Primary: Google Blue (#4285F4)
  - Success: Google Green (#34A853)
  - Warning: Google Yellow (#FBBC04)
  - Error: Google Red (#EA4335)

### Material Design Custom Styles (index.html)
- **Elevation Shadows** (.elevation-1 through .elevation-4):
  - Layered shadow effects for depth perception
  - Used on cards and section headers

- **Button Ripple Effect** (.btn-ripple):
  - Click animation mimicking Material Design
  - White radial gradient ripple on press

- **Component-Specific Styles**:
  - `.timer-card`: Hover animation (slight lift)
  - `.md-button`: Uppercase, letter-spacing, state animations
  - `.tab-button`: Active state with bottom border
  - `.paused-card` / `.task-row-paused`: Yellow left border
  - `.task-row-active`: Blue left border
  - `.project-header`: Hover background change
  - `.material-input` / `.material-textarea`: Focus ring styling

### Typography
- **Font Family**: Roboto (Google Fonts)
- **Weights Used**: 300, 400, 500, 700
- **Base Font Size**: Browser default (typically 16px)

---

## UI Organization

### Collapsible Sections (Reduce Visual Clutter)

1. **Start New Timer** (Indigo)
   - Collapsed by default
   - Contains: Input field + Start button
   - Smooth expand/collapse with rotating chevron

2. **Active Timers** (Green)
   - Expanded by default
   - Shows running/paused timers grouped by project
   - Each project is collapsible
   - Each timer card has: task name, duration, buttons, notes

3. **Data Export** (Gray)
   - Collapsed by default
   - Contains: Export to CSV button
   - Smooth expand/collapse with rotating chevron

### Tab System
- **Tabs**: "Create & Track Tasks" (Tracker) and "Analyze Time Reports" (Reports)
- **Styling**: Active tab has blue bottom border
- **Content**: Hidden/visible toggled via CSS classes

### Active Timer Card Anatomy
```
┌─ Project Header (collapsible) ──────────────────┐
│  🔹 ProjectName (2)                             │ ← Chevron rotates
├─────────────────────────────────────────────────┤
│ Task Name (Paused)             01:23:45         │
│ Running Since 10:30:45  [Resume] [Stop] [Delete]│
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │ Add notes or comments... (textarea)           ││
│ └──────────────────────────────────────────────┘│
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Backend Architecture (Node.js Server)

### Server Purpose
- Data persistence layer
- Serves static frontend files
- Manages three JSON data files
- Handles atomic writes with file locking

### Key Features
- **Local-Only**: Binds to 127.0.0.1 (no network exposure)
- **No Authentication**: Single-user system
- **No Database**: Direct JSON file I/O
- **Atomic Writes**: Temp file + rename prevents corruption
- **File Locking**: Prevents concurrent writes
- **Structured Logging**: JSON format for parsing

### Data Files
1. **mtt-data.json**: Historical time entries (append-only)
2. **mtt-active-state.json**: Currently running timers (frequent updates)
3. **mtt-suggestions.json**: User-editable task suggestions

### API Endpoints
- `GET /`: Serves index.html
- `GET /js/*`: Serves JS modules
- `GET /api/data`: Load historical data
- `POST /api/data`: Save historical data
- `GET /api/active-state`: Load active timers
- `POST /api/active-state`: Save active timers
- `GET /api/suggestions`: Load suggestions
- `GET /api/health`: Health check

---

## Data Flow Examples

### Starting a Timer
```
User Input (topic-input) 
  ↓
startNewTimer() 
  ↓ Validate & Sanitize
  ↓ Check for duplicates
  ↓ Create UUID
  ↓
state.activeTimers[uuid] = {...}
  ↓
saveActiveStateToServer()
  ↓ POST /api/active-state
  ↓
renderActiveTimers()
  ↓ DOM update with new card
  ↓
startTimerDisplay()
  ↓ Begin setInterval updates
```

### Stopping a Timer
```
User clicks "Stop" button
  ↓
stopTimer(id)
  ↓ Calculate final duration
  ↓ Remove from activeTimers
  ↓ Create historical entry with notes
  ↓
state.historicalEntries.push(newEntry)
  ↓
saveActiveStateToServer()
  ↓ POST /api/active-state
  ↓
saveDataToServer()
  ↓ POST /api/data
  ↓
renderActiveTimers()
  ↓ Remove card from DOM
  ↓
populateSuggestions()
  ↓ Add to datalist for future use
```

### Loading Application
```
app.js loads
  ↓
initializeApp()
  ↓
initDOMElements() → Store references
  ↓
loadSuggestionsFromServer() → mtt-suggestions.json
  ↓
loadDataFromServer() → mtt-data.json
  ↓
loadActiveStateFromServer() → mtt-active-state.json
  ↓
renderActiveTimers() → Display any restored timers
  ↓
populateSuggestions() → Populate datalist
  ↓
hasRunningTimers() → Check if need timer updates
  ↓
startTimerDisplay() → Begin 1-second updates if needed
```

---

## Key Design Patterns

### 1. Module-Scoped State (Singleton Pattern)
- ES6 modules imported multiple times return same instance
- Simple, effective state management without Redux
- All modules import from `state.js` to access shared state

### 2. Event-Driven Persistence
- Every state change triggers a server save
- No real-time sync or polling
- Server is source of truth, browser is cache

### 3. Separation of Concerns
- **app.js**: Orchestration
- **state.js**: Data
- **ui.js**: User interaction & rendering
- **api.js**: Server communication
- **reports.js**: Data visualization
- **utils.js**: Shared functions
- **constants.js**: Configuration

### 4. DOM Element Caching
- Store references in `domElements` object
- Avoid repeated `getElementById()` calls
- Centralized in `initDOMElements()`

### 5. Graceful Degradation
- Recoverable errors don't crash app
- Fatal errors show user-friendly messages
- Detailed console logs for debugging

---

## Performance Characteristics

### Timer Display Updates
- **Frequency**: Every 1 second (1000ms)
- **Auto-Cleanup**: Stops when no running timers
- **Optimization**: Simple iteration, no complex calculations

### Rendering Performance
- **Active Timers**: O(n) where n = number of timers
- **Project Grouping**: O(n) single pass with reduce
- **Collapsible Sections**: CSS-based transitions (GPU-accelerated)

### Memory Management
- **Chart Instances**: Destroyed before creating new ones (prevent leaks)
- **Intervals**: Cleared when not needed
- **Event Listeners**: Cleaned up with `{ once: true }` for transient events

### Data Volume Limits
- **Practical Limit**: Thousands of historical entries
- **Single-User**: Won't accumulate unlimited data
- **CSV Export**: Loads all data into memory (acceptable for single-user)

---

## Testing Structure

### Unit Tests (`tests/unit/`)
- Module functionality testing
- Utility functions
- State management

### E2E Tests (`tests/e2e/`)
- UI complete workflow (Puppeteer)
- Backend API testing
- Headless mode support

### Test Running
```bash
npm test              # All tests
npm run test:unit    # Unit only
npm run test:api     # API only
npm run test:e2e     # E2E only
npm run test:watch   # Watch mode
npm run test:headless # Headless mode
```

---

## Critical Implementation Details

### 1. Initialization Order
- MUST initialize DOM before UI operations
- MUST load data before rendering
- Order matters for avoiding undefined references

### 2. Save Operations
- Always await server saves
- Check error codes, not just response.ok
- Rollback state on failure

### 3. Timer Calculations
- `accumulatedMs`: Time while paused
- `startTime`: When timer was started/resumed
- Total = `accumulatedMs + (now - startTime)` if running

### 4. Duplicate Detection
- Case-insensitive project/task comparison
- Uses `getRunningTasksKey()` for consistency
- Prevents confusion in reports

### 5. Notes Persistence
- Stored in active timer object
- Auto-saved on blur
- Included in historical entries when stopping
- Included in CSV exports

---

## Development Tips

### Adding New Features
1. Determine which module owns the functionality
2. Update state.js if new state needed
3. Add UI functions in ui.js
4. Add API endpoints in server.cjs if needed
5. Update constants.js for any configuration
6. Add tests in appropriate test directory

### Debugging
- Check browser console for JavaScript errors
- Check Node console for server logs (JSON format)
- Use `showNotification()` for user-facing debugging
- Historical entries in mtt-data.json for data inspection
- Active state in mtt-active-state.json for timer state inspection

### Common Pitfalls
- Removing `type="module"` from script tag breaks all imports
- Not awaiting server saves causes data loss
- Not destroying charts before recreating them causes memory leaks
- Changing DOM element IDs without updating ui.js breaks functionality
- Not calling `initDOMElements()` first causes undefined references

---

## Summary: Architecture Strengths

1. **Modular**: Clear separation of concerns across 7 modules
2. **Maintainable**: Extensive documentation, single-responsibility functions
3. **Performant**: No unnecessary re-renders, auto-cleanup of resources
4. **Robust**: Error handling for both fatal and recoverable errors
5. **Simple**: Vanilla JS, no build process, no complex dependencies
6. **Privacy-First**: All data local, no external network requests
7. **Single-User Optimized**: No concurrency concerns, simpler logic
