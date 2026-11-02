import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { api } from '../lib/supabase';
import { useHomestay } from '../contexts/HomestayContext';
import { useToast } from '../components/common/Toast';
import { RoleBadge } from '../components/common/Badge';
import { UserModal } from '../components/users/UserModal';
import { ResetPasswordModal } from '../components/users/ResetPasswordModal';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  Users2,
  PlusCircle,
  KeyRound,
  CheckCircle,
  XCircle,
  Shield,
  Building,
  Mail,
  UserCheck,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { allHomestays } = useHomestay();
  const { showToast, showError } = useToast();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resetPassUser, setResetPassUser] = useState<Profile | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (u: Profile) => {
    try {
      await api.adminToggleUserStatus(u.id, !u.active);
      showToast('User Status Updated', `${u.full_name} is now ${!u.active ? 'Enabled' : 'Disabled'}.`);
      fetchUsers();
    } catch (err: any) {
      showError(err, 'Failed to update user status');
    }
  };

  const handleChangeRole = async (u: Profile, newRole: UserRole) => {
    try {
      await api.adminUpdateRole(u.id, newRole, u.assigned_homestay_ids);
      showToast('Role Changed', `${u.full_name}'s role changed to ${newRole}.`);
      fetchUsers();
    } catch (err: any) {
      showError(err, 'Failed to update role');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Staff & Partner User Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create system accounts, assign homestay properties, reset passwords, and revoke access
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create User</span>
        </button>
      </div>

      {/* Users Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No users registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assigned Properties</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const assignedHomestayNames = (u.assigned_homestay_ids || [])
                    .map((hId) => allHomestays.find((h) => h.id === hId)?.name)
                    .filter(Boolean);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Email */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.full_name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {u.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Switcher */}
                      <td className="px-4 py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                          className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 text-slate-800 focus:bg-white focus:outline-none"
                        >
                          <option value="manager">Manager</option>
                          <option value="owner">Owner / Partner</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>

                      {/* Assigned Homestays */}
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {u.role !== 'manager' ? (
                          <span className="text-slate-400 italic">All Properties (Full Access)</span>
                        ) : assignedHomestayNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedHomestayNames.map((name) => (
                              <span
                                key={name}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-semibold text-[11px]"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">All Homestays (Unrestricted)</span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            u.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {u.active ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{u.active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      {/* Reset Password */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setResetPassUser(u)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3 text-slate-500" />
                          <span>Reset Password</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={fetchUsers}
      />

      <ResetPasswordModal
        isOpen={Boolean(resetPassUser)}
        onClose={() => setResetPassUser(null)}
        user={resetPassUser}
      />
    </div>
  );
};
