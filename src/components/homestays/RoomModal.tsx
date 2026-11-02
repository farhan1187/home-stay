import React, { useState, useEffect } from 'react';
import { Room } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../lib/supabase';
import { useHomestay } from '../../contexts/HomestayContext';
import { useToast } from '../common/Toast';
import { BedDouble, Building } from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomToEdit?: Room | null;
  defaultHomestayId?: string;
  onSaved: () => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  roomToEdit,
  defaultHomestayId,
  onSaved,
}) => {
  const { allHomestays } = useHomestay();
  const { showToast, showError } = useToast();

  const [homestayId, setHomestayId] = useState('');
  const [name, setName] = useState('');
  const [defaultRate, setDefaultRate] = useState<number>(2500);
  const [active, setActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roomToEdit) {
      setHomestayId(roomToEdit.homestay_id);
      setName(roomToEdit.name);
      setDefaultRate(roomToEdit.default_rate);
      setActive(roomToEdit.active);
    } else {
      setHomestayId(defaultHomestayId || allHomestays[0]?.id || '');
      setName('');
      setDefaultRate(2500);
      setActive(true);
    }
  }, [roomToEdit, defaultHomestayId, allHomestays, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !homestayId) {
      showToast('Fields Required', 'Please provide room name and property.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await api.saveRoom({
        id: roomToEdit?.id,
        homestay_id: homestayId,
        name: name.trim(),
        default_rate: Number(defaultRate),
        active,
      });

      showToast('Room Saved', `${name} is configured.`);
      onSaved();
      onClose();
    } catch (err: any) {
      showError(err, 'Failed to save room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={roomToEdit ? 'Edit Room' : 'Add New Room'}
      subtitle="Configure room tier, default nightly rate, and availability"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Homestay Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-brand-600" />
            Homestay Property *
          </label>
          <select
            value={homestayId}
            onChange={(e) => setHomestayId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            {allHomestays.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.location})
              </option>
            ))}
          </select>
        </div>

        {/* Room Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <BedDouble className="w-3.5 h-3.5 text-brand-600" />
            Room Name / Unit *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Room 101 - Valley View Suite"
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Default Rate */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Default Rate per Night (₹) *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
              ₹
            </span>
            <input
              type="number"
              min="0"
              value={defaultRate}
              onChange={(e) => setDefaultRate(Number(e.target.value))}
              required
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Active Toggle */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Active for Bookings</p>
            <p className="text-[11px] text-slate-500">Uncheck to mark room under maintenance</p>
          </div>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
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
            {loading ? 'Saving...' : 'Save Room'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
