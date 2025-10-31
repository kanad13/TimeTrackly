/**
 * Utility functions for the Time Tracker application
 * @module utils
 */

import { CONSTANTS, CHART_COLORS } from "./constants.js";

/**
 * Generates a unique identifier using the Web Crypto API
 * @returns {string} UUID v4 string
 */
export const generateUUID = () => crypto.randomUUID();

/**
 * Formats a duration in seconds to HH:MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (HH:MM:SS)
 */
export const formatDuration = (seconds) => {
	const h = Math.floor(
		seconds / CONSTANTS.MS_PER_HOUR / CONSTANTS.MS_PER_SECOND
	);
	const m = Math.floor(
		(seconds % (CONSTANTS.MS_PER_HOUR / CONSTANTS.MS_PER_SECOND)) /
			(CONSTANTS.MS_PER_MINUTE / CONSTANTS.MS_PER_SECOND)
	);
	const s = seconds % (CONSTANTS.MS_PER_MINUTE / CONSTANTS.MS_PER_SECOND);
	return [h, m, s].map((v) => (v < 10 ? "0" + v : v)).join(":");
};

/**
 * Sanitizes user input to prevent issues with special characters
 * @param {string} str - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (str) => {
	if (typeof str !== "string") return "";
	return str
		.trim()
		.replace(/[<>\"\']/g, "")
		.substring(0, CONSTANTS.MAX_INPUT_LENGTH);
};

/**
 * Creates a unique key for identifying running tasks
 * @param {string} project - Project name
 * @param {string} task - Task name
 * @returns {string} Lowercase key in format "project:task"
 */
export const getRunningTasksKey = (project, task) =>
	`${project.toLowerCase()}:${task.toLowerCase()}`;

/**
 * Generates an array of distinct colors for chart visualization
 * @param {number} count - Number of colors needed
 * @returns {string[]} Array of hex color codes
 */
export const getDistinctColors = (count) => {
	const result = [];
	for (let i = 0; i < count; i++) {
		result.push(CHART_COLORS[i % CHART_COLORS.length]);
	}
	return result;
};

/**
 * Shows a temporary notification to the user
 * @param {string} message - Message to display
 * @param {string} type - Type of notification ('error', 'success', 'info')
 * @param {number} duration - Duration in milliseconds (0 for persistent)
 */
export const showNotification = (
	message,
	type = "info",
	duration = CONSTANTS.NOTIFICATION_DURATION
) => {
	const notification = document.createElement("div");
	const bgColor =
		type === "error"
			? "bg-red-100 border-red-400 text-red-700"
			: type === "success"
			? "bg-green-100 border-green-400 text-green-700"
			: "bg-blue-100 border-blue-400 text-blue-700";

	notification.className = `fixed top-4 right-4 border-l-4 p-4 ${bgColor} rounded shadow-lg z-50 max-w-md transition-opacity duration-300`;
	notification.textContent = message;
	document.body.appendChild(notification);

	if (duration > 0) {
		setTimeout(() => {
			notification.style.opacity = "0";
			setTimeout(() => notification.remove(), 300);
		}, duration);
	}
};
