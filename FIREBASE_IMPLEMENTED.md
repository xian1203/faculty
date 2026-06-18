# Firebase Implementation Guide

Firebase has been successfully integrated into your HonestyStore application!

## ✅ What's Been Implemented

### 1. Firebase Configuration
- **File**: `src/firebase/config.ts`
- **Project**: honestystore-46dad
- **Services**: Authentication + Firestore
- **Features**: Offline persistence enabled

### 2. Firebase Services

#### Authentication Service (`src/firebase/services/auth.service.ts`)
- Sign in with email/password
- Sign out
- Create users
- Get user data
- Password reset
- Role checking (admin, faculty, etc.)

#### User Service (`src/firebase/services/user.service.ts`)
- CRUD operations for users
- Filter by role and active status
- Search by email, RFID
- Activate/deactivate users

#### Product Service (`src/firebase/services/product.service.ts`)
- CRUD operations for products
- Stock management
- Low stock alerts
- Product search

#### Order Service (`src/firebase/services/order.service.ts`)
- Create orders with auto-generated IDs
- Stock validation and deduction
- Cancel orders with stock restoration
- Order history and filtering

#### Analytics Service (`src/firebase/services/analytics.service.ts`)
- Daily analytics generation
- Dashboard summaries
- Top products tracking
- Analytics range queries

#### Real-time Services
- `realtime-user.service.ts` - Live user updates
- `realtime-product.service.ts` - Live product/inventory updates  
- `realtime-order.service.ts` - Live transaction updates
- `realtime-analytics.service.ts` - Live analytics data

### 3. Security Rules
- **File**: `firestore.rules`
- Role-based access control (admin, faculty, kiosk, user)
- Admin-only write access to products, analytics
- User-scoped read access to orders and debts
- Activity logs append-only

### 4. Database Indexes
- **File**: `firestore.indexes.json`
- Optimized queries for orders, products, users
- Composite indexes for filtering and sorting

### 5. Login Integration
- **File**: `src/app/components/LoginPage.tsx`
- Real Firebase email/password authentication
- Error handling for common Firebase auth errors
- Automatic navigation after successful login

## 🚀 Getting Started

### Step 1: Deploy Firestore Rules and Indexes

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Step 2: Create Your First Admin User

You have two options:

#### Option A: Use the Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `honestystore-46dad`
3. Navigate to **Authentication** → **Users** → **Add user**
4. Create user with email and password
5. Go to **Firestore Database** → **users** collection
6. Add a document with the user's UID:
   ```json
   {
     "uid": "USER_UID_FROM_AUTH",
     "email": "admin@ndkc.edu.ph",
     "displayName": "Admin User",
     "role": "admin",
     "isActive": true,
     "createdAt": "2024-01-01T00:00:00.000Z",
     "updatedAt": "2024-01-01T00:00:00.000Z"
   }
   ```

#### Option B: Use the Test Script
1. Open browser console on your app
2. Import and run:
   ```javascript
   import { createTestAdmin } from './src/firebase/test-connection';
   createTestAdmin('admin@ndkc.edu.ph', 'your-secure-password');
   ```

### Step 3: Test the Connection

Run the connection tests:

```javascript
import { runAllTests } from './src/firebase/test-connection';
runAllTests();
```

## 📚 Usage Examples

### Authentication

```typescript
import { AuthService } from './firebase';

// Sign in
const user = await AuthService.signIn('email@example.com', 'password');

// Sign out
await AuthService.signOut();

// Check if user is admin
const isAdmin = await AuthService.isAdmin();
```

### Real-time Data

```typescript
import { RealtimeProductService } from './firebase';

// Subscribe to products
const unsubscribe = RealtimeProductService.subscribeToProducts((products) => {
  console.log('Products updated:', products);
});

// Unsubscribe when done
unsubscribe();
```

### CRUD Operations

```typescript
import { ProductService } from './firebase';

// Create product
await ProductService.createProduct({
  name: 'Coffee',
  sku: 'RFID-CF-001',
  price: 45,
  stock: 100,
  category: 'Beverages',
  isActive: true
});

// Get all products
const products = await ProductService.getProducts();

// Update stock
await ProductService.updateStock('productId', 50);
```

## 🔐 Default Test Credentials

After creating your admin user, you can log in with:
- **Email**: admin@ndkc.edu.ph (or whatever email you used)
- **Password**: (the password you set)

## 📋 Next Steps

1. ✅ Firebase is configured and ready
2. ⬜ Deploy Firestore rules and indexes
3. ⬜ Create your first admin user
4. ⬜ Test login with real credentials
5. ⬜ Start populating your database with products and users

## 🔗 Important Links

- **Firebase Console**: https://console.firebase.google.com/project/honestystore-46dad
- **Authentication**: https://console.firebase.google.com/project/honestystore-46dad/authentication
- **Firestore Database**: https://console.firebase.google.com/project/honestystore-46dad/firestore

## 🛠️ Troubleshooting

### "Permission denied" errors
- Make sure you've deployed the Firestore rules
- Verify the user is authenticated
- Check the user's role in Firestore

### "User not found" errors
- Create the user in Firebase Authentication first
- Add corresponding user document in Firestore
- Ensure the UIDs match

### Offline mode issues
- Persistence is enabled by default
- Clear browser cache if having issues
- Check browser console for warnings

## 📖 Additional Documentation

See these files for more details:
- `FIREBASE_SETUP.md` - Complete setup guide
- `FIREBASE_API_REFERENCE.md` - API documentation
- `FIREBASE_REALTIME_GUIDE.md` - Real-time features guide
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Database indexes

---

🎉 **Firebase is now fully integrated and ready to use!**
