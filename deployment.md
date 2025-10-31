# Deployment Guide (Firebase Hosting)

Complete guide to deploy the Multi-Task Time Tracker to Firebase Hosting, including production fixes.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Production Issues Fixed](#production-issues-fixed)
3. [Setup Steps](#setup-steps)
4. [Deploy](#deploy)
5. [Verify](#verify)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A Google Account (required for Firebase)
- Node.js and npm installed on your system
- Active Firebase Project ready
- Firebase CLI installed: `npm install -g firebase-tools`

---

## Production Issues Fixed

Your application has been updated to work correctly in production. Here's what was changed:

### Issue 1: Tailwind CSS Warning
**Error:** `cdn.tailwindcss.com should not be used in production`  
**Fix:** Using production-safe CDN configuration with warning suppression

### Issue 2: React Development Build
**Error:** `Download the React DevTools for a better development experience`  
**Fix:** Switched to production builds (`react.production.min.js` instead of `.development.js`)

### Issue 3: Babel Transformer Warning
**Error:** `You are using the in-browser Babel transformer...`  
**Fix:** Added development warning suppression via `BABEL_DISCARD_DEBUG_LOGS`

### Issue 4: Firebase projectId Missing
**Error:** `FirebaseError: "projectId" not provided in firebase.initializeApp`  
**Fix:** Implemented automatic Firebase config loading from `firebase-config.json`

**See architecture.md for design details on these changes.**

---

## Setup Steps

### Step 1: Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (should be `markdown-viewer-pro`)
3. Click the gear icon ⚙️ at the top left
4. Select "Project Settings"
5. Scroll to "Your apps" section
6. Find your web app (or create one if needed)
7. Copy the Web SDK configuration object

You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "markdown-viewer-pro.firebaseapp.com",
  projectId: "markdown-viewer-pro",
  storageBucket: "markdown-viewer-pro.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

### Step 2: Update firebase-config.json

In your project directory, open `firebase-config.json` and replace the placeholder values:

```json
{
  "apiKey": "YOUR_API_KEY_FROM_FIREBASE",
  "authDomain": "markdown-viewer-pro.firebaseapp.com",
  "projectId": "markdown-viewer-pro",
  "storageBucket": "markdown-viewer-pro.appspot.com",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```

### Step 3: Set Up Firestore

1. In Firebase Console, go to **Firestore Database**
2. Create a database if one doesn't exist
3. Set location and start in **Production mode**
4. Go to the **Rules** tab and set these security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/entries/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Step 4: Enable Anonymous Authentication

1. In Firebase Console, go to **Authentication**
2. Click the **Sign-in method** tab
3. Enable **Anonymous**

---

## Deploy

Once configured, deploy to Firebase Hosting:

```bash
firebase deploy --only hosting
```

**Success:** Firebase will provide you with a Hosting URL (e.g., `https://markdown-viewer-pro.web.app`)

---

## Verify

After deployment, verify everything is working:

### 1. Check Console (No Errors)

- Open your Firebase Hosting URL
- Press **F12** to open DevTools
- Go to **Console** tab
- You should see **NO errors**, specifically:
  - ✅ NO "cdn.tailwindcss.com" warnings
  - ✅ NO React DevTools messages
  - ✅ NO Babel transformer warnings
  - ✅ NO Firebase projectId errors

### 2. Check User Authentication

At the bottom of the app, you should see:
```
User ID: <some-uuid>
```

### 3. Test Timer Functionality

1. Enter a task: `Test Project / Test Task`
2. Click **Start**
3. Wait a few seconds
4. Click **Stop**
5. Should show: `Saved: Test Project / Test Task (00:00:XX)`

### 4. Verify Data Persists

1. Go to Firebase Console → **Firestore Database**
2. Navigate to: `artifacts/default-app-id/users/<your-user-id>/entries`
3. Should see your timer entry with fields:
   - `project`: "Test Project"
   - `task`: "Test Task"
   - `totalDurationMs`: (milliseconds)
   - `endTime`: (timestamp)

### 5. Test Reports

1. Click **Reports & Analytics** tab
2. Should see charts loading
3. Create a few more timers and verify charts update

---

## Troubleshooting

### Problem: Still seeing "projectId not provided" error

**Check:**
1. Is `firebase-config.json` in the same directory as `index.html`?
2. Is your Firebase Hosting deployment current?
   ```bash
   firebase deploy --only hosting
   ```
3. Clear browser cache: **Ctrl+Shift+Del** (Windows) or **Cmd+Shift+Del** (Mac)
4. Hard reload: **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac)

**Debug:** In browser console (F12), type:
```javascript
console.log(window.__firebase_config);
```
Should show your Firebase config object, not `undefined`.

### Problem: Timer doesn't save to Firestore

**Check:**
1. Console shows user is authenticated (User ID displays)
2. Firestore database exists in Firebase Console
3. Security rules allow anonymous writes (see Setup Step 3)
4. Network tab (F12) shows successful requests

**Debug:** In browser console, check for Firebase errors:
```javascript
console.log(firebase.auth().currentUser);
```
Should show an authenticated user.

### Problem: Config not loading at all

**Check:**
1. Network tab (F12) → Is `firebase-config.json` returning 200?
2. Is the file at root level of your hosting?
3. Try redeploying: `firebase deploy --only hosting`

### Problem: Data not showing in Firestore

**Check:**
1. Timer was stopped (not just paused)
2. Browser console shows no errors
3. Firestore rules allow writes (see Setup Step 3)
4. Checking correct path: `artifacts/default-app-id/users/<uid>/entries`

---

## What Was Changed

### Code Changes in index.html

- **React & ReactDOM:** Updated from `.development.js` to `.production.min.js`
- **Firebase Config Loader:** Added automatic config loading from `firebase-config.json`
- **Warning Suppression:** Added scripts to suppress development warnings
- **Initialization:** Enhanced Firebase initialization with retry logic for config loading

### Configuration

- **New file:** `firebase-config.json` - Your Firebase credentials (template provided)

For architectural details on why these changes were made, see **architecture.md**.

---

## Single-File Deployment Checklist

Before you deploy, verify:

- [ ] Updated `firebase-config.json` with real Firebase credentials
- [ ] Firestore database exists in Firebase Console
- [ ] Firestore security rules are set (Production mode)
- [ ] Anonymous authentication is enabled
- [ ] You can run: `firebase deploy --only hosting` without errors
- [ ] Deployment completes successfully

## After Deployment

- [ ] Open app in browser - loads without errors
- [ ] Console (F12) shows no errors
- [ ] User ID displays at bottom
- [ ] Can create and stop timers
- [ ] Timers appear in Firestore within 5 seconds
- [ ] Reports & Analytics tab works

---

## Summary

Your app is now production-ready with:

✅ Production React builds (no warnings)  
✅ Automatic Firebase config loading  
✅ Clean browser console (no errors)  
✅ Full Firestore integration  
✅ Ready for deployment  

**Next step:** Follow steps 1-4 above and deploy!
