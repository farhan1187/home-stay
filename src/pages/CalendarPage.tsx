import React, { useState, useEffect } from 'react';
import { Booking, Room } from '../types';
import { api } from '../lib/supabase';
import { useHomestay } from '../contexts/HomestayContext';
import { RoomCalendar } from '../components/calendar/RoomCalendar';
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarPageProps {
  onOpenNewBooking: (roomId?: string, date?: string) => void;
  onSelectBooking: (b: Booking) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  onOpenNewBooking,
  onSelectBooking,
}) => {
  const { activeHomestayId, rooms } = useHomestay();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendarBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getBookings({ homestay_id: activeHomestayId });
      setBookings(data);
    } catch (err) {
      console.error('Error fetching calendar bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarBookings();
  }, [activeHomestayId]);

  // Filter rooms based on active property
  const scopedRooms = rooms.filter(
    (r) => activeHomestayId === 'all' || r.homestay_id === activeHomestayId
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Room Availability Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any cell to book or view reservations. Check-out days are automatically free for incoming guests.
          </p>
        </div>

        <button
          onClick={() => onOpenNewBooking()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* 30-Day Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-sm">
          Loading calendar availability...
        </div>
      ) : (
        <RoomCalendar
          rooms={scopedRooms}
          bookings={bookings}
          onSelectBooking={onSelectBooking}
          onSelectEmptySlot={(roomId, date) => onOpenNewBooking(roomId, date)}
        />
      )}
    </div>
  );
};
