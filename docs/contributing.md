# Contributing to TimeTrackly

This guide helps you make changes confidently and maintain quality.

## Quick Reference

**Before changing code**: Read relevant module documentation in [API Reference](/docs/api.md)
**After making changes**: Run tests, update docs if needed, commit with clear message
**When stuck**: Check [Architecture](/docs/architecture.md) for design philosophy

## Development Workflow

### 1. Making Code Changes

```bash
# 1. Understand the change
# - Read the relevant module's JSDoc comments
# - Check /docs/architecture.md for design constraints
# - Review existing tests for the module

# 2. Make your changes
# - Keep business logic in JS modules, not in index.html
# - Follow existing patterns and naming conventions
# - Add error handling with rollback for state changes

# 3. Test your changes
npm test                  # Run all tests
npm run test:unit         # Frontend unit tests only
npm run test:e2e          # End-to-end UI tests
npm run test:api          # Backend API tests

# 4. Manual testing (optional but recommended)
npm run dev               # Start with verbose logging
# Open browser, test the specific feature you changed

# 5. Loading sample data for chart/report testing
node scripts/generate-dummy-data.cjs
# Generates 260+ entries over 80+ days with realistic project distribution
# Restart server to see populated Reports tab with charts
# Note: This overwrites mtt-data.json - commit/stash changes first if needed
```

### 2. When to Update Documentation

**Update [API Reference](/docs/api.md)** when:

- Adding/removing exported functions
- Changing function signatures
- Modifying module responsibilities

**Update [Architecture](/docs/architecture.md)** when:

- Changing data models
- Modifying state structure
- Altering system behavior or workflows

**Update [Setup](/docs/setup.md)** when:

- Adding npm scripts
- Changing environment requirements
- Modifying deployment steps

**Update [Project Readme](/readme.md)** when:

- Adding user-facing features
- Changing UI behavior
- Updating usage instructions

## Testing Strategy

### What to Test

**Add unit tests** (`tests/unit/`) when:

- Adding new functions to existing modules
- Modifying calculation logic (state.js, utils.js)
- Changing validation or sanitization logic

**Add E2E tests** (`tests/e2e/`) when:

- Adding new user workflows
- Modifying timer lifecycle behavior
- Changing data persistence flows

**Add API tests** (`tests/e2e/test-backend-api.cjs`) when:

- Adding new endpoints
- Modifying request/response handling
- Changing file I/O operations

### Where Tests Live

Tests mirror the source structure:

```
js/state.js      → tests/unit/test-state.cjs
js/utils.js      → tests/unit/test-utils.cjs
server.cjs       → tests/e2e/test-backend-api.cjs
User workflows   → tests/e2e/test-ui-complete.cjs
```

See [Tests](/tests/README.md) for detailed testing documentation.

## Code Quality Checklist

Before committing, verify:

- [ ] Code follows existing patterns and style
- [ ] Error handling added with proper rollback logic
- [ ] JSDoc comments added for new exported functions
- [ ] All tests pass (`npm test`)
- [ ] Manual testing performed for UI changes
- [ ] Documentation updated if behavior changed
- [ ] Commit message describes "why" not just "what"

## Common Pitfalls

**State Management:**

- Always `await` save operations before re-rendering
- Implement rollback if server save fails
- Update both `activeTimers` and `historicalEntries` atomically when stopping timers

**DOM Updates:**

- Call `renderActiveTimers()` after state changes
- Don't modify DOM directly - update state, then render
- Preserve user UI state (expanded sections, scroll position) across re-renders

**Testing:**

- Don't skip tests - they catch regressions
- Add tests for bug fixes to prevent reoccurrence
- Use fixtures in `tests/fixtures/` for consistent test data

## Getting Help

- **Architecture questions**: See [Architecture](/docs/architecture.md)
- **API usage**: See [API Reference](/docs/api.md)
- **Testing patterns**: See [Tests](/tests/README.md)
- **Setup issues**: See [Setup](/docs/setup.md)

---

**Remember**: This is a single-user, local-first application. Prioritize simplicity and maintainability over enterprise complexity.
