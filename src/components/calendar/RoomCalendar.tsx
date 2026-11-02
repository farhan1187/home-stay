import React, { useState, useMemo } from 'react';
import { Booking, Room } from '../../types';
import { generateDaysArray, toISODate, formatDisplayDate, calculateNights } from '../../lib/dateUtils';
import { addDays, subDays, isToday, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { BOOKING_STATUS_CONFIG } from '../../lib/constants';

interface RoomCalendarProps {
  rooms: Room[];
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onSelectEmptySlot: (roomId: string, date: string) => void;
}

export const RoomCalendar: React.FC<RoomCalendarProps> = ({
  rooms,
  bookings,
  onSelectBooking,
  onSelectEmptySlot,
}) => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const daysCount = 30;

  const days = useMemo(() => generateDaysArray(startDate, daysCount), [startDate, daysCount]);

  const handlePrev = () => setStartDate((d) => subDays(d, 15));
  const handleNext = () => setStartDate((d) => addDays(d, 15));
  const handleToday = () => setStartDate(new Date());

  // Homestay distinct color palette for clear property identification
  const homestayColors: Record<string, { bg: string; border: string; text: string }> = {
    'h-1': { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white' },
    'h-2': { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
    'h-3': { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white' },
  };

  const getHomestayStyle = (hId?: string) => {
    if (!hId) return { bg: 'bg-brand-600', border: 'border-brand-700', text: 'text-white' };
    return homestayColors[hId] || { bg: 'bg-indigo-600', border: 'border-indigo-700', text: 'text-white' };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Calendar Header Controls */}
      <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              30-Day Room Availability Grid
            </h3>
            <p className="text-xs text-slate-500">
              {format(days[0], 'MMM dd, yyyy')} — {format(days[days.length - 1], 'MMM dd, yyyy')}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            Today
          </button>
          <button
            onClick={handlePrev}
            className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Previous 15 days"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Next 15 days"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container (Horizontally Scrollable) */}
      <div className="overflow-x-auto relative min-h-[400px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70">
              {/* Sticky Room Header Column */}
              <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[190px] sm:min-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Room / Homestay
              </th>
              {days.map((day) => {
                const todayCol = isToday(day);
                return (
                  <th
                    key={day.toISOString()}
                    className={`px-2 py-2.5 text-center min-w-[58px] sm:min-w-[64px] border-l border-slate-200/60 ${
                      todayCol ? 'bg-brand-50/90 text-brand-800 font-extrabold ring-1 ring-brand-400 inset-0' : 'text-slate-600'
                    }`}
                  >
                    <p className="text-[10px] uppercase font-semibold text-slate-400">
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-xs font-bold ${todayCol ? 'text-brand-700' : 'text-slate-800'}`}>
                      {format(day, 'dd')}
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.map((room) => {
              const hColors = getHomestayStyle(room.homestay_id);

              return (
                <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Sticky Room Label */}
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                      {room.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {room.homestay?.name || 'Homestay'}
                    </p>
                  </td>

                  {/* Day Cells */}
                  {days.map((day) => {
                    const dayStr = toISODate(day);
                    const todayCol = isToday(day);

                    // Check if this room has a booking occupying this night
                    // Remember: [check_in, check_out) -> check_out day is free for next guest!
                    const occupyingBooking = bookings.find(
                      (b) =>
                        b.room_id === room.id &&
                        b.status !== 'cancelled' &&
                        dayStr >= b.check_in &&
                        dayStr < b.check_out
                    );

                    // Check if a booking STARTS on this date
                    const isStartDay = occupyingBooking && occupyingBooking.check_in === dayStr;

                    if (occupyingBooking) {
                      return (
                        <td
                          key={dayStr}
                          onClick={() => onSelectBooking(occupyingBooking)}
                          className={`p-1 border-l border-slate-100 cursor-pointer relative ${
                            todayCol ? 'bg-brand-50/30' : ''
                          }`}
                          title={`Click to view: ${occupyingBooking.guest?.name || 'Guest'} (${occupyingBooking.check_in} - ${occupyingBooking.check_out})`}
                        >
                          <div
                            className={`h-9 px-1.5 rounded-lg flex items-center justify-between text-xs font-semibold shadow-sm transition-transform hover:scale-[1.02] ${
                              occupyingBooking.status === 'checked_in'
                                ? 'bg-emerald-600 text-white'
                                : hColors.bg + ' ' + hColors.text
                            }`}
                          >
                            {isStartDay ? (
                              <span className="truncate text-[11px] font-bold">
                                {occupyingBooking.guest?.name?.split(' ')[0] || 'Guest'}
                              </span>
                            ) : (
                              <span className="text-[10px] opacity-75">›</span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // Empty slot: Click to create booking!
                    return (
                      <td
                        key={dayStr}
                        onClick={() => onSelectEmptySlot(room.id, dayStr)}
                        className={`p-1 border-l border-slate-100 hover:bg-brand-50/70 cursor-pointer transition-colors group relative ${
                          todayCol ? 'bg-brand-50/20' : ''
                        }`}
                        title={`Click to book ${room.name} on ${dayStr}`}
                      >
                        <div className="h-9 w-full rounded-lg border border-transparent group-hover:border-dashed group-hover:border-brand-400 flex items-center justify-center text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600" />
          <span>Checked In</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Booked (Upcoming)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-dashed border-slate-400 bg-white" />
          <span>Empty Cell (Click to Book)</span>
        </div>
        <span className="text-[11px] text-slate-400 ml-auto italic">
          * Check-out days are automatically free for same-day new check-ins.
        </span>
      </div>
    </div>
  );
};
