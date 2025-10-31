# Migration Plan: Firebase to Local Node.js Server

## 1. Executive Summary & Goal

**Objective:** To migrate the Multi-Task Time Tracker (MTTT) application from its current Firebase-dependent, serverless architecture to a self-contained, local client-server model.

**Rationale:** This migration will eliminate all external cloud dependencies, ensure the application is 100% private, and provide universal browser compatibility (especially for Safari) by using a local Node.js server for data persistence instead of browser-specific APIs. The "single-file mandate" will be retired in favor of this more robust and cross-browser compatible approach.

**End State:** The project will consist of a frontend (`index.html`) and a backend (a simple `server.js` file) that communicate locally. All time-tracking data will be stored in a human-readable `mtt-data.json` file in the project's root directory.

## 2. New Project Structure

The final project directory will be structured as follows:

```
mttt-tracker/
├── index.html          # (Modified) The application frontend.
├── server.js           # (New) The Node.js micro-server for data I/O.
├── package.json        # (New) Defines project scripts and dependencies.
├── mtt-data.json       # (Generated) The local database file.
├── architecture.md     # (Updated)
├── deployment.md       # (Updated)
└── readme.md           # (Updated)
```

## 3. Step-by-Step Migration Tasks

### Task 1: Create New File: `server.js`

This file is the new backend. It will serve `index.html` and provide API endpoints for reading/writing data.

```javascript
// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DATA_FILE_PATH = path.join(__dirname, "mtt-data.json");

// --- Pre-flight Check: Ensure data file exists on startup ---
// This prevents errors on the very first run.
if (!fs.existsSync(DATA_FILE_PATH)) {
	console.log("Data file not found. Creating 'mtt-data.json'...");
	fs.writeFileSync(DATA_FILE_PATH, "[]", "utf8");
}

const server = http.createServer((req, res) => {
	// --- API Endpoint: /api/data ---
	if (req.url === "/api/data") {
		// GET: Read and return all data from the JSON file.
		if (req.method === "GET") {
			fs.readFile(DATA_FILE_PATH, "utf8", (err, data) => {
				if (err) {
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Error reading data file" }));
					return;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(data);
			});
		}
		// POST: Receive new data and overwrite the JSON file.
		else if (req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk.toString();
			});
			req.on("end", () => {
				fs.writeFile(DATA_FILE_PATH, body, "utf8", (err) => {
					if (err) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ message: "Error writing to data file" }));
						return;
					}
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Data saved successfully" }));
				});
			});
		}
		return;
	}

	// --- Static File Server: Serve index.html ---
	if (req.url === "/" || req.url === "/index.html") {
		fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
			if (err) {
				res.writeHead(500);
				res.end("Critical Error: Could not load index.html");
				return;
			}
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(content);
		});
		return;
	}

	// --- 404 Not Found for any other request ---
	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ message: "Endpoint not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
	console.log(`✅ MTTT Server is running.`);
	console.log(`   Open your browser and navigate to http://localhost:${PORT}`);
});
```

### Task 2: Create New File: `package.json`

This file manages the project's dependencies and defines the start script.

```json
{
	"name": "mttt-local-tracker",
	"version": "1.0.0",
	"description": "Multi-Task Time Tracker with local file persistence.",
	"main": "server.js",
	"scripts": {
		"start": "node server.js",
		"test": "echo \"Error: no test specified\" && exit 1"
	},
	"author": "",
	"license": "ISC",
	"keywords": ["time-tracker"]
}
```

### Task 3: Modify `index.html`

This is the most significant change. The entire Firebase logic will be replaced with calls to our local server.

1.  **Remove the Firebase `<script>` block.** Delete the entire block from `<script type="module">` to `</script>`.

2.  **Add the new JavaScript logic.** Insert the following script tag at the end of the `<body>` section. This script will handle all application logic and communication with `server.js`.

```html
<script>
	// --- Global State ---
	let historicalEntries = []; // This will hold all data from mtt-data.json
	let activeTimers = {}; // { uuid: { ... } }
	let timerInterval = null;
	let activeChartInstances = [];

	// --- DOM Element References ---
	// (Copy all existing element references here, e.g., topicInput, startButton, etc.)
	const topicInput = document.getElementById("topic-input");
	const startButton = document.getElementById("start-button");
	// ... and so on for all other elements.

	// --- API Communication Layer ---
	const loadDataFromServer = async () => {
		try {
			const response = await fetch("/api/data");
			if (!response.ok) {
				throw new Error(`Server responded with ${response.status}`);
			}
			const data = await response.json();
			historicalEntries = data.map((entry) => ({
				...entry,
				endTime: new Date(entry.endTime), // Convert ISO string back to Date object
			}));
		} catch (error) {
			console.error("FATAL: Could not load data from server.", error);
			document.getElementById(
				"app"
			).innerHTML = `<div class='text-red-600 text-center p-8'><h1>Connection Error</h1><p>Could not connect to the local server. Is it running? Please start the server and refresh the page.</p></div>`;
		}
	};

	const saveDataToServer = async () => {
		try {
			await fetch("/api/data", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(historicalEntries, null, 2),
			});
		} catch (error) {
			console.error("Error saving data:", error);
			// Optionally show a "failed to save" UI indicator
		}
	};

	// --- Core Application Logic (Modified) ---

	// **MODIFY `stopTimer` function:**
	// Replace the `try...catch` block containing `addDoc` with the new logic.
	const stopTimer = async (id) => {
		const activity = activeTimers[id];
		if (!activity) return;

		const finalDurationMs = calculateElapsedMs(activity);
		const durationSeconds = Math.round(finalDurationMs / 1000);

		if (durationSeconds <= 0) {
			/* ... (no changes here) ... */
		}

		const endTime = new Date();

		delete activeTimers[id];
		saveActiveTimers();
		renderActiveTimers();

		const newEntry = {
			project: activity.project,
			task: activity.task,
			totalDurationMs: finalDurationMs,
			durationSeconds: durationSeconds,
			endTime: endTime.toISOString(), // Save as ISO string for JSON compatibility
			createdAt: new Date().toISOString(),
		};

		// --- REPLACEMENT LOGIC START ---
		historicalEntries.push(newEntry);
		await saveDataToServer();

		const tempStatus = document.createElement("p");
		// ... (the rest of the UI feedback logic remains the same)
		tempStatus.textContent = `Saved ${activity.project} / ${
			activity.task
		} (${formatDuration(durationSeconds)})`;
		// ...
		fetchRecentActivities(); // This will now read from the in-memory array
		// --- REPLACEMENT LOGIC END ---
	};

	// **MODIFY `fetchRecentActivities` function:**
	// This function no longer needs to be async or fetch from a DB.
	const fetchRecentActivities = () => {
		const activities = new Set();
		historicalEntries.forEach((entry) => {
			if (entry.project && entry.task) {
				activities.add(`${entry.project.trim()} / ${entry.task.trim()}`);
			}
		});
		populateSuggestions(Array.from(activities));
	};

	// **MODIFY `renderReportsView` function:**
	// This function no longer needs to be async or fetch from a DB.
	const renderReportsView = () => {
		// ... (remove the try/catch and getDocs block) ...
		const allEntries = historicalEntries; // Use the global array directly
		// ... (The rest of the chart generation logic remains the same) ...
	};

	// **MODIFY `exportData` function:**
	// This function no longer needs to be async or fetch from a DB.
	const exportData = () => {
		// ... (remove the try/catch and getDocs block) ...
		let data = historicalEntries.map((entry) => {
			/* ... (existing mapping logic) ... */
		});
		// ... (The rest of the CSV generation logic remains the same) ...
	};

	// --- Initialization ---
	const initializeApp = async () => {
		userIdDisplay.textContent = "Status: Local Mode";
		startButton.addEventListener("click", startNewTimer);
		exportButton.addEventListener("click", exportData);

		await loadDataFromServer(); // Load initial data

		loadActiveTimers(); // Load running timers from localStorage
		fetchRecentActivities(); // Populate suggestions
	};

	// --- Paste all other helper functions here ---
	// (generateUUID, formatDuration, getRunningTasksKey, calculateElapsedMs, etc.)
	// (saveActiveTimers, loadActiveTimers, renderActiveTimers, startNewTimer, etc.)
	// They do not need modification, just need to be included inside this script tag.

	initializeApp();
</script>
```

### Task 4: Update Documentation Files

#### 4.1. `architecture.md`

- **Section 1 (Architectural Constraints):** Replace this entire section.
  - **New Architecture:** "Local Client-Server Model".
  - **Frontend:** The single `index.html` file containing all UI and application logic.
  - **Backend:** A local Node.js micro-server (`server.js`) responsible for file I/O.
  - **Data Persistence:** A single `mtt-data.json` file in the project root, acting as the local database.
- **Section 1.2 (Data Persistence and Security):** Replace the Firestore details with the structure of the `mtt-data.json` file. Note that timestamps are stored as ISO 8601 strings.
- **Section 3 (AI Agent Development Roadmap):** Mark P4 (Query Optimization) as "Obsolete," as file-based storage removes this concern.

#### 4.2. `deployment.md`

- **Rename the file to `local_setup.md`.**
- **Rewrite the entire content** to reflect the new local setup process.

```markdown
# Local Setup and Execution Guide

The Multi-Task Time Tracker (MTTT) now runs as a local application on your machine using Node.js. This ensures your data remains private and provides a consistent experience across all browsers.

## 1. Prerequisites

- **Node.js:** You must have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

## 2. First-Time Setup

1.  **Open Terminal:** Navigate to the project directory (`mttt-tracker`) in your terminal or command prompt.
2.  **Install Dependencies:** Run the following command. (Note: This project has no external dependencies, but this is a standard step).
    `npm install`

## 3. Running the Application

There are two ways to run the server:

### A) Standard Mode (Recommended for general use)

1.  **Start the Server:** In your terminal, run:
    `npm start`
2.  **Access the App:** Open your web browser and navigate to `http://localhost:3000`.
3.  To stop the server, go back to the terminal and press `Ctrl + C`.

### B) Background Mode with PM2 (For continuous use)

PM2 is a process manager for Node.js that will keep your server running in the background. This is a "fire-and-forget" solution.

1.  **Install PM2 (One-time only):**
    `npm install pm2 -g`

2.  **Start the Server with PM2:** In the project directory, run:
    `pm2 start server.js --name "mttt-tracker"`

3.  **Manage the Process:**

    - **View Status:** `pm2 list`
    - **Stop the Server:** `pm2 stop mttt-tracker`
    - **Restart the Server:** `pm2 restart mttt-tracker`
    - **View Logs:** `pm2 logs mttt-tracker`

4.  **Save the Process:** To make PM2 automatically restart the server after a system reboot, run:
    `pm2 save`
```

#### 4.3. `readme.md`

- **Section 2 (Stack & Deployment):** Update the technology table.

| Component  | Technology                                                    | Role                                |
| :--------- | :------------------------------------------------------------ | :---------------------------------- |
| Client     | HTML5, Vanilla JavaScript, Tailwind CSS (CDN), Chart.js (CDN) | UI, logic, state, and visualization |
| Backend    | Node.js (with built-in `http` and `fs` modules)               | Local web server and file I/O       |
| Database   | Local `mtt-data.json` file                                    | JSON-based file persistence         |
| Deployment | Local Machine Execution                                       | Run via `npm start`                 |

- **Section 3 (Getting Started):** Replace the content with instructions to run `npm install` and then `npm start`, and to refer to `local_setup.md` for details.
