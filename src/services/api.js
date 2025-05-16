import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Removed localStorage fallback helper

export const fetchProjects = async () => {
  try {
    const { data, error } = await supabase.from('projects').select(`
      *,
      project_members(user_id)
    `);
    
    if (error) throw error;
    
    // Transform project_members to match expected structure
    return data.map(project => ({
      ...project,
      assignedTo: project.project_members?.map(member => member.user_id) || []
    }));
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

export const fetchProjectById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Transform project_members to match expected structure
    return {
      ...data,
      assignedTo: data.project_members?.map(member => member.user_id) || []
    };
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

export const createProject = async (project) => {
  try {
    // Log the project structure for debugging
    console.log('Creating project with data:', project);
    
    // Test Supabase connection first
    try {
      console.log('Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase.from('projects').select('count');
      
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        throw new Error(`Unable to connect to database: ${testError.message}`);
      }
      
      console.log('Supabase connection test successful');
    } catch (connError) {
      console.error('Error during connection test:', connError);
      throw connError;
    }
    
    // Extract assignedTo from project for separate insertion
    const { assignedTo, ...projectData } = project;
    
    // Insert project first
    console.log('Inserting project data:', projectData);
    
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting project:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to insert project: ${error.message}. Code: ${error.code}`);
    }
    
    console.log('Project inserted successfully:', data);
    
    // Insert project members if there are any assignees
    if (assignedTo && assignedTo.length > 0) {
      console.log('Inserting project members:', assignedTo);
      const projectMembers = assignedTo.map(userId => ({
        project_id: data.id,
        user_id: userId
      }));
      
      const { error: membersError } = await supabase
        .from('project_members')
        .insert(projectMembers);
      
      if (membersError) {
        console.error('Error inserting project members:', membersError);
        console.error('Members error details:', {
          message: membersError.message,
          code: membersError.code,
          details: membersError.details,
          hint: membersError.hint
        });
        throw new Error(`Failed to insert project members: ${membersError.message}. Code: ${membersError.code}`);
      }
      
      console.log('Project members inserted successfully');
    }
    
    // Return project with assignedTo
    return { ...data, assignedTo };
  } catch (error) {
    console.error('Error creating project:', error);
    
    // Enhanced error message with more details
    const errorMessage = error.message || 'Unknown error occurred';
    const errorDetails = error.details || '';
    const errorCode = error.code || '';
    const errorHint = error.hint || '';
    
    console.error('Full error object:', error);
    
    throw new Error(`Failed to create project: ${errorMessage}. ${errorDetails} ${errorHint} (Code: ${errorCode})`);
  }
};

export const updateProject = async (id, project) => {
  try {
    // Extract assignedTo from project for separate handling
    const { assignedTo, ...projectData } = project;
    
    // Update project first
    const { error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', id);
    
    if (error) throw error;
    
    // Delete existing project members
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', id);
    
    if (deleteError) throw deleteError;
    
    // Insert new project members
    if (assignedTo && assignedTo.length > 0) {
      const projectMembers = assignedTo.map(userId => ({
        project_id: id,
        user_id: userId
      }));
      
      const { error: insertError } = await supabase
        .from('project_members')
        .insert(projectMembers);
      
      if (insertError) throw insertError;
    }
    
    return { ...projectData, id, assignedTo };
  } catch (error) {
    console.error('Error updating project:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

export const deleteProject = async (id) => {
  try {
    // Delete project (will cascade delete project_members due to foreign key)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { id };
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

// New functions for tasks
export const fetchTasks = async (projectId = null) => {
  try {
    let query = supabase.from('tasks').select('*');
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

export const createTask = async (task) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

export const updateTask = async (id, task) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', id);
    
    if (error) throw error;
    return { ...task, id };
  } catch (error) {
    console.error('Error updating task:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

export const deleteTask = async (id) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};

export const fetchTaskById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select()
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    throw error; // Re-throw the error instead of falling back to localStorage
  }
};
