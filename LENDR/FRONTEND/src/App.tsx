/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GEAR_ITEMS, INITIAL_WANTED_POSTS } from './data/gearData';
import { GearItem, GearCategory, WantedPost, BookingRequest } from './types/gear';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { CatalogScreen } from './components/CatalogScreen';
import { DetailScreen } from './components/DetailScreen';
import { WantedScreen } from './components/WantedScreen';
import { ListEquipmentScreen } from './components/ListEquipmentScreen';
import { BookingsDrawer } from './components/BookingsDrawer';
import { ListGearModal } from './components/ListGearModal';
import { BookingConfirmationModal } from './components/BookingConfirmationModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { BookingConditionReportsModal } from './components/disputes/BookingConditionReportsModal';
import { DamageClaimModal } from './components/disputes/DamageClaimModal';
import { DamageClaimDetailModal } from './components/disputes/DamageClaimDetailModal';
import { ComplaintsModal } from './components/disputes/ComplaintsModal';
import { AdminDisputesScreen } from './components/disputes/AdminDisputesScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';

import {
  equipmentApi,
  bookingsApi,
  categoriesApi,
  notificationsApi,
} from './services/api';
import {
  adaptEquipmentToGearItem,
  adaptBookingToRequest,
  getUserInitials,
} from './services/adapters';

// ─── Inner App (has access to AuthContext) ────────────────────────────────────

function AppInner() {
  const { user, isLoading: authLoading, logout } = useAuth();

  // Screen state initialized from URL
  const [currentScreen, setCurrentScreen] = useState<'home' | 'catalog' | 'detail' | 'wanted' | 'list-gear' | 'admin-disputes'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/catalog')) return 'catalog';
      if (window.location.pathname.startsWith('/detail')) return 'detail';
      if (window.location.pathname.startsWith('/wanted')) return 'wanted';
      if (window.location.pathname.startsWith('/list-gear')) return 'list-gear';
      if (window.location.pathname.startsWith('/admin-disputes')) return 'admin-disputes';
    }
    return 'home';
  });

  const [selectedItem, setSelectedItem] = useState<GearItem>(GEAR_ITEMS[0]);
  const [wantedPosts, setWantedPosts] = useState<WantedPost[]>(INITIAL_WANTED_POSTS);

  // Equipment from API (falls back to static data while loading)
  const [items, setItems] = useState<GearItem[]>(GEAR_ITEMS);
  const [apiItemsLoaded, setApiItemsLoaded] = useState(false);

  // Bookings from API (falls back to empty while not logged in)
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [bookingsLoadError, setBookingsLoadError] = useState<string | null>(null);

  // Unread notifications count
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [targetWantedRequestId, setTargetWantedRequestId] = useState<string | null>(null);

  // Filter params for catalog navigation from hero/categories
  const [catalogCategory, setCatalogCategory] = useState<GearCategory | undefined>(undefined);
  const [catalogQuery, setCatalogQuery] = useState<string>('');

  // Modals state
  const [isBookingsDrawerOpen, setIsBookingsDrawerOpen] = useState(false);
  const [isListGearModalOpen, setIsListGearModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingBookingDetails, setPendingBookingDetails] = useState<{
    durationDays: number;
    startDate: string;
    endDate: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    landmark: string;
    purpose: string;
    baseAmount: number;
    securityDeposit: number;
    totalAmount: number;
  } | null>(null);

  // Disputes & Grievances Modals State
  const [conditionReportsModalBooking, setConditionReportsModalBooking] = useState<BookingRequest | null>(null);
  const [damageClaimModalBooking, setDamageClaimModalBooking] = useState<BookingRequest | null>(null);
  const [selectedClaimDetailId, setSelectedClaimDetailId] = useState<string | null>(null);
  const [isComplaintsModalOpen, setIsComplaintsModalOpen] = useState(false);
  const [complaintsInitialBookingId, setComplaintsInitialBookingId] = useState<string | null>(null);

  // ── Browser URL sync with popstate & history.pushState ────────────────────────
  const navigateToScreen = useCallback((screen: 'home' | 'catalog' | 'detail' | 'wanted' | 'list-gear' | 'admin-disputes') => {
    setCurrentScreen(screen);
    if (typeof window !== 'undefined') {
      let targetPath = '/';
      if (screen === 'catalog') targetPath = '/catalog';
      if (screen === 'detail') targetPath = '/detail';
      if (screen === 'wanted') targetPath = '/wanted';
      if (screen === 'list-gear') targetPath = '/list-gear';
      if (screen === 'admin-disputes') targetPath = '/admin-disputes';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ screen }, '', targetPath);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.screen) {
        setCurrentScreen(e.state.screen);
        return;
      }
      if (window.location.pathname.startsWith('/catalog')) {
        setCurrentScreen('catalog');
      } else if (window.location.pathname.startsWith('/detail')) {
        setCurrentScreen('detail');
      } else if (window.location.pathname.startsWith('/wanted')) {
        setCurrentScreen('wanted');
      } else if (window.location.pathname.startsWith('/list-gear')) {
        setCurrentScreen('list-gear');
      } else if (window.location.pathname.startsWith('/admin-disputes')) {
        setCurrentScreen('admin-disputes');
      } else {
        setCurrentScreen('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Load notifications count ──────────────────────────────────────────────────
  const loadNotificationsCount = useCallback(async () => {
    if (!user) {
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const res = await notificationsApi.list({ pageSize: 1 });
      setUnreadNotificationsCount(res.unreadCount);
    } catch {
      // Silently ignore notification fetch failures
    }
  }, [user]);

  useEffect(() => {
    loadNotificationsCount();
  }, [loadNotificationsCount]);

  // ── Load equipment from API ──────────────────────────────────────────────────
  const loadEquipment = useCallback(async () => {
    try {
      const result = await equipmentApi.browse({ pageSize: 50, sort: 'newest' });
      if (result.items.length > 0) {
        const adapted = result.items.map(adaptEquipmentToGearItem);
        setItems(adapted);
        setApiItemsLoaded(true);
        // Keep selected item pointing to real data
        if (!apiItemsLoaded) {
          setSelectedItem(adapted[0]);
        }
      }
    } catch {
      // Backend not reachable — keep static fallback silently
    }
  }, [apiItemsLoaded]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  // ── Load bookings from API (when logged in) ──────────────────────────────────
  const loadBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setBookingsLoaded(false);
      setBookingsLoadError(null);
      return;
    }
    setBookingsLoaded(false);
    setBookingsLoadError(null);
    try {
      const result = await bookingsApi.myBookings({ pageSize: 50 });
      const adapted = result.items.map((b) => adaptBookingToRequest(b));
      setBookings(adapted);
      setBookingsLoaded(true);
    } catch {
      setBookingsLoadError('Bookings could not be loaded. Please try again.');
      setBookingsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Scroll to top on screen change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentScreen]);

  // ── Handler: open bookings → require auth ────────────────────────────────────
  const handleOpenBookings = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsBookingsDrawerOpen(true);
  };

  // ── Handler: list gear → navigate to dedicated List Equipment page ───────────
  const handleOpenListGear = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    navigateToScreen('list-gear');
  };

  const handleSelectItem = (item: GearItem) => {
    setSelectedItem(item);
    navigateToScreen('detail');
  };

  const handleNavigateCatalog = (category?: GearCategory, query?: string) => {
    setCatalogCategory(category);
    if (query !== undefined) {
      setCatalogQuery(query);
    }
    navigateToScreen('catalog');
  };

  const handleRequestBooking = (details: {
    durationDays: number;
    startDate: string;
    endDate: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    landmark: string;
    purpose: string;
    baseAmount: number;
    securityDeposit: number;
    totalAmount: number;
  }) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setPendingBookingDetails(details);
  };

  // ── Handler: Booking handoff from an accepted offer or match ─────────────────
  const handleProceedToBookingFromGear = (
    item: GearItem,
    startDate: string,
    endDate: string,
  ) => {
    setSelectedItem(item);
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const startUtc = new Date(`${startDate}T00:00:00.000Z`).getTime();
    const endUtc = new Date(`${endDate}T00:00:00.000Z`).getTime();
    const diffDays = Math.floor((endUtc - startUtc) / 86_400_000);
    const durationDays = Math.max(diffDays + 1, 1);

    const baseAmount = item.pricePerDay * durationDays;
    const securityDeposit = item.depositAmount;
    const totalAmount = baseAmount + securityDeposit;

    const formatCampusDate = (date: string) => {
      try {
        return new Date(`${date}T12:00:00.000Z`).toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
      } catch {
        return date;
      }
    };

    setPendingBookingDetails({
      durationDays,
      startDate,
      endDate,
      pickupDate: formatCampusDate(startDate),
      pickupTime: '10:00 AM',
      returnDate: formatCampusDate(endDate),
      returnTime: '06:00 PM',
      landmark: item.location,
      purpose: 'Fulfilling wanted gear request',
      baseAmount,
      securityDeposit,
      totalAmount,
    });
  };

  // ── Handler: confirm booking → call real API ─────────────────────────────────
  const handleConfirmBooking = async (newBooking: BookingRequest) => {
    if (!user) {
      throw new Error('Sign in before submitting a booking request.');
    }
    if (!/^[0-9a-f-]{36}$/i.test(selectedItem.id)) {
      throw new Error('This demo listing cannot be booked. Choose a database-backed listing instead.');
    }

    const result = await bookingsApi.create({
      equipmentId: selectedItem.id,
      startDate: newBooking.startDate,
      endDate: newBooking.endDate,
      notes: newBooking.purpose,
    });
    const savedBooking = adaptBookingToRequest(result.booking, selectedItem.image);
    setBookings((prev) => [savedBooking, ...prev]);
    setIsBookingsDrawerOpen(true);
  };

  const handleReturnBooking = async (bookingId: string) => {
    if (!user || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
      throw new Error('Only a saved booking can request a return.');
    }
    const result = await bookingsApi.requestReturn(bookingId);
    const updatedBooking = adaptBookingToRequest(
      result.booking,
      bookings.find((booking) => booking.id === bookingId)?.gearImage ?? '',
    );
    setBookings((prev) => prev.map((booking) => (
      booking.id === bookingId ? updatedBooking : booking
    )));
  };

  // ── Handler: add gear → call real API ────────────────────────────────────────
  const handleAddGearItem = async (newItem: GearItem) => {
    if (!user) {
      throw new Error('Sign in before publishing a listing.');
    }
    const categorySlugByFormCategory: Record<GearCategory, string> = {
      cameras: 'cameras',
      audio: 'audio',
      drones: 'electronics',
      projectors: 'event-equipment',
      makers: 'project-kits',
      lighting: 'lighting',
      outdoors: 'sports',
    };
    const categorySlug = categorySlugByFormCategory[newItem.category];
    const categories = await categoriesApi.list();
    const category = categories.items.find((item) => item.slug === categorySlug);
    if (!category) {
      throw new Error('The selected equipment category is not available on the server.');
    }
    const created = await equipmentApi.create({
      categoryId: category.id,
      title: newItem.title,
      description: newItem.subtitle,
      tags: [],
      features: newItem.inclusions,
      useCases: [],
      specifications: {},
      imageUrls: [],
      dailyRentalPrice: newItem.pricePerDay,
      securityDeposit: newItem.depositAmount,
      maxRentalDays: 30,
      pickupLocation: newItem.location,
      condition: 'UNKNOWN',
      status: 'ACTIVE',
    });
    const savedItem = adaptEquipmentToGearItem(created.equipment);
    setItems((prev) => [savedItem, ...prev]);
    setSelectedItem(savedItem);
    navigateToScreen('detail');
  };

  // ── Avatar / profile info ─────────────────────────────────────────────────────
  const avatarInitials = user ? getUserInitials(user) : 'AK';
  const activeBookingsCount = bookings.filter(
    (booking) => !['completed', 'cancelled', 'rejected'].includes(booking.status),
  ).length;

  // Show spinner only during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fbf9f5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#114b3f] flex items-center justify-center text-white font-bold text-xl mx-auto animate-pulse">
            L
          </div>
          <p className="text-xs font-mono text-[#697a73]">Loading LENDR…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-[#1c2421] flex flex-col font-sans selection:bg-[#d96543] selection:text-white">
      {/* Announcement Bar */}
      <AnnouncementBar />

      {/* Main Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={navigateToScreen}
        bookingsCount={activeBookingsCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenBookings={handleOpenBookings}
        onOpenListGear={handleOpenListGear}
        onOpenComplaints={() => {
          setComplaintsInitialBookingId(null);
          setIsComplaintsModalOpen(true);
        }}
        onSelectWantedRequest={(requestId) => {
          setTargetWantedRequestId(requestId);
          navigateToScreen('wanted');
        }}
        onRefreshNotifications={loadNotificationsCount}
        user={user}
        avatarInitials={avatarInitials}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={logout}
      />

      {/* Screen Views with smooth fluid transition */}
      <main className="flex-1 overflow-hidden relative">
        <div key={currentScreen} className="screen-transition-enter">
          {currentScreen === 'home' && (
            <HomeScreen
              featuredItems={items}
              onSelectItem={handleSelectItem}
              onNavigateCatalog={handleNavigateCatalog}
              onOpenListGear={handleOpenListGear}
              onOpenStudentBoard={() => navigateToScreen('wanted')}
            />
          )}

          {currentScreen === 'catalog' && (
            <CatalogScreen
              items={items}
              onSelectItem={handleSelectItem}
              onOpenWantedModal={() => navigateToScreen('wanted')}
              initialCategory={catalogCategory}
              initialQuery={catalogQuery}
              onNavigateHome={() => navigateToScreen('home')}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {currentScreen === 'detail' && (
            <DetailScreen
              item={selectedItem}
              onBack={() => navigateToScreen('catalog')}
              onRequestBooking={handleRequestBooking}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              currentUser={user}
            />
          )}

          {currentScreen === 'wanted' && (
            <WantedScreen
              currentUser={user}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onProceedToBooking={handleProceedToBookingFromGear}
              initialSelectedRequestId={targetWantedRequestId}
              onClearInitialRequestId={() => setTargetWantedRequestId(null)}
            />
          )}

          {currentScreen === 'list-gear' && (
            <ListEquipmentScreen
              onBack={() => navigateToScreen('catalog')}
              onListingCreated={(newItem) => {
                setItems((prev) => [newItem, ...prev]);
                setSelectedItem(newItem);
                navigateToScreen('detail');
              }}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {currentScreen === 'admin-disputes' && (
            <AdminDisputesScreen
              currentUser={user}
              onNavigateHome={() => navigateToScreen('catalog')}
            />
          )}
        </div>
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Interactive Modals */}
      {isBookingsDrawerOpen && (
        <BookingsDrawer
          bookings={bookings}
          isLoading={!bookingsLoaded}
          loadError={bookingsLoadError}
          currentUser={user}
          onClose={() => setIsBookingsDrawerOpen(false)}
          onReturnBooking={handleReturnBooking}
          onOpenConditionReports={(booking) => setConditionReportsModalBooking(booking)}
          onOpenDamageClaim={(booking) => setDamageClaimModalBooking(booking)}
          onOpenClaimDetail={(claimId) => setSelectedClaimDetailId(claimId)}
          onOpenComplaints={(bookingId) => {
            setComplaintsInitialBookingId(bookingId || null);
            setIsComplaintsModalOpen(true);
          }}
        />
      )}

      {/* Condition Reports Modal */}
      {conditionReportsModalBooking && (
        <BookingConditionReportsModal
          bookingId={conditionReportsModalBooking.id}
          gearTitle={conditionReportsModalBooking.gearTitle}
          isOpen={true}
          onClose={() => setConditionReportsModalBooking(null)}
          currentUserId={user?.id}
        />
      )}

      {/* Damage Claim Creation Modal */}
      {damageClaimModalBooking && (
        <DamageClaimModal
          bookingId={damageClaimModalBooking.id}
          gearTitle={damageClaimModalBooking.gearTitle}
          returnRecordedAt={damageClaimModalBooking.returnRecordedAt}
          isOpen={true}
          onClose={() => setDamageClaimModalBooking(null)}
          onClaimCreated={(claim) => {
            setSelectedClaimDetailId(claim.id);
          }}
        />
      )}

      {/* Damage Claim Detail / Adjudication Modal */}
      {selectedClaimDetailId && (
        <DamageClaimDetailModal
          claimId={selectedClaimDetailId}
          isOpen={true}
          onClose={() => setSelectedClaimDetailId(null)}
          currentUser={user}
        />
      )}

      {/* Grievance / Complaints Modal */}
      {isComplaintsModalOpen && (
        <ComplaintsModal
          isOpen={true}
          onClose={() => {
            setIsComplaintsModalOpen(false);
            setComplaintsInitialBookingId(null);
          }}
          bookings={bookings}
          initialBookingId={complaintsInitialBookingId}
        />
      )}

      {isListGearModalOpen && (
        <ListGearModal
          onClose={() => setIsListGearModalOpen(false)}
          onAddGearItem={handleAddGearItem}
        />
      )}

      {pendingBookingDetails && (
        <BookingConfirmationModal
          item={selectedItem}
          bookingDetails={pendingBookingDetails}
          onClose={() => setPendingBookingDetails(null)}
          onConfirmBooking={handleConfirmBooking}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      )}
    </div>
  );
}

// ─── Root App (provides AuthContext) ─────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <AppInner />
      </FavoritesProvider>
    </AuthProvider>
  );
}
