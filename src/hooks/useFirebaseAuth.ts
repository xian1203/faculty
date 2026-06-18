/**
 * Firebase Authentication Hook
 * Manages authentication state and provides auth methods
 */

import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User } from '../firebase/types';

interface AuthState {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  error: Error | null;
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Fetch user data from Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              setAuthState({
                user: firebaseUser,
                userData,
                loading: false,
                error: null,
              });
            } else {
              // User exists in Auth but not in Firestore
              console.warn('User authenticated but no Firestore document found');
              setAuthState({
                user: firebaseUser,
                userData: null,
                loading: false,
                error: new Error('User data not found'),
              });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setAuthState({
              user: firebaseUser,
              userData: null,
              loading: false,
              error: error as Error,
            });
          }
        } else {
          // User is signed out
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            error: null,
          });
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setAuthState({
          user: null,
          userData: null,
          loading: false,
          error,
        });
      }
    );

    return () => unsubscribe();
  }, []);

  return authState;
}
