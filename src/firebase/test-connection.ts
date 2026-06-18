/**
 * Firebase Connection Test
 * Run this to verify Firebase is properly configured
 */

import { auth, db } from './config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Test Firebase Authentication connection
 */
export async function testAuthConnection() {
  try {
    console.log('✅ Firebase Auth initialized successfully');
    console.log('Auth instance:', auth);
    console.log('Current user:', auth.currentUser);
    return true;
  } catch (error) {
    console.error('❌ Firebase Auth connection failed:', error);
    return false;
  }
}

/**
 * Test Firestore connection
 */
export async function testFirestoreConnection() {
  try {
    console.log('✅ Firestore initialized successfully');
    console.log('Firestore instance:', db);
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
    return false;
  }
}

/**
 * Create a test admin user (run this once to set up your first admin)
 *
 * @param email - Admin email
 * @param password - Admin password (min 6 characters)
 */
export async function createTestAdmin(email: string, password: string) {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: 'Admin User',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Test admin created successfully');
    console.log('Email:', email);
    console.log('UID:', user.uid);
    return user;
  } catch (error: any) {
    console.error('❌ Failed to create test admin:', error);
    throw error;
  }
}

/**
 * Test sign in with email/password
 */
export async function testSignIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Sign in successful');
    console.log('User:', userCredential.user);

    // Fetch user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (userDoc.exists()) {
      console.log('User data:', userDoc.data());
    }

    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Sign in failed:', error.message);
    throw error;
  }
}

/**
 * Run all connection tests
 */
export async function runAllTests() {
  console.log('🚀 Running Firebase connection tests...\n');

  const authTest = await testAuthConnection();
  const firestoreTest = await testFirestoreConnection();

  console.log('\n📊 Test Results:');
  console.log('Auth:', authTest ? '✅ PASS' : '❌ FAIL');
  console.log('Firestore:', firestoreTest ? '✅ PASS' : '❌ FAIL');

  if (authTest && firestoreTest) {
    console.log('\n✅ All tests passed! Firebase is ready to use.');
  } else {
    console.log('\n❌ Some tests failed. Check configuration.');
  }
}
