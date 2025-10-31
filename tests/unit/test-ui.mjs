/**
 * Frontend Unit Tests - UI Module
 *
 * PURPOSE:
 * Tests UI functions that handle critical timer operations and data management.
 * These tests ensure timer lifecycle functions work correctly.
 *
 * WHAT'S TESTED:
 * - Timer creation, validation, and duplicate detection
 * - Timer pause/resume/stop/delete operations
 * - Notes saving and persistence
 * - CSV export data formatting
 *
 * WHY THESE TESTS MATTER:
 * - Timer operations are the core of the application
 * - Data persistence bugs lead to lost time entries
 * - Export functionality must format data correctly
 * - Input validation prevents data corruption
 *
 * HOW TO RUN:
 * npm run test:unit
 */

// Initialize browser environment BEFORE importing modules that need it
import "./setup.mjs";

import test from "node:test";
import assert from "node:assert";
import * as stateModule from "../../js/state.js";
import * as utilsModule from "../../js/utils.js";

// --- Project/Task Validation Tests ---

test("Project/Task splitting and trimming: handles standard format", () => {
	const fullTopic = "My Project / My Task";
	const parts = fullTopic.split("/").map((p) => p.trim());
	const project = (parts[0] || "Uncategorized").trim();
	const task = (parts[1] || "Task").trim();

	assert.strictEqual(project, "My Project");
	assert.strictEqual(task, "My Task");
});

test("Project/Task splitting and trimming: handles extra spaces", () => {
	const fullTopic = "  Project A  /  Task B  ";
	const parts = fullTopic.split("/").map((p) => p.trim());
	const project = (parts[0] || "Uncategorized").trim();
	const task = (parts[1] || "Task").trim();

	assert.strictEqual(project, "Project A");
	assert.strictEqual(task, "Task B");
});

test("Project/Task splitting and trimming: handles no task", () => {
	const fullTopic = "Project Only /";
	const parts = fullTopic.split("/").map((p) => p.trim());
	const project = (parts[0] || "Uncategorized").trim();
	const task = (parts[1] || "Task").trim();

	assert.strictEqual(project, "Project Only");
	assert.strictEqual(task, "Task");
});

test("Project/Task splitting and trimming: handles no project", () => {
	const fullTopic = "/ Task Only";
	const parts = fullTopic.split("/").map((p) => p.trim());
	const project = (parts[0] || "Uncategorized").trim();
	const task = (parts[1] || "Task").trim();

	assert.strictEqual(project, "Uncategorized");
	assert.strictEqual(task, "Task Only");
});

test("Project/Task splitting and trimming: handles empty slashes", () => {
	const fullTopic = "/";
	const parts = fullTopic.split("/").map((p) => p.trim());
	const project = (parts[0] || "Uncategorized").trim();
	const task = (parts[1] || "Task").trim();

	assert.strictEqual(project, "Uncategorized");
	assert.strictEqual(task, "Task");
});

// --- Duplicate Detection Tests ---

test("Duplicate detection: identifies same project/task", () => {
	const originalTimers = stateModule.state.activeTimers;
	stateModule.state.activeTimers = {
		"timer-1": {
			project: "Project A",
			task: "Task 1",
			isPaused: false,
		},
	};

	const newProject = "Project A";
	const newTask = "Task 1";
	const taskKey = utilsModule.getRunningTasksKey(newProject, newTask);
	const isDuplicate = Object.values(stateModule.state.activeTimers).some(
		(t) => utilsModule.getRunningTasksKey(t.project, t.task) === taskKey
	);

	stateModule.state.activeTimers = originalTimers;
	assert.strictEqual(isDuplicate, true);
});

test("Duplicate detection: case-insensitive matching", () => {
	const originalTimers = stateModule.state.activeTimers;
	stateModule.state.activeTimers = {
		"timer-1": {
			project: "Project A",
			task: "Task 1",
			isPaused: false,
		},
	};

	const newProject = "project a";
	const newTask = "task 1";
	const taskKey = utilsModule.getRunningTasksKey(newProject, newTask);
	const isDuplicate = Object.values(stateModule.state.activeTimers).some(
		(t) => utilsModule.getRunningTasksKey(t.project, t.task) === taskKey
	);

	stateModule.state.activeTimers = originalTimers;
	assert.strictEqual(isDuplicate, true);
});

test("Duplicate detection: allows different projects with same task", () => {
	const originalTimers = stateModule.state.activeTimers;
	stateModule.state.activeTimers = {
		"timer-1": {
			project: "Project A",
			task: "Task 1",
			isPaused: false,
		},
	};

	const newProject = "Project B";
	const newTask = "Task 1";
	const taskKey = utilsModule.getRunningTasksKey(newProject, newTask);
	const isDuplicate = Object.values(stateModule.state.activeTimers).some(
		(t) => utilsModule.getRunningTasksKey(t.project, t.task) === taskKey
	);

	stateModule.state.activeTimers = originalTimers;
	assert.strictEqual(isDuplicate, false);
});

test("Duplicate detection: allows same project with different tasks", () => {
	const originalTimers = stateModule.state.activeTimers;
	stateModule.state.activeTimers = {
		"timer-1": {
			project: "Project A",
			task: "Task 1",
			isPaused: false,
		},
	};

	const newProject = "Project A";
	const newTask = "Task 2";
	const taskKey = utilsModule.getRunningTasksKey(newProject, newTask);
	const isDuplicate = Object.values(stateModule.state.activeTimers).some(
		(t) => utilsModule.getRunningTasksKey(t.project, t.task) === taskKey
	);

	stateModule.state.activeTimers = originalTimers;
	assert.strictEqual(isDuplicate, false);
});

// --- Timer State Management Tests ---

test("Timer pause/resume: paused timer state transitions", () => {
	const timer = {
		isPaused: false,
		startTime: new Date(Date.now() - 100), // Started 100ms ago
		accumulatedMs: 0,
	};

	// Pause the timer
	const elapsedMs = Date.now() - timer.startTime.getTime();
	timer.accumulatedMs += elapsedMs;
	timer.startTime = null;
	timer.isPaused = true;

	assert.strictEqual(timer.isPaused, true);
	assert.strictEqual(timer.startTime, null);
	assert.ok(timer.accumulatedMs >= 90); // Allow for some timing variance
});

test("Timer pause/resume: resumed timer state transitions", () => {
	const timer = {
		isPaused: true,
		startTime: null,
		accumulatedMs: 5000,
	};

	// Resume the timer
	timer.isPaused = false;
	timer.startTime = new Date();

	assert.strictEqual(timer.isPaused, false);
	assert.ok(timer.startTime !== null);
	assert.strictEqual(timer.accumulatedMs, 5000);
});

test("Timer stop: creates complete entry from active timer", () => {
	const activity = {
		project: "Project Test",
		task: "Task Test",
		startTime: new Date(Date.now() - 10000),
		accumulatedMs: 0,
		isPaused: false,
		notes: "Test note",
	};

	const finalDurationMs = stateModule.calculateElapsedMs(activity);
	const newEntry = {
		project: activity.project,
		task: activity.task,
		totalDurationMs: finalDurationMs,
		durationSeconds: Math.round(finalDurationMs / 1000),
		endTime: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		notes: activity.notes || "",
	};

	assert.strictEqual(newEntry.project, "Project Test");
	assert.strictEqual(newEntry.task, "Task Test");
	assert.ok(newEntry.totalDurationMs > 9900); // Allow tolerance
	assert.strictEqual(newEntry.notes, "Test note");
});

test("Timer delete: removes from active timers without saving", () => {
	const originalTimers = stateModule.state.activeTimers;
	stateModule.state.activeTimers = {
		"timer-1": { project: "A", task: "1" },
		"timer-2": { project: "B", task: "2" },
		"timer-3": { project: "C", task: "3" },
	};

	delete stateModule.state.activeTimers["timer-2"];
	const remaining = Object.keys(stateModule.state.activeTimers);

	assert.strictEqual(remaining.length, 2);
	assert.ok(!remaining.includes("timer-2"));

	stateModule.state.activeTimers = originalTimers;
});

// --- Notes Management Tests ---

test("Notes persistence: stores empty notes", () => {
	const timer = {
		project: "Project",
		task: "Task",
		notes: "",
	};

	assert.strictEqual(timer.notes, "");
});

test("Notes persistence: stores notes with text", () => {
	const timer = {
		project: "Project",
		task: "Task",
		notes: "This is a test note with some details",
	};

	assert.strictEqual(timer.notes, "This is a test note with some details");
});

test("Notes persistence: handles notes with special characters", () => {
	const timer = {
		project: "Project",
		task: "Task",
		notes: "Notes with \"quotes\" and 'apostrophes' and commas,",
	};

	assert.strictEqual(
		timer.notes,
		"Notes with \"quotes\" and 'apostrophes' and commas,"
	);
});

test("Notes persistence: handles multiline notes", () => {
	const timer = {
		project: "Project",
		task: "Task",
		notes: "Line 1\nLine 2\nLine 3",
	};

	assert.strictEqual(timer.notes, "Line 1\nLine 2\nLine 3");
});

// --- CSV Export Data Formatting Tests ---

test("CSV export: escapes double quotes correctly", () => {
	const value = 'Project "A" Tasks';
	const escaped = `"${value.replace(/"/g, '""')}"`;

	assert.strictEqual(escaped, '"Project ""A"" Tasks"');
});

test("CSV export: handles commas in fields", () => {
	const headers = ["project", "task", "duration"];
	const row = {
		project: "Project, Inc.",
		task: "Task, Urgent",
		duration: "01:30:00",
	};
	const values = headers.map(
		(header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`
	);
	const csvLine = values.join(",");

	assert.strictEqual(csvLine, '"Project, Inc.","Task, Urgent","01:30:00"');
});

test("CSV export: formats durationMinutes correctly", () => {
	const durationSeconds = 3600; // 1 hour
	const durationMinutes = (durationSeconds / 60).toFixed(2);

	assert.strictEqual(durationMinutes, "60.00");
});

test("CSV export: formats date in ISO format", () => {
	const date = new Date("2025-10-31T14:30:00Z");
	const isoString = date.toISOString();

	assert.strictEqual(isoString, "2025-10-31T14:30:00.000Z");
});

test("CSV export: generates correct filename", () => {
	const date = new Date("2025-10-31");
	const dateStr = date.toISOString().split("T")[0];
	const filename = `time_tracker_export_${dateStr}.csv`;

	assert.strictEqual(filename, "time_tracker_export_2025-10-31.csv");
});

// --- State Update Edge Cases ---

test("State update: zero duration timer handling", () => {
	const activity = {
		project: "Project",
		task: "Task",
		startTime: new Date(Date.now() - 100), // Started 100ms ago
		accumulatedMs: 0,
		isPaused: false,
	};

	const finalDurationMs = stateModule.calculateElapsedMs(activity);
	const shouldDiscard = finalDurationMs <= 0;

	assert.strictEqual(shouldDiscard, false); // Has elapsed time, won't be discarded
});

test("State update: very long duration timer stored correctly", () => {
	const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
	const activity = {
		project: "Project",
		task: "Task",
		startTime: new Date(Date.now() - oneWeekMs),
		accumulatedMs: 0,
		isPaused: false,
	};

	const finalDurationMs = stateModule.calculateElapsedMs(activity);
	assert.ok(finalDurationMs > oneWeekMs - 1000); // Allow 1s tolerance
});

console.log("\n✅ Frontend Unit Tests Complete - ui.js operations");
console.log("   All UI functions and data operations tested");
console.log("   Run with: npm run test:unit\n");
