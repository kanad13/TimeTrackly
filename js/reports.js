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
 * Renders the reports view with all visualizations and statistics
 *
 * Processes historical time entries and generates:
 * 1. Summary Statistics: At-a-glance metrics
 * 2. Project Time Distribution (Doughnut Chart)
 * 3. Daily Time Logged (Bar Chart)
 * 4. Weekly Work Patterns (Heatmap)
 *
 * Handles loading states, errors, and empty data scenarios.
 *
 * @returns {void}
 */
export const renderReportsView = () => {
	const container = document.getElementById("view-reports");
	if (!container) return;

	const loadingEl = document.getElementById("reports-loading");
	const errorEl = document.getElementById("reports-error");
	const contentEl = document.getElementById("reports-content");

	loadingEl?.classList.remove("hidden");
	errorEl?.classList.add("hidden");
	contentEl?.classList.add("hidden");

	try {
		// Ensure data is loaded
		if (state.historicalEntries.length === 0) {
			loadingEl.textContent =
				"No data recorded yet. Track a task to see reports!";
			return;
		}

		// Destroy existing chart instances to prevent memory leaks
		if (window.projectPieChart) {
			window.projectPieChart.destroy();
			window.projectPieChart = null;
		}
		if (window.dailyBarChart) {
			window.dailyBarChart.destroy();
			window.dailyBarChart = null;
		}

		// Check if Chart.js is available
		if (typeof Chart === "undefined") {
			loadingEl.classList.add("hidden");
			errorEl.classList.remove("hidden");
			errorEl.textContent =
				"Chart library failed to load. Please refresh the page or check your internet connection.";
			return;
		}

		// Default range is 7 days
		const defaultRange = 7;
		updateStatisticsDisplay(defaultRange);
		renderChartsForRange(defaultRange);
		renderHeatmap(84); // Last ~12 weeks

		loadingEl?.classList.add("hidden");
		contentEl?.classList.remove("hidden");

		setupReportEventListeners();
	} catch (err) {
		console.error("Error rendering reports:", err);
		loadingEl?.classList.add("hidden");
		errorEl?.classList.remove("hidden");
		errorEl.textContent =
			"Failed to render reports. Please try again or refresh the page.";
	}
};

/**
 * Calculate summary statistics for the selected date range
 * @param {number} daysBack - Number of days to look back (7, 30, 365, etc.)
 * @returns {object} Statistics object
 */
function calculateStatistics(daysBack = 7) {
	const now = new Date();
	const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

	// Filter entries within date range
	const entries = state.historicalEntries.filter((entry) => {
		const entryDate = new Date(entry.completedAt);
		return entryDate >= cutoffDate;
	});

	if (entries.length === 0) {
		return {
			totalHours: 0,
			dailyAverage: 0,
			busiestDay: "—",
			topProject: "—",
			todayHours: 0,
			trackingDays: 0,
		};
	}

	// Total hours
	const totalMinutes = entries.reduce(
		(sum, entry) => sum + entry.durationMinutes,
		0
	);
	const totalHours = (totalMinutes / 60).toFixed(1);

	// Daily average
	const uniqueDays = new Set(
		entries.map((e) => new Date(e.completedAt).toLocaleDateString())
	).size;
	const dailyAverage = (totalMinutes / uniqueDays / 60).toFixed(1);

	// Busiest day (most hours)
	const dayMap = {};
	entries.forEach((entry) => {
		const day = new Date(entry.completedAt).toLocaleDateString("en-US", {
			weekday: "long",
		});
		dayMap[day] = (dayMap[day] || 0) + entry.durationMinutes;
	});
	const busiestDay =
		Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

	// Top project
	const projectMap = {};
	entries.forEach((entry) => {
		const project = entry.project || entry.topic.split("/")[0].trim();
		projectMap[project] = (projectMap[project] || 0) + entry.durationMinutes;
	});
	const topProject =
		Object.entries(projectMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

	// Today's hours
	const today = new Date().toLocaleDateString();
	const todayMinutes = entries
		.filter((e) => new Date(e.completedAt).toLocaleDateString() === today)
		.reduce((sum, e) => sum + e.durationMinutes, 0);
	const todayHours = (todayMinutes / 60).toFixed(1);

	// Tracking days (days with at least 1 entry)
	const trackingDays = uniqueDays;

	return {
		totalHours,
		dailyAverage,
		busiestDay,
		topProject,
		todayHours,
		trackingDays,
	};
}

/**
 * Update statistics display with new data
 */
function updateStatisticsDisplay(daysBack = 7) {
	const stats = calculateStatistics(daysBack);

	document.getElementById(
		"stat-total-hours"
	).textContent = `${stats.totalHours} h`;
	document.getElementById(
		"stat-daily-avg"
	).textContent = `${stats.dailyAverage} h`;
	document.getElementById("stat-busiest-day").textContent = stats.busiestDay;
	document.getElementById("stat-top-project").textContent = stats.topProject;
	document.getElementById(
		"stat-today-hours"
	).textContent = `${stats.todayHours} h`;
	document.getElementById("stat-tracking-days").textContent =
		stats.trackingDays;
}

/**
 * Format data for Cal-Heatmap (daily hours logged)
 * @returns {object} Data in Cal-Heatmap format
 */
function generateHeatmapData(daysBack = 84) {
	// Cal-Heatmap expects data as: { "YYYY-MM-DD": value }
	const data = {};
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysBack);

	state.historicalEntries.forEach((entry) => {
		const entryDate = new Date(entry.completedAt);
		if (entryDate >= cutoffDate) {
			const dateStr = entryDate.toISOString().split("T")[0]; // YYYY-MM-DD
			const hours = entry.durationMinutes / 60;
			data[dateStr] = (data[dateStr] || 0) + hours;
		}
	});

	return data;
}

/**
 * Render Cal-Heatmap for weekly patterns
 */
function renderHeatmap(daysBack = 84) {
	const container = document.getElementById("cal-heatmap-container");
	if (!container || !window.CalHeatmap) return;

	// Clear previous chart
	container.innerHTML = "";

	const data = generateHeatmapData(daysBack);

	const calHeatmap = new window.CalHeatmap();
	calHeatmap.paint(
		{
			source: data,
			domain: { type: "month", label: "MMM" },
			range: 4,
			scale: {
				color: ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"],
			},
			subDomainTextFormat: "%Y-%m-%d\n%v h",
			itemSelector: "#cal-heatmap-container",
		},
		[
			{
				name: "fill",
				criteria: (x) => x > 0 && x <= 2,
				color: "#c6e48b",
			},
			{
				name: "fill",
				criteria: (x) => x > 2 && x <= 4,
				color: "#7bc96f",
			},
			{
				name: "fill",
				criteria: (x) => x > 4 && x <= 6,
				color: "#239a3b",
			},
			{
				name: "fill",
				criteria: (x) => x > 6,
				color: "#196127",
			},
		]
	);
}

/**
 * Render existing charts (doughnut and bar) for a specific range
 */
function renderChartsForRange(daysBack) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysBack);

	const filteredEntries = state.historicalEntries.filter(
		(entry) => new Date(entry.completedAt) >= cutoffDate
	);

	// Destroy existing charts
	if (window.projectPieChart) {
		window.projectPieChart.destroy();
		window.projectPieChart = null;
	}
	if (window.dailyBarChart) {
		window.dailyBarChart.destroy();
		window.dailyBarChart = null;
	}

	renderProjectPieChart(filteredEntries);
	renderDailyBarChart(filteredEntries);
}

/**
 * Render project pie chart with filtered entries
 */
function renderProjectPieChart(entries) {
	const projectDurations = entries.reduce((acc, entry) => {
		acc[entry.project] = (acc[entry.project] || 0) + entry.totalDurationMs;
		return acc;
	}, {});
	const projectLabels = Object.keys(projectDurations);
	const projectData = Object.values(projectDurations);
	const projectColors = getDistinctColors(projectLabels.length);

	const pieCtx = document
		.getElementById("project-pie-chart")
		.getContext("2d");
	window.projectPieChart = new Chart(pieCtx, {
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
	});
}

/**
 * Render daily bar chart with filtered entries
 */
function renderDailyBarChart(entries) {
	const dailyDurations = {};
	for (let i = 6; i >= 0; i--) {
		const day = new Date(Date.now() - i * CONSTANTS.MS_PER_DAY);
		dailyDurations[day.toISOString().split("T")[0]] = 0;
	}
	entries.forEach((entry) => {
		const dateKey = new Date(entry.endTime).toISOString().split("T")[0];
		if (dailyDurations.hasOwnProperty(dateKey)) {
			dailyDurations[dateKey] += entry.totalDurationMs;
		}
	});

	const barCtx = document.getElementById("daily-bar-chart").getContext("2d");
	window.dailyBarChart = new Chart(barCtx, {
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
	});
}

/**
 * Setup event listeners for date range buttons and collapsible sections
 */
function setupReportEventListeners() {
	// Date range buttons
	document.querySelectorAll(".date-range-btn").forEach((btn) => {
		btn.removeEventListener("click", handleDateRangeClick);
		btn.addEventListener("click", handleDateRangeClick);
	});

	// Collapsible sections
	document.querySelectorAll(".chart-section-header").forEach((header) => {
		header.removeEventListener("click", handleSectionToggle);
		header.addEventListener("click", handleSectionToggle);
	});
}

/**
 * Handle date range button clicks
 */
function handleDateRangeClick(e) {
	document
		.querySelectorAll(".date-range-btn")
		.forEach((b) => {
			b.classList.remove("active", "border-b-2", "border-blue-600", "text-blue-600");
			b.classList.add("text-gray-600", "hover:text-gray-900");
		});

	e.target.classList.add("active", "border-b-2", "border-blue-600", "text-blue-600");
	e.target.classList.remove("text-gray-600", "hover:text-gray-900");

	const daysBack = parseInt(e.target.dataset.range);
	updateStatisticsDisplay(daysBack);
	renderChartsForRange(daysBack);
}

/**
 * Handle section collapse/expand
 */
function handleSectionToggle(e) {
	const header = e.currentTarget;
	const icon = header.querySelector(".chart-section-icon");
	header.classList.toggle("collapsed");
	icon?.classList.toggle("rotate-90");
}
