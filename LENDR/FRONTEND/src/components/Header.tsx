import React, { useState } from 'react';
import type { ApiUser } from '../services/api';
import { NotificationPopover } from './NotificationPopover';

interface HeaderProps {
  currentScreen: 'home' | 'catalog' | 'detail' | 'wanted' | 'list-gear' | 'admin-disputes';
  onNavigate: (screen: 'home' | 'catalog' | 'detail' | 'wanted' | 'list-gear' | 'admin-disputes') => void;
  bookingsCount: number;
  unreadNotificationsCount?: number;
  onOpenBookings: () => void;
  onOpenListGear: () => void;
  onOpenComplaints?: () => void;
  onSelectWantedRequest?: (requestId: string) => void;
  onRefreshNotifications?: () => void;
  // Optional auth props — fully backward-compatible
  user?: ApiUser | null;
  avatarInitials?: string;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  bookingsCount,
  unreadNotificationsCount = 0,
  onOpenBookings,
  onOpenListGear,
  onOpenComplaints,
  onSelectWantedRequest,
  onRefreshNotifications,
  user = null,
  avatarInitials = 'AK',
  onOpenAuth,
  onLogout,
}) => {
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);

  const handleSelectWantedFromNotif = (requestId: string) => {
    if (onSelectWantedRequest) {
      onSelectWantedRequest(requestId);
    } else {
      onNavigate('wanted');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#092620]/95 backdrop-blur-xl border-b border-emerald-950/80 transition-all duration-300 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo & Campus Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#134e43] flex items-center justify-center text-white font-bold text-xl tracking-tight shadow-md group-hover:scale-110 group-hover:rotate-2 transition-all duration-300 border border-emerald-400/20">
              <svg
                className="w-5 h-5 stroke-emerald-300 fill-none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M7 16.5L3 12.5L7 8.5" />
                <path d="M17 7.5L21 11.5L17 15.5" />
                <path d="M14 4.5L10 19.5" />
              </svg>
            </div>
            <span className="font-display text-2xl font-black tracking-tight text-white group-hover:text-emerald-200 transition-colors">
              LENDR<span className="text-[#d96543]">.</span>
            </span>
          </button>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-[11px] font-mono font-medium text-emerald-200 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            VIT VELLORE
          </div>
        </div>

        {/* Center Search Input */}
        <div className="hidden md:flex flex-1 max-w-sm mx-3">
          <div className="w-full flex items-center bg-[#0d382f]/90 rounded-full border border-emerald-700/50 shadow-inner px-3.5 py-1.5 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all">
            <svg className="w-3.5 h-3.5 text-emerald-400/70 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search gear, cameras, tools..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onNavigate('catalog');
                }
              }}
              className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-emerald-200/50 focus:outline-none focus:ring-0"
            />
            <button
              onClick={() => onNavigate('catalog')}
              className="px-2.5 py-0.5 rounded-full bg-[#134e43] text-white text-[11px] font-bold hover:bg-emerald-600 transition-all ml-1 cursor-pointer shadow-xs border border-emerald-500/30"
            >
              Go
            </button>
          </div>
        </div>

        {/* Action Buttons & Profile */}
        <div className="flex items-center gap-2">
          {/* Quick Category Jump Pill */}
          <button
            onClick={() => onNavigate('catalog')}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#134e43]/70 hover:bg-[#134e43] border border-emerald-600/40 text-emerald-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Categories</span>
          </button>

          {/* Wanted Board Button */}
          <button
            onClick={() => onNavigate('wanted')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              currentScreen === 'wanted'
                ? 'bg-[#d96543] border-[#d96543] text-white shadow-sm'
                : 'bg-[#d96543]/20 hover:bg-[#d96543]/30 border-[#d96543]/40 text-[#f6aa97]'
            }`}
          >
            <span>Wanted</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#d96543] animate-pulse"></span>
          </button>

          {/* Notification Bell (when user logged in) */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setIsNotificationPopoverOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full bg-[#0d382f] hover:bg-[#134e43] border border-emerald-700/60 flex items-center justify-center text-emerald-100 transition-all cursor-pointer relative"
                title="Notifications"
                aria-label="View notifications"
              >
                <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#d96543] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              <NotificationPopover
                isOpen={isNotificationPopoverOpen}
                onClose={() => setIsNotificationPopoverOpen(false)}
                onSelectWantedRequest={handleSelectWantedFromNotif}
                onRefreshUnread={() => {
                  if (onRefreshNotifications) onRefreshNotifications();
                }}
              />
            </div>
          )}

          {/* My Bookings Pill */}
          <button
            onClick={onOpenBookings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d382f] hover:bg-[#134e43] border border-emerald-700/60 text-xs font-semibold text-emerald-100 transition-all shadow-xs cursor-pointer"
            title="View my campus gear bookings"
          >
            <span>Bookings</span>
            <span className="w-4 h-4 rounded-full bg-[#d96543] text-white text-[9px] flex items-center justify-center font-bold">
              {bookingsCount}
            </span>
          </button>

          {/* Grievances Button */}
          {user && onOpenComplaints && (
            <button
              onClick={onOpenComplaints}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#0d382f]/80 hover:bg-[#134e43] border border-emerald-800/60 text-[11px] font-semibold text-emerald-300 transition-all cursor-pointer"
              title="Submit a campus equipment grievance"
            >
              <span>Grievances</span>
            </button>
          )}

          {/* Admin Portal Button */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => onNavigate('admin-disputes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                currentScreen === 'admin-disputes'
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                  : 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-600/70 text-emerald-200'
              }`}
              title="Campus disputes and adjudication portal"
            >
              <span>Admin Disputes</span>
            </button>
          )}

          {/* List Gear Button */}
          <button
            onClick={onOpenListGear}
            className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-md cursor-pointer ${
              currentScreen === 'list-gear'
                ? 'bg-emerald-500 text-white ring-2 ring-emerald-300/40 shadow-emerald-500/20'
                : 'bg-[#d96543] hover:bg-[#c85635] text-white'
            }`}
          >
            <span>+ List Gear</span>
          </button>

          {/* Student Avatar Indicator */}
          <div className="flex items-center pl-1 border-l border-emerald-800">
            {user ? (
              <div className="relative cursor-pointer group" title={`${user.fullName} • ${user.registrationNumber ?? ''}`}>
                <div
                  onClick={onOpenBookings}
                  className="w-9 h-9 rounded-full bg-[#14594b] text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/30"
                >
                  {avatarInitials}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                {/* Logout on long-press / tooltip */}
                {onLogout && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onLogout(); }}
                    title="Sign out"
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-300 hover:bg-red-400 text-stone-700 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                    aria-label="Sign out"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="w-9 h-9 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center font-bold text-xs ring-2 ring-stone-300/30 cursor-pointer transition-colors"
                title="Sign in to LENDR"
              >
                ?
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
