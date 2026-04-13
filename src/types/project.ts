
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
  assignedTo: string[]; // array of team member names
  status: ProjectStatus;
  deadline: string; // ISO string
  priority: ProjectPriority;
  budget?: number;
  advancePayment?: number;
  partialPayments?: number | any[];
  pendingPayment?: number;
  managerId?: string | null; // UUID of assigned manager
  managerName?: string | null; // display name of assigned manager
}
