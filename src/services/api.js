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
  serviceId: row.service_id || null,
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

const mapDbToService = (row) => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  description: row.description || "",
  clientType: row.client_type || "ongoing",
  frequency: row.frequency || "monthly",
  customDays: row.custom_days || null,
  deliverableCount: row.deliverable_count || 1,
  createdAt: row.created_at,
});

// Local storage helpers (fallback only)
const getLocalProjects = () => { const s = localStorage.getItem("projects"); return s ? JSON.parse(s) : []; };
const setLocalProjects = (p) => localStorage.setItem("projects", JSON.stringify(p));
const getLocalTasks = () => { const s = localStorage.getItem("tasks"); return s ? JSON.parse(s) : []; };
const setLocalTasks = (t) => localStorage.setItem("tasks", JSON.stringify(t));

// ─── Companies ────────────────────────────────────────────────
export const fetchCompanies = async () => {
  try {
    const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data.map(mapDbToCompany);
  } catch { return []; }
};

export const createCompany = async (company) => {
  const { data: { user } } = await supabase.auth.getUser();
  try {
    const { data, error } = await supabase.from("companies")
      .insert([{ id: uuidv4(), name: company.name, description: company.description || null, logo_url: company.logoUrl || null, created_by: user?.id || null }])
      .select().single();
    if (error) throw error;
    return mapDbToCompany(data);
  } catch (e) { console.error("createCompany error:", e); throw e; }
};

export const updateCompany = async (id, company) => {
  try {
    const { data, error } = await supabase.from("companies")
      .update({ name: company.name, description: company.description || null, logo_url: company.logoUrl || null, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    return mapDbToCompany(data);
  } catch (e) { console.error("updateCompany error:", e); throw e; }
};

export const deleteCompany = async (id) => {
  try { const { error } = await supabase.from("companies").delete().eq("id", id); if (error) throw error; return { id }; }
  catch (e) { throw e; }
};

// ─── Company Settings ─────────────────────────────────────────
export const getCompanySetting = async (companyId, key) => {
  try {
    const { data, error } = await supabase.from("company_settings").select("setting_value").eq("company_id", companyId).eq("setting_key", key).maybeSingle();
    if (error) throw error;
    return data?.setting_value || null;
  } catch { return null; }
};

export const setCompanySetting = async (companyId, key, value) => {
  try {
    const { error } = await supabase.from("company_settings")
      .upsert({ company_id: companyId, setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: "company_id,setting_key" });
    if (error) throw error;
    return true;
  } catch (e) { console.error("setCompanySetting error:", e); return false; }
};

export const deleteCompanySetting = async (companyId, key) => {
  try { const { error } = await supabase.from("company_settings").delete().eq("company_id", companyId).eq("setting_key", key); if (error) throw error; return true; }
  catch { return false; }
};

export const getAllCompanySettings = async (companyId) => {
  try {
    const { data, error } = await supabase.from("company_settings").select("setting_key, setting_value").eq("company_id", companyId);
    if (error) throw error;
    const result = {};
    data.forEach((s) => { result[s.setting_key] = s.setting_value; });
    return result;
  } catch { return {}; }
};

// ─── Company Snapshot (for AI) ────────────────────────────────
export const fetchCompanySnapshot = async (companyId) => {
  try {
    const { data: projects, error: pe } = await supabase.from("projects")
      .select(`*, manager:profiles!projects_manager_id_fkey(full_name)`).eq("company_id", companyId);
    if (pe) throw pe;
    const projectIds = projects.map((p) => p.id);
    let tasks = [];
    if (projectIds.length > 0) {
      const { data: taskData, error: te } = await supabase.from("tasks")
        .select("*, assignee:profiles!tasks_assigned_to_fkey(full_name)").in("project_id", projectIds);
      if (!te) tasks = taskData || [];
    }
    const { data: managers } = await supabase.from("profiles").select("id, full_name").eq("role", "manager");
    const { data: employees } = await supabase.from("profiles").select("id, full_name").eq("role", "employee");
    return { projects: projects || [], tasks, managers: managers || [], employees: employees || [] };
  } catch (e) { console.error("fetchCompanySnapshot error:", e); return { projects: [], tasks: [], managers: [], employees: [] }; }
};

// ─── Salary (Admin-only) ──────────────────────────────────────
export const getEmployeeSalary = async (userId) => {
  try {
    const { data, error } = await supabase.from("employee_salaries").select("monthly_salary").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data?.monthly_salary || 0;
  } catch { return 0; }
};

export const setEmployeeSalary = async (userId, monthlySalary) => {
  try {
    const { error } = await supabase.from("employee_salaries")
      .upsert({ user_id: userId, monthly_salary: monthlySalary, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    return true;
  } catch (e) { console.error("setEmployeeSalary error:", e); return false; }
};

export const fetchAllSalaries = async () => {
  try {
    const { data, error } = await supabase.from("employee_salaries").select("user_id, monthly_salary");
    if (error) throw error;
    const map = {};
    (data || []).forEach((r) => { map[r.user_id] = parseFloat(r.monthly_salary) || 0; });
    return map;
  } catch { return {}; }
};

// ─── Company P&L ──────────────────────────────────────────────
export const fetchCompanyPnL = async (companyId) => {
  try {
    const { data: projects } = await supabase.from("projects")
      .select("budget, start_time, deadline, status").eq("company_id", companyId);

    const { data: profiles } = await supabase.from("profiles")
      .select("id, role").in("role", ["manager", "employee"]);

    const salaries = await fetchAllSalaries();

    const totalBudget = (projects || []).reduce((sum, p) => sum + (p.budget || 0), 0);

    // Monthly revenue: active project budgets spread over their durations
    const now = new Date();
    let monthlyRevenue = 0;
    (projects || []).forEach((p) => {
      if (p.status === "Completed") return;
      const start = new Date(p.start_time || now);
      const end = new Date(p.deadline || now);
      const months = Math.max(1, (end - start) / (30 * 86400000));
      monthlyRevenue += (p.budget || 0) / months;
    });

    const totalMonthlySalary = (profiles || []).reduce((sum, p) => sum + (salaries[p.id] || 0), 0);

    const monthlyProfit = monthlyRevenue - totalMonthlySalary;

    return {
      totalBudget,
      monthlyRevenue: Math.round(monthlyRevenue),
      totalMonthlySalary: Math.round(totalMonthlySalary),
      monthlyProfit: Math.round(monthlyProfit),
      teamSize: (profiles || []).length,
      projectCount: (projects || []).length,
    };
  } catch (e) {
    console.error("fetchCompanyPnL error:", e);
    return { totalBudget: 0, monthlyRevenue: 0, totalMonthlySalary: 0, monthlyProfit: 0, teamSize: 0, projectCount: 0 };
  }
};

// ─── Project Services ──────────────────────────────────────────
export const fetchProjectServices = async (projectId) => {
  try {
    const { data, error } = await supabase.from("project_services").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
    if (error) throw error;
    return data.map(mapDbToService);
  } catch (e) { console.error("fetchProjectServices error:", e); return []; }
};

export const createProjectService = async (service) => {
  try {
    const { data, error } = await supabase.from("project_services")
      .insert([{ id: uuidv4(), project_id: service.projectId, name: service.name, description: service.description || null, client_type: service.clientType || "ongoing", frequency: service.frequency || "monthly", custom_days: service.customDays || null, deliverable_count: service.deliverableCount || 1 }])
      .select().single();
    if (error) throw error;
    return mapDbToService(data);
  } catch (e) { console.error("createProjectService error:", e); throw e; }
};

export const updateProjectService = async (id, service) => {
  try {
    const { error } = await supabase.from("project_services")
      .update({ name: service.name, description: service.description || null, client_type: service.clientType || "ongoing", frequency: service.frequency || "monthly", custom_days: service.customDays || null, deliverable_count: service.deliverableCount || 1 })
      .eq("id", id);
    if (error) throw error;
    return { ...service, id };
  } catch (e) { console.error("updateProjectService error:", e); throw e; }
};

export const deleteProjectService = async (id) => {
  try { const { error } = await supabase.from("project_services").delete().eq("id", id); if (error) throw error; return { id }; }
  catch (e) { throw e; }
};

export const fetchServicesWithDeliveryStatus = async (projectId) => {
  try {
    const services = await fetchProjectServices(projectId);
    const { data: tasks } = await supabase.from("tasks").select("id, status, service_id, updated_at").eq("project_id", projectId);
    const today = new Date();
    const { data: projectRow } = await supabase.from("projects").select("start_time, deadline").eq("id", projectId).single();
    const startDate = projectRow?.start_time ? new Date(projectRow.start_time) : today;
    const dayElapsed = Math.max(1, Math.floor((today - startDate) / 86400000));

    return services.map((svc) => {
      const svcTasks = (tasks || []).filter((t) => t.service_id === svc.id);
      const doneTasks = svcTasks.filter((t) => t.status === "done");
      let expectedByNow = 0;
      switch (svc.frequency) {
        case "daily": expectedByNow = dayElapsed * svc.deliverableCount; break;
        case "weekly": expectedByNow = Math.floor(dayElapsed / 7) * svc.deliverableCount; break;
        case "monthly": expectedByNow = Math.floor(dayElapsed / 30) * svc.deliverableCount; break;
        case "custom": expectedByNow = Math.floor(dayElapsed / Math.max(svc.customDays || 1, 1)) * svc.deliverableCount; break;
      }
      const actual = doneTasks.length;
      const gap = expectedByNow - actual;
      let delayStatus = "on_track";
      if (gap > 0) delayStatus = gap >= expectedByNow * 0.5 ? "critical" : "warning";
      return { ...svc, expectedByNow, actual, gap: Math.max(0, gap), delayStatus, totalTasks: svcTasks.length };
    });
  } catch (e) { console.error("fetchServicesWithDeliveryStatus error:", e); return []; }
};

// ─── Projects ─────────────────────────────────────────────────
export const fetchProjects = async (companyId = null) => {
  try {
    let query = supabase.from("projects").select(`*, project_members(user_id), manager:profiles!projects_manager_id_fkey(full_name)`);
    if (companyId) query = query.eq("company_id", companyId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map((row) => mapDbToProject({ ...row, manager_name: row.manager?.full_name || null }, row.project_members?.map((m) => m.user_id) || []));
  } catch { return getLocalProjects(); }
};

export const fetchProjectsByManager = async (managerId, companyId = null) => {
  try {
    let query = supabase.from("projects").select(`*, project_members(user_id)`).eq("manager_id", managerId);
    if (companyId) query = query.eq("company_id", companyId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map((row) => mapDbToProject(row, row.project_members?.map((m) => m.user_id) || []));
  } catch { return getLocalProjects().filter((p) => p.managerId === managerId); }
};

export const fetchProjectById = async (id) => {
  try {
    const { data, error } = await supabase.from("projects").select(`*, project_members(user_id)`).eq("id", id).single();
    if (error) throw error;
    return mapDbToProject(data, data.project_members?.map((m) => m.user_id) || []);
  } catch { return getLocalProjects().find((p) => p.id === id); }
};

export const createProject = async (project, companyId = null) => {
  const id = project.id || uuidv4();
  const { assignedTo } = project;
  try {
    const dbData = { id, ...mapProjectToDb(project) };
    if (companyId) dbData.company_id = companyId;
    const { data, error } = await supabase.from("projects").insert([dbData]).select().single();
    if (error) throw error;
    if (assignedTo?.length > 0) {
      await supabase.from("project_members").insert(assignedTo.map((userId) => ({ project_id: id, user_id: userId })));
    }
    return mapDbToProject(data, assignedTo || []);
  } catch {
    const newProject = { ...project, id, companyId };
    setLocalProjects([...getLocalProjects(), newProject]);
    return newProject;
  }
};

export const updateProject = async (id, project) => {
  const { assignedTo } = project;
  try {
    const { error } = await supabase.from("projects").update(mapProjectToDb(project)).eq("id", id);
    if (error) throw error;
    await supabase.from("project_members").delete().eq("project_id", id);
    if (assignedTo?.length > 0) {
      await supabase.from("project_members").insert(assignedTo.map((userId) => ({ project_id: id, user_id: userId })));
    }
    return { ...project, id };
  } catch {
    setLocalProjects(getLocalProjects().map((p) => (p.id === id ? { ...p, ...project } : p)));
    return { ...project, id };
  }
};

export const deleteProject = async (id) => {
  try { const { error } = await supabase.from("projects").delete().eq("id", id); if (error) throw error; return { id }; }
  catch { setLocalProjects(getLocalProjects().filter((p) => p.id !== id)); return { id }; }
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
  const dbTask = { id: task.id || uuidv4(), project_id: task.projectId, title: task.title, description: task.description || null, status: task.status || "todo", assigned_to: task.assignedTo || null, due_date: task.dueDate || null, service_id: task.serviceId || null };
  try {
    const { data, error } = await supabase.from("tasks").insert([dbTask]).select().single();
    if (error) throw error;
    return mapDbToTask(data);
  } catch { const newTask = { ...task, id: dbTask.id }; setLocalTasks([...getLocalTasks(), newTask]); return newTask; }
};

export const updateTask = async (id, task) => {
  const dbUpdate = {};
  if (task.title !== undefined) dbUpdate.title = task.title;
  if (task.description !== undefined) dbUpdate.description = task.description;
  if (task.status !== undefined) dbUpdate.status = task.status;
  if (task.assignedTo !== undefined) dbUpdate.assigned_to = task.assignedTo;
  if (task.dueDate !== undefined) dbUpdate.due_date = task.dueDate;
  if (task.serviceId !== undefined) dbUpdate.service_id = task.serviceId;
  try {
    const { error } = await supabase.from("tasks").update(dbUpdate).eq("id", id);
    if (error) throw error;
    return { ...task, id };
  } catch { setLocalTasks(getLocalTasks().map((t) => (t.id === id ? { ...t, ...task } : t))); return { ...task, id }; }
};

export const deleteTask = async (id) => {
  try { const { error } = await supabase.from("tasks").delete().eq("id", id); if (error) throw error; return { id }; }
  catch { setLocalTasks(getLocalTasks().filter((t) => t.id !== id)); return { id }; }
};

// ─── Users ────────────────────────────────────────────────────
export const fetchUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase.from("profiles").select("id, full_name, role").eq("role", role);
    if (error) throw error;
    return data.filter((u) => u.id && u.full_name && u.full_name.trim() !== "").map((u) => ({ id: u.id, name: u.full_name, role: u.role }));
  } catch { return []; }
};

// ─── Work Status ──────────────────────────────────────────────
export const setWorkStatus = async (isWorking) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("work_status")
      .upsert({ user_id: user.id, date: today, is_working: isWorking, checked_in_at: new Date().toISOString() }, { onConflict: "user_id,date" });
    if (error) throw error;
    return true;
  } catch (e) { console.error("setWorkStatus error:", e); return false; }
};

export const getMyWorkStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase.from("work_status").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) { console.error("getMyWorkStatus error:", e); return null; }
};

export const fetchTodayTeamStatus = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("work_status")
      .select("*, profile:profiles!work_status_user_id_fkey(full_name, role)")
      .eq("date", today);
    if (error) throw error;
    return data || [];
  } catch (e) { console.error("fetchTodayTeamStatus error:", e); return []; }
};

// ─── Leave Requests ───────────────────────────────────────────
export const submitLeaveRequest = async (leaveDate, reason) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase.from("leave_requests")
      .insert([{ id: uuidv4(), user_id: user.id, leave_date: leaveDate, reason: reason || null, status: "pending" }])
      .select().single();
    if (error) throw error;
    return data;
  } catch (e) { console.error("submitLeaveRequest error:", e); throw e; }
};

export const fetchMyLeaveRequests = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from("leave_requests").select("*").eq("user_id", user.id).order("leave_date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) { console.error("fetchMyLeaveRequests error:", e); return []; }
};

export const fetchAllLeaveRequests = async (status = null) => {
  try {
    let query = supabase
      .from("leave_requests")
      .select("*, profile:profiles!leave_requests_user_id_fkey(full_name, role)")
      .order("leave_date", { ascending: true });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) { console.error("fetchAllLeaveRequests error:", e); return []; }
};

export const updateLeaveRequest = async (id, status, adminNote = "") => {
  try {
    const { error } = await supabase.from("leave_requests")
      .update({ status, admin_note: adminNote || null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return true;
  } catch (e) { console.error("updateLeaveRequest error:", e); return false; }
};

export const fetchUserLeaveHistory = async (userId) => {
  try {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const { data, error } = await supabase.from("leave_requests")
      .select("leave_date, status, reason")
      .eq("user_id", userId)
      .eq("status", "approved")
      .gte("leave_date", yearStart)
      .order("leave_date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch { return []; }
};

// ─── Team Performance (extended with salary + working days) ──
export const fetchTeamPerformance = async (companyId) => {
  try {
    const { data: profiles, error: pe } = await supabase.from("profiles")
      .select("id, full_name, role").in("role", ["manager", "employee"]);
    if (pe) throw pe;

    const { data: projects } = await supabase.from("projects")
      .select("id, name, budget, start_time, deadline, manager_id").eq("company_id", companyId);

    const projectIds = (projects || []).map((p) => p.id);

    const { data: members } = projectIds.length > 0
      ? await supabase.from("project_members").select("project_id, user_id").in("project_id", projectIds)
      : { data: [] };

    const { data: tasks } = projectIds.length > 0
      ? await supabase.from("tasks").select("id, project_id, assigned_to, status, updated_at, due_date").in("project_id", projectIds)
      : { data: [] };

    // Today, month, year
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];

    // Fetch all work_status for this month and year in one query
    const { data: workThisMonth } = await supabase
      .from("work_status")
      .select("user_id, date")
      .eq("is_working", true)
      .gte("date", monthStart)
      .lte("date", today);

    const { data: workThisYear } = await supabase
      .from("work_status")
      .select("user_id, date")
      .eq("is_working", true)
      .gte("date", yearStart)
      .lte("date", today);

    // Today's statuses — simple select without join
    const { data: workStatuses } = await supabase
      .from("work_status")
      .select("user_id, is_working")
      .eq("date", today);

    // Approved leaves today
    const { data: leaveToday } = await supabase
      .from("leave_requests")
      .select("user_id")
      .eq("leave_date", today)
      .eq("status", "approved");

    // All salaries
    const salaries = await fetchAllSalaries();

    const workStatusMap = {};
    (workStatuses || []).forEach((w) => { workStatusMap[w.user_id] = w.is_working; });
    const onLeaveSet = new Set((leaveToday || []).map((l) => l.user_id));

    return (profiles || []).map((user) => {
      const userProjects = (projects || []).filter((p) =>
        p.manager_id === user.id || (members || []).some((m) => m.user_id === user.id && m.project_id === p.id)
      );

      const userTasks = (tasks || []).filter((t) => t.assigned_to === user.id);
      const doneTasks = userTasks.filter((t) => t.status === "done");

      // Working days
      const workingDaysMonth = (workThisMonth || []).filter((w) => w.user_id === user.id).length;
      const workingDaysYear = (workThisYear || []).filter((w) => w.user_id === user.id).length;

      // Weekly chart
      const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-IN", { weekday: "short" });
        const count = doneTasks.filter((t) => t.updated_at?.startsWith(dateStr)).length;
        return { date: dateStr, label, count };
      });

      // Daily value estimate
      let dailyValue = 0;
      userProjects.forEach((proj) => {
        const start = new Date(proj.start_time || proj.created_at || Date.now());
        const end = new Date(proj.deadline || Date.now());
        const projDays = Math.max(1, Math.ceil((end - start) / 86400000));
        const teamSize = Math.max(1, (members || []).filter((m) => m.project_id === proj.id).length);
        dailyValue += (proj.budget || 0) / projDays / teamSize;
      });

      const overdueCount = userTasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()).length;

      let todayStatus = "not_checked_in";
      if (onLeaveSet.has(user.id)) todayStatus = "on_leave";
      else if (workStatusMap[user.id] === true) todayStatus = "working";
      else if (workStatusMap[user.id] === false) todayStatus = "not_working";

      return {
        id: user.id,
        name: user.full_name,
        role: user.role,
        projectCount: userProjects.length,
        taskCount: userTasks.length,
        doneCount: doneTasks.length,
        pendingCount: userTasks.length - doneTasks.length,
        overdueCount,
        dailyValue: Math.round(dailyValue),
        weeklyData,
        todayStatus,
        completionRate: userTasks.length > 0 ? Math.round((doneTasks.length / userTasks.length) * 100) : 0,
        monthlySalary: salaries[user.id] || 0,
        workingDaysMonth,
        workingDaysYear,
      };
    });
  } catch (e) {
    console.error("fetchTeamPerformance error:", e);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════
//  ARIA — AI Risk & Intelligence Agent  API
// ═══════════════════════════════════════════════════════════════

// Fetch conversation messages for one user
export const fetchAriaMessages = async (userId, companyId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from("aria_messages")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) { console.error("fetchAriaMessages:", e); return []; }
};

// Fetch unread count for notification bell
export const fetchAriaUnreadCount = async (userId, companyId) => {
  try {
    const { count, error } = await supabase
      .from("aria_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("sender_type", "aria")
      .is("read_at", null);
    if (error) throw error;
    return count || 0;
  } catch { return 0; }
};

// Mark all messages as read for a user
export const markAriaMessagesRead = async (userId, companyId) => {
  try {
    await supabase
      .from("aria_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("sender_type", "aria")
      .is("read_at", null);
  } catch (e) { console.error("markAriaMessagesRead:", e); }
};

// Send a user reply — saves message then immediately gets ARIA response via AI
export const sendAriaUserReply = async ({
  userId, companyId, message, relatedTaskId = null, relatedProjectId = null,
  userName, userRole, aiKey, aiProvider, aiModel, customBaseUrl = "",
}) => {
  try {
    // 1. Save user's message
    await supabase.from("aria_messages").insert({
      company_id: companyId, user_id: userId,
      sender_type: "user", message,
      message_type: "user_update",
      priority: "medium",
      related_task_id: relatedTaskId,
      related_project_id: relatedProjectId,
      read_at: new Date().toISOString(), // user's own message is instantly "read"
    });

    // 2. If no AI key, return without ARIA reply
    if (!aiKey) return;

    // 3. Fetch last 10 messages for context
    const { data: history } = await supabase
      .from("aria_messages")
      .select("sender_type, message, created_at")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);

    const historyText = (history || []).reverse().map(m =>
      `${m.sender_type === "aria" ? "ARIA" : userName}: ${m.message}`
    ).join("\n");

    // 4. Generate ARIA reply
    const prompt = `You are ARIA, a friendly AI work assistant at this company. You are having a conversation with ${userName} (${userRole}).
Your job: monitor their work, keep them on track, and relay important updates to the admin.
Be friendly, warm, and brief (max 50 words). Ask follow-up if needed.

Recent conversation:
${historyText}

${userName} just said: "${message}"

Respond naturally as ARIA. If they mention task delays or problems, acknowledge, offer help, and let them know you'll keep the admin informed.`;

    const ariaReply = await callAIForAria(aiProvider, aiKey, aiModel, prompt, customBaseUrl);
    if (!ariaReply) return;

    // 5. Save ARIA's response
    await supabase.from("aria_messages").insert({
      company_id: companyId, user_id: userId,
      sender_type: "aria", message: ariaReply,
      message_type: "general",
      priority: "low",
      related_task_id: relatedTaskId,
      related_project_id: relatedProjectId,
    });
  } catch (e) { console.error("sendAriaUserReply:", e); }
};

// Internal helper — call AI for ARIA responses
const callAIForAria = async (provider, apiKey, model, prompt, customBaseUrl = "") => {
  try {
    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      const d = await res.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey,
          "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model, max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await res.json();
      return d.content?.[0]?.text || "";
    }
    // OpenAI-compatible
    const baseMap = {
      openai: "https://api.openai.com/v1", groq: "https://api.groq.com/openai/v1",
      mistral: "https://api.mistral.ai/v1", deepseek: "https://api.deepseek.com/v1",
      together: "https://api.together.xyz/v1", openrouter: "https://openrouter.ai/api/v1",
      xai: "https://api.x.ai/v1",
    };
    const base = provider === "custom" ? customBaseUrl : (baseMap[provider] || "https://api.openai.com/v1");
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
    if (provider === "openrouter") { headers["HTTP-Referer"] = window.location.origin; headers["X-Title"] = "Earney Projects"; }
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST", headers,
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 200 }),
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";
  } catch { return ""; }
};

// Admin: fetch all conversations grouped by user
export const fetchAllAriaConversations = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from("aria_messages")
      .select("*, profile:profiles!aria_messages_user_id_fkey(full_name, role)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    // Group by user
    const byUser = {};
    for (const msg of (data || [])) {
      if (!byUser[msg.user_id]) {
        byUser[msg.user_id] = {
          userId: msg.user_id,
          userName: msg.profile?.full_name || "Unknown",
          userRole: msg.profile?.role || "employee",
          messages: [],
          unreadCount: 0,
          lastMessage: null,
          lastActivity: msg.created_at,
        };
      }
      byUser[msg.user_id].messages.unshift(msg); // ascending order
      if (!byUser[msg.user_id].lastMessage) byUser[msg.user_id].lastMessage = msg;
      if (msg.sender_type === "user" && !msg.read_at) byUser[msg.user_id].unreadCount++;
    }
    return Object.values(byUser).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  } catch (e) { console.error("fetchAllAriaConversations:", e); return []; }
};

// Fetch agent run logs
export const fetchAriaLogs = async (companyId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from("aria_agent_logs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch { return []; }
};

// Get ARIA config for a company
export const getAriaConfig = async (companyId) => {
  try {
    const { data } = await supabase
      .from("aria_config")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    return data || { enabled: true, start_hour: 10, end_hour: 19, interval_hours: 2, skip_sundays: true, overdue_days_threshold: 0, budget_risk_pct: 80 };
  } catch { return null; }
};

// Save ARIA config
export const saveAriaConfig = async (companyId, config) => {
  try {
    const { error } = await supabase
      .from("aria_config")
      .upsert({ company_id: companyId, ...config, updated_at: new Date().toISOString() }, { onConflict: "company_id" });
    return !error;
  } catch { return false; }
};

// Manual ARIA scan — runs the intelligence scan client-side
// (used as fallback when no Edge Function cron is available)
export const runAriaScan = async ({ companyId, triggeredBy, aiKey, aiProvider, aiModel, customBaseUrl = "" }) => {
  const startTime = Date.now();
  try {
    // Load all active data
    const [profiles, projects, tasks, workStatuses, leaves] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role").eq("company_id", companyId).in("role", ["manager", "employee"]),
      supabase.from("projects").select("id, name, status, budget, advance_payment, partial_payments, deadline, manager_id").eq("company_id", companyId).neq("status", "Completed"),
      supabase.from("tasks").select("id, title, status, due_date, assigned_to, project_id").in("project_id",
        (await supabase.from("projects").select("id").eq("company_id", companyId)).data?.map(p => p.id) || []
      ),
      supabase.from("work_status").select("user_id, is_working, date").eq("company_id", companyId).gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
      supabase.from("leave_requests").select("user_id, leave_date, status").gte("leave_date", new Date().toISOString().split("T")[0]),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const team = profiles.data || [];
    const allTasks = tasks.data || [];
    const allProjects = projects.data || [];
    const allStatuses = workStatuses.data || [];
    const allLeaves = leaves.data || [];

    let messagesSent = 0;
    let risksFound = 0;
    const riskBreakdown = { overdue_tasks: 0, no_checkin: 0, budget_risk: 0, none: 0 };
    const summaryLines = [];

    for (const person of team) {
      const myTasks = allTasks.filter(t => t.assigned_to === person.id);
      const overdueTasks = myTasks.filter(t => t.due_date && t.due_date < today && t.status !== "done");
      const inProgressTasks = myTasks.filter(t => t.status === "in_progress");
      const todayStatus = allStatuses.find(s => s.user_id === person.id && s.date === today);
      const checkedInToday = todayStatus?.is_working;
      const recentDays = allStatuses.filter(s => s.user_id === person.id && s.is_working).length;

      const hasOverdue = overdueTasks.length > 0;
      const noCheckin = !checkedInToday;

      if (hasOverdue) { risksFound++; riskBreakdown.overdue_tasks++; }
      if (noCheckin && recentDays === 0) { risksFound++; riskBreakdown.no_checkin++; }

      // Generate AI message
      const isOverdueAlert = hasOverdue;
      const tone = isOverdueAlert ? "strict and urgent" : "friendly and supportive";
      const currentWork = inProgressTasks.length > 0 ? inProgressTasks.map(t => t.title).join(", ") : "no active tasks";

      const prompt = `You are ARIA, the AI work assistant at this company. Write a ${tone} check-in message to ${person.full_name} (${person.role}).
${hasOverdue ? `IMPORTANT: They have ${overdueTasks.length} OVERDUE task(s): ${overdueTasks.map(t => `"${t.title}"`).join(", ")}. Be strict.` : ""}
${noCheckin ? "They have not checked in today. Ask them to update their work status." : `They are working today. Current work: ${currentWork}.`}
${inProgressTasks.length > 0 ? `Ask for a quick update on: ${currentWork}` : "Ask what they are working on today."}
Keep it under 55 words. Be direct. Start with their first name.`;

      const aiMsg = await callAIForAria(aiProvider, aiKey, aiModel, prompt, customBaseUrl);
      if (!aiMsg) continue;

      await supabase.from("aria_messages").insert({
        company_id: companyId, user_id: person.id,
        sender_type: "aria",
        message: aiMsg,
        message_type: hasOverdue ? "delay_alert" : "check_in",
        priority: hasOverdue ? "high" : "medium",
        requires_reply: true,
      });
      messagesSent++;
      summaryLines.push(`${person.full_name}: ${hasOverdue ? overdueTasks.length + " overdue" : "checked in"}`);
    }

    // Budget risk check
    for (const proj of allProjects) {
      const spent = (proj.advance_payment || 0) + (proj.partial_payments || 0);
      if (proj.budget > 0 && spent / proj.budget >= 0.8) {
        risksFound++;
        riskBreakdown.budget_risk = (riskBreakdown.budget_risk || 0) + 1;
      }
    }

    // Generate admin summary
    const adminSummaryPrompt = `ARIA completed a scan for the company. Summarize in 2 sentences for the admin:
Team: ${team.length} people scanned. Messages sent: ${messagesSent}. Risks found: ${risksFound}.
Details: ${summaryLines.join("; ") || "No major issues found."}
Budget risks: ${riskBreakdown.budget_risk || 0} projects overspending.
Be concise and executive-level.`;

    const aiSummary = await callAIForAria(aiProvider, aiKey, aiModel, adminSummaryPrompt, customBaseUrl);

    // Log the run
    await supabase.from("aria_agent_logs").insert({
      company_id: companyId, run_type: "manual", triggered_by: triggeredBy,
      status: "completed", messages_sent: messagesSent, risks_found: risksFound,
      ai_summary: aiSummary || `Scanned ${team.length} team members. Found ${risksFound} risks.`,
      risk_breakdown: riskBreakdown,
      duration_ms: Date.now() - startTime,
    });

    return { success: true, messagesSent, risksFound, aiSummary };
  } catch (e) {
    console.error("runAriaScan:", e);
    await supabase.from("aria_agent_logs").insert({
      company_id: companyId, run_type: "manual", triggered_by: triggeredBy,
      status: "failed", messages_sent: 0, risks_found: 0,
      ai_summary: `Scan failed: ${e.message}`,
      duration_ms: Date.now() - startTime,
    });
    return { success: false, error: e.message };
  }
};

