# Testing Guide

Practical guide for writing, maintaining, and executing tests for TimeTrackly.

## Quick Start

```bash
# Run all tests (backend API + E2E UI)
npm test

# Run specific test suites
npm run test:api      # Backend API tests only
npm run test:e2e      # E2E UI tests only
npm run test:headless # E2E in headless mode (for CI)
```

## Test Structure

```
tests/
├── e2e/
│   ├── test-backend-api.cjs  # Backend API tests (23 tests)
│   └── test-ui-complete.cjs  # UI/UX E2E tests (12 scenarios)
├── unit/                      # Unit tests (131 tests)
│   ├── setup.mjs              # Test environment setup (JSDOM)
│   ├── test-state.mjs         # State management tests (25 tests)
│   ├── test-utils.mjs         # Utility functions tests (43 tests)
│   ├── test-ui.mjs            # UI operations tests (24 tests)
│   ├── test-constants.mjs     # Constants validation tests (21 tests)
│   └── test-reports.mjs       # Data aggregation tests (18 tests)
├── fixtures/                  # Test data samples
└── screenshots/e2e/           # Test screenshots
```

## Current Test Coverage

| Suite         | Tests   | Status         |
| ------------- | ------- | -------------- |
| Backend API   | 23/23   | ✅ All passing |
| E2E UI        | 12/12   | ✅ All passing |
| Frontend Unit | 131/131 | ✅ All passing |

### ✅ Unit Tests Status

**Status:** All frontend unit tests are now fully enabled and passing. The JSDOM compatibility issue has been resolved.

**What's Tested:**

- ✅ State management (calculateElapsedMs, hasRunningTimers, clearTimerInterval)
- ✅ Utility functions (formatDuration, sanitizeInput, generateUUID, getRunningTasksKey, getDistinctColors)
- ✅ UI operations (timer lifecycle, duplicate detection, notes persistence, CSV export)
- ✅ Constants validation (time conversions, configuration values, chart colors)
- ✅ Data aggregation (project/daily duration calculations for reports)
- ✅ Backend API endpoints (health, suggestions, data, active-state)
- ✅ E2E UI workflows (start, pause, resume, stop, delete, notes, export, persistence)
- ✅ Error handling and validation
- ✅ Responsive design across viewport sizes

---

## When to Add Tests

### Add Backend API Tests When:

- Creating new API endpoints
- Modifying request/response handling
- Changing data validation logic
- Adding new file operations

### Add E2E Tests When:

- Adding new UI features
- Modifying user workflows
- Changing page layouts or components
- Adding new user interactions

### Required Test Checklist:

- [ ] Happy path (expected usage)
- [ ] Error conditions (invalid input, failures)
- [ ] Edge cases (empty data, large data, special characters)
- [ ] Data persistence (if applicable)

---

## How to Write Tests

### Backend API Test Pattern

```javascript
const test = require("node:test");
const assert = require("node:assert");

test("GET /api/endpoint returns expected data", async () => {
	const res = await fetch("http://localhost:13331/api/endpoint");
	const data = await res.json();

	assert.strictEqual(res.status, 200);
	assert.ok(Array.isArray(data));
});

test("POST /api/endpoint validates input", async () => {
	const res = await fetch("http://localhost:13331/api/endpoint", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ invalid: "data" }),
	});

	assert.strictEqual(res.status, 400);
});
```

### E2E UI Test Pattern

```javascript
const puppeteer = require("puppeteer");

async function testFeature(page) {
	console.log("📋 Testing: Feature Name");

	// Perform action
	await page.type("#input-id", "test value");
	await page.click("#button-id");
	await delay(1000);

	// Verify result
	const result = await page.$("#result-element");
	if (result) {
		console.log("   ✅ Feature works correctly");
	} else {
		throw new Error("Feature failed");
	}

	// Take screenshot
	await page.screenshot({
		path: "tests/screenshots/e2e/feature-test.png",
		fullPage: true,
	});
}
```

---

## Test Maintenance

### Before Committing Code:

```bash
# Run all tests
npm test

# If tests fail, fix code or update tests
# Never commit with failing tests
```

### When Modifying Existing Features:

1. Run affected test suite first
2. Update tests if behavior changed intentionally
3. Add new test cases for new scenarios
4. Verify all tests pass

### When Tests Become Flaky:

- Add explicit waits: `await page.waitForSelector('#element')`
- Increase timeouts if needed
- Use `waitForNetworkIdle` for async operations
- Check for race conditions

### Screenshot Management:

- Screenshots auto-generate during E2E tests
- Located in `tests/screenshots/e2e/`
- Useful for debugging test failures
- Commit updated screenshots if UI changed

---

## Running Tests Locally

### Prerequisites

```bash
# Ensure server is running
npm start

# In another terminal, run tests
npm test
```

### Debug Mode (Browser Visible)

```bash
# Edit test file, set headless: false
const browser = await puppeteer.launch({
	headless: false,  // Show browser
	devtools: true,   // Open DevTools
	slowMo: 250       // Slow down actions
});
```

### Troubleshooting

**Server not running:**

```bash
lsof -ti:13331  # Check if server running
npm start       # Start server
```

**Tests timing out:**

- Increase timeout in test file
- Check server logs for errors
- Verify network is not blocking localhost

**Element not found:**

- Add wait: `await page.waitForSelector('#element', { timeout: 5000 })`
- Check selector is correct
- Verify element exists in DOM

---

## CI/CD Integration

Tests run automatically on push via GitHub Actions (`.github/workflows/test.yml`).

### What Runs in CI:

1. Install dependencies
2. Start server
3. Run backend API tests
4. Run E2E tests (headless)
5. Upload screenshots as artifacts

### View Results:

- Check Actions tab in GitHub
- Download test screenshots from artifacts
- Review test logs for failures

---

## Test Fixtures

Located in `tests/fixtures/`, these provide sample data for tests:

- `sample-data.json` - Historical time entries
- `sample-active-state.json` - Active timer state
- `sample-suggestions.json` - Task suggestions

### Using Fixtures in Tests:

```javascript
const fs = require("fs");
const path = require("path");

const fixture = JSON.parse(
	fs.readFileSync(path.join(__dirname, "../fixtures/sample-data.json"))
);
```

---

## Best Practices

### ✅ Do:

- Test user-facing behavior, not implementation
- Use descriptive test names
- Add assertions to verify results
- Clean up test data after tests
- Take screenshots for visual verification
- Handle timing issues with explicit waits

### ❌ Don't:

- Test internal variables or private functions
- Use rigid delays without verification
- Leave failing tests
- Commit without running tests
- Skip error case testing

---

## Common Test Patterns

### Testing Collapsible Sections

```javascript
async function testCollapsibleSection(page, headerId, contentId, sectionName) {
	await page.click(headerId);
	await delay(500);

	const newHeight = await page.$eval(contentId, (el) => el.offsetHeight);
	if (newHeight > 0) {
		console.log(`✅ ${sectionName} toggled successfully`);
	}
}
```

### Testing Timer Lifecycle

```javascript
async function testTimer(page) {
	// Start timer
	await page.type("#topic-input", "Project / Task");
	await page.click("#start-button");
	await delay(1000);

	// Verify timer appears
	const timer = await page.$("[data-timer-id]");
	assert.ok(timer, "Timer should be created");

	// Stop timer
	await page.click('[data-action="stop"]');
	await delay(1000);
}
```

### Testing Data Persistence

```javascript
async function testPersistence(page, browser) {
	// Create data
	await page.type("#topic-input", "Test / Task");
	await page.click("#start-button");
	await delay(1000);

	// Reload page
	await page.close();
	const newPage = await browser.newPage();
	await newPage.goto("http://localhost:13331");
	await delay(2000);

	// Verify data persisted
	const timer = await newPage.$("[data-timer-id]");
	assert.ok(timer, "Timer should persist");

	return newPage;
}
```

### Testing Responsive Design

```javascript
async function testResponsive(page) {
	const viewports = [
		{ name: "Desktop", width: 1920, height: 1080 },
		{ name: "Tablet", width: 768, height: 1024 },
		{ name: "Mobile", width: 375, height: 667 },
	];

	for (const viewport of viewports) {
		await page.setViewport(viewport);
		await delay(500);
		await page.screenshot({
			path: `tests/screenshots/e2e/${viewport.name.toLowerCase()}.png`,
		});
	}
}
```

---

## Additional Resources

- **IMPLEMENTATION-COMPLETE.md** - Full implementation details
- **UNIT-TESTS-ISSUE.md** - Known issue with unit tests
- Test files: `tests/e2e/test-backend-api.js`, `tests/e2e/test-ui-complete.js`
- [Puppeteer Documentation](https://pptr.dev/)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
