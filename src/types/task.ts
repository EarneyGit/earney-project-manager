
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string | null; // employee user ID (UUID)
  assigneeName?: string | null; // for display
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
