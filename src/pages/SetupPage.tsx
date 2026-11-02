import React, { useState } from 'react';
import { Homestay, Room } from '../types';
import { useHomestay } from '../contexts/HomestayContext';
import { api } from '../lib/supabase';
import { useToast } from '../components/common/Toast';
import { formatCurrency } from '../lib/constants';
import { HomestayModal } from '../components/homestays/HomestayModal';
import { RoomModal } from '../components/homestays/RoomModal';
import {
  Building2,
  BedDouble,
  PlusCircle,
  Edit,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const SetupPage: React.FC = () => {
  const { allHomestays, rooms, refresh } = useHomestay();
  const { showToast, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'rooms' | 'homestays'>('rooms');

  // Homestay Modal state
  const [isHomestayModalOpen, setIsHomestayModalOpen] = useState(false);
  const [homestayToEdit, setHomestayToEdit] = useState<Homestay | null>(null);

  // Room Modal state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);

  const handleToggleRoomActive = async (r: Room) => {
    try {
      await api.saveRoom({
        id: r.id,
        homestay_id: r.homestay_id,
        name: r.name,
        default_rate: r.default_rate,
        active: !r.active,
      });
      showToast('Room Status Updated', `${r.name} is now ${!r.active ? 'Active' : 'Inactive'}.`);
      refresh();
    } catch (err) {
      showError(err, 'Could not toggle room status');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Homestays & Room Setup
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure homestay properties, room tiers, default pricing, and availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'homestays' ? (
            <button
              onClick={() => {
                setHomestayToEdit(null);
                setIsHomestayModalOpen(true);
              }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.01]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Homestay</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setRoomToEdit(null);
                setIsRoomModalOpen(true);
              }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.01]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'rooms'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Rooms & Rates ({rooms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('homestays')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'homestays'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Properties ({allHomestays.length})</span>
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'rooms' ? (
        /* Rooms Grid */
        rooms.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">No rooms added yet</p>
              <p className="text-xs text-slate-500 mt-1">
                {allHomestays.length === 0
                  ? 'Add a homestay property first, then create rooms and default rates.'
                  : 'Add room units with default rates to start taking reservations.'}
              </p>
            </div>
            <button
              onClick={() => {
                if (allHomestays.length === 0) {
                  setActiveTab('homestays');
                  setIsHomestayModalOpen(true);
                } else {
                  setRoomToEdit(null);
                  setIsRoomModalOpen(true);
                }
              }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{allHomestays.length === 0 ? 'Add Homestay First' : 'Add First Room'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                      {room.homestay?.name || 'Homestay'}
                    </span>
                    <button
                      onClick={() => handleToggleRoomActive(room)}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                        room.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {room.active ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3" />}
                      <span>{room.active ? 'Active' : 'Maintenance'}</span>
                    </button>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base">{room.name}</h4>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Default Rate</span>
                    <p className="text-lg font-black text-slate-900">
                      {formatCurrency(room.default_rate)}
                      <span className="text-xs font-normal text-slate-500"> / night</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setRoomToEdit(room);
                      setIsRoomModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Homestays List */
        allHomestays.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">No homestays configured yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Add your properties with their names and locations.
              </p>
            </div>
            <button
              onClick={() => {
                setHomestayToEdit(null);
                setIsHomestayModalOpen(true);
              }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add First Homestay</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allHomestays.map((homestay) => {
              const propertyRooms = rooms.filter((r) => r.homestay_id === homestay.id);
              return (
                <div
                  key={homestay.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{homestay.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {homestay.location}
                      </p>
                    </div>
                    <div className="pt-1">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {propertyRooms.length} Rooms Configured
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => {
                        setHomestayToEdit(homestay);
                        setIsHomestayModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Property</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modals */}
      <HomestayModal
        isOpen={isHomestayModalOpen}
        onClose={() => setIsHomestayModalOpen(false)}
        homestayToEdit={homestayToEdit}
        onSaved={refresh}
      />

      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomToEdit={roomToEdit}
        onSaved={refresh}
      />
    </div>
  );
};
