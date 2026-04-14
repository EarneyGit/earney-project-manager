import React, { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";

// Lazy load heavier pages
const UserManagementPage  = lazy(() => import("./pages/UserManagement"));
const TaskManagementPage  = lazy(() => import("./pages/TaskManagement"));
const MyTasksPage         = lazy(() => import("./pages/MyTasks"));
const CompaniesPage       = lazy(() => import("./pages/Companies"));
const AiSettingsPage      = lazy(() => import("./pages/AiSettings"));
const TeamPerformancePage = lazy(() => import("./pages/TeamPerformance"));
const WorkStatusPage      = lazy(() => import("./pages/WorkStatus"));
const AiAgentDashboardPage = lazy(() => import("./pages/AiAgentDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
  </div>
);

const Lazy = ({ Page }: { Page: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<PageLoader />}>
    <Page />
  </Suspense>
);

function App() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handler = (event: ErrorEvent) => { setError(event.error); return false; };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (error) {
    return (
      <div className="p-4 m-4 border border-red-500 rounded">
        <h1 className="text-xl font-bold text-red-500">Something went wrong</h1>
        <p>{error.message}</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => window.location.href = "/auth"}>Reset</button>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Auth must come before Company (Company needs auth for API calls) */}
        <AuthProvider>
          <CompanyProvider>
            <ProjectProvider>
              <BrowserRouter>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public */}
                  <Route path="/auth" element={<Auth />} />

                  {/* Protected — all authenticated users */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      {/* Admin + Manager */}
                      <Route path="/dashboard" element={<Index />} />
                      <Route path="/tasks" element={<Lazy Page={TaskManagementPage} />} />

                      {/* Admin only */}
                      <Route path="/users" element={<Lazy Page={UserManagementPage} />} />
                      <Route path="/companies" element={<Lazy Page={CompaniesPage} />} />
                      <Route path="/ai-settings" element={<Lazy Page={AiSettingsPage} />} />
                      <Route path="/ai-agent" element={<Lazy Page={AiAgentDashboardPage} />} />
                      <Route path="/team" element={<Lazy Page={TeamPerformancePage} />} />

                      {/* Employee */}
                      <Route path="/my-tasks" element={<Lazy Page={MyTasksPage} />} />

                      {/* Manager + Employee */}
                      <Route path="/work-status" element={<Lazy Page={WorkStatusPage} />} />
                    </Route>
                  </Route>

                  {/* Redirect root */}
                  <Route path="/" element={<Navigate to="/auth" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ProjectProvider>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
