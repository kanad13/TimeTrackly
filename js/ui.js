/**
 * UI rendering and timer control functions
 *
 * ROLE IN ARCHITECTURE:
 * This is the largest module, handling all DOM manipulation and user interactions.
 * It's the "controller" in the MVC pattern - responding to user actions and updating the view.
 *
 * RESPONSIBILITIES:
 * 1. DOM element manipulation (reading inputs, rendering timers)
 * 2. Timer lifecycle management (start, pause, resume, stop, delete)
 * 3. User input validation and sanitization
 * 4. Notes/comments management for active timers
 * 5. CSV export generation (including notes)
 * 6. Real-time timer display updates
 *
 * UI UPDATE FLOW:
 * User Action → Handler Function → Update State → Save to Server → Re-render UI
 *
 * Example: User clicks "Stop"
 * 1. stopTimer(id) called
 * 2. Calculate final duration, remove from activeTimers
 * 3. Add to historicalEntries (including notes)
 * 4. await saveActiveStateToServer() + saveDataToServer()
 * 5. renderActiveTimers() updates DOM
 * 6. populateSuggestions() adds task to dropdown
 *
 * TIMER LIFECYCLE:
 * Created → Running ⇄ Paused → Stopped (saved with notes) or Deleted (discarded)
 *
 * NOTES FEATURE:
 * Each timer has an associated textarea for notes/comments.
 * - Notes auto-save on blur (when user clicks away)
 * - Notes persist when stopping timers (included in historical entries)
 * - Notes are included in CSV exports with proper escaping
 * - Empty notes are stored as empty strings
 *
 * DUPLICATE DETECTION:
 * Uses lowercase "project:task" keys to prevent duplicate timers.
 * Example: "Project A / Task 1" and "project a / task 1" are considered duplicates.
 * This prevents confusion and ensures data consistency.
 *
 * CSV EXPORT FORMAT:
 * Includes computed durationMinutes for Excel/Sheets compatibility.
 * Double-quotes are escaped to prevent CSV injection.
 * Notes column includes multiline text with proper escaping.
 * Filename includes ISO date for easy organization.
 *
 * SINGLE-USER CONTEXT:
 * - No optimistic UI updates (server save is fast, blocking is acceptable)
 * - No undo/redo (user can manually recreate if needed)
 * - No conflict resolution (no concurrent edits possible)
 *
 * IMPACT OF CHANGES:
 * - Changing DOM element IDs requires updates here
 * - Modifying state structure requires changes to renderActiveTimers()
 * - Changing save flow order can cause race conditions
 * - Not awaiting saves can cause data loss
 *
 * @module ui
 */

import {
	state,
	calculateElapsedMs,
	clearTimerInterval,
	hasRunningTimers,
} from "./state.js";
import { saveActiveStateToServer, saveDataToServer } from "./api.js";
import {
	formatDuration,
	generateUUID,
	getRunningTasksKey,
	sanitizeInput,
	showNotification,
} from "./utils.js";
import { CONSTANTS } from "./constants.js";

// DOM Element References
let domElements = null;

/**
 * Initializes DOM element references for use throughout the UI module
 *
 * Caches references to frequently accessed DOM elements in the domElements object.
 * Must be called during app initialization before any UI operations.
 *
 * @returns {void}
 */
export const initDOMElements = () => {
	domElements = {
		topicInput: document.getElementById("topic-input"),
		startButton: document.getElementById("start-button"),
		exportButton: document.getElementById("export-button"),
		activeTimersList: document.getElementById("active-timers-list"),
		activeCount: document.getElementById("active-count"),
		noActiveMessage: document.getElementById("no-active-message"),
		userIdDisplay: document.getElementById("user-id-display"),
		errorMessage: document.getElementById("error-message"),
		suggestionsDatalist: document.getElementById("activity-suggestions"),
		notesModalBackdrop: document.getElementById("notes-modal-backdrop"),
		notesModal: document.getElementById("notes-modal"),
		notesModalTitle: document.getElementById("notes-modal-title"),
		notesModalTextarea: document.getElementById("notes-modal-textarea"),
		notesModalClose: document.getElementById("notes-modal-close"),
		notesModalCancel: document.getElementById("notes-modal-cancel"),
		notesModalSave: document.getElementById("notes-modal-save"),
	};
};

/**
 * Populates the datalist with predefined and recent activity suggestions
 *
 * Combines predefined suggestions from the server with recent activities from
 * historical entries to provide autocomplete options. Eliminates duplicates
 * and formats entries as "Project / Task".
 *
 * @returns {void}
 */
export const populateSuggestions = () => {
	if (!domElements) return;

	domElements.suggestionsDatalist.innerHTML = "";
	const recentActivities = new Set(
		state.historicalEntries
			.map((entry) =>
				entry.project && entry.task
					? `${entry.project.trim()} / ${entry.task.trim()}`
					: null
			)
			.filter(Boolean)
	);
	const combined = new Set([
		...state.predefinedSuggestions,
		...recentActivities,
	]);
	combined.forEach((activity) => {
		const option = document.createElement("option");
		option.value = activity;
		domElements.suggestionsDatalist.appendChild(option);
	});
};

/**
 * Modal state for tracking which timer's notes are being edited
 */
let currentNotesEditingId = null;

/**
 * Opens the notes modal dialog for editing a specific timer's notes
 *
 * Displays a modal dialog with the current notes for the timer. Updates the
 * modal title with the task name and focuses the textarea for immediate editing.
 *
 * @param {string} activityId - UUID of the timer to edit notes for
 * @returns {void}
 */
export const openNotesModal = (activityId) => {
	if (!domElements) return;

	currentNotesEditingId = activityId;
	const activity = state.activeTimers[activityId];

	if (!activity) return;

	// Set modal title with task name
	domElements.notesModalTitle.textContent = `Notes for ${activity.task}`;
	domElements.notesModalTextarea.value = activity.notes || "";
	domElements.notesModal.classList.add("active");
	domElements.notesModalBackdrop.classList.add("active");
	domElements.notesModalTextarea.focus();
};

/**
 * Closes the notes modal dialog without saving changes
 *
 * Hides the modal backdrop and resets the current editing state.
 * Any unsaved changes are discarded.
 *
 * @returns {void}
 */
export const closeNotesModal = () => {
	if (!domElements) return;

	domElements.notesModal.classList.remove("active");
	domElements.notesModalBackdrop.classList.remove("active");
	currentNotesEditingId = null;
};

/**
 * Saves notes from the modal to the timer state
 *
 * Updates the timer's notes field and persists to server. If save fails,
 * rolls back changes and displays error notification.
 *
 * @async
 * @returns {Promise<void>}
 */
export const saveNotesModal = async () => {
	if (!currentNotesEditingId || !domElements) return;

	const activity = state.activeTimers[currentNotesEditingId];
	if (!activity) return;

	const newNotes = domElements.notesModalTextarea.value;
	const previousNotes = activity.notes;

	activity.notes = newNotes;

	try {
		await saveActiveStateToServer();
		closeNotesModal();
	} catch (error) {
		console.error("Error saving notes:", error);
		activity.notes = previousNotes;
		domElements.notesModalTextarea.value = previousNotes;
		showNotification(
			"Failed to save notes. Please try again.",
			"error"
		);
	}
};

/**
 * Initializes event listeners for the notes modal dialog
 *
 * Sets up click handlers for close/cancel/save buttons, backdrop clicks,
 * and ESC key press for closing the modal. Must be called during app initialization.
 *
 * @returns {void}
 */
export const initNotesModal = () => {
	if (!domElements) return;

	// Close button
	domElements.notesModalClose?.addEventListener("click", closeNotesModal);

	// Cancel button
	domElements.notesModalCancel?.addEventListener("click", closeNotesModal);

	// Save button
	domElements.notesModalSave?.addEventListener("click", saveNotesModal);

	// Click outside (backdrop) to close
	domElements.notesModalBackdrop?.addEventListener("click", (e) => {
		if (e.target === domElements.notesModalBackdrop) {
			closeNotesModal();
		}
	});

	// ESC key to close
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && domElements.notesModal.classList.contains("active")) {
			closeNotesModal();
		}
	});
};

/**
 * Renders all active timers grouped by project with collapsible sections
 *
 * Creates a hierarchical display of timers organized by project. Each project
 * has a collapsible header with task count. Each task shows status, duration,
 * and action buttons (pause/resume, stop, delete, notes). Updates the active
 * timer count badge.
 *
 * @returns {void}
 */
export const renderActiveTimers = () => {
	if (!domElements) return;

	// BUGFIX: Preserve expanded/collapsed state across re-renders
	// Before clearing DOM, capture which projects are currently expanded
	const currentlyExpandedProjects = new Set();
	domElements.activeTimersList.querySelectorAll('.project-header').forEach(header => {
		const projectId = header.getAttribute('data-target');
		const taskList = document.getElementById(projectId);
		if (taskList && !taskList.classList.contains('h-0')) {
			currentlyExpandedProjects.add(projectId);
		}
	});
	// Update state with current expanded projects
	state.expandedProjects = currentlyExpandedProjects;

	domElements.activeTimersList.innerHTML = "";
	const timersArray = Object.entries(state.activeTimers).map(([id, data]) => ({
		id,
		...data,
	}));

	if (timersArray.length === 0) {
		domElements.noActiveMessage.classList.remove("hidden");
		domElements.activeCount.textContent = 0;
		return;
	}
	domElements.noActiveMessage.classList.add("hidden");
	domElements.activeCount.textContent = timersArray.length;

	const projects = timersArray.reduce((acc, timer) => {
		const projectKey = timer.project;
		if (!acc[projectKey]) {
			acc[projectKey] = [];
		}
		acc[projectKey].push(timer);
		return acc;
	}, {});

	const sortedProjects = Object.keys(projects).sort((a, b) =>
		a.toLowerCase().localeCompare(b.toLowerCase())
	);

	sortedProjects.forEach((projectKey) => {
		const tasks = projects[projectKey];
		const projectId = projectKey.replace(/\s/g, "_");

		const projectHeader = document.createElement("div");
		projectHeader.className =
			"project-header flex justify-between items-center p-3 bg-gray-100 cursor-pointer rounded-lg font-semibold text-gray-800 border-b border-gray-300";
		projectHeader.setAttribute("data-target", projectId);

		// Create header content
		const headerContent = document.createElement("div");
		headerContent.className = "flex items-center space-x-2 flex-1";
		headerContent.innerHTML = `
			<svg id="icon-${projectId}" class="collapse-icon w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
			<span>${projectKey} (${tasks.length})</span>
		`;

		// STEP 5: Create project action button (add new task in this project)
		const projectActionBtn = document.createElement("button");
		projectActionBtn.className = "project-action-btn material-icons";
		projectActionBtn.textContent = "add";
		projectActionBtn.setAttribute("title", `Add new task to ${projectKey}`);
		projectActionBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			// Pre-fill input with project name and focus
			const input = document.getElementById("topic-input");
			if (input) {
				input.value = `${projectKey} / `;
				input.focus();
				// Position cursor after the " / "
				input.setSelectionRange(
					input.value.length,
					input.value.length
				);
			}
		});

		projectHeader.appendChild(headerContent);
		projectHeader.appendChild(projectActionBtn);

		const taskList = document.createElement("div");
		taskList.id = projectId;
		taskList.className =
			"transition-all duration-300 ease-in-out overflow-hidden h-0 space-y-2 pt-2";

		// Handle collapse/expand (click on header, but not the action button)
		projectHeader.addEventListener("click", (e) => {
			// Don't toggle if clicked on the action button
			if (e.target.closest(".project-action-btn")) {
				return;
			}

			const isCollapsed = taskList.classList.contains("h-0");
			const icon = document.getElementById(`icon-${projectId}`);
			if (isCollapsed) {
				// Expanding
				taskList.classList.remove("h-0");
				taskList.style.height = `${taskList.scrollHeight}px`;
				icon.classList.add("rotate-90");
				state.expandedProjects.add(projectId); // Track expanded state
			} else {
				// Collapsing
				taskList.style.height = "0";
				icon.classList.remove("rotate-90");
				state.expandedProjects.delete(projectId); // Track collapsed state
				taskList.addEventListener(
					"transitionend",
					() => taskList.classList.add("h-0"),
					{ once: true }
				);
			}
		});

		// BUGFIX: Restore expanded state after rebuilding DOM
		// Check if this project was expanded before re-render
		if (state.expandedProjects.has(projectId)) {
			// Restore expanded state immediately after creation
			setTimeout(() => {
				taskList.classList.remove("h-0");
				taskList.style.height = `${taskList.scrollHeight}px`;
				const icon = document.getElementById(`icon-${projectId}`);
				if (icon) icon.classList.add("rotate-90");
			}, 0);
		}

		tasks.forEach((activity) => {
			// STEP 1: Create compact horizontal task row
			const rowContainer = document.createElement("div");
			rowContainer.className = "task-row-wrapper flex flex-col ml-4 mb-2";

			const row = document.createElement("div");
			row.id = `timer-row-${activity.id}`;
			row.setAttribute("data-timer-id", activity.id);
			row.className = `task-row flex items-center gap-2 px-3 py-2.5 rounded-lg elevation-1 border border-gray-200 bg-white cursor-pointer transition-all duration-200 hover:bg-gray-50 group`;

			if (activity.isPaused) {
				row.classList.add("task-row-paused");
			} else {
				row.classList.add("task-row-active");
			}

			const toggleAction = activity.isPaused ? "resume" : "pause";
			const toggleClass = activity.isPaused
				? "bg-green-500 hover:bg-green-600"
				: "bg-yellow-500 hover:bg-yellow-600";
			const toggleLabel = activity.isPaused ? "Resume" : "Pause";

			// Status indicator (colored circle)
			const statusIndicator = document.createElement("span");
			statusIndicator.className = `status-indicator flex-shrink-0 w-3 h-3 rounded-full ${
				activity.isPaused ? "bg-yellow-500" : "bg-blue-500"
			}`;

			// Task name
			const taskNameSpan = document.createElement("span");
			taskNameSpan.className = "task-name flex-1 text-sm font-medium text-gray-800 truncate";
			taskNameSpan.textContent = activity.task;


			// Duration display (right-aligned)
			const durationSpan = document.createElement("span");
			durationSpan.id = `duration-${activity.id}`;
			durationSpan.className = "duration flex-shrink-0 text-sm font-mono text-gray-700 w-20 text-right";
			durationSpan.textContent = formatDuration(
				Math.floor(calculateElapsedMs(activity) / CONSTANTS.MS_PER_SECOND)
			);

			// Action buttons (always visible)
			const actionButtons = document.createElement("div");
			actionButtons.className = "action-buttons flex items-center gap-2 flex-shrink-0";
			actionButtons.innerHTML = `
				<button data-action="${toggleAction}" class="${toggleClass} text-white text-xs px-2.5 py-1.5 rounded transition duration-150 shadow-sm min-w-16">${toggleLabel}</button>
				<button data-action="stop" class="bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1.5 rounded transition duration-150 shadow-sm">Stop</button>
				<button data-action="delete" class="bg-gray-400 hover:bg-gray-500 text-white text-xs px-2.5 py-1.5 rounded transition duration-150 shadow-sm">Delete</button>
				<button data-action="notes" class="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-2.5 py-1.5 rounded transition duration-150 shadow-sm">Notes</button>
			`;

			// Build row
			row.appendChild(statusIndicator);
			row.appendChild(taskNameSpan);
			row.appendChild(durationSpan);
			row.appendChild(actionButtons);

			// Add to wrapper (notes are now handled by modal)
			rowContainer.appendChild(row);

			// Event handlers
			const toggleButton = row.querySelector(`[data-action="${toggleAction}"]`);
			if (toggleButton) {
				toggleButton.addEventListener("click", (e) => {
					e.stopPropagation();
					toggleTimer(activity.id);
				});
			}

			const stopButton = row.querySelector('[data-action="stop"]');
			if (stopButton) {
				stopButton.addEventListener("click", (e) => {
					e.stopPropagation();
					stopTimer(activity.id);
				});
			}

			const deleteButton = row.querySelector('[data-action="delete"]');
			if (deleteButton) {
				deleteButton.addEventListener("click", (e) => {
					e.stopPropagation();
					deleteTimer(activity.id);
				});
			}

			const notesButton = row.querySelector('[data-action="notes"]');
			if (notesButton) {
				notesButton.addEventListener("click", (e) => {
					e.stopPropagation();
					openNotesModal(activity.id);
				});
			}


			taskList.appendChild(rowContainer);
		});
		domElements.activeTimersList.appendChild(projectHeader);
		domElements.activeTimersList.appendChild(taskList);
	});

	// Update active count display after rendering
	domElements.activeCount.textContent = Object.keys(state.activeTimers).length;
	domElements.noActiveMessage.classList.toggle(
		"hidden",
		Object.keys(state.activeTimers).length > 0
	);
};

/**
 * Updates the display of all timer durations
 *
 * CALLED BY: setInterval every 1 second (see startTimerDisplay)
 *
 * WHY: Running timers need to show incrementing time in real-time.
 * Without this, the display would freeze at the start time.
 *
 * OPTIMIZATION: Paused timers don't change, but updating all is simpler
 * than tracking which ones need updates. With single-user constraints,
 * there won't be enough timers for this to cause performance issues.
 *
 * AUTO-CLEANUP: If no timers are running, stops the interval to save CPU.
 */
export const updateTimerDisplay = () => {
	for (const id in state.activeTimers) {
		const activity = state.activeTimers[id];
		const durationSpan = document.getElementById(`duration-${id}`);
		if (durationSpan) {
			const elapsedSeconds = Math.floor(
				calculateElapsedMs(activity) / CONSTANTS.MS_PER_SECOND
			);
			durationSpan.textContent = formatDuration(elapsedSeconds);
		}
	}

	if (!hasRunningTimers()) {
		clearTimerInterval();
	}
};

/**
 * Starts the timer display update loop
 *
 * Creates an interval that updates all timer displays every second. Only creates
 * a new interval if one doesn't already exist (prevents duplicate intervals).
 *
 * @returns {void}
 */
export const startTimerDisplay = () => {
	if (!state.timerInterval) {
		state.timerInterval = setInterval(
			updateTimerDisplay,
			CONSTANTS.TIMER_UPDATE_INTERVAL
		);
	}
};

/**
 * Starts a new timer for a project/task
 *
 * Validates user input, checks for duplicate running timers (case-insensitive),
 * creates a new timer in activeTimers state, saves to server, and updates UI.
 * Prevents multiple timers for the same project/task combination.
 *
 * Input format: "Project / Task" or just "Project" (defaults to "Task")
 *
 * @async
 * @returns {Promise<void>}
 */
export const startNewTimer = async () => {
	if (!domElements) return;

	domElements.errorMessage.textContent = "";
	const fullTopic = sanitizeInput(domElements.topicInput.value);
	if (!fullTopic) {
		domElements.errorMessage.textContent =
			"Please enter or select a Project / Task.";
		return;
	}

	const parts = fullTopic.split("/").map((p) => sanitizeInput(p).trim());
	const project = (parts[0] || "Uncategorized").trim();
	const task = (parts[1] || "Task").trim();
	const taskKey = getRunningTasksKey(project, task);

	// DUPLICATE DETECTION:
	// Prevents multiple timers for the same project/task combination.
	// Uses case-insensitive comparison to avoid "Project / Task" and "project / task" both running.
	// This is a UX decision - having duplicates would make reports confusing.
	if (
		Object.values(state.activeTimers).some(
			(t) => getRunningTasksKey(t.project, t.task) === taskKey
		)
	) {
		domElements.errorMessage.textContent = `Error: The task "${project} / ${task}" is already running.`;
		return;
	}

	const newId = generateUUID();
	state.activeTimers[newId] = {
		project,
		task,
		startTime: new Date(),
		accumulatedMs: 0,
		isPaused: false,
		notes: "",
	};

	domElements.topicInput.value = "";

	try {
		await saveActiveStateToServer();
		renderActiveTimers();
		startTimerDisplay();
	} catch (error) {
		delete state.activeTimers[newId];
		domElements.errorMessage.textContent =
			"Failed to start timer. Please try again.";
	}
};

/**
 * Toggles a timer between paused and running states
 *
 * If running: Pauses the timer, accumulates elapsed time, and clears startTime.
 * If paused: Resumes the timer, sets new startTime, and keeps accumulated time.
 * Rolls back changes if server save fails.
 *
 * @async
 * @param {string} id - UUID of the timer to toggle
 * @returns {Promise<void>}
 */
export const toggleTimer = async (id) => {
	const timer = state.activeTimers[id];
	if (!timer) return;

	const previousState = {
		isPaused: timer.isPaused,
		startTime: timer.startTime,
		accumulatedMs: timer.accumulatedMs,
	};

	try {
		if (timer.isPaused) {
			timer.isPaused = false;
			timer.startTime = new Date();
		} else {
			timer.accumulatedMs += Date.now() - timer.startTime.getTime();
			timer.startTime = null;
			timer.isPaused = true;
		}

		await saveActiveStateToServer();
		renderActiveTimers();
		startTimerDisplay();
	} catch (error) {
		console.error("Error toggling timer:", error);
		// Rollback to previous state
		timer.isPaused = previousState.isPaused;
		timer.startTime = previousState.startTime;
		timer.accumulatedMs = previousState.accumulatedMs;
		renderActiveTimers(); // Update UI to reflect rollback
		showNotification("Failed to toggle timer. Please try again.", "error");
	}
};
/**
 * Deletes a timer without saving it to history
 *
 * SAFETY: Requires user confirmation before deletion to prevent accidental data loss.
 *
 * ERROR HANDLING & ROLLBACK:
 * If server save fails, we restore the timer to state and show error message.
 * This prevents silent data loss if the network is down.
 *
 * @param {string} id - UUID of the timer to delete
 */
export const deleteTimer = async (id) => {
	if (!state.activeTimers[id]) return;

	// Store backup in case we need to rollback
	const timerBackup = state.activeTimers[id];

	// Confirmation dialog to prevent accidental deletion
	const taskName = `${timerBackup.project} / ${timerBackup.task}`;
	const confirmed = confirm(
		`Delete "${taskName}"?\n\nThis timer will be permanently discarded without being saved to history.`
	);

	if (!confirmed) return;

	try {
		delete state.activeTimers[id];
		await saveActiveStateToServer();
		renderActiveTimers();
	} catch (error) {
		// Rollback: restore timer if save failed
		state.activeTimers[id] = timerBackup;
		renderActiveTimers();

		// Show error to user
		const msg = `Failed to delete timer. Please try again.`;
		console.error("Delete timer error:", error);
		if (domElements) {
			domElements.errorMessage.textContent = msg;
			setTimeout(() => (domElements.errorMessage.textContent = ""), CONSTANTS.NOTIFICATION_DURATION);
		}
	}
};

/**
 * Stops a timer and saves it to historical data
 *
 * Calculates final duration, creates a historical entry with notes, saves to
 * server, and removes from active timers. Automatically discards timers with
 * zero duration. Updates UI and adds the task to suggestions.
 *
 * @async
 * @param {string} id - UUID of the timer to stop
 * @returns {Promise<void>}
 */
export const stopTimer = async (id) => {
	if (!domElements) return;

	const activity = state.activeTimers[id];
	if (!activity) return;

	const finalDurationMs = calculateElapsedMs(activity);
	if (finalDurationMs <= 0) {
		deleteTimer(id);
		domElements.errorMessage.textContent =
			"Task of zero duration was discarded.";
		setTimeout(() => (domElements.errorMessage.textContent = ""), CONSTANTS.STATUS_MESSAGE_DURATION);
		return;
	}

	const endTime = new Date();
	const startTime = new Date(endTime.getTime() - finalDurationMs);

	const newEntry = {
		project: activity.project,
		task: activity.task,
		totalDurationMs: finalDurationMs,
		durationSeconds: Math.round(finalDurationMs / CONSTANTS.MS_PER_SECOND),
		endTime: endTime.toISOString(),
		createdAt: startTime.toISOString(),
		notes: activity.notes || "",
	};

	try {
		// Remove from active timers and add to history
		delete state.activeTimers[id];
		state.historicalEntries.push(newEntry);

		// Persist both changes to server
		await saveActiveStateToServer();
		await saveDataToServer();

		renderActiveTimers();

		// Show success message
		const tempStatus = document.createElement("p");
		tempStatus.className = "text-center text-sm text-green-600 mt-2";
		tempStatus.textContent = `Saved ${activity.project} / ${
			activity.task
		} (${formatDuration(newEntry.durationSeconds)})`;
		domElements.activeTimersList.insertAdjacentElement("afterend", tempStatus);
		setTimeout(() => tempStatus.remove(), CONSTANTS.NOTIFICATION_DURATION);

		populateSuggestions();
	} catch (error) {
		// Rollback: restore timer to active state and remove from history
		state.activeTimers[id] = activity;
		state.historicalEntries.pop(); // Remove the entry we just added
		renderActiveTimers();
		console.error("Error stopping timer:", error);
		showNotification("Failed to save timer. Please try again.", "error");
	}
};

/**
 * Exports all historical data as a CSV file
 *
 * Generates a CSV file with all historical time entries including project, task,
 * endTime, duration (seconds and minutes), totalDurationMs, and notes. Properly
 * escapes CSV special characters. Filename includes current date.
 *
 * @returns {void}
 */
export const exportData = () => {
	if (!domElements) return;

	if (state.historicalEntries.length === 0) {
		showNotification("No data to export.", "info");
		return;
	}

	try {
		domElements.exportButton.textContent = "Generating...";
		domElements.exportButton.disabled = true;

		const headers = [
			"project",
			"task",
			"endTime",
			"durationSeconds",
			"durationMinutes",
			"totalDurationMs",
			"notes",
		];
		const csvRows = [headers.join(",")];
		state.historicalEntries.forEach((entry) => {
			const row = {
				...entry,
				endTime: new Date(entry.endTime).toISOString(),
				durationMinutes: (entry.durationSeconds / 60).toFixed(2),
			};
			const values = headers.map(
				(header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`
			);
			csvRows.push(values.join(","));
		});

		const blob = new Blob([csvRows.join("\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `time_tracker_export_${
			new Date().toISOString().split("T")[0]
		}.csv`;
		link.click();

		showNotification("Data exported successfully!", "success", 2000);
	} catch (error) {
		console.error("Error exporting data:", error);
		showNotification("Failed to export data. Please try again.", "error");
	} finally {
		domElements.exportButton.textContent = "Export All Data (CSV)";
		domElements.exportButton.disabled = false;
	}
};
