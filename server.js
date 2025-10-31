// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 13331; // Using a 5-digit port to avoid common conflicts
const DATA_FILE_PATH = path.join(__dirname, "mtt-data.json");
const ACTIVE_STATE_PATH = path.join(__dirname, "mtt-active-state.json");
const SUGGESTIONS_PATH = path.join(__dirname, "mtt-suggestions.json");

// --- Pre-flight Check: Ensure data file exists on startup ---
const initializeDataFile = () => {
	if (fs.existsSync(DATA_FILE_PATH)) {
		console.log("✅ Data file 'mtt-data.json' already exists.");
		return;
	}
	try {
		console.log("Data file not found. Creating a new empty data file.");
		fs.writeFileSync(DATA_FILE_PATH, "[]", "utf8");
		console.log("✅ Successfully created 'mtt-data.json'.");
	} catch (error) {
		console.error("❌ CRITICAL ERROR: Could not create data file.", error);
		process.exit(1);
	}
};

// --- Pre-flight Check: Ensure active state file exists on startup ---
const initializeActiveStateFile = () => {
	if (fs.existsSync(ACTIVE_STATE_PATH)) {
		console.log("✅ Active state file 'mtt-active-state.json' already exists.");
		return;
	}
	try {
		console.log("Creating new empty active state file...");
		fs.writeFileSync(ACTIVE_STATE_PATH, "{}", "utf8"); // Default to an empty object
		console.log("✅ Successfully created 'mtt-active-state.json'.");
	} catch (error) {
		console.error(
			"❌ CRITICAL ERROR: Could not create active state file.",
			error
		);
		process.exit(1);
	}
};

// --- Pre-flight Check: Ensure suggestions file exists on startup ---
const initializeSuggestionsFile = () => {
	if (fs.existsSync(SUGGESTIONS_PATH)) {
		console.log("✅ Suggestions file 'mtt-suggestions.json' already exists.");
		return;
	}
	try {
		console.log("Creating new suggestions file with default values...");
		const defaultSuggestions = [
			"Project Gemini / Coding",
			"Project Gemini / Documentation",
			"Internal Admin / Meetings",
			"Internal Admin / Email Response",
			"Client X / Proposal Draft",
			"Learning / Tutorial Videos",
		];
		fs.writeFileSync(
			SUGGESTIONS_PATH,
			JSON.stringify(defaultSuggestions, null, 2),
			"utf8"
		);
		console.log("✅ Successfully created 'mtt-suggestions.json'.");
	} catch (error) {
		console.error(
			"❌ CRITICAL ERROR: Could not create suggestions file.",
			error
		);
		process.exit(1);
	}
};

// --- Initialize all necessary files before starting the server ---
initializeDataFile();
initializeActiveStateFile();
initializeSuggestionsFile();

const server = http.createServer((req, res) => {
	// --- API Endpoint: /api/suggestions ---
	if (req.url === "/api/suggestions" && req.method === "GET") {
		fs.readFile(SUGGESTIONS_PATH, "utf8", (err, data) => {
			if (err) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ message: "Error reading suggestions file" }));
				return;
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(data);
		});
		return;
	}

	// --- API Endpoint: /api/active-state ---
	if (req.url === "/api/active-state") {
		// GET: Read and return the active state file
		if (req.method === "GET") {
			fs.readFile(ACTIVE_STATE_PATH, "utf8", (err, data) => {
				if (err) {
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({ message: "Error reading active state file" })
					);
					return;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(data);
			});
		}
		// POST: Receive new active state and overwrite the file
		else if (req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => (body += chunk.toString()));
			req.on("end", () => {
				fs.writeFile(ACTIVE_STATE_PATH, body, "utf8", (err) => {
					if (err) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({ message: "Error writing to active state file" })
						);
						return;
					}
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Active state saved" }));
				});
			});
		}
		return;
	}

	// --- API Endpoint: /api/data ---
	if (req.url === "/api/data") {
		// GET: Read and return all historical data from the JSON file.
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
		// POST: Receive new data and overwrite the historical data file.
		else if (req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => (body += chunk.toString()));
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

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\nShutting down server...");
	server.close(() => {
		console.log("Server shut down successfully.");
		process.exit(0);
	});
});
