#!/bin/bash
# Quick Firebase Configuration Script
# Usage: bash setup-firebase-config.sh

echo "🔥 Firebase Configuration Setup"
echo "================================"
echo ""
echo "This script will help you find and configure your Firebase credentials."
echo ""
echo "Step 1: Go to Firebase Console"
echo "  → Visit: https://console.firebase.google.com/"
echo "  → Select your project (likely 'markdown-viewer-pro')"
echo "  → Click the gear icon ⚙️  at the top left"
echo "  → Select 'Project Settings'"
echo ""
echo "Step 2: Find your Web SDK configuration"
echo "  → Scroll down to 'Your apps' section"
echo "  → Find your web app (or create one if needed)"
echo "  → Copy the firebaseConfig object"
echo ""
echo "Step 3: Update firebase-config.json"
echo "  → Open firebase-config.json in your editor"
echo "  → Replace the placeholder values with your actual config:"
echo ""
echo "    {
      \"apiKey\": \"YOUR_API_KEY\",
      \"authDomain\": \"YOUR_AUTH_DOMAIN\",
      \"projectId\": \"YOUR_PROJECT_ID\",
      \"storageBucket\": \"YOUR_STORAGE_BUCKET\",
      \"messagingSenderId\": \"YOUR_MESSAGING_SENDER_ID\",
      \"appId\": \"YOUR_APP_ID\"
    }"
echo ""
echo "Step 4: Verify Firestore is enabled"
echo "  → In Firebase Console, go to 'Firestore Database'"
echo "  → Create a database if it doesn't exist"
echo "  → Set location and start in 'Production mode'"
echo ""
echo "Step 5: Set Firestore Security Rules"
echo "  → In Firestore, go to 'Rules' tab"
echo "  → Replace with these rules:"
echo ""
echo "    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /artifacts/{appId}/users/{userId}/entries/{document=**} {
          allow read, write: if request.auth.uid == userId;
        }
      }
    }"
echo ""
echo "Step 6: Deploy"
echo "  → Run: firebase deploy --only hosting"
echo ""
echo "Step 7: Test"
echo "  → Open your Firebase Hosting URL"
echo "  → Open DevTools (F12) and check the Console tab"
echo "  → Create and save a timer"
echo "  → Verify data appears in Firestore"
echo ""
echo "✅ Done!"
