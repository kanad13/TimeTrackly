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
 * Initializes DOM element references
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
	};
};

/**
 * Populates the datalist with predefined and recent activity suggestions
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
 * Renders all active timers grouped by project with collapsible sections
 */
export const renderActiveTimers = () => {
	if (!domElements) return;

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
			"flex justify-between items-center p-3 bg-gray-200 hover:bg-gray-300 cursor-pointer rounded-lg shadow-sm font-semibold text-gray-800";
		projectHeader.setAttribute("data-target", projectId);
		projectHeader.innerHTML = `
			<div class="flex items-center space-x-2">
				<svg id="icon-${projectId}" class="collapse-icon w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
				<span>${projectKey} (${tasks.length})</span>
			</div>
		`;

		const taskList = document.createElement("div");
		taskList.id = projectId;
		taskList.className =
			"transition-all duration-300 ease-in-out overflow-hidden h-0 space-y-2 pt-2";

		projectHeader.addEventListener("click", () => {
			const isCollapsed = taskList.classList.contains("h-0");
			const icon = document.getElementById(`icon-${projectId}`);
			if (isCollapsed) {
				taskList.classList.remove("h-0");
				taskList.style.height = `${taskList.scrollHeight}px`;
				icon.classList.add("rotate-90");
			} else {
				taskList.style.height = "0";
				icon.classList.remove("rotate-90");
				taskList.addEventListener(
					"transitionend",
					() => taskList.classList.add("h-0"),
					{ once: true }
				);
			}
		});

		tasks.forEach((activity) => {
			const card = document.createElement("div");
			card.id = `timer-card-${activity.id}`;
			let cardClasses =
				"flex flex-col bg-white p-3 rounded-lg shadow-sm border border-gray-100 ml-4";
			if (activity.isPaused) {
				cardClasses += " paused-card";
			}
			card.className = cardClasses;

			const statusText = activity.isPaused
				? '<span class="text-orange-500 font-bold mr-2">(Paused)</span>'
				: "";
			card.innerHTML = `
				<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
					<div class="flex flex-col text-left mb-2 sm:mb-0">
						<span class="text-sm font-medium text-gray-700">${statusText} ${
				activity.task
			}</span>
						<span class="text-xs text-gray-400">${
							activity.isPaused ? "Accumulated" : "Running Since"
						} ${
				activity.startTime ? activity.startTime.toLocaleTimeString() : "N/A"
			}</span>
					</div>
					<div class="flex items-center space-x-2.5 mt-2 sm:mt-0">
						<span id="duration-${
							activity.id
						}" class="text-lg font-mono text-gray-800 w-24 text-right flex-shrink-0">${formatDuration(
				Math.floor(calculateElapsedMs(activity) / CONSTANTS.MS_PER_SECOND)
			)}</span>
						<button data-action="toggle" class="${
							activity.isPaused
								? "bg-green-500 hover:bg-green-600"
								: "bg-yellow-500 hover:bg-yellow-600"
						} text-white text-xs px-3 py-1 rounded-lg transition duration-150 shadow-sm flex-shrink-0">${
				activity.isPaused ? "Resume" : "Pause"
			}</button>
						<button data-action="stop" class="bg-red-500 text-white text-xs px-3 py-1 rounded-lg hover:bg-red-600 transition duration-150 shadow-sm flex-shrink-0">Stop</button>
						<button data-action="delete" class="bg-gray-400 text-white text-xs px-3 py-1 rounded-lg hover:bg-gray-500 transition duration-150 shadow-sm flex-shrink-0">Delete</button>
					</div>
				</div>
				<div class="mt-2">
					<textarea
						id="notes-${activity.id}"
						placeholder="Add notes or comments..."
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
						rows="2"
					>${activity.notes || ""}</textarea>
				</div>
			`;

			card
				.querySelector('[data-action="toggle"]')
				.addEventListener("click", () => toggleTimer(activity.id));
			card
				.querySelector('[data-action="stop"]')
				.addEventListener("click", () => stopTimer(activity.id));
			card
				.querySelector('[data-action="delete"]')
				.addEventListener("click", () => deleteTimer(activity.id));

			// Add notes change handler
			const notesTextarea = card.querySelector(`#notes-${activity.id}`);
			notesTextarea.addEventListener("blur", async () => {
				const newNotes = notesTextarea.value;
				if (state.activeTimers[activity.id]) {
					state.activeTimers[activity.id].notes = newNotes;
					await saveActiveStateToServer();
				}
			});

			taskList.appendChild(card);
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
 * Validates input, checks for duplicates, and saves state
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

	const parts = fullTopic.split("/").map((p) => sanitizeInput(p));
	const project = parts[0] || "Uncategorized";
	const task = parts[1] || "Task";
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
 * @param {string} id - UUID of the timer to toggle
 */
export const toggleTimer = async (id) => {
	const timer = state.activeTimers[id];
	if (!timer) return;

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
};

/**
 * Deletes a timer without saving it to history
 * @param {string} id - UUID of the timer to delete
 */
export const deleteTimer = async (id) => {
	if (!state.activeTimers[id]) return;
	delete state.activeTimers[id];
	await saveActiveStateToServer();
	renderActiveTimers();
};

/**
 * Stops a timer and saves it to historical data
 * Discards timers with zero duration
 * @param {string} id - UUID of the timer to stop
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
		setTimeout(() => (domElements.errorMessage.textContent = ""), 3000);
		return;
	}

	const endTime = new Date();
	delete state.activeTimers[id];

	const newEntry = {
		project: activity.project,
		task: activity.task,
		totalDurationMs: finalDurationMs,
		durationSeconds: Math.round(finalDurationMs / CONSTANTS.MS_PER_SECOND),
		endTime: endTime.toISOString(),
		createdAt: new Date().toISOString(),
		notes: activity.notes || "",
	};

	state.historicalEntries.push(newEntry);

	await saveActiveStateToServer();
	await saveDataToServer();

	renderActiveTimers();

	const tempStatus = document.createElement("p");
	tempStatus.className = "text-center text-sm text-green-600 mt-2";
	tempStatus.textContent = `Saved ${activity.project} / ${
		activity.task
	} (${formatDuration(newEntry.durationSeconds)})`;
	domElements.activeTimersList.insertAdjacentElement("afterend", tempStatus);
	setTimeout(() => tempStatus.remove(), 4000);

	populateSuggestions();
};

/**
 * Exports all historical data as a CSV file
 * Includes computed duration in minutes
 */
export const exportData = () => {
	if (!domElements) return;

	if (state.historicalEntries.length === 0) {
		alert("No data to export.");
		return;
	}
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

	domElements.exportButton.textContent = "Export All Data (CSV)";
	domElements.exportButton.disabled = false;
};
