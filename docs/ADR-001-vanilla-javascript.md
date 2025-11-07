# ADR-001: Use Vanilla JavaScript Instead of a Framework

**Status:** ACCEPTED
**Date:** 2024-10-15
**Affected Component:** Frontend (all)

## Context

TimeTrackly is a single-page time tracking application with relatively simple interactions. The team evaluated using a JavaScript framework (React, Vue, Svelte) versus plain vanilla JavaScript.

### Framework Option Evaluation

| Consideration | React/Vue | Vanilla JS |
|---|---|---|
| Bundle Size | 40-70KB | ~0KB (just code) |
| Build Step Required | Yes | No |
| Learning Curve | Moderate-High | None |
| Complexity Ceiling | High | Low |
| Suitable for 1-page app | Overkill | Perfect |
| Browser Support | Modern only | IE11+ with polyfills |
| Deployment | npm/webpack | Direct serve |

## Decision

**Use vanilla JavaScript (ES6 modules) without a framework.**

## Rationale

1. **Simplicity**: The app has only ~2,200 lines of code. Complexity cost of a framework outweighs benefits.

2. **Deployment**: No build step needed. Serve HTML/JS/CSS directly from Node.js server. Reduces deployment friction.

3. **Bundle Size**: Users download only the code needed. No unused framework code.

4. **Maintainability**: Developers can understand the entire codebase quickly. No framework-specific patterns to learn.

5. **Performance**: No runtime overhead. Direct DOM manipulation is appropriate here.

6. **Learning Curve**: New developers immediately understand the code. No framework learning curve.

## Consequences

### Positive

- Simple, direct HTTP requests without complex state management abstractions
- Developers can jump in without learning a framework
- No build tool complexity
- Fast initial page load
- Clear code paths easy to follow

### Negative

- Lack of automatic re-renders (must manually call `renderActiveTimers()`)
- No built-in component system (manually split modules)
- Manual DOM manipulation instead of declarative syntax
- No built-in validation or type checking (using JSDoc instead)

## Mitigation for Negatives

1. **Manual Re-renders**: Enforce discipline - always call `renderActiveTimers()` after state changes
2. **Module Organization**: Use ES6 modules with clear separation of concerns
3. **DOM Management**: Cache element references to avoid repeated lookups
4. **Type Safety**: Use JSDoc comments for type hints and IDE autocomplete

## Alternatives Considered

### React
- ✓ Mature, large ecosystem
- ✗ 40KB+ bundle, build step required, overengineered for this use case

### Vue
- ✓ Lighter than React (~30KB), gentle learning curve
- ✗ Still requires build step, still overkill for single-page app

### Svelte
- ✓ Smallest bundle (~15KB), compile-time optimizations
- ✗ Unfamiliar to team, smaller community

## Future Considerations

If the app grows to:
- Multiple pages with complex routing
- 5,000+ lines of code
- Multiple developers working simultaneously
- Complex shared state across many components

Then **migration to a framework might become justified**, but that's not the current case.

## Migration Path if Needed

If a framework becomes necessary:

1. Keep business logic (api.js, state.js, utils.js) framework-agnostic
2. Rewrite only ui.js as framework components
3. Re-use existing tests as regression tests
4. Gradual migration: one feature at a time

Current architecture makes this feasible because:
- State is already separated (state.js)
- API calls are isolated (api.js)
- UI is the only tightly coupled part (ui.js)
