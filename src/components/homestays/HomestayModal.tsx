import React, { useState, useEffect } from 'react';
import { Homestay } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../lib/supabase';
import { useToast } from '../common/Toast';
import { Building2, MapPin } from 'lucide-react';

interface HomestayModalProps {
  isOpen: boolean;
  onClose: () => void;
  homestayToEdit?: Homestay | null;
  onSaved: () => void;
}

export const HomestayModal: React.FC<HomestayModalProps> = ({
  isOpen,
  onClose,
  homestayToEdit,
  onSaved,
}) => {
  const { showToast, showError } = useToast();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (homestayToEdit) {
      setName(homestayToEdit.name);
      setLocation(homestayToEdit.location);
    } else {
      setName('');
      setLocation('');
    }
  }, [homestayToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      showToast('Fields Required', 'Please provide property name and location.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await api.saveHomestay({
        id: homestayToEdit?.id,
        name: name.trim(),
        location: location.trim(),
      });
      showToast('Property Saved', `${name} has been updated.`);
      onSaved();
      onClose();
    } catch (err: any) {
      showError(err, 'Failed to save homestay');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={homestayToEdit ? 'Edit Homestay' : 'Add New Homestay'}
      subtitle="Configure property branding and geographic location"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand-600" />
            Property Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mountain Mist Retreat"
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            Location / Address *
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Munnar, Kerala"
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
            {loading ? 'Saving...' : 'Save Homestay'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
