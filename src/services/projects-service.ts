import { v4 as uuidv4 } from 'uuid';
import { getFreshClient } from '@/integrations/supabase/refresh-client';
import { Project } from '@/types/project';

/**
 * Helper function to handle project members
 */
async function addProjectMembers(client, projectId, assignedToUsers) {
  const projectMembers = assignedToUsers.map(userId => ({
    project_id: projectId,
    user_id: userId
  }));
  
  const { error: membersError } = await client
    .from('project_members')
    .insert(projectMembers);
  
  if (membersError) {
    console.error('Error creating project members:', membersError);
  }
}

/**
 * Service for project operations that use a fresh Supabase client 
 * to avoid schema cache issues
 */
export const projectsService = {
  /**
   * Create a new project with a fresh Supabase client to avoid schema cache issues
   */
  createProject: async (projectData: Partial<Project>): Promise<Project> => {
    console.log('Creating project with fresh client:', projectData);
    
    try {
      // Always get a fresh client to avoid schema cache issues
      const client = getFreshClient();
      
      // Generate ID if not provided
      const projectId = projectData.id || uuidv4();
      
      // Prepare project data with default values
      const project = {
        id: projectId,
        name: projectData.name || '',
        clientName: projectData.clientName || '',
        startTime: projectData.startTime || new Date().toISOString(),
        status: projectData.status || 'Not Started',
        priority: projectData.priority || 'Medium',
        deadline: projectData.deadline || new Date().toISOString(),
        budget: typeof projectData.budget === 'number' ? projectData.budget : 0,
        advancePayment: typeof projectData.advancePayment === 'number' ? projectData.advancePayment : 0,
        partialPayments: typeof projectData.partialPayments === 'number' ? projectData.partialPayments : 0,
        pendingPayment: typeof projectData.pendingPayment === 'number' ? projectData.pendingPayment : 0
      };
      
      // Insert project
      const { data, error } = await client
        .from('projects')
        .insert([project])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating project:', error);
        throw new Error(`Failed to create project: ${error.message}`);
      }
      
      console.log('Project created successfully:', data);
      
      // Handle project members if provided
      if (projectData.assignedTo && projectData.assignedTo.length > 0) {
        await addProjectMembers(client, data.id, projectData.assignedTo);
      }
      
      // Return created project with assignedTo
      return {
        ...data,
        assignedTo: projectData.assignedTo || []
      };
    } catch (error) {
      console.error('Error in createProject:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing project with a fresh Supabase client
   */
  updateProject: async (id: string, projectData: Partial<Project>): Promise<Project> => {
    console.log('Updating project with fresh client:', id, projectData);
    
    try {
      // Always get a fresh client to avoid schema cache issues
      const client = getFreshClient();
      
      // Extract assignedTo for separate handling
      const { assignedTo, ...updateData } = projectData;
      
      // Update project
      const { data, error } = await client
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating project with fresh client:', error);
        throw new Error(`Failed to update project: ${error.message}`);
      }
      
      console.log('Project updated successfully with fresh client:', data);
      
      // Handle project members if provided
      if (assignedTo && assignedTo.length > 0) {
        // First delete existing project members
        await client
          .from('project_members')
          .delete()
          .eq('project_id', id);
        
        // Then insert new project members
        await addProjectMembers(client, id, assignedTo);
      }
      
      // Return updated project with assignedTo
      return {
        ...data,
        assignedTo: assignedTo || []
      };
    } catch (error) {
      console.error('Error in updateProject:', error);
      throw error;
    }
  },
  
  /**
   * Get all projects with a fresh Supabase client
   */
  getProjects: async (): Promise<Project[]> => {
    console.log('Getting projects with fresh client');
    
    try {
      // Always get a fresh client to avoid schema cache issues
      const client = getFreshClient();
      
      const { data, error } = await client
        .from('projects')
        .select(`
          *,
          project_members(user_id)
        `);
      
      if (error) {
        console.error('Error getting projects with fresh client:', error);
        throw new Error(`Failed to get projects: ${error.message}`);
      }
      
      console.log('Got projects successfully with fresh client:', data.length);
      
      // Transform project_members to match expected structure
      return data.map(project => ({
        ...project,
        assignedTo: project.project_members?.map(member => member.user_id) || []
      }));
    } catch (error) {
      console.error('Error in getProjects:', error);
      throw error;
    }
  }
}; 