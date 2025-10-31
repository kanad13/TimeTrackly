/**
 * State management for timers and data
 *
 * ROLE IN ARCHITECTURE:
 * This module provides centralized state storage accessible to all other modules.
 * It's the \"model\" in the MVC pattern - holding all application data.
 *
 * WHY MODULE-SCOPED STATE:
 * ES6 modules are singletons - importing state.js multiple times gives you
 * the SAME state object. This provides a simple, effective state management
 * solution without needing Redux or similar libraries.
 *
 * STATE STRUCTURE:
 * - historicalEntries: Array of completed time entries (from mtt-data.json)
 * - predefinedSuggestions: Array of task suggestions (from mtt-suggestions.json)
 * - activeTimers: Object mapping timer IDs to timer objects (from mtt-active-state.json)
 * - timerInterval: Reference to setInterval for cleanup
 * - activeChartInstances: Array of Chart.js instances for cleanup
 *
 * SINGLE-USER CONTEXT - No Locking Needed:
 * In a multi-user system, you'd need locks or transactions to prevent
 * concurrent state modifications. Here, there's only one user, one browser
 * tab (practically), so simple synchronous state updates are safe.
 *
 * The server handles file locking for disk writes, but in-memory state
 * manipulation doesn't need any locking mechanism.
 *
 * TIMER STATE LIFECYCLE:
 * 1. Created: New entry in activeTimers with startTime = now, isPaused = false
 * 2. Paused: isPaused = true, accumulatedMs updated, startTime = null
 * 3. Resumed: isPaused = false, startTime = now (accumulatedMs preserved)
 * 4. Stopped: Removed from activeTimers, added to historicalEntries
 * 5. Deleted: Removed from activeTimers (not saved to history)
 *
 * IMPACT OF CHANGES:
 * - Changing state structure requires updates in ui.js, api.js, reports.js
 * - Adding state properties requires considering persistence (save/load)
 * - Module-scoped state means changes affect all importing modules
 *
 * @module state
 */

/**
 * Application state (singleton across all modules)
 */
export const state = {
	historicalEntries: [],
	predefinedSuggestions: [],
	activeTimers: {},
	timerInterval: null,
	activeChartInstances: [],
};

/**
 * Calculates total elapsed milliseconds for a timer including paused time
 * @param {Object} timer - Timer object
 * @param {number} timer.accumulatedMs - Milliseconds accumulated while paused
 * @param {boolean} timer.isPaused - Whether timer is currently paused
 * @param {Date|null} timer.startTime - When timer was last started
 * @returns {number} Total elapsed milliseconds
 */
export const calculateElapsedMs = (timer) => {
	let elapsed = timer.accumulatedMs || 0;
	if (!timer.isPaused && timer.startTime) {
		elapsed += Date.now() - timer.startTime.getTime();
	}
	return elapsed;
};

/**
 * Clears the timer interval if it exists
 */
export const clearTimerInterval = () => {
	if (state.timerInterval) {
		clearInterval(state.timerInterval);
		state.timerInterval = null;
	}
};

/**
 * Checks if any timers are currently running (not paused)
 * @returns {boolean} True if at least one timer is running
 */
export const hasRunningTimers = () => {
	return Object.values(state.activeTimers).some((t) => !t.isPaused);
};
