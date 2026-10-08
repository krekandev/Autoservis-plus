import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  Car,
  Check,
  ExternalLink,
  LogOut,
  RefreshCw,
  X,
  AlertCircle,
  CalendarCheck,
  ShieldCheck,
  User as UserIcon,
  PlusCircle,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { BookingDataForCalendar, GoogleCalendarEventResult } from '../services/calendarService';
import {
  OWNER_CALENDAR_EMAIL,
  createGoogleCalendarEvent,
  buildGoogleCalendarWebUrl,
} from '../services/calendarService';
import { GoogleSignInButton } from './GoogleSignInButton';
import { CalendarConfirmModal } from './CalendarConfirmModal';

interface OwnerAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerUser: User | null;
  onSignIn: () => Promise<string | null>;
  onSignOut: () => Promise<void>;
  isLoggingIn: boolean;
  bookings: BookingDataForCalendar[];
  onUpdateBooking: (updated: BookingDataForCalendar) => void;
  onAddTestBooking: () => void;
  accessToken: string | null;
}

export function OwnerAdminModal({
  isOpen,
  onClose,
  ownerUser,
  onSignIn,
  onSignOut,
  isLoggingIn,
  bookings,
  onUpdateBooking,
  onAddTestBooking,
  accessToken,
}: OwnerAdminModalProps) {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [confirmModalBooking, setConfirmModalBooking] = useState<BookingDataForCalendar | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  if (!isOpen) return null;

  const isOwnerEmail = ownerUser?.email?.toLowerCase() === OWNER_CALENDAR_EMAIL.toLowerCase();

  const handleSyncBooking = async (booking: BookingDataForCalendar) => {
    setSyncError(null);
    setSyncSuccessMsg(null);

    let token = accessToken;
    if (!token) {
      token = await onSignIn();
      if (!token) {
        setSyncError('Pre zápis do Google Kalendára je potrebné prihlásenie účtu majiteľa.');
        return;
      }
    }

    try {
      setSyncingId(booking.id || booking.phone);
      const res: GoogleCalendarEventResult = await createGoogleCalendarEvent(booking, token);
      const updated: BookingDataForCalendar = {
        ...booking,
        calendarSynced: true,
        calendarEventId: res.id,
        calendarEventLink: res.htmlLink,
      };
      onUpdateBooking(updated);
      setSyncSuccessMsg(`Udalosť pre "${booking.fullName} (${booking.carBrand})" bola úspešne vytvorená v kalendári ${OWNER_CALENDAR_EMAIL}.`);
    } catch (err: any) {
      console.error('Error syncing to calendar:', err);
      setSyncError(err?.message || 'Nepodarilo sa vytvoriť udalosť v Google Kalendári.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllPending = async () => {
    let token = accessToken;
    if (!token) {
      token = await onSignIn();
      if (!token) return;
    }

    const pending = bookings.filter((b) => !b.calendarSynced);
    if (pending.length === 0) {
      setSyncSuccessMsg('Všetky rezervácie sú už v Google Kalendári zapísané.');
      return;
    }

    setIsSyncingAll(true);
    setSyncError(null);
    let successCount = 0;

    for (const b of pending) {
      try {
        const res = await createGoogleCalendarEvent(b, token);
        onUpdateBooking({
          ...b,
          calendarSynced: true,
          calendarEventId: res.id,
          calendarEventLink: res.htmlLink,
        });
        successCount++;
      } catch (e: any) {
        console.error('Failed syncing booking', b.id, e);
      }
    }

    setIsSyncingAll(false);
    setSyncSuccessMsg(`Synchronizovaných ${successCount} z ${pending.length} čakajúcich rezervácií do kalendára majiteľa.`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
        <div
          className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-start justify-between bg-neutral-900 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Správa servisu & Backend Google Kalendár
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                    Majiteľ
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Napojené na email: <strong className="text-neutral-200">{OWNER_CALENDAR_EMAIL}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-neutral-800 transition-colors"
              aria-label="Zatvoriť"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Scrollable */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* Owner Auth Card */}
            <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    ownerUser
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {ownerUser ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-neutral-900 text-sm">
                        {ownerUser ? 'Google Kalendár majiteľa je pripojený' : 'Google Kalendár majiteľa'}
                      </h4>
                      {ownerUser && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Aktívny
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-600 text-[11px] mt-0.5 leading-relaxed">
                      {ownerUser ? (
                        <>
                          Prihlásený ako: <strong>{ownerUser.email}</strong>. Všetky nové rezervácie zákazníkov sa automaticky zapíšu do vášho kalendára.
                        </>
                      ) : (
                        <>
                          Prihláste sa pomocou <strong>{OWNER_CALENDAR_EMAIL}</strong> pre automatické ukladanie rezervácií z webu priamo do vášho kalendára.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {ownerUser ? (
                    <>
                      <a
                        href="https://calendar.google.com/calendar/r"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 font-bold rounded-xl text-xs transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Otvoriť Kalendár</span>
                      </a>
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-neutral-500 hover:text-red-600 hover:bg-neutral-200/60 rounded-xl transition-colors font-semibold"
                        title="Odhlásiť"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <GoogleSignInButton
                      onClick={onSignIn}
                      isLoading={isLoggingIn}
                      label={`Prihlásiť ${OWNER_CALENDAR_EMAIL}`}
                      className="text-xs py-1.5 px-3"
                    />
                  )}
                </div>
              </div>

              {!isOwnerEmail && ownerUser && (
                <div className="mt-3 pt-3 border-t border-amber-200 text-amber-900 bg-amber-50/60 -mx-4 -mb-4 p-3 rounded-b-2xl text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Pozor: Ste prihlásený ako <strong>{ownerUser.email}</strong>. Predvolený email majiteľa servisu je <strong>{OWNER_CALENDAR_EMAIL}</strong>. Udalosti sa vytvárajú v tomto účte a zdieľajú na kalendár majiteľa.
                  </span>
                </div>
              )}
            </div>

            {/* Notifications */}
            {syncSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {syncError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{syncError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncError(null)}
                  className="text-red-700 hover:text-red-900 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Reservations List Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
              <div>
                <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <span>Evidencia prijatých rezervácií</span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold">
                    {bookings.length}
                  </span>
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Zákazníci odosielajú rezervácie z formulára. Záznamy sú uložené v systéme a odosielané do kalendára.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onAddTestBooking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors"
                  title="Vytvorí ukážkovú rezerváciu pre otestovanie funkčnosti"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Testovacia rezervácia</span>
                </button>

                {bookings.some((b) => !b.calendarSynced) && (
                  <button
                    type="button"
                    onClick={handleSyncAllPending}
                    disabled={isSyncingAll}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    <span>Synchronizovať čakajúce</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reservations Items */}
            {bookings.length === 0 ? (
              <div className="py-12 text-center bg-neutral-50 rounded-2xl border border-neutral-200">
                <Calendar className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="font-bold text-neutral-700">Zatiaľ žiadne prijaté rezervácie</p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Keď zákazník odošle rezerváciu z webu, zobrazí sa tu a odošle sa do kalendára.
                </p>
                <button
                  type="button"
                  onClick={onAddTestBooking}
                  className="mt-3 px-3.5 py-1.5 bg-neutral-900 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Vytvoriť testovaciu rezerváciu</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    className="p-4 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors shadow-2xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-neutral-950 text-sm">
                            {b.serviceName}
                          </span>
                          <span className="font-bold text-red-600 text-xs">
                            {b.servicePrice}
                          </span>
                          {b.calendarSynced ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CalendarCheck className="w-3 h-3" />
                              Zapísané v kalendári
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Čaká na zápis
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-neutral-600 text-xs mt-1">
                          <span className="flex items-center gap-1 font-semibold text-neutral-900">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            {b.fullDateLabel} o {b.time}
                          </span>
                          {b.duration && (
                            <span className="text-neutral-400">({b.duration})</span>
                          )}
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        {b.calendarSynced && b.calendarEventLink ? (
                          <a
                            href={b.calendarEventLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>V kalendári</span>
                          </a>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModalBooking(b);
                              }}
                              disabled={syncingId === (b.id || b.phone)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
                            >
                              {syncingId === (b.id || b.phone) ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Zapisujem...</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>Zapísať do kalendára</span>
                                </>
                              )}
                            </button>

                            <a
                              href={buildGoogleCalendarWebUrl(b)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold"
                              title="Otvoriť web šablónu Google Kalendára"
                            >
                              <ExternalLink className="w-3 h-3 text-neutral-500" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Customer & Vehicle Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-neutral-100 text-[11px] text-neutral-600 bg-neutral-50/70 p-2.5 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Zákazník:</span>
                        <div className="font-bold text-neutral-900">{b.fullName}</div>
                        <a
                          href={`tel:${b.phone}`}
                          className="text-red-600 hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{b.phone}</span>
                        </a>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Vozidlo:</span>
                        <div className="font-bold text-neutral-900 flex items-center gap-1">
                          <Car className="w-3 h-3 text-neutral-400" />
                          <span>{b.carBrand}</span>
                        </div>
                        <div className="font-mono font-semibold text-neutral-700">ŠPZ: {b.licensePlate}</div>
                      </div>

                      {b.note && (
                        <div className="sm:col-span-2 pt-1 border-t border-neutral-200/50 text-neutral-500 italic">
                          Poznámka: "{b.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                Backend email: <strong className="text-neutral-800">{OWNER_CALENDAR_EMAIL}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
            >
              Zavrieť panel
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Admin Event Creation */}
      <CalendarConfirmModal
        isOpen={!!confirmModalBooking}
        onClose={() => setConfirmModalBooking(null)}
        onConfirm={async () => {
          if (confirmModalBooking) {
            const target = confirmModalBooking;
            setConfirmModalBooking(null);
            await handleSyncBooking(target);
          }
        }}
        booking={confirmModalBooking}
        accountEmail={ownerUser?.email || OWNER_CALENDAR_EMAIL}
      />
    </>
  );
}
