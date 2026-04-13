import React from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import UserProfile from "@/components/UserProfile";
import CompanySwitcher from "@/components/CompanySwitcher";
import AiChatbox from "@/components/AiChatbox";
import { Button } from "@/components/ui/button";
import {
  Plus, Users, ClipboardList, ListTodo, LayoutDashboard, Building2, Settings2,
} from "lucide-react";

export default function AppLayout() {
  const { isAdmin, isManager, isEmployee } = useAuth();
  const { activeCompany } = useCompany();
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
      <header className="bg-black text-white shadow-md">
        {/* Active company banner — subtle top strip */}
        {activeCompany && isAdmin && (
          <div className="bg-gray-900 text-gray-400 text-[11px] px-4 py-1 flex items-center gap-2">
            <Building2 className="h-3 w-3" />
            <span>Active company: <strong className="text-white">{activeCompany.name}</strong></span>
          </div>
        )}
        <div className="p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-xl font-bold">Earney Projects</h1>

              {/* Company switcher — admin only */}
              {isAdmin && (
                <div className="hidden sm:block">
                  <CompanySwitcher />
                </div>
              )}

              <nav className="ml-2 hidden md:flex items-center gap-1">
                {/* Admin & Manager: Dashboard */}
                {(isAdmin || isManager) && navLink("/dashboard", "Dashboard", LayoutDashboard)}

                {/* Admin only */}
                {isAdmin && navLink("/companies", "Companies", Building2)}
                {isAdmin && navLink("/users", "Manage Users", Users)}
                {isAdmin && navLink("/ai-settings", "AI Settings", Settings2)}

                {/* Manager: Manage Tasks */}
                {(isManager || isAdmin) && navLink("/tasks", "Manage Tasks", ClipboardList)}

                {/* Employee: My Tasks */}
                {isEmployee && navLink("/my-tasks", "My Tasks", ListTodo)}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* New Project — Admin & Manager */}
              {(isAdmin || isManager) && (
                <Button
                  onClick={() => navigate("/dashboard", { state: { openNewProjectForm: true } })}
                  className="bg-white text-black hover:bg-gray-200"
                  size="sm"
                >
                  <Plus size={14} className="mr-1" /> New Project
                </Button>
              )}
              <UserProfile />
            </div>
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

      {/* AI Chatbox — floats above everything */}
      <AiChatbox />
    </div>
  );
}
