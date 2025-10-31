# Development Guide and Architecture Deep Dive

- This document consolidates the architectural constraints, design rationale, and strategic roadmap for the Multi-Task Time Tracker (MTTT).
- It serves as the definitive guide for current and future developers, including AI agents.

## 1. Architectural Model: Local Client-Server

- The MTTT operates on a self-contained, local client-server model, without any external cloud dependencies. The server acts as the definitive source of truth for all application data, both in-progress and completed.

### 1.1. Core Components

- **Frontend:** A single `index.html` file containing all UI, application logic, and event handling. It is served statically by the backend.
- **Backend:** A lightweight, local Node.js micro-server (`server.js`) responsible for serving the frontend and handling all data persistence operations.
- **Data Persistence:** Three distinct, human-readable JSON files in the project's root directory function as the local database and configuration.
  - `mtt-data.json`: Stores the permanent record of all **completed** time entries.
  - `mtt-active-state.json`: Stores a real-time snapshot of all **currently running or paused** timers, enabling session persistence.
  - `mtt-suggestions.json`: Stores a user-editable list of predefined "Project / Task" combinations for the smart input field.

### 1.2. Data Persistence and Model

- **Technology:** Local file system via Node.js `fs` module.
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
    1. The frontend (`index.html`) makes a `GET` request to `/api/suggestions` to fetch the user-defined suggestions.
    2. It then makes a `GET` request to `/api/data` to fetch all historical entries.
    3. Finally, it makes a `GET` request to `/api/active-state` to fetch the last known running timers, restoring the previous session perfectly.
  - **On State Change (Start, Pause, Resume, Delete):**
    1. The user action modifies the `activeTimers` object in the browser's memory.
    2. Immediately following the in-memory change, the entire `activeTimers` object is sent via a `POST` request to `/api/active-state`, overwriting the file on the server. This ensures the running state is always backed up.
  - **On `Stop Timer`:**
    1. The final duration is calculated, and the timer is removed from the in-memory `activeTimers` object.
    2. The completed entry is added to the in-memory `historicalEntries` array.
    3. Two `POST` requests are sent asynchronously: one to `/api/active-state` with the updated (smaller) `activeTimers` object, and another to `/api/data` with the updated (larger) `historicalEntries` array.

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
- **Implementation:** Uses Chart.js via CDN to dynamically generate two charts based on all historical data loaded from the server:
  - **Project Time Distribution (Doughnut Chart):** Shows percentage of time spent per project.
  - **Daily Time Logged (Bar Chart):** Shows total time logged for the last 7 days.
