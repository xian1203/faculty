import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  onSnapshot,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config';
import { DebtTransaction, User } from '../types';

/**
 * Debt Service
 * Handles debt payments, adjustments, and transactions
 */
export class DebtService {
  private static readonly TRANSACTIONS_COLLECTION = 'debtTransactions';
  private static readonly USERS_COLLECTION = 'users';
  private static readonly DEBTS_COLLECTION = 'debts';
  private static readonly ORDERS_COLLECTION = 'orders';

  /**
   * Get all debt transactions for a specific user
   */
  static async getTransactions(userId: string): Promise<DebtTransaction[]> {
    try {
      const q = query(
        collection(db, this.TRANSACTIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DebtTransaction[];
    } catch (error) {
      console.error('Error fetching debt transactions:', error);
      throw new Error('Failed to fetch debt transactions');
    }
  }

  /**
   * Process a payment for a user
   * Marks unpaid debt records as paid and updates associated orders
   */
  static async processPayment(
    userId: string, 
    amount: number, 
    description: string = 'Payment Received',
    paymentMethod: string = 'cash'
  ): Promise<void> {
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');
    
    const userRef = doc(db, this.USERS_COLLECTION, userId);
    const txnCollectionRef = collection(db, this.TRANSACTIONS_COLLECTION);

    try {
      // First, find all unpaid debt records for this user
      const unpaidDebtsQuery = query(
        collection(db, this.DEBTS_COLLECTION),
        where('userId', '==', userId),
        where('status', 'in', ['unpaid', 'partial', 'overdue'])
      );
      const unpaidDebtsSnapshot = await getDocs(unpaidDebtsQuery);
      const unpaidDebts = unpaidDebtsSnapshot.docs;

      // Update each unpaid debt to paid status and update associated orders
      for (const debtDoc of unpaidDebts) {
        const debtData = debtDoc.data();
        const orderId = debtData.orderId;

        // Update debt record
        await updateDoc(debtDoc.ref, {
          status: 'paid',
          paymentMethod: paymentMethod,
          paidDate: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Find and update corresponding order if orderId exists
        if (orderId) {
          const orderQuery = query(
            collection(db, this.ORDERS_COLLECTION),
            where('orderId', '==', orderId)
          );
          const orderSnapshot = await getDocs(orderQuery);
          
          if (!orderSnapshot.empty) {
            for (const orderDoc of orderSnapshot.docs) {
              await updateDoc(orderDoc.ref, {
                paymentStatus: 'paid',
                paymentMethod: paymentMethod,
                updatedAt: Timestamp.now(),
              });
            }
          }
        }
      }

      // Now update user balance and create transaction log
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('User does not exist');
        }

        const userData = userDoc.data() as User;
        const currentDebt = userData.currentDebt || 0;
        const newDebt = Math.max(0, currentDebt - amount);

        // Update user currentDebt
        transaction.update(userRef, {
          currentDebt: newDebt,
          updatedAt: Timestamp.now()
        });

        // Log transaction
        const newTxnRef = doc(txnCollectionRef);
        transaction.set(newTxnRef, {
          userId,
          amount: -amount, // payments are negative
          type: 'payment',
          description,
          paymentMethod,
          createdAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Adjust debt for a user
   * amount can be positive (charge) or negative (payment/credit)
   */
  static async adjustDebt(userId: string, amount: number, reason: string): Promise<void> {
    if (amount === 0) throw new Error('Adjustment amount cannot be zero');

    const userRef = doc(db, this.USERS_COLLECTION, userId);
    const txnCollectionRef = collection(db, this.TRANSACTIONS_COLLECTION);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('User does not exist');
      }

      const userData = userDoc.data() as User;
      const currentDebt = userData.currentDebt || 0;
      const newDebt = Math.max(0, currentDebt + amount);

      // Update user currentDebt
      transaction.update(userRef, {
        currentDebt: newDebt,
        updatedAt: Timestamp.now()
      });

      // Log transaction
      const newTxnRef = doc(txnCollectionRef);
      transaction.set(newTxnRef, {
        userId,
        amount,
        type: amount > 0 ? 'charge' : 'payment',
        description: reason || (amount > 0 ? 'Manual Charge Adjustment' : 'Manual Credit Adjustment'),
        createdAt: Timestamp.now()
      });
    });
  }
}

/**
 * Realtime Debt Service
 * Provides real-time subscriptions for debt records and transactions
 */
export class RealtimeDebtService {
  private static readonly TRANSACTIONS_COLLECTION = 'debtTransactions';
  private static readonly DEBT_COLLECTION = 'debts';

  /**
   * Listen to all debt records in real-time
   * Reads from the 'debts' collection in Firestore
   */
  static subscribeToDebts(
    callback: (debts: any[]) => void
  ): Unsubscribe {
    try {
      const q = query(
        collection(db, this.DEBT_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const debts = snapshot.docs.map((doc) => {
            const data = doc.data();
            // Convert Firestore Timestamps to Dates
            const convertTimestamp = (ts: any) => {
              if (!ts) return undefined;
              return ts.toDate ? ts.toDate() : ts;
            };
            
            return {
              id: doc.id,
              ...data,
              createdAt: convertTimestamp(data.createdAt),
              updatedAt: convertTimestamp(data.updatedAt),
              dueDate: convertTimestamp(data.dueDate),
              paidDate: convertTimestamp(data.paidDate),
              items: data.items || [],
            };
          });
          console.log('Loaded debt records:', debts);
          callback(debts);
        },
        (error) => {
          console.error('Subscribe to debt records error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to debt records error:', error);
      return () => {};
    }
  }

  /**
   * Listen to debt records for a specific user in real-time
   */
  static subscribeToUserDebts(
    userId: string,
    callback: (debts: any[]) => void
  ): Unsubscribe {
    try {
      const q = query(
        collection(db, this.DEBT_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const debts = snapshot.docs.map((doc) => {
            const data = doc.data();
            const convertTimestamp = (ts: any) => {
              if (!ts) return undefined;
              return ts.toDate ? ts.toDate() : ts;
            };
            
            return {
              id: doc.id,
              ...data,
              createdAt: convertTimestamp(data.createdAt),
              updatedAt: convertTimestamp(data.updatedAt),
              dueDate: convertTimestamp(data.dueDate),
              paidDate: convertTimestamp(data.paidDate),
              items: data.items || [],
            };
          });
          callback(debts);
        },
        (error) => {
          console.error('Subscribe to user debt records error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to user debt records error:', error);
      return () => {};
    }
  }

  /**
   * Listen to all debt transactions for a user in real-time
   */
  static subscribeToTransactions(
    userId: string,
    callback: (transactions: DebtTransaction[]) => void
  ): Unsubscribe {
    try {
      const q = query(
        collection(db, this.TRANSACTIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const transactions = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            } as DebtTransaction;
          });
          callback(transactions);
        },
        (error) => {
          console.error('Subscribe to debt transactions error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to debt transactions error:', error);
      return () => {};
    }
  }
}
