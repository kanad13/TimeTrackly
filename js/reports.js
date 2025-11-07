/**
 * Chart rendering and reports generation
 *
 * ROLE IN ARCHITECTURE:
 * Handles all data visualization using Chart.js. Transforms raw time entries
 * into meaningful charts for productivity insights.
 *
 * CHARTS PROVIDED:
 * 1. Project Time Distribution (Doughnut): Shows % of time per project
 * 2. Daily Time Logged (Bar): Shows hours logged each day for last 7 days
 *
 * DATA PROCESSING APPROACH:
 * - All calculations happen client-side (no server processing needed)
 * - Historical entries are aggregated into chart-ready format
 * - Projects are color-coded consistently using deterministic algorithm
 *
 * CHART LIFECYCLE:
 * 1. User switches to Reports tab
 * 2. renderReportsView() called
 * 3. Destroy any existing chart instances (CRITICAL - prevents memory leaks)
 * 4. Process historical data into chart format
 * 5. Create new Chart.js instances
 * 6. Store references for next cleanup
 *
 * WHY CHART DESTRUCTION MATTERS:
 * Chart.js creates canvas contexts and event listeners. Without destroying
 * old charts before creating new ones, memory usage grows with each tab switch.
 * This would eventually slow down or crash the browser.
 *
 * COLOR CONSISTENCY:
 * Projects are sorted alphabetically, then assigned colors in order.
 * Same project always gets same color across sessions (deterministic).
 * This helps users quickly identify projects by color.
 *
 * SINGLE-USER CONTEXT:
 * - No real-time updates needed (user manually switches to Reports tab)
 * - No server-side aggregation (client has all data already)
 * - No pagination needed (personal use = manageable data volumes)
 *
 * IMPACT OF CHANGES:
 * - Skipping chart destruction causes memory leaks
 * - Changing aggregation logic affects what users see in reports
 * - Modifying colors affects user's learned associations
 * - Changing REPORT_DAYS_DEFAULT in constants affects bar chart
 *
 * @module reports
 */

import { state } from "./state.js";
import { formatDuration, getDistinctColors } from "./utils.js";
import { CONSTANTS } from "./constants.js";

/**
 * Switches between tracker and reports tabs
 *
 * Hides all content views, removes active state from all tabs, displays the
 * selected tab's content, and marks the tab button as active. If switching
 * to reports tab, automatically triggers report rendering.
 *
 * @param {string} targetTab - Tab name ('tracker' or 'reports')
 * @returns {void}
 */
export const switchTab = (targetTab) => {
	document
		.querySelectorAll(".content-view")
		.forEach((view) => view.classList.add("hidden"));
	document
		.querySelectorAll(".tab-button")
		.forEach((btn) => btn.classList.remove("active"));
	document.getElementById(`view-${targetTab}`).classList.remove("hidden");
	document.getElementById(`tab-${targetTab}`).classList.add("active");
	if (targetTab === "reports") renderReportsView();
};

/**
 * Renders the reports view with Chart.js visualizations
 *
 * Processes historical time entries and generates two charts:
 * 1. Project Time Distribution (Doughnut Chart): Shows percentage of time per project
 * 2. Daily Time Logged (Bar Chart): Shows hours logged each day for last 7 days
 *
 * Destroys existing chart instances before creating new ones to prevent memory leaks.
 * Handles loading states, errors, and empty data scenarios.
 *
 * @returns {void}
 */
export const renderReportsView = () => {
	const reportsLoading = document.getElementById("reports-loading");
	const reportsContent = document.getElementById("reports-content");
	const reportsError = document.getElementById("reports-error");

	reportsLoading.classList.remove("hidden");
	reportsContent.classList.add("hidden");
	reportsError.classList.add("hidden");

	// CRITICAL: Destroy existing chart instances before creating new ones
	// Without this, memory leaks occur as Chart.js canvases and event listeners accumulate
	// Each chart instance holds references to canvas contexts which aren't garbage collected
	// Impact: Skipping this causes browser slowdown after many tab switches
	state.activeChartInstances.forEach((chart) => chart.destroy());
	state.activeChartInstances = [];

	if (state.historicalEntries.length === 0) {
		reportsLoading.textContent =
			"No data recorded yet. Track a task to see reports!";
		return;
	}

	try {
		// Check if Chart.js is available
		if (typeof Chart === "undefined") {
			reportsLoading.classList.add("hidden");
			reportsError.classList.remove("hidden");
			reportsError.textContent =
				"Chart library failed to load. Please refresh the page or check your internet connection.";
			return;
		}

		// Calculate project durations
		const projectDurations = state.historicalEntries.reduce((acc, entry) => {
			acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
			return acc;
		}, {});
		const projectLabels = Object.keys(projectDurations);
		const projectData = Object.values(projectDurations);
		const projectColors = getDistinctColors(projectLabels.length);

		// Calculate daily durations for last 7 days
		const dailyDurations = {};
		for (let i = CONSTANTS.REPORT_DAYS_DEFAULT - 1; i >= 0; i--) {
			const day = new Date(Date.now() - i * CONSTANTS.MS_PER_DAY);
			dailyDurations[day.toISOString().split("T")[0]] = 0;
		}
		state.historicalEntries.forEach((entry) => {
			const dateKey = new Date(entry.endTime).toISOString().split("T")[0];
			if (dailyDurations.hasOwnProperty(dateKey)) {
				dailyDurations[dateKey] += entry.totalDurationMs;
			}
		});

		reportsLoading.classList.add("hidden");
		reportsContent.classList.remove("hidden");

		// Create project pie chart
		const pieCtx = document
			.getElementById("project-pie-chart")
			.getContext("2d");
		state.activeChartInstances.push(
			new Chart(pieCtx, {
				type: "doughnut",
				data: {
					labels: projectLabels,
					datasets: [
						{
							data: projectData,
							backgroundColor: projectColors,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { position: "right" },
						tooltip: {
							callbacks: {
								label: (c) =>
									`${c.label}: ${formatDuration(
										Math.round(c.parsed / CONSTANTS.MS_PER_SECOND)
									)}`,
							},
						},
					},
				},
			})
		);

		// Create daily bar chart
		const barCtx = document.getElementById("daily-bar-chart").getContext("2d");
		state.activeChartInstances.push(
			new Chart(barCtx, {
				type: "bar",
				data: {
					labels: Object.keys(dailyDurations).map((d) =>
						new Date(d).toLocaleDateString("en-US", { weekday: "short" })
					),
					datasets: [
						{
							label: "Hours Logged",
							data: Object.values(dailyDurations).map(
								(ms) => ms / CONSTANTS.MS_PER_HOUR
							),
							backgroundColor: "#4f46e5",
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							title: { display: true, text: "Hours" },
						},
					},
					plugins: {
						legend: { display: false },
					},
				},
			})
		);
	} catch (error) {
		console.error("Error rendering reports:", error);
		reportsLoading.classList.add("hidden");
		reportsError.classList.remove("hidden");
		reportsError.textContent =
			"Failed to render reports. Please try again or refresh the page.";
	}
};
