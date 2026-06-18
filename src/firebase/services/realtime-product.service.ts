import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { Product } from '../types';

/**
 * Realtime Product Service
 * Provides real-time listeners for product data
 */
export class RealtimeProductService {
  private static readonly COLLECTION = 'products';

  /**
   * Listen to all products in real-time
   */
  static subscribeToProducts(
    callback: (products: Product[]) => void,
    filters?: {
      category?: string;
      status?: 'in_stock' | 'low_stock' | 'out_of_stock';
      limitCount?: number;
    }
  ): Unsubscribe {
    try {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      if (filters?.category) {
        constraints.push(where('category', '==', filters.category));
      }

      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.limitCount) {
        constraints.push(limit(filters.limitCount));
      }

      const q = query(collection(db, this.COLLECTION), ...constraints);

      return onSnapshot(
        q,
        (snapshot) => {
          const products = snapshot.docs.map(doc => doc.data() as Product);
          callback(products);
        },
        (error) => {
          console.error('Subscribe to products error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to products error:', error);
      return () => {};
    }
  }

  /**
   * Listen to a specific product in real-time
   */
  static subscribeToProduct(
    id: string,
    callback: (product: Product | null) => void
  ): Unsubscribe {
    try {
      const docRef = doc(db, this.COLLECTION, id);

      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as Product);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Subscribe to product error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to product error:', error);
      return () => {};
    }
  }

  /**
   * Listen to low stock products in real-time
   */
  static subscribeToLowStockProducts(
    callback: (products: Product[]) => void
  ): Unsubscribe {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('status', 'in', ['low_stock', 'out_of_stock']),
        orderBy('stock', 'asc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const products = snapshot.docs.map(doc => doc.data() as Product);
          callback(products);
        },
        (error) => {
          console.error('Subscribe to low stock products error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to low stock products error:', error);
      return () => {};
    }
  }

  /**
   * Listen to products by category in real-time
   */
  static subscribeToProductsByCategory(
    category: string,
    callback: (products: Product[]) => void
  ): Unsubscribe {
    return this.subscribeToProducts(callback, { category });
  }

  /**
   * Listen to out of stock count in real-time
   */
  static subscribeToOutOfStockCount(
    callback: (count: number) => void
  ): Unsubscribe {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('status', '==', 'out_of_stock')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.size);
        },
        (error) => {
          console.error('Subscribe to out of stock count error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to out of stock count error:', error);
      return () => {};
    }
  }
}
