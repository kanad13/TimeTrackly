# Multi-Task Time Tracker (MTTT)

- The Multi-Task Time Tracker (MTTT) is a highly portable, locally-hosted web application for tracking time across multiple hierarchical activities (Project / Task).
- It provides real-time monitoring, private data persistence via local files, and flexible data export options.

## 1. Features at a Glance

- **Hierarchical Tracking:** Tasks are grouped under a single, collapsible Project header for organization.
- **Session Persistence:** Running and paused timers are saved instantly to the local server. If you close your browser or restart your computer, your active timers will be exactly as you left them when you reopen the app.
- **Essential Controls:** Ability to Start, Pause, Resume, Stop (Save), and Delete (Discard) active tasks.
- **In-App Analytics:** A dedicated Reports tab provides real-time visualizations, including Project Time Distribution and Daily Time Logged charts.
- **Smart, Configurable Input:** Autocomplete suggestions are populated from a user-editable `mtt-suggestions.json` file and your own recent entries.
- **Data Integrity:** Prevents concurrent tracking of the exact same Project / Task combination.
- **Private & Durable Local Storage:** All data is stored locally in human-readable JSON files, ensuring 100% privacy and durability.

## 2. How to Use the Application

Once the server is running, the workflow is simple and intuitive.

### Core Workflow

1.  **Enter a Task:** In the input field, type the task you want to track using the `Project / Task` format. You can also select a recent or predefined entry from the dropdown list that appears as you type.
2.  **Start the Timer:** Click the **Start** button. A new timer will appear under the appropriate project heading in the "Active Timers" list.
3.  **Track Multiple Tasks:** Repeat the process to run multiple timers concurrently. The UI will group them by project.
4.  **Stop and Save:** When you have completed a task, click the **Stop** button. The timer will be removed from the active list, and its data will be saved permanently to `mtt-data.json`.

### Managing Active Timers

- **Pause/Resume:** If you need to take a break, click the **Pause** button. The timer's border will turn orange to indicate its paused state. Click **Resume** to start it again from where you left off.
- **Delete (Discard):** If you started a timer by mistake, click the **Delete** button. This will remove the timer from the active list without saving any data.
- **Collapse Projects:** To keep the view tidy, you can click on any project header to collapse or expand its list of tasks.

### Reports and Data

- **View Reports:** Click the **Reports & Analytics** tab to see visualizations of your historical data. You can see a doughnut chart of time spent per project and a bar chart of your activity over the last 7 days.
- **Export Data:** On the "Time Tracker" tab, click the **Export All Data (CSV)** button to download a complete record of all your completed tasks.

## 3. Stack & Deployment

- The application runs locally using a simple Node.js server with zero external dependencies.

| Component     | Technology                                                    | Role                                                                                 |
| :------------ | :------------------------------------------------------------ | :----------------------------------------------------------------------------------- |
| Client        | HTML5, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js (CDN) | UI, logic, state management, and visualization                                       |
| Backend       | Node.js (with built-in `http` and `fs` modules)               | Local web server and file I/O for state synchronization                              |
| Data Storage  | `mtt-data.json` & `mtt-active-state.json`                     | JSON-based persistence for **historical** and **in-progress** data, respectively     |
| Configuration | `mtt-suggestions.json`                                        | A user-editable JSON file for populating default "Project / Task" input suggestions. |
| Deployment    | Local Machine Execution                                       | Run via `npm start`                                                                  |

## 4. Getting Started

- **Clone the Repository:**
  - `git clone [your-repo-url]`
  - `cd mttt-tracker`
- **Setup & Run:** Follow the simple instructions in the `setup.md` file to get the application running on your machine in under a minute.

## 5. Detailed Guidance

- For a deep dive into the architecture and design rationale, please refer to the comprehensive `architecture.md`.
