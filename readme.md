# Multi-Task Time Tracker (MTTT)

- The Multi-Task Time Tracker (MTTT) is a highly portable, single-file web application for tracking time across multiple hierarchical activities (Project / Task)
- It provides real-time monitoring, secure data persistence in your own Google Sheet, and flexible data visualization options

## 1. Features at a Glance

- **Hierarchical Tracking:** Tasks are grouped under a single, collapsible Project header for organization
- **Essential Controls:** Ability to Start, Pause, Resume, Stop (Save), and Delete (Discard) active tasks
- **In-App Analytics (NEW):** A dedicated Reports tab provides real-time visualizations, including Project Time Distribution and Daily Time Logged charts
- **Smart Input:** Autocomplete suggestions are provided via a datalist populated by both hardcoded defaults and recent user entries from your Google Sheet
- **Data Integrity:** Prevents concurrent tracking of the exact same Project / Task combination
- **User-Owned Data:** All tracking data is stored in YOUR Google Sheet, giving you complete ownership and control

## 2. Stack & Deployment

- The entire application resides in a single `index.html` file with zero build requirements

| Component  | Technology                                                    | Role                                         |
| :--------- | :------------------------------------------------------------ | :------------------------------------------- |
| Client     | HTML5, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js (CDN) | UI, logic, state, and visualization          |
| Backend    | Google Sheets API                                             | User-owned data persistence in Google Sheets |
| Auth       | Google OAuth 2.0                                              | Secure authentication and authorization      |
| Deployment | Firebase Hosting                                              | Secure, global CDN delivery with HTTPS       |

## 3. Getting Started

- **Clone the Repository:**
  - `git clone [your-repo-url]`
  - `cd mttt-tracker`
- **Setup and Deployment:** Follow the comprehensive instructions in `setup-and-deployment.md` to:
  1. Configure your Google Cloud project and APIs
  2. Set up OAuth authentication
  3. Create your Google Sheet
  4. Configure the application with your credentials
  5. Deploy to Firebase Hosting

## 4. Detailed Guidance

- For a deep dive into the architecture, design rationale, and the remaining roadmap for integrating AI agents, please refer to the comprehensive `architecture.md`
