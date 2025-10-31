# Development Guide and Architecture Deep Dive

- This document consolidates the architectural constraints, design rationale, and strategic roadmap for the Multi-Task Time Tracker (MTTT)
- It serves as the definitive guide for current and future developers, including AI agents

## 1. Architectural Model: Local Client-Server

- The MTTT operates on a self-contained, local client-server model, withouut any external cloud dependencies.

### 1.1. Core Components

- **Frontend:** A single `index.html` file containing all UI, application logic, and state management. It is served statically by the backend.
- **Backend:** A lightweight, local Node.js micro-server (`server.js`) responsible for serving the frontend and handling all data persistence operations.
- **Data Persistence:** A single, human-readable `mtt-data.json` file located in the project's root directory, which functions as the local database.

### 1.2. Data Persistence and Model

- **Technology:** Local file system via Node.js `fs` module.
- **Data File:** All historical time entry records are stored as a JSON array in `mtt-data.json`.
- **Data Model (Time Entry):**

| Field             | Type   | Description                                     |
| ----------------- | ------ | ----------------------------------------------- |
| `project`         | String | Top-level category (crucial for grouping)       |
| `task`            | String | Nested activity detail                          |
| `totalDurationMs` | Number | The accurate, accumulated time in milliseconds  |
| `durationSeconds` | Number | Human-readable, rounded duration at save time   |
| `endTime`         | String | Time when stopped, stored as an ISO 8601 string |
| `createdAt`       | String | Time when created, stored as an ISO 8601 string |

- **Data Flow:**
  - On startup, the frontend (`index.html`) makes a `GET` request to `/api/data` to fetch all historical entries into memory.
  - When a timer is stopped, the new entry is appended to the in-memory array, and the entire array is sent via a `POST` request to `/api/data`, overwriting the `mtt-data.json` file.
  - All reporting and suggestion features operate on the in-memory data.

## 2. Design and User Experience (UX) Rationale

### 2.1. Hierarchical Organization

- **Pattern:** Active tasks are rendered using a Collapsible Accordion Pattern based on the Project name.
- **UX Goal:** To manage complexity
  - By allowing users to collapse unrelated projects, the UI remains focused even when tracking many concurrent tasks.
  - Tasks are sorted alphabetically by project name for predictable grouping.

### 2.2. Advanced Timer Controls

- The system provides robust controls to handle real-world workflow interruptions.
- **Pause/Resume:**
  - **Mechanism:** When paused, the `startTime` is nullified, and the elapsed time is stored in `accumulatedMs`. When resumed, `startTime` is set back to `Date.now()`.
  - **UX:** Paused timers receive a visual indicator (orange border) and their buttons switch to Resume.
- **Delete (Discard):** Allows users to remove accidental or incomplete timers from the active list without generating a permanent record.

### 2.3. Smart Input

- **Mechanism:** The `<datalist>` dynamically provides suggestions by combining hardcoded templates and the most recent unique Project / Task strings from the `historicalEntries` data.
- **UX Goal:** Reduce typing and ensure consistency in data entry, vital for accurate reporting.

### 2.4. Reports View

- **Pattern:** A separate tabbed interface switches between the active Tracker and the Reports view.
- **Implementation:** Uses Chart.js via CDN to dynamically generate two charts based on all historical data loaded from the server:
  - **Project Time Distribution (Doughnut Chart):** Shows percentage of time spent per project.
  - **Daily Time Logged (Bar Chart):** Shows total time logged for the last 7 days.
