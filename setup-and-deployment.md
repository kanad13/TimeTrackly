# Deployment Guide (Firebase Hosting)

- This guide details how to securely deploy the Multi-Task Time Tracker (MTTT) using Firebase Hosting and ensure the connection to your Firestore database

## 1. Prerequisites

- A Google Account (required for Firebase)
- Node.js and npm installed on your system
- Firebase Project: You must have an active Firebase project ready

## 2. Install and Log In to Firebase CLI

- Open your terminal or command prompt and run the following commands:
- **Install the Firebase CLI:**
  - `npm install -g firebase-tools`
- **Log in to Firebase:**
  - `firebase login`
  - This will open a browser window to authenticate your Google account

## 3. Prepare Your Local Project

- **Create a Project Folder:**
  - `mkdir mttt-tracker`
  - `cd mttt-tracker`
- **Save the Code:** Place the `index.html` file (from this repository) directly inside the `mttt-tracker` folder
- **Initialize Firebase:**
  - `firebase init`
  - Follow the prompts:
    - Which features do you want to set up? Select Hosting
    - Please select an option: Choose "Use an existing project" and select your project from the list
    - What do you want to use as your public directory? Type `.` (a single dot)
      - This tells Firebase to serve files from the current directory
    - Configure as a single-page app (rewrite all urls to `/index.html`)? Type N (No)
    - Set up automatic builds and deploys with GitHub? (Optional, but recommended for advanced use)

## 4. Deploy the Application

- Once initialization is complete and your `index.html` is in the root directory, you can deploy the app:
  - `firebase deploy --only hosting`
- **Success:**
  - Firebase will provide you with a Hosting URL (e.g., `https://[your-project-id].web.app`)
- **Security Note:** Your application is now served securely over HTTPS and is automatically connected to your Firebase project, allowing it to use the environment-provided credentials (`**app_id`, `**firebase_config`, etc.) for Firestore access
