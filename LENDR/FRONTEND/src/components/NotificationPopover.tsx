import React, { useState, useEffect, useCallback } from 'react';
import { notificationsApi, type ApiNotification } from '../services/api';
import { formatTimeAgo } from '../services/adapters';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWantedRequest: (requestId: string) => void;
  onRefreshUnread: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  onSelectWantedRequest,
  onRefreshUnread,
}) => {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.list({ pageSize: 30 });
      setNotifications(res.items);
    } catch {
      setError('Could not load notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const handleMarkAsRead = async (notif: ApiNotification) => {
    if (!notif.readAt) {
      try {
        await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
        onRefreshUnread();
      } catch {
        // Silently continue
      }
    }

    const reqId = notif.metadata?.wantedRequestId;
    if (typeof reqId === 'string' && /^[0-9a-f-]{36}$/i.test(reqId)) {
      onSelectWantedRequest(reqId);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      onRefreshUnread();
    } catch {
      // Silently continue
    }
  };

  const unreadItems = notifications.filter((n) => !n.readAt);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WANTED_MATCH':
        return 'MATCH';
      case 'WANTED_OFFER_RECEIVED':
        return 'OFFER';
      case 'WANTED_OFFER_ACCEPTED':
        return 'ACCEPTED';
      case 'WANTED_OFFER_DECLINED':
        return 'DECLINED';
      default:
        return 'ALERT';
    }
  };

  return (
    <div
      className="absolute right-0 top-14 w-80 sm:w-96 bg-[#092620] border border-emerald-800/80 rounded-2xl shadow-2xl z-50 text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d382f] border-b border-emerald-800/50">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm text-emerald-100">Campus Alerts</span>
          {unreadItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#d96543] text-[10px] font-bold text-white">
              {unreadItems.length} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadItems.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] text-emerald-300 hover:text-white font-mono transition-colors cursor-pointer"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full hover:bg-emerald-900/60 flex items-center justify-center text-stone-400 hover:text-white cursor-pointer transition-colors"
            aria-label="Close notifications"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Popover Content */}
      <div className="max-h-96 overflow-y-auto divide-y divide-emerald-900/40">
        {isLoading ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-emerald-300/70 font-mono">Fetching campus alerts…</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-xs text-rose-300">{error}</p>
            <button
              onClick={fetchNotifications}
              className="text-xs text-emerald-300 underline font-mono cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs font-bold text-emerald-200">No alerts yet</p>
            <p className="text-[11px] text-emerald-400/60">
              You will be notified when peer equipment matches your wanted requests or offers arrive.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.readAt;
            return (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif)}
                className={`p-3.5 hover:bg-[#114b3f]/50 transition-colors cursor-pointer flex gap-3 ${
                  isUnread ? 'bg-emerald-950/40' : ''
                }`}
              >
                <div className="text-lg flex-shrink-0 mt-0.5">{getTypeIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold truncate ${isUnread ? 'text-white' : 'text-stone-300'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] font-mono text-emerald-400/60 flex-shrink-0">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300/90 line-clamp-2 mt-0.5 leading-relaxed">
                    {notif.body}
                  </p>
                  {Boolean(notif.metadata?.wantedRequestId) && (
                    <span className="inline-block mt-1 text-[10px] text-[#d96543] font-semibold hover:underline">
                      View Wanted Note →
                    </span>
                  )}
                </div>
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-[#d96543] self-center flex-shrink-0"></span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 bg-[#0d382f]/80 text-[10px] font-mono text-emerald-300/60 text-center border-t border-emerald-800/40">
        VIT VELLORE • REAL-TIME PEER UPDATES
      </div>
    </div>
  );
};
