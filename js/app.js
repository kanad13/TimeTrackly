/**
 * Main application initialization and orchestration
 * @module app
 */

import { state, clearTimerInterval, hasRunningTimers } from "./state.js";
import {
	loadDataFromServer,
	loadActiveStateFromServer,
	loadSuggestionsFromServer,
} from "./api.js";
import {
	initDOMElements,
	populateSuggestions,
	renderActiveTimers,
	startTimerDisplay,
	startNewTimer,
	exportData,
} from "./ui.js";
import { switchTab } from "./reports.js";
import { showNotification } from "./utils.js";

/**
 * Initializes the application
 */
const initializeApp = async () => {
	try {
		// Initialize DOM references
		initDOMElements();

		// Set status
		document.getElementById("user-id-display").textContent =
			"Status: Local Mode";

		// Attach event listeners
		document
			.getElementById("start-button")
			.addEventListener("click", startNewTimer);
		document
			.getElementById("export-button")
			.addEventListener("click", exportData);
		document
			.getElementById("tab-tracker")
			.addEventListener("click", () => switchTab("tracker"));
		document
			.getElementById("tab-reports")
			.addEventListener("click", () => switchTab("reports"));

		// Load data from server
		await loadSuggestionsFromServer();
		await loadDataFromServer();
		await loadActiveStateFromServer();

		// Render initial UI
		renderActiveTimers();
		populateSuggestions();

		// Start timer display if needed
		if (hasRunningTimers()) {
			startTimerDisplay();
		}

		showNotification("Application loaded successfully!", "success", 2000);
	} catch (error) {
		console.error("Fatal error during initialization:", error);
		showNotification(
			"Failed to initialize application. Please refresh the page.",
			"error",
			0
		);
	}
};

/**
 * Sets up lifecycle event handlers
 */
const setupLifecycleHandlers = () => {
	// Cleanup on visibility change (pause timer updates when tab is hidden)
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			clearTimerInterval();
		} else if (hasRunningTimers()) {
			startTimerDisplay();
		}
	});

	// Cleanup on page unload
	window.addEventListener("beforeunload", (e) => {
		clearTimerInterval();

		// Warn user if there are active timers
		const activeTimerCount = Object.keys(state.activeTimers).length;
		if (activeTimerCount > 0) {
			e.preventDefault();
			e.returnValue = `You have ${activeTimerCount} active timer(s). Your progress is saved, but make sure the server is running when you return.`;
		}
	});

	// Global error handler
	window.addEventListener("error", (event) => {
		console.error("Global error caught:", event.error);
		showNotification(
			"An unexpected error occurred. Check the console for details.",
			"error"
		);
	});

	// Unhandled promise rejection handler
	window.addEventListener("unhandledrejection", (event) => {
		console.error("Unhandled promise rejection:", event.reason);
		showNotification(
			"An unexpected error occurred. Check the console for details.",
			"error"
		);
	});
};

// Start the application
setupLifecycleHandlers();
initializeApp();
