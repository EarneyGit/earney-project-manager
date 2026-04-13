import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

// ─── Helpers ──────────────────────────────────────────────────
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
  companyId: row.company_id || null,
  assignedTo,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

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
  company_id: project.companyId || null,
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

const mapDbToCompany = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description || null,
  logoUrl: row.logo_url || null,
  createdBy: row.created_by || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Local storage helpers (fallback only)
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

// ─── Companies ────────────────────────────────────────────────

export const fetchCompanies = async () => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data.map(mapDbToCompany);
  } catch {
    return [];
  }
};

export const createCompany = async (company) => {
  const { data: { user } } = await supabase.auth.getUser();
  try {
    const { data, error } = await supabase
      .from("companies")
      .insert([{
        id: uuidv4(),
        name: company.name,
        description: company.description || null,
        logo_url: company.logoUrl || null,
        created_by: user?.id || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return mapDbToCompany(data);
  } catch (e) {
    console.error("createCompany error:", e);
    throw e;
  }
};

export const updateCompany = async (id, company) => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .update({
        name: company.name,
        description: company.description || null,
        logo_url: company.logoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapDbToCompany(data);
  } catch (e) {
    console.error("updateCompany error:", e);
    throw e;
  }
};

export const deleteCompany = async (id) => {
  try {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) throw error;
    return { id };
  } catch (e) {
    throw e;
  }
};

// ─── Company Settings (AI Keys) ───────────────────────────────

export const getCompanySetting = async (companyId, key) => {
  try {
    const { data, error } = await supabase
      .from("company_settings")
      .select("setting_value")
      .eq("company_id", companyId)
      .eq("setting_key", key)
      .maybeSingle();
    if (error) throw error;
    return data?.setting_value || null;
  } catch {
    return null;
  }
};

export const setCompanySetting = async (companyId, key, value) => {
  try {
    const { error } = await supabase
      .from("company_settings")
      .upsert({
        company_id: companyId,
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,setting_key" });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("setCompanySetting error:", e);
    return false;
  }
};

export const deleteCompanySetting = async (companyId, key) => {
  try {
    const { error } = await supabase
      .from("company_settings")
      .delete()
      .eq("company_id", companyId)
      .eq("setting_key", key);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
};

export const getAllCompanySettings = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from("company_settings")
      .select("setting_key, setting_value")
      .eq("company_id", companyId);
    if (error) throw error;
    const result = {};
    data.forEach((s) => { result[s.setting_key] = s.setting_value; });
    return result;
  } catch {
    return {};
  }
};

// ─── Company Snapshot (for AI) ────────────────────────────────

export const fetchCompanySnapshot = async (companyId) => {
  try {
    // Projects for this company
    const { data: projects, error: pe } = await supabase
      .from("projects")
      .select(`*, manager:profiles!projects_manager_id_fkey(full_name)`)
      .eq("company_id", companyId);
    if (pe) throw pe;

    // Tasks for these projects
    const projectIds = projects.map((p) => p.id);
    let tasks = [];
    if (projectIds.length > 0) {
      const { data: taskData, error: te } = await supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assigned_to_fkey(full_name)")
        .in("project_id", projectIds);
      if (!te) tasks = taskData || [];
    }

    // Managers (global)
    const { data: managers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "manager");

    // Employees (global)
    const { data: employees } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "employee");

    return { projects: projects || [], tasks, managers: managers || [], employees: employees || [] };
  } catch (e) {
    console.error("fetchCompanySnapshot error:", e);
    return { projects: [], tasks: [], managers: [], employees: [] };
  }
};

// ─── Projects ─────────────────────────────────────────────────

export const fetchProjects = async (companyId = null) => {
  try {
    let query = supabase
      .from("projects")
      .select(`*, project_members(user_id), manager:profiles!projects_manager_id_fkey(full_name)`);
    if (companyId) query = query.eq("company_id", companyId);

    const { data, error } = await query;
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

export const fetchProjectsByManager = async (managerId, companyId = null) => {
  try {
    let query = supabase
      .from("projects")
      .select(`*, project_members(user_id)`)
      .eq("manager_id", managerId);
    if (companyId) query = query.eq("company_id", companyId);

    const { data, error } = await query;
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

export const createProject = async (project, companyId = null) => {
  const id = project.id || uuidv4();
  const { assignedTo } = project;

  try {
    const dbData = { id, ...mapProjectToDb(project) };
    if (companyId) dbData.company_id = companyId;

    const { data, error } = await supabase
      .from("projects")
      .insert([dbData])
      .select()
      .single();
    if (error) throw error;

    if (assignedTo?.length > 0) {
      await supabase
        .from("project_members")
        .insert(assignedTo.map((userId) => ({ project_id: id, user_id: userId })));
    }

    return mapDbToProject(data, assignedTo || []);
  } catch {
    const newProject = { ...project, id, companyId };
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

    await supabase.from("project_members").delete().eq("project_id", id);
    if (assignedTo?.length > 0) {
      await supabase
        .from("project_members")
        .insert(assignedTo.map((userId) => ({ project_id: id, user_id: userId })));
    }

    return { ...project, id };
  } catch {
    const projects = getLocalProjects().map((p) => (p.id === id ? { ...p, ...project } : p));
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

// ─── Users ────────────────────────────────────────────────────

export const fetchUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", role);

    if (error) throw error;
    return data
      .filter((u) => u.id && u.full_name && u.full_name.trim() !== "")
      .map((u) => ({ id: u.id, name: u.full_name, role: u.role }));
  } catch {
    return [];
  }
};
