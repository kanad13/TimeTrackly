# Multi-Task Time Tracker (MTTT)

- The **Multi-Task Time Tracker (MTTT)** is a highly portable, locally-hosted web application designed for single-user time tracking across multiple hierarchical activities (Project / Task)
- It provides real-time monitoring, private data persistence via local files, and flexible data export options
- Built with reliability and data integrity as core principles, `MTTT` is designed for personal use with complete privacy and zero external dependencies

## 1. Features at a Glance

- **Hierarchical Tracking:** Tasks are grouped under a single, collapsible Project header for organization
- **Session Persistence:** Running and paused timers are saved instantly to the local server
  - If you close your browser or restart your computer, your active timers will be exactly as you left them when you reopen the app
- **Essential Controls:** Ability to Start, Pause, Resume, Stop (Save), and Delete (Discard) active tasks
- **Notes & Comments:** Add detailed notes to each timer for comprehensive record-keeping
  - Notes auto-save and are included in CSV exports
- **Collapsible UI Sections:** Start New Timer, Active Timers, and Data Export sections can be collapsed to reduce clutter
  - Smart defaults keep focus on active work
- **In-App Analytics:** A dedicated Reports tab provides real-time visualizations, including Project Time Distribution and Daily Time Logged charts
- **Smart, Configurable Input:** Autocomplete suggestions are populated from a user-editable `mtt-suggestions.json` file and your own recent entries
- **Data Integrity:** Prevents concurrent tracking of the exact same Project / Task combination
- **Private & Durable Local Storage:** All data is stored locally in human-readable JSON files, ensuring 100% privacy and durability
- **Health Monitoring:** Built-in health check endpoint to verify server status and data file integrity
- **Reliable Data Handling:** Atomic file writes and automatic input sanitization ensure data integrity

## 2. How to Use the Application

- Once the server is running, the workflow is simple and intuitive

### 2.1. Core Workflow

- **Enter a Task:** In the input field, type the task you want to track using the `Project / Task` format
  - You can also select a recent or predefined entry from the dropdown list that appears as you type
- **Start the Timer:** Click the **Start** button
  - A new timer will appear under the appropriate project heading in the "Active Timers" list
- **Track Multiple Tasks:** Repeat the process to run multiple timers concurrently
  - The UI will group them by project
- **Stop and Save:** When you have completed a task, click the **Stop** button
  - The timer will be removed from the active list, and its data will be saved permanently to `mtt-data.json`

### 2.2. Managing Active Timers

- **Pause/Resume:** If you need to take a break, click the **Pause** button
  - The timer's border will turn orange to indicate its paused state
  - Click **Resume** to start it again from where you left off
- **Delete (Discard):** If you started a timer by mistake, click the **Delete** button
  - This will remove the timer from the active list without saving any data
- **Collapse Projects:** To keep the view tidy, you can click on any project header to collapse or expand its list of tasks

### 2.3. Reports and Data

- **View Reports:** Click the **Reports & Analytics** tab to see visualizations of your historical data
  - You can see a doughnut chart of time spent per project and a bar chart of your activity over the last 7 days
- **Export Data:** On the "Time Tracker" tab, click the **Export All Data (CSV)** button to download a complete record of all your completed tasks

## 3. Stack & Deployment

- The application runs locally using a simple Node.js server with zero external dependencies

| Component         | Technology                                                                 | Role                                                                                |
| :---------------- | :------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Client**        | HTML5, ES6 Modules, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js (CDN) | Modular UI with 7 ES6 modules for separation of concerns                            |
| **Backend**       | Node.js (with built-in `http`, `fs.promises`, and `path` modules)          | Local web server with atomic file I/O and health monitoring                         |
| **Data Storage**  | `mtt-data.json` & `mtt-active-state.json`                                  | JSON-based persistence for **historical** and **in-progress** data, respectively    |
| **Configuration** | `mtt-suggestions.json`                                                     | A user-editable JSON file for populating default "Project / Task" input suggestions |
| **Deployment**    | Local Machine Execution                                                    | Run via `npm start` or `npm run dev`                                                |

## 4. Getting Started

- **Clone the Repository:**
  - `git clone [your-repo-url]`
  - `cd mttt-tracker`
- **Setup & Run:** Follow the simple instructions in the `setup.md` file to get the application running on your machine in under a minute

## 5. Detailed Guidance

- For a deep dive into the architecture and design rationale, please refer to the comprehensive `architecture.md`
