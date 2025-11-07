# ADR-002: Use JSON Files for Storage Instead of a Database

**Status:** ACCEPTED
**Date:** 2024-10-20
**Affected Component:** Backend (server.cjs, data persistence)

## Context

TimeTrackly needs to persist user data (time entries, active timers, suggestions). The team evaluated using a database versus simple JSON files.

### Storage Option Evaluation

| Consideration | Database (SQLite/Postgres) | JSON Files |
|---|---|---|
| Setup Complexity | Medium | Trivial |
| Query Capability | Powerful | Simple filtering in JS |
| Concurrent Access | Built-in | Manual locking |
| Data Integrity | ACID guarantees | Custom logic needed |
| Backup/Migration | Database dumps | File copy |
| Single User | Overkill | Perfect fit |
| Offline-First | Requires sync layer | Works natively |
| Dependencies | SQLite/Postgres client | None (built-ins only) |

## Decision

**Use JSON files for data storage.**

Three files are persisted:
- `mtt-data.json` - Historical time entries
- `mtt-active-state.json` - Currently running timers
- `mtt-suggestions.json` - User task suggestions

## Rationale

1. **Single User App**: TimeTrackly is personal software for one user. Database overhead is unnecessary.

2. **No Dependencies**: Using only Node.js built-in `fs` module. No npm packages required for storage.

3. **Offline-First**: Files live on local disk. Complete privacy - no external services, no cloud sync needed.

4. **Simple Backup**: Backup is literally copying JSON files. Easy to understand and implement.

5. **Easy Version Control**: Can store in git for history (when data size is small).

6. **Debuggability**: JSON is human-readable. Can inspect data directly in text editor.

7. **Portability**: JSON files are platform-independent. Same code works on Windows/Mac/Linux.

## File Structures

### mtt-data.json - Historical Entries

```json
[
  {
    "project": "string",
    "task": "string",
    "totalDurationMs": number,
    "durationSeconds": number,
    "endTime": "ISO timestamp",
    "createdAt": "ISO timestamp",
    "notes": "string"
  }
]
```

### mtt-active-state.json - Running Timers

```json
{
  "uuid-1": {
    "project": "string",
    "task": "string",
    "startTime": "ISO timestamp or null",
    "accumulatedMs": number,
    "isPaused": boolean,
    "notes": "string"
  }
}
```

### mtt-suggestions.json - Task Suggestions

```json
[
  "Project / Task",
  "Another Project / Task"
]
```

## Consequences

### Positive

- No database installation or configuration
- Perfect privacy (data never leaves user's computer)
- Files can be manually edited or backed up easily
- Easy to understand what's happening
- No version migration complexity
- Single-file backups are trivial

### Negative

- No built-in query language (must filter in JavaScript)
- No concurrent write safety (must implement manually)
- No ACID transactions (must implement atomic writes manually)
- Limited scalability (works for thousands of entries, not millions)
- Manual data validation required

## Mitigation Strategies

### For Concurrent Access
- **Solution**: Simple file locking using lock file (`mtt-data.lock`)
- **Trade-off**: Sufficient for single-user app, not production-grade

### For Data Integrity
- **Solution**: Atomic writes using temp file + rename pattern
- **Trade-off**: Prevents corruption on crash, sufficient for reliability

### For Data Validation
- **Solution**: Schema validation on server (validateHistoricalEntries)
- **Trade-off**: Manual validation sufficient for current constraints

## Operational Concerns

### Backup Strategy

Users should:
1. Manually backup JSON files to safe location
2. Keep data files under version control (if paranoid)
3. Export CSV periodically (via app export feature)

### Storage Limits

- **Current typical data**: ~100KB-500KB
- **Before performance issues**: ~10-50MB (10 years of data)
- **Theoretical limit**: Storage space available on disk

### Data Recovery

If data file corrupts:
1. Restore from backup
2. Manual JSON repair
3. Rebuild from CSV export

## Scaling Consideration

**Migration path if storage needs grow:**

1. **First 1,000 entries (~100KB)**: JSON files are perfect
2. **At 10,000 entries (~1MB)**: Still JSON, but consider exports for archive
3. **At 100,000 entries (~10MB)**: Consider SQLite
4. **At 1,000,000+ entries**: Migrate to proper database

Current code could transition to SQLite by:
- Keeping api.js interface the same
- Replacing file I/O with database queries
- Minimal changes to frontend code

## Alternatives Considered

### SQLite
- ✓ No external service, queries, ACID
- ✗ Still overkill, more complex setup, harder to debug

### PostgreSQL/MySQL
- ✓ Powerful, scalable
- ✗ Requires server, backup complexity, overkill for single user

### IndexedDB (Browser Storage)
- ✓ Works offline, no server needed
- ✗ Limited storage (~10MB per site), complex API, not portable to other devices

### Cloud Storage (Firebase/AWS)
- ✓ Automatic backup, accessible anywhere
- ✗ Privacy concerns, requires account, sync complexity, internet dependency

## Conclusion

JSON file storage is the right choice for a personal, offline-first time tracking application. It provides simplicity, privacy, and sufficient capability for the use case. The architecture allows migration to a more sophisticated storage layer if needed in the future.
