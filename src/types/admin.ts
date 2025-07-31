// Core admin types and interfaces for type safety

export interface AdminUser {
  id: string;
  phone: string;
  momo_code: string | null;
  credits: number;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AdminBusiness {
  id: string;
  name: string;
  momo_code: string;
  category: 'bar' | 'pharmacy' | 'shop' | 'produce' | 'hardware';
  subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
  status: 'active' | 'inactive';
  created_at: string;
  owner_user_id: string;
  owner_phone?: string;
  location_gps?: { latitude: number; longitude: number };
  pos_system_config?: Record<string, unknown>;
  monthly_revenue?: number;
  order_count?: number;
  rating?: number;
  last_active?: string;
  verified?: boolean;
}

export interface AdminDriver {
  id: string;
  user_id: string;
  full_name: string | null;
  momo_code: string;
  momo_number: string | null;
  plate_number: string | null;
  vehicle_plate: string | null;
  driver_kind: 'moto' | 'car' | 'bicycle' | null;
  is_online: boolean;
  location_gps?: { latitude: number; longitude: number };
  subscription_status: 'active' | 'trial' | 'suspended';
  created_at: string;
  logbook_url?: string | null;
}

export interface AdminOrder {
  id: string;
  user_id: string;
  business_id?: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'fulfilled' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  delivery_address?: string;
  delivery_fee?: number;
  notes?: string;
}

export interface AdminPayment {
  id: string;
  user_id: string;
  amount: number;
  currency: 'RWF' | 'USD';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'momo' | 'card' | 'bank' | 'cash';
  transaction_id?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface AdminConversation {
  id: string;
  contact_id: string;
  channel: 'whatsapp' | 'sms' | 'web';
  status: 'active' | 'closed' | 'escalated';
  message_count: number;
  started_at: string;
  ended_at?: string;
  assigned_agent_id?: string;
  handoff_requested: boolean;
  handoff_reason?: string;
  model_used?: string;
}

export interface KPIData {
  totalUsers: number;
  creditsToday: number;
  activeDrivers: number;
  pendingOrders: number;
  totalRevenue: number;
  newUsersToday: number;
  totalBusinesses: number;
  totalProducts: number;
  completedOrders: number;
  activeConversations: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface ChartData {
  date: string;
  amount: number;
  users: number;
  orders: number;
}

export interface RecentActivity {
  id: string;
  type: 'user' | 'order' | 'payment' | 'driver' | 'business';
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  amount?: number;
}

export interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  whatsapp: 'healthy' | 'degraded' | 'down';
  payments: 'healthy' | 'degraded' | 'down';
}

// Utility types
export type ViewMode = 'table' | 'grid';
export type SortOrder = 'asc' | 'desc';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Filter types
export interface AdminFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface UserFilters extends AdminFilters {
  creditFilter?: 'all' | 'low' | 'medium' | 'high';
  dateFilter?: 'all' | 'today' | 'week' | 'month';
}

export interface BusinessFilters extends AdminFilters {
  categoryFilter?: 'all' | 'bar' | 'pharmacy' | 'shop' | 'produce' | 'hardware';
  statusFilter?: 'all' | 'active' | 'trial' | 'suspended';
}

// API Response types
export interface AdminApiResponse<T> {
  data: T;
  count?: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Dashboard stats interfaces
export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  totalCredits: number;
  totalReferrals: number;
  avgCreditsPerUser: number;
  lowCreditUsers: number;
}

export interface BusinessStats {
  totalBusinesses: number;
  activeBusinesses: number;
  monthlyGrowth: number;
  totalRevenue: number;
  averageRating: number;
  recentSignups: number;
}

export interface CategoryStats {
  bars: number;
  pharmacies: number;
  shops: number;
  produce: number;
  hardware: number;
}

// Component prop types
export interface AdminTableProps<T> {
  data: T[];
  loading: boolean;
  columns: AdminTableColumn<T>[];
  onSort?: (field: keyof T, order: SortOrder) => void;
  onAction?: (action: string, item: T) => void;
}

export interface AdminTableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, item: T) => React.ReactNode;
}

// Error types
export class AppError extends Error {
  code?: string;
  details?: Record<string, unknown>;
  
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export interface AdminError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Export all types for easy importing
export type {
  AdminUser as User,
  AdminBusiness as Business,
  AdminDriver as Driver,
  AdminOrder as Order,
  AdminPayment as Payment,
  AdminConversation as Conversation,
};