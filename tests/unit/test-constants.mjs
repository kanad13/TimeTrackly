/**
 * Frontend Unit Tests - Constants
 *
 * PURPOSE:
 * Validates that application constants have expected values and types.
 * Ensures that critical timing constants are correct for calculations.
 *
 * WHAT'S TESTED:
 * - Time conversion constants (milliseconds per second/minute/hour/day)
 * - UI configuration constants
 * - Chart color palette
 *
 * WHY THESE TESTS MATTER:
 * - Wrong time constants would cause incorrect duration calculations
 * - Constants are used throughout the application
 * - Changes to constants can have wide-reaching effects
 *
 * HOW TO RUN:
 * npm run test:unit
 */

// Initialize browser environment BEFORE importing modules that need it
import "./setup.mjs";

import test from "node:test";
import assert from "node:assert";
import { CONSTANTS, CHART_COLORS } from "../../js/constants.js";

// --- Time Conversion Constants Tests ---

test("CONSTANTS.MS_PER_SECOND is 1000", () => {
	assert.strictEqual(CONSTANTS.MS_PER_SECOND, 1000);
});

test("CONSTANTS.MS_PER_MINUTE is 60000", () => {
	assert.strictEqual(CONSTANTS.MS_PER_MINUTE, 60000);
});

test("CONSTANTS.MS_PER_HOUR is 3600000", () => {
	assert.strictEqual(CONSTANTS.MS_PER_HOUR, 3600000);
});

test("CONSTANTS.MS_PER_DAY is 86400000", () => {
	assert.strictEqual(CONSTANTS.MS_PER_DAY, 86400000);
});

test("Time constants are mathematically correct", () => {
	assert.strictEqual(CONSTANTS.MS_PER_MINUTE, CONSTANTS.MS_PER_SECOND * 60);
	assert.strictEqual(CONSTANTS.MS_PER_HOUR, CONSTANTS.MS_PER_MINUTE * 60);
	assert.strictEqual(CONSTANTS.MS_PER_DAY, CONSTANTS.MS_PER_HOUR * 24);
});

// --- Configuration Constants Tests ---

test("CONSTANTS.MAX_INPUT_LENGTH is positive number", () => {
	assert.strictEqual(typeof CONSTANTS.MAX_INPUT_LENGTH, "number");
	assert.ok(CONSTANTS.MAX_INPUT_LENGTH > 0);
});

test("CONSTANTS.MAX_INPUT_LENGTH is 100", () => {
	assert.strictEqual(CONSTANTS.MAX_INPUT_LENGTH, 100);
});

test("CONSTANTS.REPORT_DAYS_DEFAULT is positive number", () => {
	assert.strictEqual(typeof CONSTANTS.REPORT_DAYS_DEFAULT, "number");
	assert.ok(CONSTANTS.REPORT_DAYS_DEFAULT > 0);
});

test("CONSTANTS.REPORT_DAYS_DEFAULT is 7", () => {
	assert.strictEqual(CONSTANTS.REPORT_DAYS_DEFAULT, 7);
});

test("CONSTANTS.TIMER_UPDATE_INTERVAL is positive number", () => {
	assert.strictEqual(typeof CONSTANTS.TIMER_UPDATE_INTERVAL, "number");
	assert.ok(CONSTANTS.TIMER_UPDATE_INTERVAL > 0);
});

test("CONSTANTS.TIMER_UPDATE_INTERVAL is 1000ms", () => {
	assert.strictEqual(CONSTANTS.TIMER_UPDATE_INTERVAL, 1000);
});

test("CONSTANTS.NOTIFICATION_DURATION is positive number", () => {
	assert.strictEqual(typeof CONSTANTS.NOTIFICATION_DURATION, "number");
	assert.ok(CONSTANTS.NOTIFICATION_DURATION > 0);
});

test("CONSTANTS.NOTIFICATION_DURATION is 4000ms", () => {
	assert.strictEqual(CONSTANTS.NOTIFICATION_DURATION, 4000);
});

// --- Chart Colors Tests ---

test("CHART_COLORS is an array", () => {
	assert.ok(Array.isArray(CHART_COLORS));
});

test("CHART_COLORS has at least 5 colors", () => {
	assert.ok(
		CHART_COLORS.length >= 5,
		"Should have at least 5 colors for variety"
	);
});

test("CHART_COLORS contains valid hex color codes", () => {
	const hexRegex = /^#[0-9A-F]{6}$/i;
	CHART_COLORS.forEach((color, index) => {
		assert.ok(
			hexRegex.test(color),
			`Color at index ${index} (${color}) should be a valid hex color`
		);
	});
});

test("CHART_COLORS are all unique", () => {
	const uniqueColors = new Set(CHART_COLORS);
	assert.strictEqual(
		uniqueColors.size,
		CHART_COLORS.length,
		"All colors should be unique"
	);
});

test("CHART_COLORS are all strings", () => {
	CHART_COLORS.forEach((color, index) => {
		assert.strictEqual(
			typeof color,
			"string",
			`Color at index ${index} should be a string`
		);
	});
});

// --- Constants Object Structure Tests ---

test("CONSTANTS object has all required properties", () => {
	const requiredProperties = [
		"MS_PER_SECOND",
		"MS_PER_MINUTE",
		"MS_PER_HOUR",
		"MS_PER_DAY",
		"MAX_INPUT_LENGTH",
		"REPORT_DAYS_DEFAULT",
		"TIMER_UPDATE_INTERVAL",
		"NOTIFICATION_DURATION",
	];

	requiredProperties.forEach((prop) => {
		assert.ok(
			prop in CONSTANTS,
			`CONSTANTS should have property ${prop}`
		);
	});
});

test("All CONSTANTS values are numbers", () => {
	Object.entries(CONSTANTS).forEach(([key, value]) => {
		assert.strictEqual(
			typeof value,
			"number",
			`CONSTANTS.${key} should be a number`
		);
	});
});

test("All CONSTANTS values are positive", () => {
	Object.entries(CONSTANTS).forEach(([key, value]) => {
		assert.ok(
			value > 0,
			`CONSTANTS.${key} should be positive`
		);
	});
});

console.log("\n✅ Frontend Unit Tests Complete - constants.js");
console.log("   All constants validated");
console.log("   Run with: npm run test:unit\n");
