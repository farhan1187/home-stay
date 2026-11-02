import React, { useState, useEffect } from 'react';
import { Booking, PaymentMethod } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { formatCurrency, PAYMENT_METHODS } from '../../lib/constants';
import { CreditCard, Wallet, Calendar, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onPaymentRecorded: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentRecorded,
}) => {
  const { user } = useAuth();
  const { showToast, showError } = useToast();

  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [paidOn, setPaidOn] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const balanceDue = booking
    ? Math.max(0, Number(booking.balance_due ?? (Number(booking.total_amount) - (booking.total_paid || 0))))
    : 0;
  const isFullyPaid = balanceDue <= 0;

  useEffect(() => {
    if (booking) {
      if (balanceDue > 0) {
        setAmount(String(balanceDue));
      } else {
        setAmount('');
      }
      setPaidOn(new Date().toISOString().split('T')[0]);
      setNote('');
    }
  }, [booking, balanceDue]);

  if (!booking) return null;

  const numAmount = Number(amount);
  const isOverpaying = numAmount > balanceDue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFullyPaid) {
      showToast('Already Fully Paid', 'This booking has no remaining balance due.', 'warning');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      showToast('Invalid Amount', 'Please enter a valid payment amount greater than zero.', 'warning');
      return;
    }

    if (numAmount > balanceDue) {
      showToast(
        'Overpayment Not Allowed',
        `Maximum payment allowed is ${formatCurrency(balanceDue)}.`,
        'error'
      );
      return;
    }

    try {
      setLoading(true);
      await api.recordPayment(
        {
          booking_id: booking.id,
          amount: numAmount,
          method,
          paid_on: paidOn,
          note: note.trim() || undefined,
        },
        user?.id
      );

      showToast('Payment Recorded', `Received ${formatCurrency(numAmount)} via ${method.toUpperCase()}.`);
      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      showError(err, 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      subtitle={`Booking for ${booking.guest?.name || 'Guest'} • ${booking.room?.name || 'Room'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Balance status banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Booking Amount</p>
            <p className="text-base font-bold text-slate-900">{formatCurrency(booking.total_amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Balance Due</p>
            <p className={`text-base font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(balanceDue)}
            </p>
          </div>
        </div>

        {/* Fully Paid Warning / Alert */}
        {isFullyPaid ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">This booking is fully paid!</p>
              <p className="text-emerald-700 mt-0.5">
                Balance due is {formatCurrency(0)}. No additional payments are accepted to prevent double charging.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Fill Button */}
            {numAmount !== balanceDue && (
              <button
                type="button"
                onClick={() => setAmount(String(balanceDue))}
                className="w-full text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 py-1.5 px-3 rounded-lg transition-colors text-center"
              >
                Fill Full Balance Due ({formatCurrency(balanceDue)})
              </button>
            )}

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Amount Received ({formatCurrency(0).replace(/\d/g, '').trim()}) *
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Max: {formatCurrency(balanceDue)}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-semibold">
                  ₹
                </div>
                <input
                  type="number"
                  min="1"
                  max={balanceDue}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max ${balanceDue}`}
                  required
                  className={`w-full pl-8 pr-3 py-2 bg-white border rounded-xl text-slate-900 font-semibold focus:outline-none ${
                    isOverpaying
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
              </div>
              {isOverpaying && (
                <p className="text-xs text-rose-600 font-semibold mt-1">
                  Amount cannot exceed remaining balance of {formatCurrency(balanceDue)}.
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMethod(pm.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      method === pm.id
                        ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pm.id === 'cash' ? <Wallet className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Date *
              </label>
              <input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reference / Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. UPI Ref #402919 or 50% Advance"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {isFullyPaid ? 'Close' : 'Cancel'}
          </button>
          {!isFullyPaid && (
            <button
              type="submit"
              disabled={loading || isOverpaying || numAmount <= 0}
              className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/20 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
