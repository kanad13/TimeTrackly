# Multi-Task Time Tracker (MTTT)

- The Multi-Task Time Tracker (MTTT) is a highly portable, locally-hosted web application for tracking time across multiple hierarchical activities (Project / Task).
- It provides real-time monitoring, private data persistence via local files, and flexible data export options.

## 1. Features at a Glance

- **Hierarchical Tracking:** Tasks are grouped under a single, collapsible Project header for organization.
- **Session Persistence:** Running and paused timers are saved instantly to the local server. If you close your browser or restart your computer, your active timers will be exactly as you left them when you reopen the app.
- **Essential Controls:** Ability to Start, Pause, Resume, Stop (Save), and Delete (Discard) active tasks.
- **In-App Analytics:** A dedicated Reports tab provides real-time visualizations, including Project Time Distribution and Daily Time Logged charts.
- **Smart Input:** Autocomplete suggestions are provided via a datalist populated by both hardcoded defaults and your recent entries.
- **Data Integrity:** Prevents concurrent tracking of the exact same Project / Task combination.
- **Private & Durable Local Storage:** All data is stored locally in two separate JSON files, ensuring 100% privacy and durability of both active and completed tasks.

## 2. Stack & Deployment

- The application runs locally using a simple Node.js server with zero external dependencies.

| Component  | Technology                                                    | Role                                                                             |
| :--------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------- |
| Client     | HTML5, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js (CDN) | UI, logic, state management, and visualization                                   |
| Backend    | Node.js (with built-in `http` and `fs` modules)               | Local web server and file I/O for state synchronization                          |
| Database   | `mtt-data.json` & `mtt-active-state.json`                     | JSON-based persistence for **historical** and **in-progress** data, respectively |
| Deployment | Local Machine Execution                                       | Run via `npm start`                                                              |

## 3. Getting Started

- **Clone the Repository:**
  - `git clone [your-repo-url]`
  - `cd mttt-tracker`
- **Setup & Run:** Follow the simple instructions in the `setup.md` file to get the application running on your machine in under a minute.

## 4. Detailed Guidance

- For a deep dive into the architecture and design rationale, please refer to the comprehensive `architecture.md`.
