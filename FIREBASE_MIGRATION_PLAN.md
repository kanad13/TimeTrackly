# TimeTrackly Firebase Migration Plan

## 1. Executive Summary

This document outlines the migration of TimeTrackly from a local-only, single-machine deployment to a **globally accessible online application using Firebase**. The key principle is **maintaining minimal code differences between deployment branches** to enable easy synchronization of future changes.

**Core Approach:**
- **Frontend:** Deploy to Firebase Hosting (global CDN)
- **Authentication:** Firebase Authentication (Google Sign-In)
- **Backend:** Cloud Run (Node.js server, same code as local)
- **Storage:** Cloud Storage (JSON files, same format as local)
- **Branch Strategy:** Maintain `main` (local) and `firebase` branches with ~95% code overlap

**Timeline Estimate:** 3-4 weeks for implementation (including testing and documentation)

---

## 2. Vision & Goals

### 2.1 Vision Statement
Enable TimeTrackly users to track time from anywhere, on any device, while maintaining the application's core philosophy of **simplicity, privacy, and maintainability**.

### 2.2 Goals

| Goal | Rationale |
|------|-----------|
| **Enable Mobile Access** | Users should be able to log time entries from phones/tablets anywhere |
| **Minimize Code Divergence** | Changes made to either branch (main/firebase) should be easily propagatable to the other |
| **Maintain Data Privacy** | User data is private; no unauthorized access should be possible |
| **Preserve Simplicity** | Don't introduce complex frameworks or patterns; keep the architecture as simple as the current one |
| **Zero Downtime Migration** | Users of local version should not be forced to migrate; both should coexist |
| **Cost Efficiency** | Deployment should be free or very low-cost (<$5/month) for personal/small team use |
| **Easy Maintenance** | One person should be able to maintain and update the application with minimal operational overhead |

---

## 3. Problem Statement

### Current State
- TimeTrackly is a **local-only application** (runs on a single machine via `localhost:13331`)
- Users cannot access it from mobile devices or other computers
- Data is stored locally on the user's machine (no cloud backup)
- No authentication (single-user assumption)
- Perfect for privacy, terrible for accessibility

### Business Problem
Users want to:
- Log time entries from their phones while away from their main computer
- Sync time entries across devices
- Have a web-accessible backup of their data
- Use the app without running a local server

### Why Firebase?
- **Integrated ecosystem:** Hosting, Auth, and backend runtime all in one place
- **Minimal code changes:** Can keep Node.js server nearly identical; only add file I/O for Cloud Storage
- **Google Sign-In:** Free, widely trusted authentication method
- **Global CDN:** Fast access from anywhere
- **Pricing:** Free tier covers most personal use cases
- **Operational simplicity:** No servers to manage, scale, or patch

---

## 4. Design Constraints

### 4.1 Architectural Constraints

| Constraint | Reason |
|-----------|--------|
| **Keep Node.js backend** | Preserve existing business logic; minimize code changes |
| **Keep JSON file format** | Maintain data portability; avoid database lock-in |
| **No Firestore** | Violates the "minimal code changes" principle |
| **Single-user per Firebase project** | Authentication is per-user; each user needs their own Cloud Storage bucket or isolated data |
| **No breaking changes to API** | Frontend `api.js` should work with both local and cloud versions |
| **Stateless backend** | Cloud Run requires stateless services; no local file access |

### 4.2 Technical Constraints

| Constraint | Implication |
|-----------|-------------|
| **Cloud Storage filesystem** | JSON files work, but no file locking (need to handle concurrency differently) |
| **Cloud Run max request timeout** | 60 minutes (shouldn't be an issue for time tracking) |
| **Firebase Auth token expiry** | Tokens expire; frontend must handle refresh |
| **Network dependency** | Firebase version requires internet; local version doesn't |
| **Cold start latency** | Cloud Run cold starts add ~1-2 seconds; subsequent requests are fast |

### 4.3 Operational Constraints

| Constraint | Implication |
|-----------|-------------|
| **Firebase CLI required** | Developers need `firebase-tools` installed to deploy |
| **Google account required** | Each user needs a Google account (for both Firebase project and Sign-In) |
| **Git branch discipline** | Must maintain separation between `main` and `firebase` branches |
| **Data migration is one-way** | Local data can migrate to Firebase, but not vice versa |

---

## 5. User Expectations

### 5.1 Desktop/Web Users

**Current Experience:**
- Start local server → App loads in browser → Full offline functionality

**Firebase Experience:**
- Sign in with Google → App loads from CDN → Full online functionality
- **Trade-off:** Requires internet; can't work offline

**Expected:** Experience should feel identical (same UI, same features, same speed)

### 5.2 Mobile Users

**Expected:**
- Visit TimeTrackly URL on phone → Sign in → Start tracking time
- UI should be responsive and touch-friendly (already is with Tailwind CSS)
- Should work on iOS, Android, all modern browsers

**Not Expected:**
- Native app (web app is sufficient)
- Offline mode on mobile (accept internet requirement)
- Perfect feature parity with desktop (acceptable if some edge cases differ)

### 5.3 Data Users

**Expected:**
- Their time tracking data is private (only they can see it)
- Data is backed up in the cloud
- Can export data at any time (CSV, JSON)
- Data persists across sessions and devices

**Not Expected:**
- Real-time multi-device sync (acceptable if 1-2 second delay)
- Ability to share data with others (not a goal in this phase)
- Integration with third-party services

### 5.4 Developer (You) Expectations

**Expected:**
- Make a change to business logic → Works in both `main` and `firebase` branches
- Minimal divergence between branches (ideally <5% different files)
- Easy to debug issues (same logs, similar error messages)
- Can rollback changes if needed

**Not Expected:**
- Learning new frameworks or paradigms
- Significant refactoring of existing code
- Managing complex DevOps infrastructure

---

## 6. Architecture Overview

### 6.1 Current Architecture (Main Branch)

```
┌─────────────────────────────────────┐
│  Browser (SPA)                      │
│  ├─ index.html                      │
│  ├─ js/app.js (entry point)         │
│  ├─ js/state.js (state mgmt)        │
│  ├─ js/api.js (HTTP client)         │
│  ├─ js/ui.js (DOM rendering)        │
│  └─ js/reports.js (charts)          │
└─────────────┬───────────────────────┘
              │ fetch() to localhost:13331
┌─────────────▼───────────────────────┐
│  Node.js Server (server.cjs)        │
│  ├─ GET /api/data                   │
│  ├─ POST /api/data                  │
│  ├─ GET /api/active-state           │
│  ├─ POST /api/active-state          │
│  └─ GET /api/health                 │
└─────────────┬───────────────────────┘
              │ file I/O (fs module)
┌─────────────▼───────────────────────┐
│  Local Filesystem                   │
│  ├─ mtt-data.json                   │
│  ├─ mtt-active-state.json           │
│  ├─ mtt-suggestions.json            │
│  └─ mtt-data.lock                   │
└─────────────────────────────────────┘
```

**Key Properties:**
- Single machine deployment
- No authentication
- Local data storage
- No cloud dependencies (except CDN fonts/icons)

### 6.2 Firebase Architecture (Firebase Branch)

```
┌──────────────────────────────────────────┐
│  User's Browser / Mobile Browser         │
│  ├─ Firebase App (SDK loaded)            │
│  ├─ Frontend code (same js/app.js, etc)  │
│  └─ Firebase Auth SDK                    │
└──────────────┬───────────────────────────┘
               │ GET index.html
┌──────────────▼───────────────────────────┐
│  Firebase Hosting (CDN)                  │
│  └─ Serves static files globally         │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Firebase Authentication                 │
│  └─ Handles Google Sign-In               │
│     Returns JWT token to frontend        │
└──────────────┬───────────────────────────┘
               │ Bearer token in requests
┌──────────────▼───────────────────────────┐
│  Cloud Run (Node.js server)              │
│  ├─ Same server.cjs code                 │
│  ├─ Verifies Firebase JWT tokens         │
│  ├─ GET /api/data                        │
│  ├─ POST /api/data                       │
│  └─ Uses Google Cloud libraries          │
└──────────────┬───────────────────────────┘
               │ @google-cloud/storage SDK
┌──────────────▼───────────────────────────┐
│  Google Cloud Storage (JSON files)       │
│  ├─ mtt-data.json                        │
│  ├─ mtt-active-state.json                │
│  ├─ mtt-suggestions.json                 │
│  └─ NO file locking needed               │
└──────────────────────────────────────────┘
```

**Key Properties:**
- Global CDN delivery
- Google Sign-In authentication
- Cloud-based data storage
- Requires internet connection
- Stateless backend (Cloud Run)

### 6.3 Architecture Comparison

| Layer | Main (Local) | Firebase |
|-------|---|---|
| **Frontend Hosting** | Node.js `http.Server` | Firebase Hosting (CDN) |
| **Authentication** | None (single-user) | Firebase Auth (Google Sign-In) |
| **Backend Runtime** | Node.js (local process) | Cloud Run (containerized) |
| **Data Storage** | Local filesystem (`fs` module) | Google Cloud Storage |
| **Data Format** | JSON files | Same JSON files (object storage) |
| **File Locking** | Custom lock mechanism | Not needed (Cloud Storage handles it) |
| **Network** | Localhost only | Global internet |
| **Concurrency Model** | Single machine | Multi-region, stateless |

---

## 7. Technical Details

### 7.1 Authentication Flow

#### Main Branch (No Auth)
```
User visits localhost:13331
  → index.html loads
  → app.js initializes
  → No login screen
  → Full access to all features
```

#### Firebase Branch (Google Auth)
```
User visits timetrackly.web.app
  → index.html loads
  → app.js checks Firebase Auth state
  → Not logged in? → Show login screen
  → User clicks "Sign in with Google"
  → Firebase handles OAuth flow
  → User sees login popup
  → User approves TimeTrackly access to Google account
  → Firebase returns JWT token
  → app.js stores token in memory
  → Frontend ready to use
  → Each API request includes Bearer token
```

### 7.2 API Communication Changes

#### Current API Calls (Main Branch)
```javascript
// In api.js
const response = await fetch('/api/data');
const data = await response.json();
```

#### Firebase API Calls (Firebase Branch)
```javascript
// In api.js (modified)
const token = await firebase.auth().currentUser.getIdToken();
const response = await fetch(`https://[CLOUD_RUN_URL]/api/data`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

**Key Changes:**
- Need to retrieve Firebase JWT token before each request
- Add `Authorization` header to all requests
- Update API base URL to Cloud Run endpoint
- Error handling for token expiry (auto-refresh)

### 7.3 Server-Side Changes (server.cjs)

#### Current File I/O (Main Branch)
```javascript
// In server.cjs
const fs = require('fs');
const data = fs.readFileSync('mtt-data.json', 'utf8');
```

#### Firebase File I/O (Firebase Branch)
```javascript
// In server.cjs (modified)
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);
const file = bucket.file('mtt-data.json');
const data = await file.download().then(contents => contents[0].toString());
```

**Key Changes:**
- Replace `fs` module with `@google-cloud/storage`
- All file operations become async (Promises)
- Authentication handled by Cloud Run environment (auto-detected)
- Remove file locking logic (Cloud Storage handles atomicity)

### 7.4 Data Storage Structure

**Local Branch (Main):**
```
TimeTrackly/
├── mtt-data.json              # JSON array of all time entries
├── mtt-active-state.json      # JSON object with currently running timers
└── mtt-suggestions.json       # JSON array of task suggestions
```

**Firebase Branch:**
```
Google Cloud Storage Bucket (gs://timetrackly-data-[userid])
├── mtt-data.json              # Same structure, same format
├── mtt-active-state.json      # Same structure, same format
└── mtt-suggestions.json       # Same structure, same format
```

**Data Format Changes: NONE.** The JSON structure stays identical.

### 7.5 Authentication Token Flow

```
Frontend                          Firebase Auth                Cloud Run
   │                                   │                            │
   ├─ User clicks "Sign In" ────────→  │                            │
   │                                   ├─ Google OAuth popup        │
   │                                   ├─ User approves             │
   │                                   ├─ Returns JWT token    ←────┤
   │                                   │                            │
   ├─ app.js calls getIdToken()        │                            │
   ├─ Get fresh JWT token        ←─────┤                            │
   │                                   │                            │
   ├─ fetch('/api/data', {             │                            │
   │   headers: {                       │                            │
   │     'Authorization': 'Bearer ...'  │                            │
   │   }                                │                            │
   │ })───────────────────────────────────────────────────────────→ │
   │                                   │    verifyIdToken(token)    │
   │                                   │    ✓ Valid? Get user ID    │
   │                                   │                            │
   │                                   │    Load data from bucket   │
   │  ← JSON response with data  ←─────────────────────────────────┤
```

**Token Lifecycle:**
- Token expires after 1 hour (Firebase default)
- `getIdToken()` automatically refreshes if needed
- No manual token management needed (Firebase SDK handles it)

### 7.6 File Changes Required

#### Files with Modifications

| File | Changes | Reason |
|------|---------|--------|
| `index.html` | Add Firebase SDK script tags | Initialize Firebase services |
| `js/app.js` | Add Firebase Auth initialization | Handle login/logout flow |
| `js/api.js` | Add Bearer token to requests | Authenticate API calls |
| `js/constants.js` | Update API base URL | Point to Cloud Run endpoint |
| `server.cjs` | Replace `fs` with Cloud Storage SDK | Access Cloud Storage files |
| `server.cjs` | Add JWT token verification middleware | Validate Firebase tokens |
| `package.json` | Add `@google-cloud/storage` dependency | Cloud Storage access |
| `.firebaserc` | Create Firebase project config | Define Firebase project |
| `firebase.json` | Create Firebase deployment config | Configure Firebase Hosting |

#### Files with NO Changes

| File | Why |
|------|-----|
| `js/state.js` | Pure business logic, no I/O |
| `js/ui.js` | DOM manipulation, no authentication |
| `js/reports.js` | Chart rendering, no API calls |
| `js/utils.js` | Helper functions, no I/O |
| `js/logger.js` | Logging utilities, unchanged |
| `tests/unit/*` | Unit tests don't depend on I/O |
| `tests/fixtures/*` | Test data unchanged |
| CSS/HTML structure | UI remains identical |

---

## 8. Implementation Phases

### Phase 1: Setup & Preparation (Week 1)

**Outcomes:**
- Firebase project created
- Local Firebase CLI working
- Firebase branch created from main

**Tasks:**
1. Create new Firebase project in Google Cloud Console
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Authenticate: `firebase login`
4. Create Google Cloud Storage bucket
5. Create `firebase` branch: `git checkout -b firebase`
6. Update `.gitignore` to exclude Firebase config files
7. Document current API endpoints and data flow

**Deliverables:**
- Firebase project ID (e.g., `timetrackly-abc123`)
- Cloud Storage bucket name
- Firebase CLI verified working
- `firebase` branch created and pushed

### Phase 2: Frontend Authentication (Week 1-2)

**Outcomes:**
- Google Sign-In working
- Login/logout UI functional
- JWT tokens being sent with API requests

**Tasks:**
1. Add Firebase SDK to `index.html`
2. Initialize Firebase in `app.js`
3. Create login screen UI component
4. Implement `signInWithGoogle()` function
5. Implement logout functionality
6. Modify `api.js` to retrieve and attach JWT tokens
7. Handle token expiry and refresh
8. Test login flow locally (use Firebase emulator)

**Key Code:**
```javascript
// app.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = { /* ... */ };
initializeApp(firebaseConfig);
const auth = getAuth();
```

**Testing:**
- Manual testing: Click "Sign In with Google"
- Verify token is added to requests
- Test login/logout cycle
- Test page refresh (session should persist)

### Phase 3: Backend Migration (Week 2)

**Outcomes:**
- Cloud Storage reads/writes working
- Server running on Cloud Run
- Token verification middleware implemented

**Tasks:**
1. Install Cloud Storage SDK: `npm install @google-cloud/storage`
2. Create abstraction layer for file I/O (separate from business logic)
3. Replace `fs.readFile` with Cloud Storage reads
4. Replace `fs.writeFile` with Cloud Storage writes
5. Remove file locking logic
6. Add JWT verification middleware to `server.cjs`
7. Update API endpoints to use Cloud Storage
8. Add error handling for Cloud Storage failures
9. Test locally with Cloud Storage emulator

**Key Changes:**
```javascript
// server.cjs - File I/O abstraction
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({ projectId: process.env.GCP_PROJECT });
const bucket = storage.bucket(process.env.BUCKET_NAME);

async function readFile(filename) {
  const file = bucket.file(filename);
  const contents = await file.download();
  return contents[0].toString();
}

async function writeFile(filename, data) {
  const file = bucket.file(filename);
  await file.save(JSON.stringify(data, null, 2));
}
```

**Testing:**
- Unit tests for file I/O functions
- Integration tests with Cloud Storage emulator
- Verify data persistence
- Test concurrent writes (Cloud Storage handles this)

### Phase 4: Cloud Run Deployment (Week 2-3)

**Outcomes:**
- Node.js server running on Cloud Run
- Frontend can communicate with Cloud Run backend
- Authentication chain working end-to-end

**Tasks:**
1. Create `Dockerfile` for Node.js server
2. Build and test Docker image locally
3. Push image to Google Container Registry (or Cloud Build)
4. Deploy to Cloud Run
5. Configure Cloud Run service account permissions
6. Update `js/constants.js` with Cloud Run URL
7. Test API calls from frontend to Cloud Run
8. Verify authentication works end-to-end

**Key Configuration:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY server.cjs .
EXPOSE 8080
CMD ["node", "server.cjs"]
```

**Testing:**
- Test API endpoints via curl
- Test with Firebase auth token
- Verify error handling
- Monitor Cloud Run logs

### Phase 5: Firebase Hosting Deployment (Week 3)

**Outcomes:**
- Frontend deployed globally on Firebase Hosting
- Full app accessible from anywhere
- All features working end-to-end

**Tasks:**
1. Initialize Firebase Hosting: `firebase init hosting`
2. Configure `firebase.json` with build output directory
3. Update API base URL to Cloud Run endpoint
4. Build frontend (if needed)
5. Deploy to Firebase Hosting: `firebase deploy`
6. Test on desktop and mobile browsers
7. Verify Google Sign-In flow
8. Verify API calls work
9. Test data persistence
10. Performance monitoring

**Deployment Command:**
```bash
firebase deploy
```

**Testing:**
- Visit deployed URL on desktop
- Visit deployed URL on mobile
- Complete signup flow
- Create/edit/delete time entries
- Check responsive design
- Verify data persists across sessions

### Phase 6: Data Migration (Week 3-4)

**Outcomes:**
- Existing local data migrated to Cloud Storage
- Users can seamlessly transition from local to Firebase version

**Tasks:**
1. Create data migration script (one-time utility)
2. Export current `mtt-*.json` files
3. Upload to Cloud Storage
4. Verify data integrity
5. Create user documentation for migration
6. Test migration script multiple times
7. Plan rollback procedure

**Migration Script:**
```javascript
// migrate-to-firebase.js
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

async function migrate() {
  const storage = new Storage({ projectId: process.env.GCP_PROJECT });
  const bucket = storage.bucket(process.env.BUCKET_NAME);

  const files = ['mtt-data.json', 'mtt-active-state.json', 'mtt-suggestions.json'];

  for (const file of files) {
    const data = fs.readFileSync(file, 'utf8');
    await bucket.file(file).save(data);
    console.log(`Migrated ${file}`);
  }
}
```

### Phase 7: Testing & Documentation (Week 4)

**Outcomes:**
- All features verified working
- Documentation complete
- Both branches in sync
- Ready for production use

**Tasks:**
1. End-to-end testing (desktop + mobile)
2. Stress testing (rapid updates, concurrent users)
3. Security testing (token expiry, invalid tokens)
4. Performance testing (latency, cold starts)
5. Update README with Firebase instructions
6. Create deployment guide
7. Create troubleshooting guide
8. Update architecture documentation
9. Create runbook for maintenance tasks
10. Sync any changes back to `main` branch

**Testing Checklist:**
- [ ] User can sign in with Google
- [ ] Time entries persist after logout/login
- [ ] Reports display correctly
- [ ] Export functionality works
- [ ] Mobile UI is responsive
- [ ] API errors are handled gracefully
- [ ] Cold starts are acceptable (<3 seconds)
- [ ] No data loss on failures
- [ ] Firebase Auth tokens refresh properly
- [ ] Cross-device sync works (if applicable)

---

## 9. Branch Strategy & Sync Approach

### 9.1 Branch Architecture

```
main (Local Deployment)
├─ No Firebase dependencies
├─ Uses localhost:13331
├─ Single-user (no auth)
├─ Local JSON files
└─ Can run offline

firebase (Firebase Deployment)
├─ Firebase SDK integration
├─ Uses Cloud Run backend
├─ Google Sign-In required
├─ Cloud Storage for data
└─ Requires internet
```

### 9.2 Code Overlap Strategy

**Target:** ≥95% code similarity between branches

**Identical Files (95%+):**
- All `js/*.js` files (except minimal token handling)
- `tests/**/*`
- `index.html` (except SDK script tags)
- CSS and styling
- Documentation

**Different Files (<5%):**
- `server.cjs` (file I/O and auth verification)
- `js/api.js` (token retrieval)
- `js/app.js` (login/logout UI)
- `package.json` (dependencies)
- `.firebaserc`, `firebase.json`

### 9.3 Change Synchronization Workflow

#### Scenario 1: Bug Fix on Main Branch
```
1. Fix bug on main
2. Commit and test thoroughly
3. Cherry-pick commit to firebase branch
   git cherry-pick <commit-hash>
4. Verify fix works on firebase (may need adjustments)
5. Merge if applicable, or leave as separate commit
```

#### Scenario 2: Feature Addition on Main Branch
```
1. Add feature to main (e.g., new report type)
2. Verify feature works with file-based storage
3. Cherry-pick to firebase
4. Test with Cloud Storage backend
5. May need minor adjustments (async/await differences)
```

#### Scenario 3: Bug Fix on Firebase Branch
```
1. Fix bug on firebase (e.g., auth token handling)
2. If applicable to main, cherry-pick to main
3. If firebase-specific, document why it's not needed on main
```

#### Scenario 4: New Dependency
```
1. Add dependency to package.json
2. Update both branches
3. Ensure compatibility with both file systems
4. Test on both local and firebase
```

### 9.4 Merge vs. Cherry-Pick Strategy

| Scenario | Approach | Reason |
|----------|----------|--------|
| Bug fix affecting both | Cherry-pick | Keeps linear history, easy to track |
| New feature | Cherry-pick then test | Allows for firebase-specific adjustments |
| Large refactor | Manual merge/rebase | Requires careful testing on both branches |
| Infrastructure change | Separate commits | Different requirements per branch |

### 9.5 Regular Sync Process (Weekly)

**Checklist:**
- [ ] Check if any commits were made to `main` that should go to `firebase`
- [ ] Check if any commits were made to `firebase` that should go to `main`
- [ ] Test both branches after syncing
- [ ] Update CHANGELOG noting which changes were synced
- [ ] Verify no conflicts or issues

**Command:**
```bash
# On firebase branch:
git log main --oneline -n 20  # See recent main commits

# For each commit that should be on firebase:
git cherry-pick <commit-hash>

# Similarly from firebase to main (if applicable):
git checkout main
git cherry-pick firebase/<commit-hash>
```

---

## 10. What Can Change, What Cannot

### 10.1 Code That CANNOT Change (Locked)

| Item | Why | Impact |
|------|-----|--------|
| **Data Model** | Both branches use identical JSON format | Changing structure breaks both |
| **API Contract** | Frontend expects specific endpoint responses | Change breaks one or both versions |
| **State Management** | `state.js` is pure business logic | Changes affect both branches |
| **UI/UX** | Must stay identical for consistency | Changes apply to both branches |
| **Timer Logic** | Core timer calculations must be identical | Divergence causes data inconsistency |
| **File Names** | `mtt-data.json`, etc. are hardcoded | Changing names breaks both branches |

### 10.2 Code That CAN Change (Flexible)

| Item | Main Only | Firebase Only | Both |
|------|-----------|---------------|------|
| **Storage Backend** | Local filesystem | Cloud Storage | ✓ Different implementations |
| **Authentication** | None | Firebase Auth | ✓ Different implementations |
| **Server Runtime** | Local process | Cloud Run | ✓ Same code, different hosting |
| **Frontend Hosting** | Node.js server | Firebase Hosting | ✓ Different CDN strategies |
| **Deployment Process** | `npm start` | `firebase deploy` | ✓ Different tooling |
| **Error Messages** | Filesystem errors | Cloud Storage errors | ✓ Context-specific |
| **Performance Optimization** | Local-specific | Cloud-specific | ✓ Different approaches |

### 10.3 Change Impact Matrix

```
┌─────────────────────────┬───────────┬──────────┬──────────┐
│ Change Type             │ Main Only │ Firebase │ Breaking │
├─────────────────────────┼───────────┼──────────┼──────────┤
│ Bug fix (pure JS)       │ YES       │ YES      │ NO       │
│ New feature (pure JS)   │ YES       │ YES      │ NO       │
│ UI improvement          │ YES       │ YES      │ NO       │
│ Refactor state logic    │ YES       │ YES      │ NO       │
│ Change data structure   │ NO        │ NO       │ YES      │
│ Change API response     │ NO        │ NO       │ YES      │
│ Storage backend change  │ YES*      │ YES*     │ NO**     │
│ Auth method change      │ NO        │ YES      │ NO       │
│ Update npm dependency   │ YES       │ YES      │ NO       │
└─────────────────────────┴───────────┴──────────┴──────────┘

* Different implementations, both branches must be updated
** Not breaking if abstraction is maintained
```

---

## 11. Maintenance & Operations

### 11.1 Ongoing Responsibilities

| Task | Frequency | Owner | Effort |
|------|-----------|-------|--------|
| **Monitor Cloud Run logs** | Weekly | Developer | 10 min |
| **Check Firebase quotas** | Monthly | Developer | 5 min |
| **Update npm dependencies** | Monthly | Developer | 30 min |
| **Backup data** | Monthly | Developer | 5 min |
| **Test both branches** | Monthly | Developer | 30 min |
| **Sync changes between branches** | As-needed | Developer | 15-30 min |
| **Respond to bugs** | As-needed | Developer | Variable |
| **Review Firebase billing** | Monthly | Developer | 5 min |

### 11.2 Monitoring Strategy

#### Cloud Run Metrics to Monitor
```
1. Request latency (p50, p99)
   Goal: <500ms for normal requests
   Alert: >2 seconds for 5+ minutes

2. Error rate (4xx, 5xx)
   Goal: <0.1%
   Alert: >1% for 5+ minutes

3. Cold start latency
   Goal: Track and optimize
   Alert: >5 seconds

4. CPU/Memory usage
   Goal: <50% utilization
   Alert: >80% sustained
```

#### Firebase Hosting Metrics
```
1. Cache hit rate
   Goal: >80%
   Alert: <60%

2. Page load time
   Goal: <2 seconds
   Alert: >5 seconds

3. 4xx/5xx errors
   Goal: <0.1%
```

#### Firebase Auth Metrics
```
1. Sign-in success rate
   Goal: >99%
   Alert: <95%

2. Token refresh failures
   Goal: <0.1%
```

### 11.3 Backup Strategy

**What to Backup:**
- User data in Cloud Storage (all `mtt-*.json` files)
- Firebase Auth user list (optional but recommended)
- Application code (already in Git)

**Backup Schedule:**
```
Daily:  Automated Cloud Storage versioning
Weekly: Manual export of user data to local storage
Monthly: Verify backup integrity
```

**Backup Script:**
```bash
#!/bin/bash
# backup-firebase.sh

BUCKET_NAME="timetrackly-data-prod"
BACKUP_DIR="backups/$(date +%Y-%m-%d)"

mkdir -p $BACKUP_DIR

gsutil -m cp -r gs://$BUCKET_NAME/* $BACKUP_DIR/

echo "Backup complete: $BACKUP_DIR"
```

### 11.4 Common Maintenance Tasks

#### Task: Update npm Dependencies
```bash
# Test on both branches
git checkout firebase
npm update
npm audit fix
npm test
git commit -am "chore: update dependencies"

git checkout main
npm update
npm audit fix
npm test
git commit -am "chore: update dependencies"
```

#### Task: Deploy New Version
```bash
# 1. Test locally on main
git checkout main
npm start
# ... manual testing ...

# 2. Deploy firebase
git checkout firebase
npm run build  # if needed
firebase deploy

# 3. Verify deployment
curl https://[PROJECT].web.app/api/health
```

#### Task: Rollback Deployment
```bash
# Firebase Hosting rollback
firebase hosting:channels:list
firebase hosting:disable [CHANNEL_ID]

# Or redeploy previous version
git checkout <previous-commit>
firebase deploy
```

#### Task: View Logs
```bash
# Cloud Run logs
gcloud run logs read [SERVICE_NAME]

# Firebase Auth logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=[SERVICE_NAME]"
```

---

## 12. Deployment Checklist

### Pre-Deployment (Development)

- [ ] All tests passing on both branches
- [ ] Code reviewed and approved
- [ ] No secrets in code (API keys, tokens)
- [ ] Environment variables documented
- [ ] Performance acceptable (latency <1 second)
- [ ] Security verified (no unauth access)
- [ ] Error handling tested
- [ ] Database/storage accessible

### Deployment (Firebase)

- [ ] Build succeeds without errors
- [ ] Staging tests pass
- [ ] Health check endpoint responds
- [ ] API endpoints responding correctly
- [ ] Authentication flow working
- [ ] Data persisting correctly
- [ ] No excessive errors in logs
- [ ] Performance acceptable

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Test core user workflows
- [ ] Check error rates <1%
- [ ] Verify cold starts <3 seconds
- [ ] Confirm data integrity
- [ ] Update status/changelog
- [ ] Notify users if applicable

---

## 13. Rollback Strategy

### 13.1 Quick Rollback Process

**If deployment causes critical issues:**

```bash
# Step 1: Identify the issue
gcloud run logs read [SERVICE_NAME] --limit=50

# Step 2: Rollback Firebase Hosting
firebase hosting:channel:deploy [PREVIOUS_CHANNEL]

# Step 3: Rollback Cloud Run (redeploy previous image)
git checkout <previous-commit>
gcloud builds submit --tag gcr.io/[PROJECT]/timetrackly-server
gcloud run deploy timetrackly-server \
  --image gcr.io/[PROJECT]/timetrackly-server \
  --platform managed \
  --region us-central1

# Step 4: Verify
curl https://[PROJECT].web.app/api/health
```

### 13.2 Rollback Triggers

| Issue | Severity | Action |
|-------|----------|--------|
| App won't load | Critical | Rollback immediately |
| Authentication broken | Critical | Rollback immediately |
| Data corruption | Critical | Rollback + restore backup |
| API returns 500 errors | High | Rollback within 5 minutes |
| Performance degraded (>5s) | Medium | Investigate, then decide |
| Minor UI bug | Low | Deploy fix, don't rollback |

---

## 14. Risk Assessment & Mitigation

### 14.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Data Loss** | Low | Critical | Daily backups, Cloud Storage versioning |
| **Auth Token Expiry** | Medium | High | Implement auto-refresh in frontend |
| **Cloud Run Cold Starts** | Medium | Medium | Keep Cloud Run warm (daily requests) |
| **Storage Quota Exceeded** | Low | High | Set billing alerts, monitor usage |
| **Concurrent Write Conflicts** | Low | Medium | Cloud Storage handles atomicity; document behavior |
| **Network Outage** | Low | High | UI shows "offline" message gracefully |
| **Malicious JWT Token** | Low | Critical | Firebase handles token verification |
| **Code Divergence** | High | Medium | Regular sync process, code review |

### 14.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Deployment Failure** | Medium | High | Automated tests, staging environment |
| **Billing Surprise** | Low | Medium | Set billing alerts ($10/month max) |
| **Secret Exposure** | Low | Critical | Never commit secrets; use env vars |
| **Dependency Breaking Change** | Medium | Medium | Lock dependency versions, regular updates |
| **Firebase Console Misconfiguration** | Medium | High | Document all settings, use Infrastructure-as-Code |
| **User Data Privacy Breach** | Low | Critical | Encrypt data in transit, ensure HTTPS, regular audits |

### 14.3 Mitigation Plans

**For Data Loss:**
- Enable Cloud Storage versioning
- Automated daily backups to separate storage
- Monthly backup verification

**For Auth Failures:**
- Test token refresh cycle monthly
- Monitor auth error rates
- Maintain alternative auth fallback (if possible)

**For Cold Starts:**
- Configure Cloud Run minimum instances (1)
- Implement health check that warms service
- Document cold start behavior in UI

**For Code Divergence:**
- Weekly sync review
- Code review checklist for branch-specific changes
- Automated tests on both branches before merge

---

## 15. Future Considerations

### 15.1 Potential Future Enhancements

| Feature | Effort | Priority | Branch |
|---------|--------|----------|--------|
| **Offline sync** | High | Medium | Firebase |
| **Multi-user support** | High | Low | Both |
| **Mobile app (native)** | High | Low | Both |
| **API for integrations** | Medium | Low | Both |
| **Data export/import UI** | Low | Medium | Both |
| **Dark mode** | Low | Medium | Both |
| **Time entry tags** | Medium | Medium | Both |
| **Recurring entries** | Medium | Low | Both |
| **Team analytics** | High | Low | Firebase only |
| **Real-time sync across devices** | High | Medium | Firebase |

### 15.2 Possible Architecture Changes

#### Change: Add Firestore
**When:** If data becomes complex or needs querying capabilities
**Impact:** Would require significant refactor; breaks "minimal divergence" goal
**Recommendation:** Not recommended; stick with JSON files unless data model fundamentally changes

#### Change: Add Cloud Functions
**When:** If backend logic becomes complex
**Impact:** Could replace parts of Cloud Run, reduce costs
**Recommendation:** Only if performance requires it; adds complexity

#### Change: Add CDN Caching
**When:** If Cloud Run cold starts become problematic
**Impact:** Adds Cloud CDN layer, increases cost slightly
**Recommendation:** Do this before adding Cloud Functions

#### Change: Move to PostgreSQL
**When:** If multi-user features are added
**Impact:** Massive refactor; incompatible with JSON file strategy
**Recommendation:** Only if fundamentally changing app from single-user to multi-user

### 15.3 Deprecation Path

If main branch is deprecated in favor of Firebase:

```
Year 1: Both branches maintained and in sync
Year 2: Main branch marked deprecated; limited support
Year 3: Main branch archived; Firebase is primary deployment
```

---

## 16. Documentation Requirements

### 16.1 Developer Documentation

**Must Create:**
- [ ] Firebase Setup Guide (step-by-step)
- [ ] Architecture Decision Record (ADR) for Firebase choice
- [ ] Data Migration Guide
- [ ] API Endpoint Documentation (updated for Cloud Run)
- [ ] Change Sync Process Documentation
- [ ] Deployment Runbook
- [ ] Troubleshooting Guide
- [ ] Firebase Configuration Reference

**Update Existing:**
- [ ] README.md (add Firebase instructions)
- [ ] Architecture documentation
- [ ] Contributing guidelines (mention branch strategy)

### 16.2 User Documentation

**Must Create:**
- [ ] Getting Started with Firebase Version
- [ ] Google Sign-In Help
- [ ] Data Migration Guide for Users
- [ ] Troubleshooting Common Issues
- [ ] Privacy Policy (updated for cloud storage)
- [ ] Terms of Service (if applicable)

---

## 17. Decision Log

### Decision 1: Firebase vs. Other Cloud Providers
**Decision:** Use Firebase (specifically Firebase Hosting + Cloud Run + Cloud Storage)
**Rationale:**
- Integrated ecosystem (no multi-vendor complexity)
- Firebase Auth built-in (cheaper than alternatives)
- Generous free tier for personal use
- Easy scaling without infrastructure management
- Good documentation and community support

**Alternatives Considered:**
- AWS (more complex, steeper learning curve)
- Azure (similar to AWS)
- Heroku + separate auth (more expensive)
- Self-hosted VPS (operational overhead)

**Decision Date:** 2025-11-09

---

### Decision 2: Keep JSON Files vs. Migrate to Firestore
**Decision:** Keep JSON files; use Cloud Storage for storage backend
**Rationale:**
- Minimal code changes between branches
- Data portability (can easily move to other backends)
- Simple data model doesn't need relational database features
- Reduces Firebase lock-in
- Easier for developers to understand and debug

**Alternatives Considered:**
- Migrate to Firestore (would break "minimal divergence" goal)
- Use Cloud Datastore (deprecated, not recommended)
- Use SQL database (overkill for this use case)

**Decision Date:** 2025-11-09

---

### Decision 3: Two Branches vs. Feature Flags
**Decision:** Maintain two separate branches (main and firebase) with feature flags for divergences
**Rationale:**
- Clearer separation of concerns
- Easier for developers new to the project
- Reduces cognitive load
- Simpler testing (no feature flag combinations)
- Can independently optimize each branch

**Alternatives Considered:**
- Single branch with feature flags (would add complexity)
- Three branches (main, firebase, experimental) (over-engineering)

**Decision Date:** 2025-11-09

---

### Decision 4: Cloud Run vs. App Engine
**Decision:** Use Cloud Run
**Rationale:**
- Supports any language (not just Python/Node)
- Containerized approach (better for future migrations)
- Lower cost for low-traffic apps
- Scales to zero (cheaper than App Engine)
- Can run any Node.js app with minimal changes

**Alternatives Considered:**
- App Engine Standard (limited Node versions)
- Cloud Functions (more limited, not suitable for stateful server)
- Kubernetes (overkill for this app)

**Decision Date:** 2025-11-09

---

### Decision 5: Authentication Method
**Decision:** Firebase Auth with Google Sign-In
**Rationale:**
- Free (included in Firebase)
- Most users already have Google account
- Eliminates password management complexity
- Secure by default
- Easy to extend to other providers later (Facebook, GitHub, etc.)

**Alternatives Considered:**
- Custom JWT auth (more development work, higher risk)
- Email/password auth (requires password reset flows, higher support burden)
- OAuth with third-party (would still need Firebase Auth for other providers)

**Decision Date:** 2025-11-09

---

## 18. Conclusion

This Firebase migration represents a **strategic evolution** of TimeTrackly from a local-only tool to a globally accessible application, while maintaining the **simplicity, maintainability, and code clarity** that are core to the project.

The approach of keeping **two minimal-divergence branches** enables:
- ✅ Parallel operation of both deployment types
- ✅ Easy synchronization of changes
- ✅ Flexible future decisions (can always switch to Firestore, for example)
- ✅ Low operational overhead
- ✅ Cost efficiency
- ✅ Privacy-respecting architecture (user data in their Cloud Storage bucket)

**Success looks like:** A user starting from their desktop with the local version, later accessing the same app and data from their phone, all without encountering any architectural differences or surprises.

---

## Appendix: Quick Reference

### Firebase Project Setup Command
```bash
firebase init --project=timetrackly-[userid]
firebase deploy
```

### Environment Variables Needed
```
GCP_PROJECT=timetrackly-[userid]
BUCKET_NAME=timetrackly-data-[userid]
CLOUD_RUN_URL=https://timetrackly-[userid].run.app
FIREBASE_API_KEY=[from Firebase Console]
FIREBASE_AUTH_DOMAIN=[from Firebase Console]
```

### Useful Firebase CLI Commands
```bash
firebase projects:list          # List all projects
firebase deploy                 # Deploy all (hosting + functions if present)
firebase hosting:channel:list   # View deployment channels
firebase functions:log          # View Cloud Function logs
firebase auth:export users.json # Export user list
firebase emulators:start        # Start local emulator suite
```

### Useful gcloud Commands
```bash
gcloud run logs read [SERVICE_NAME]                    # View logs
gcloud run services describe [SERVICE_NAME]            # Service details
gcloud storage ls gs://[BUCKET_NAME]                   # List bucket contents
gcloud storage cp gs://[BUCKET_NAME]/file.json ./     # Download file
gcloud storage cp ./file.json gs://[BUCKET_NAME]/     # Upload file
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-09
**Status:** Draft (Ready for Review)
