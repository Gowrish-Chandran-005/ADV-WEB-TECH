import React from 'react';
import { NotificationItem } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-[#ece8e0]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f1ede6] hover:bg-[#ece8e0] flex items-center justify-center text-[#404947] hover:text-[#1c1c17] transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center justify-between pb-3 border-b border-[#ece8e0] pr-8">
          <div>
            <h3 className="font-headline-sm text-lg font-bold text-[#1c1c17]">
              Campus Notifications
            </h3>
            <p className="text-xs text-[#707977]">Handovers, custody stamps & escrow</p>
          </div>
          <button
            onClick={onMarkAllAsRead}
            className="text-xs font-mono text-[#094d48] underline hover:text-[#2a6560]"
          >
            Mark read
          </button>
        </div>

        <div className="divide-y divide-[#ece8e0] mt-3 max-h-[60vh] overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`py-3.5 px-2 flex items-start gap-3 rounded-xl transition-colors ${
                n.unread ? 'bg-[#f7f3eb]/70' : 'hover:bg-[#f7f3eb]/40'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  n.type === 'deposit'
                    ? 'bg-[#b2eee7] text-[#00201e]'
                    : n.type === 'reply'
                    ? 'bg-[#ffdad2] text-[#762b1a]'
                    : 'bg-[#dae2ff] text-[#111b33]'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {n.type === 'deposit'
                    ? 'savings'
                    : n.type === 'reply'
                    ? 'chat_bubble'
                    : 'event_available'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-[#1c1c17] truncate">{n.title}</h5>
                  <span className="text-[10px] font-mono text-[#707977] shrink-0">
                    {n.timeAgo}
                  </span>
                </div>
                <p className="text-xs text-[#404947] mt-0.5 leading-snug">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
