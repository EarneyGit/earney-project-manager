import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import * as api from "../services/api";
import { useAuth } from "./AuthContext";
import { useCompany } from "./CompanyContext";
import { Project } from "@/types/project";

export const ProjectContext = createContext(null);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProjects must be used within a ProjectProvider");
  return context;
};

export const ProjectProvider = ({ children }) => {
  const { currentUser, isAdmin, isManager } = useAuth();
  const { activeCompany } = useCompany();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!currentUser) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let data = [];
      const companyId = activeCompany?.id || null;

      if (isAdmin) {
        data = await api.fetchProjects(companyId);
      } else if (isManager) {
        data = await api.fetchProjectsByManager(currentUser.id, companyId);
      }

      setProjects(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects");
      const storedProjects = localStorage.getItem("projects");
      if (storedProjects) setProjects(JSON.parse(storedProjects));
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, isManager, activeCompany?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const calcPending = (project: Partial<Project>) => {
    const budget = project.budget || 0;
    const advance = project.advancePayment || 0;
    const partial = typeof project.partialPayments === "number" ? project.partialPayments : 0;
    return Math.max(0, budget - (advance + partial));
  };

  const addProject = async (project) => {
    try {
      const companyId = activeCompany?.id || null;
      const newProject = { ...project, id: uuidv4(), pendingPayment: calcPending(project), companyId };
      const created = await api.createProject(newProject, companyId);
      setProjects((prev) => [...prev, created]);
      return created;
    } catch (err) {
      console.error("Error adding project:", err);
      const newProject = { ...project, id: uuidv4(), pendingPayment: calcPending(project) };
      setProjects((prev) => {
        const updated = [...prev, newProject];
        localStorage.setItem("projects", JSON.stringify(updated));
        return updated;
      });
      return newProject;
    }
  };

  const updateProject = async (id, updatedData) => {
    try {
      const existing = projects.find((p) => p.id === id);
      const merged = { ...existing, ...updatedData };
      const finalData = { ...updatedData, pendingPayment: calcPending(merged) };

      await api.updateProject(id, finalData);
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...finalData } : p)));
      return { ...finalData, id };
    } catch (err) {
      console.error("Error updating project:", err);
      const existing = projects.find((p) => p.id === id);
      const merged = { ...existing, ...updatedData };
      const finalData = { ...updatedData, pendingPayment: calcPending(merged) };
      setProjects((prev) => {
        const updated = prev.map((p) => (p.id === id ? { ...p, ...finalData } : p));
        localStorage.setItem("projects", JSON.stringify(updated));
        return updated;
      });
      return { ...finalData, id };
    }
  };

  const deleteProject = async (id) => {
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting project:", err);
      setProjects((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        localStorage.setItem("projects", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const getProjectById = async (id) => {
    try {
      return await api.fetchProjectById(id);
    } catch {
      return projects.find((p) => p.id === id);
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      loading,
      error,
      addProject,
      updateProject,
      deleteProject,
      getProjectById,
      refreshProjects: fetchProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
