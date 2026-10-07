import { useEffect, useState } from 'react';
import type { GearCategory, GearItem, NotificationItem, RentalBooking, WantedPost } from './types';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { CampusShelfView } from './components/CampusShelfView';
import { RentModal } from './components/RentModal';
import { CustodyDetailModal } from './components/CustodyDetailModal';
import { WantedReplyModal } from './components/WantedReplyModal';
import { NotificationsModal } from './components/NotificationsModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { AuthPanel } from './components/AuthPanel';
import { EquipmentBrowsePage } from './components/EquipmentBrowsePage';
import { EquipmentDetailPage } from './components/EquipmentDetailPage';
import { MyBookingsPage } from './components/MyBookingsPage';
import { OwnerEquipmentDashboard } from './components/OwnerEquipmentDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { createBooking } from './services/bookingService';
import { getNotificationsForCurrentUser, markAllNotificationsRead } from './services/notificationService';

type AppView = 'landing' | 'campus-shelf' | 'equipment-browse' | 'equipment-detail' | 'owner-equipment' | 'my-bookings';

const routeMap: Record<AppView, string> = {
  landing: '/',
  'campus-shelf': '/campus-shelf',
  'equipment-browse': '/equipment-browse',
  'equipment-detail': '/equipment-detail',
  'owner-equipment': '/owner-equipment',
  'my-bookings': '/my-bookings',
};

function AppContent() {
  const { user, profile, loading, signOut, refreshAuth } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        return;
      }

      try {
        const nextNotifications = await getNotificationsForCurrentUser();
        setNotifications(nextNotifications);
      } catch (error) {
        console.error('Failed to load notifications', error);
        setNotifications([]);
      }
    };

    void loadNotifications();
  }, [user]);

  const navigateToView = (nextView: AppView) => {
    setCurrentView(nextView);
    const nextPath = routeMap[nextView] ?? '/';
    const currentPath = window.location.pathname;
    if (currentPath !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  useEffect(() => {
    const syncFromLocation = () => {
      const path = window.location.pathname;

      if (path === '/my-bookings') {
        setCurrentView('my-bookings');
        return;
      }

      if (path === '/owner-equipment') {
        setCurrentView('owner-equipment');
        return;
      }

      if (path === '/equipment-browse') {
        setCurrentView('equipment-browse');
        return;
      }

      if (path === '/equipment-detail') {
        setCurrentView('equipment-detail');
        return;
      }

      if (path === '/campus-shelf') {
        setCurrentView('campus-shelf');
        return;
      }

      setCurrentView('landing');
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);
  const [items, setItems] = useState<GearItem[]>([]);
  const [userBorrows, setUserBorrows] = useState<RentalBooking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [wantedPosts] = useState<WantedPost[]>([]);

  const handleLogout = async () => {
    await signOut();
    await refreshAuth();
  };

  const [shelfCategoryFilter, setShelfCategoryFilter] = useState<GearCategory | undefined>(undefined);
  const [shelfSearchQuery, setShelfSearchQuery] = useState<string>('');

  const [selectedRentItem, setSelectedRentItem] = useState<GearItem | null>(null);
  const [isCustodyModalOpen, setIsCustodyModalOpen] = useState(false);
  const [selectedWantedPost, setSelectedWantedPost] = useState<WantedPost | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleGoToShelf = (category?: GearCategory, searchQuery?: string) => {
    setShelfCategoryFilter(category);
    setShelfSearchQuery(searchQuery || '');
    setCurrentView('campus-shelf');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleBookmark = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );
  };

  const handleListGear = () => {
    if (!user) {
      navigateToView('landing');
      return;
    }

    navigateToView('owner-equipment');
  };

  const handleConfirmRent = async (item: GearItem, days: number, startDate: string, endDate: string) => {
    try {
      const booking = await createBooking(item.id, startDate, endDate, `Requested for ${days} day(s)`);
      setSelectedRentItem(null);
      setCurrentView('my-bookings');
      console.info('Booking created successfully', booking.id);
    } catch (error) {
      console.error('Failed to create booking from modal flow', error);
    }
  };

  const handleWantedReply = (wantedId: string) => {
    const post = wantedPosts.find((p) => p.id === wantedId) || wantedPosts[0];
    setSelectedWantedPost(post);
  };

  const handleSubmitWantedReply = (postId: string, replyText: string) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Reply Sent on Bulletin',
        message: `You offered gear to Aarav: "${replyText.slice(0, 50)}..."`,
        timeAgo: 'Just now',
        unread: true,
        type: 'reply',
      },
      ...prev,
    ]);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })));
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f1] text-[#1c1c17] flex flex-col font-body selection:bg-[#b2eee7] selection:text-[#094d48]">
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          navigateToView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenListGear={handleListGear}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      <main className="w-full pt-20 flex-1 flex flex-col">
        <div className="w-full border-b border-[#dfe3df] bg-[#fffaf3]">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <AuthPanel
              user={user}
              profile={profile}
              loading={loading}
              onAuthChange={refreshAuth}
              onLogout={handleLogout}
            />
          </div>
        </div>

        {currentView === 'landing' && (
          <LandingView
            items={[]}
            onGoToShelf={handleGoToShelf}
            onOpenListGear={handleListGear}
            onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
            onRentItem={(item) => setSelectedRentItem(item)}
            onToggleBookmark={handleToggleBookmark}
            onOpenCustodyModal={() => setIsCustodyModalOpen(true)}
            onOpenWantedReply={handleWantedReply}
          />
        )}

        {currentView === 'campus-shelf' && (
          <CampusShelfView
            items={items}
            userBorrows={userBorrows}
            initialCategory={shelfCategoryFilter}
            initialSearch={shelfSearchQuery}
            onOpenListGear={handleListGear}
            onRentItem={(item) => setSelectedRentItem(item)}
            onToggleBookmark={handleToggleBookmark}
            onOpenCustodyModal={() => setIsCustodyModalOpen(true)}
            onBackToNoticeboard={() => setCurrentView('landing')}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
        )}

        {currentView === 'equipment-browse' && (
          <EquipmentBrowsePage
            onSelectEquipment={(equipmentId) => {
              setSelectedEquipmentId(equipmentId);
              setCurrentView('equipment-detail');
            }}
          />
        )}

        {currentView === 'equipment-detail' && selectedEquipmentId && (
          <EquipmentDetailPage
            equipmentId={selectedEquipmentId}
            onBack={() => navigateToView('equipment-browse')}
            onNavigateToMyBookings={() => navigateToView('my-bookings')}
          />
        )}

        {currentView === 'owner-equipment' && <OwnerEquipmentDashboard />}

        {currentView === 'my-bookings' && <MyBookingsPage onNavigateToBrowse={() => navigateToView('equipment-browse')} />}

        <section className="max-w-5xl mx-auto w-full px-6 py-8">
          {!loading && !user ? (
            <div className="rounded-[24px] border border-dashed border-[#bfc8c6] bg-[#f7f3eb] p-6 text-[#404947]">
              Login or create an account to access the authenticated testing area.
            </div>
          ) : null}

          {!loading && user && (
            <div className="rounded-[24px] border border-[#bfc8c6] bg-white p-6 shadow-[0_8px_30px_rgba(12,32,28,0.06)]">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Authenticated Area</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#094d48]">User session active</h2>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center bg-[#094d48] text-white font-label-btn text-sm px-4 py-2 rounded-full shadow-[0_4px_0_0_#0e4f4b] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#0e4f4b] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  Log out
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-[#fdf9f1] border border-[#bfc8c6] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Name</p>
                  <p className="mt-2 text-lg font-semibold text-[#1c1c17]">{profile?.name ?? user.email}</p>
                </div>
                <div className="rounded-2xl bg-[#fdf9f1] border border-[#bfc8c6] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Email</p>
                  <p className="mt-2 text-lg font-semibold text-[#1c1c17]">{profile?.email ?? user.email}</p>
                </div>
                <div className="rounded-2xl bg-[#fdf9f1] border border-[#bfc8c6] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Role</p>
                  <p className="mt-2 text-lg font-semibold text-[#1c1c17]">{profile?.role ?? 'ROLE UNAVAILABLE'}</p>
                </div>
                <div className="rounded-2xl bg-[#fdf9f1] border border-[#bfc8c6] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Account Status</p>
                  <p className="mt-2 text-lg font-semibold text-[#1c1c17]">{profile?.account_status ?? 'ACTIVE'}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <RentModal
        item={selectedRentItem}
        onClose={() => setSelectedRentItem(null)}
        onConfirmRent={handleConfirmRent}
      />

      <CustodyDetailModal
        isOpen={isCustodyModalOpen}
        onClose={() => setIsCustodyModalOpen(false)}
      />

      <WantedReplyModal
        post={selectedWantedPost}
        onClose={() => setSelectedWantedPost(null)}
        onSubmitReply={handleSubmitWantedReply}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllRead}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onOpenListGear={handleListGear}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
