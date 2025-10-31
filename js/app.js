/**
 * Main application initialization and orchestration
 *
 * ROLE IN ARCHITECTURE:
 * This is the entry point for the entire frontend application. It orchestrates
 * the initialization sequence and sets up application lifecycle handlers.
 *
 * INITIALIZATION ORDER (CRITICAL):
 * The order of operations in initializeApp() matters:
 * 1. Initialize DOM element references FIRST (ui.js needs these)
 * 2. Load server data (suggestions, historical, active state)
 * 3. Render UI with loaded data
 * 4. Start timer display if needed
 *
 * WHY THIS ORDER:
 * - DOM elements must exist before any UI operations
 * - Data must load before rendering (or UI shows stale/empty state)
 * - Timer display only starts if there are running timers
 *
 * LIFECYCLE HANDLERS:
 * - visibilitychange: Pauses timer updates when tab hidden (saves CPU)
 * - beforeunload: Warns user about active timers, cleans up intervals
 * - error/unhandledrejection: Catches and logs unexpected errors
 *
 * SINGLE-USER CONTEXT:
 * No need for authentication, sessions, or multi-user coordination.
 * The "user" is whoever is using the browser on this machine.
 *
 * ERROR HANDLING STRATEGY:
 * - Fatal errors (can't load data): Show error message, stop initialization
 * - Non-fatal errors (can't restore session): Show notification, continue with fresh state
 * - Global errors: Log and notify user, but don't crash the app
 *
 * IMPACT OF CHANGES:
 * - Changing initialization order can cause undefined reference errors
 * - Removing lifecycle handlers causes memory leaks and poor UX
 * - Not awaiting data loads causes race conditions
 *
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

		// Setup Data Entry section collapse/expand (collapsed by default)
		const dataEntryHeader = document.getElementById("data-entry-header");
		const dataEntryContent = document.getElementById("data-entry-content");
		const dataEntryIcon = document.getElementById("icon-data-entry");

		dataEntryHeader.addEventListener("click", () => {
			const isCollapsed = dataEntryContent.classList.contains("h-0");
			if (isCollapsed) {
				dataEntryContent.classList.remove("h-0");
				dataEntryContent.style.height = `${dataEntryContent.scrollHeight}px`;
				dataEntryIcon.classList.add("rotate-90");
			} else {
				dataEntryContent.style.height = "0";
				dataEntryIcon.classList.remove("rotate-90");
				dataEntryContent.addEventListener(
					"transitionend",
					() => dataEntryContent.classList.add("h-0"),
					{ once: true }
				);
			}
		});

		// Setup Active Timers section collapse/expand (expanded by default)
		const activeTimersHeader = document.getElementById("active-timers-header");
		const activeTimersContent = document.getElementById(
			"active-timers-content"
		);
		const activeTimersIcon = document.getElementById("icon-active-timers");

		activeTimersHeader.addEventListener("click", () => {
			const isExpanded =
				activeTimersContent.style.height !== "0px" &&
				activeTimersContent.style.height !== "";
			if (isExpanded) {
				activeTimersContent.style.height = "0";
				activeTimersIcon.classList.remove("rotate-90");
			} else {
				activeTimersContent.style.height = "auto";
				activeTimersIcon.classList.add("rotate-90");
			}
		});

		// Setup Data Export section collapse/expand (collapsed by default)
		const dataExportHeader = document.getElementById("data-export-header");
		const dataExportContent = document.getElementById("data-export-content");
		const dataExportIcon = document.getElementById("icon-data-export");

		dataExportHeader.addEventListener("click", () => {
			const isCollapsed = dataExportContent.classList.contains("h-0");
			if (isCollapsed) {
				dataExportContent.classList.remove("h-0");
				dataExportContent.style.height = `${dataExportContent.scrollHeight}px`;
				dataExportIcon.classList.add("rotate-90");
			} else {
				dataExportContent.style.height = "0";
				dataExportIcon.classList.remove("rotate-90");
				dataExportContent.addEventListener(
					"transitionend",
					() => dataExportContent.classList.add("h-0"),
					{ once: true }
				);
			}
		});

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
