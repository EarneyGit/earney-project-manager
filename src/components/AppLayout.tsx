
import React from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { Plus, Users, ClipboardList, ListTodo, LayoutDashboard } from "lucide-react";

export default function AppLayout() {
  const { isAdmin, isManager, isEmployee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLink = (to: string, label: string, Icon: any) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
        isActive(to)
          ? "bg-white text-black font-medium"
          : "text-white hover:bg-white/10"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-black text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Earney Projects</h1>

            <nav className="ml-8 hidden md:flex items-center gap-1">
              {/* Admin & Manager: Dashboard */}
              {(isAdmin || isManager) && navLink("/dashboard", "Dashboard", LayoutDashboard)}

              {/* Admin only: Manage Users */}
              {isAdmin && navLink("/users", "Manage Users", Users)}

              {/* Manager only: Manage Tasks */}
              {isManager && navLink("/tasks", "Manage Tasks", ClipboardList)}

              {/* Employee only: My Tasks */}
              {isEmployee && navLink("/my-tasks", "My Tasks", ListTodo)}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* New Project — Admin & Manager */}
            {(isAdmin || isManager) && (
              <Button
                onClick={() => navigate("/dashboard", { state: { openNewProjectForm: true } })}
                className="bg-white text-black hover:bg-gray-200"
              >
                <Plus size={16} className="mr-1" /> New Project
              </Button>
            )}

            <UserProfile />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-50 py-4 text-center text-gray-500 text-sm">
        <div className="container mx-auto">
          Earney Projects Management &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
