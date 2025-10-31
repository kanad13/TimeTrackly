/**
 * State management for timers and data
 * @module state
 */

/**
 * Application state
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
