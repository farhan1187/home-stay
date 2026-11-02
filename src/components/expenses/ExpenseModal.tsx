import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHomestay } from '../../contexts/HomestayContext';
import { useToast } from '../common/Toast';
import { EXPENSE_CATEGORIES, formatCurrency } from '../../lib/constants';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
}) => {
  const { user } = useAuth();
  const { homestays } = useHomestay();
  const { showToast, showError } = useToast();

  const [homestayId, setHomestayId] = useState<string>(homestays[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('cleaning');
  const [amount, setAmount] = useState<string>('');
  const [spentOn, setSpentOn] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Invalid Amount', 'Please specify a positive expense amount.', 'warning');
      return;
    }

    if (!homestayId) {
      showToast('Property Required', 'Please select a homestay for this expense.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await api.recordExpense(
        {
          homestay_id: homestayId,
          category,
          amount: numAmount,
          spent_on: spentOn,
          note: note.trim() || undefined,
        },
        user?.id
      );

      showToast('Expense Recorded', `${formatCurrency(numAmount)} under ${category.toUpperCase()}`);
      setAmount('');
      setNote('');
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      showError(err, 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Operating Expense"
      subtitle="Track utilities, staff salaries, repairs, and supplies"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Homestay Selection */}
        {homestays.length === 0 ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            Please add a homestay under 'Homestays & Rooms' setup before adding expenses.
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Property *
            </label>
            <select
              value={homestayId}
              onChange={(e) => setHomestayId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {homestays.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Grid */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Expense Category *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                  category === cat.id
                    ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${category === cat.id ? 'bg-brand-600' : 'bg-slate-300'}`} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500"
                required
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Spent On Date *
            </label>
            <input
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Note / Memo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Description / Receipt Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Electricity bill for October, paid via NetBanking"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/20 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
