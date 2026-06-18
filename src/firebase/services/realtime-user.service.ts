import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { User, UserRole } from '../types';
import { UserService } from './user.service';

/**
 * Realtime User Service
 * Provides real-time listeners for user data
 */
export class RealtimeUserService {
  private static readonly COLLECTION = 'users';

  /**
   * Listen to all users in real-time
   * @admin Only admins should use this
   */
  static subscribeToUsers(
    callback: (users: User[]) => void,
    filters?: {
      role?: UserRole;
      isActive?: boolean;
      department?: string;
      limitCount?: number;
    }
  ): Unsubscribe {
    try {
      const constraints: QueryConstraint[] = [];

      if (filters?.role) {
        constraints.push(where('role', '==', filters.role));
      }

      if (filters?.isActive !== undefined) {
        constraints.push(where('isActive', '==', filters.isActive));
      }

      if (filters?.department) {
        constraints.push(where('department', '==', filters.department));
      }

      const q = query(collection(db, this.COLLECTION), ...constraints);

      return onSnapshot(
        q,
        (snapshot) => {
          let users = snapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id
          } as User));
          
          // Sort by createdAt descending client-side to avoid Firestore index requirement
          users.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return timeB - timeA;
          });

          if (filters?.limitCount) {
            users = users.slice(0, filters.limitCount);
          }

          callback(users);
        },
        (error) => {
          console.error('Subscribe to users error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to users error:', error);
      return () => {};
    }
  }

  /**
   * Listen to a specific user in real-time
   */
  static subscribeToUser(
    uid: string,
    callback: (user: User | null) => void
  ): Unsubscribe {
    try {
      const docRef = doc(db, this.COLLECTION, uid);

      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            // Ensure uid is always set from the document ID
            callback({
              ...data,
              uid: snapshot.id
            } as User);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Subscribe to user error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to user error:', error);
      return () => {};
    }
  }

  /**
   * Listen to active users count in real-time
   */
  static subscribeToActiveUsersCount(
    callback: (count: number) => void
  ): Unsubscribe {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('isActive', '==', true)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.size);
        },
        (error) => {
          console.error('Subscribe to active users count error:', error);
        }
      );
    } catch (error) {
      console.error('Subscribe to active users count error:', error);
      return () => {};
    }
  }

  /**
   * Listen to users by role in real-time
   */
  static subscribeToUsersByRole(
    role: UserRole,
    callback: (users: User[]) => void
  ): Unsubscribe {
    return this.subscribeToUsers(callback, { role });
  }
}
