import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { Project } from "@/types/project";
import { toast } from "@/hooks/use-toast";
import { projectService } from "@/services/project-service";
import { useAuth } from "@/contexts/AuthContext";

// Check if we're in development environment
const isDev = import.meta.env.DEV;

// Create context with proper type
interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  addProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, project: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => Promise<Project>;
  refreshProjects: () => Promise<void>;
  isDevelopment: boolean;
}

// Create the context with a default value
export const ProjectContext = createContext<ProjectContextType | null>(null);

// Custom hook to use the project context
export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};

// Provider component - IMPORTANT: Not exporting as default
// This fixes HMR issues
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, only load when authenticated
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch all projects from API - only if authenticated
  const fetchProjects = useCallback(async (silent = false) => {
    if (!isAuthenticated) {
      console.log('Skipping project fetch - user not authenticated');
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      } 
      const data = await projectService.getProjects();
      console.log('Fetched projects:', data); // Debug log
      setProjects(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching projects:', err); // Debug log
      setError(err?.message || "Failed to load projects");
      setProjects([]); // Set empty array on error
      toast({
        variant: "destructive",
        title: "Error loading projects",
        description: err?.message || "There was a problem loading projects from the API."
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Clear projects when user logs out
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      console.log('User not authenticated - clearing projects');
      setProjects([]);
      setError(null);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Initialize projects when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('User authenticated - fetching projects');
      fetchProjects();
    }
  }, [isAuthenticated, authLoading, fetchProjects]);

  // Add a new project - only if authenticated
  const addProject = async (project: Partial<Project>) => {
    if (!isAuthenticated) {
      throw new Error("Authentication required to create projects");
    }

    try {
      const newProject = await projectService.createProject(project);
      await fetchProjects(true);
      toast({
        title: "Project created",
        description: "Project has been successfully saved."
      });
      return newProject;
    } catch (err: any) {
      console.error('Error creating project:', err);
      toast({
        variant: "destructive",
        title: "Error creating project",
        description: err?.message || "Failed to save project."
      });
      throw err;
    }
  };

  // Update an existing project - only if authenticated
  const updateProject = async (id: string, updatedProjectData: Partial<Project>) => {
    if (!isAuthenticated) {
      throw new Error("Authentication required to update projects");
    }

    try {
      const updatedProject = await projectService.updateProject(id, updatedProjectData);
      await fetchProjects(true);
      toast({
        title: "Project updated",
        description: "Changes have been saved."
      });
      return updatedProject;
    } catch (err: any) {
      console.error('Error updating project:', err);
      toast({
        variant: "destructive",
        title: "Error updating project",
        description: err?.message || "Failed to save changes."
      });
      throw err;
    }
  };

  // Delete a project - only if authenticated
  const deleteProject = async (id: string) => {
    if (!isAuthenticated) {
      throw new Error("Authentication required to delete projects");
    }

    try {
      await projectService.deleteProject(id);
      setProjects(prev => prev?.filter(project => {
        const projectId = project?._id || project?.id;
        return projectId !== id;
      }) || []);
      toast({
        title: "Project deleted",
        description: "Project has been removed."
      });
    } catch (err: any) {
      console.error('Error deleting project:', err);
      toast({
        variant: "destructive",
        title: "Error deleting project",
        description: err?.message || "Failed to delete the project."
      });
      throw err;
    }
  };

  // Get a project by ID - only if authenticated
  const getProjectById = async (id: string) => {
    if (!isAuthenticated) {
      throw new Error("Authentication required to access projects");
    }

    try {
      return await projectService.getProject(id);
    } catch (err: any) {
      console.error('Error loading project by ID:', err);
      toast({
        variant: "destructive",
        title: "Error loading project",
        description: err?.message || "Failed to retrieve project details."
      });
      throw err;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        error,
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
        refreshProjects: fetchProjects,
        isDevelopment: isDev
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
