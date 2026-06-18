/**
 * Admin Users Seeding Utility
 * Use this to populate Firestore with test admin and user accounts
 * 
 * Usage:
 * import { seedAdminUsers } from '@/firebase/seeds/admin-seed'
 * await seedAdminUsers()
 */

import { collection, writeBatch, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../config';
import { createUserWithEmailAndPassword } from 'firebase/auth';

interface AdminSeedData {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'faculty' | 'kiosk' | 'user';
  department?: string;
  phoneNumber?: string;
}

const ADMIN_USERS: AdminSeedData[] = [
  // Add your real admin users here
];

/**
 * Create admin and test user accounts in Firebase Auth and Firestore
 * ⚠️ Warning: This will create new user accounts
 */
export async function seedAdminUsers(): Promise<void> {
  try {
    console.log('🔄 Starting admin user seeding...');
    const now = Timestamp.now();
    let created = 0;
    let skipped = 0;

    for (const userData of ADMIN_USERS) {
      try {
        // Check if user already exists in Firestore
        const existingUserRef = doc(collection(db, 'users'), userData.email);
        let uid: string;

        // Try to find existing user by checking auth
        const userQuerySnapshot = await getDoc(doc(db, 'users_by_email', userData.email)).catch(() => null);

        if (userQuerySnapshot?.exists()) {
          console.log(`⏭️  Skipping ${userData.email} - already exists`);
          skipped++;
          continue;
        }

        try {
          // Create user in Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
          uid = userCredential.user.uid;

          console.log(`✅ Created auth user: ${userData.email} (${uid})`);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            console.log(`⏭️  Skipping ${userData.email} - auth user already exists`);
            skipped++;
            continue;
          }
          throw authError;
        }

        // Create user document in Firestore
        const userDoc = {
          uid,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          department: userData.department,
          phoneNumber: userData.phoneNumber,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          lastLogin: now,
        };

        const batch = writeBatch(db);
        batch.set(doc(db, 'users', uid), userDoc);
        await batch.commit();

        console.log(`✅ Created Firestore user: ${userData.name} (${userData.role})`);
        created++;
      } catch (error: any) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log(`\n✨ Admin user seeding completed!`);
    console.log(`   Created: ${created} users`);
    console.log(`   Skipped: ${skipped} users`);
  } catch (error) {
    console.error('❌ Error seeding admin users:', error);
    throw error;
  }
}

/**
 * Get all seeded admin/test users for reference
 */
export function getAdminSeedUsers(): AdminSeedData[] {
  return ADMIN_USERS;
}

/**
 * Print seeded users to console
 */
export function printTestCredentials(): void {
  if (ADMIN_USERS.length === 0) {
    console.log('📋 No admin users configured. Add users to ADMIN_USERS array in this file.');
    return;
  }
  console.log('\n📋 Configured Users:');
  console.log('─'.repeat(60));
  ADMIN_USERS.forEach((user) => {
    console.log(`\nRole: ${user.role.toUpperCase()}`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Name: ${user.name}`);
  });
  console.log('─'.repeat(60));
}
