import React, { useState } from 'react';
import { Profile } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../lib/supabase';
import { useToast } from '../common/Toast';
import { KeyRound } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Profile | null;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { showToast, showError } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Invalid Password', 'Password must be at least 6 characters.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await api.adminResetPassword(user.id, newPassword);
      showToast('Password Reset', `Password has been reset for ${user.full_name}.`);
      setNewPassword('');
      onClose();
    } catch (err: any) {
      showError(err, 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset User Password"
      subtitle={`Set a new temporary password for ${user.full_name}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-brand-600" />
            New Password *
          </label>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

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
            {loading ? 'Saving...' : 'Set Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
