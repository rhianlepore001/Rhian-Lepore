
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  lastVisit: string;
  totalVisits: number;
  hairHistory: HairRecord[];
  notes: string;
  nextPrediction: string;
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
  service: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
  price: number;
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
