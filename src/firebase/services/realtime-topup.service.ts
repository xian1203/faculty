import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config';
import { Topup } from '../types';

/**
 * Realtime Topup Service
 * Provides live subscriptions to top-up requests (especially pending ones)
 */
export class RealtimeTopupService {
  private static readonly COLLECTION = 'topups';

  /**
   * Subscribes to all pending top-ups for the admin dashboard
   * @param callback Function called whenever the pending top-ups change
   * @returns Unsubscribe function
   */
  static subscribeToPendingTopups(callback: (topups: Topup[]) => void): () => void {
    const q = query(
      collection(db, this.COLLECTION),
      where('status', '==', 'pending')
    );

    return onSnapshot(q, (snapshot) => {
      const topups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Topup[];

      // Sort client-side by createdAt descending to avoid needing a composite index
      topups.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      callback(topups);
    }, (error) => {
      console.error('Realtime top-ups error:', error);
    });
  }
}
