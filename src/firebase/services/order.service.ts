import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  QueryConstraint,
  startAfter,
  endBefore,
  limitToLast,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config';
import { Order, CreateOrderInput, UpdateOrderInput, PaymentStatus, OrderStatus } from '../types';
import { ProductService } from './product.service';

/**
 * Order Service
 * Handles all order/transaction-related database operations
 */
export class OrderService {
  private static readonly COLLECTION = 'orders';
  private static readonly COUNTERS_COLLECTION = 'counters';
  private static readonly ORDER_COUNTER_DOC = 'orderCounter';

  /**
   * Generate unique sequential order ID using Firestore counter
   * Uses transaction to ensure atomicity and prevent duplicate IDs
   * Format: OR-00001, OR-00002, etc.
   */
  private static async generateOrderId(): Promise<string> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, this.COUNTERS_COLLECTION, this.ORDER_COUNTER_DOC);
        const counterSnap = await transaction.get(counterRef);

        let nextNumber = 1;

        if (counterSnap.exists()) {
          nextNumber = (counterSnap.data().current || 0) + 1;
        } else {
          // Initialize counter if it doesn't exist
          transaction.set(counterRef, { current: 1 });
          nextNumber = 1;
        }

        // Increment counter
        transaction.update(counterRef, { current: nextNumber });

        // Format order ID with leading zeros (5 digits)
        return `OR-${String(nextNumber).padStart(5, '0')}`;
      });

      return result;
    } catch (error) {
      console.error('Error generating order ID:', error);
      throw new Error('Failed to generate order ID');
    }
  }

  /**
   * Create new order
   */
  static async createOrder(orderData: CreateOrderInput): Promise<string> {
    try {
      // Validate stock availability
      for (const item of orderData.items) {
        const product = await ProductService.getProductById(item.productId);

        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}`);
        }
      }

      // Generate sequential order ID using counter
      const orderId = await this.generateOrderId();

      const newOrder: Omit<Order, 'id'> = {
        ...orderData,
        orderId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), newOrder);

      // Update the document with its own ID
      await updateDoc(docRef, { id: docRef.id });

      // Update product stock
      for (const item of orderData.items) {
        await ProductService.updateStock(item.productId, item.quantity, 'subtract');
      }

      return docRef.id;
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  /**
   * Get all orders with filters
   */
  static async getOrders(filters?: {
    userId?: string;
    paymentStatus?: PaymentStatus;
    orderStatus?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
    limitCount?: number;
  }): Promise<Order[]> {
    try {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      if (filters?.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }

      if (filters?.paymentStatus) {
        constraints.push(where('paymentStatus', '==', filters.paymentStatus));
      }

      if (filters?.orderStatus) {
        constraints.push(where('orderStatus', '==', filters.orderStatus));
      }

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
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => doc.data() as Order);
    } catch (error) {
      console.error('Get orders error:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(id: string): Promise<Order | null> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as Order;
    } catch (error) {
      console.error('Get order error:', error);
      throw new Error('Failed to fetch order');
    }
  }

  /**
   * Get order by order ID
   */
  static async getOrderByOrderId(orderId: string): Promise<Order | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('orderId', '==', orderId),
        firestoreLimit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as Order;
    } catch (error) {
      console.error('Get order by orderId error:', error);
      throw new Error('Failed to fetch order');
    }
  }

  /**
   * Update order
   */
  static async updateOrder(id: string, data: UpdateOrderInput): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);

      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
        ...(data.orderStatus === 'completed' && { completedAt: Timestamp.now() }),
      });
    } catch (error) {
      console.error('Update order error:', error);
      throw new Error('Failed to update order');
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
    try {
      await this.updateOrder(id, { paymentStatus: status });
    } catch (error) {
      console.error('Update payment status error:', error);
      throw new Error('Failed to update payment status');
    }
  }

  /**
   * Cancel order
   */
  static async cancelOrder(id: string): Promise<void> {
    try {
      const order = await this.getOrderById(id);

      if (!order) {
        throw new Error('Order not found');
      }

      // Restore product stock
      for (const item of order.items) {
        await ProductService.updateStock(item.productId, item.quantity, 'add');
      }

      await this.updateOrder(id, {
        orderStatus: 'cancelled',
        paymentStatus: 'failed'
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  /**
   * Get orders by user
   */
  static async getOrdersByUser(userId: string): Promise<Order[]> {
    try {
      return await this.getOrders({ userId });
    } catch (error) {
      console.error('Get orders by user error:', error);
      throw new Error('Failed to fetch user orders');
    }
  }

  /**
   * Get today's orders
   */
  static async getTodaysOrders(): Promise<Order[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await this.getOrders({
        startDate: today,
        endDate: tomorrow,
      });
    } catch (error) {
      console.error('Get todays orders error:', error);
      throw new Error('Failed to fetch todays orders');
    }
  }

  /**
   * Get pending payments
   */
  static async getPendingPayments(): Promise<Order[]> {
    try {
      return await this.getOrders({ paymentStatus: 'pending' });
    } catch (error) {
      console.error('Get pending payments error:', error);
      throw new Error('Failed to fetch pending payments');
    }
  }

  /**
   * Calculate total revenue
   */
  static async getTotalRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const orders = await this.getOrders({
        startDate,
        endDate,
        paymentStatus: 'paid',
      });

      return orders.reduce((total, order) => total + order.totalAmount, 0);
    } catch (error) {
      console.error('Get total revenue error:', error);
      return 0;
    }
  }
}
