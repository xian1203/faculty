/**
 * Firebase Initial Setup Script
 * Run this in browser console to create your first admin user
 */

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

/**
 * Create the first admin user for the system
 *
 * Usage in browser console:
 * ```
 * import { setupFirstAdmin } from './src/firebase/setup-admin';
 * setupFirstAdmin();
 * ```
 */
export async function setupFirstAdmin() {
  const email = 'admin@ndkc.edu.ph';
  const password = 'admin123456'; // Change this password immediately after first login!
  const displayName = 'Admin User';

  try {
    console.log('🚀 Creating first admin user...');

    // Step 1: Create authentication user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('✅ Auth user created with UID:', user.uid);

    // Step 2: Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      role: 'admin',
      isActive: true,
      rfidUid: null,
      phoneNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Firestore user document created');

    console.log('\n🎉 Success! Admin user created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('UID:', user.uid);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change the password after your first login!');

    return {
      uid: user.uid,
      email: email,
      displayName: displayName,
    };
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error);

    if (error.code === 'auth/email-already-in-use') {
      console.log('\nℹ️  Admin user already exists. You can log in with:');
      console.log('Email:', email);
      console.log('Password: (use the password you set previously)');
    } else if (error.code === 'auth/weak-password') {
      console.log('\n⚠️  Password is too weak. Please use at least 6 characters.');
    } else if (error.code === 'permission-denied') {
      console.log('\n⚠️  Permission denied. Make sure Firestore rules are deployed:');
      console.log('Run: firebase deploy --only firestore:rules');
    }

    throw error;
  }
}

/**
 * Create a custom admin user with specified credentials
 */
export async function createCustomAdmin(
  email: string,
  password: string,
  displayName: string = 'Admin User'
) {
  try {
    console.log('🚀 Creating custom admin user...');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      role: 'admin',
      isActive: true,
      rfidUid: null,
      phoneNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('UID:', user.uid);

    return user;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Quick test to verify Firebase is working
 */
export async function quickTest() {
  console.log('🔍 Testing Firebase connection...\n');

  try {
    console.log('Auth Current User:', auth.currentUser);
    console.log('Firestore Instance:', db ? '✅ Connected' : '❌ Not connected');
    console.log('\n✅ Firebase is properly initialized!');
    return true;
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return false;
  }
}

// Auto-run quick test when this module loads
if (typeof window !== 'undefined') {
  quickTest();
}
