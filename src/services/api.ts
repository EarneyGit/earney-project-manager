import { Project } from "@/types/project";
import { v4 as uuidv4 } from "uuid";

// Local storage key
const STORAGE_KEY = "projects_data";

// Helper function to get projects from localStorage
const getProjectsFromStorage = (): Project[] => {
  try {
    const storedProjects = localStorage.getItem(STORAGE_KEY);
    return storedProjects ? JSON.parse(storedProjects) : [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
};

// Helper function to save projects to localStorage
const saveProjectsToStorage = (projects: Project[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

// Fetch all projects
export const fetchProjects = async (): Promise<Project[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return getProjectsFromStorage();
};

// Fetch a single project by ID
export const fetchProjectById = async (id: string): Promise<Project> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const projects = getProjectsFromStorage();
  const project = projects.find(p => p.id === id);
  
  if (!project) {
    throw new Error(`Project with ID ${id} not found`);
  }
  
  return project;
};

// Create a new project
export const createProject = async (project: Partial<Project>): Promise<Project> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const projects = getProjectsFromStorage();
  
  const newProject = {
    ...project,
    id: project.id || uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Project;
  
  const updatedProjects = [...projects, newProject];
  saveProjectsToStorage(updatedProjects);
  
  return newProject;
};

// Update an existing project
export const updateProject = async (id: string, projectData: Partial<Project>): Promise<Project> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const projects = getProjectsFromStorage();
  const projectIndex = projects.findIndex(p => p.id === id);
  
  if (projectIndex === -1) {
    throw new Error(`Project with ID ${id} not found`);
  }
  
  const updatedProject = {
    ...projects[projectIndex],
    ...projectData,
    updatedAt: new Date().toISOString()
  };
  
  projects[projectIndex] = updatedProject;
  saveProjectsToStorage(projects);
  
  return updatedProject;
};

// Delete a project
export const deleteProject = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const projects = getProjectsFromStorage();
  const updatedProjects = projects.filter(p => p.id !== id);
  
  if (projects.length === updatedProjects.length) {
    throw new Error(`Project with ID ${id} not found`);
  }
  
  saveProjectsToStorage(updatedProjects);
}; 