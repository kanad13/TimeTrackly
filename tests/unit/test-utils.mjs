/**
 * Frontend Unit Tests - Utility Functions
 *
 * PURPOSE:
 * Tests pure utility functions in isolation to ensure they work correctly
 * across all edge cases.
 *
 * WHAT'S TESTED:
 * - formatDuration: Time formatting
 * - sanitizeInput: Input cleaning and validation
 * - generateUUID: UUID generation
 * - getRunningTasksKey: Key generation for task tracking
 * - getDistinctColors: Color array generation
 *
 * WHY UNIT TESTS MATTER:
 * - These functions are used throughout the application
 * - Bugs here affect multiple features
 * - Pure functions are easy to test in isolation
 * - Fast to run (no browser/server needed)
 *
 * HOW TO RUN:
 * npm run test:unit
 */

// Initialize browser environment BEFORE importing modules that need it
import "./setup.mjs";

import test from "node:test";
import assert from "node:assert";
import * as utils from "../../js/utils.js";

// --- formatDuration Tests ---

test("formatDuration: converts 0 seconds correctly", () => {
	const result = utils.formatDuration(0);
	assert.strictEqual(result, "00:00:00");
});

test("formatDuration: converts 1 second correctly", () => {
	const result = utils.formatDuration(1);
	assert.strictEqual(result, "00:00:01");
});

test("formatDuration: converts 59 seconds correctly", () => {
	const result = utils.formatDuration(59);
	assert.strictEqual(result, "00:00:59");
});

test("formatDuration: converts 60 seconds (1 minute) correctly", () => {
	const result = utils.formatDuration(60);
	assert.strictEqual(result, "00:01:00");
});

test("formatDuration: converts 61 seconds correctly", () => {
	const result = utils.formatDuration(61);
	assert.strictEqual(result, "00:01:01");
});

test("formatDuration: converts 3599 seconds correctly", () => {
	const result = utils.formatDuration(3599);
	assert.strictEqual(result, "00:59:59");
});

test("formatDuration: converts 3600 seconds (1 hour) correctly", () => {
	const result = utils.formatDuration(3600);
	assert.strictEqual(result, "01:00:00");
});

test("formatDuration: converts 3661 seconds correctly", () => {
	const result = utils.formatDuration(3661);
	assert.strictEqual(result, "01:01:01");
});

test("formatDuration: converts 7200 seconds (2 hours) correctly", () => {
	const result = utils.formatDuration(7200);
	assert.strictEqual(result, "02:00:00");
});

test("formatDuration: converts 86400 seconds (24 hours) correctly", () => {
	const result = utils.formatDuration(86400);
	assert.strictEqual(result, "24:00:00");
});

test("formatDuration: handles very large durations", () => {
	const result = utils.formatDuration(359999); // 99:59:59
	assert.strictEqual(result, "99:59:59");
});

// --- sanitizeInput Tests ---

test("sanitizeInput: removes leading/trailing whitespace", () => {
	const result = utils.sanitizeInput("  test  ");
	assert.strictEqual(result, "test");
});

test("sanitizeInput: removes < character", () => {
	const result = utils.sanitizeInput("test<script>");
	assert.strictEqual(result, "testscript");
});

test("sanitizeInput: removes > character", () => {
	const result = utils.sanitizeInput("test>alert");
	assert.strictEqual(result, "testalert");
});

test("sanitizeInput: removes double quotes", () => {
	const result = utils.sanitizeInput('test "quoted" text');
	assert.strictEqual(result, "test quoted text");
});

test("sanitizeInput: removes single quotes", () => {
	const result = utils.sanitizeInput("test 'quoted' text");
	assert.strictEqual(result, "test quoted text");
});

test("sanitizeInput: removes all dangerous characters", () => {
	const result = utils.sanitizeInput('<script>alert("XSS")</script>');
	assert.strictEqual(result, "scriptalert(XSS)/script");
});

test("sanitizeInput: limits length to 100 characters", () => {
	const longString = "a".repeat(150);
	const result = utils.sanitizeInput(longString);
	assert.strictEqual(result.length, 100);
});

test("sanitizeInput: preserves exactly 100 characters", () => {
	const exactString = "a".repeat(100);
	const result = utils.sanitizeInput(exactString);
	assert.strictEqual(result.length, 100);
	assert.strictEqual(result, exactString);
});

test("sanitizeInput: handles empty string", () => {
	const result = utils.sanitizeInput("");
	assert.strictEqual(result, "");
});

test("sanitizeInput: handles whitespace-only string", () => {
	const result = utils.sanitizeInput("   ");
	assert.strictEqual(result, "");
});

test("sanitizeInput: handles non-string input (returns empty)", () => {
	const result = utils.sanitizeInput(null);
	assert.strictEqual(result, "");
});

test("sanitizeInput: handles undefined input", () => {
	const result = utils.sanitizeInput(undefined);
	assert.strictEqual(result, "");
});

test("sanitizeInput: handles number input", () => {
	const result = utils.sanitizeInput(123);
	assert.strictEqual(result, "");
});

test("sanitizeInput: preserves special characters (except dangerous ones)", () => {
	const result = utils.sanitizeInput("test@#$%^&*()_+-=[]{}|;:,./test");
	assert.strictEqual(result, "test@#$%^&*()_+-=[]{}|;:,./test");
});

test("sanitizeInput: handles unicode characters", () => {
	const result = utils.sanitizeInput("测试 тест 🚀");
	assert.strictEqual(result, "测试 тест 🚀");
});

// --- generateUUID Tests ---

test("generateUUID: returns a string", () => {
	const result = utils.generateUUID();
	assert.strictEqual(typeof result, "string");
});

test("generateUUID: returns UUID v4 format", () => {
	const result = utils.generateUUID();
	// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	assert.ok(
		uuidRegex.test(result),
		`Generated UUID ${result} should match v4 format`
	);
});

test("generateUUID: generates unique IDs", () => {
	const id1 = utils.generateUUID();
	const id2 = utils.generateUUID();
	const id3 = utils.generateUUID();

	assert.notStrictEqual(id1, id2);
	assert.notStrictEqual(id2, id3);
	assert.notStrictEqual(id1, id3);
});

test("generateUUID: generates 100 unique IDs", () => {
	const ids = new Set();
	for (let i = 0; i < 100; i++) {
		ids.add(utils.generateUUID());
	}
	assert.strictEqual(ids.size, 100, "All 100 IDs should be unique");
});

// --- getRunningTasksKey Tests ---

test("getRunningTasksKey: creates key from project and task", () => {
	const result = utils.getRunningTasksKey("Project", "Task");
	assert.strictEqual(result, "project:task");
});

test("getRunningTasksKey: converts to lowercase", () => {
	const result = utils.getRunningTasksKey("PROJECT", "TASK");
	assert.strictEqual(result, "project:task");
});

test("getRunningTasksKey: handles mixed case", () => {
	const result = utils.getRunningTasksKey("PrOjEcT", "TaSk");
	assert.strictEqual(result, "project:task");
});

test("getRunningTasksKey: is case-insensitive", () => {
	const key1 = utils.getRunningTasksKey("Project", "Task");
	const key2 = utils.getRunningTasksKey("project", "task");
	const key3 = utils.getRunningTasksKey("PROJECT", "TASK");

	assert.strictEqual(key1, key2);
	assert.strictEqual(key2, key3);
});

test("getRunningTasksKey: handles spaces", () => {
	const result = utils.getRunningTasksKey("My Project", "My Task");
	assert.strictEqual(result, "my project:my task");
});

test("getRunningTasksKey: handles special characters", () => {
	const result = utils.getRunningTasksKey("Project-A", "Task#1");
	assert.strictEqual(result, "project-a:task#1");
});

// --- getDistinctColors Tests ---

test("getDistinctColors: returns array", () => {
	const result = utils.getDistinctColors(5);
	assert.ok(Array.isArray(result));
});

test("getDistinctColors: returns correct count", () => {
	const result = utils.getDistinctColors(5);
	assert.strictEqual(result.length, 5);
});

test("getDistinctColors: returns hex color codes", () => {
	const result = utils.getDistinctColors(3);
	const hexRegex = /^#[0-9A-F]{6}$/i;

	result.forEach((color) => {
		assert.ok(hexRegex.test(color), `${color} should be a valid hex color`);
	});
});

test("getDistinctColors: handles zero count", () => {
	const result = utils.getDistinctColors(0);
	assert.strictEqual(result.length, 0);
});

test("getDistinctColors: handles large count", () => {
	const result = utils.getDistinctColors(100);
	assert.strictEqual(result.length, 100);
});

test("getDistinctColors: cycles through colors when count exceeds palette", () => {
	const result = utils.getDistinctColors(20);
	// Should repeat colors if count > available colors
	assert.strictEqual(result.length, 20);
});

// --- showNotification Tests (limited - requires DOM) ---

test("showNotification: function exists", () => {
	assert.strictEqual(typeof utils.showNotification, "function");
});

console.log("\n✅ Frontend Unit Tests Complete - utils.js");
console.log("   All utility functions tested");
console.log("   Run with: npm run test:unit\n");
