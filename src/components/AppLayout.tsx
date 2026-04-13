import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import UserProfile from "@/components/UserProfile";
import CompanySwitcher from "@/components/CompanySwitcher";
import AiChatbox from "@/components/AiChatbox";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Plus, Users, ClipboardList, ListTodo, LayoutDashboard,
  Building2, Settings2, Menu, X,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  Icon: React.ElementType;
  show: boolean;
}

export default function AppLayout() {
  const { isAdmin, isManager, isEmployee } = useAuth();
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, show: isAdmin || isManager },
    { to: "/companies", label: "Companies", Icon: Building2, show: isAdmin },
    { to: "/users", label: "Users", Icon: Users, show: isAdmin },
    { to: "/ai-settings", label: "AI Settings", Icon: Settings2, show: isAdmin },
    { to: "/tasks", label: "Manage Tasks", Icon: ClipboardList, show: isManager || isAdmin },
    { to: "/my-tasks", label: "My Tasks", Icon: ListTodo, show: isEmployee },
  ].filter((item) => item.show);

  const DesktopNavLink = ({ to, label, Icon }: NavItem) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
        isActive(to)
          ? "bg-white text-gray-900"
          : "text-gray-300 hover:text-white hover:bg-white/10"
      }`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );

  const MobileNavLink = ({ to, label, Icon }: NavItem) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        isActive(to)
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Active company banner */}
      {activeCompany && isAdmin && (
        <div className="bg-gray-950 text-gray-400 text-[11px] px-4 py-1 flex items-center gap-2">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            Active company: <strong className="text-white">{activeCompany.name}</strong>
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between gap-3 max-w-screen-2xl mx-auto">
          {/* Left: Logo + Company Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-gray-300 hover:text-white hover:bg-white/10 h-9 w-9 flex-shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-white">
                <div className="flex flex-col h-full">
                  {/* Mobile menu header */}
                  <div className="bg-gray-900 px-4 py-4 flex items-center justify-between">
                    <span className="text-white font-bold text-lg">Earney Projects</span>
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Company switcher in mobile */}
                  {isAdmin && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">Company</p>
                      <CompanySwitcher />
                    </div>
                  )}

                  {/* Navigation */}
                  <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                      <MobileNavLink key={item.to} {...item} />
                    ))}
                  </nav>

                  {/* Mobile new project */}
                  {(isAdmin || isManager) && (
                    <div className="p-4 border-t border-gray-100">
                      <Button
                        onClick={() => {
                          setMobileOpen(false);
                          navigate("/dashboard", { state: { openNewProjectForm: true } });
                        }}
                        className="w-full bg-gray-900 text-white hover:bg-gray-800"
                      >
                        <Plus className="h-4 w-4 mr-2" /> New Project
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link to="/dashboard" className="font-bold text-white text-lg flex-shrink-0 hidden sm:block">
              Earney
            </Link>
            <Link to="/dashboard" className="font-bold text-white text-base flex-shrink-0 sm:hidden">
              E
            </Link>

            {/* Company switcher — desktop */}
            {isAdmin && (
              <div className="hidden md:block">
                <CompanySwitcher />
              </div>
            )}

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 ml-2">
              {navItems.map((item) => (
                <DesktopNavLink key={item.to} {...item} />
              ))}
            </nav>
          </div>

          {/* Right: New Project + Avatar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {(isAdmin || isManager) && (
              <Button
                onClick={() => navigate("/dashboard", { state: { openNewProjectForm: true } })}
                size="sm"
                className="hidden sm:flex bg-white text-gray-900 hover:bg-gray-100 font-medium"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">New Project</span>
                <span className="md:hidden">New</span>
              </Button>
            )}
            <UserProfile />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-3 text-center text-gray-400 text-xs">
        Earney Projects Management &copy; {new Date().getFullYear()}
      </footer>

      {/* AI Chatbox */}
      <AiChatbox />
    </div>
  );
}
