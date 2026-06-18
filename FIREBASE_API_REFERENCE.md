# Firebase API Reference

Complete guide to using the Firebase backend services.

## Table of Contents

- [Authentication Service](#authentication-service)
- [User Service](#user-service)
- [Product Service](#product-service)
- [Order Service](#order-service)
- [Analytics Service](#analytics-service)

---

## Authentication Service

### Sign In
```typescript
import { AuthService } from '@/firebase';

const user = await AuthService.signIn('admin@ndkc.edu.ph', 'password');
```

### Sign Out
```typescript
await AuthService.signOut();
```

### Create User (Admin Only)
```typescript
const newUser = await AuthService.createUser(
  'user@example.com',
  'password123',
  {
    name: 'John Doe',
    role: 'faculty',
    department: 'CAS',
    rfidUid: 'RF-12345',
  }
);
```

### Get Current User
```typescript
const currentUser = AuthService.getCurrentUser();
```

### Check if Admin
```typescript
const isAdmin = await AuthService.isAdmin(userId);
```

### Listen to Auth State
```typescript
const unsubscribe = AuthService.onAuthStateChange((user) => {
  if (user) {
    console.log('User signed in:', user.email);
  } else {
    console.log('User signed out');
  }
});

// Cleanup
unsubscribe();
```

---

## User Service

### Get All Users (Admin Only)
```typescript
import { UserService } from '@/firebase';

// Get all users
const users = await UserService.getUsers();

// With filters
const admins = await UserService.getUsers({
  role: 'admin',
  isActive: true,
  limitCount: 10,
});
```

### Get User by ID
```typescript
const user = await UserService.getUserById('user-uid');
```

### Get User by Email
```typescript
const user = await UserService.getUserByEmail('user@example.com');
```

### Get User by RFID
```typescript
const user = await UserService.getUserByRfid('RF-12345');
```

### Update User (Admin Only)
```typescript
await UserService.updateUser('user-uid', {
  name: 'Updated Name',
  department: 'IT',
  phoneNumber: '+639123456789',
});
```

### Update User Role (Admin Only)
```typescript
await UserService.updateUserRole('user-uid', 'admin');
```

### Deactivate User (Admin Only)
```typescript
await UserService.deactivateUser('user-uid');
```

### Activate User (Admin Only)
```typescript
await UserService.activateUser('user-uid');
```

### Get User Counts
```typescript
const adminCount = await UserService.getUsersCountByRole('admin');
const activeCount = await UserService.getActiveUsersCount();
```

---

## Product Service

### Create Product (Admin Only)
```typescript
import { ProductService } from '@/firebase';

const productId = await ProductService.createProduct({
  name: 'Coca Cola 500ml',
  description: 'Refreshing soda',
  category: 'Beverages',
  price: 35,
  stock: 100,
  sku: 'BEV-COKE-500',
  rfidSku: 'RFID-001',
  status: 'in_stock',
  reorderLevel: 20,
  createdBy: 'admin-uid',
});
```

### Get All Products
```typescript
// Get all products
const products = await ProductService.getProducts();

// With filters
const beverages = await ProductService.getProducts({
  category: 'Beverages',
  status: 'in_stock',
  limitCount: 50,
});
```

### Get Product by ID
```typescript
const product = await ProductService.getProductById('product-id');
```

### Get Product by SKU
```typescript
const product = await ProductService.getProductBySku('BEV-COKE-500');
```

### Update Product (Admin Only)
```typescript
await ProductService.updateProduct('product-id', {
  price: 40,
  stock: 80,
  description: 'Updated description',
});
```

### Update Stock
```typescript
// Add stock
await ProductService.updateStock('product-id', 50, 'add');

// Subtract stock
await ProductService.updateStock('product-id', 10, 'subtract');
```

### Delete Product (Admin Only)
```typescript
await ProductService.deleteProduct('product-id');
```

### Get Low Stock Products
```typescript
const lowStock = await ProductService.getLowStockProducts();
```

### Search Products
```typescript
const results = await ProductService.searchProducts('cola');
```

---

## Order Service

### Create Order
```typescript
import { OrderService } from '@/firebase';

const orderId = await OrderService.createOrder({
  userId: 'user-uid',
  userName: 'John Doe',
  userEmail: 'john@example.com',
  rfidUid: 'RF-12345',
  items: [
    {
      productId: 'product-1',
      productName: 'Coca Cola 500ml',
      quantity: 2,
      price: 35,
      subtotal: 70,
    },
    {
      productId: 'product-2',
      productName: 'Chips',
      quantity: 1,
      price: 25,
      subtotal: 25,
    }
  ],
  totalAmount: 95,
  paymentMethod: 'cash',
  paymentStatus: 'paid',
  orderStatus: 'completed',
});
```

### Get All Orders
```typescript
// Get all orders
const orders = await OrderService.getOrders();

// With filters
const userOrders = await OrderService.getOrders({
  userId: 'user-uid',
  paymentStatus: 'paid',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limitCount: 100,
});
```

### Get Order by ID
```typescript
const order = await OrderService.getOrderById('order-id');
```

### Get Order by Order ID
```typescript
const order = await OrderService.getOrderByOrderId('ORD-ABC123');
```

### Update Order
```typescript
await OrderService.updateOrder('order-id', {
  paymentStatus: 'paid',
  orderStatus: 'completed',
  notes: 'Payment received',
});
```

### Update Payment Status
```typescript
await OrderService.updatePaymentStatus('order-id', 'paid');
```

### Cancel Order
```typescript
// Automatically restores product stock
await OrderService.cancelOrder('order-id');
```

### Get Today's Orders
```typescript
const todayOrders = await OrderService.getTodaysOrders();
```

### Get Pending Payments
```typescript
const pending = await OrderService.getPendingPayments();
```

### Calculate Total Revenue
```typescript
const totalRevenue = await OrderService.getTotalRevenue(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

---

## Analytics Service

### Generate Daily Analytics
```typescript
import { AnalyticsService } from '@/firebase';

// Generate analytics for today
await AnalyticsService.generateDailyAnalytics();

// Generate for specific date
await AnalyticsService.generateDailyAnalytics(new Date('2024-06-01'));
```

### Get Analytics by Date
```typescript
const analytics = await AnalyticsService.getAnalyticsByDate(new Date());
```

### Get Analytics Range
```typescript
const monthAnalytics = await AnalyticsService.getAnalyticsRange(
  new Date('2024-06-01'),
  new Date('2024-06-30')
);
```

### Get Dashboard Summary
```typescript
const summary = await AnalyticsService.getDashboardSummary();
// Returns:
// {
//   todaySales: number,
//   todayOrders: number,
//   todayDebt: number,
//   totalUsers: number,
//   monthSales: number,
//   weekSales: number,
// }
```

### Get Top Products
```typescript
const topProducts = await AnalyticsService.getTopProducts(
  new Date('2024-06-01'),
  new Date('2024-06-30'),
  10 // limit
);
```

---

## Error Handling

All service methods throw errors that can be caught:

```typescript
try {
  const user = await AuthService.signIn(email, password);
  console.log('Success:', user);
} catch (error) {
  console.error('Error:', error.message);
  // Handle error (show toast, etc.)
}
```

---

## TypeScript Types

Import types for TypeScript support:

```typescript
import type {
  User,
  UserRole,
  Product,
  Order,
  OrderItem,
  Analytics,
  CreateProductInput,
  UpdateProductInput,
  CreateOrderInput,
} from '@/firebase';
```

---

## React Integration Example

### Auth Context

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { AuthService, User } from '@/firebase';

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await AuthService.getUserData(firebaseUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await AuthService.signIn(email, password);
    setUser(user);
  };

  const signOut = async () => {
    await AuthService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Protected Route

```typescript
import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
}
```

---

## Best Practices

1. **Always handle errors** - Use try/catch blocks
2. **Check permissions** - Verify user roles before operations
3. **Validate inputs** - Check data before sending to Firebase
4. **Use TypeScript** - Leverage type safety
5. **Implement loading states** - Show feedback to users
6. **Cache when appropriate** - Store frequently accessed data
7. **Batch operations** - Group related Firebase calls
8. **Monitor usage** - Track Firebase quotas and costs

---

## Firebase Console URLs

- **Authentication**: `https://console.firebase.google.com/project/YOUR_PROJECT/authentication/users`
- **Firestore**: `https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data`
- **Storage**: `https://console.firebase.google.com/project/YOUR_PROJECT/storage`
- **Analytics**: `https://console.firebase.google.com/project/YOUR_PROJECT/analytics`
