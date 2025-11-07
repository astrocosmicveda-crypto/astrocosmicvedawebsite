# Firestore Connection Diagnostics

## Quick Fix Checklist

### 1. Verify Firestore is Enabled
1. Go to: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore
2. Make sure you see "Firestore Database" in the left sidebar
3. If you see "Create database" button, click it and create the database

### 2. Check Security Rules (MOST COMMON ISSUE)
1. Go to: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore/rules
2. Make sure your rules look like this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /kundli_submissions/{document} {
      allow read, write: if true;
    }
  }
}
```

3. Click "Publish" button
4. Wait 10-20 seconds for rules to propagate

### 3. Check Browser Console
Open browser console (F12) and look for:
- ✅ "Firebase initialized successfully"
- ✅ "Firestore network enabled"
- ❌ Any error codes (permission-denied, unavailable, etc.)

### 4. Test Connection
After updating rules, refresh the page and:
1. Submit a form
2. Check console for detailed error messages
3. Look for error codes in the console

## Error Code Meanings

- **400 Bad Request**: Usually means security rules are blocking or Firestore not enabled
- **permission-denied**: Security rules need to allow writes
- **unavailable**: Network/connection issue (but you have internet, so likely rules)
- **failed-precondition**: Firestore not properly initialized

## Direct Links

- **Firestore Console**: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore
- **Security Rules**: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore/rules
- **Project Settings**: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/settings/general

## Still Not Working?

1. Check if Firestore is in "test mode" or "production mode"
2. Verify the project ID matches: `astrocosmicveda-2d8d9`
3. Check if billing is enabled (not required for free tier, but some features need it)
4. Try in incognito mode to rule out browser cache issues
5. Check browser network tab for the actual 400 error response

