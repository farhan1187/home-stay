import { Booking, Payment, Expense } from '../types';
import { formatDisplayDate } from './dateUtils';

function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBookingsToCSV(bookings: Booking[]) {
  const headers = [
    'Booking ID',
    'Guest Name',
    'Phone',
    'Homestay',
    'Room',
    'Check In',
    'Check Out',
    'Nights',
    'Guests',
    'Rate Per Night',
    'Total Amount',
    'Total Paid',
    'Balance Due',
    'Status',
    'Source',
    'Notes',
    'Created At'
  ];

  const rows = bookings.map((b) => {
    const totalPaid = b.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || b.total_paid || 0;
    const balanceDue = Number(b.total_amount) - totalPaid;
    return [
      `"${b.id}"`,
      `"${b.guest?.name || ''}"`,
      `"${b.guest?.phone || ''}"`,
      `"${b.room?.homestay?.name || ''}"`,
      `"${b.room?.name || ''}"`,
      `"${b.check_in}"`,
      `"${b.check_out}"`,
      `"${calculateNights(b.check_in, b.check_out)}"`,
      `"${b.num_guests}"`,
      `"${b.rate_per_night}"`,
      `"${b.total_amount}"`,
      `"${totalPaid}"`,
      `"${balanceDue}"`,
      `"${b.status}"`,
      `"${b.source}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
      `"${formatDisplayDate(b.created_at, true)}"`
    ].join(',');
  });

  function calculateNights(cin: string, cout: string) {
    const d1 = new Date(cin);
    const d2 = new Date(cout);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  }

  const csv = [headers.join(','), ...rows].join('\r\n');
  downloadCSV(csv, `homestay-bookings-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportPaymentsToCSV(payments: Payment[]) {
  const headers = [
    'Payment ID',
    'Booking ID',
    'Guest Name',
    'Homestay',
    'Room',
    'Amount',
    'Method',
    'Paid On',
    'Note',
    'Received By',
    'Created At'
  ];

  const rows = payments.map((p) => [
    `"${p.id}"`,
    `"${p.booking_id}"`,
    `"${p.booking?.guest?.name || ''}"`,
    `"${p.booking?.room?.homestay?.name || ''}"`,
    `"${p.booking?.room?.name || ''}"`,
    `"${p.amount}"`,
    `"${p.method.toUpperCase()}"`,
    `"${p.paid_on}"`,
    `"${(p.note || '').replace(/"/g, '""')}"`,
    `"${p.receiver?.full_name || ''}"`,
    `"${formatDisplayDate(p.created_at, true)}"`
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\r\n');
  downloadCSV(csv, `homestay-payments-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportExpensesToCSV(expenses: Expense[]) {
  const headers = [
    'Expense ID',
    'Homestay',
    'Category',
    'Amount',
    'Spent On',
    'Note',
    'Created By',
    'Created At'
  ];

  const rows = expenses.map((e) => [
    `"${e.id}"`,
    `"${e.homestay?.name || ''}"`,
    `"${e.category}"`,
    `"${e.amount}"`,
    `"${e.spent_on}"`,
    `"${(e.note || '').replace(/"/g, '""')}"`,
    `"${e.creator?.full_name || ''}"`,
    `"${formatDisplayDate(e.created_at, true)}"`
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\r\n');
  downloadCSV(csv, `homestay-expenses-${new Date().toISOString().split('T')[0]}.csv`);
}
