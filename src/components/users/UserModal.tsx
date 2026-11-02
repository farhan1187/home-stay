import React, { useState } from 'react';
import { UserRole } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../lib/supabase';
import { useHomestay } from '../../contexts/HomestayContext';
import { useToast } from '../common/Toast';
import { ROLE_LABELS } from '../../lib/constants';
import { ShieldCheck, KeyRound, Mail, User, Building } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const { allHomestays } = useHomestay();
  const { showToast, showError } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('manager');
  const [assignedHomestays, setAssignedHomestays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleToggleHomestay = (hId: string) => {
    if (assignedHomestays.includes(hId)) {
      setAssignedHomestays(assignedHomestays.filter((id) => id !== hId));
    } else {
      setAssignedHomestays([...assignedHomestays, hId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      showToast('Fields Required', 'Please provide full name, email, and a temporary password.', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Short Password', 'Temporary password must be at least 6 characters long.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await api.adminCreateUser({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        role,
        assigned_homestays: role === 'manager' ? assignedHomestays : [],
      });

      showToast('User Created Successfully', `User account created for ${fullName} (${ROLE_LABELS[role]}).`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('manager');
      setAssignedHomestays([]);
      onUserCreated();
      onClose();
    } catch (err: any) {
      showError(err, 'Could not create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Staff / Partner User"
      subtitle="Creates auth user with temporary password and assigns property permissions"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-600" />
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-brand-600" />
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. ramesh@homestay.com"
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Temporary Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-brand-600" />
              Temporary Password *
            </label>
            <button
              type="button"
              onClick={generateRandomPassword}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Generate Random
            </button>
          </div>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            System Role *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['manager', 'owner', 'super_admin'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                  role === r
                    ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold ring-1 ring-brand-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Assigned Homestays (Only if Manager) */}
        {role === 'manager' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-brand-600" />
              Assigned Homestays (Optional)
            </label>
            <p className="text-[11px] text-slate-500">
              Select specific properties this manager can access. If none selected, they can access all properties.
            </p>
            <div className="space-y-1.5 pt-1">
              {allHomestays.map((h) => {
                const isChecked = assignedHomestays.includes(h.id);
                return (
                  <label
                    key={h.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleHomestay(h.id)}
                      className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">{h.name}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{h.location}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

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
            {loading ? 'Creating User...' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
