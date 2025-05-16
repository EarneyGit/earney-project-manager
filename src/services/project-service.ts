import * as api from './api';
import { Project } from '@/types/project';

class ProjectService {
  async getProjects(): Promise<Project[]> {
    return api.fetchProjects();
  }

  async getProject(id: string): Promise<Project> {
    return api.fetchProjectById(id);
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    return api.createProject(project);
  }

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    return api.updateProject(id, project);
  }

  async deleteProject(id: string): Promise<void> {
    return api.deleteProject(id);
  }
}

export const projectService = new ProjectService(); 