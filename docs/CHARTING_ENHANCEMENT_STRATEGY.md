# Charting Enhancement Strategy

## Executive Summary

Enhance the Reports tab with multiple complementary visualizations to provide a comprehensive overview of time tracking data without becoming a full analytics tool. This hybrid approach combines the strengths of Chart.js (which you already use) with Cal-Heatmap (a lightweight library) to show:

1. **Project Distribution** (existing doughnut chart) - "What am I spending time on?"
2. **Daily Trends** (existing bar chart) - "When am I logging time?"
3. **Weekly Patterns** (NEW - heatmap) - "What's my work pattern?"
4. **Summary Statistics** (NEW - card display) - "How much am I tracking?"

All views remain optional and can be toggled or collapsed, keeping the UI clean and focused on overview rather than deep analytics.

---

## Why? (The Rationale)

### Problems with Status Quo

- Current charts are static and non-interactive
- No summary metrics at a glance (total hours, averages, etc.)
- Missing work pattern visibility (which days/hours are busiest)
- Limited insight into tracking consistency
- Verbose reports tab that could be more scannable

### Why This Approach?

1. **Multiple Perspectives:** Different visualizations answer different questions

   - Doughnut: "Am I balanced across projects?"
   - Bar: "Am I tracking consistently?"
   - Heatmap: "What's my actual work pattern?"
   - Stats: "Quantified summary"

2. **Lightweight Stack:** Cal-Heatmap is ~3KB minified

   - No heavy dependencies
   - Pairs well with existing Chart.js
   - Vanilla JS compatible

3. **Information Density:** Shows more without overwhelming

   - Summary stats card provides immediate context
   - Optional/collapsible sections prevent clutter
   - GitHub-style heatmap is intuitive (users recognize the pattern)

4. **Actionable Insights:** Data users actually care about
   - "I logged 42.5 hours this week"
   - "My busiest day is Thursday"
   - "I'm most productive 9am-5pm"
   - "Project X takes 35% of my time"

---

## What Will Be Built

### 1. Summary Statistics Card (Top of Reports)

**Purpose:** At-a-glance metrics without scrolling

**Display:**

```
┌────────────────────────────────────────────────────────────┐
│ Time Tracking Summary                                      │
├────────────────────────────────────────────────────────────┤
│ Total This Week: 42.5 hrs  │  Average Daily: 8.5 hrs      │
│ Busiest Day: Thursday      │  Most Tracked Project: Work   │
│ Tracking Streak: 5 days    │  Today's Time: 7.2 hrs        │
└────────────────────────────────────────────────────────────┘
```

**Metrics Included:**

- Total hours logged (this week, last 7 days)
- Average daily hours
- Busiest day of week
- Project with most time
- Current tracking streak
- Hours logged today

**Implementation:** New section in `reports.js` + CSS grid layout

---

### 2. Enhanced Existing Charts

**Keep existing doughnut and bar charts but add:**

- **Interactive tooltips** (already in Chart.js)
- **Better legends and labels**
- **Responsive layout** for different screen sizes
- **Click-to-filter** (optional - for future)

---

### 3. NEW - Weekly Pattern Heatmap

**Purpose:** Visualize work patterns at a glance (GitHub-style calendar)

**Display:**

```
Mon  ▭▪▪▪▪▪▪▪▪▪▪▪▪
Tue  ▭▭▭▭▪▪▪▪▪▪▪▭
Wed  ▭▭▭▪▪▪▪▪▪▪▪▪
Thu  ▭▪▪▪▪▪▪▪▪▪▪▪  ← Busiest
Fri  ▭▭▭▪▪▪▪▭▭▭▭▭
Sat  ░░░░░░░░░░░░
Sun  ░░░░░░░░░░░░
     [Color scale: light (0h) → dark (8h)]
```

**Shows:**

- Last 12 weeks of daily tracking
- Color intensity = hours logged
- Hover = exact hours for that day
- Identifies work patterns/gaps

**Library:** Cal-Heatmap (CDN-loaded, ~3KB)
**Implementation:** New canvas container in `reports.js`

---

### 4. Date Range Selector

**Purpose:** Switch between views without page reload

**UI:**

```
📊 Time Period: [Last 7 Days ▼] [Last 30 Days] [All Time]
```

**Behavior:**

- Buttons above charts
- Selected button highlighted
- Charts re-render with new data range
- User preference stored in localStorage (optional)

**Implementation:** New function in `ui.js` + state management in `state.js`

---

### 5. Optional: Toggle-able Views

**Purpose:** Reduce initial information load

**UI:**

```
Reports Tab Content:
├─ Summary Statistics [Always visible, compact]
├─ ▼ Project Distribution [Click to expand/collapse]
├─ ▼ Daily Trends [Click to expand/collapse]
├─ ▼ Weekly Patterns [Click to expand/collapse]
```

**Behavior:**

- Each section collapsible (like Start New Timer section)
- Smooth expand/collapse animations
- All expanded by default on first visit

---

## How to Implement

### Phase 1: Setup & Infrastructure (30-45 mins)

#### 1.1 Add Cal-Heatmap CDN to index.html

**File:** `index.html` (lines 65-68)

```html
<!-- After Chart.js line, add: -->
<script src="https://cdn.jsdelivr.net/npm/cal-heatmap@4.2.4/dist/cal-heatmap.umd.min.js"></script>
<link
	rel="stylesheet"
	href="https://cdn.jsdelivr.net/npm/cal-heatmap@4.2.4/dist/cal-heatmap.css" />
```

**Why:** Makes Cal-Heatmap available globally in window scope

---

#### 1.2 Create New HTML Structure in Reports Section

**File:** `index.html` (lines 526-541)

Replace entire Reports view with:

```html
<div
	id="view-reports"
	class="content-view hidden">
	<div
		id="reports-loading"
		class="text-center text-gray-500 py-12">
		Loading historical data...
	</div>
	<div
		id="reports-error"
		class="text-center text-red-500 py-12 hidden">
		Error loading reports. Check console.
	</div>

	<div
		id="reports-content"
		class="space-y-8 hidden">
		<!-- Date Range Selector -->
		<div class="flex gap-2 justify-center border-b pb-4">
			<button
				class="date-range-btn active px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
				data-range="7">
				Last 7 Days
			</button>
			<button
				class="date-range-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
				data-range="30">
				Last 30 Days
			</button>
			<button
				class="date-range-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
				data-range="365">
				All Time
			</button>
		</div>

		<!-- Summary Statistics -->
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
			<div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
				<p class="text-xs font-medium text-blue-600 uppercase">This Period</p>
				<p
					class="text-2xl font-bold text-blue-900 mt-2"
					id="stat-total-hours">
					0 h
				</p>
			</div>
			<div class="p-4 bg-green-50 rounded-lg border border-green-200">
				<p class="text-xs font-medium text-green-600 uppercase">Daily Avg</p>
				<p
					class="text-2xl font-bold text-green-900 mt-2"
					id="stat-daily-avg">
					0 h
				</p>
			</div>
			<div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
				<p class="text-xs font-medium text-purple-600 uppercase">Busiest Day</p>
				<p
					class="text-2xl font-bold text-purple-900 mt-2"
					id="stat-busiest-day">
					—
				</p>
			</div>
			<div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
				<p class="text-xs font-medium text-orange-600 uppercase">Top Project</p>
				<p
					class="text-lg font-bold text-orange-900 mt-2 truncate"
					id="stat-top-project">
					—
				</p>
			</div>
			<div class="p-4 bg-pink-50 rounded-lg border border-pink-200">
				<p class="text-xs font-medium text-pink-600 uppercase">Today</p>
				<p
					class="text-2xl font-bold text-pink-900 mt-2"
					id="stat-today-hours">
					0 h
				</p>
			</div>
			<div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
				<p class="text-xs font-medium text-gray-600 uppercase">Tracking Days</p>
				<p
					class="text-2xl font-bold text-gray-900 mt-2"
					id="stat-tracking-days">
					0
				</p>
			</div>
		</div>

		<!-- Project Distribution Collapsible Section -->
		<div class="border rounded-lg overflow-hidden">
			<div
				class="p-4 bg-gray-100 cursor-pointer hover:bg-gray-200 flex items-center justify-between chart-section-header"
				data-section="project-dist">
				<h3 class="text-lg font-semibold text-gray-800">
					Project Time Distribution
				</h3>
				<span
					class="material-icons transition-transform duration-200 chart-section-icon"
					>expand_more</span
				>
			</div>
			<div
				class="chart-section-content bg-white p-6 overflow-hidden transition-all duration-300"
				style="max-height: 500px;">
				<div class="flex justify-center h-80">
					<canvas id="project-pie-chart"></canvas>
				</div>
			</div>
		</div>

		<!-- Daily Trends Collapsible Section -->
		<div class="border rounded-lg overflow-hidden">
			<div
				class="p-4 bg-gray-100 cursor-pointer hover:bg-gray-200 flex items-center justify-between chart-section-header"
				data-section="daily-trends">
				<h3 class="text-lg font-semibold text-gray-800">Daily Time Logged</h3>
				<span
					class="material-icons transition-transform duration-200 chart-section-icon"
					>expand_more</span
				>
			</div>
			<div
				class="chart-section-content bg-white p-6 overflow-hidden transition-all duration-300"
				style="max-height: 500px;">
				<div class="h-80">
					<canvas id="daily-bar-chart"></canvas>
				</div>
			</div>
		</div>

		<!-- Weekly Patterns Heatmap Collapsible Section -->
		<div class="border rounded-lg overflow-hidden">
			<div
				class="p-4 bg-gray-100 cursor-pointer hover:bg-gray-200 flex items-center justify-between chart-section-header"
				data-section="heatmap">
				<h3 class="text-lg font-semibold text-gray-800">
					Weekly Work Patterns
				</h3>
				<span
					class="material-icons transition-transform duration-200 chart-section-icon"
					>expand_more</span
				>
			</div>
			<div
				class="chart-section-content bg-white p-6 overflow-hidden transition-all duration-300"
				style="max-height: 800px;">
				<div
					id="cal-heatmap-container"
					style="overflow-x: auto;"></div>
			</div>
		</div>
	</div>
</div>
```

**Why:** Creates containers for new elements and gives them data attributes for state management

---

#### 1.3 Add CSS for Collapsible Sections

**File:** `index.html` (style tag, after modal styles)

```css
/* Chart Section Collapsible Styles */
.chart-section-header {
	transition: background-color 0.2s ease;
}

.chart-section-icon {
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chart-section-header.collapsed ~ .chart-section-content {
	max-height: 0 !important;
	padding: 0 !important;
	overflow: hidden;
}

.chart-section-header.collapsed .chart-section-icon {
	transform: rotate(-90deg);
}

/* Statistics Card Grid */
.stat-card {
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Cal-Heatmap Customization */
#cal-heatmap-container {
	padding: 0;
}

#cal-heatmap-container svg {
	margin: 0 auto;
	display: block;
}
```

---

### Phase 2: Backend Data Calculations (45-60 mins)

#### 2.1 Add Statistics Calculation Function

**File:** `js/reports.js` (new function at end of file)

```javascript
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

	// Busiest day (most entries, not most hours)
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
		const project = entry.topic.split("/")[0].trim();
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
```

**Why:** Centralizes statistics logic, makes it reusable for different time ranges

---

#### 2.2 Add Heatmap Data Generation

**File:** `js/reports.js` (new function)

```javascript
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
```

**Why:** Prepares data in Cal-Heatmap's expected format and handles rendering

---

### Phase 3: UI Integration & Event Handlers (45-60 mins)

#### 3.1 Update Main Render Function

**File:** `js/reports.js` (modify existing `renderReportsView` function)

```javascript
/**
 * Render the complete reports view with all sections
 */
export async function renderReportsView() {
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
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Destroy existing charts to prevent memory leaks
		if (window.projectPieChart) {
			window.projectPieChart.destroy();
			window.projectPieChart = null;
		}
		if (window.dailyBarChart) {
			window.dailyBarChart.destroy();
			window.dailyBarChart = null;
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
	}
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

	renderProjectPieChart(filteredEntries);
	renderDailyBarChart(filteredEntries);
}

/**
 * Setup event listeners for date range buttons and collapsible sections
 */
function setupReportEventListeners() {
	// Date range buttons
	document.querySelectorAll(".date-range-btn").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			document
				.querySelectorAll(".date-range-btn")
				.forEach((b) =>
					b.classList.remove(
						"active",
						"border-b-2",
						"border-blue-600",
						"text-blue-600"
					)
				);

			e.target.classList.add(
				"active",
				"border-b-2",
				"border-blue-600",
				"text-blue-600"
			);
			e.target.classList.remove("text-gray-600", "hover:text-gray-900");

			const daysBack = parseInt(e.target.dataset.range);
			updateStatisticsDisplay(daysBack);
			renderChartsForRange(daysBack);
		});
	});

	// Collapsible sections
	document.querySelectorAll(".chart-section-header").forEach((header) => {
		header.addEventListener("click", () => {
			header.classList.toggle("collapsed");
			const icon = header.querySelector(".chart-section-icon");
			icon?.classList.toggle("rotate-90");
		});
	});
}
```

**Why:** Orchestrates all new features together and wires up event handlers

---

#### 3.2 Export New Functions

**File:** `js/reports.js` (top of file, in export statements)

Add to existing exports:

```javascript
export function updateStatisticsDisplay(daysBack) { ... }
export function renderHeatmap(daysBack) { ... }
```

---

### Phase 4: Testing & Refinement (30-45 mins)

#### 4.1 Manual Testing Checklist

- [ ] Statistics card displays correctly on page load
- [ ] Statistics update when date range button is clicked
- [ ] All 6 statistics show reasonable values
- [ ] Doughnut chart renders correctly
- [ ] Bar chart renders correctly
- [ ] Heatmap renders without JS errors
- [ ] Heatmap shows color gradient correctly
- [ ] Collapsible sections expand/collapse smoothly
- [ ] Chevron icons rotate on collapse
- [ ] Page doesn't break on narrow screens
- [ ] No console errors on initial load
- [ ] No console errors on date range change

#### 4.2 Test Data Scenarios

**Scenario A: Fresh user (no entries)**

- Statistics should show all zeros or "—"
- Charts should show "No data" message
- Heatmap should be empty

**Scenario B: Single entry**

- Statistics should calculate correctly
- All charts should render one data point
- No crashes or NaN values

**Scenario C: Week of data**

- Statistics should average correctly
- Bar chart shows 7 days
- Heatmap shows week pattern

---

## Integration Points

### Files to Modify

1. **index.html**

   - Add Cal-Heatmap CDN (lines ~68)
   - Replace entire Reports view section (lines ~526-541)
   - Add new CSS styles (lines ~420+)

2. **js/reports.js**
   - Add `calculateStatistics(daysBack)` function
   - Add `updateStatisticsDisplay(daysBack)` function
   - Add `generateHeatmapData(daysBack)` function
   - Add `renderHeatmap(daysBack)` function
   - Add `renderChartsForRange(daysBack)` function
   - Add `setupReportEventListeners()` function
   - Modify `renderReportsView()` to coordinate everything
   - Update exports

### No Changes Required

- `js/app.js` - Works as-is
- `js/state.js` - No new state needed
- `js/api.js` - No new API calls
- `js/ui.js` - No changes needed

---

## Implementation Walkthrough

### Step-by-Step Execution Order

1. **Add CDN** → Verify Cal-Heatmap loads (check console)
2. **Update HTML** → Verify structure renders without errors
3. **Add CSS** → Verify collapsibles work visually
4. **Add statistics functions** → Test with console logging
5. **Add heatmap functions** → Test rendering
6. **Add event handlers** → Test interactions
7. **Full integration test** → Navigate to Reports, test all features
8. **Polish** → Adjust colors, spacing, responsive design

---

## Code Organization Notes

### Where Logic Lives

- **Data Calculations:** `js/reports.js` (statistics, heatmap data generation)
- **DOM Rendering:** `js/reports.js` (chart rendering functions)
- **Event Handling:** `js/reports.js` (setupReportEventListeners)
- **HTML Structure:** `index.html` (new containers and markup)
- **Styling:** `index.html` `<style>` tag (CSS for collapsibles and stats)

### State Management

- **Current Date Range:** Stored in button classes (no state needed, UI is source of truth)
- **Chart Instances:** Stored in window scope (`window.projectPieChart`, `window.dailyBarChart`)
- **Historical Data:** Read from `state.historicalEntries` (existing)

---

## Performance Considerations

### Memory Management

- **Charts:** Destroy before re-rendering (prevents memory leaks)
- **Heatmap:** Clears container before rendering
- **Data:** Only filter once per render, don't recalculate stats unnecessarily

### Rendering Optimization

- **Charts:** Only re-render when date range changes
- **Heatmap:** Renders once on Reports tab open
- **Statistics:** Recalculate when date range changes
- **Collapsibles:** CSS-only, no JS animation overhead

### Estimated Performance

- Initial Reports load: ~500ms (includes chart rendering)
- Date range switch: ~300ms (chart re-render)
- Collapsible toggle: <50ms (CSS transition)

---

## Common Gotchas & Solutions

### Issue: Cal-Heatmap Not Loading

**Solution:** Verify CDN URL is correct and not blocked. Check browser console for 404.

### Issue: Statistics Showing NaN

**Solution:** Ensure state.historicalEntries has durationMinutes property. Check data format.

### Issue: Heatmap Container Empty

**Solution:** Verify window.CalHeatmap is defined. Wait for CDN to load before rendering.

### Issue: Charts Not Updating on Date Range Change

**Solution:** Ensure `renderChartsForRange()` calls both chart functions. Check that canvas elements exist.

### Issue: Collapsible Sections Not Responsive

**Solution:** Use max-height instead of height for transitions. Account for padding in calculation.

---

## Testing Utilities

### Debug Commands (Browser Console)

```javascript
// Check if Cal-Heatmap loaded
console.log(window.CalHeatmap);

// Force re-render reports
import("./js/reports.js").then((m) => m.renderReportsView());

// Check state data
console.log(state.historicalEntries.length);

// Manually calculate stats
import("./js/reports.js").then((m) => console.log(m.calculateStatistics(7)));
```

---

## Success Criteria

Implementation is complete when:

✅ All 6 statistics display and update correctly
✅ Doughnut chart renders without errors
✅ Bar chart renders without errors
✅ Heatmap renders with color gradient
✅ Date range buttons switch views smoothly
✅ Collapsible sections expand/collapse visually
✅ No console errors
✅ Mobile responsive (tested on narrow screens)
✅ Performance acceptable (< 1s initial load)
✅ No memory leaks (charts destroy properly)

---

## Rollback Plan

If something breaks:

1. **HTML:** Revert `index.html` to previous commit
2. **JS:** Revert `js/reports.js` to previous commit
3. **Test:** Navigate to Reports, verify old view works
4. **Branch:** Push fixes to separate branch if needed
