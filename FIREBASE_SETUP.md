# Firebase Setup Guide - Realtime Edition

Complete setup guide for Firebase Authentication + Firestore with real-time updates.

## 📋 Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- A Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)

## 🚀 Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: `honestystore-admin`
4. Disable Google Analytics (optional, not needed)
5. Create project

### 2. Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. Click "Save"

### 3. Create Firestore Database

1. Go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (we'll deploy rules later)
4. Select your preferred location (e.g., `asia-southeast1`)
5. Click "Enable"

> ✅ **Note:** We're only using Firestore and Authentication - no Storage needed!

### 4. Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click web icon `</>`
4. Register app name: `HonestyStore Admin`
5. Copy the configuration object

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase config values:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=honestystore-admin.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=honestystore-admin
   VITE_FIREBASE_STORAGE_BUCKET=honestystore-admin.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

### 6. Install Dependencies

```bash
pnpm install
```

The Firebase package (v10.7.1) is already added to `package.json`.

### 7. Deploy Firestore Security Rules

1. Login to Firebase CLI:
   ```bash
   firebase login
   ```

2. Initialize Firebase in your project:
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Accept default file for rules: `firestore.rules`
   - Accept default file for indexes: `firestore.indexes.json`

3. Deploy security rules and indexes:
   ```bash
   firebase deploy --only firestore
   ```

### 8. Create Initial Admin User

Create the first admin user manually:

1. **Go to Firebase Console > Authentication > Users**
2. Click "Add user"
3. Enter email: `admin@ndkc.edu.ph`
4. Enter password: (choose a secure password)
5. Click "Add user"
6. **Copy the UID** of the created user

7. **Go to Firestore Database > Data**
8. Click "Start collection"
9. Collection ID: `users`
10. Document ID: (paste the UID from step 6)
11. Add fields:
    ```
    uid: <paste-the-auth-uid>
    email: admin@ndkc.edu.ph
    name: Admin User
    role: admin
    isActive: true
    createdAt: <click "timestamp" and use current time>
    updatedAt: <click "timestamp" and use current time>
    ```
12. Click "Save"

## 🔥 Real-time Features

This setup includes **automatic real-time updates**:

- ✅ **Offline persistence** - Data cached locally
- ✅ **Live data sync** - Changes appear instantly
- ✅ **Automatic reconnection** - Handles network issues
- ✅ **Optimistic updates** - Fast UI updates

## 💻 Usage Examples

### Regular Operations (One-time)

```typescript
import {
  AuthService,
  UserService,
  ProductService,
  OrderService,
  AnalyticsService
} from '@/firebase';

// Sign in
const user = await AuthService.signIn('admin@ndkc.edu.ph', 'password');

// Create product
const productId = await ProductService.createProduct({
  name: 'Coca Cola 500ml',
  category: 'Beverages',
  price: 35,
  stock: 100,
  sku: 'BEV-001',
  status: 'in_stock',
  reorderLevel: 20,
  createdBy: user.uid,
});

// Create order
const orderId = await OrderService.createOrder({
  userId: user.uid,
  userName: user.name,
  items: [{ productId, productName: 'Coca Cola', quantity: 2, price: 35, subtotal: 70 }],
  totalAmount: 70,
  paymentMethod: 'cash',
  paymentStatus: 'paid',
  orderStatus: 'completed',
});
```

### Real-time Subscriptions (Live Updates)

```typescript
import {
  RealtimeUserService,
  RealtimeProductService,
  RealtimeOrderService,
  RealtimeAnalyticsService
} from '@/firebase';

// Subscribe to products - updates automatically!
const unsubscribe = RealtimeProductService.subscribeToProducts((products) => {
  console.log('Products updated in real-time:', products);
  // Update your UI here
});

// Subscribe to today's orders
RealtimeOrderService.subscribeToTodaysOrders((orders) => {
  console.log('Today orders (live):', orders);
});

// Subscribe to dashboard analytics
RealtimeAnalyticsService.subscribeToDashboardSummary((summary) => {
  console.log('Dashboard (live):', summary);
  // { todaySales: 12450, todayOrders: 84, monthSales: 245000, ... }
});

// IMPORTANT: Cleanup when component unmounts
unsubscribe();
```

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { RealtimeProductService, Product } from '@/firebase';

function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = RealtimeProductService.subscribeToProducts(
      (updatedProducts) => {
        setProducts(updatedProducts);
      },
      { category: 'Beverages' }
    );

    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name} - Stock: {product.stock}</div>
      ))}
    </div>
  );
}
```

## 📁 Project Structure

```
src/
├── firebase/
│   ├── config.ts                         # Firebase init + offline persistence
│   ├── types.ts                          # TypeScript interfaces
│   ├── index.ts                          # Central export
│   └── services/
│       ├── auth.service.ts               # Authentication
│       ├── user.service.ts               # User CRUD
│       ├── product.service.ts            # Product CRUD
│       ├── order.service.ts              # Order CRUD
│       ├── analytics.service.ts          # Analytics generation
│       ├── realtime-user.service.ts      # 🔥 Live user data
│       ├── realtime-product.service.ts   # 🔥 Live product data
│       ├── realtime-order.service.ts     # 🔥 Live order data
│       └── realtime-analytics.service.ts # 🔥 Live analytics
├── app/
│   └── components/                       # React components
└── ...

firestore.rules                           # Security rules
firestore.indexes.json                    # Query indexes
.env                                      # Environment vars (gitignored)
.env.example                              # Environment template
```

## 📊 Firestore Collections

```
users/          - User accounts & roles (admin, faculty, kiosk, user)
products/       - Inventory items with stock tracking
orders/         - Transactions with payment tracking
analytics/      - Daily aggregated sales data
```

### Example: `users` collection

```typescript
{
  uid: "firebase-auth-uid",
  email: "admin@ndkc.edu.ph",
  name: "Admin User",
  role: "admin", // admin | faculty | kiosk | user
  department: "IT",
  rfidUid: "RF-12345",
  isActive: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🔒 Security Rules (Deployed)

The `firestore.rules` file includes:

- ✅ **Role-based access** - Admin, faculty, kiosk, user roles
- ✅ **User data protection** - Users can only read their own data
- ✅ **Admin-only writes** - Only admins can create/update/delete
- ✅ **Order scoping** - Users see only their orders
- ✅ **Analytics protection** - Admin-only access

## 🧪 Testing

```typescript
// Test authentication
const testAuth = async () => {
  const user = await AuthService.signIn('admin@ndkc.edu.ph', 'password');
  console.log('✅ Auth working:', user.email);
};

// Test real-time data
const testRealtime = () => {
  const unsubscribe = RealtimeProductService.subscribeToProducts((products) => {
    console.log('✅ Real-time working:', products.length, 'products');
  });
  
  setTimeout(() => unsubscribe(), 5000);
};

testAuth();
testRealtime();
```

## 🔥 Real-time Benefits

1. **Instant UI updates** - No manual refresh needed
2. **Multi-device sync** - Changes appear on all devices
3. **Offline support** - Works without internet
4. **Automatic retry** - Handles network failures
5. **Live dashboards** - Real-time analytics

## 🆘 Troubleshooting

### Subscriptions not updating?
- Check Firestore security rules are deployed
- Verify user is authenticated
- Check browser console for errors

### "Permission denied" errors?
```bash
firebase deploy --only firestore:rules
```

### App not initializing?
- Check `.env` file exists with correct values
- Restart dev server: `pnpm run dev`

### Too many reads?
- Use filters and limits in subscriptions
- Unsubscribe when components unmount

## 📚 Documentation

- 📖 **FIREBASE_SETUP.md** - This file (setup guide)
- 📖 **FIREBASE_REALTIME_GUIDE.md** - Complete real-time API reference
- 📖 **FIREBASE_API_REFERENCE.md** - Standard CRUD operations

## 🎯 Next Steps

1. ✅ Complete this setup
2. ✅ Create admin user in Firebase Console
3. ✅ Deploy security rules: `firebase deploy --only firestore`
4. 📖 Read `FIREBASE_REALTIME_GUIDE.md` for real-time examples
5. 🚀 Start building with live data!

---

**Your Firebase backend is now ready with real-time capabilities!** 🎉
