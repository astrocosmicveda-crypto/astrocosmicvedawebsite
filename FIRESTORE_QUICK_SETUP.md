# Quick Firestore Setup Guide

## Step 1: Create Firestore Database

1. **Go to Firebase Console**: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore

2. **If you see "Create database" button:**
   - Click "Create database"
   - Choose **"Start in test mode"** (for now - we'll add rules after)
   - Select a **location** (choose closest to your users, e.g., `us-central1` or `asia-south1`)
   - Click "Enable"
   - Wait for database to be created (takes 30-60 seconds)

3. **If you already see "Firestore Database" in the sidebar:**
   - Database is already created, skip to Step 2

## Step 2: Set Up Security Rules

1. **Go to Rules tab**: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore/rules

2. **Replace the default rules with this:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /kundli_submissions/{document} {
      // Allow writes to store form submissions
      allow read, write: if true;
    }
  }
}
```

3. **Click "Publish"** button (top right)

4. **Wait 10-20 seconds** for rules to propagate

## Step 3: Verify Setup

1. Go to: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore/data
2. You should see an empty database
3. After submitting a form on your website, you should see a collection called `kundli_submissions` appear

## That's It!

Once the database is created and rules are published, your website will be able to store form submissions.

## Troubleshooting

- **"Create database" button not showing**: Make sure you're in the correct Firebase project (`astrocosmicveda-2d8d9`)
- **Rules not saving**: Make sure you clicked "Publish" after editing
- **Still getting errors**: Wait 30 seconds after publishing rules, then refresh your website

