import React from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, Car, X, AlertCircle } from 'lucide-react';
import type { BookingDataForCalendar } from '../services/calendarService';
import { formatCalendarEventContent } from '../services/calendarService';

interface CalendarConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  booking: BookingDataForCalendar | null;
  accountEmail?: string | null;
  isLoading?: boolean;
}

export function CalendarConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  booking,
  accountEmail,
  isLoading = false,
}: CalendarConfirmModalProps) {
  if (!isOpen || !booking) return null;

  const { summary, description, location } = formatCalendarEventContent(booking);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-modal-title"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
          aria-label="Zatvoriť"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
              Google Workspace Integrácia
            </span>
            <h3 id="calendar-modal-title" className="text-base font-bold text-neutral-950">
              Vytvoriť udalosť v Google Kalendári?
            </h3>
          </div>
        </div>

        <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
          Prajete si zapísať tento termín a podrobnosti rezervácie priamo do vášho prepojeného Google Kalendára{accountEmail ? ` (${accountEmail})` : ''}?
        </p>

        {/* Event Preview Card */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 space-y-3 mb-5 text-xs">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">
              Názov udalosti
            </span>
            <p className="font-bold text-neutral-900">{summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200/60">
            <div className="flex items-center gap-2 text-neutral-700">
              <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>{booking.fullDateLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>o {booking.time} ({booking.duration || '45 min'})</span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2 border-t border-neutral-200/60 text-neutral-600 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <span>{location}</span>
          </div>

          <div className="pt-2 border-t border-neutral-200/60">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Popis v kalendári bude obsahovať:
            </span>
            <pre className="text-[11px] font-mono text-neutral-600 whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-neutral-200 max-h-32 overflow-y-auto leading-relaxed">
              {description}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-1/3 py-2.5 px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors text-center"
          >
            Preskočiť
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-2/3 py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>{isLoading ? 'Vytváram udalosť...' : 'Potvrdiť a pridať do kalendára'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
