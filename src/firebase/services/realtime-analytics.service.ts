import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { Analytics } from '../types';

/**
 * Realtime Analytics Service
 * Provides real-time listeners for analytics data
 */
export class RealtimeAnalyticsService {
  private static readonly COLLECTION = 'analytics';

  /**
   * Format date as YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Listen to today's analytics in real-time
   */
  static subscribeToTodayAnalytics(
    callback: (analytics: Analytics | null) => void
  ): Unsubscribe {
    const dateStr = this.formatDate(new Date());
    return this.subscribeToAnalyticsByDate(new Date(), callback);
  }

  /**
   * Listen to analytics for a specific date in real-time
   */
  static subscribeToAnalyticsByDate(
    date: Date,
    callback: (analytics: Analytics | null) => void
  ): Unsubscribe {
    try {
      const dateStr = this.formatDate(date);
      const docRef = doc(db, this.COLLECTION, dateStr);

      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as Analytics);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Subscribe to analytics error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to analytics error:', error);
      return () => {};
    }
  }

  /**
   * Listen to analytics for a date range in real-time
   */
  static subscribeToAnalyticsRange(
    startDate: Date,
    endDate: Date,
    callback: (analytics: Analytics[]) => void
  ): Unsubscribe {
    try {
      const startStr = this.formatDate(startDate);
      const endStr = this.formatDate(endDate);

      const q = query(
        collection(db, this.COLLECTION),
        where('date', '>=', startStr),
        where('date', '<=', endStr),
        orderBy('date', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const analytics = snapshot.docs.map(doc => doc.data() as Analytics);
          callback(analytics);
        },
        (error) => {
          console.error('Subscribe to analytics range error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to analytics range error:', error);
      return () => {};
    }
  }

  /**
   * Listen to this month's analytics in real-time
   */
  static subscribeToMonthAnalytics(
    callback: (analytics: Analytics[]) => void
  ): Unsubscribe {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return this.subscribeToAnalyticsRange(monthStart, today, callback);
  }

  /**
   * Listen to this week's analytics in real-time
   */
  static subscribeToWeekAnalytics(
    callback: (analytics: Analytics[]) => void
  ): Unsubscribe {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    return this.subscribeToAnalyticsRange(weekStart, today, callback);
  }

  /**
   * Listen to dashboard summary in real-time
   */
  static subscribeToDashboardSummary(
    callback: (summary: {
      todaySales: number;
      todayOrders: number;
      todayDebt: number;
      totalUsers: number;
      monthSales: number;
      weekSales: number;
    }) => void
  ): Unsubscribe {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    // Subscribe to month analytics
    return this.subscribeToAnalyticsRange(monthStart, today, (monthAnalytics) => {
      const weekAnalytics = monthAnalytics.filter(a => {
        const date = new Date(a.date);
        return date >= weekStart;
      });

      const todayAnalytics = monthAnalytics.find(a => a.date === this.formatDate(today));

      const summary = {
        todaySales: todayAnalytics?.dailySales || 0,
        todayOrders: todayAnalytics?.totalOrders || 0,
        todayDebt: todayAnalytics?.totalDebt || 0,
        totalUsers: todayAnalytics?.totalUsers || 0,
        monthSales: monthAnalytics.reduce((sum, a) => sum + a.dailySales, 0),
        weekSales: weekAnalytics.reduce((sum, a) => sum + a.dailySales, 0),
      };

      callback(summary);
    });
  }
}
