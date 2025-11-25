# Admin Account Setup Guide

**Date:** October 27, 2025  
**Status:** Complete  
**Purpose:** Instructions for creating your admin account manually in Firebase

---

## 🎯 Overview

Your fitness platform now uses a **two-collection architecture** where admin accounts are stored separately from client accounts. This guide will walk you through creating your admin account **one time** in Firebase Console.

---

## 🏗️ Architecture

### **Two-Collection Structure:**

```
Firestore:
├─ admins/              ← Your admin account (protected)
│  └─ {yourUID}/
│     ├─ name: "Your Name"
│     ├─ email: "your@email.com"
│     ├─ role: "admin"
│     └─ accountActivated: true
│
└─ users/               ← Client accounts (can delete during testing)
   ├─ client1/
   ├─ client2/
   └─ client3/
```

### **Benefits:**
- ✅ Admin account is separate and protected
- ✅ Can delete entire `users` collection during testing
- ✅ Your admin account never gets accidentally deleted
- ✅ Clear separation of concerns

---

## 📋 One-Time Setup Instructions

### **Step 1: Create Account in Firebase Authentication**

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com
   - Select your project: `shreyfitweb`

2. **Navigate to Authentication:**
   - Click **"Authentication"** in left sidebar
   - Click **"Users"** tab
   - Click **"Add user"** button

3. **Enter Your Credentials:**
   ```
   Email: your@email.com (your choice)
   Password: YourSecurePassword123! (your choice)
   ```

4. **Create User:**
   - Click **"Add user"**
   - **IMPORTANT:** Copy the UID shown (looks like: `abc123xyz456`)
   - You'll need this UID in the next step!

---

### **Step 2: Create Admin Document in Firestore**

1. **Navigate to Firestore Database:**
   - Click **"Firestore Database"** in left sidebar
   - Click **"Data"** tab

2. **Find or Create `admins` Collection:**
   - Look for **"admins"** collection
   - If it doesn't exist, you'll create it in the next step

3. **Add Your Admin Document:**
   - Click **"Add document"** (or **"Start collection"** if admins doesn't exist)
   - If creating new collection, enter: `admins`
   
4. **Fill in Document Details:**
   ```
   Document ID: [Paste the UID from Step 1]
   
   Field 1:
   - Field: name
   - Type: string
   - Value: Your Name
   
   Field 2:
   - Field: email
   - Type: string
   - Value: your@email.com (same as Step 1)
   
   Field 3:
   - Field: role
   - Type: string
   - Value: admin
   
   Field 4:
   - Field: accountActivated
   - Type: boolean
   - Value: true
   
   Field 5:
   - Field: phone
   - Type: string
   - Value: (leave empty or add your phone)
   
   Field 6:
   - Field: createdAt
   - Type: timestamp
   - Value: (use current date/time)
   
   Field 7:
   - Field: emailVerified
   - Type: boolean
   - Value: false
   
   Field 8:
   - Field: createdBy
   - Type: string
   - Value: manual_setup
   ```

5. **Save the Document:**
   - Click **"Save"**
   - Your admin account is now created!

---

## ✅ Verification

### **Test Your Admin Account:**

1. **Go to Your App:**
   ```
   http://localhost:3000/login
   ```

2. **Login with Your Credentials:**
   ```
   Email: your@email.com
   Password: YourSecurePassword123!
   ```

3. **Verify Redirect:**
   - Should redirect to: `/dashboard/trainer`
   - You should see the trainer dashboard
   - Sidebar should show all trainer features

4. **Check Account Settings:**
   - Click **"Account Settings"** in sidebar footer
   - Should see:
     - ✅ Your name
     - ✅ Your email
     - ✅ Role: admin
     - ✅ Can update profile
     - ✅ Can change email/password

---

## 🔒 Security Features

### **What's Protected:**

✅ **Admin collection is read-only**
- Only you can read your own admin document
- No one can write to admins collection (manually managed only)

✅ **Auth logic checks both collections**
- Checks `admins/` first
- Falls back to `users/` for clients
- Proper role-based routing

✅ **Account settings works for both**
- Detects which collection you're in
- Updates the correct collection
- Email/password changes work properly

---

## 🧪 Testing During Development

### **Safe Testing Workflow:**

1. **Create Test Clients:**
   - Use regular signup flow at `/signup`
   - These go into `users/` collection

2. **Test Features:**
   - Test client signup
   - Test payment flow
   - Test dashboard features

3. **Clean Up:**
   - Go to Firestore Console
   - Delete entire `users/` collection
   - Your admin account in `admins/` is unaffected!

4. **Repeat:**
   - Create new test clients
   - Test again
   - Delete again
   - Admin always safe!

---

## 📝 Daily Usage

### **Your Workflow:**

```
1. Go to: http://localhost:3000/login
2. Login with your admin credentials
3. Use trainer dashboard
4. That's it!
```

### **No More:**
- ❌ Admin signup page
- ❌ Password in browser
- ❌ Manual Firestore edits (after initial setup)
- ❌ Worrying about deleting your account

---

## 🔄 Future: Adding More Trainers

If you ever need to add more trainers in the future:

### **Option 1: Manual (Current Approach)**
- Repeat this setup process
- Create in Authentication
- Create in `users/` collection (with role: "trainer")

### **Option 2: Build Admin UI (Future Enhancement)**
- Create admin-only page at `/admin/trainers`
- Must be logged in as admin
- UI to create trainer accounts
- Proper authentication-based security

---

## 🆘 Troubleshooting

### **Problem: Can't login after creating account**

**Solution:**
1. Verify UID matches in both places:
   - Firebase Auth UID
   - Firestore document ID
2. Check Firestore document has `role: "admin"`
3. Check email matches exactly

---

### **Problem: Redirected to client dashboard instead of trainer**

**Solution:**
1. Check Firestore document:
   - Should be in `admins/` collection
   - Field `role` should be "admin" or "trainer"
2. If in wrong collection, delete and recreate

---

### **Problem: Account settings not saving**

**Solution:**
1. Check browser console for errors
2. Verify Firestore rules are deployed:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Check you're logged in

---

## 📊 What Changed

### **Before (Insecure):**
```
❌ Admin signup page with password in browser
❌ Password visible in DevTools
❌ URL easy to guess (/admin/signup)
❌ Anyone could create trainers
❌ One collection for everyone
```

### **After (Secure):**
```
✅ Manual admin creation (one time)
✅ No password in browser
✅ No admin signup page needed
✅ Proper authentication required
✅ Separate collections (admins vs users)
✅ Safe testing (delete users, keep admin)
```

---

## 🎯 Summary

**What you need to do:**
1. Create ONE admin account manually (this guide)
2. Login at `/login`
3. Use the system normally

**What you don't need anymore:**
- ❌ Admin signup page
- ❌ Special passwords
- ❌ Worrying about security

**Benefits:**
- ✅ Clean, simple, secure
- ✅ Industry standard approach
- ✅ Safe testing workflow
- ✅ Professional authentication

---

## 📚 Related Documentation

- [Auth Context Implementation](./auth-context-implementation.md)
- [Firestore Security Rules](../../firestore.rules)
- [Account Settings Implementation](./admin-and-settings-implementation.md)

---

## ✅ Checklist

Before you're done:

- [ ] Created account in Firebase Authentication
- [ ] Copied the UID
- [ ] Created admin document in Firestore `admins/` collection
- [ ] Document ID matches UID
- [ ] All required fields added
- [ ] Tested login at `/login`
- [ ] Verified redirected to trainer dashboard
- [ ] Checked account settings work
- [ ] Saved your credentials securely!

---

**You're all set!** 🎉

Your admin account is now properly set up, secure, and ready to use!
