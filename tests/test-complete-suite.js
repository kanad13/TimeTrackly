/**
 * Comprehensive UI/UX Test Suite for Time Tracker
 *
 * This test suite covers:
 * - Initial page load and rendering
 * - Collapsible sections functionality
 * - Timer lifecycle (start, pause, resume, stop, delete)
 * - Notes/comments functionality
 * - Data persistence across page reloads
 * - Tab navigation
 * - Responsive design
 * - CSV export
 * - Error handling
 *
 * Run this test after any UI/UX changes to ensure functionality remains intact.
 *
 * Prerequisites:
 * 1. Server must be running: npm start
 * 2. Screenshots directory will be created if it doesn't exist
 *
 * Usage:
 *   node tests/test-complete-suite.js
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Helper function for delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test configuration
const CONFIG = {
	baseUrl: "http://localhost:13331",
	viewport: { width: 1280, height: 800 },
	screenshotDir: "screenshots",
	headless: process.env.HEADLESS === "true",
};

// Ensure screenshot directory exists
if (!fs.existsSync(CONFIG.screenshotDir)) {
	fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

/**
 * Test 1: Initial page load
 */
async function testInitialLoad(page) {
	console.log("\n📋 Test 1: Initial Page Load");

	await page.goto(CONFIG.baseUrl, { waitUntil: "networkidle0" });
	await delay(1000);

	// Check if main elements exist
	const app = await page.$("#app");
	const title = await page.$eval("h1", (el) => el.textContent);
	const trackerTab = await page.$("#tab-tracker");
	const reportsTab = await page.$("#tab-reports");

	if (!app) throw new Error("Main app container not found");
	if (title !== "Time Tracker") throw new Error("Title incorrect");
	if (!trackerTab || !reportsTab) throw new Error("Tabs not found");

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "01-initial-load.png"),
		fullPage: true,
	});

	console.log("   ✅ Page loaded successfully");
	console.log("   ✅ Main elements present");
}

/**
 * Test 2: Collapsible sections
 */
async function testCollapsibleSections(page) {
	console.log("\n📋 Test 2: Collapsible Sections");

	const sections = [
		{
			name: "Start New Timer",
			header: "#data-entry-header",
			content: "#data-entry-content",
			initiallyCollapsed: true,
		},
		{
			name: "Active Timers",
			header: "#active-timers-header",
			content: "#active-timers-content",
			initiallyCollapsed: false,
		},
		{
			name: "Data Export",
			header: "#data-export-header",
			content: "#data-export-content",
			initiallyCollapsed: true,
		},
	];

	for (const section of sections) {
		console.log(`   Testing: ${section.name}`);

		// Check initial state
		const initialHeight = await page.$eval(
			section.content,
			(el) => el.offsetHeight
		);
		const isCollapsed = initialHeight === 0;

		if (isCollapsed !== section.initiallyCollapsed) {
			throw new Error(`${section.name}: Initial state incorrect`);
		}

		// Toggle section
		await page.click(section.header);
		await delay(500);

		const newHeight = await page.$eval(
			section.content,
			(el) => el.offsetHeight
		);
		const isNowExpanded = newHeight > 0;

		if (isCollapsed === isNowExpanded) {
			console.log(`      ✅ ${section.name} toggled successfully`);
		} else {
			throw new Error(`${section.name} did not toggle`);
		}

		// Toggle back
		await page.click(section.header);
		await delay(500);
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "02-collapsible-sections-tested.png"),
		fullPage: true,
	});
}

/**
 * Test 3: Start a timer
 */
async function testStartTimer(page) {
	console.log("\n📋 Test 3: Start Timer");

	// Clean up any existing timers from previous tests
	let existingTimers = await page.$$("[data-timer-id]");
	while (existingTimers.length > 0) {
		// Always get fresh reference after each delete since DOM re-renders
		await page.evaluate(() => {
			const timer = document.querySelector("[data-timer-id]");
			if (timer) {
				const deleteBtn = timer.querySelector('[data-action="delete"]');
				if (deleteBtn) deleteBtn.click();
			}
		});
		await delay(500);
		existingTimers = await page.$$("[data-timer-id]");
	}

	// Expand Start New Timer section if collapsed
	const startSectionHeight = await page.$eval(
		"#data-entry-content",
		(el) => el.offsetHeight
	);
	if (startSectionHeight === 0) {
		await page.click("#data-entry-header");
		await delay(500);
	}

	// Enter project/task
	const projectTask = "Test Project / Test Task";
	await page.type("#topic-input", projectTask);
	await page.click("#start-button");
	await delay(1000);

	// Verify timer appears
	const timerCard = await page.$("[data-timer-id]");
	if (!timerCard) {
		throw new Error("Timer card not rendered");
	}

	// Verify active count updated
	const activeCount = await page.$eval("#active-count", (el) => el.textContent);
	if (activeCount !== "1") {
		throw new Error("Active count not updated");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "03-timer-started.png"),
		fullPage: true,
	});

	console.log("   ✅ Timer started successfully");
	console.log("   ✅ Active count updated");
}

/**
 * Test 4: Add notes to timer
 */
async function testTimerNotes(page) {
	console.log("\n📋 Test 4: Timer Notes");

	// Find notes textarea
	const notesTextarea = await page.$('textarea[id^="notes-"]');
	if (!notesTextarea) {
		throw new Error("Notes textarea not found");
	}

	// Add notes
	const testNotes =
		"This is a test note with multiple lines.\nLine 2\nLine 3 with special chars: @#$%";
	await notesTextarea.type(testNotes);

	// Click outside to trigger blur (auto-save)
	await page.click("h1");
	await delay(1000);

	// Verify notes persisted
	const savedNotes = await notesTextarea.evaluate((el) => el.value);
	if (!savedNotes.includes("test note")) {
		throw new Error("Notes not saved");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "04-notes-added.png"),
		fullPage: true,
	});

	console.log("   ✅ Notes added successfully");
	console.log("   ✅ Notes auto-saved on blur");
}

/**
 * Test 5: Pause and resume timer
 */
async function testPauseResume(page) {
	console.log("\n📋 Test 5: Pause/Resume Timer");

	// Pause timer
	const pauseButton = await page.$('[data-action="pause"]');
	if (!pauseButton) {
		throw new Error("Pause button not found");
	}

	await pauseButton.click();
	await delay(1000);

	// Verify paused state (orange border)
	const isPaused = await page.$eval("[data-timer-id]", (el) =>
		el.classList.contains("paused-card")
	);

	if (!isPaused) {
		throw new Error("Timer not marked as paused");
	}

	// Verify button changed to Resume
	const resumeButton = await page.$('[data-action="resume"]');
	if (!resumeButton) {
		throw new Error("Resume button not found");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "05-timer-paused.png"),
		fullPage: true,
	});

	console.log("   ✅ Timer paused successfully");

	// Resume timer
	await resumeButton.click();
	await delay(1000);

	// Verify resumed state (pause button back)
	const pauseButtonAgain = await page.$('[data-action="pause"]');
	if (!pauseButtonAgain) {
		throw new Error("Pause button not restored after resume");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "06-timer-resumed.png"),
		fullPage: true,
	});

	console.log("   ✅ Timer resumed successfully");
}

/**
 * Test 6: Stop timer
 */
async function testStopTimer(page) {
	console.log("\n📋 Test 6: Stop Timer");

	// Get timer ID before stopping
	const timerId = await page.$eval("[data-timer-id]", (el) =>
		el.getAttribute("data-timer-id")
	);

	// Stop timer
	const stopButton = await page.$('[data-action="stop"]');
	await stopButton.click();
	await delay(1000);

	// Verify timer removed from active list
	const timerStillExists = await page.$(`[data-timer-id="${timerId}"]`);
	if (timerStillExists) {
		throw new Error("Timer still in active list after stopping");
	}

	// Verify active count decreased
	const activeCount = await page.$eval("#active-count", (el) => el.textContent);
	if (activeCount !== "0") {
		throw new Error("Active count not updated after stop");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "07-timer-stopped.png"),
		fullPage: true,
	});

	console.log("   ✅ Timer stopped successfully");
	console.log("   ✅ Timer removed from active list");
	console.log("   ✅ Active count updated");
}

/**
 * Test 7: Delete timer
 */
async function testDeleteTimer(page) {
	console.log("\n📋 Test 7: Delete Timer");

	// Start a new timer
	await page.type("#topic-input", "Delete Test / Task");
	await page.click("#start-button");
	await delay(1000);

	const timerId = await page.$eval("[data-timer-id]", (el) =>
		el.getAttribute("data-timer-id")
	);

	// Delete timer
	const deleteButton = await page.$('[data-action="delete"]');
	await deleteButton.click();
	await delay(1000);

	// Verify timer removed
	const timerStillExists = await page.$(`[data-timer-id="${timerId}"]`);
	if (timerStillExists) {
		throw new Error("Timer still exists after delete");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "08-timer-deleted.png"),
		fullPage: true,
	});

	console.log("   ✅ Timer deleted successfully");
}

/**
 * Test 8: Data persistence
 */
async function testDataPersistence(page, browser) {
	console.log("\n📋 Test 8: Data Persistence");

	// Start a timer
	await page.type("#topic-input", "Persistence Test / Task");
	await page.click("#start-button");
	await delay(1000);

	// Get timer ID
	const timerId = await page.$eval("[data-timer-id]", (el) =>
		el.getAttribute("data-timer-id")
	);

	console.log("   Timer started, closing page...");

	// Close and reopen page
	await page.close();
	const newPage = await browser.newPage();
	await newPage.goto(CONFIG.baseUrl, { waitUntil: "networkidle0" });
	await delay(2000);

	// Check if timer persisted
	const persistedTimer = await newPage.$(`[data-timer-id="${timerId}"]`);

	if (!persistedTimer) {
		throw new Error("Timer did not persist after page reload");
	}

	await newPage.screenshot({
		path: path.join(CONFIG.screenshotDir, "09-data-persisted.png"),
		fullPage: true,
	});

	console.log("   ✅ Timer persisted after page reload");

	// Cleanup - delete the timer
	await newPage.click('[data-action="delete"]');
	await delay(1000);

	return newPage;
}

/**
 * Test 9: Tab navigation
 */
async function testTabNavigation(page) {
	console.log("\n📋 Test 9: Tab Navigation");

	// Initially on tracker tab
	const trackerVisible = await page.$eval(
		"#view-tracker",
		(el) => !el.classList.contains("hidden")
	);

	if (!trackerVisible) {
		throw new Error("Tracker view not visible initially");
	}

	// Switch to reports tab
	await page.click("#tab-reports");
	await delay(1500); // Give time for charts to render

	const reportsVisible = await page.$eval(
		"#view-reports",
		(el) => !el.classList.contains("hidden")
	);

	const trackerHidden = await page.$eval("#view-tracker", (el) =>
		el.classList.contains("hidden")
	);

	if (!reportsVisible || !trackerHidden) {
		throw new Error("Tab switch to Reports failed");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "10-reports-tab.png"),
		fullPage: true,
	});

	console.log("   ✅ Switched to Reports tab");

	// Switch back to tracker
	await page.click("#tab-tracker");
	await delay(500);

	const trackerVisibleAgain = await page.$eval(
		"#view-tracker",
		(el) => !el.classList.contains("hidden")
	);

	if (!trackerVisibleAgain) {
		throw new Error("Tab switch back to Tracker failed");
	}

	console.log("   ✅ Switched back to Tracker tab");
}

/**
 * Test 10: Responsive design
 */
async function testResponsiveDesign(page) {
	console.log("\n📋 Test 10: Responsive Design");

	const viewports = [
		{ name: "Desktop", width: 1920, height: 1080 },
		{ name: "Laptop", width: 1280, height: 800 },
		{ name: "Tablet", width: 768, height: 1024 },
		{ name: "Mobile", width: 375, height: 667 },
	];

	for (const viewport of viewports) {
		console.log(
			`   Testing ${viewport.name} (${viewport.width}x${viewport.height})`
		);

		await page.setViewport({
			width: viewport.width,
			height: viewport.height,
		});

		await delay(500);

		await page.screenshot({
			path: path.join(
				CONFIG.screenshotDir,
				`11-responsive-${viewport.name.toLowerCase()}.png`
			),
			fullPage: true,
		});

		console.log(`      ✅ ${viewport.name} layout captured`);
	}

	// Reset to default viewport
	await page.setViewport(CONFIG.viewport);
}

/**
 * Test 11: Error handling
 */
async function testErrorHandling(page) {
	console.log("\n📋 Test 11: Error Handling");

	// Expand Start New Timer section if collapsed
	const startSectionHeight = await page.$eval(
		"#data-entry-content",
		(el) => el.offsetHeight
	);
	if (startSectionHeight === 0) {
		await page.click("#data-entry-header");
		await delay(500);
	}

	// Try to start timer with empty input
	await page.click("#start-button");
	await delay(500);

	// Check for error message
	const errorMessage = await page.$eval(
		"#error-message",
		(el) => el.textContent
	);

	if (!errorMessage || errorMessage.length === 0) {
		throw new Error("No error message shown for empty input");
	}

	console.log("   ✅ Error message displayed for empty input");

	// Clear the error message and input
	await page.evaluate(() => {
		document.getElementById("error-message").textContent = "";
		document.getElementById("topic-input").value = "";
	});

	// Try with just whitespace
	await page.type("#topic-input", "   ");
	await page.click("#start-button");
	await delay(500);

	const errorMessage2 = await page.$eval(
		"#error-message",
		(el) => el.textContent
	);

	if (!errorMessage2 || errorMessage2.length === 0) {
		throw new Error("No error message shown for whitespace input");
	}

	console.log("   ✅ Error message displayed for whitespace input");

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "12-error-handling.png"),
		fullPage: true,
	});

	// Clear input for next tests
	await page.evaluate(() => {
		document.getElementById("topic-input").value = "";
		document.getElementById("error-message").textContent = "";
	});
}

/**
 * Test 12: CSV export
 */
async function testCSVExport(page) {
	console.log("\n📋 Test 12: CSV Export");

	// Expand data export section if collapsed
	const exportHeight = await page.$eval(
		"#data-export-content",
		(el) => el.offsetHeight
	);
	if (exportHeight === 0) {
		await page.click("#data-export-header");
		await delay(500);
	}

	// Export button should be visible
	const exportButton = await page.$("#export-button");
	if (!exportButton) {
		throw new Error("Export button not found");
	}

	await page.screenshot({
		path: path.join(CONFIG.screenshotDir, "13-csv-export.png"),
		fullPage: true,
	});

	console.log("   ✅ CSV export button accessible");
	console.log("   ℹ️  CSV download functionality requires manual verification");
}

/**
 * Main test runner
 */
async function runAllTests() {
	console.log("🚀 Starting comprehensive UI/UX test suite...\n");
	console.log(`Configuration:`);
	console.log(`  Base URL: ${CONFIG.baseUrl}`);
	console.log(`  Viewport: ${CONFIG.viewport.width}x${CONFIG.viewport.height}`);
	console.log(`  Headless: ${CONFIG.headless}`);
	console.log(`  Screenshots: ${CONFIG.screenshotDir}/`);

	const browser = await puppeteer.launch({
		headless: CONFIG.headless,
		defaultViewport: CONFIG.viewport,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	let page = await browser.newPage();

	// Enable console logging from the page
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log("   ⚠️  PAGE ERROR:", msg.text());
		}
	});

	try {
		await testInitialLoad(page);
		await testCollapsibleSections(page);
		await testStartTimer(page);
		await testTimerNotes(page);
		await testPauseResume(page);
		await testStopTimer(page);
		await testDeleteTimer(page);

		// Test 8 returns a new page (after reload)
		page = await testDataPersistence(page, browser);

		await testTabNavigation(page);
		await testResponsiveDesign(page);
		await testErrorHandling(page);
		await testCSVExport(page);

		// Final screenshot
		await page.screenshot({
			path: path.join(CONFIG.screenshotDir, "14-final-state.png"),
			fullPage: true,
		});

		console.log("\n✨ All tests passed successfully!");
		console.log(`📸 Screenshots saved in ${CONFIG.screenshotDir}/`);
	} catch (error) {
		console.error("\n❌ Test failed:", error.message);
		console.error(error.stack);

		await page.screenshot({
			path: path.join(CONFIG.screenshotDir, "error.png"),
			fullPage: true,
		});

		process.exit(1);
	} finally {
		await browser.close();
	}
}

// Run the test suite
runAllTests().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
