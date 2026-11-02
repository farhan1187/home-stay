import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { api } from '../lib/supabase';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  FileCode,
} from 'lucide-react';

export const ActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (tableFilter !== 'all' && log.table_name !== tableFilter) return false;
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(s) ||
      log.action.toLowerCase().includes(s) ||
      log.record_id.toLowerCase().includes(s) ||
      log.user_profile?.full_name?.toLowerCase().includes(s) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(s)
    );
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('INSERT') || act.includes('CREATE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('RESET')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('DELETE') || act.includes('DISABLE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            System Audit Activity Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable database trigger audit records of changes across tables
          </p>
        </div>

        <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200 self-start sm:self-auto flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Owner & Super Admin Audit Trail
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, record ID, user..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
          >
            <option value="all">All Tables</option>
            <option value="bookings">Bookings</option>
            <option value="payments">Payments</option>
            <option value="expenses">Expenses</option>
            <option value="rooms">Rooms</option>
            <option value="homestays">Homestays</option>
            <option value="profiles">Users & Profiles</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No activity logs recorded.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const badgeClass = getActionBadge(log.action);

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${badgeClass}`}>
                        {log.action}
                      </span>
                      <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {log.table_name}
                      </span>
                      <span className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
                        ID: {log.record_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{log.user_profile?.full_name || 'System / Admin'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </span>

                      {log.details && (
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-1 hover:bg-slate-200/60 rounded-md text-slate-500 flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Hide' : 'Details'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable JSON details */}
                  {isExpanded && log.details && (
                    <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
