/**
 * API communication layer for server interactions
 * @module api
 */

import { state } from "./state.js";
import { showNotification } from "./utils.js";

/**
 * Loads historical time entries from server
 * @throws {Error} If server is unreachable or returns error
 */
export const loadDataFromServer = async () => {
	try {
		const response = await fetch("/api/data");
		if (!response.ok)
			throw new Error(`Server responded with ${response.status}`);
		const data = await response.json();
		state.historicalEntries = data.map((entry) => ({
			...entry,
			endTime: new Date(entry.endTime),
		}));
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
 * Saves historical time entries to server
 * @throws {Error} If save operation fails
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
 * Loads active timer state from server (for session restoration)
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
 * Saves current active timer state to server
 * Updates UI counter and visibility after save
 * @throws {Error} If save operation fails
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
 * Loads task/project suggestions from server
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
