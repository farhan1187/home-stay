import React, { useState, useEffect } from 'react';
import { Booking, BookingSource, BookingStatus } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHomestay } from '../../contexts/HomestayContext';
import { useToast } from '../common/Toast';
import { formatCurrency, BOOKING_SOURCES } from '../../lib/constants';
import { calculateNights, getTodayISO, getTomorrowISO } from '../../lib/dateUtils';
import { Search, UserCheck, AlertTriangle, Sparkles, Building2 } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingToEdit?: Booking | null;
  initialRoomId?: string;
  initialDate?: string;
  onBookingSaved: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  bookingToEdit,
  initialRoomId,
  initialDate,
  onBookingSaved,
}) => {
  const { user } = useAuth();
  const { homestays, rooms } = useHomestay();
  const { showToast, showError } = useToast();

  // Guest fields
  const [guestPhone, setGuestPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestIdNote, setGuestIdNote] = useState('');
  const [existingGuestId, setExistingGuestId] = useState<string | null>(null);
  const [isSearchingGuest, setIsSearchingGuest] = useState(false);

  // Booking fields
  const [selectedHomestayId, setSelectedHomestayId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [checkIn, setCheckIn] = useState<string>(getTodayISO());
  const [checkOut, setCheckOut] = useState<string>(getTomorrowISO());
  const [numGuests, setNumGuests] = useState<number>(2);
  const [ratePerNight, setRatePerNight] = useState<number>(2500);
  const [source, setSource] = useState<BookingSource>('phone');
  const [status, setStatus] = useState<BookingStatus>('booked');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);

  // Filter rooms by selected homestay
  const availableRooms = rooms.filter(
    (r) => !selectedHomestayId || r.homestay_id === selectedHomestayId
  );

  // Initialize form state
  useEffect(() => {
    if (bookingToEdit) {
      setGuestPhone(bookingToEdit.guest?.phone || '');
      setGuestName(bookingToEdit.guest?.name || '');
      setGuestIdNote(bookingToEdit.guest?.id_proof_note || '');
      setExistingGuestId(bookingToEdit.guest_id);

      const homestayId =
        bookingToEdit.room?.homestay_id ||
        rooms.find((r) => r.id === bookingToEdit.room_id)?.homestay_id ||
        '';
      if (homestayId) {
        setSelectedHomestayId(homestayId);
      }
      setRoomId(bookingToEdit.room_id);
      setCheckIn(bookingToEdit.check_in);
      setCheckOut(bookingToEdit.check_out);
      setNumGuests(bookingToEdit.num_guests);
      setRatePerNight(bookingToEdit.rate_per_night);
      setSource(bookingToEdit.source);
      setStatus(bookingToEdit.status);
      setNotes(bookingToEdit.notes || '');
    } else {
      // New Booking setup
      const defaultHomestay = homestays[0]?.id || '';
      setSelectedHomestayId(defaultHomestay);

      const matchedRoom = initialRoomId
        ? rooms.find((r) => r.id === initialRoomId)
        : rooms.find((r) => r.homestay_id === defaultHomestay) || rooms[0];

      if (matchedRoom) {
        setSelectedHomestayId(matchedRoom.homestay_id);
        setRoomId(matchedRoom.id);
        setRatePerNight(matchedRoom.default_rate);
      }

      const start = initialDate || getTodayISO();
      setCheckIn(start);
      // next day default
      const d = new Date(start);
      d.setDate(d.getDate() + 1);
      setCheckOut(d.toISOString().split('T')[0]);

      setGuestPhone('');
      setGuestName('');
      setGuestIdNote('');
      setExistingGuestId(null);
      setNumGuests(2);
      setSource('phone');
      setStatus('booked');
      setNotes('');
    }
  }, [bookingToEdit, initialRoomId, initialDate, isOpen, homestays, rooms]);

  // When room changes, auto-fill default rate
  const handleRoomChange = (newRoomId: string) => {
    setRoomId(newRoomId);
    const room = rooms.find((r) => r.id === newRoomId);
    if (room) {
      setRatePerNight(room.default_rate);
    }
  };

  // Lookup guest by phone number as user types
  useEffect(() => {
    const clean = guestPhone.trim().replace(/\D/g, '');
    if (clean.length >= 7 && !bookingToEdit) {
      setIsSearchingGuest(true);
      const timer = setTimeout(async () => {
        try {
          const guest = await api.findGuestByPhone(clean);
          if (guest) {
            setExistingGuestId(guest.id);
            setGuestName(guest.name);
            if (guest.id_proof_note) setGuestIdNote(guest.id_proof_note);
          } else {
            setExistingGuestId(null);
          }
        } catch {
          // silent error on lookup
        } finally {
          setIsSearchingGuest(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    } else if (clean.length < 7) {
      setExistingGuestId(null);
    }
  }, [guestPhone, bookingToEdit]);

  // Calculations: check-out day is free for next guest!
  const nights = calculateNights(checkIn, checkOut);
  const totalAmount = nights * ratePerNight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestPhone.trim() || !guestName.trim()) {
      showToast('Guest Info Required', 'Please provide guest name and contact number.', 'warning');
      return;
    }

    if (!roomId) {
      showToast('Room Required', 'Please select a room for this booking.', 'warning');
      return;
    }

    if (nights <= 0) {
      showToast('Invalid Dates', 'Check-out date must be strictly after check-in date.', 'warning');
      return;
    }

    try {
      setLoading(true);

      // 1. Save or update guest
      const guest = await api.saveGuest({
        id: existingGuestId || undefined,
        name: guestName.trim(),
        phone: guestPhone.trim(),
        id_proof_note: guestIdNote.trim() || null,
      });

      // 2. Save booking
      await api.saveBooking(
        {
          id: bookingToEdit?.id,
          guest_id: guest.id,
          room_id: roomId,
          check_in: checkIn,
          check_out: checkOut,
          num_guests: numGuests,
          rate_per_night: ratePerNight,
          total_amount: totalAmount,
          status,
          source,
          notes: notes.trim() || null,
        },
        user?.id
      );

      showToast(
        bookingToEdit ? 'Booking Updated' : 'Booking Created Successfully!',
        `${guest.name} • ${nights} nights • Total ${formatCurrency(totalAmount)}`
      );

      onBookingSaved();
      onClose();
    } catch (err: any) {
      showError(err, 'Booking could not be saved');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bookingToEdit ? 'Edit Booking' : 'New Booking'}
      subtitle={bookingToEdit ? `Ref: ${bookingToEdit.id}` : 'Create a guest reservation with date conflict protection'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Guest Section with Phone Lookup */}
        <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-brand-600" />
              Guest Lookup & Details
            </span>
            {existingGuestId && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <UserCheck className="w-3 h-3" />
                Returning Guest Found
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                {isSearchingGuest && (
                  <div className="absolute right-3 top-2.5 text-xs text-brand-600 animate-spin">
                    ⏳
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Guest Full Name *
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Vikram Malhotra"
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ID Proof Note (Aadhaar / Passport / DL)
            </label>
            <input
              type="text"
              value={guestIdNote}
              onChange={(e) => setGuestIdNote(e.target.value)}
              placeholder="e.g. Aadhaar Verified (**** 1234)"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 2. Homestay & Room Selection */}
        {availableRooms.length === 0 ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No rooms available</p>
              <p className="mt-0.5">Please add a homestay and at least one room under 'Homestays & Rooms' setup before creating a reservation.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Property *
              </label>
              <select
                value={selectedHomestayId}
                onChange={(e) => {
                  setSelectedHomestayId(e.target.value);
                  const firstRoom = rooms.find((r) => r.homestay_id === e.target.value);
                  if (firstRoom) handleRoomChange(firstRoom.id);
                }}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {homestays.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Room *
              </label>
              <select
                value={roomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({formatCurrency(r.default_rate)}/night)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 3. Dates & Nights (Check-out day is free for next guest rule!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-brand-50/40 border border-brand-100 rounded-2xl">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Check-In Date *
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Check-Out Date *</span>
              <span className="text-[10px] text-brand-700 font-normal">Day free for next guest</span>
            </label>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Rates & Summary Calculator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Rate per Night (₹) *
            </label>
            <input
              type="number"
              min="0"
              value={ratePerNight}
              onChange={(e) => setRatePerNight(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Guests Count *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numGuests}
              onChange={(e) => setNumGuests(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Source *
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as BookingSource)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {BOOKING_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-900"
            >
              <option value="booked">Booked</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Auto Total Amount Card */}
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">
              {nights} {nights === 1 ? 'Night' : 'Nights'} × {formatCurrency(ratePerNight)}
            </p>
            <p className="text-xl font-extrabold tracking-tight text-white">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
              Auto Calculated
            </span>
          </div>
        </div>

        {/* 5. Notes */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Special Requests / Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Vegetarian breakfast, late check-in at 8 PM, extra bed required"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Submit */}
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
            className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading ? 'Saving...' : bookingToEdit ? 'Save Changes' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
