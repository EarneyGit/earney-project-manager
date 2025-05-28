import axios, {
  AxiosRequestConfig,
  AxiosRequestHeaders,
  InternalAxiosRequestConfig,
} from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

// AUTH
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post("/auth/login", data);
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },
  updateProfile: async (data: { name?: string; email?: string }) => {
    const res = await apiClient.patch("/auth/profile", data);
    return res.data;
  },
};

// USERS
export const userApi = {
  getAll: async (params?: { search?: string; role?: string }) => {
    try {
      const res = await apiClient.get("/auth/users", { params });
      return res.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },
};

// PROJECTS
export const projectApi = {
  create: async (data: {
    name: string; // Required, max 100 chars
    clientName: string; // Required, max 100 chars
    description?: string; // Optional string
    startDate: string; // Required, ISO8601 (YYYY-MM-DD)
    deadline: string; // Required, ISO8601 (YYYY-MM-DD)
    status?: string; // Optional, enum
    priority?: string; // Optional, enum
    manager: string; // Required, MongoId
    team?: string[]; // Optional array of MongoIds
    budget: number; // Required, numeric, min 0
    advancePayment?: number; // Optional, numeric, min 0
    partialPayments?: number; // Optional, numeric, min 0
  }) => {
    const res = await apiClient.post("/projects", data);
    return res.data;
  },
  getAll: async (params?: {
    status?: string;
    priority?: string;
    search?: string;
  }) => {
    const res = await apiClient.get("/projects", { params });
    return res.data.data.projects;
  },
  get: async (id: string) => {
    const res = await apiClient.get(`/projects/${id}`);
    return res.data;
  },
  update: async (
    id: string,
    data: {
      name?: string; // Optional, max 100 chars when provided
      clientName?: string; // Optional, max 100 chars when provided
      description?: string; // Optional string
      startDate?: string; // Optional, ISO8601 when provided
      deadline?: string; // Optional, ISO8601 when provided
      status?: string; // Optional, enum when provided
      priority?: string; // Optional, enum when provided
      // Note: manager is not in update validation, so not updatable
      team?: string[]; // Optional array of MongoIds
      budget?: number; // Optional, numeric, min 0 when provided
      advancePayment?: number; // Optional, numeric, min 0 when provided
      partialPayments?: number; // Optional, numeric, min 0 when provided
    }
  ) => {
    const res = await apiClient.put(`/projects/${id}`, data); // Changed from patch to put
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/projects/${id}`);
    return res.data;
  },
  addTeamMember: async (id: string, userId: string) => {
    const res = await apiClient.post(`/projects/${id}/team`, { userId });
    return res.data;
  },
  removeTeamMember: async (id: string, userId: string) => {
    const res = await apiClient.delete(`/projects/${id}/team/${userId}`);
    return res.data;
  },
};

// TASKS
export const taskApi = {
  getMyTasks: async (params?: { status?: string; priority?: string }) => {
    const res = await apiClient.get("/tasks/my-tasks", { params });
    return res.data;
  },
  create: async (projectId: string, data: any) => {
    const res = await apiClient.post(`/tasks/project/${projectId}`, data);
    return res.data;
  },
  getProjectTasks: async (
    projectId: string,
    params?: { status?: string; priority?: string; assignedTo?: string }
  ) => {
    const res = await apiClient.get(`/tasks/project/${projectId}`, { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get(`/tasks/${id}`);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/tasks/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/tasks/${id}`);
    return res.data;
  },
};
