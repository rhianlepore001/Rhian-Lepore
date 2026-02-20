
export interface Client {
  id: string;
  user_id?: string; // For RLS checks
  name: string;
  email: string;
  phone: string;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  lastVisit: string;
  totalVisits: number;
  hairHistory: HairRecord[];
  notes: string;
  nextPrediction: string;
  created_at?: string;
  updated_at?: string;
}

export interface HairRecord {
  id: string;
  date: string;
  imageUrl: string;
  service: string;
  barber: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  client_id?: string;
  clientPhone?: string;
  service: string;
  time: string;
  appointment_time: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
  price: number;
  basePrice?: number;
  professional_id?: string;
  notes?: string;
  user_id?: string;
}

export interface FinanceRecord {
  barberName: string;
  revenue: number;
  commissionRate: number;
  commissionValue: number;
  autoSplit: boolean;
}

export interface PublicClient {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  photo_url?: string | null;
  business_id: string;
}

export interface QueueEntry {
  id: string;
  business_id: string;
  client_name: string;
  client_phone: string;
  service_id?: string;
  professional_id?: string;
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'cancelled' | 'no_show';
  joined_at: string;
  estimated_wait_time?: number;
  notes?: string;
}

export interface DashboardMetrics {
  totalProfit: number;
  recoveredRevenue: number;
  avoidedNoShows: number; // Value in currency
  filledSlots: number;    // Value in currency
  weeklyGrowth: number;
}

export interface ActionItem {
  id: string;
  type: 'recovery' | 'gap' | 'upsell';
  title: string;
  description: string;
  value?: number;
  clientName?: string;
  time?: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // em minutos
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Professional {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  bio?: string;
  specialties?: string[];
  is_active: boolean;
  commission_rate?: number;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  user_type: 'barber' | 'beauty';
  region: 'BR' | 'PT';
  business_name: string;
  full_name: string;
  photo_url?: string;
  business_slug?: string;
  tutorial_completed: boolean;
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled';
  trial_ends_at?: string;
  monthly_goal?: number;
  created_at: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method?: string;
  professional_id?: string;
  appointment_id?: string;
  created_at: string;
}

export interface GoalHistory {
  month: string;
  year: number;
  goal: number;
  achieved: number;
  percentage: number;
  success: boolean;
}

export interface DashboardStats {
  total_profit: number;
  current_month_revenue: number;
  weekly_growth: number;
  monthly_goal?: number;
}
