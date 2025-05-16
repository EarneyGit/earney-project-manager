import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { Project } from "@/types/project";
import { toast } from "@/hooks/use-toast";

// Check if we're in development environment
const isDev = import.meta.env.DEV;

// Local storage key
const STORAGE_KEY = "projects_data";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Save projects to localStorage
  const saveProjectsToStorage = (projectsData: Project[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsData));
    } catch (err) {
      console.error("Error saving to localStorage:", err);
    }
  };

  // Fetch all projects from localStorage
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching projects from localStorage...');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const storedProjects = localStorage.getItem(STORAGE_KEY);
      const data = storedProjects ? JSON.parse(storedProjects) : [];
      
      console.log('Projects fetched successfully:', data.length + ' projects');
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects");
      
      toast({
        variant: "destructive",
        title: "Error loading projects",
        description: err.message || "There was a problem loading projects from local storage."
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Calculate pending payment based on other values
  const calculatePendingPayment = (project: Partial<Project>) => {
    const budget = project.budget || 0;
    const advancePayment = project.advancePayment || 0;
    const partialPayments = project.partialPayments || 0;
    const partialPaymentsValue = typeof partialPayments === 'number' ? partialPayments : 0;
    
    return Math.max(0, budget - (advancePayment + partialPaymentsValue));
  };

  // Add a new project
  const addProject = async (project: Partial<Project>) => {
    try {
      console.log('Adding new project to localStorage...');
      
      const pendingPayment = calculatePendingPayment(project);
      const newProject = { 
        ...project, 
        id: uuidv4(),
        pendingPayment
      } as Project;
      
      // Add to local state
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      
      // Save to localStorage
      saveProjectsToStorage(updatedProjects);
      
      toast({
        title: "Project created",
        description: "Project has been successfully saved."
      });
      
      return newProject;
    } catch (err) {
      console.error("Error adding project:", err);
      
      toast({
        variant: "destructive",
        title: "Error creating project",
        description: err.message || "Failed to save project."
      });
      
      throw err;
    }
  };

  // Update an existing project
  const updateProject = async (id: string, updatedProjectData: Partial<Project>) => {
    try {
      // Find the project to update
      const projectToUpdate = projects.find(p => p.id === id);
      if (!projectToUpdate) {
        throw new Error(`Project with ID ${id} not found`);
      }
      
      // Merge the updated data with existing project data
      const mergedProject = { ...projectToUpdate, ...updatedProjectData };
      
      // Calculate pending payment based on the merged data
      const pendingPayment = calculatePendingPayment(mergedProject);
      
      // Add pending payment to the update data
      const finalUpdateData = { 
        ...updatedProjectData, 
        pendingPayment 
      };
      
      // Update in local state
      const updatedProjects = projects.map(project =>
        project.id === id ? { ...project, ...finalUpdateData } : project
      );
      
      setProjects(updatedProjects);
      
      // Save to localStorage
      saveProjectsToStorage(updatedProjects);
      
      toast({
        title: "Project updated",
        description: "Changes have been saved."
      });
      
      return { ...projectToUpdate, ...finalUpdateData } as Project;
    } catch (err) {
      console.error("Error updating project:", err);
      
      toast({
        variant: "destructive",
        title: "Error updating project",
        description: err.message || "Failed to save changes."
      });
      
      throw err;
    }
  };

  // Delete a project
  const deleteProject = async (id: string) => {
    try {
      // Remove from local state
      const filteredProjects = projects.filter(project => project.id !== id);
      setProjects(filteredProjects);
      
      // Save to localStorage
      saveProjectsToStorage(filteredProjects);
      
      toast({
        title: "Project deleted",
        description: "Project has been removed."
      });
    } catch (err) {
      console.error("Error deleting project:", err);
      
      toast({
        variant: "destructive",
        title: "Error deleting project",
        description: err.message || "Failed to delete the project."
      });
      
      throw err;
    }
  };

  // Get a project by ID
  const getProjectById = async (id: string) => {
    try {
      const project = projects.find(p => p.id === id);
      if (!project) {
        throw new Error(`Project with ID ${id} not found`);
      }
      return project;
    } catch (err) {
      console.error("Error fetching project by ID:", err);
      
      toast({
        variant: "destructive",
        title: "Error loading project",
        description: err.message || "Failed to retrieve project details."
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
