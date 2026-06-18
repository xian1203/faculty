import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  QueryConstraint,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config';
import { Topup, User } from '../types';

/**
 * Topup Service
 * Handles unified top-up system for both kiosk requests and admin manual top-ups
 */
export class TopupService {
  private static readonly COLLECTION = 'topups';
  private static readonly USERS_COLLECTION = 'users';

  /**
   * 1. Kiosk Top-up Flow (Request Only)
   * Creates a pending topup request. Does NOT update user balance.
   */
  static async requestKioskTopup(
    userId: string,
    userName: string,
    rfidUid: string,
    amount: number
  ): Promise<string> {
    if (amount <= 0) {
      throw new Error('Top-up amount must be greater than 0');
    }

    try {
      const topupRef = doc(collection(db, this.COLLECTION));
      const topupData: Omit<Topup, 'id'> = {
        userId,
        userName,
        rfidUid,
        amount,
        status: 'pending',
        source: 'kiosk',
        createdAt: Timestamp.now()
      };

      await setDoc(topupRef, topupData);
      return topupRef.id;
    } catch (error) {
      console.error('Kiosk top-up request error:', error);
      throw new Error('Failed to create kiosk top-up request');
    }
  }

  /**
   * 2. Admin Top-up (Manual)
   * Directly updates users.balance and creates an approved topup record.
   * Called when admin initiates a top-up for a user (immediately approved)
   */
  static async adminManualTopup(
    userId: string,
    userName: string,
    rfidUid: string,
    photoURL: string | undefined,
    amount: number,
    adminId: string,
    adminName: string,
    note?: string
  ): Promise<string> {
    if (amount <= 0) {
      throw new Error('Top-up amount must be greater than 0');
    }

    if (!adminId || !adminName) {
      throw new Error('Admin ID and name are required');
    }

    try {
      const topupId = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, this.USERS_COLLECTION, userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data() as User;
        const currentBalance = userData.balance || 0;
        const newBalance = currentBalance + amount;

        // Update user balance
        transaction.update(userRef, { 
          balance: newBalance,
          updatedAt: Timestamp.now()
        });

        // Create approved topup record with all required fields
        const topupRef = doc(collection(db, this.COLLECTION));
        const topupData: any = {
          userId,
          userName,
          rfidUid,
          photoURL: photoURL || null,
          amount,
          method: 'admin_topup',
          status: 'approved',
          note: note || 'Admin top-up',
          processedBy: adminId, // guaranteed non-null from validation above
          processedByName: adminName, // guaranteed non-null from validation above
          createdAt: Timestamp.now(),
          processedAt: Timestamp.now(),
        };
        
        transaction.set(topupRef, topupData);

        return topupRef.id;
      });

      return topupId;
    } catch (error) {
      console.error('Admin manual top-up error:', error);
      throw new Error('Failed to process admin manual top-up');
    }
  }

  /**
   * 3a. Admin Approval Flow
   * Approves a kiosk request: adds amount to user balance and updates status to approved.
   */
  static async approveTopup(topupId: string, adminId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const topupRef = doc(db, this.COLLECTION, topupId);
        const topupDoc = await transaction.get(topupRef);

        if (!topupDoc.exists()) {
          throw new Error('Top-up request not found');
        }

        const topupData = topupDoc.data() as Topup;

        // Prevent double approval
        if (topupData.status !== 'pending') {
          throw new Error(`Top-up is already ${topupData.status}`);
        }

        if (topupData.amount <= 0) {
          throw new Error('Invalid top-up amount');
        }

        const userRef = doc(db, this.USERS_COLLECTION, topupData.userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data() as User;
        const currentBalance = userData.balance || 0;
        const newBalance = currentBalance + topupData.amount;

        // Update user balance
        transaction.update(userRef, { balance: newBalance });

        // Update top-up status
        transaction.update(topupRef, {
          status: 'approved',
          processedAt: Timestamp.now(),
          processedBy: adminId
        });
      });
    } catch (error) {
      console.error('Approve top-up error:', error);
      throw new Error('Failed to approve top-up');
    }
  }

  /**
   * 3b. Admin Rejection Flow
   * Rejects a kiosk request: updates status to rejected without modifying balance.
   */
  static async rejectTopup(topupId: string, adminId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const topupRef = doc(db, this.COLLECTION, topupId);
        const topupDoc = await transaction.get(topupRef);

        if (!topupDoc.exists()) {
          throw new Error('Top-up request not found');
        }

        const topupData = topupDoc.data() as Topup;

        // Prevent rejecting already processed top-ups
        if (topupData.status !== 'pending') {
          throw new Error(`Top-up is already ${topupData.status}`);
        }

        // Update top-up status
        transaction.update(topupRef, {
          status: 'rejected',
          processedAt: Timestamp.now(),
          processedBy: adminId
        });
      });
    } catch (error) {
      console.error('Reject top-up error:', error);
      throw new Error('Failed to reject top-up');
    }
  }

  /**
   * 6. Filtering Support
   * Retrieves top-ups with optional filters for dashboard.
   */
  static async getTopups(filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    source?: 'kiosk' | 'admin';
    limitCount?: number;
  }): Promise<Topup[]> {
    try {
      const constraints: QueryConstraint[] = [];

      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.source) {
        constraints.push(where('source', '==', filters.source));
      }

      const q = query(collection(db, this.COLLECTION), ...constraints);
      const snapshot = await getDocs(q);

      let topups = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as Topup;
      });

      // Sort by createdAt descending client-side
      topups.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      if (filters?.limitCount) {
        topups = topups.slice(0, filters.limitCount);
      }

      return topups;
    } catch (error) {
      console.error('Get top-ups error:', error);
      throw new Error('Failed to fetch top-ups');
    }
  }
}
