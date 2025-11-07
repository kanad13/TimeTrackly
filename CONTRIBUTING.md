# Contributing to TimeTrackly

This guide helps you make changes confidently and maintain quality.

## Quick Reference

**Before changing code**: Read relevant module documentation in [docs/API.md](docs/API.md)
**After making changes**: Run tests, update docs if needed, commit with clear message
**When stuck**: Check [docs/architecture.md](docs/architecture.md) for design philosophy

## Development Workflow

### 1. Making Code Changes

```bash
# 1. Understand the change
# - Read the relevant module's JSDoc comments
# - Check docs/architecture.md for design constraints
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
```

### 2. When to Update Documentation

**Update [docs/API.md](docs/API.md)** when:
- Adding/removing exported functions
- Changing function signatures
- Modifying module responsibilities

**Update [docs/architecture.md](docs/architecture.md)** when:
- Changing data models
- Modifying state structure
- Altering system behavior or workflows

**Update [docs/setup.md](docs/setup.md)** when:
- Adding npm scripts
- Changing environment requirements
- Modifying deployment steps

**Update [docs/readme.md](docs/readme.md)** when:
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

See [tests/README.md](tests/README.md) for detailed testing documentation.

## Architecture Decision Records (ADRs)

### When to Create an ADR

Create a new ADR in `docs/ADR-###-title.md` when a decision meets **all** criteria:

1. **Long-term implications** - Hard to reverse later (e.g., framework choice, data storage)
2. **Clear tradeoffs** - Multiple valid alternatives were seriously considered
3. **Non-obvious from code** - Future maintainers need context for "why"
4. **Architectural impact** - Affects multiple modules or overall system design

### Examples of ADR-Worthy Decisions

**YES - Create ADR:**
- Choosing vanilla JS over React/Vue (affects all future development)
- Using JSON files vs SQLite/PostgreSQL (affects scaling and deployment)
- Local-only vs cloud-based architecture (fundamentally different systems)

**NO - Don't create ADR:**
- Which CSS framework to use (easily swappable)
- Implementation patterns within a single module (document in code comments)
- Tactical choices without long-term lock-in (refactor cost is low)

### ADR Template

```markdown
# ADR-###: [Decision Title]

**Status**: Accepted
**Date**: YYYY-MM-DD

## Context
What problem are we solving? What constraints exist?

## Decision
What did we decide? Be specific.

## Consequences
**Benefits:**
- List positive outcomes

**Tradeoffs:**
- List what we gave up or accepted as limitations

## Alternatives Considered
What other options did we evaluate and why were they rejected?
```

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

- **Architecture questions**: See [docs/architecture.md](docs/architecture.md)
- **API usage**: See [docs/API.md](docs/API.md)
- **Testing patterns**: See [tests/README.md](tests/README.md)
- **Setup issues**: See [docs/setup.md](docs/setup.md)

---

**Remember**: This is a single-user, local-first application. Prioritize simplicity and maintainability over enterprise complexity.
