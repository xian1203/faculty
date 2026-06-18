# Firebase Realtime Guide

Complete guide to using real-time data subscriptions with Firestore.

## 🔥 Real-time Features

All data updates automatically in real-time using Firestore's `onSnapshot` listeners. No manual refreshing needed!

## 📊 Real-time Services

### 1. RealtimeUserService
### 2. RealtimeProductService  
### 3. RealtimeOrderService
### 4. RealtimeAnalyticsService

---

## 🎯 Quick Examples

### Subscribe to All Users (Live)

```typescript
import { RealtimeUserService } from '@/firebase';

// Subscribe to users - updates automatically
const unsubscribe = RealtimeUserService.subscribeToUsers((users) => {
  console.log('Users updated:', users);
  // Update your UI here
});

// Cleanup when component unmounts
unsubscribe();
```

### Subscribe to Products (Live)

```typescript
import { RealtimeProductService } from '@/firebase';

// Subscribe to all products
const unsubscribe = RealtimeProductService.subscribeToProducts((products) => {
  console.log('Products updated:', products);
});

// Subscribe with filters
const unsubscribe2 = RealtimeProductService.subscribeToProducts(
  (products) => {
    console.log('Beverages updated:', products);
  },
  { category: 'Beverages', status: 'in_stock' }
);

// Cleanup
unsubscribe();
unsubscribe2();
```

### Subscribe to Orders (Live)

```typescript
import { RealtimeOrderService } from '@/firebase';

// Subscribe to today's orders
const unsubscribe = RealtimeOrderService.subscribeToTodaysOrders((orders) => {
  console.log('Today orders:', orders);
});

// Subscribe to pending payments
const unsubscribe2 = RealtimeOrderService.subscribeToPendingPayments((orders) => {
  console.log('Pending payments:', orders);
});

// Cleanup
unsubscribe();
unsubscribe2();
```

### Subscribe to Analytics (Live)

```typescript
import { RealtimeAnalyticsService } from '@/firebase';

// Subscribe to today's analytics
const unsubscribe = RealtimeAnalyticsService.subscribeToTodayAnalytics((analytics) => {
  if (analytics) {
    console.log('Today sales:', analytics.dailySales);
  }
});

// Subscribe to dashboard summary
const unsubscribe2 = RealtimeAnalyticsService.subscribeToDashboardSummary((summary) => {
  console.log('Dashboard:', summary);
  // {
  //   todaySales: 12450,
  //   todayOrders: 84,
  //   todayDebt: 2150,
  //   totalUsers: 128,
  //   monthSales: 245000,
  //   weekSales: 87000
  // }
});

// Cleanup
unsubscribe();
unsubscribe2();
```

---

## ⚛️ React Integration

### Custom Hook Example

```typescript
import { useEffect, useState } from 'react';
import { RealtimeProductService, Product } from '@/firebase';

export function useProducts(category?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = RealtimeProductService.subscribeToProducts(
      (updatedProducts) => {
        setProducts(updatedProducts);
        setLoading(false);
      },
      category ? { category } : undefined
    );

    return () => unsubscribe();
  }, [category]);

  return { products, loading };
}

// Usage in component
function ProductList() {
  const { products, loading } = useProducts('Beverages');

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### Dashboard Component Example

```typescript
import { useEffect, useState } from 'react';
import { RealtimeAnalyticsService, RealtimeOrderService } from '@/firebase';

function Dashboard() {
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayOrders: 0,
    monthSales: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    // Subscribe to dashboard summary
    const unsubscribe1 = RealtimeAnalyticsService.subscribeToDashboardSummary(
      (data) => setSummary(data)
    );

    // Subscribe to recent orders
    const unsubscribe2 = RealtimeOrderService.subscribeToRecentOrders(
      (orders) => setRecentOrders(orders)
    );

    // Cleanup both subscriptions
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  return (
    <div>
      <h1>Today Sales: ₱{summary.todaySales.toLocaleString()}</h1>
      <h2>Today Orders: {summary.todayOrders}</h2>
      <h3>Recent Orders: {recentOrders.length}</h3>
    </div>
  );
}
```

---

## 📚 Complete API Reference

### RealtimeUserService

```typescript
// Subscribe to all users
RealtimeUserService.subscribeToUsers(
  (users) => console.log(users),
  { role: 'admin', isActive: true, limitCount: 50 }
)

// Subscribe to single user
RealtimeUserService.subscribeToUser('user-id', (user) => console.log(user))

// Subscribe to active users count
RealtimeUserService.subscribeToActiveUsersCount((count) => console.log(count))

// Subscribe to users by role
RealtimeUserService.subscribeToUsersByRole('faculty', (users) => console.log(users))
```

### RealtimeProductService

```typescript
// Subscribe to all products
RealtimeProductService.subscribeToProducts(
  (products) => console.log(products),
  { category: 'Beverages', status: 'in_stock', limitCount: 100 }
)

// Subscribe to single product
RealtimeProductService.subscribeToProduct('product-id', (product) => console.log(product))

// Subscribe to low stock products
RealtimeProductService.subscribeToLowStockProducts((products) => console.log(products))

// Subscribe to products by category
RealtimeProductService.subscribeToProductsByCategory('Snacks', (products) => console.log(products))

// Subscribe to out of stock count
RealtimeProductService.subscribeToOutOfStockCount((count) => console.log(count))
```

### RealtimeOrderService

```typescript
// Subscribe to all orders
RealtimeOrderService.subscribeToOrders(
  (orders) => console.log(orders),
  {
    userId: 'user-id',
    paymentStatus: 'paid',
    orderStatus: 'completed',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    limitCount: 50
  }
)

// Subscribe to single order
RealtimeOrderService.subscribeToOrder('order-id', (order) => console.log(order))

// Subscribe to today's orders
RealtimeOrderService.subscribeToTodaysOrders((orders) => console.log(orders))

// Subscribe to pending payments
RealtimeOrderService.subscribeToPendingPayments((orders) => console.log(orders))

// Subscribe to user orders
RealtimeOrderService.subscribeToUserOrders('user-id', (orders) => console.log(orders))

// Subscribe to recent orders
RealtimeOrderService.subscribeToRecentOrders((orders) => console.log(orders))

// Subscribe to total revenue
RealtimeOrderService.subscribeToTotalRevenue(
  (revenue) => console.log(revenue),
  { startDate: new Date('2024-01-01'), endDate: new Date() }
)

// Subscribe to orders count
RealtimeOrderService.subscribeToOrdersCount(
  (count) => console.log(count),
  { paymentStatus: 'paid' }
)
```

### RealtimeAnalyticsService

```typescript
// Subscribe to today's analytics
RealtimeAnalyticsService.subscribeToTodayAnalytics((analytics) => console.log(analytics))

// Subscribe to analytics by date
RealtimeAnalyticsService.subscribeToAnalyticsByDate(
  new Date('2024-06-01'),
  (analytics) => console.log(analytics)
)

// Subscribe to analytics range
RealtimeAnalyticsService.subscribeToAnalyticsRange(
  new Date('2024-06-01'),
  new Date('2024-06-30'),
  (analytics) => console.log(analytics)
)

// Subscribe to month analytics
RealtimeAnalyticsService.subscribeToMonthAnalytics((analytics) => console.log(analytics))

// Subscribe to week analytics
RealtimeAnalyticsService.subscribeToWeekAnalytics((analytics) => console.log(analytics))

// Subscribe to dashboard summary
RealtimeAnalyticsService.subscribeToDashboardSummary((summary) => console.log(summary))
```

---

## 💡 Best Practices

### 1. Always Cleanup Subscriptions

```typescript
useEffect(() => {
  const unsubscribe = RealtimeProductService.subscribeToProducts(setProducts);
  
  // IMPORTANT: Cleanup on unmount
  return () => unsubscribe();
}, []);
```

### 2. Handle Loading States

```typescript
function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = RealtimeProductService.subscribeToProducts((products) => {
      setData(products);
      setLoading(false); // Set loading false on first data
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <Spinner />;
  return <ProductList products={data} />;
}
```

### 3. Optimize Subscriptions

```typescript
// ❌ Bad: Subscribe to all data
const unsubscribe = RealtimeProductService.subscribeToProducts(setProducts);

// ✅ Good: Use filters and limits
const unsubscribe = RealtimeProductService.subscribeToProducts(
  setProducts,
  { category: 'Beverages', limitCount: 50 }
);
```

### 4. Multiple Subscriptions

```typescript
useEffect(() => {
  const unsubscribes = [
    RealtimeProductService.subscribeToProducts(setProducts),
    RealtimeOrderService.subscribeToTodaysOrders(setOrders),
    RealtimeAnalyticsService.subscribeToDashboardSummary(setSummary),
  ];

  // Cleanup all subscriptions
  return () => unsubscribes.forEach(unsub => unsub());
}, []);
```

### 5. Conditional Subscriptions

```typescript
useEffect(() => {
  if (!userId) return;

  const unsubscribe = RealtimeOrderService.subscribeToUserOrders(
    userId,
    setOrders
  );

  return () => unsubscribe();
}, [userId]); // Re-subscribe when userId changes
```

---

## 🚀 Performance Tips

1. **Use limits** - Don't subscribe to unlimited data
2. **Filter server-side** - Use Firestore queries, not client-side filtering
3. **Cleanup** - Always unsubscribe when component unmounts
4. **Debounce** - For UI updates, consider debouncing rapid changes
5. **Pagination** - For large datasets, use pagination with limits

---

## 🔄 Offline Support

Firebase automatically handles offline mode:

```typescript
// Works offline! Data syncs when back online
const unsubscribe = RealtimeProductService.subscribeToProducts((products) => {
  // Gets cached data while offline
  // Syncs with server when online
  console.log(products);
});
```

The `enableIndexedDbPersistence` in `config.ts` enables offline caching automatically.

---

## 🎨 UI Update Patterns

### Auto-Refresh Dashboard

```typescript
function Dashboard() {
  const [stats, setStats] = useState({ sales: 0, orders: 0 });

  useEffect(() => {
    // Updates automatically every time data changes in Firestore
    const unsubscribe = RealtimeAnalyticsService.subscribeToDashboardSummary(
      (summary) => setStats({
        sales: summary.todaySales,
        orders: summary.todayOrders,
      })
    );

    return () => unsubscribe();
  }, []);

  return <div>Sales: ₱{stats.sales}</div>;
}
```

### Live Order Feed

```typescript
function LiveOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Shows new orders instantly as they're created
    const unsubscribe = RealtimeOrderService.subscribeToRecentOrders(
      (newOrders) => {
        setOrders(newOrders);
        if (newOrders.length > orders.length) {
          playNotificationSound();
        }
      }
    );

    return () => unsubscribe();
  }, [orders.length]);

  return <OrderList orders={orders} />;
}
```

---

## 🆘 Troubleshooting

### Subscription not updating?
- Check Firestore security rules
- Verify user is authenticated
- Check browser console for errors

### Too many reads?
- Add filters to reduce data
- Use limits
- Optimize subscription frequency

### Memory leaks?
- Always return cleanup function
- Unsubscribe in useEffect cleanup

---

## 📖 Additional Resources

- [Firestore Realtime Updates](https://firebase.google.com/docs/firestore/query-data/listen)
- [Offline Data](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Best Practices](https://firebase.google.com/docs/firestore/best-practices)
