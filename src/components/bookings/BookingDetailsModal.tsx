import React, { useState } from 'react';
import { Booking } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { api } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { formatCurrency } from '../../lib/constants';
import { formatDisplayDate, calculateNights } from '../../lib/dateUtils';
import {
  Calendar,
  User,
  Phone,
  Home,
  CreditCard,
  CheckCircle,
  LogIn,
  LogOut,
  XCircle,
  Trash2,
  Edit,
  PlusCircle,
  Clock,
} from 'lucide-react';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onOpenPaymentModal: (b: Booking) => void;
  onOpenEditModal: (b: Booking) => void;
  onRefresh: () => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  isOpen,
  onClose,
  booking,
  onOpenPaymentModal,
  onOpenEditModal,
  onRefresh,
}) => {
  const { role } = useAuth();
  const { showToast, showError } = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!booking) return null;

  const isOwnerOrAdmin = role === 'super_admin' || role === 'owner';
  const totalPaid = booking.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || booking.total_paid || 0;
  const balanceDue = Number(booking.total_amount) - totalPaid;
  const nights = calculateNights(booking.check_in, booking.check_out);

  const handleStatusChange = async (newStatus: Booking['status']) => {
    if (booking.status === 'checked_out' && newStatus === 'checked_in') {
      showToast('Already Checked Out', 'This guest has already checked out and completed their stay.', 'warning');
      return;
    }
    try {
      setLoadingAction(newStatus);
      await api.updateBookingStatus(booking.id, newStatus);
      showToast('Status Updated', `Booking status changed to ${newStatus.replace('_', ' ').toUpperCase()}`);
      onRefresh();
      onClose();
    } catch (err: any) {
      showError(err, 'Failed to update status');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    try {
      setLoadingAction('delete');
      await api.deleteBooking(booking.id);
      showToast('Booking Deleted', 'Booking record has been removed.');
      onRefresh();
      onClose();
    } catch (err: any) {
      showError(err, 'Failed to delete booking');
    } finally {
      setLoadingAction(null);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Details"
      subtitle={`Reference ID: ${booking.id}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Top Header info */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs text-slate-400 font-medium">Status</span>
            <div className="mt-1">
              <StatusBadge status={booking.status} />
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Payment State</span>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  balanceDue <= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {balanceDue <= 0 ? 'Fully Paid' : `Balance Due: ${formatCurrency(balanceDue)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Guest and Property Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-brand-600" />
              Guest
            </p>
            <p className="text-sm font-bold text-slate-900 mt-1">{booking.guest?.name || 'Guest'}</p>
            <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400" />
              {booking.guest?.phone || 'No phone'}
            </p>
            {booking.guest?.id_proof_note && (
              <p className="text-[11px] text-slate-500 mt-1 italic">
                Note: {booking.guest.id_proof_note}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-brand-600" />
              Stay & Property
            </p>
            <p className="text-sm font-bold text-slate-900 mt-1">{booking.room?.homestay?.name || 'Homestay'}</p>
            <p className="text-xs text-brand-700 font-semibold mt-0.5">{booking.room?.name || 'Room'}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {booking.num_guests} Guests • {booking.source.toUpperCase()} Source
            </p>
          </div>
        </div>

        {/* Dates card */}
        <div className="p-3.5 bg-brand-50/50 border border-brand-100 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Check-In → Check-Out</p>
              <p className="text-sm font-bold text-slate-900">
                {formatDisplayDate(booking.check_in)} → {formatDisplayDate(booking.check_out)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-brand-800 bg-brand-100/80 px-2 py-0.5 rounded-full">
              {nights} Nights
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Free checkout day</p>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Rate per Night:</span>
            <span>{formatCurrency(booking.rate_per_night)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Duration:</span>
            <span>{nights} nights</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold border-t border-slate-800 pt-2 text-white">
            <span>Total Booking Amount:</span>
            <span className="text-base font-bold text-white">{formatCurrency(booking.total_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Total Collected / Paid:</span>
            <span>{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold border-t border-slate-800 pt-2">
            <span>Remaining Balance Due:</span>
            <span className={balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}>
              {formatCurrency(balanceDue)}
            </span>
          </div>
        </div>

        {/* Payments History */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-brand-600" />
              Payments History ({booking.payments?.length || 0})
            </h4>
            {balanceDue > 0 && booking.status !== 'cancelled' ? (
              <button
                onClick={() => {
                  onClose();
                  onOpenPaymentModal(booking);
                }}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Record Payment
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                {balanceDue <= 0 ? 'Fully Paid' : 'Cancelled'}
              </span>
            )}
          </div>

          {booking.payments && booking.payments.length > 0 ? (
            <div className="space-y-1.5">
              {booking.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                    <span className="text-slate-500 ml-1.5 uppercase font-medium">({p.method})</span>
                    {p.note && <p className="text-[11px] text-slate-500 mt-0.5">{p.note}</p>}
                  </div>
                  <div className="text-right text-slate-400 text-[11px]">
                    <p>{p.paid_on}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No payments recorded yet for this booking.
            </div>
          )}
        </div>

        {/* Operational Action Buttons or Delete Confirmation */}
        {isConfirmingDelete ? (
          <div className="pt-2 border-t border-rose-200">
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
              <div className="text-rose-800 pr-2">
                <p className="font-bold">Delete this reservation permanently?</p>
                <p className="text-[11px] text-rose-600">All payment records for this booking will also be removed.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={loadingAction === 'delete'}
                  className="px-3 py-1.5 text-slate-600 hover:bg-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loadingAction === 'delete'}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{loadingAction === 'delete' ? 'Deleting...' : 'Yes, Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            {/* Status buttons */}
            <div className="flex items-center gap-1.5">
              {booking.status === 'booked' && (
                <button
                  onClick={() => handleStatusChange('checked_in')}
                  disabled={Boolean(loadingAction)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Check In
                </button>
              )}

              {booking.status === 'checked_in' && (
                <button
                  onClick={() => handleStatusChange('checked_out')}
                  disabled={Boolean(loadingAction)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Check Out
                </button>
              )}

              {booking.status !== 'cancelled' && (
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={Boolean(loadingAction)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Booking
                </button>
              )}
            </div>

            {/* Edit / Delete / Payment */}
            <div className="flex items-center gap-1.5">
              {balanceDue > 0 && booking.status !== 'cancelled' ? (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPaymentModal(booking);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  + Pay
                </button>
              ) : (
                <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Paid
                </span>
              )}

              <button
                onClick={() => {
                  onClose();
                  onOpenEditModal(booking);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>

              {/* Delete button: ONLY visible to Owner or Super Admin! */}
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={Boolean(loadingAction)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Delete Booking (Owner/Admin only)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
