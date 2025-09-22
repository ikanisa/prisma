// Mock data for Aurora Advisors platform
import { create } from 'zustand';

export type Role = 'SYSTEM_ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type EngagementStatus = 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
export type EngagementType = 'ACCOUNTING' | 'AUDIT' | 'TAX';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  brandPrimary: string;
  brandSecondary: string;
  logo?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
}

export interface Client {
  id: string;
  orgId: string;
  name: string;
  industry: string;
  country: string;
  fiscalYearEnd: string;
  contactName: string;
  contactEmail: string;
  createdAt: string;
}

export interface Engagement {
  id: string;
  orgId: string;
  clientId: string;
  type: EngagementType;
  periodStart: string;
  periodEnd: string;
  status: EngagementStatus;
  managerId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  orgId: string;
  engagementId: string;
  title: string;
  description?: string;
  dueDate: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
}

export interface Document {
  id: string;
  orgId: string;
  engagementId?: string;
  name: string;
  type: string;
  url: string;
  uploadedById: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metaJson: Record<string, any>;
  createdAt: string;
}

// Mock Data
export const mockOrganizations: Organization[] = [
  {
    id: '1',
    name: 'Aurora Advisors',
    slug: 'aurora',
    brandPrimary: '#00bcd4',
    brandSecondary: '#9c27b0',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sophia System',
    email: 'sophia@aurora.test',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Mark Manager',
    email: 'mark@aurora.test',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Eli Employee',
    email: 'eli@aurora.test',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eli',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

export const mockMemberships: Membership[] = [
  { id: '1', orgId: '1', userId: '1', role: 'SYSTEM_ADMIN' },
  { id: '2', orgId: '1', userId: '2', role: 'MANAGER' },
  { id: '3', orgId: '1', userId: '3', role: 'EMPLOYEE' }
];

export const mockClients: Client[] = [
  {
    id: '1',
    orgId: '1',
    name: 'TechFlow Industries',
    industry: 'Technology',
    country: 'United States',
    fiscalYearEnd: '2024-12-31',
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah.johnson@techflow.com',
    createdAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    orgId: '1',
    name: 'GreenLeaf Consulting',
    industry: 'Environmental',
    country: 'Canada',
    fiscalYearEnd: '2024-06-30',
    contactName: 'David Chen',
    contactEmail: 'david.chen@greenleaf.ca',
    createdAt: '2024-02-01T00:00:00Z'
  },
  {
    id: '3',
    orgId: '1',
    name: 'MetroBank Corp',
    industry: 'Financial Services',
    country: 'United States',
    fiscalYearEnd: '2024-12-31',
    contactName: 'Maria Rodriguez',
    contactEmail: 'maria.rodriguez@metrobank.com',
    createdAt: '2024-02-15T00:00:00Z'
  },
  {
    id: '4',
    orgId: '1',
    name: 'Sunrise Manufacturing',
    industry: 'Manufacturing',
    country: 'Mexico',
    fiscalYearEnd: '2024-12-31',
    contactName: 'Carlos Mendez',
    contactEmail: 'carlos.mendez@sunrise.mx',
    createdAt: '2024-03-01T00:00:00Z'
  },
  {
    id: '5',
    orgId: '1',
    name: 'HealthFirst Clinics',
    industry: 'Healthcare',
    country: 'United States',
    fiscalYearEnd: '2024-06-30',
    contactName: 'Dr. Jennifer Park',
    contactEmail: 'jennifer.park@healthfirst.com',
    createdAt: '2024-03-15T00:00:00Z'
  },
  {
    id: '6',
    orgId: '1',
    name: 'EduTech Solutions',
    industry: 'Education',
    country: 'Canada',
    fiscalYearEnd: '2024-08-31',
    contactName: 'Alex Thompson',
    contactEmail: 'alex.thompson@edutech.ca',
    createdAt: '2024-04-01T00:00:00Z'
  }
];

export const mockEngagements: Engagement[] = [
  {
    id: '1',
    orgId: '1',
    clientId: '1',
    type: 'AUDIT',
    periodStart: '2024-01-01',
    periodEnd: '2024-12-31',
    status: 'IN_PROGRESS',
    managerId: '2',
    createdAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    orgId: '1',
    clientId: '2',
    type: 'TAX',
    periodStart: '2023-07-01',
    periodEnd: '2024-06-30',
    status: 'REVIEW',
    managerId: '2',
    createdAt: '2024-02-01T00:00:00Z'
  },
  {
    id: '3',
    orgId: '1',
    clientId: '3',
    type: 'ACCOUNTING',
    periodStart: '2024-01-01',
    periodEnd: '2024-03-31',
    status: 'COMPLETED',
    managerId: '2',
    createdAt: '2024-02-15T00:00:00Z'
  },
  {
    id: '4',
    orgId: '1',
    clientId: '4',
    type: 'AUDIT',
    periodStart: '2024-01-01',
    periodEnd: '2024-12-31',
    status: 'PLANNING',
    managerId: '2',
    createdAt: '2024-03-01T00:00:00Z'
  },
  {
    id: '5',
    orgId: '1',
    clientId: '5',
    type: 'TAX',
    periodStart: '2023-07-01',
    periodEnd: '2024-06-30',
    status: 'IN_PROGRESS',
    managerId: '2',
    createdAt: '2024-03-15T00:00:00Z'
  },
  {
    id: '6',
    orgId: '1',
    clientId: '6',
    type: 'ACCOUNTING',
    periodStart: '2023-09-01',
    periodEnd: '2024-08-31',
    status: 'IN_PROGRESS',
    managerId: '2',
    createdAt: '2024-04-01T00:00:00Z'
  }
];

export const mockTasks: Task[] = [
  {
    id: '1',
    orgId: '1',
    engagementId: '1',
    title: 'Complete financial statement review',
    description: 'Review Q3 financial statements for accuracy and compliance',
    dueDate: '2024-12-15',
    assigneeId: '3',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    createdAt: '2024-01-20T00:00:00Z'
  },
  {
    id: '2',
    orgId: '1',
    engagementId: '1',
    title: 'Prepare audit documentation',
    description: 'Compile all required audit working papers',
    dueDate: '2024-12-20',
    assigneeId: '2',
    status: 'TODO',
    priority: 'MEDIUM',
    createdAt: '2024-01-25T00:00:00Z'
  },
  {
    id: '3',
    orgId: '1',
    engagementId: '2',
    title: 'Tax return preparation',
    description: 'Prepare corporate tax return for fiscal year 2023-2024',
    dueDate: '2024-12-10',
    assigneeId: '3',
    status: 'REVIEW',
    priority: 'URGENT',
    createdAt: '2024-02-05T00:00:00Z'
  },
  {
    id: '4',
    orgId: '1',
    engagementId: '3',
    title: 'Reconcile bank statements',
    description: 'Monthly bank reconciliation for March 2024',
    dueDate: '2024-11-30',
    assigneeId: '3',
    status: 'COMPLETED',
    priority: 'LOW',
    createdAt: '2024-02-20T00:00:00Z'
  }
];

// Zustand Store
interface AppStore {
  // Current user and org context
  currentUser: User | null;
  currentOrg: Organization | null;
  currentMembership: Membership | null;
  
  // Data
  organizations: Organization[];
  users: User[];
  memberships: Membership[];
  clients: Client[];
  engagements: Engagement[];
  tasks: Task[];
  documents: Document[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrentOrg: (org: Organization | null) => void;
  getCurrentUserRole: () => Role | null;
  getOrgClients: (orgId: string) => Client[];
  getOrgEngagements: (orgId: string) => Engagement[];
  getOrgTasks: (orgId: string) => Task[];
  getUserTasks: (userId: string, orgId: string) => Task[];
  
  // CRUD actions
  setClients: (clients: Client[]) => void;
  setEngagements: (engagements: Engagement[]) => void;
  setTasks: (tasks: Task[]) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  currentUser: null,
  currentOrg: null,
  currentMembership: null,
  
  // Mock data
  organizations: mockOrganizations,
  users: mockUsers,
  memberships: mockMemberships,
  clients: mockClients,
  engagements: mockEngagements,
  tasks: mockTasks,
  documents: [],
  notifications: [],
  activityLogs: [],
  
  // Actions
  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      // Auto-set org and membership for demo
      const membership = get().memberships.find(m => m.userId === user.id);
      if (membership) {
        const org = get().organizations.find(o => o.id === membership.orgId);
        set({ currentOrg: org || null, currentMembership: membership });
      }
    } else {
      set({ currentOrg: null, currentMembership: null });
    }
  },
  
  setCurrentOrg: (org) => set({ currentOrg: org }),
  
  getCurrentUserRole: () => {
    const { currentMembership } = get();
    return currentMembership?.role || null;
  },
  
  getOrgClients: (orgId) => get().clients.filter(c => c.orgId === orgId),
  getOrgEngagements: (orgId) => get().engagements.filter(e => e.orgId === orgId),
  getOrgTasks: (orgId) => get().tasks.filter(t => t.orgId === orgId),
  getUserTasks: (userId, orgId) => get().tasks.filter(t => t.assigneeId === userId && t.orgId === orgId),
  
  // CRUD actions
  setClients: (clients) => set({ clients }),
  setEngagements: (engagements) => set({ engagements }),
  setTasks: (tasks) => set({ tasks }),
}));