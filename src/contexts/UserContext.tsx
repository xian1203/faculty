import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../firebase/types';
import { AuthService, RealtimeUserService } from '../firebase';

interface UserContextType {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    // Subscribe to auth state changes
    unsubscribeAuth = AuthService.onAuthStateChange((firebaseUser) => {
      if (firebaseUser?.uid) {
        // User is logged in - subscribe to their data
        unsubscribeUser = RealtimeUserService.subscribeToUser(firebaseUser.uid, (user) => {
          setCurrentUser(user);
          setError(null);
          setIsLoading(false);
        });
      } else {
        // User is logged out
        setCurrentUser(null);
        setIsLoading(false);
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = null;
        }
      }
    });

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, isLoading, error }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access the current user data
 * Use this in any component to get the logged-in user's information
 * 
 * @example
 * const { currentUser, isLoading } = useCurrentUser();
 * if (isLoading) return <div>Loading...</div>;
 * return <div>Welcome, {currentUser?.name}</div>;
 */
export function useCurrentUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
}
