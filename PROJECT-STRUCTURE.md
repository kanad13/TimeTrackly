# Time Tracker - Project Structure

This document describes the organization of the Time Tracker project.

## Directory Structure

```
time-tracker/
├── docs/                      # Documentation
│   ├── readme.md             # Main documentation
│   ├── architecture.md       # Architecture and design decisions
│   └── setup.md              # Setup instructions
├── js/                        # Frontend JavaScript modules
│   ├── app.js                # Application initialization
│   ├── api.js                # Server communication
│   ├── constants.js          # Application constants
│   ├── reports.js            # Reports and analytics
│   ├── state.js              # State management
│   ├── ui.js                 # UI rendering and controls
│   └── utils.js              # Utility functions
├── tests/                     # Test files
│   ├── test-complete-suite.js # Comprehensive test suite
│   └── old/                  # Legacy test files
│       └── test-features.js  # Original feature tests
├── screenshots/              # Test screenshots
├── node_modules/             # Dependencies (not in git)
├── index.html                # Main HTML file
├── server.js                 # Node.js backend server
├── package.json              # Project configuration
├── TESTING.md                # Testing guidelines
├── mtt-data.json             # Historical time entries
├── mtt-active-state.json     # Active timer state
└── mtt-suggestions.json      # Input suggestions
```

## File Purposes

### Documentation (`docs/`)

- **readme.md**: User-facing documentation explaining features, usage, and stack
- **architecture.md**: Technical documentation for developers and AI agents
- **setup.md**: Installation and setup instructions

### Frontend Code (`js/`)

All frontend code is organized into ES6 modules:

- **app.js**: Entry point, initializes the application
- **state.js**: Manages application state and timer calculations
- **api.js**: Handles all server communication
- **ui.js**: DOM manipulation and user interaction handlers
- **reports.js**: Chart generation and analytics
- **utils.js**: Shared utility functions
- **constants.js**: Configuration and constants

### Backend Code

- **server.js**: Node.js server handling data persistence and API endpoints

### Tests (`tests/`)

- **test-complete-suite.js**: Main test suite covering all features
- **old/**: Archive of legacy test files
- **TESTING.md**: Comprehensive testing guide (in root)

### Data Files

- **mtt-data.json**: Stores completed time entries
- **mtt-active-state.json**: Stores running/paused timers
- **mtt-suggestions.json**: User-editable input suggestions

### Configuration

- **package.json**: NPM configuration, dependencies, scripts
- **index.html**: Single-page application entry point

### Generated Files

- **screenshots/**: Test screenshots (git-ignored)
- **node_modules/**: NPM dependencies (git-ignored)

## Best Practices

### Adding New Features

1. **Frontend Logic**: Add new modules to `js/` directory
2. **Backend Logic**: Extend `server.js` or create new modules
3. **Documentation**: Update `docs/architecture.md` with design decisions
4. **Tests**: Add test cases to `tests/test-complete-suite.js`
5. **User Docs**: Update `docs/readme.md` with user-facing changes

### File Naming Conventions

- **JavaScript modules**: lowercase with hyphens (e.g., `timer-utils.js`)
- **Documentation**: lowercase with hyphens (e.g., `setup-guide.md`)
- **Test files**: prefix with `test-` (e.g., `test-ui-changes.js`)
- **Data files**: lowercase with hyphens, `.json` extension

### Import Guidelines

Always use relative imports in ES6 modules:

```javascript
// ✅ Good
import { state } from "./state.js";
import { saveData } from "./api.js";

// ❌ Bad (won't work in browser)
import { state } from "state";
```

### Test Organization

- **Comprehensive tests**: `tests/test-complete-suite.js`
- **Feature-specific tests**: `tests/test-{feature-name}.js`
- **Legacy tests**: Move to `tests/old/` with explanation

## Migration Notes

### Recent Changes

The project structure was reorganized on 2025-10-31:

- Moved documentation files to `docs/`
- Created dedicated `tests/` directory
- Archived old test files in `tests/old/`
- Added `TESTING.md` guide
- Created this structure documentation

### Path Updates Required

If you have local scripts or references to the old paths:

- `readme.md` → `docs/readme.md`
- `architecture.md` → `docs/architecture.md`
- `setup.md` → `docs/setup.md`
- `test-features.js` → `tests/old/test-features.js`

The `package.json` and server paths remain unchanged.

## Quick Links

- [Setup Instructions](docs/setup.md)
- [User Guide](readme.md)
- [Architecture Guide](docs/architecture.md)
- [Testing Guide](TESTING.md)
