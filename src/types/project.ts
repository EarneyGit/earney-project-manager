
export enum ProjectStatus {
  NOT_STARTED = "Not Started",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed"
}

export enum ProjectPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  URGENT = "Urgent"
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  startTime: string; // ISO string
  assignedTo: string[]; // Changed to array of strings
  status: ProjectStatus;
  deadline: string; // ISO string
  priority: ProjectPriority;
  budget?: number;
  advancePayment?: number;
  partialPayments?: number | any[];
  pendingPayment?: number; // Added back the pendingPayment property
}
