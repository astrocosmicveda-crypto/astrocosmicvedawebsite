# Firebase Firestore Setup Guide

This guide will help you set up Firebase Firestore to store user form submissions.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development) or "Start in production mode"
4. Select a location for your database (choose closest to your users)
5. Click "Enable"

## Step 3: Set Up Security Rules

1. Go to Firestore Database → Rules tab
2. For development/testing, use these rules (allows writes for storing submissions):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /kundli_submissions/{document} {
      // Allow writes to store submissions (needed for the app to work)
      // Allow reads only for duplicate checking (optional - can be false)
      allow read: if true;
      allow write: if true;
    }
  }
}
```

**⚠️ Important:** For production, you should restrict access. Example production rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /kundli_submissions/{document} {
      // Allow writes to store submissions
      // Disable reads from client (only allow from admin/backend)
      allow write: if true;
      allow read: if false; // Only allow reads from admin/backend
    }
  }
}
```

**Note:** The app needs `write` permission to store submissions. If you get "permission-denied" errors, make sure your rules allow writes.

## Step 4: Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app (if you haven't already)
5. Register your app with a nickname (e.g., "Kundli Website")
6. Copy the `firebaseConfig` object

## Step 5: Update Your Code

1. Open `index.html`
2. Find the `firebaseConfig` object (around line 108)
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 6: Test the Setup

1. Open your website
2. Submit a form with test data
3. Check the browser console for storage messages
4. Go to Firebase Console → Firestore Database
5. You should see a collection called `kundli_submissions` with your test data

## How It Works

- **Unique Key Generation**: Each submission is stored with a unique key based on:
  - Date of birth (YYYYMMDD)
  - Time of birth (HH-MM)
  - Place of birth (normalized)
  
- **Duplicate Detection**: If the same combination of date, time, and place is submitted again, it will be detected as a duplicate and not stored again.

- **Data Stored**: 
  - Full name
  - Date of birth
  - Time of birth
  - Place of birth
  - Language preference
  - Latitude/Longitude coordinates
  - Timestamp
  - Ascendant sign (from API result)

## Viewing Stored Data

1. Go to Firebase Console → Firestore Database
2. Click on the `kundli_submissions` collection
3. You'll see all stored submissions with their unique keys as document IDs

## Troubleshooting

### Common Errors:

1. **"Firestore not initialized"**: 
   - Make sure you've added the Firebase config to `index.html`
   - Check browser console for initialization errors
   - Ensure the Firebase SDK script loads before `script.js`

2. **"Permission denied" (400 error)**:
   - Go to Firestore Database → Rules tab
   - Make sure rules allow `write: if true` for `kundli_submissions` collection
   - Click "Publish" after updating rules
   - Wait a few seconds for rules to propagate

3. **"Failed to get document because the client is offline"**:
   - This is normal if you're offline or have connection issues
   - Firestore will automatically retry when connection is restored
   - The app handles this gracefully and won't block the user experience

4. **"Could not reach Cloud Firestore backend"**:
   - Check your internet connection
   - Verify Firestore is enabled in Firebase Console
   - Check if your project has exceeded free tier limits
   - Firestore will work in offline mode and sync when online

5. **No data appearing in Firestore**:
   - Check browser console for errors
   - Verify Firestore is enabled in Firebase Console
   - Check security rules allow writes
   - Look for "Data stored successfully" message in console

### Testing Connection:

1. Open browser console (F12)
2. Look for "Firebase initialized successfully" message
3. Submit a form and check for storage messages
4. If you see errors, check the error code:
   - `permission-denied`: Update security rules
   - `unavailable`: Network/connection issue (will retry automatically)
   - `not-found`: Collection doesn't exist (will be created automatically)

## Free Tier Limits

Firebase Firestore free tier includes:
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage

This should be sufficient for most small to medium websites.

