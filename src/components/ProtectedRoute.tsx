import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  allowedRoles?: ("admin" | "editor")[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser, isLoading, authError } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("ProtectedRoute - auth status:", isAuthenticated, "loading:", isLoading);
    console.log("ProtectedRoute - current location:", location.pathname);
    console.log("ProtectedRoute - currentUser:", currentUser);
    
    if (!isLoading) {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to continue",
        variant: "destructive"
      });
    } else if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
      toast({
        title: "Access denied",
        description: "You don't have permission to view this page",
        variant: "destructive"
      });
    }
    }
  }, [isAuthenticated, currentUser, allowedRoles, location.pathname, isLoading]);

  // Show loading state
  if (isLoading) {
    console.log("Auth loading in ProtectedRoute...");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show auth error state
  if (authError) {
    console.error("Auth error in ProtectedRoute:", authError);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="mb-4">{authError.message}</p>
          <button 
            onClick={() => window.location.href = '/auth'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to auth");
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // If specific roles are required, check if user has permission
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    // User doesn't have the required role
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has the required role (if specified)
  console.log("User authenticated, rendering protected content");
  return <Outlet />;
}
