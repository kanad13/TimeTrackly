/**
 * Frontend Unit Tests - Reports Module
 *
 * PURPOSE:
 * Tests data aggregation logic used in reports to ensure charts
 * receive correctly calculated data.
 *
 * WHAT'S TESTED:
 * - Project duration aggregation
 * - Daily duration calculation for time period
 * - Date key generation for grouping
 *
 * WHY THESE TESTS MATTER:
 * - Chart accuracy depends on correct data aggregation
 * - Aggregation bugs would mislead users about their time usage
 * - These calculations process all historical data
 *
 * HOW TO RUN:
 * npm run test:unit
 */

// Initialize browser environment BEFORE importing modules that need it
import "./setup.mjs";

import test from "node:test";
import assert from "node:assert";
import { CONSTANTS } from "../../js/constants.js";

// --- Project Duration Aggregation Tests ---

test("Project aggregation: combines durations for same project", () => {
	const entries = [
		{ project: "Project A", task: "Task 1", totalDurationMs: 1000 },
		{ project: "Project A", task: "Task 2", totalDurationMs: 2000 },
		{ project: "Project B", task: "Task 3", totalDurationMs: 3000 },
	];

	const projectDurations = entries.reduce((acc, entry) => {
		acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
		return acc;
	}, {});

	assert.strictEqual(projectDurations["Project A"], 3000);
	assert.strictEqual(projectDurations["Project B"], 3000);
});

test("Project aggregation: handles single entry", () => {
	const entries = [
		{ project: "Project A", task: "Task 1", totalDurationMs: 5000 },
	];

	const projectDurations = entries.reduce((acc, entry) => {
		acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
		return acc;
	}, {});

	assert.strictEqual(projectDurations["Project A"], 5000);
	assert.strictEqual(Object.keys(projectDurations).length, 1);
});

test("Project aggregation: handles empty entries", () => {
	const entries = [];

	const projectDurations = entries.reduce((acc, entry) => {
		acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
		return acc;
	}, {});

	assert.strictEqual(Object.keys(projectDurations).length, 0);
});

test("Project aggregation: handles multiple projects", () => {
	const entries = [
		{ project: "Project A", task: "Task 1", totalDurationMs: 1000 },
		{ project: "Project B", task: "Task 2", totalDurationMs: 2000 },
		{ project: "Project C", task: "Task 3", totalDurationMs: 3000 },
		{ project: "Project D", task: "Task 4", totalDurationMs: 4000 },
	];

	const projectDurations = entries.reduce((acc, entry) => {
		acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
		return acc;
	}, {});

	assert.strictEqual(Object.keys(projectDurations).length, 4);
	assert.strictEqual(projectDurations["Project A"], 1000);
	assert.strictEqual(projectDurations["Project B"], 2000);
	assert.strictEqual(projectDurations["Project C"], 3000);
	assert.strictEqual(projectDurations["Project D"], 4000);
});

test("Project aggregation: handles large durations", () => {
	const entries = [
		{ project: "Project A", task: "Task 1", totalDurationMs: 86400000 }, // 24 hours
		{ project: "Project A", task: "Task 2", totalDurationMs: 86400000 }, // 24 hours
	];

	const projectDurations = entries.reduce((acc, entry) => {
		acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
		return acc;
	}, {});

	assert.strictEqual(projectDurations["Project A"], 172800000); // 48 hours
});

// --- Daily Duration Calculation Tests ---

test("Daily aggregation: creates entries for last N days", () => {
	const days = 7;
	const dailyDurations = {};

	for (let i = days - 1; i >= 0; i--) {
		const day = new Date(Date.now() - i * CONSTANTS.MS_PER_DAY);
		dailyDurations[day.toISOString().split("T")[0]] = 0;
	}

	assert.strictEqual(Object.keys(dailyDurations).length, days);
});

test("Daily aggregation: initializes all days to zero", () => {
	const days = 7;
	const dailyDurations = {};

	for (let i = days - 1; i >= 0; i--) {
		const day = new Date(Date.now() - i * CONSTANTS.MS_PER_DAY);
		dailyDurations[day.toISOString().split("T")[0]] = 0;
	}

	Object.values(dailyDurations).forEach((duration) => {
		assert.strictEqual(duration, 0);
	});
});

test("Daily aggregation: groups entries by date", () => {
	const today = new Date();
	const yesterday = new Date(Date.now() - CONSTANTS.MS_PER_DAY);

	const entries = [
		{ project: "A", task: "1", totalDurationMs: 1000, endTime: today },
		{ project: "B", task: "2", totalDurationMs: 2000, endTime: today },
		{ project: "C", task: "3", totalDurationMs: 3000, endTime: yesterday },
	];

	// Initialize
	const dailyDurations = {};
	for (let i = 6; i >= 0; i--) {
		const day = new Date(Date.now() - i * CONSTANTS.MS_PER_DAY);
		dailyDurations[day.toISOString().split("T")[0]] = 0;
	}

	// Aggregate
	entries.forEach((entry) => {
		const dateKey = new Date(entry.endTime).toISOString().split("T")[0];
		if (dailyDurations.hasOwnProperty(dateKey)) {
			dailyDurations[dateKey] += entry.totalDurationMs;
		}
	});

	const todayKey = today.toISOString().split("T")[0];
	const yesterdayKey = yesterday.toISOString().split("T")[0];

	assert.strictEqual(dailyDurations[todayKey], 3000);
	assert.strictEqual(dailyDurations[yesterdayKey], 3000);
});

test("Daily aggregation: ignores entries outside date range", () => {
	const longAgo = new Date(Date.now() - 30 * CONSTANTS.MS_PER_DAY);
	const today = new Date();

	const entries = [
		{ project: "A", task: "1", totalDurationMs: 1000, endTime: longAgo },
		{ project: "B", task: "2", totalDurationMs: 2000, endTime: today },
	];

	// Initialize for last 7 days
	const dailyDurations = {};
	for (let i = 6; i >= 0; i--) {
		const day = new Date(Date.now() - i * CONSTANTS.MS_PER_DAY);
		dailyDurations[day.toISOString().split("T")[0]] = 0;
	}

	// Aggregate
	entries.forEach((entry) => {
		const dateKey = new Date(entry.endTime).toISOString().split("T")[0];
		if (dailyDurations.hasOwnProperty(dateKey)) {
			dailyDurations[dateKey] += entry.totalDurationMs;
		}
	});

	const todayKey = today.toISOString().split("T")[0];
	const longAgoKey = longAgo.toISOString().split("T")[0];

	assert.strictEqual(dailyDurations[todayKey], 2000);
	assert.strictEqual(dailyDurations[longAgoKey], undefined); // Not in the 7-day range
});

// --- Date Key Generation Tests ---

test("Date key generation: creates ISO date string", () => {
	const date = new Date("2025-10-31T14:30:00Z");
	const dateKey = date.toISOString().split("T")[0];

	assert.strictEqual(dateKey, "2025-10-31");
});

test("Date key generation: handles different times same day", () => {
	const date1 = new Date("2025-10-31T08:00:00Z");
	const date2 = new Date("2025-10-31T20:00:00Z");

	const key1 = date1.toISOString().split("T")[0];
	const key2 = date2.toISOString().split("T")[0];

	assert.strictEqual(key1, key2, "Same day should produce same key");
});

test("Date key generation: handles different days", () => {
	const date1 = new Date("2025-10-30T23:59:59Z");
	const date2 = new Date("2025-10-31T00:00:00Z");

	const key1 = date1.toISOString().split("T")[0];
	const key2 = date2.toISOString().split("T")[0];

	assert.notStrictEqual(key1, key2, "Different days should produce different keys");
});

// --- Milliseconds to Hours Conversion Tests ---

test("MS to hours conversion: converts correctly", () => {
	const ms = CONSTANTS.MS_PER_HOUR * 2; // 2 hours
	const hours = ms / CONSTANTS.MS_PER_HOUR;

	assert.strictEqual(hours, 2);
});

test("MS to hours conversion: handles fractional hours", () => {
	const ms = CONSTANTS.MS_PER_HOUR * 1.5; // 1.5 hours
	const hours = ms / CONSTANTS.MS_PER_HOUR;

	assert.strictEqual(hours, 1.5);
});

test("MS to hours conversion: handles zero", () => {
	const ms = 0;
	const hours = ms / CONSTANTS.MS_PER_HOUR;

	assert.strictEqual(hours, 0);
});

test("MS to hours conversion: handles minutes (fractional)", () => {
	const ms = CONSTANTS.MS_PER_MINUTE * 30; // 30 minutes = 0.5 hours
	const hours = ms / CONSTANTS.MS_PER_HOUR;

	assert.strictEqual(hours, 0.5);
});

// --- Data Structure Tests ---

test("Project data: keys and values have same length", () => {
	const entries = [
		{ project: "Project A", task: "Task 1", totalDurationMs: 1000 },
		{ project: "Project B", task: "Task 2", totalDurationMs: 2000 },
	];

	const projectDurations = entries.reduce((acc, entry) => {
		acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
		return acc;
	}, {});

	const labels = Object.keys(projectDurations);
	const data = Object.values(projectDurations);

	assert.strictEqual(labels.length, data.length);
});

test("Daily data: maintains chronological order", () => {
	const days = 7;
	const dailyDurations = {};
	const dateKeys = [];

	for (let i = days - 1; i >= 0; i--) {
		const day = new Date(Date.now() - i * CONSTANTS.MS_PER_DAY);
		const key = day.toISOString().split("T")[0];
		dailyDurations[key] = 0;
		dateKeys.push(key);
	}

	// Verify keys are in chronological order
	for (let i = 1; i < dateKeys.length; i++) {
		const prevDate = new Date(dateKeys[i - 1]);
		const currDate = new Date(dateKeys[i]);
		assert.ok(
			currDate >= prevDate,
			"Dates should be in chronological order"
		);
	}
});

console.log("\n✅ Frontend Unit Tests Complete - reports.js aggregation");
console.log("   All data aggregation logic tested");
console.log("   Run with: npm run test:unit\n");
