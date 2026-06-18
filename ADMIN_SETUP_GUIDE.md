# Admin Users Setup Guide

## Overview

This guide explains how to set up and seed admin/test users in Firestore for the HonestyStore management system.

## User Fields

All users in the `users` collection have the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Authentication UID (auto-generated) |
| `email` | string | User email address (unique) |
| `name` | string | User's full name |
| `role` | enum | User role: `admin`, `faculty`, `kiosk`, `user` |
| `department` | string | Optional department name |
| `phoneNumber` | string | Optional phone number |
| `rfidUid` | string | Optional RFID card UID |
| `photoURL` | string | Optional profile photo URL |
| `isActive` | boolean | Whether account is active |
| `createdAt` | Timestamp | Account creation timestamp |
| `updatedAt` | Timestamp | Last update timestamp |
| `lastLogin` | Timestamp | Last login timestamp |

## Quick Start

### 1. Add Your Admin Users

Edit `src/firebase/seeds/admin-seed.ts` and add your real users to the `ADMIN_USERS` array:

```typescript
const ADMIN_USERS: AdminSeedData[] = [
  {
    email: 'your-email@ndkc.edu.ph',
    password: 'YourSecurePassword123!',
    name: 'Your Name',
    role: 'admin',
    department: 'Your Department',
    phoneNumber: '(088) 555-0123',
  },
  // Add more users as needed
];
```

### 2. Seed Users to Firestore

In your browser console:

```javascript
import { seedAdminUsers, printTestCredentials } from '@/firebase/seeds/admin-seed'

// Create users from your configured list
await seedAdminUsers()

// Print configured users
printTestCredentials()
```

### 3. Test Login Credentials

After seeding, use your configured email and password to login.

**Available Roles:**
- `admin` - Full administrative access
- `faculty` - Faculty member access
- `kiosk` - RFID terminal access  
- `user` - Standard user access

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `honestystore-46dad`
3. Navigate to **Firestore Database**
4. Look for collection: `users`
5. You should see the seeded user accounts with all fields populated

## User Roles

### Admin Role
- Full access to all management features
- Can manage users, products, orders
- Can view analytics and reports
- Can modify system settings

### Faculty Role
- Can view products and make purchases
- Can track personal debt
- Limited to personal data

### Kiosk Role
- RFID transaction terminal
- Limited UI, focused on quick transactions
- Cannot access administrative features

### User Role
- Standard user with basic access
- Can view products and make purchases
- Limited system features

## Firestore Collection Schema

```javascript
// Collection: users
{
  "uid": "firebase-uid-string",
  "email": "user@ndkc.edu.ph",
  "name": "User Full Name",
  "role": "admin|faculty|kiosk|user",
  "department": "Department Name",
  "phoneNumber": "+63-88-555-0123",
  "rfidUid": "optional-rfid-uid",
  "photoURL": "https://example.com/photo.jpg",
  "isActive": true,
  "createdAt": Timestamp(2024, 1),
  "updatedAt": Timestamp(2024, 1),
  "lastLogin": Timestamp(2024, 1)
}
```

## Creating Users Programmatically

You can create users using the AuthService:

```typescript
import { AuthService } from '@/firebase/services/auth.service'

const newUser = await AuthService.createUser(
  'newuser@ndkc.edu.ph',
  'SecurePassword123!',
  {
    name: 'New User',
    role: 'faculty',
    department: 'CAS - Sciences',
    phoneNumber: '(088) 555-0150',
  }
)
```

## Login Flow

1. User enters email and password on LoginPage
2. AuthService.signIn() is called
3. Firebase authenticates the credentials
4. User data is fetched from Firestore
5. Account active status is verified
6. Last login timestamp is updated
7. User is redirected to dashboard

## API Methods

### AuthService

```typescript
// Sign in user
const user = await AuthService.signIn(email, password)

// Create new user (admin only)
const newUser = await AuthService.createUser(email, password, userData)

// Get user data from Firestore
const userData = await AuthService.getUserData(uid)

// Send password reset email
await AuthService.sendPasswordReset(email)

// Update user password
await AuthService.updateUserPassword(newPassword)

// Sign out
await AuthService.signOut()
```

### useFirebaseAuth Hook

```typescript
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'

const { user, userData, loading, error } = useFirebaseAuth()

// user: Firebase Auth user (email, uid, etc)
// userData: User data from Firestore (role, department, etc)
// loading: Whether auth state is being checked
// error: Any authentication errors
```

## Troubleshooting

### Users can't log in
1. Verify user document exists in Firestore `users` collection
2. Check that `email` field matches exactly
3. Verify `isActive` is set to `true`
4. Check browser console for specific error message

### Seeding fails with "email-already-in-use"
- The test email already exists in Firebase Auth
- Use a different email or delete the existing user from Firebase Console first

### User fields not showing correctly
1. Verify all required fields are set in Firestore
2. Check timestamps are Firestore Timestamp objects, not JavaScript Date
3. Ensure role is one of: `admin`, `faculty`, `kiosk`, `user`

### Last login not updating
- Check Firestore write permissions in security rules
- Verify user has permission to update their own document

## Security Considerations

### Firestore Rules

Implement these security rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read their own data
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if request.auth.uid == uid;
      
      // Only admins can update other users
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

### Best Practices

✅ Use strong passwords (8+ characters, mixed case, numbers, symbols)
✅ Verify email addresses are unique
✅ Regularly audit user accounts
✅ Deactivate unused accounts instead of deleting
✅ Set proper Firestore security rules
✅ Use email verification for new users
✅ Implement rate limiting for failed login attempts

## Next Steps

- [ ] Set up Firestore security rules
- [ ] Implement email verification
- [ ] Add password reset functionality
- [ ] Set up user management panel
- [ ] Implement role-based access control
- [ ] Add audit logging for user actions
- [ ] Set up backup and recovery procedures

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify Firestore connection status
3. Review Firebase documentation: https://firebase.google.com/docs
4. Check code in `src/firebase/services/auth.service.ts`
