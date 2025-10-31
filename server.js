/**
 * MTTT Local Server - Multi-Task Time Tracker Backend
 *
 * ARCHITECTURE OVERVIEW:
 * This is a simple, local-only Node.js HTTP server designed for single-user operation.
 * It serves as the data persistence layer for the time tracking application, handling
 * all file I/O operations for JSON-based data storage.
 *
 * DESIGN PHILOSOPHY - Single-User, Local-First:
 * - NO authentication or user management (single-user system)
 * - NO database (direct JSON file I/O)
 * - NO external dependencies (uses only Node.js built-ins)
 * - Simple file locking (no distributed locks needed)
 * - Local-only binding (127.0.0.1 for security)
 *
 * KEY RESPONSIBILITIES:
 * 1. Serve static frontend files (index.html, JS modules)
 * 2. Manage three JSON data files:
 *    - mtt-data.json: Historical time entries (append-only in practice)
 *    - mtt-active-state.json: Currently running timers (frequent updates)
 *    - mtt-suggestions.json: User-editable task suggestions
 * 3. Ensure data integrity via atomic writes
 * 4. Provide health monitoring endpoint
 *
 * CRITICAL DESIGN DECISIONS:
 * - Atomic writes: Use temp file + rename to prevent corruption on crashes
 * - File locking: Prevent concurrent writes (rare with single user, but possible)
 * - Request validation: Limit payload size to prevent accidental data issues
 * - Structured logging: JSON format for easy parsing and debugging
 *
 * MAINTAINABILITY NOTES:
 * - All file operations use async/await for clarity
 * - Error handling provides specific context for debugging
 * - Environment variables allow configuration without code changes
 * - Health endpoint enables quick diagnostics
 *
 * @module server
 */

const http = require("http");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

// --- Configuration (can be overridden by environment variables) ---
const PORT = process.env.PORT || 13331;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE_PATH = path.join(DATA_DIR, "mtt-data.json");
const ACTIVE_STATE_PATH = path.join(DATA_DIR, "mtt-active-state.json");
const SUGGESTIONS_PATH = path.join(DATA_DIR, "mtt-suggestions.json");
const LOCK_FILE_PATH = path.join(DATA_DIR, "mtt-data.lock");
const MAX_PAYLOAD_SIZE = 1048576; // 1MB

// --- Logging Utility ---
const log = {
	info: (msg, meta = {}) => {
		console.log(
			JSON.stringify({
				level: "INFO",
				timestamp: new Date().toISOString(),
				message: msg,
				...meta,
			})
		);
	},
	error: (msg, meta = {}) => {
		console.error(
			JSON.stringify({
				level: "ERROR",
				timestamp: new Date().toISOString(),
				message: msg,
				...meta,
			})
		);
	},
	warn: (msg, meta = {}) => {
		console.warn(
			JSON.stringify({
				level: "WARN",
				timestamp: new Date().toISOString(),
				message: msg,
				...meta,
			})
		);
	},
};

// --- File Locking Utility ---
const acquireLock = async (timeout = 5000) => {
	const startTime = Date.now();
	while (fsSync.existsSync(LOCK_FILE_PATH)) {
		if (Date.now() - startTime > timeout) {
			throw new Error("Could not acquire file lock: timeout");
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	await fs.writeFile(LOCK_FILE_PATH, process.pid.toString());
};

const releaseLock = async () => {
	try {
		if (fsSync.existsSync(LOCK_FILE_PATH)) {
			await fs.unlink(LOCK_FILE_PATH);
		}
	} catch (error) {
		log.warn("Failed to release lock", { error: error.message });
	}
};

// --- Atomic File Write Utility ---
/**
 * Writes data to a file atomically using temp file + rename pattern.
 *
 * WHY ATOMIC WRITES MATTER:
 * Without atomic writes, if the process crashes during file.writeFile(), the file
 * can be left in a partially written state (corrupted). This is catastrophic for
 * JSON files which must be perfectly formatted to parse correctly.
 *
 * HOW IT WORKS:
 * 1. Write data to a temporary file (filename.tmp)
 * 2. If successful, rename temp file to target filename
 * 3. The rename operation is atomic at the OS level
 *
 * Result: Either the old file exists (if crash before rename) or the new file
 * exists (if crash after rename). Never a partially-written file.
 *
 * SINGLE-USER CONTEXT:
 * File locking prevents concurrent writes. While rare with single user, it's
 * possible if user manually triggers multiple saves rapidly, or if a server
 * restart occurs during a save operation.
 *
 * IMPACT: If you remove atomic writes, data corruption becomes likely during
 * system crashes, power failures, or forced shutdowns.
 *
 * @param {string} filePath - Target file path
 * @param {string} data - Data to write
 * @throws {Error} If write operation fails
 */
const writeFileAtomic = async (filePath, data) => {
	const tempPath = `${filePath}.tmp`;
	try {
		await acquireLock();
		await fs.writeFile(tempPath, data, "utf8");
		await fs.rename(tempPath, filePath);
		log.info("File written atomically", { filePath });
	} catch (error) {
		// Clean up temp file if it exists
		try {
			if (fsSync.existsSync(tempPath)) {
				await fs.unlink(tempPath);
			}
		} catch (cleanupError) {
			log.warn("Failed to cleanup temp file", { tempPath });
		}
		throw error;
	} finally {
		await releaseLock();
	}
};

// --- Request Validation Utility ---
/**
 * Validates and parses JSON body from request with size limits.
 *
 * WHY VALIDATION MATTERS:
 * Even in a single-user, local context, validation prevents:
 * 1. Accidental corruption from malformed requests
 * 2. Resource exhaustion from accidentally large payloads
 * 3. Clear error messages for debugging
 *
 * PAYLOAD SIZE LIMIT (1MB):
 * - Typical active state: ~1-10KB for dozens of timers
 * - Typical historical data: ~100KB for thousands of entries
 * - 1MB limit provides 10-100x safety margin
 * - Prevents accidental infinite loops or bugs from filling disk
 *
 * SINGLE-USER CONTEXT:
 * This isn't protection against malicious users (there are none), but against
 * bugs in the frontend code or accidental data issues.
 *
 * @param {http.IncomingMessage} req - Request object
 * @param {number} maxSize - Maximum payload size in bytes
 * @returns {Promise<any>} Parsed JSON object
 * @throws {Error} If payload too large, invalid JSON, or request error
 */
const validateJsonBody = (req, maxSize = MAX_PAYLOAD_SIZE) => {
	return new Promise((resolve, reject) => {
		let body = "";
		let size = 0;

		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > maxSize) {
				reject({
					statusCode: 413,
					message: "Payload too large",
				});
				req.connection.destroy();
				return;
			}
			body += chunk.toString();
		});

		req.on("end", () => {
			try {
				const parsed = JSON.parse(body);
				resolve(parsed);
			} catch (err) {
				reject({
					statusCode: 400,
					message: "Invalid JSON format",
				});
			}
		});

		req.on("error", (err) => {
			reject({
				statusCode: 500,
				message: "Request error",
				error: err.message,
			});
		});
	});
};

// --- Pre-flight Check: Ensure data file exists on startup ---
const initializeDataFile = async () => {
	try {
		await fs.access(DATA_FILE_PATH);
		log.info("Data file already exists", { path: DATA_FILE_PATH });
	} catch {
		log.info("Creating new data file", { path: DATA_FILE_PATH });
		await writeFileAtomic(DATA_FILE_PATH, "[]");
		log.info("Successfully created data file");
	}
};

// --- Pre-flight Check: Ensure active state file exists on startup ---
const initializeActiveStateFile = async () => {
	try {
		await fs.access(ACTIVE_STATE_PATH);
		log.info("Active state file already exists", { path: ACTIVE_STATE_PATH });
	} catch {
		log.info("Creating new active state file", { path: ACTIVE_STATE_PATH });
		await writeFileAtomic(ACTIVE_STATE_PATH, "{}");
		log.info("Successfully created active state file");
	}
};

// --- Pre-flight Check: Ensure suggestions file exists on startup ---
const initializeSuggestionsFile = async () => {
	try {
		await fs.access(SUGGESTIONS_PATH);
		log.info("Suggestions file already exists", { path: SUGGESTIONS_PATH });
	} catch {
		log.info("Creating new suggestions file", { path: SUGGESTIONS_PATH });
		const defaultSuggestions = [
			"Project Gemini / Coding",
			"Project Gemini / Documentation",
			"Internal Admin / Meetings",
			"Internal Admin / Email Response",
			"Client X / Proposal Draft",
			"Learning / Tutorial Videos",
		];
		await writeFileAtomic(
			SUGGESTIONS_PATH,
			JSON.stringify(defaultSuggestions, null, 2)
		);
		log.info("Successfully created suggestions file");
	}
};

// --- Initialize all necessary files before starting the server ---
const initializeAllFiles = async () => {
	try {
		await initializeDataFile();
		await initializeActiveStateFile();
		await initializeSuggestionsFile();
		return true;
	} catch (error) {
		log.error("CRITICAL: Failed to initialize files", { error: error.message });
		return false;
	}
};

// --- HTTP Request Handler ---
const requestHandler = async (req, res) => {
	try {
		// --- API Endpoint: /api/health ---
		if (req.url === "/api/health" && req.method === "GET") {
			const health = {
				status: "ok",
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				dataFiles: {
					data: fsSync.existsSync(DATA_FILE_PATH),
					activeState: fsSync.existsSync(ACTIVE_STATE_PATH),
					suggestions: fsSync.existsSync(SUGGESTIONS_PATH),
				},
			};
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(health, null, 2));
			return;
		}

		// --- API Endpoint: /api/suggestions ---
		if (req.url === "/api/suggestions" && req.method === "GET") {
			try {
				const data = await fs.readFile(SUGGESTIONS_PATH, "utf8");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(data);
			} catch (error) {
				log.error("Error reading suggestions file", { error: error.message });
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ message: "Error reading suggestions file" }));
			}
			return;
		}

		// --- API Endpoint: /api/active-state ---
		if (req.url === "/api/active-state") {
			// GET: Read and return the active state file
			if (req.method === "GET") {
				try {
					const data = await fs.readFile(ACTIVE_STATE_PATH, "utf8");
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(data);
				} catch (error) {
					log.error("Error reading active state file", {
						error: error.message,
					});
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({ message: "Error reading active state file" })
					);
				}
				return;
			}

			// POST: Receive new active state and overwrite the file
			if (req.method === "POST") {
				try {
					const data = await validateJsonBody(req);
					await writeFileAtomic(
						ACTIVE_STATE_PATH,
						JSON.stringify(data, null, 2)
					);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Active state saved" }));
					log.info("Active state saved successfully");
				} catch (error) {
					const statusCode = error.statusCode || 500;
					const message = error.message || "Error writing to active state file";
					log.error("Error saving active state", { error: message });
					res.writeHead(statusCode, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message }));
				}
				return;
			}
		}

		// --- API Endpoint: /api/data ---
		if (req.url === "/api/data") {
			// GET: Read and return all historical data from the JSON file.
			if (req.method === "GET") {
				try {
					const data = await fs.readFile(DATA_FILE_PATH, "utf8");
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(data);
				} catch (error) {
					log.error("Error reading data file", { error: error.message });
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Error reading data file" }));
				}
				return;
			}

			// POST: Receive new data and overwrite the historical data file.
			if (req.method === "POST") {
				try {
					const data = await validateJsonBody(req);

					// Basic validation: ensure it's an array
					if (!Array.isArray(data)) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ message: "Data must be an array" }));
						return;
					}

					await writeFileAtomic(DATA_FILE_PATH, JSON.stringify(data, null, 2));
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Data saved successfully" }));
					log.info("Historical data saved successfully", {
						entriesCount: data.length,
					});
				} catch (error) {
					const statusCode = error.statusCode || 500;
					const message = error.message || "Error writing to data file";
					log.error("Error saving data", { error: message });
					res.writeHead(statusCode, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message }));
				}
				return;
			}
		}

		// --- Static File Server: Serve index.html ---
		if (req.url === "/" || req.url === "/index.html") {
			try {
				const content = await fs.readFile(path.join(__dirname, "index.html"));
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(content);
			} catch (error) {
				log.error("Error loading index.html", { error: error.message });
				res.writeHead(500);
				res.end("Critical Error: Could not load index.html");
			}
			return;
		}

		// --- Static File Server: Serve JS modules ---
		if (req.url.startsWith("/js/") && req.url.endsWith(".js")) {
			try {
				const filePath = path.join(__dirname, req.url);
				const content = await fs.readFile(filePath, "utf8");
				res.writeHead(200, { "Content-Type": "application/javascript" });
				res.end(content);
			} catch (error) {
				log.error("Error loading JS module", {
					error: error.message,
					url: req.url,
				});
				res.writeHead(404);
				res.end("JS module not found");
			}
			return;
		}

		// --- 404 Not Found for any other request ---
		res.writeHead(404, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ message: "Endpoint not found" }));
	} catch (error) {
		// Catch-all error handler for unexpected errors
		log.error("Unexpected error in request handler", {
			error: error.message,
			stack: error.stack,
		});
		if (!res.headersSent) {
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ message: "Internal server error" }));
		}
	}
};

// --- Main Server Initialization ---
const startServer = async () => {
	// Initialize all files before starting
	const initialized = await initializeAllFiles();
	if (!initialized) {
		log.error("Failed to initialize files. Exiting.");
		process.exit(1);
	}

	// Clean up any stale lock file
	await releaseLock();

	const server = http.createServer(requestHandler);

	server.listen(PORT, "127.0.0.1", () => {
		log.info("MTTT Server started successfully", {
			port: PORT,
			url: `http://localhost:${PORT}`,
		});
		console.log(`✅ MTTT Server is running.`);
		console.log(
			`   Open your browser and navigate to http://localhost:${PORT}`
		);
	});

	// Graceful shutdown
	const shutdown = async (signal) => {
		log.info("Shutdown signal received", { signal });
		console.log(`\nShutting down server (${signal})...`);

		// Clean up lock file
		await releaseLock();

		server.close(() => {
			log.info("Server shut down successfully");
			console.log("Server shut down successfully.");
			process.exit(0);
		});

		// Force exit after 5 seconds if graceful shutdown fails
		setTimeout(() => {
			log.error("Forced shutdown after timeout");
			console.error("Forced shutdown after timeout");
			process.exit(1);
		}, 5000);
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));

	// Handle uncaught errors
	process.on("uncaughtException", (error) => {
		log.error("Uncaught exception", {
			error: error.message,
			stack: error.stack,
		});
		shutdown("uncaughtException");
	});

	process.on("unhandledRejection", (reason, promise) => {
		log.error("Unhandled rejection", { reason, promise });
	});
};

// Start the server
startServer().catch((error) => {
	log.error("Failed to start server", { error: error.message });
	console.error("Failed to start server:", error);
	process.exit(1);
});
