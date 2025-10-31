/**
 * Application constants
 *
 * WHY CONSTANTS MATTER:
 * - Centralization: Change value once, affects entire app
 * - Readability: "CONSTANTS.MS_PER_HOUR" is clearer than "3600000"
 * - Type safety: JSDoc provides IntelliSense for these values
 * - Maintainability: Easy to find and update configuration
 *
 * VALUE CHOICES AND IMPACT:
 *
 * TIMER_UPDATE_INTERVAL (1000ms = 1 second):
 * - How often timer displays refresh
 * - Lower = smoother UI but more CPU usage
 * - Higher = less smooth but better performance
 * - 1 second is standard for time trackers (balances both)
 *
 * MAX_INPUT_LENGTH (100 characters):
 * - Prevents excessively long project/task names
 * - Long names break UI layout and make reports messy
 * - 100 chars is generous (most tasks are <30 chars)
 *
 * NOTIFICATION_DURATION (4000ms = 4 seconds):
 * - How long success/info notifications stay visible
 * - Shorter = less intrusive but might miss important info
 * - Longer = more visible but potentially annoying
 * - 4 seconds follows common UX patterns
 *
 * REPORT_DAYS_DEFAULT (7 days):
 * - Daily time chart shows last 7 days
 * - Weekly view is most useful for personal productivity tracking
 * - Can be extended, but more days = smaller bars in chart
 *
 * IMPACT OF CHANGES:
 * - Changing time constants affects all duration calculations
 * - Changing MAX_INPUT_LENGTH requires updating sanitizeInput() logic
 * - Changing TIMER_UPDATE_INTERVAL affects perceived responsiveness
 * - Changing REPORT_DAYS_DEFAULT changes chart appearance
 *
 * @module constants
 */

export const CONSTANTS = {
	MS_PER_SECOND: 1000,
	MS_PER_MINUTE: 60000,
	MS_PER_HOUR: 3600000,
	MS_PER_DAY: 86400000,
	MAX_INPUT_LENGTH: 100,
	REPORT_DAYS_DEFAULT: 7,
	TIMER_UPDATE_INTERVAL: 1000, // Update every second
	NOTIFICATION_DURATION: 4000, // 4 seconds
};

/**
 * Pre-defined color palette for charts
 *
 * WHY THESE COLORS:
 * - High contrast for readability
 * - Accessible for most color vision types
 * - Professional appearance
 * - Matches Tailwind CSS design system (indigo, orange, green, etc.)
 *
 * COLOR ASSIGNMENT:
 * Colors are assigned to projects in alphabetical order.
 * Same project always gets same color (deterministic).
 * If more than 10 projects, colors repeat (modulo).
 *
 * IMPACT: Changing colors affects all charts. Choose carefully for accessibility.
 */
export const CHART_COLORS = [
	"#4f46e5",
	"#f97316",
	"#10b981",
	"#ef4444",
	"#3b82f6",
	"#f59e0b",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#84cc16",
];
