import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config';
import { Analytics } from '../types';
import { OrderService } from './order.service';
import { UserService } from './user.service';
import { ProductService } from './product.service';

/**
 * Analytics Service
 * Handles analytics data aggregation and storage
 */
export class AnalyticsService {
  private static readonly COLLECTION = 'analytics';

  /**
   * Format date as YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate analytics for a specific date
   */
  static async generateDailyAnalytics(date: Date = new Date()): Promise<void> {
    try {
      const dateStr = this.formatDate(date);

      // Set date range for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get orders for the day
      const orders = await OrderService.getOrders({
        startDate: startOfDay,
        endDate: endOfDay,
      });

      // Calculate metrics
      const dailySales = orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const totalOrders = orders.length;

      const totalDebt = orders
        .filter(o => o.paymentStatus === 'pending' && o.paymentMethod === 'debt')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      // Payment method breakdown
      const paymentMethodBreakdown = {
        cash: orders.filter(o => o.paymentMethod === 'cash' && o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + o.totalAmount, 0),
        gcash: orders.filter(o => o.paymentMethod === 'gcash' && o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + o.totalAmount, 0),
        debt: orders.filter(o => o.paymentMethod === 'debt')
          .reduce((sum, o) => sum + o.totalAmount, 0),
      };

      // Top products
      const productSales = new Map<string, { productId: string; productName: string; quantity: number; revenue: number }>();

      orders.forEach(order => {
        order.items.forEach(item => {
          const existing = productSales.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.subtotal;
          } else {
            productSales.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              revenue: item.subtotal,
            });
          }
        });
      });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Get total active users
      const totalUsers = await UserService.getActiveUsersCount();

      // Create analytics document
      const analyticsData: Omit<Analytics, 'id'> = {
        date: dateStr,
        dailySales,
        totalOrders,
        totalUsers,
        totalDebt,
        topProducts,
        paymentMethodBreakdown,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = doc(db, this.COLLECTION, dateStr);
      await setDoc(docRef, { ...analyticsData, id: dateStr }, { merge: true });
    } catch (error) {
      console.error('Generate daily analytics error:', error);
      throw new Error('Failed to generate analytics');
    }
  }

  /**
   * Get analytics for a specific date
   */
  static async getAnalyticsByDate(date: Date): Promise<Analytics | null> {
    try {
      const dateStr = this.formatDate(date);
      const docRef = doc(db, this.COLLECTION, dateStr);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Generate analytics if not exists
        await this.generateDailyAnalytics(date);
        const newDocSnap = await getDoc(docRef);
        return newDocSnap.exists() ? newDocSnap.data() as Analytics : null;
      }

      return docSnap.data() as Analytics;
    } catch (error) {
      console.error('Get analytics by date error:', error);
      throw new Error('Failed to fetch analytics');
    }
  }

  /**
   * Get analytics for date range
   */
  static async getAnalyticsRange(startDate: Date, endDate: Date): Promise<Analytics[]> {
    try {
      const startStr = this.formatDate(startDate);
      const endStr = this.formatDate(endDate);

      const q = query(
        collection(db, this.COLLECTION),
        where('date', '>=', startStr),
        where('date', '<=', endStr),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Analytics);
    } catch (error) {
      console.error('Get analytics range error:', error);
      throw new Error('Failed to fetch analytics range');
    }
  }

  /**
   * Get dashboard summary
   */
  static async getDashboardSummary(): Promise<{
    todaySales: number;
    todayOrders: number;
    todayDebt: number;
    totalUsers: number;
    monthSales: number;
    weekSales: number;
  }> {
    try {
      const today = new Date();
      const todayAnalytics = await this.getAnalyticsByDate(today);

      // Get month analytics
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthAnalytics = await this.getAnalyticsRange(monthStart, today);
      const monthSales = monthAnalytics.reduce((sum, a) => sum + a.dailySales, 0);

      // Get week analytics
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      const weekAnalytics = await this.getAnalyticsRange(weekStart, today);
      const weekSales = weekAnalytics.reduce((sum, a) => sum + a.dailySales, 0);

      return {
        todaySales: todayAnalytics?.dailySales || 0,
        todayOrders: todayAnalytics?.totalOrders || 0,
        todayDebt: todayAnalytics?.totalDebt || 0,
        totalUsers: todayAnalytics?.totalUsers || 0,
        monthSales,
        weekSales,
      };
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      throw new Error('Failed to fetch dashboard summary');
    }
  }

  /**
   * Get top products for period
   */
  static async getTopProducts(startDate: Date, endDate: Date, limitCount: number = 10) {
    try {
      const analytics = await this.getAnalyticsRange(startDate, endDate);

      const productMap = new Map<string, { productId: string; productName: string; quantity: number; revenue: number }>();

      analytics.forEach(day => {
        day.topProducts.forEach(product => {
          const existing = productMap.get(product.productId);
          if (existing) {
            existing.quantity += product.quantity;
            existing.revenue += product.revenue;
          } else {
            productMap.set(product.productId, { ...product });
          }
        });
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limitCount);
    } catch (error) {
      console.error('Get top products error:', error);
      throw new Error('Failed to fetch top products');
    }
  }
}
