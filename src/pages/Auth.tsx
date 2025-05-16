import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function Auth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";
  
  useEffect(() => {
    // Clear any previous error messages
    console.log("Auth page mounted - current auth status:", isAuthenticated);
  }, [isAuthenticated]);
  
  // If user is already authenticated, redirect to the requested page or dashboard
  if (isAuthenticated) {
    console.log("User is authenticated, redirecting to:", from);
    return <Navigate to={from} replace />;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Earney Projects</h1>
          <p className="text-gray-500 mt-2">Project Management Dashboard</p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
}
