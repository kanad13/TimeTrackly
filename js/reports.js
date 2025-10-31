/**
 * Chart rendering and reports generation
 * @module reports
 */

import { state } from "./state.js";
import { formatDuration, getDistinctColors } from "./utils.js";
import { CONSTANTS } from "./constants.js";

/**
 * Switches between tracker and reports tabs
 * @param {string} targetTab - Tab name ('tracker' or 'reports')
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
 * Renders the reports view with charts
 */
export const renderReportsView = () => {
	const reportsLoading = document.getElementById("reports-loading");
	const reportsContent = document.getElementById("reports-content");
	const reportsError = document.getElementById("reports-error");

	reportsLoading.classList.remove("hidden");
	reportsContent.classList.add("hidden");
	reportsError.classList.add("hidden");

	// Destroy existing chart instances
	state.activeChartInstances.forEach((chart) => chart.destroy());
	state.activeChartInstances = [];

	if (state.historicalEntries.length === 0) {
		reportsLoading.textContent =
			"No data recorded yet. Track a task to see reports!";
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
	const pieCtx = document.getElementById("project-pie-chart").getContext("2d");
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
};
