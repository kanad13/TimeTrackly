/**
 * Centralized Logging and Error Handling System
 *
 * Provides consistent error handling, logging, and user notifications
 * across the application. All errors should be logged through this module
 * for consistency and better debugging.
 *
 * LOG LEVELS:
 * - debug: Detailed diagnostic information (dev-only)
 * - info: General information about application flow
 * - warn: Warning conditions (e.g., missing data with fallback)
 * - error: Error conditions that affect functionality
 * - fatal: Critical errors that break the application
 *
 * ERROR CATEGORIES:
 * - NETWORK: Server communication failures
 * - VALIDATION: Input validation failures
 * - PERSISTENCE: Data save/load failures
 * - UI: User interface rendering errors
 * - STATE: State management errors
 * - UNEXPECTED: Uncaught exceptions
 *
 * @module logger
 */

const LOG_LEVELS = {
	DEBUG: "debug",
	INFO: "info",
	WARN: "warn",
	ERROR: "error",
	FATAL: "fatal",
};

const ERROR_CATEGORIES = {
	NETWORK: "NETWORK",
	VALIDATION: "VALIDATION",
	PERSISTENCE: "PERSISTENCE",
	UI: "UI",
	STATE: "STATE",
	UNEXPECTED: "UNEXPECTED",
};

/**
 * Logs a message with context information
 *
 * @param {string} level - Log level (debug, info, warn, error, fatal)
 * @param {string} message - Human-readable message
 * @param {string} category - Error category for classification
 * @param {Object} context - Additional context (error object, data, etc.)
 */
const logMessage = (level, message, category = "", context = {}) => {
	const timestamp = new Date().toISOString();
	const logEntry = {
		level,
		timestamp,
		message,
		category,
		...context,
	};

	// Output to console with styling
	const styles = {
		debug: "color: #999; font-weight: normal;",
		info: "color: #4285f4; font-weight: bold;",
		warn: "color: #ff9800; font-weight: bold;",
		error: "color: #f44336; font-weight: bold;",
		fatal: "color: #8b0000; font-weight: bold;",
	};

	const style = styles[level] || "";
	console.log(
		`%c[${level.toUpperCase()}]`,
		style,
		message,
		category ? `(${category})` : "",
		context
	);

	// In production, could send to error tracking service
	// e.g., Sentry, LogRocket, etc.
};

/**
 * Logs a debug message
 *
 * @param {string} message - Message to log
 * @param {Object} context - Additional context
 */
export const logDebug = (message, context = {}) => {
	logMessage(LOG_LEVELS.DEBUG, message, "", context);
};

/**
 * Logs an info message
 *
 * @param {string} message - Message to log
 * @param {Object} context - Additional context
 */
export const logInfo = (message, context = {}) => {
	logMessage(LOG_LEVELS.INFO, message, "", context);
};

/**
 * Logs a warning message
 *
 * @param {string} message - Message to log
 * @param {string} category - Error category
 * @param {Object} context - Additional context
 */
export const logWarn = (message, category = "", context = {}) => {
	logMessage(LOG_LEVELS.WARN, message, category, context);
};

/**
 * Logs an error message
 *
 * @param {string} message - Message to log
 * @param {string} category - Error category
 * @param {Error} error - The error object
 * @param {Object} context - Additional context
 */
export const logError = (message, category = "", error = null, context = {}) => {
	const errorContext = {
		...context,
		...(error && {
			errorMessage: error.message,
			errorStack: error.stack,
			errorName: error.name,
		}),
	};
	logMessage(LOG_LEVELS.ERROR, message, category, errorContext);
};

/**
 * Logs a fatal error and may halt execution
 *
 * @param {string} message - Message to log
 * @param {Error} error - The error object
 * @param {Object} context - Additional context
 */
export const logFatal = (message, error = null, context = {}) => {
	const errorContext = {
		...context,
		...(error && {
			errorMessage: error.message,
			errorStack: error.stack,
			errorName: error.name,
		}),
	};
	logMessage(LOG_LEVELS.FATAL, message, ERROR_CATEGORIES.UNEXPECTED, errorContext);
};

/**
 * Network error handler
 *
 * Handles server communication failures with appropriate logging
 *
 * @param {string} operation - What operation failed (e.g., "load data")
 * @param {Error} error - The error object
 * @param {boolean} isFatal - Whether this error prevents app from functioning
 * @returns {Object} Error info for user display
 */
export const handleNetworkError = (operation, error, isFatal = false) => {
	const level = isFatal ? LOG_LEVELS.FATAL : LOG_LEVELS.ERROR;
	const context = {
		operation,
		isFatal,
		recovery: isFatal ? "Refresh the page" : "Please try again",
	};

	if (level === LOG_LEVELS.FATAL) {
		logFatal(`Network error during ${operation}`, error, context);
	} else {
		logError(`Network error during ${operation}`, ERROR_CATEGORIES.NETWORK, error, context);
	}

	return {
		userMessage: isFatal
			? "Cannot connect to server. Please refresh the page."
			: "Connection failed. Please try again.",
		isDismissible: !isFatal,
	};
};

/**
 * Validation error handler
 *
 * Handles input validation failures
 *
 * @param {string} field - Field that failed validation
 * @param {string} reason - Why validation failed
 * @param {Object} value - The value that failed
 * @returns {Object} Error info for user display
 */
export const handleValidationError = (field, reason, value) => {
	logError(
		`Validation failed for field: ${field}`,
		ERROR_CATEGORIES.VALIDATION,
		null,
		{
			field,
			reason,
			value,
		}
	);

	return {
		userMessage: `Invalid input: ${reason}`,
		isDismissible: true,
	};
};

/**
 * Persistence error handler
 *
 * Handles data save/load failures with rollback suggestions
 *
 * @param {string} operation - Save or load
 * @param {Error} error - The error object
 * @param {boolean} isFatal - Whether this prevents app from functioning
 * @returns {Object} Error info for user display
 */
export const handlePersistenceError = (operation, error, isFatal = false) => {
	const level = isFatal ? LOG_LEVELS.FATAL : LOG_LEVELS.ERROR;
	const context = {
		operation,
		isFatal,
		advice: isFatal ? "Data may be lost" : "Changes not saved",
	};

	if (level === LOG_LEVELS.FATAL) {
		logFatal(`Failed to ${operation} data`, error, context);
	} else {
		logError(`Failed to ${operation} data`, ERROR_CATEGORIES.PERSISTENCE, error, context);
	}

	return {
		userMessage: isFatal
			? "Cannot save data. Please check your browser storage."
			: `Failed to ${operation} data. Please try again.`,
		isDismissible: !isFatal,
	};
};

/**
 * State management error handler
 *
 * Handles state update failures
 *
 * @param {string} action - The action that failed
 * @param {Error} error - The error object
 * @param {Object} rollbackData - Data to restore on rollback
 * @returns {Object} Error info including rollback info
 */
export const handleStateError = (action, error, rollbackData = null) => {
	logError(`State update failed: ${action}`, ERROR_CATEGORIES.STATE, error, {
		action,
		hasRollback: !!rollbackData,
	});

	return {
		userMessage: "An error occurred. Changes may have been rolled back.",
		isDismissible: true,
		rollbackData,
	};
};

/**
 * UI rendering error handler
 *
 * Handles errors during UI rendering
 *
 * @param {string} component - Component that failed to render
 * @param {Error} error - The error object
 * @returns {Object} Error info for user display
 */
export const handleUIError = (component, error) => {
	logError(
		`Failed to render component: ${component}`,
		ERROR_CATEGORIES.UI,
		error,
		{
			component,
		}
	);

	return {
		userMessage: "Display error. Please refresh the page.",
		isDismissible: false,
	};
};

/**
 * Wraps an async operation with error handling
 *
 * Useful for wrapping promises to ensure errors are logged consistently
 *
 * @param {Promise} promise - The promise to wrap
 * @param {string} operation - Description of the operation
 * @param {string} category - Error category
 * @returns {Promise} The original promise with error handling attached
 */
export const withErrorHandling = (promise, operation, category = "") => {
	return promise.catch((error) => {
		logError(`Error during operation: ${operation}`, category, error);
		throw error;
	});
};

/**
 * Export constants for use in other modules
 */
export { LOG_LEVELS, ERROR_CATEGORIES };
