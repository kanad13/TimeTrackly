# Testing Guide for Time Tracker

This document provides comprehensive guidelines for testing UI/UX changes using Puppeteer.

## Table of Contents

1. [Setup](#setup)
2. [Testing Principles](#testing-principles)
3. [Test Structure](#test-structure)
4. [Common Test Patterns](#common-test-patterns)
5. [UI/UX Testing Checklist](#uiux-testing-checklist)
6. [Running Tests](#running-tests)
7. [Best Practices](#best-practices)

---

## Setup

### Prerequisites

```bash
# Puppeteer is already installed as a dev dependency
# If not, run:
npm install --save-dev puppeteer

# Ensure screenshots directory exists
mkdir -p screenshots
```

### Server Requirements

Before running tests, ensure the server is running:

```bash
# Terminal 1: Start the server
npm start

# Terminal 2: Run tests
node tests/your-test-file.js
```

---

## Testing Principles

### 1. Test User Flows, Not Implementation

❌ **Don't test:**

- Internal variable names
- Specific CSS class names (unless critical for functionality)
- Implementation details

✅ **Do test:**

- User-visible behavior
- Data persistence
- Error handling
- Visual feedback

### 2. Make Tests Resilient

- Use data attributes (`data-testid`) for selectors
- Avoid brittle CSS selectors
- Add explicit waits for async operations
- Handle timing issues gracefully

### 3. Visual Verification

- Take screenshots at key steps
- Compare before/after states
- Test responsive layouts
- Verify animations complete

---

## Test Structure

### Basic Test Template

```javascript
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
	headless: false, // Set to true for CI/CD
};

async function runTests() {
	console.log("🚀 Starting tests...\n");

	// Ensure screenshot directory exists
	if (!fs.existsSync(CONFIG.screenshotDir)) {
		fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
	}

	const browser = await puppeteer.launch({
		headless: CONFIG.headless,
		defaultViewport: CONFIG.viewport,
		args: ["--no-sandbox", "--disable-setuid-sandbox"], // For CI/CD
	});

	const page = await browser.newPage();

	// Enable console logging from the page
	page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

	try {
		await page.goto(CONFIG.baseUrl, { waitUntil: "networkidle0" });

		// Run your tests here
		await testFeature1(page);
		await testFeature2(page);

		console.log("\n✅ All tests passed!");
	} catch (error) {
		console.error("❌ Test failed:", error);
		await page.screenshot({
			path: path.join(CONFIG.screenshotDir, "error.png"),
			fullPage: true,
		});
		throw error;
	} finally {
		await browser.close();
	}
}

// Run tests
runTests().catch(console.error);
```

---

## Common Test Patterns

### 1. Testing Collapsible Sections

```javascript
async function testCollapsibleSection(page, headerId, contentId, sectionName) {
	console.log(`\n📋 Testing: ${sectionName} Collapsibility`);

	// Check if elements exist
	const header = await page.$(headerId);
	if (!header) {
		throw new Error(`${sectionName} header not found`);
	}

	// Get initial state
	const initialHeight = await page.$eval(contentId, (el) => el.offsetHeight);
	const isInitiallyCollapsed = initialHeight === 0;
	console.log(
		`   Initial state: ${isInitiallyCollapsed ? "Collapsed" : "Expanded"}`
	);

	// Click to toggle
	await page.click(headerId);
	await delay(500); // Wait for animation

	const newHeight = await page.$eval(contentId, (el) => el.offsetHeight);
	const isNowExpanded = newHeight > 0;

	// Take screenshot
	await page.screenshot({
		path: `screenshots/${sectionName
			.toLowerCase()
			.replace(/\s+/g, "-")}-toggled.png`,
		fullPage: true,
	});

	// Verify state changed
	if (isInitiallyCollapsed === isNowExpanded) {
		console.log(`   ✅ ${sectionName} toggled successfully`);
	} else {
		throw new Error(`${sectionName} did not toggle properly`);
	}

	// Toggle back
	await page.click(headerId);
	await delay(500);
}

// Usage
await testCollapsibleSection(
	page,
	"#data-entry-header",
	"#data-entry-content",
	"Start New Timer"
);
```

### 2. Testing Timer Lifecycle

```javascript
async function testTimerLifecycle(page) {
	console.log("\n📋 Testing: Timer Lifecycle");

	// Step 1: Start a timer
	const projectTask = "Test Project / Test Task";
	await page.type("#topic-input", projectTask);
	await page.click("#start-button");
	await delay(1000);

	await page.screenshot({
		path: "screenshots/timer-started.png",
		fullPage: true,
	});
	console.log("   ✅ Timer started");

	// Verify timer appears
	const timerCard = await page.$("[data-timer-id]");
	if (!timerCard) {
		throw new Error("Timer card not rendered");
	}

	// Step 2: Add notes
	const notesTextarea = await page.$('textarea[id^="notes-"]');
	if (notesTextarea) {
		await notesTextarea.type("Test notes for this timer");
		await page.click("h1"); // Click outside to trigger blur
		await delay(1000);
		console.log("   ✅ Notes added");
	}

	// Step 3: Pause timer
	const pauseButton = await page.$('[data-action="pause"]');
	if (pauseButton) {
		await pauseButton.click();
		await delay(1000);

		// Verify paused state (orange border)
		const isPaused = await page.$eval("[data-timer-id]", (el) =>
			el.classList.contains("paused-card")
		);

		if (isPaused) {
			console.log("   ✅ Timer paused");
		}

		await page.screenshot({
			path: "screenshots/timer-paused.png",
			fullPage: true,
		});
	}

	// Step 4: Resume timer
	const resumeButton = await page.$('[data-action="resume"]');
	if (resumeButton) {
		await resumeButton.click();
		await delay(1000);
		console.log("   ✅ Timer resumed");
	}

	// Step 5: Stop timer
	const stopButton = await page.$('[data-action="stop"]');
	await stopButton.click();
	await delay(1000);

	await page.screenshot({
		path: "screenshots/timer-stopped.png",
		fullPage: true,
	});
	console.log("   ✅ Timer stopped");

	// Verify timer removed from active list
	const remainingTimers = await page.$$("[data-timer-id]");
	if (remainingTimers.length === 0) {
		console.log("   ✅ Timer removed from active list");
	}
}
```

### 3. Testing Data Persistence

```javascript
async function testDataPersistence(page, browser) {
	console.log("\n📋 Testing: Data Persistence");

	// Start a timer
	await page.type("#topic-input", "Persistence Test / Task");
	await page.click("#start-button");
	await delay(1000);

	// Get timer ID
	const timerId = await page.$eval("[data-timer-id]", (el) =>
		el.getAttribute("data-timer-id")
	);
	console.log(`   Timer ID: ${timerId}`);

	// Close and reopen page
	await page.close();
	const newPage = await browser.newPage();
	await newPage.goto("http://localhost:13331", { waitUntil: "networkidle0" });
	await delay(2000);

	// Check if timer persisted
	const persistedTimer = await newPage.$(`[data-timer-id="${timerId}"]`);

	if (persistedTimer) {
		console.log("   ✅ Timer persisted after page reload");
	} else {
		throw new Error("Timer did not persist");
	}

	// Cleanup
	await newPage.click('[data-action="delete"]');
	await delay(1000);

	return newPage;
}
```

### 4. Testing Tab Navigation

```javascript
async function testTabNavigation(page) {
	console.log("\n📋 Testing: Tab Navigation");

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
	await delay(1000);

	const reportsVisible = await page.$eval(
		"#view-reports",
		(el) => !el.classList.contains("hidden")
	);

	const trackerHidden = await page.$eval("#view-tracker", (el) =>
		el.classList.contains("hidden")
	);

	if (reportsVisible && trackerHidden) {
		console.log("   ✅ Switched to Reports tab successfully");
	} else {
		throw new Error("Tab switch failed");
	}

	await page.screenshot({
		path: "screenshots/reports-tab.png",
		fullPage: true,
	});

	// Switch back
	await page.click("#tab-tracker");
	await delay(1000);
	console.log("   ✅ Switched back to Tracker tab");
}
```

### 5. Testing Responsive Design

```javascript
async function testResponsiveDesign(page) {
	console.log("\n📋 Testing: Responsive Design");

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
			path: `screenshots/responsive-${viewport.name.toLowerCase()}.png`,
			fullPage: true,
		});

		console.log(`   ✅ ${viewport.name} layout captured`);
	}
}
```

### 6. Testing CSV Export

```javascript
async function testCSVExport(page) {
	console.log("\n📋 Testing: CSV Export");

	// Ensure there's data to export (start and stop a timer)
	await page.type("#topic-input", "Export Test / Task");
	await page.click("#start-button");
	await delay(2000);
	await page.click('[data-action="stop"]');
	await delay(1000);

	// Expand data export section if collapsed
	const exportContent = await page.$("#data-export-content");
	const height = await exportContent.evaluate((el) => el.offsetHeight);

	if (height === 0) {
		await page.click("#data-export-header");
		await delay(500);
	}

	// Setup download handler
	const client = await page.target().createCDPSession();
	await client.send("Page.setDownloadBehavior", {
		behavior: "allow",
		downloadPath: process.cwd(),
	});

	// Click export button
	await page.click("#export-button");
	await delay(2000);

	console.log("   ✅ CSV export triggered (check downloads folder)");
}
```

---

## UI/UX Testing Checklist

Use this checklist when testing UI/UX changes:

### Visual Elements

- [ ] All colors match design specifications
- [ ] Typography is consistent and readable
- [ ] Icons are properly aligned and sized
- [ ] Spacing and padding are uniform
- [ ] Borders and shadows render correctly

### Interactions

- [ ] Buttons have hover states
- [ ] Buttons have active/pressed states
- [ ] Buttons have disabled states (if applicable)
- [ ] Click targets are appropriately sized (min 44x44px)
- [ ] Focus indicators are visible for keyboard navigation

### Animations

- [ ] Transitions are smooth (no jank)
- [ ] Animation durations feel natural (200-500ms)
- [ ] Collapsible sections expand/collapse correctly
- [ ] Loading states are visible
- [ ] No layout shifts during animations

### Responsiveness

- [ ] Layout works on desktop (1920px+)
- [ ] Layout works on laptop (1280px)
- [ ] Layout works on tablet (768px)
- [ ] Layout works on mobile (375px)
- [ ] Text remains readable at all sizes
- [ ] No horizontal scrolling (except when intended)

### Accessibility

- [ ] Color contrast meets WCAG AA standards (4.5:1)
- [ ] Interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Error messages are clear and helpful
- [ ] Success notifications are visible

### Data Integrity

- [ ] Data persists after page reload
- [ ] Timers maintain state across sessions
- [ ] Notes are saved correctly
- [ ] CSV export includes all data
- [ ] No data loss on errors

### Browser Compatibility

- [ ] Works in Chrome/Chromium
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

---

## Running Tests

### Development Testing

```bash
# Run with browser visible
node tests/test-ui-changes.js

# Run specific test file
node tests/test-collapsible-sections.js
```

### Automated Testing (CI/CD)

```bash
# Run in headless mode
HEADLESS=true node tests/test-all.js

# Run with coverage
npm run test:coverage
```

### Debug Mode

```javascript
// Add to test file for debugging
const browser = await puppeteer.launch({
	headless: false,
	devtools: true, // Opens DevTools automatically
	slowMo: 250, // Slows down operations by 250ms
});
```

---

## Best Practices

### 1. Use Descriptive Test Names

```javascript
// ❌ Bad
async function test1(page) { ... }

// ✅ Good
async function testTimerPauseResumeFunctionality(page) { ... }
```

### 2. Add Assertions

```javascript
// ❌ Bad - just clicks without verifying
await page.click("#start-button");

// ✅ Good - verifies the action worked
await page.click("#start-button");
const timerExists = await page.$("[data-timer-id]");
if (!timerExists) {
	throw new Error("Timer did not start");
}
```

### 3. Handle Timing Issues

```javascript
// ❌ Bad - rigid delays
await delay(1000);

// ✅ Good - wait for specific condition
await page.waitForSelector("[data-timer-id]", { timeout: 5000 });

// Or wait for network idle
await page.waitForNetworkIdle({ timeout: 5000 });
```

### 4. Clean Up After Tests

```javascript
async function testWithCleanup(page) {
	try {
		// Run test
		await page.type("#topic-input", "Test / Task");
		await page.click("#start-button");
		await delay(1000);

		// Test assertions...
	} finally {
		// Always clean up, even if test fails
		const deleteButtons = await page.$$('[data-action="delete"]');
		for (const button of deleteButtons) {
			await button.click();
			await delay(500);
		}
	}
}
```

### 5. Screenshot Everything

```javascript
// Take screenshots at each major step
await page.screenshot({
	path: `screenshots/${testName}-step-${stepNumber}.png`,
	fullPage: true,
});

// Use timestamp for unique names
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
await page.screenshot({
	path: `screenshots/test-${timestamp}.png`,
});
```

### 6. Log Progress

```javascript
console.log("\n📋 Test: Timer Lifecycle");
console.log("   ⏳ Starting timer...");
// ... action ...
console.log("   ✅ Timer started");

console.log("   ⏳ Adding notes...");
// ... action ...
console.log("   ✅ Notes added");
```

### 7. Test Error Conditions

```javascript
async function testErrorHandling(page) {
	console.log("\n📋 Testing: Error Handling");

	// Try to start timer with empty input
	await page.click("#start-button");
	await delay(500);

	// Check for error message
	const errorMessage = await page.$eval(
		"#error-message",
		(el) => el.textContent
	);

	if (errorMessage && errorMessage.length > 0) {
		console.log("   ✅ Error message displayed for invalid input");
	} else {
		throw new Error("No error message shown for invalid input");
	}
}
```

---

## Example Test Suite

See `tests/test-complete-suite.js` for a comprehensive example that tests:

- Initial page load
- All collapsible sections
- Complete timer lifecycle
- Data persistence
- Tab navigation
- Responsive design
- CSV export
- Error handling

---

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: UI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Start server
        run: npm start &

      - name: Wait for server
        run: npx wait-on http://localhost:13331

      - name: Run tests
        run: HEADLESS=true node tests/test-all.js

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: test-screenshots
          path: screenshots/
```

---

## Troubleshooting

### Common Issues

**Issue: "Navigation timeout of 30000 ms exceeded"**

```javascript
// Solution: Increase timeout or check if server is running
await page.goto(url, {
	waitUntil: "networkidle0",
	timeout: 60000,
});
```

**Issue: "Element not found"**

```javascript
// Solution: Wait for element to appear
await page.waitForSelector("#element-id", { timeout: 5000 });
```

**Issue: "Tests are flaky"**

```javascript
// Solution: Add explicit waits and retry logic
async function retryClick(page, selector, maxRetries = 3) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			await page.waitForSelector(selector, { timeout: 5000 });
			await page.click(selector);
			return;
		} catch (error) {
			if (i === maxRetries - 1) throw error;
			await delay(1000);
		}
	}
}
```

---

## Additional Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [Puppeteer API Reference](https://pptr.dev/api)
- [Testing Best Practices](https://pptr.dev/guides/testing)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

---

**Remember**: Good tests are fast, reliable, and maintainable. Write tests that verify user-facing behavior, not implementation details.
