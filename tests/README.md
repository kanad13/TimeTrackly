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

**Backend tests:** Use Node.js `test()` and `assert()`. Fetch endpoint → check status + response shape. See [test-backend-api.cjs](../tests/e2e/test-backend-api.cjs) for complete examples.

**E2E tests:** Use Puppeteer. Type input → click button → wait for element → verify DOM state. See [test-ui-complete.cjs](../tests/e2e/test-ui-complete.cjs) for complete examples.

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


## Additional Resources

- Test files: `tests/e2e/test-backend-api.cjs`, `tests/e2e/test-ui-complete.cjs`
- [Puppeteer Documentation](https://pptr.dev/)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
