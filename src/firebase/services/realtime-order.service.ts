import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  QueryConstraint,
  Unsubscribe,
  Timestamp,
  DocumentSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config';
import { Order } from '../types';

/**
 * Realtime Order Service
 * Provides real-time listeners for order data from kiosk "orders" collection
 * ADMIN READ-ONLY: No write/update/delete operations
 */
export class RealtimeOrderService {
  private static readonly COLLECTION = 'orders';
  private static readonly DEBTS_COLLECTION = 'debts';

  /**
   * Parse Firestore order document to Order interface
   * Handles kiosk data structure with safe null checks
   */
  private static parseOrder(doc: DocumentSnapshot<any>): Order | null {
    try {
      const data = doc.data();
      if (!data) return null;

      return {
        id: doc.id,
        orderId: data.orderId ?? 'N/A',
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        userName: data.userName ?? 'Unknown User',
        userId: data.userId ?? '',
        rfidUid: data.rfidUid ?? 'N/A',
        userPhotoURL: data.photoURL, // Optional, nullable
        items: Array.isArray(data.items)
          ? data.items.map((item: any) => ({
              productId: item.productId ?? '',
              productName: item.productName ?? 'Unknown Product',
              quantity: item.quantity ?? 1,
              price: item.price ?? 0,
              subtotal: item.totalPrice ?? (item.price ?? 0) * (item.quantity ?? 1),
            }))
          : [],
        subtotal: data.subtotal ?? 0,
        totalAmount: data.totalAmount ?? 0,
        paymentMethod: data.paymentDetails?.paymentMethod ?? 'cash',
        paymentStatus: data.status ?? 'pending', // Map 'status' field to paymentStatus
        orderStatus: 'pending', // Placeholder for compatibility
        notes: data.notes,
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        completedAt: data.completedAt?.toDate?.(),
        userEmail: data.userEmail,
      };
    } catch (error) {
      console.error('Error parsing order document:', error, doc.data());
      return null;
    }
  }

  /**
   * Enrich orders with debt status for paylater orders
   * When paymentMethod is 'paylater', read status from debts collection instead of orders
   */
  private static async enrichOrdersWithDebtStatus(orders: Order[]): Promise<Order[]> {
    try {
      // Get all paylater orders
      const paylaterOrders = orders.filter(o => o.paymentMethod === 'paylater');
      
      if (paylaterOrders.length === 0) {
        return orders;
      }

      // Batch fetch debt records for these orders
      const debtMap = new Map<string, any>();
      
      for (const order of paylaterOrders) {
        try {
          const debtQuery = query(
            collection(db, this.DEBTS_COLLECTION),
            where('orderId', '==', order.orderId)
          );
          const debtSnapshot = await getDocs(debtQuery);
          
          if (!debtSnapshot.empty) {
            const debtData = debtSnapshot.docs[0].data();
            debtMap.set(order.orderId, debtData.status); // 'unpaid', 'paid', 'partial', 'overdue'
          }
        } catch (error) {
          console.error(`Error fetching debt for order ${order.orderId}:`, error);
        }
      }

      // Enrich orders with debt status
      return orders.map(order => {
        if (order.paymentMethod === 'paylater' && debtMap.has(order.orderId)) {
          const debtStatus = debtMap.get(order.orderId);
          // Map debt status to payment status: unpaid/partial/overdue -> pending, paid -> paid
          const mappedStatus = debtStatus === 'paid' ? 'paid' : 'pending';
          return {
            ...order,
            paymentStatus: mappedStatus,
          };
        }
        return order;
      });
    } catch (error) {
      console.error('Error enriching orders with debt status:', error);
      return orders; // Return original orders if enrichment fails
    }
  }

  /**
   * Listen to all orders in real-time, ordered by creation date (newest first)
   * For paylater orders, reads status from debts collection
   */
  static subscribeToOrders(
    callback: (orders: Order[]) => void,
    filters?: {
      userId?: string;
      status?: string; // Filter by kiosk 'status' field (pending, processing, paid)
      paymentMethod?: string; // Filter by paymentDetails.paymentMethod
      startDate?: Date;
      endDate?: Date;
      limitCount?: number;
    }
  ): Unsubscribe {
    try {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      if (filters?.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }

      // Filter by 'status' field (not paymentStatus)
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      // Filter by nested paymentDetails.paymentMethod - use client-side if not supported
      // if (filters?.paymentMethod) {
      //   constraints.push(where('paymentDetails.paymentMethod', '==', filters.paymentMethod));
      // }

      if (filters?.startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters?.endDate) {
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
      }

      if (filters?.limitCount) {
        constraints.push(firestoreLimit(filters.limitCount));
      }

      const q = query(collection(db, this.COLLECTION), ...constraints);

      return onSnapshot(
        q,
        async (snapshot) => {
          let orders = snapshot.docs
            .map((doc) => this.parseOrder(doc))
            .filter((order): order is Order => order !== null)
            // Client-side filtering for payment method if needed
            .filter((order) => {
              if (filters?.paymentMethod) {
                return order.paymentMethod === filters.paymentMethod;
              }
              return true;
            });

          // Enrich paylater orders with debt status
          orders = await this.enrichOrdersWithDebtStatus(orders);

          callback(orders);
        },
        (error) => {
          console.error('Error subscribing to orders:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up orders listener:', error);
      return () => {};
    }
  }

  /**
   * Listen to a specific order in real-time
   * For paylater orders, reads status from debts collection
   */
  static subscribeToOrder(
    id: string,
    callback: (order: Order | null) => void
  ): Unsubscribe {
    try {
      const docRef = doc(db, this.COLLECTION, id);

      return onSnapshot(
        docRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            let order = this.parseOrder(snapshot);
            if (order) {
              // Enrich with debt status if paylater
              const enriched = await this.enrichOrdersWithDebtStatus([order]);
              order = enriched[0];
            }
            callback(order);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Error subscribing to order:', error);
          callback(null);
        }
      );
    } catch (error) {
      console.error('Error setting up order listener:', error);
      return () => {};
    }
  }

  /**
   * Listen to today's orders in real-time
   */
  static subscribeToTodaysOrders(
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.subscribeToOrders(callback, {
      startDate: today,
      endDate: tomorrow,
      limitCount: 50,
    });
  }

  /**
   * Listen to pending orders in real-time
   * Reads from 'status' field: pending, processing, paid
   */
  static subscribeToPendingPayments(
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    return this.subscribeToOrders(callback, {
      status: 'pending',
      limitCount: 50,
    });
  }

  /**
   * Listen to processing orders in real-time
   */
  static subscribeToProcessingOrders(
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    return this.subscribeToOrders(callback, {
      status: 'processing',
      limitCount: 50,
    });
  }

  /**
   * Listen to paid orders in real-time
   */
  static subscribeToPaidOrders(
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    return this.subscribeToOrders(callback, {
      status: 'paid',
      limitCount: 50,
    });
  }

  /**
   * Listen to user's orders in real-time
   */
  static subscribeToUserOrders(
    userId: string,
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    return this.subscribeToOrders(callback, { userId, limitCount: 50 });
  }

  /**
   * Listen to recent orders in real-time (last 50)
   */
  static subscribeToRecentOrders(
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    return this.subscribeToOrders(callback, { limitCount: 50 });
  }

  /**
   * Listen to total revenue in real-time (paid orders only)
   */
  static subscribeToTotalRevenue(
    callback: (revenue: number) => void,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Unsubscribe {
    return this.subscribeToOrders(
      (orders) => {
        const revenue = orders
          .filter((o) => o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
        callback(revenue);
      },
      {
        status: 'paid',
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        limitCount: 200,
      }
    );
  }

  /**
   * Listen to orders count in real-time by status
   */
  static subscribeToOrdersCount(
    callback: (count: number) => void,
    status?: string
  ): Unsubscribe {
    return this.subscribeToOrders(
      (orders) => callback(orders.length),
      status ? { status, limitCount: 200 } : { limitCount: 200 }
    );
  }

  /**
   * Listen to orders by payment method in real-time
   * Reads from paymentDetails.paymentMethod (gcash_qr, paylater, cash)
   */
  static subscribeToOrdersByPaymentMethod(
    paymentMethod: string,
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    return this.subscribeToOrders(callback, {
      paymentMethod,
      limitCount: 50,
    });
  }
}
