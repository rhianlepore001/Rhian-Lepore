/**
 * Client information and loyalty tracking
 * @interface Client
 */
export interface Client {
  /** Unique client ID */
  id: string;

  /** User/business ID (for RLS checks) */
  user_id?: string;

  /** Client's full name */
  name: string;

  /** Client's email address */
  email: string;

  /** Client's phone number */
  phone: string;

  /** Loyalty tier based on visits and spending */
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

  /** Date of last visit (ISO format) */
  lastVisit: string;

  /** Total number of visits */
  totalVisits: number;

  /** History of haircuts/services with photos */
  hairHistory: HairRecord[];

  /** Notes about client preferences */
  notes: string;

  /** Predicted next service based on history */
  nextPrediction: string;

  /** Account creation timestamp */
  created_at?: string;

  /** Last update timestamp */
  updated_at?: string;
}

/**
 * Record of a completed service with photo
 * @interface HairRecord
 */
export interface HairRecord {
  /** Unique record ID */
  id: string;

  /** Service date (ISO format) */
  date: string;

  /** Photo URL of the service result */
  imageUrl: string;

  /** Service/haircut type */
  service: string;

  /** Professional who performed service */
  barber: string;
}

/**
 * Scheduled appointment
 * @interface Appointment
 */
export interface Appointment {
  /** Unique appointment ID */
  id: string;

  /** Client name */
  clientName: string;

  /** Client ID reference */
  client_id?: string;

  /** Client phone number */
  clientPhone?: string;

  /** Service type/name */
  service: string;

  /** Appointment time (formatted) */
  time: string;

  /** Appointment timestamp (ISO format) */
  appointment_time: string;

  /** Appointment status */
  status: 'Confirmed' | 'Pending' | 'Completed';

  /** Final price paid */
  price: number;

  /** Base service price before discounts */
  basePrice?: number;

  /** Professional/barber ID */
  professional_id?: string;

  /** Appointment notes */
  notes?: string;

  /** User/business ID */
  user_id?: string;
}

/**
 * Finance record for barber/professional commission tracking
 * @interface FinanceRecord
 */
export interface FinanceRecord {
  /** Professional name */
  barberName: string;

  /** Total revenue from their services */
  revenue: number;

  /** Commission percentage */
  commissionRate: number;

  /** Commission amount */
  commissionValue: number;

  /** Whether commission is auto-split */
  autoSplit: boolean;
}

/**
 * Public-facing client information for shared links
 * @interface PublicClient
 */
export interface PublicClient {
  /** Client ID */
  id: string;

  /** Client name */
  name: string;

  /** Client phone */
  phone: string;

  /** Client email (optional) */
  email?: string | null;

  /** Client photo URL */
  photo_url?: string | null;

  /** Business ID (for public links) */
  business_id: string;
}

/**
 * Queue entry for service waitlist/walk-ins
 * @interface QueueEntry
 */
export interface QueueEntry {
  /** Unique queue entry ID */
  id: string;

  /** Business/shop ID */
  business_id: string;

  /** Client ID (if existing client) */
  client_id?: string;

  /** Client name (for walk-ins) */
  client_name: string;

  /** Client phone number */
  client_phone: string;

  /** Service ID being requested */
  service_id?: string;

  /** Assigned professional ID */
  professional_id?: string;

  /** Current queue status */
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'cancelled' | 'no_show';

  /** When client joined queue */
  joined_at: string;

  /** Estimated wait time in minutes */
  estimated_wait_time?: number;

  /** Queue notes */
  notes?: string;
}

/**
 * Dashboard key performance metrics
 * @interface DashboardMetrics
 */
export interface DashboardMetrics {
  /** Total profit earned */
  totalProfit: number;

  /** Revenue from recovered/rescheduled appointments */
  recoveredRevenue: number;

  /** Estimated value from prevented no-shows */
  avoidedNoShows: number;

  /** Value from filled empty time slots */
  filledSlots: number;

  /** Week-over-week growth percentage */
  weeklyGrowth: number;
}

/**
 * Recommended action for user attention
 * @interface ActionItem
 */
export interface ActionItem {
  /** Unique action ID */
  id: string;

  /** Action type (recovery, gap filling, upsell) */
  type: 'recovery' | 'gap' | 'upsell';

  /** Action title */
  title: string;

  /** Detailed description */
  description: string;

  /** Potential value (revenue) */
  value?: number;

  /** Related client name */
  clientName?: string;

  /** When action should be taken */
  time?: string;
}

/**
 * Service offering definition
 * @interface Service
 */
export interface Service {
  /** Unique service ID */
  id: string;

  /** User/business ID */
  user_id: string;

  /** Service name */
  name: string;

  /** Service description */
  description?: string;

  /** Service price */
  price: number;

  /** Service duration in minutes */
  duration: number;

  /** Service category for grouping */
  category?: string;

  /** Whether service is currently available */
  is_active: boolean;

  /** Service creation timestamp */
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
  ai_insights?: ActionItem[];
}
