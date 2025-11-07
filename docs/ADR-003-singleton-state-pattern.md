# ADR-003: Use ES6 Module Singleton Pattern for State Management

**Status:** ACCEPTED
**Date:** 2024-10-25
**Affected Component:** Frontend (state.js, all modules importing state)

## Context

TimeTrackly needs centralized state management accessible from multiple modules (ui.js, api.js, reports.js). The team evaluated various patterns for managing shared state.

### State Management Patterns Evaluated

| Pattern | Complexity | Boilerplate | Type Safety | Learning Curve |
|---|---|---|---|---|
| Redux | High | High | Good | Steep |
| MobX | Medium | Medium | Good | Medium |
| Zustand | Low | Low | Okay | Gentle |
| Context API | Low | Medium | Okay | Gentle |
| EventEmitter | Very Low | Low | Poor | Easy |
| **ES6 Module Singleton** | **Very Low** | **Very Low** | **Okay** | **Immediate** |

## Decision

**Use ES6 module singleton pattern with centralized `state.js` file.**

## Implementation

### state.js Structure

```javascript
// Single object defined at module level
export const state = {
  historicalEntries: [],
  predefinedSuggestions: [],
  activeTimers: {},
  timerInterval: null,
  activeChartInstances: []
};

// Helper functions exported
export function calculateElapsedMs(timer) { ... }
export function clearTimerInterval() { ... }
export function hasRunningTimers() { ... }
```

### Usage Pattern

```javascript
// All modules import the same object
import { state } from "./state.js";

// Mutations are direct assignments
state.activeTimers[id] = newTimer;
state.historicalEntries.push(entry);

// No special syntax, no action creators, no reducers
```

## Rationale

1. **Simplicity**: No setup, no boilerplate. Import and use immediately.

2. **Familiarity**: This is how most developers naturally structure code. No learning curve.

3. **Debuggability**: State is a plain JavaScript object. Console.log() or inspect directly.

4. **Size**: Zero dependencies, zero code overhead.

5. **Bundle Impact**: No framework code at all. Just ~200 lines of state + ~2000 lines of app code.

6. **Appropriate Scale**: For 2,200 lines of code across 5 files, Redux-like patterns are overkill.

7. **IDE Support**: Intellisense works perfectly. No special type definitions needed.

## How It Works

### Singleton Pattern Explanation

When you do:
```javascript
// state.js
export const state = { ... };

// ui.js
import { state } from "./state.js";
state.activeTimers[id] = timer; // ✓ Works

// api.js
import { state } from "./state.js";
state.activeTimers[id]; // ✓ Same object
```

Both modules import the **same object**. It's a singleton because:
- ES6 module imports are cached
- First import creates the object once
- Subsequent imports get the same reference
- Mutations in one module are visible in all

## Consequences

### Positive

- **Zero Setup**: Just import and use
- **No Boilerplate**: No action types, reducers, or creators
- **Clear Code**: Direct mutations are obvious
- **Easy Debugging**: Use browser dev tools to inspect state object directly
- **Fast Refactoring**: Change state shape anywhere, see errors immediately
- **Good IDE Support**: Autocomplete and type hints via JSDoc

### Negative

- **No Time Travel**: Can't undo/redo state changes
- **No Middleware**: Can't intercept state mutations (but not needed here)
- **Manual Validation**: No automatic state schema checking
- **No Official Logging**: Must manually log state changes (mitigated by logger.js)
- **Easy to Mutate Wrong**: Can accidentally mutate state without calling render

## Preventing Negative Consequences

### Risk: Forgetting to Re-render After State Change

**Solution**: Establish discipline + code review
- Document pattern: "Always call `renderActiveTimers()` after state changes"
- Code review: Check that render calls follow state mutations

Example pattern:
```javascript
// ✓ Correct
state.activeTimers[id] = newTimer;
await saveActiveStateToServer();
renderActiveTimers(); // Don't forget!

// ✗ Wrong
state.activeTimers[id] = newTimer;
await saveActiveStateToServer();
// Missing renderActiveTimers() call - UI won't update!
```

### Risk: Unintended State Mutations

**Solution**: Use Object.freeze() (optional)
```javascript
// In state.js - prevent accidental mutations
Object.freeze(state);

// Drawbacks:
// - Can't add new timer properties
// - Makes code more complex
// - Not worth it for this size app
```

**Current approach**: Trust developers to be careful (sufficient for small team)

### Risk: No State Validation

**Solution**: validateHistoricalEntries() function in server.cjs
- Server validates data structure before saving
- Prevents bad data from persisting
- Frontend can still have invalid state temporarily, server catches it

## Alternatives Considered

### Redux
- ✓ Predictable, time travel, middleware
- ✗ 15KB+ library, tons of boilerplate, overkill for 2,200 line app

### MobX
- ✓ Simple decorators, fine-grained reactivity
- ✗ Magic decorators confusing, still ~20KB library

### Zustand
- ✓ Small (~2KB), simple API
- ✗ Extra library for something ES6 already provides

### Context API + Hooks
- ✓ Built into React (but we don't use React)
- ✗ Not available in vanilla JavaScript

### EventEmitter Pattern
- ✓ Decoupled, observable pattern
- ✗ Event names are strings (hard to refactor), more boilerplate

### No Shared State (Props Only)
- ✓ Pure functions, easy to test
- ✗ Impossible with vanilla JS DOM - can't pass props to DOM elements

## Scaling Considerations

### If App Grows to 5,000+ Lines

Options:
1. **Keep singleton approach** - Still works fine
2. **Split state.js into modules** - Multiple export objects (api.js, ui.js, etc. have own state)
3. **Migrate to Zustand** - Add tiny library (~2KB), minimal refactor

### If Multiple Users

Options:
1. **Switch to real database** - Replace api.js, keep state.js structure
2. **Add sync layer** - Sync state with server, use Yjs or Automerge
3. **Migrate to React + Redux** - Full rewrite, but framework change anyway

Current code structure enables these paths because:
- State mutations are centralized (state.js)
- Server communication is isolated (api.js)
- UI is somewhat decoupled (ui.js imports and calls functions)

## Code Examples

### Creating New Timer
```javascript
// ✓ Correct pattern
const newId = generateUUID();
state.activeTimers[newId] = {
  project, task, startTime: new Date(),
  accumulatedMs: 0, isPaused: false, notes: ""
};
await saveActiveStateToServer();  // Persist
renderActiveTimers();             // Update UI
```

### Toggling Timer
```javascript
// ✓ Correct pattern with error handling
const timer = state.activeTimers[id];
const previousState = { isPaused: timer.isPaused, startTime: timer.startTime };

try {
  timer.isPaused = !timer.isPaused;
  if (timer.isPaused) {
    timer.accumulatedMs += Date.now() - timer.startTime;
    timer.startTime = null;
  } else {
    timer.startTime = new Date();
  }
  await saveActiveStateToServer();
  renderActiveTimers();
} catch (error) {
  // Rollback
  timer.isPaused = previousState.isPaused;
  timer.startTime = previousState.startTime;
  renderActiveTimers();
}
```

## Conclusion

ES6 module singleton is the right pattern for TimeTrackly's scale and scope. It provides sufficient structure without the complexity of Redux-like patterns. The codebase remains simple and approachable while still having clear separation between state and UI.

The pattern scales well up to ~5,000 lines of code, at which point a more sophisticated solution might become justified based on actual complexity observed.
