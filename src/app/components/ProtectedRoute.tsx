import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AuthService } from '../../firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * Ensures user is authenticated before allowing access to protected routes
 * Redirects to login if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = AuthService.onAuthStateChange((user) => {
      if (user) {
        // User is logged in
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        // User is not logged in - redirect to login
        setIsAuthenticated(false);
        setIsLoading(false);
        navigate('/login', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-2xl text-primary animate-spin">
              progress_activity
            </span>
          </div>
          <p className="text-muted-foreground font-medium">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render the protected content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated, return null (redirect already triggered)
  return null;
}
