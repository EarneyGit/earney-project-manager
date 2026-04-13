
import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";
import { Navigate, useLocation } from "react-router-dom";

export default function Auth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-gray-900 font-bold text-lg">E</span>
            </div>
            <span className="text-white font-bold text-xl">Earney Projects</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-snug">
            Manage projects.<br />
            <span className="text-indigo-400">Empower teams.</span><br />
            Drive results.
          </h2>
          <p className="text-gray-400 mt-4 text-lg leading-relaxed">
            A unified dashboard for admins, managers, and teams — with AI-powered executive insights.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex gap-4">
            {[
              { label: "Role-based access", icon: "🔐" },
              { label: "AI Executive Advisor", icon: "🤖" },
              { label: "Multi-company", icon: "🏢" },
            ].map((f) => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-lg">{f.icon}</span>
                <span className="text-white text-xs font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-2xl">E</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Earney Projects</h1>
            <p className="text-gray-500 text-sm mt-1">Project Management Dashboard</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
