import { UserRole, BookingStatus, ExpenseCategory, BookingSource, PaymentMethod } from '../types';

// Configurable currency symbol in ONE place
export const CURRENCY_SYMBOL: string = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return `${CURRENCY_SYMBOL}0`;
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Partner / Owner',
  manager: 'Property Manager',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  owner: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  manager: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  booked: {
    label: 'Booked',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  checked_in: {
    label: 'Checked In',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  checked_out: {
    label: 'Checked Out',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-400',
  },
};

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: string; color: string }[] = [
  { id: 'electricity', label: 'Electricity & Utilities', icon: 'Zap', color: 'text-amber-600 bg-amber-50' },
  { id: 'cleaning', label: 'Housekeeping & Laundry', icon: 'Sparkles', color: 'text-cyan-600 bg-cyan-50' },
  { id: 'staff', label: 'Staff Salaries & Meals', icon: 'Users', color: 'text-violet-600 bg-violet-50' },
  { id: 'maintenance', label: 'Repairs & Maintenance', icon: 'Wrench', color: 'text-rose-600 bg-rose-50' },
  { id: 'other', label: 'General / Supplies / Other', icon: 'Package', color: 'text-slate-600 bg-slate-100' },
];

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI / GPay / PhonePe' },
  { id: 'card', label: 'Credit / Debit Card' },
  { id: 'bank', label: 'Bank Transfer (NEFT/IMPS)' },
];

export const BOOKING_SOURCES: { id: BookingSource; label: string }[] = [
  { id: 'walk-in', label: 'Walk-In Guest' },
  { id: 'phone', label: 'Phone / WhatsApp Inquiry' },
  { id: 'online', label: 'Online / Airbnb / Booking.com' },
];
