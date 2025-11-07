/**
 * API communication layer for server interactions
 *
 * ROLE IN ARCHITECTURE:
 * This module is the ONLY place where fetch() calls to the server occur.
 * It abstracts all server communication and provides a clean interface for
 * other modules to load/save data without knowing HTTP details.
 *
 * ERROR HANDLING STRATEGY:
 *
 * Fatal Errors (throw + stop app):
 * - loadDataFromServer(): Can't proceed without historical data
 *   Shows error UI, prevents further initialization
 *
 * Recoverable Errors (notify + continue):
 * - loadActiveStateFromServer(): Can start fresh without saved timers
 * - loadSuggestionsFromServer(): Can work with empty suggestions
 * - saveDataToServer(): Notifies user, but app continues functioning
 * - saveActiveStateToServer(): Notifies user, warns about data loss risk
 *
 * WHY THESE DECISIONS:
 * - Historical data is core to the app's purpose - can't work without it
 * - Active state and suggestions are nice-to-have - can recover
 * - Save failures are critical to notify about, but shouldn't crash app
 *
 * SYNCHRONIZATION APPROACH:
 * This is NOT real-time sync. It's event-driven:
 * - Every timer start/pause/stop triggers a save
 * - Server is source of truth; browser state is cache
 * - No polling or websockets needed (single user, local server)
 *
 * SINGLE-USER CONTEXT:
 * No need for:
 * - Optimistic updates with rollback (no concurrent users to conflict)
 * - Request queuing (one user can't create overwhelming request volume)
 * - Complex retry logic (local server is always available)
 *
 * IMPACT OF CHANGES:
 * - Changing fetch URLs breaks all server communication
 * - Removing error handlers causes silent failures
 * - Changing error handling strategy (fatal vs recoverable) affects UX
 * - Not awaiting saves can cause data loss on quick actions
 *
 * @module api
 */

import { state } from "./state.js";
import { showNotification } from "./utils.js";

/**
 * Loads historical time entries from the server
 *
 * Fetches all completed time entries from /api/data endpoint and populates
 * state.historicalEntries. Validates and converts date strings to Date objects.
 * This is a fatal operation - the app cannot function without historical data.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If server is unreachable, returns error status, or data is invalid
 */
export const loadDataFromServer = async () => {
	try {
		const response = await fetch("/api/data");
		if (!response.ok)
			throw new Error(`Server responded with ${response.status}`);
		const data = await response.json();
		state.historicalEntries = data.map((entry) => {
			const endTime = new Date(entry.endTime);
			if (isNaN(endTime.getTime())) {
				console.warn("Invalid date in entry:", entry.endTime);
				return {
					...entry,
					endTime: new Date(),
				};
			}
			return {
				...entry,
				endTime: endTime,
			};
		});
	} catch (error) {
		console.error("FATAL: Could not load data from server.", error);
		showNotification(
			"Failed to load data from server. Please check if the server is running.",
			"error",
			0
		);
		document.getElementById(
			"app"
		).innerHTML = `<div class='text-red-600 text-center p-8'><h1>Connection Error</h1><p>Could not connect to the local server. Is it running? Please start the server and refresh the page.</p></div>`;
		throw error;
	}
};

/**
 * Saves historical time entries to the server
 *
 * Posts all historical entries to /api/data endpoint. This persists completed
 * timer data to disk. Called after stopping timers.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If server is unreachable, returns error status, or save fails
 */
export const saveDataToServer = async () => {
	try {
		const response = await fetch("/api/data", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(state.historicalEntries, null, 2),
		});
		if (!response.ok) {
			throw new Error(`Server responded with ${response.status}`);
		}
	} catch (error) {
		console.error("Error saving historical data:", error);
		showNotification("Failed to save data. Your changes may be lost!", "error");
		throw error;
	}
};

/**
 * Loads active timer state from the server for session restoration
 *
 * Fetches running/paused timers from /api/active-state endpoint and populates
 * state.activeTimers. Converts date strings to Date objects. This is a
 * recoverable operation - if it fails, the app starts with empty active timers.
 *
 * @async
 * @returns {Promise<void>}
 */
export const loadActiveStateFromServer = async () => {
	try {
		const response = await fetch("/api/active-state");
		if (!response.ok)
			throw new Error(`Server responded with ${response.status}`);
		const savedTimers = await response.json();
		state.activeTimers = {};
		if (savedTimers && Object.keys(savedTimers).length > 0) {
			for (const id in savedTimers) {
				const timer = savedTimers[id];
				timer.startTime = timer.startTime ? new Date(timer.startTime) : null;
				state.activeTimers[id] = timer;
			}
		}
	} catch (error) {
		console.error(
			"Could not load active state from server. Starting fresh.",
			error
		);
		showNotification(
			"Could not restore previous session. Starting fresh.",
			"info"
		);
		state.activeTimers = {};
	}
};

/**
 * Saves current active timer state to the server
 *
 * Posts all running/paused timers to /api/active-state endpoint. Converts
 * Date objects to ISO strings for serialization. Called after any timer
 * state change (start, pause, resume, delete).
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If server is unreachable, returns error status, or save fails
 */
export const saveActiveStateToServer = async () => {
	const serializableTimers = {};
	for (const id in state.activeTimers) {
		const timer = state.activeTimers[id];
		serializableTimers[id] = {
			...timer,
			startTime: timer.startTime ? timer.startTime.toISOString() : null,
		};
	}
	try {
		const response = await fetch("/api/active-state", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(serializableTimers, null, 2),
		});
		if (!response.ok) {
			throw new Error(`Server responded with ${response.status}`);
		}
	} catch (error) {
		console.error("Error saving active state:", error);
		showNotification(
			"Failed to save timer state. Changes may be lost on refresh!",
			"error"
		);
		throw error;
	}
};

/**
 * Loads task/project suggestions from the server
 *
 * Fetches predefined activity suggestions from /api/suggestions endpoint and
 * populates state.predefinedSuggestions. These are combined with recent activities
 * for the input autocomplete. This is a recoverable operation - if it fails,
 * autocomplete still works with recent activities only.
 *
 * @async
 * @returns {Promise<void>}
 */
export const loadSuggestionsFromServer = async () => {
	try {
		const response = await fetch("/api/suggestions");
		if (!response.ok)
			throw new Error(`Server responded with ${response.status}`);
		state.predefinedSuggestions = await response.json();
	} catch (error) {
		console.error("Could not load suggestions from server.", error);
		state.predefinedSuggestions = [];
	}
};
