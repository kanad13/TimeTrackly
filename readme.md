# Multi-Task Time Tracker (MTTT)

- The Multi-Task Time Tracker (MTTT) is a highly portable, single-file web application for tracking time across multiple hierarchical activities (Project / Task)
- It provides real-time monitoring, secure data persistence via Firestore, and flexible data export options

## 1. Features at a Glance

- **Hierarchical Tracking:** Tasks are grouped under a single, collapsible Project header for organization
- **Essential Controls:** Ability to Start, Pause, Resume, Stop (Save), and Delete (Discard) active tasks
- **In-App Analytics (NEW):** A dedicated Reports tab provides real-time visualizations, including Project Time Distribution and Daily Time Logged charts
- **Smart Input:** Autocomplete suggestions are provided via a datalist populated by both hardcoded defaults and recent user entries from the backend
- **Data Integrity:** Prevents concurrent tracking of the exact same Project / Task combination
- **Secure Storage:** Uses user-specific Firestore collections for private data logging

## 2. Stack & Deployment

- The entire application resides in a single `index.html` file with zero build requirements

| Component  | Technology                                                    | Role                                |
| :--------- | :------------------------------------------------------------ | :---------------------------------- |
| Client     | HTML5, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js (CDN) | UI, logic, state, and visualization |
| Backend    | Google Cloud Firestore                                        | Serverless NoSQL persistence        |
| Deployment | Firebase Hosting                                              | Secure, global CDN delivery         |

## 3. Getting Started

- **Clone the Repository:**
  - `git clone [your-repo-url]`
  - `cd mttt-tracker`
- **Deployment:** Follow the instructions in the `DEPLOYMENT.md` file to quickly deploy this application to your Firebase environment

## 4. Detailed Guidance

- For a deep dive into the architecture, design rationale, and the remaining roadmap for integrating AI agents, please refer to the comprehensive `DEVELOPMENT_GUIDE.md`
