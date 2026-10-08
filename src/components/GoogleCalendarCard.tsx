import React from 'react';
import { Calendar, Check, ExternalLink, LogOut, User as UserIcon, AlertCircle } from 'lucide-react';
import type { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleCalendarCardProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoggingIn: boolean;
  className?: string;
}

export function GoogleCalendarCard({
  user,
  onSignIn,
  onSignOut,
  isLoggingIn,
  className = '',
}: GoogleCalendarCardProps) {
  if (user) {
    return (
      <div className={`bg-neutral-900 text-white rounded-2xl p-3.5 border border-neutral-800 flex items-center justify-between gap-3 text-xs ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Google User'}
              className="w-8 h-8 rounded-full border border-neutral-700 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-bold text-white truncate text-[11px] sm:text-xs">
                Google Kalendár prepojený
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 truncate">
              {user.email || user.displayName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          title="Odhlásiť Google účet"
          className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-50 rounded-2xl border border-neutral-200 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-neutral-900">
            Synchronizácia s Google Kalendárom
          </h4>
          <p className="text-[11px] text-neutral-500">
            Po rezervácii automaticky vytvorí udalosť vo vašom kalendári
          </p>
        </div>
      </div>

      <GoogleSignInButton
        onClick={onSignIn}
        isLoading={isLoggingIn}
        label="Prepojiť Google"
        className="w-full sm:w-auto text-xs py-1.5"
      />
    </div>
  );
}
