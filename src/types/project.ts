export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
}

export interface Project {
  _id?: string;
  id?: string;
  name: string; // Required, max 100 chars
  clientName: string; // Required, max 100 chars
  description?: string; // Optional string
  startDate: string; // Required, ISO8601 format
  deadline: string; // Required, ISO8601 format (backend uses 'deadline' not 'endDate')
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold'; // Optional on create, enum values
  priority: 'low' | 'medium' | 'high'; // Optional on create, enum values
  manager: string | User; // Required MongoId, can be populated User object in responses
  team: string[] | User[]; // Optional array of MongoIds, can be populated User objects in responses
  budget: number; // Required, numeric, min 0
  advancePayment?: number; // Optional, numeric, min 0
  partialPayments?: number; // Optional, numeric, min 0
  pendingPayment?: number; // Calculated field, not from backend
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export enum ProjectStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on-hold'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}
