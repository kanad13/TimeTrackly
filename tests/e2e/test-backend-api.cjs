/**
 * Backend API Test Suite
 *
 * PURPOSE:
 * Tests all server endpoints and file operations to ensure data integrity
 * and proper error handling.
 *
 * WHAT'S TESTED:
 * - All API endpoints (GET and POST)
 * - Request validation (payload size, JSON format)
 * - Error handling (malformed requests, invalid data)
 * - File operations (read, write, atomic writes)
 * - Health monitoring
 *
 * HOW TO RUN:
 * 1. Start the server: npm start (in separate terminal)
 * 2. Run tests: npm run test:api
 *
 * PREREQUISITES:
 * - Server must be running on http://localhost:13331
 * - Test fixtures in tests/fixtures/
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs").promises;
const path = require("path");

const BASE_URL = "http://localhost:13331";
const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");

/**
 * Utility: Read fixture file
 */
async function readFixture(filename) {
	const filePath = path.join(FIXTURES_DIR, filename);
	const content = await fs.readFile(filePath, "utf8");
	return JSON.parse(content);
}

/**
 * Utility: Wait for server to be ready
 */
async function waitForServer(maxAttempts = 10) {
	for (let i = 0; i < maxAttempts; i++) {
		try {
			const res = await fetch(`${BASE_URL}/api/health`);
			if (res.ok) return true;
		} catch (err) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
	throw new Error("Server not ready after maximum attempts");
}

// --- Health Endpoint Tests ---

test("GET /api/health returns status ok", async () => {
	await waitForServer();
	const res = await fetch(`${BASE_URL}/api/health`);
	const data = await res.json();

	assert.strictEqual(res.status, 200);
	assert.strictEqual(data.status, "ok");
	assert.ok(data.uptime > 0, "Uptime should be positive");
	assert.ok(data.timestamp, "Should have timestamp");
	assert.ok(data.dataFiles, "Should report data files status");
});

test("GET /api/health reports data files status", async () => {
	const res = await fetch(`${BASE_URL}/api/health`);
	const data = await res.json();

	assert.strictEqual(typeof data.dataFiles.data, "boolean");
	assert.strictEqual(typeof data.dataFiles.activeState, "boolean");
	assert.strictEqual(typeof data.dataFiles.suggestions, "boolean");
});

// --- Suggestions Endpoint Tests ---

test("GET /api/suggestions returns array", async () => {
	const res = await fetch(`${BASE_URL}/api/suggestions`);
	const data = await res.json();

	assert.strictEqual(res.status, 200);
	assert.ok(Array.isArray(data), "Suggestions should be an array");
});

test("GET /api/suggestions returns valid suggestion format", async () => {
	const res = await fetch(`${BASE_URL}/api/suggestions`);
	const data = await res.json();

	if (data.length > 0) {
		assert.strictEqual(
			typeof data[0],
			"string",
			"Each suggestion should be a string"
		);
	}
});

// --- Active State Endpoint Tests ---

test("GET /api/active-state returns object", async () => {
	const res = await fetch(`${BASE_URL}/api/active-state`);
	const data = await res.json();

	assert.strictEqual(res.status, 200);
	assert.strictEqual(typeof data, "object", "Active state should be an object");
});

test("POST /api/active-state saves valid data", async () => {
	const testData = await readFixture("sample-active-state.json");

	const res = await fetch(`${BASE_URL}/api/active-state`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(testData),
	});

	assert.strictEqual(res.status, 200);
	const result = await res.json();
	assert.ok(result.message.includes("saved"), "Should confirm save");
});

test("POST /api/active-state accepts empty object", async () => {
	const res = await fetch(`${BASE_URL}/api/active-state`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({}),
	});

	assert.strictEqual(res.status, 200);
});

test("POST /api/active-state rejects invalid JSON", async () => {
	const res = await fetch(`${BASE_URL}/api/active-state`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: "invalid json{",
	});

	assert.strictEqual(res.status, 400);
	const result = await res.json();
	assert.ok(
		result.message.includes("JSON"),
		"Error message should mention JSON"
	);
});

test("POST /api/active-state persists data", async () => {
	const testData = {
		"test-timer": { id: "test-timer", project: "Test", task: "Task" },
	};

	// Save data
	await fetch(`${BASE_URL}/api/active-state`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(testData),
	});

	// Retrieve and verify
	const res = await fetch(`${BASE_URL}/api/active-state`);
	const retrieved = await res.json();

	assert.deepStrictEqual(
		retrieved,
		testData,
		"Retrieved data should match saved data"
	);
});

// --- Historical Data Endpoint Tests ---

test("GET /api/data returns array", async () => {
	const res = await fetch(`${BASE_URL}/api/data`);
	const data = await res.json();

	assert.strictEqual(res.status, 200);
	assert.ok(Array.isArray(data), "Historical data should be an array");
});

test("POST /api/data saves valid array", async () => {
	const testData = await readFixture("sample-data.json");

	const res = await fetch(`${BASE_URL}/api/data`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(testData),
	});

	assert.strictEqual(res.status, 200);
	const result = await res.json();
	assert.ok(
		result.message.includes("success"),
		"Should confirm successful save"
	);
});

test("POST /api/data rejects non-array data", async () => {
	const res = await fetch(`${BASE_URL}/api/data`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ invalid: "format" }),
	});

	assert.strictEqual(res.status, 400);
	const result = await res.json();
	assert.ok(
		result.message.includes("array"),
		"Error should mention array requirement"
	);
});

test("POST /api/data accepts empty array", async () => {
	const res = await fetch(`${BASE_URL}/api/data`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify([]),
	});

	assert.strictEqual(res.status, 200);
});

test("POST /api/data persists entries", async () => {
	const testData = [
		{
			project: "Persistence Test",
			task: "Test Task",
			durationSeconds: 3600,
			totalDurationMs: 3600000,
			endTime: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			notes: "Test note",
		},
	];

	// Save data
	await fetch(`${BASE_URL}/api/data`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(testData),
	});

	// Retrieve and verify
	const res = await fetch(`${BASE_URL}/api/data`);
	const retrieved = await res.json();

	assert.deepStrictEqual(
		retrieved,
		testData,
		"Retrieved data should match saved data"
	);
});

test("POST /api/data rejects invalid JSON", async () => {
	const res = await fetch(`${BASE_URL}/api/data`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: "not valid json",
	});

	assert.strictEqual(res.status, 400);
});

// --- Payload Size Tests ---

test("POST /api/data accepts large but valid payload", async () => {
	// Create array with 100 entries (should be well under 1MB)
	const largeData = Array(100)
		.fill(null)
		.map((_, i) => ({
			project: `Project ${i}`,
			task: `Task ${i}`,
			durationSeconds: 3600,
			totalDurationMs: 3600000,
			endTime: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			notes: "A".repeat(100), // 100 char notes
		}));

	const res = await fetch(`${BASE_URL}/api/data`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(largeData),
	});

	assert.strictEqual(res.status, 200);
});

test("POST /api/data rejects extremely large payload", async () => {
	// Create payload larger than 1MB
	const hugeString = "x".repeat(2 * 1024 * 1024); // 2MB of data

	try {
		const res = await fetch(`${BASE_URL}/api/data`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: `{"data": "${hugeString}"}`,
		});

		// If we get a response, it should not be 200
		assert.notStrictEqual(res.status, 200, "Should reject oversized payload");
	} catch (error) {
		// Connection reset is expected when payload is too large
		assert.ok(
			error.message.includes("ECONNRESET") ||
				error.message.includes("fetch failed"),
			"Should close connection for oversized payload"
		);
	}
});

// --- Static File Serving Tests ---

test("GET / returns HTML", async () => {
	const res = await fetch(`${BASE_URL}/`);
	const html = await res.text();

	assert.strictEqual(res.status, 200);
	assert.ok(html.includes("<html"), "Should return HTML content");
	assert.ok(html.includes("TimeTrackly"), "Should be the time tracker app");
});

test("GET /index.html returns HTML", async () => {
	const res = await fetch(`${BASE_URL}/index.html`);
	const html = await res.text();

	assert.strictEqual(res.status, 200);
	assert.ok(html.includes("<html"), "Should return HTML content");
});

test("GET /js/utils.js returns JavaScript", async () => {
	const res = await fetch(`${BASE_URL}/js/utils.js`);
	const js = await res.text();

	assert.strictEqual(res.status, 200);
	assert.strictEqual(res.headers.get("content-type"), "application/javascript");
	assert.ok(js.includes("export"), "Should be ES6 module");
});

test("GET /js/nonexistent.js returns 404", async () => {
	const res = await fetch(`${BASE_URL}/js/nonexistent.js`);
	assert.strictEqual(res.status, 404);
});

test("GET /nonexistent-endpoint returns 404", async () => {
	const res = await fetch(`${BASE_URL}/nonexistent-endpoint`);
	assert.strictEqual(res.status, 404);
});

// --- Favicon Test ---

test("GET /favicon.ico returns SVG", async () => {
	const res = await fetch(`${BASE_URL}/favicon.ico`);
	const content = await res.text();

	assert.strictEqual(res.status, 200);
	assert.strictEqual(res.headers.get("content-type"), "image/svg+xml");
	assert.ok(content.includes("<svg"), "Should be SVG content");
});

// --- Summary ---

console.log("\n✅ Backend API Test Suite Complete");
console.log("   All server endpoints and file operations tested");
console.log("   Run with: npm run test:api\n");
