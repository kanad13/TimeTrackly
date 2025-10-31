/**
 * Frontend Unit Tests - State Management
 *
 * PURPOSE:
 * Tests state management functions to ensure correct timer calculations
 * and state tracking.
 *
 * WHAT'S TESTED:
 * - calculateElapsedMs: Timer duration calculation
 * - hasRunningTimers: Detection of running vs paused timers
 * - State object structure
 *
 * WHY THESE TESTS MATTER:
 * - Timer calculation bugs lead to incorrect time tracking
 * - State management affects entire application
 * - Pure functions are easy to test
 *
 * HOW TO RUN:
 * npm run test:unit
 */

// Initialize browser environment BEFORE importing modules that need it
import "./setup.mjs";

import test from "node:test";
import assert from "node:assert";
import * as stateModule from "../../js/state.js";

// --- State Object Structure Tests ---

test("state object exists", () => {
	assert.ok(stateModule.state, "State object should exist");
});

test("state has historicalEntries array", () => {
	assert.ok(
		Array.isArray(stateModule.state.historicalEntries),
		"historicalEntries should be an array"
	);
});

test("state has predefinedSuggestions array", () => {
	assert.ok(
		Array.isArray(stateModule.state.predefinedSuggestions),
		"predefinedSuggestions should be an array"
	);
});

test("state has activeTimers object", () => {
	assert.strictEqual(
		typeof stateModule.state.activeTimers,
		"object",
		"activeTimers should be an object"
	);
});

test("state has timerInterval property", () => {
	assert.ok(
		"timerInterval" in stateModule.state,
		"timerInterval property should exist"
	);
});

test("state has activeChartInstances array", () => {
	assert.ok(
		Array.isArray(stateModule.state.activeChartInstances),
		"activeChartInstances should be an array"
	);
});

// --- calculateElapsedMs Tests ---

test("calculateElapsedMs: paused timer with no accumulated time", () => {
	const timer = {
		isPaused: true,
		accumulatedMs: 0,
		startTime: null,
	};

	const result = stateModule.calculateElapsedMs(timer);
	assert.strictEqual(result, 0);
});

test("calculateElapsedMs: paused timer with accumulated time", () => {
	const timer = {
		isPaused: true,
		accumulatedMs: 5000,
		startTime: null,
	};

	const result = stateModule.calculateElapsedMs(timer);
	assert.strictEqual(result, 5000);
});

test("calculateElapsedMs: running timer with no accumulated time", () => {
	const startTime = new Date(Date.now() - 10000); // Started 10 seconds ago
	const timer = {
		isPaused: false,
		accumulatedMs: 0,
		startTime: startTime,
	};

	const result = stateModule.calculateElapsedMs(timer);
	// Should be approximately 10000ms (allow 100ms tolerance for test execution time)
	assert.ok(
		result >= 9900 && result <= 10100,
		`Expected ~10000ms, got ${result}ms`
	);
});

test("calculateElapsedMs: running timer with accumulated time", () => {
	const startTime = new Date(Date.now() - 5000); // Started 5 seconds ago
	const timer = {
		isPaused: false,
		accumulatedMs: 10000, // Had 10 seconds accumulated
		startTime: startTime,
	};

	const result = stateModule.calculateElapsedMs(timer);
	// Should be approximately 15000ms (10000 + 5000)
	assert.ok(
		result >= 14900 && result <= 15100,
		`Expected ~15000ms, got ${result}ms`
	);
});

test("calculateElapsedMs: timer just started", () => {
	const startTime = new Date(Date.now()); // Started just now
	const timer = {
		isPaused: false,
		accumulatedMs: 0,
		startTime: startTime,
	};

	const result = stateModule.calculateElapsedMs(timer);
	// Should be very close to 0
	assert.ok(result >= 0 && result <= 100, `Expected ~0ms, got ${result}ms`);
});

test("calculateElapsedMs: timer with no startTime and no accumulated time", () => {
	const timer = {
		isPaused: true,
		accumulatedMs: undefined,
		startTime: null,
	};

	const result = stateModule.calculateElapsedMs(timer);
	assert.strictEqual(result, 0);
});

test("calculateElapsedMs: long running timer (1 hour)", () => {
	const oneHourAgo = new Date(Date.now() - 3600000); // 1 hour ago
	const timer = {
		isPaused: false,
		accumulatedMs: 0,
		startTime: oneHourAgo,
	};

	const result = stateModule.calculateElapsedMs(timer);
	// Should be approximately 3600000ms (allow 1000ms tolerance)
	assert.ok(
		result >= 3599000 && result <= 3601000,
		`Expected ~3600000ms, got ${result}ms`
	);
});

test("calculateElapsedMs: timer with large accumulated time", () => {
	const timer = {
		isPaused: true,
		accumulatedMs: 86400000, // 24 hours
		startTime: null,
	};

	const result = stateModule.calculateElapsedMs(timer);
	assert.strictEqual(result, 86400000);
});

// --- hasRunningTimers Tests ---

test("hasRunningTimers: returns false when no timers exist", () => {
	// Save original state
	const originalTimers = stateModule.state.activeTimers;

	// Test with empty timers
	stateModule.state.activeTimers = {};
	const result = stateModule.hasRunningTimers();

	// Restore original state
	stateModule.state.activeTimers = originalTimers;

	assert.strictEqual(result, false);
});

test("hasRunningTimers: returns false when all timers are paused", () => {
	const originalTimers = stateModule.state.activeTimers;

	stateModule.state.activeTimers = {
		"timer-1": { isPaused: true },
		"timer-2": { isPaused: true },
		"timer-3": { isPaused: true },
	};

	const result = stateModule.hasRunningTimers();
	stateModule.state.activeTimers = originalTimers;

	assert.strictEqual(result, false);
});

test("hasRunningTimers: returns true when one timer is running", () => {
	const originalTimers = stateModule.state.activeTimers;

	stateModule.state.activeTimers = {
		"timer-1": { isPaused: true },
		"timer-2": { isPaused: false }, // This one is running
		"timer-3": { isPaused: true },
	};

	const result = stateModule.hasRunningTimers();
	stateModule.state.activeTimers = originalTimers;

	assert.strictEqual(result, true);
});

test("hasRunningTimers: returns true when all timers are running", () => {
	const originalTimers = stateModule.state.activeTimers;

	stateModule.state.activeTimers = {
		"timer-1": { isPaused: false },
		"timer-2": { isPaused: false },
		"timer-3": { isPaused: false },
	};

	const result = stateModule.hasRunningTimers();
	stateModule.state.activeTimers = originalTimers;

	assert.strictEqual(result, true);
});

test("hasRunningTimers: returns true with single running timer", () => {
	const originalTimers = stateModule.state.activeTimers;

	stateModule.state.activeTimers = {
		"timer-1": { isPaused: false },
	};

	const result = stateModule.hasRunningTimers();
	stateModule.state.activeTimers = originalTimers;

	assert.strictEqual(result, true);
});

test("hasRunningTimers: returns false with single paused timer", () => {
	const originalTimers = stateModule.state.activeTimers;

	stateModule.state.activeTimers = {
		"timer-1": { isPaused: true },
	};

	const result = stateModule.hasRunningTimers();
	stateModule.state.activeTimers = originalTimers;

	assert.strictEqual(result, false);
});

// --- clearTimerInterval Tests ---

test("clearTimerInterval: function exists", () => {
	assert.strictEqual(typeof stateModule.clearTimerInterval, "function");
});

test("clearTimerInterval: clears interval when set", () => {
	// Set a dummy interval
	stateModule.state.timerInterval = setInterval(() => {}, 1000);

	// Clear it
	stateModule.clearTimerInterval();

	// Verify it's null
	assert.strictEqual(stateModule.state.timerInterval, null);
});

test("clearTimerInterval: handles null interval safely", () => {
	stateModule.state.timerInterval = null;

	// Should not throw
	assert.doesNotThrow(() => {
		stateModule.clearTimerInterval();
	});

	assert.strictEqual(stateModule.state.timerInterval, null);
});

// --- Edge Cases ---

test("calculateElapsedMs: handles timer with future startTime (clock skew)", () => {
	const futureTime = new Date(Date.now() + 1000); // 1 second in future
	const timer = {
		isPaused: false,
		accumulatedMs: 0,
		startTime: futureTime,
	};

	const result = stateModule.calculateElapsedMs(timer);
	// Should handle gracefully (might be negative or zero)
	assert.strictEqual(typeof result, "number");
});

test("calculateElapsedMs: handles timer with very old startTime", () => {
	const veryOld = new Date("2020-01-01"); // Several years ago
	const timer = {
		isPaused: false,
		accumulatedMs: 0,
		startTime: veryOld,
	};

	const result = stateModule.calculateElapsedMs(timer);
	// Should be a very large number
	assert.ok(result > 100000000, "Should be a large elapsed time");
});

console.log("\n✅ Frontend Unit Tests Complete - state.js");
console.log("   All state management functions tested");
console.log("   Run with: npm run test:unit\n");
