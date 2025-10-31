# Multi-Task Time Tracker (MTTT)

- The Multi-Task Time Tracker (MTTT) is a highly portable, locally-hosted web application for tracking time across multiple hierarchical activities (Project / Task).
- It provides real-time monitoring, private data persistence via a local file, and flexible data export options.

## 1. Features at a Glance

- **Hierarchical Tracking:** Tasks are grouped under a single, collapsible Project header for organization.
- **Essential Controls:** Ability to Start, Pause, Resume, Stop (Save), and Delete (Discard) active tasks.
- **In-App Analytics:** A dedicated Reports tab provides real-time visualizations, including Project Time Distribution and Daily Time Logged charts.
- **Smart Input:** Autocomplete suggestions are provided via a datalist populated by both hardcoded defaults and your recent entries.
- **Data Integrity:** Prevents concurrent tracking of the exact same Project / Task combination.
- **Private & Local Storage:** All data is stored locally in a `mtt-data.json` file, ensuring 100% privacy.

## 2. Stack & Deployment

- The application runs locally using a simple Node.js server with zero external dependencies.

| Component  | Technology                                                    | Role                                |
| :--------- | :------------------------------------------------------------ | :---------------------------------- |
| Client     | HTML5, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js (CDN) | UI, logic, state, and visualization |
| Backend    | Node.js (with built-in `http` and `fs` modules)               | Local web server and file I/O       |
| Database   | Local `mtt-data.json` file                                    | JSON-based file persistence         |
| Deployment | Local Machine Execution                                       | Run via `npm start`                 |

## 3. Getting Started

- **Clone the Repository:**
  - `git clone [your-repo-url]`
  - `cd mttt-tracker`
- **Setup & Run:** Follow the simple instructions in the `setup.md` file to get the application running on your machine in under a minute.

## 4. Detailed Guidance

- For a deep dive into the architecture and design rationale, please refer to the comprehensive `architecture.md`.
