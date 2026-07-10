import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import UserProfile from "@/components/UserProfile";
import CompanySwitcher from "@/components/CompanySwitcher";
import AiChatbox from "@/components/AiChatbox";
import AriaChatPanel from "@/components/AriaChatPanel";
import WorkStatusBanner from "@/components/WorkStatusBanner";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Users, ClipboardList, ListTodo, LayoutDashboard,
  Building2, Settings2, Menu, X, BarChart2, CalendarCheck, Bot, ChevronDown, Wallet, TrendingUp, UserCheck, Package
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
    { to: "/tasks", label: "Tasks", Icon: ClipboardList, show: isManager || isAdmin },
    { to: "/my-tasks", label: "My Tasks", Icon: ListTodo, show: isEmployee },
    { to: "/attendance", label: "Attendance", Icon: UserCheck, show: !isAdmin },
    { to: "/work-status", label: "Work Status", Icon: CalendarCheck, show: !isAdmin && (isManager || isEmployee) },
    { to: "/team", label: "Team", Icon: BarChart2, show: isAdmin },
    { to: "/companies", label: "Companies", Icon: Building2, show: isAdmin },
    { to: "/ai-agent", label: "ARIA Agent", Icon: Bot, show: isAdmin },
    { to: "/ai-settings", label: "AI Settings", Icon: Settings2, show: isAdmin },
  ].filter((item) => item.show);

  const DesktopNavLink = ({ to, label, Icon }: NavItem) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
        isActive(to)
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );

  const MobileNavLink = ({ to, label, Icon }: NavItem) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
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
        <div className="bg-black text-gray-400 text-[11px] px-4 py-1 flex items-center gap-2">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            Active company: <strong className="text-white">{activeCompany.name}</strong>
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-40 border-b border-indigo-500/30">
        <div className="px-4 h-16 flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Left: Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-gray-400 hover:text-white hover:bg-white/10 h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-white">
                <div className="flex flex-col h-full">
                  <div className="bg-black px-4 py-4 flex items-center justify-between border-b border-indigo-500/30">
                    <div className="bg-white p-1.5 rounded-md shadow-sm">
                      <img src="/logo.png" alt="Earney Logo" className="h-5 w-auto object-contain" />
                    </div>
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {isAdmin && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">Company</p>
                      <CompanySwitcher />
                    </div>
                  )}

                  <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                      <MobileNavLink key={item.to} {...item} />
                    ))}
                    {isAdmin && (
                      <>
                        <div className="my-2 border-t border-gray-100" />
                        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin</p>
                        <MobileNavLink to="/admin-insights" label="Insights" Icon={TrendingUp} show={true} />
                        <MobileNavLink to="/attendance" label="Attendance" Icon={UserCheck} show={true} />
                        <MobileNavLink to="/admin-freelancers" label="Freelancers" Icon={Users} show={true} />
                        <MobileNavLink to="/admin-vendors" label="Vendors" Icon={Package} show={true} />
                        <MobileNavLink to="/users" label="User Management" Icon={Users} show={true} />
                        <MobileNavLink to="/admin/finance" label="Finance Control" Icon={Wallet} show={true} />
                      </>
                    )}
                  </nav>

                  {(isAdmin || isManager) && (
                    <div className="p-4 border-t border-gray-100">
                      <Button
                        onClick={() => {
                          setMobileOpen(false);
                          navigate("/dashboard", { state: { openNewProjectForm: true } });
                        }}
                        className="w-full bg-black text-white hover:bg-gray-800"
                      >
                        <Plus className="h-4 w-4 mr-2" /> New Project
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center">
              <div className="bg-white p-1.5 rounded-md shadow-sm">
                <img src="/logo.png" alt="Earney Logo" className="h-6 w-auto object-contain" />
              </div>
            </Link>
          </div>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <DesktopNavLink key={item.to} {...item} />
            ))}
            
            {/* Admin Dropdown */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-3 py-1.5 h-auto text-gray-400 hover:text-white hover:bg-white/5 rounded-md text-sm font-medium">
                    Admin <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/admin-insights')}>
                    <TrendingUp className="mr-2 h-4 w-4" /> Insights
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/attendance')}>
                    <UserCheck className="mr-2 h-4 w-4" /> Attendance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin-freelancers')}>
                    <Users className="mr-2 h-4 w-4" /> Freelancers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin-vendors')}>
                    <Package className="mr-2 h-4 w-4" /> Vendors
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/users')}>
                    <Users className="mr-2 h-4 w-4" /> User Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/finance')}>
                    <Wallet className="mr-2 h-4 w-4" /> Finance Control
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="hidden lg:block w-48 mr-2">
                <CompanySwitcher />
              </div>
            )}
            
            {(isAdmin || isManager) && (
              <Button
                onClick={() => navigate("/dashboard", { state: { openNewProjectForm: true } })}
                size="sm"
                className="hidden sm:flex bg-white text-black hover:bg-gray-200 font-medium h-9"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Project
              </Button>
            )}
            <div className="pl-2 border-l border-white/10">
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      {/* Work Status Banner — managers and employees only */}
      {(isManager || isEmployee) && <WorkStatusBanner />}

      {/* Main content */}
      <main className="flex-1 min-h-0 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          Earney Projects Management &copy; {new Date().getFullYear()}
        </div>
      </footer>

      {/* AI Chatbox (admin queries) */}
      <AiChatbox />

      {/* ARIA — two-way team communication channel (all users) */}
      <AriaChatPanel />
    </div>
  );
}
