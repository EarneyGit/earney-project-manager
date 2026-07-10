import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";
import { Navigate, useLocation } from "react-router-dom";
import { Building2 } from "lucide-react";

export default function Auth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Earney Logo" className="h-24 w-auto mx-auto object-contain drop-shadow-sm" />
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
}
