# Migration Plan: From Firebase to Google Sheets

## 1. Objective

This document outlines the strategic plan for migrating the Multi-Task Time Tracker (MTTT) application's backend from Google Cloud Firestore to a user-owned Google Sheet. The goal is to give the user full ownership and visibility of their data while preserving the seamless, single-file web application experience.

## 2. Guiding Principles

- **Preserve Single-File Architecture:** The entire application must remain within a single `index.html` file.
- **Maintain Seamless UX:** Data saving and loading for reports should happen automatically in the background via API calls, without requiring manual user intervention like saving a file.
- **Ensure User Data Ownership:** The user's time-tracking data must be written to and read from a Google Sheet specified by them.
- **Implement Explicit User Consent:** The application must use the standard Google OAuth 2.0 flow to gain one-time permission to access the user's spreadsheet.

## 3. User Pre-Requisites & Setup

This is the manual setup the user must perform _before_ the application code can function. The updated `index.html` will require the outputs from these steps.

1.  **Google Cloud Project:** Ensure you have a Google Cloud project.
2.  **Enable APIs:** In your Google Cloud project's "APIs & Services" dashboard, enable the **Google Sheets API** and the **Google Drive API**.
3.  **Configure OAuth Consent Screen:**
    - Go to "APIs & Services" -> "OAuth consent screen".
    - Choose **External** user type.
    - Fill in the required app name, user support email, and developer contact information.
    - On the "Scopes" page, add the scope: `https://www.googleapis.com/auth/spreadsheets`.
    - Add your email address as a Test User.
4.  **Create API Credentials:**
    - Go to "APIs & Services" -> "Credentials".
    - Click "Create Credentials" -> **API Key**. Copy this key and save it.
    - Click "Create Credentials" -> **OAuth client ID**.
      - Application type: **Web application**.
      - Add your hosting URL (e.g., `https://your-project-id.web.app`) and `http://localhost` to the "Authorized JavaScript origins".
      - Copy the **Client ID** and save it.
5.  **Create the Google Sheet:**
    - Create a new, blank Google Sheet in your Google Drive.
    - In the first row (the header), create the following columns: `project`, `task`, `totalDurationMs`, `durationSeconds`, `endTime`. The order must be exactly this.
    - Find and copy the **Spreadsheet ID** from the URL (e.g., `https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit`).

## 4. Execution Plan: Code & Document Updates

### Task 1: Update `index.html`

The core logic of the application will be rewritten to use Google's APIs instead of Firebase's.

- **[DELETE]** Remove all Firebase-related script imports (`firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`).
- **[ADD]** Add the Google API Client Library script tag to the `<head>`:
  ```html
  <script
  	async
  	defer
  	src="https://apis.google.com/js/api.js"
  	onload="gapiLoaded()"></script>
  <script
  	async
  	defer
  	src="https://accounts.google.com/gsi/client"
  	onload="gisLoaded()"></script>
  ```
- **[REPLACE]** Replace the global Firebase configuration variables with new variables for the Google API.
  - `const appId`, `firebaseConfig`, `initialAuthToken` are no longer needed.
  - Add placeholders for user-provided credentials:
    ```javascript
    const API_KEY = "YOUR_API_KEY_HERE"; // From Step 3.4
    const CLIENT_ID = "YOUR_CLIENT_ID_HERE"; // From Step 3.4
    const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // From Step 3.5
    const DISCOVERY_DOC =
    	"https://sheets.googleapis.com/$discovery/rest?version=v4";
    const SCOPES = "https://www.googleapis.com/auth/spreadsheets";
    ```
- **[REWRITE]** Implement Google Authentication Flow.
  - The `initFirebase` function will be replaced by a new initialization flow (`gapiLoaded`, `gisLoaded`, `gapi.client.init`, etc.).
  - Anonymous sign-in will be replaced by an explicit "Sign In with Google" button that appears on load. The main app functionality will be disabled until the user is authenticated.
  - Store the access token returned by the OAuth flow for subsequent API calls.
- **[REWRITE]** Replace Firestore functions with Google Sheets API calls.
  - **Saving Data (`stopTimer`):** The `addDoc` call will be replaced by a `gapi.client.sheets.spreadsheets.values.append` request. The `newEntry` object must be converted into an array of values matching the header order in the Sheet: `[newEntry.project, newEntry.task, ...]`.
  - **Fetching Data (`renderReportsView`, `fetchRecentActivities`):** The `getDocs` call will be replaced by a `gapi.client.sheets.spreadsheets.values.get` request. The returned 2D array of values must be parsed back into an array of entry objects for processing by the charting and suggestion logic.

### Task 2: Update `architecture.md`

Reflect the fundamental change in the persistence layer.

- **Section 1.2 (Data Persistence and Security):**
  - Change "Technology" from "Google Cloud Firestore" to "**Google Sheets API**".
  - Replace the "Security Path" with a description of the OAuth 2.0 scope (`.../auth/spreadsheets`).
  - Update the "Data Model" table to reflect the columns in the Google Sheet. Note that `Timestamp` will now be an ISO 8601 string.
  - Update "Data Fetch for Reports" to describe the `spreadsheets.values.get` API call.
- **Section 3 (AI Agent Development Roadmap):**
  - Add a new, completed task at the top:
    | Priority | Task | Agent Focus & Requirements |
    | :--- | :--- | :--- |
    | ~~P0~~ | ~~Migrate Backend to Google Sheets~~ | **COMPLETED.** Replaced Firestore with the Google Sheets API for user-owned data persistence. Updated auth to Google OAuth 2.0. |

### Task 3: Update `deployment.md`

The deployment process remains similar, but the setup and security context change significantly.

- **Rename File:** Rename `deployment.md` to `setup-and-deployment.md`.
- **New "Setup" Section:** Add a new "Project Setup" section at the top that details the steps from Section 3 of this migration plan (Enable APIs, Configure OAuth, Create Sheet). This makes the guide self-contained for new users.
- **Update "Deployment" Section:** The `firebase deploy` command is still valid for hosting.
- **Update "Security Note":** The original note is now incorrect. Replace it with a new note explaining that security is managed via the Google OAuth 2.0 Consent Screen and that the hosting URL must be added to the "Authorized JavaScript origins" in the Google Cloud credential settings.

### Task 4: Update `readme.md`

Ensure the project overview is accurate.

- **Section 2 (Stack & Deployment):**
  - Update the "Backend" row in the technology table from "Google Cloud Firestore" to "**Google Sheets**".
  - Update the "Deployment" row's role to clarify the need for OAuth configuration.
- **Section 3 (Getting Started):**
  - Update this section to point to the newly renamed `setup-and-deployment.md` as the primary guide.
