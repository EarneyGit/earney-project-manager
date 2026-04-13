
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

// ─── Helpers ──────────────────────────────────────────────────
// Map snake_case DB columns → camelCase frontend fields
const mapDbToProject = (row, assignedTo = []) => ({
  id: row.id,
  name: row.name,
  clientName: row.client_name,
  status: row.status,
  priority: row.priority,
  startTime: row.start_time,
  deadline: row.deadline,
  budget: row.budget,
  advancePayment: row.advance_payment,
  partialPayments: row.partial_payments,
  pendingPayment: row.pending_payment,
  managerId: row.manager_id,
  managerName: row.manager_name || null,
  assignedTo,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map camelCase → snake_case for DB inserts/updates
const mapProjectToDb = (project) => ({
  name: project.name,
  client_name: project.clientName || "",
  status: project.status || "Not Started",
  priority: project.priority || "Medium",
  start_time: project.startTime,
  deadline: project.deadline,
  budget: project.budget || 0,
  advance_payment: project.advancePayment || 0,
  partial_payments: project.partialPayments || 0,
  pending_payment: project.pendingPayment || 0,
  manager_id: project.managerId || null,
});

const mapDbToTask = (row) => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description || "",
  status: row.status || "todo",
  assignedTo: row.assigned_to || null,
  dueDate: row.due_date || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Local storage helpers
const getLocalProjects = () => {
  const s = localStorage.getItem("projects");
  return s ? JSON.parse(s) : [];
};
const setLocalProjects = (projects) =>
  localStorage.setItem("projects", JSON.stringify(projects));

const getLocalTasks = () => {
  const s = localStorage.getItem("tasks");
  return s ? JSON.parse(s) : [];
};
const setLocalTasks = (tasks) =>
  localStorage.setItem("tasks", JSON.stringify(tasks));

// ─── Projects ─────────────────────────────────────────────────

/** Admin: fetch all projects with manager name join */
export const fetchProjects = async () => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(`*, project_members(user_id), manager:profiles!projects_manager_id_fkey(full_name)`);

    if (error) throw error;

    return data.map((row) =>
      mapDbToProject(
        { ...row, manager_name: row.manager?.full_name || null },
        row.project_members?.map((m) => m.user_id) || []
      )
    );
  } catch {
    return getLocalProjects();
  }
};

/** Manager: fetch only projects assigned to them */
export const fetchProjectsByManager = async (managerId) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(`*, project_members(user_id)`)
      .eq("manager_id", managerId);

    if (error) throw error;

    return data.map((row) =>
      mapDbToProject(row, row.project_members?.map((m) => m.user_id) || [])
    );
  } catch {
    return getLocalProjects().filter((p) => p.managerId === managerId);
  }
};

export const fetchProjectById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(`*, project_members(user_id)`)
      .eq("id", id)
      .single();

    if (error) throw error;

    return mapDbToProject(data, data.project_members?.map((m) => m.user_id) || []);
  } catch {
    return getLocalProjects().find((p) => p.id === id);
  }
};

export const createProject = async (project) => {
  const id = project.id || uuidv4();
  const { assignedTo } = project;

  try {
    const { data, error } = await supabase
      .from("projects")
      .insert([{ id, ...mapProjectToDb(project) }])
      .select()
      .single();

    if (error) throw error;

    // Insert project members
    if (assignedTo?.length > 0) {
      await supabase
        .from("project_members")
        .insert(assignedTo.map((userId) => ({ project_id: id, user_id: userId })));
    }

    return mapDbToProject(data, assignedTo || []);
  } catch {
    const newProject = { ...project, id };
    const projects = getLocalProjects();
    setLocalProjects([...projects, newProject]);
    return newProject;
  }
};

export const updateProject = async (id, project) => {
  const { assignedTo } = project;

  try {
    const { error } = await supabase
      .from("projects")
      .update(mapProjectToDb(project))
      .eq("id", id);

    if (error) throw error;

    // Refresh project members
    await supabase.from("project_members").delete().eq("project_id", id);
    if (assignedTo?.length > 0) {
      await supabase
        .from("project_members")
        .insert(assignedTo.map((userId) => ({ project_id: id, user_id: userId })));
    }

    return { ...project, id };
  } catch {
    const projects = getLocalProjects().map((p) =>
      p.id === id ? { ...p, ...project } : p
    );
    setLocalProjects(projects);
    return { ...project, id };
  }
};

export const deleteProject = async (id) => {
  try {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    return { id };
  } catch {
    setLocalProjects(getLocalProjects().filter((p) => p.id !== id));
    return { id };
  }
};

// ─── Tasks ────────────────────────────────────────────────────

/** Fetch tasks — optionally filter by projectId or by assignedTo user */
export const fetchTasks = async ({ projectId = null, assignedTo = null } = {}) => {
  try {
    let query = supabase.from("tasks").select("*");
    if (projectId) query = query.eq("project_id", projectId);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(mapDbToTask);
  } catch {
    let tasks = getLocalTasks();
    if (projectId) tasks = tasks.filter((t) => t.project_id === projectId);
    if (assignedTo) tasks = tasks.filter((t) => t.assignedTo === assignedTo);
    return tasks;
  }
};

export const createTask = async (task) => {
  const dbTask = {
    id: task.id || uuidv4(),
    project_id: task.projectId,
    title: task.title,
    description: task.description || null,
    status: task.status || "todo",
    assigned_to: task.assignedTo || null,
    due_date: task.dueDate || null,
  };

  try {
    const { data, error } = await supabase.from("tasks").insert([dbTask]).select().single();
    if (error) throw error;
    return mapDbToTask(data);
  } catch {
    const newTask = { ...task, id: dbTask.id };
    setLocalTasks([...getLocalTasks(), newTask]);
    return newTask;
  }
};

export const updateTask = async (id, task) => {
  const dbUpdate = {};
  if (task.title !== undefined) dbUpdate.title = task.title;
  if (task.description !== undefined) dbUpdate.description = task.description;
  if (task.status !== undefined) dbUpdate.status = task.status;
  if (task.assignedTo !== undefined) dbUpdate.assigned_to = task.assignedTo;
  if (task.dueDate !== undefined) dbUpdate.due_date = task.dueDate;

  try {
    const { error } = await supabase.from("tasks").update(dbUpdate).eq("id", id);
    if (error) throw error;
    return { ...task, id };
  } catch {
    setLocalTasks(getLocalTasks().map((t) => (t.id === id ? { ...t, ...task } : t)));
    return { ...task, id };
  }
};

export const deleteTask = async (id) => {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    return { id };
  } catch {
    setLocalTasks(getLocalTasks().filter((t) => t.id !== id));
    return { id };
  }
};

// ─── Users (for dropdowns) ────────────────────────────────────

/** Fetch all users with a specific role */
export const fetchUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", role);

    if (error) throw error;
    return data.map((u) => ({ id: u.id, name: u.full_name, role: u.role }));
  } catch {
    return [];
  }
};
