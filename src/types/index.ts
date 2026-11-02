export type UserRole = 'super_admin' | 'owner' | 'manager';

export type BookingStatus = 'booked' | 'checked_in' | 'checked_out' | 'cancelled';

export type BookingSource = 'walk-in' | 'phone' | 'online';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank';

export type ExpenseCategory = 'electricity' | 'cleaning' | 'staff' | 'maintenance' | 'other';

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  assigned_homestay_ids?: string[];
}

export interface Homestay {
  id: string;
  name: string;
  location: string;
  created_at?: string;
  rooms_count?: number;
}

export interface Room {
  id: string;
  homestay_id: string;
  name: string;
  default_rate: number;
  active: boolean;
  created_at?: string;
  homestay?: Homestay;
}

export interface ManagerHomestay {
  user_id: string;
  homestay_id: string;
  created_at?: string;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  id_proof_note?: string | null;
  created_at?: string;
}

export interface Booking {
  id: string;
  guest_id: string;
  room_id: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  num_guests: number;
  rate_per_night: number;
  total_amount: number;
  status: BookingStatus;
  source: BookingSource;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  guest?: Guest;
  room?: Room;
  payments?: Payment[];
  total_paid?: number;
  balance_due?: number;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  paid_on: string; // YYYY-MM-DD
  received_by?: string | null;
  note?: string | null;
  created_at: string;
  receiver?: Profile;
  booking?: Booking;
}

export interface Expense {
  id: string;
  homestay_id: string;
  category: ExpenseCategory;
  amount: number;
  spent_on: string; // YYYY-MM-DD
  note?: string | null;
  created_by?: string | null;
  created_at: string;
  homestay?: Homestay;
  creator?: Profile;
}

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  action: string;
  table_name: string;
  record_id: string;
  details?: any;
  created_at: string;
  user_profile?: Profile;
}

export type ActiveScreen = 
  | 'dashboard'
  | 'bookings'
  | 'calendar'
  | 'analytics'
  | 'basic_stats'
  | 'expenses'
  | 'setup'
  | 'users'
  | 'activity_log';
