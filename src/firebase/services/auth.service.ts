import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from '../config';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { User, UserRole } from '../types';

/**
 * Authentication Service
 * Handles all authentication-related operations
 */
export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = await this.getUserData(userCredential.user.uid);

      if (!user) {
        throw new Error('User data not found');
      }

      if (!user.isActive) {
        await this.signOut();
        throw new Error('Account is deactivated. Contact administrator.');
      }

      // Update last login
      await this.updateLastLogin(user.uid);

      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Create new user with email and password
   * @admin Only admins can create users
   */
  static async createUser(
    email: string,
    password: string,
    userData: {
      name: string;
      role: UserRole;
      department?: string;
      rfidUid?: string;
      phoneNumber?: string;
      photoURL?: string;
    }
  ): Promise<User> {
    try {
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Create user document in Firestore
      const newUser: User = {
        uid,
        email,
        name: userData.name,
        role: userData.role,
        isActive: true,
        balance: 0, // Initialize balance to 0
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Only add optional fields if they have values (Firestore rejects undefined)
      if (userData.department) newUser.department = userData.department;
      if (userData.rfidUid) newUser.rfidUid = userData.rfidUid;
      if (userData.phoneNumber) newUser.phoneNumber = userData.phoneNumber;
      if (userData.photoURL) newUser.photoURL = userData.photoURL;

      await setDoc(doc(db, 'users', uid), newUser);

      return newUser;
    } catch (error: any) {
      console.error('Create user error:', error);
      throw new Error(error.message || 'Failed to create user');
    }
  }

  /**
   * Get user data from Firestore
   */
  static async getUserData(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (!userDoc.exists()) {
        return null;
      }

      return userDoc.data() as User;
    } catch (error) {
      console.error('Get user data error:', error);
      return null;
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        lastLogin: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('Update last login error:', error);
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  /**
   * Update user password
   */
  static async updateUserPassword(newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user signed in');
      }

      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('Update password error:', error);
      throw new Error(error.message || 'Failed to update password');
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Check if user has admin role
   */
  static async isAdmin(uid: string): Promise<boolean> {
    const user = await this.getUserData(uid);
    return user?.role === 'admin';
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(uid: string, role: UserRole): Promise<boolean> {
    const user = await this.getUserData(uid);
    return user?.role === role;
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}
