import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config';
import { User, CreateUserInput, UpdateUserInput, UserRole } from '../types';

/**
 * User Service
 * Handles all user-related database operations
 */
export class UserService {
  private static readonly COLLECTION = 'users';

  /**
   * Get all users
   * @admin Only admins can access
   */
  static async getUsers(filters?: {
    role?: UserRole;
    isActive?: boolean;
    department?: string;
    limitCount?: number;
  }): Promise<User[]> {
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
      const snapshot = await getDocs(q);

      let users = snapshot.docs.map(doc => doc.data() as User);

      // Sort by createdAt descending client-side to avoid Firestore index requirement
      users.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      if (filters?.limitCount) {
        users = users.slice(0, filters.limitCount);
      }

      return users;
    } catch (error) {
      console.error('Get users error:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(uid: string): Promise<User | null> {
    try {
      const docRef = doc(db, this.COLLECTION, uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as User;
    } catch (error) {
      console.error('Get user error:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('email', '==', email),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as User;
    } catch (error) {
      console.error('Get user by email error:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Get user by RFID UID
   */
  static async getUserByRfid(rfidUid: string): Promise<User | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('rfidUid', '==', rfidUid),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as User;
    } catch (error) {
      console.error('Get user by RFID error:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Update user
   * @admin Only admins can update users
   */
  static async updateUser(uid: string, data: UpdateUserInput): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, uid);

      // Filter out undefined values (Firestore rejects undefined)
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(docRef, {
        ...updateData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update user role
   * @admin Only admins can change roles
   */
  static async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      await this.updateUser(uid, { role });
    } catch (error) {
      console.error('Update user role error:', error);
      throw new Error('Failed to update user role');
    }
  }

  /**
   * Deactivate user (soft delete)
   * @admin Only admins can deactivate users
   */
  static async deactivateUser(uid: string): Promise<void> {
    try {
      await this.updateUser(uid, { isActive: false });
    } catch (error) {
      console.error('Deactivate user error:', error);
      throw new Error('Failed to deactivate user');
    }
  }

  /**
   * Activate user
   * @admin Only admins can activate users
   */
  static async activateUser(uid: string): Promise<void> {
    try {
      await this.updateUser(uid, { isActive: true });
    } catch (error) {
      console.error('Activate user error:', error);
      throw new Error('Failed to activate user');
    }
  }

  /**
   * Delete user permanently
   * @admin Only admins can delete users
   * @warning This is a hard delete and cannot be undone
   */
  static async deleteUser(uid: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, uid);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Delete user error:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get users count by role
   */
  static async getUsersCountByRole(role: UserRole): Promise<number> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('role', '==', role)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Get users count error:', error);
      return 0;
    }
  }

  /**
   * Get active users count
   */
  static async getActiveUsersCount(): Promise<number> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Get active users count error:', error);
      return 0;
    }
  }
}
