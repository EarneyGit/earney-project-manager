import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function AppLayout() {
  const { isAdmin, isEditor } = useAuth();
  const { isDevelopment } = useProjects();
  const navigate = useNavigate();
  
  const handleNewProject = () => {
    navigate('/dashboard', { state: { openNewProjectForm: true } });
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-black text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Earney Projects</h1>
            
            {/* Navigation */}
            <nav className="ml-8 hidden md:flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="text-white hover:text-gray-300 transition-colors"
              >
                Dashboard
              </Link>
              
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            {/* New Project button */}
            {(isAdmin || isEditor) && (
              <Button 
                onClick={handleNewProject}
                className="bg-white text-black hover:bg-gray-200"
              >
                <Plus size={16} className="mr-1" /> New Project
              </Button>
            )}
            
            {/* User profile */}
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
