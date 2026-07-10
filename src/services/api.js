const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res) => {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "API Request Failed");
  }
  return res.json();
};

// ─── COMPANIES ───
export const fetchCompanies = async () =>
  handleResponse(await fetch(`${API_URL}/companies`, { headers: getHeaders() }));

export const createCompany = async (company) =>
  handleResponse(await fetch(`${API_URL}/companies`, { method: "POST", headers: getHeaders(), body: JSON.stringify(company) }));

export const updateCompany = async (id, company) =>
  handleResponse(await fetch(`${API_URL}/companies/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(company) }));

export const deleteCompany = async (id) =>
  handleResponse(await fetch(`${API_URL}/companies/${id}`, { method: "DELETE", headers: getHeaders() }));

// ─── PROJECTS ───
export const fetchProjects = async (companyId) => {
  const params = companyId ? `?companyId=${companyId}` : "";
  return handleResponse(await fetch(`${API_URL}/projects${params}`, { headers: getHeaders() }));
};

export const fetchProjectsByManager = async (managerId, companyId) => {
  const params = new URLSearchParams({ managerId });
  if (companyId) params.set("companyId", companyId);
  return handleResponse(await fetch(`${API_URL}/projects?${params}`, { headers: getHeaders() }));
};

export const fetchProjectById = async (id) =>
  handleResponse(await fetch(`${API_URL}/projects/${id}`, { headers: getHeaders() }));

export const createProject = async (project) =>
  handleResponse(await fetch(`${API_URL}/projects`, { method: "POST", headers: getHeaders(), body: JSON.stringify(project) }));

export const updateProject = async (id, project) =>
  handleResponse(await fetch(`${API_URL}/projects/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(project) }));

export const deleteProject = async (id) =>
  handleResponse(await fetch(`${API_URL}/projects/${id}`, { method: "DELETE", headers: getHeaders() }));

// ─── TASKS ───
// Accepts optional filters: { projectId, assignedTo }
export const fetchTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
  const qs = params.toString() ? `?${params}` : "";
  return handleResponse(await fetch(`${API_URL}/tasks${qs}`, { headers: getHeaders() }));
};

export const createTask = async (task) =>
  handleResponse(await fetch(`${API_URL}/tasks`, { method: "POST", headers: getHeaders(), body: JSON.stringify(task) }));

export const updateTask = async (id, task) =>
  handleResponse(await fetch(`${API_URL}/tasks/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(task) }));

export const deleteTask = async (id) =>
  handleResponse(await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE", headers: getHeaders() }));

// ─── SERVICES ───
export const fetchServices = async () =>
  handleResponse(await fetch(`${API_URL}/services`, { headers: getHeaders() }));

export const fetchProjectServices = async (projectId) =>
  handleResponse(await fetch(`${API_URL}/services?projectId=${projectId}`, { headers: getHeaders() }));

export const createService = async (service) =>
  handleResponse(await fetch(`${API_URL}/services`, { method: "POST", headers: getHeaders(), body: JSON.stringify(service) }));

export const createProjectService = async (service) => createService(service);

export const updateService = async (id, service) =>
  handleResponse(await fetch(`${API_URL}/services/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(service) }));

export const updateProjectService = async (id, service) => updateService(id, service);

export const deleteService = async (id) =>
  handleResponse(await fetch(`${API_URL}/services/${id}`, { method: "DELETE", headers: getHeaders() }));

export const deleteProjectService = async (id) => deleteService(id);

// ─── USERS ───
export const fetchUsersByRole = async (role) => {
  const params = role ? `?role=${role}` : "";
  return handleResponse(await fetch(`${API_URL}/users${params}`, { headers: getHeaders() }));
};

// ─── STUBS — features not yet implemented on backend ───
export const getCompanySetting = async () => null;
export const fetchCompanySnapshot = async () => null;
export const setCompanySetting = async () => null;
export const deleteCompanySetting = async () => null;
export const getAllCompanySettings = async () => [];
export const fetchAriaUnreadCount = async () => 0;
export const fetchAriaMessages = async () => [];
export const markAriaMessagesRead = async () => true;
export const sendAriaUserReply = async () => null;
export const getMyWorkStatus = async () => null;
export const setWorkStatus = async () => null;
export const setEmployeeSalary = async () => null;
export const fetchUserLeaveHistory = async () => [];
export const fetchTeamPerformance = async () => [];
export const fetchAllLeaveRequests = async () => [];
export const updateLeaveRequest = async () => null;
export const fetchCompanyPnL = async () => ({ income: 0, expenses: 0, net: 0 });
export const submitLeaveRequest = async () => null;
export const fetchMyLeaveRequests = async () => [];
export const fetchServicesWithDeliveryStatus = async () => [];
export const fetchAllAriaConversations = async () => [];
export const fetchAriaLogs = async () => [];
export const getAriaConfig = async () => null;
export const runAriaScan = async () => null;
export const saveAriaConfig = async () => null;

// ─── ADMIN FINANCE CONTROL ───
export const fetchFinanceOverview = async () =>
  handleResponse(await fetch(`${API_URL}/admin/finance/overview`, { headers: getHeaders() }));

export const fetchFundTransfers = async (companyId) => {
  const params = companyId ? `?companyId=${companyId}` : "";
  return handleResponse(await fetch(`${API_URL}/admin/finance/transfers${params}`, { headers: getHeaders() }));
};

export const depositFunds = async (payload) =>
  handleResponse(await fetch(`${API_URL}/admin/finance/deposit`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) }));

export const transferFunds = async (payload) =>
  handleResponse(await fetch(`${API_URL}/admin/finance/transfer`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) }));

export const returnFunds = async (payload) =>
  handleResponse(await fetch(`${API_URL}/admin/finance/return`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) }));

export const withdrawFunds = async (payload) =>
  handleResponse(await fetch(`${API_URL}/admin/finance/withdraw`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) }));

// ─── ADMIN INSIGHTS ───
export const fetchInsightsOverview        = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/overview`, { headers: getHeaders() }));

export const fetchRevenueTrend            = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/revenue-trend`, { headers: getHeaders() }));

export const fetchClientInsights          = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/clients`, { headers: getHeaders() }));

export const fetchProjectsAtRisk          = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/projects-at-risk`, { headers: getHeaders() }));

export const fetchManagerWorkload         = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/manager-workload`, { headers: getHeaders() }));

export const fetchTaskCompletionRate      = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/task-completion-rate`, { headers: getHeaders() }));

export const fetchCompanyPerformance      = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/company-performance`, { headers: getHeaders() }));

export const fetchPaymentAging            = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/payment-aging`, { headers: getHeaders() }));

// ─── ATTENDANCE ───
export const fetchAttendance = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.userId)        params.set('userId', filters.userId);
  if (filters.freelancerId)  params.set('freelancerId', filters.freelancerId);
  if (filters.startDate)     params.set('startDate', filters.startDate);
  if (filters.endDate)       params.set('endDate', filters.endDate);
  if (filters.month)         params.set('month', filters.month);
  if (filters.year)          params.set('year', filters.year);
  if (filters.status)        params.set('status', filters.status);
  if (filters.page)          params.set('page', filters.page);
  const qs = params.toString() ? `?${params}` : '';
  return handleResponse(await fetch(`${API_URL}/attendance${qs}`, { headers: getHeaders() }));
};

export const fetchAttendanceSummary = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.month)     params.set('month', filters.month);
  if (filters.year)      params.set('year', filters.year);
  if (filters.companyId) params.set('companyId', filters.companyId);
  return handleResponse(await fetch(`${API_URL}/admin/attendance/summary?${params}`, { headers: getHeaders() }));
};

export const markAttendance = async (payload) =>
  handleResponse(await fetch(`${API_URL}/admin/attendance`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) }));

export const updateAttendance = async (id, payload) =>
  handleResponse(await fetch(`${API_URL}/admin/attendance/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) }));

export const deleteAttendance = async (id) =>
  handleResponse(await fetch(`${API_URL}/admin/attendance/${id}`, { method: 'DELETE', headers: getHeaders() }));

// ─── FREELANCERS ───
export const fetchFreelancers        = async (filters = {}) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([,v]) => v));
  return handleResponse(await fetch(`${API_URL}/admin/freelancers?${params}`, { headers: getHeaders() }));
};
export const fetchFreelancer         = async (id) =>
  handleResponse(await fetch(`${API_URL}/admin/freelancers/${id}`, { headers: getHeaders() }));
export const createFreelancer        = async (data) =>
  handleResponse(await fetch(`${API_URL}/admin/freelancers`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }));
export const updateFreelancer        = async (id, data) =>
  handleResponse(await fetch(`${API_URL}/admin/freelancers/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }));
export const deleteFreelancer        = async (id) =>
  handleResponse(await fetch(`${API_URL}/admin/freelancers/${id}`, { method: 'DELETE', headers: getHeaders() }));
export const createFreelancerAssignment = async (id, data) =>
  handleResponse(await fetch(`${API_URL}/admin/freelancers/${id}/assignments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }));
export const updateFreelancerAssignment = async (id, assignId, data) =>
  handleResponse(await fetch(`${API_URL}/admin/freelancers/${id}/assignments/${assignId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }));
export const logFreelancerPayment    = async (id, data) =>
  handleResponse(await fetch(`${API_URL}/admin/freelancers/${id}/payments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }));

// ─── VENDORS ───
export const fetchVendors      = async (filters = {}) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([,v]) => v));
  return handleResponse(await fetch(`${API_URL}/admin/vendors?${params}`, { headers: getHeaders() }));
};
export const fetchVendor       = async (id) =>
  handleResponse(await fetch(`${API_URL}/admin/vendors/${id}`, { headers: getHeaders() }));
export const createVendor      = async (data) =>
  handleResponse(await fetch(`${API_URL}/admin/vendors`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }));
export const updateVendor      = async (id, data) =>
  handleResponse(await fetch(`${API_URL}/admin/vendors/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }));
export const deleteVendor      = async (id) =>
  handleResponse(await fetch(`${API_URL}/admin/vendors/${id}`, { method: 'DELETE', headers: getHeaders() }));
export const createVendorBill  = async (id, data) =>
  handleResponse(await fetch(`${API_URL}/admin/vendors/${id}/bills`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }));
export const updateVendorBill  = async (id, billId, data) =>
  handleResponse(await fetch(`${API_URL}/admin/vendors/${id}/bills/${billId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }));
export const logVendorPayment  = async (id, data) =>
  handleResponse(await fetch(`${API_URL}/admin/vendors/${id}/payments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }));

// ─── ADDITIONAL INSIGHTS EXTENSIONS ───
export const fetchAttendanceInsights  = async (m, y) =>
  handleResponse(await fetch(`${API_URL}/admin/insights/attendance-overview?month=${m}&year=${y}`, { headers: getHeaders() }));
export const fetchFreelancerSpend     = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/freelancer-spend`, { headers: getHeaders() }));
export const fetchVendorSpend         = async () =>
  handleResponse(await fetch(`${API_URL}/admin/insights/vendor-spend`, { headers: getHeaders() }));
