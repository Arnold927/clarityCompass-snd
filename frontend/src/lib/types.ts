import { RoleType } from "./constants";

export type Project = {
  name: string;
  status: 'On Track' | 'At Risk' | 'Completed';
  progress: number;
};

export type Kpi = {
  name: string;
  target: number;
  actual: number;
};

export type Engagement = {
  id: string;
  person: string;
  avatar: string;
  action: string;
  timestamp: string;
};

export type TeamMember = {
  id: string;
  name?: string;
  username?: string;
  member_name?: string;
  role: RoleType;
  phone?: string;
  email?: string;
}

export interface Decision {
  id: number;
  title: string;
  description: string;
  decision_type: string;
  
  owner: number | null;
  owner_details?: User;
  assigned_to: number | null;
  assigned_to_details?: User;
  
  project: number | null;
  project_title?: string;
  created_by: number;
  created_by_details?: User;
  
  created_at: string;
  updated_at: string;
  deadline: string | null;
  completed_at: string | null;
  
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  progress_percentage: number;
  
  rationale: string;
  expected_outcome: string;
  actual_outcome: string;
  
  days_to_complete: number | null;
  is_recurring: boolean;
  recurrence_pattern: string;
  
  risk_level: 'low' | 'medium' | 'high';
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  
  stakeholders: number[];
  stakeholders_details?: User[];
  tags: number[];
  tags_details?: Tag[];
  
  is_overdue: boolean;
  days_remaining: number | null;
  
  recent_updates?: DecisionUpdate[];
  
  owner_name?: string;
  assigned_to_name?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
}

export type UserDetails = User;

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string;
}

export interface DecisionUpdate {
  id: number;
  decision: number;
  user: User;
  update_text: string;
  attachment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user: number;
  notification_type: string;
  decision?: Decision;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
}


