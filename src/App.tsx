import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProjectProvider } from "./contexts/ProjectContext";
import { AuthProvider } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";

// Create a query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ProjectProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Auth route - accessible to everyone */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Protected dashboard route */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Index />} />
                    <Route 
                      path="/admin" 
                      element={
                        <div className="container mx-auto p-8">
                          <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
                          <p>Admin functionality will be implemented here.</p>
                        </div>
                      } 
                    />
                  </Route>
                </Route>
                
                {/* Redirect root to auth for now */}
                <Route path="/" element={<Navigate to="/auth" replace />} />
                
                {/* Catch-all route for 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ProjectProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
