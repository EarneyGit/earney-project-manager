import { projectApi } from './api-client';
import { Project } from '@/types/project';

class ProjectService {
  async getProjects(params?: { status?: string; priority?: string; search?: string }) {
    return projectApi.getAll(params);
  }

  async getProject(id: string) {
    return projectApi.get(id);
  }

  async createProject(project: any) {
    return projectApi.create(project);
  }

  async updateProject(id: string, project: any) {
    return projectApi.update(id, project);
  }

  async deleteProject(id: string) {
    return projectApi.delete(id);
  }

  async addTeamMember(id: string, userId: string) {
    return projectApi.addTeamMember(id, userId);
  }

  async removeTeamMember(id: string, userId: string) {
    return projectApi.removeTeamMember(id, userId);
  }
}

export const projectService = new ProjectService(); 