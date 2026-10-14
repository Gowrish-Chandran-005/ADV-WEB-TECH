import React, { useState, useEffect, useCallback } from 'react';
import {
  wantedApi,
  categoriesApi,
  type ApiWantedRequest,
  type ApiCategory,
  type ApiWantedUrgency,
  type ApiWantedStatus,
  type ApiUser,
} from '../services/api';
import { formatTimeAgo } from '../services/adapters';
import { WantedFormModal } from './WantedFormModal';
import { OfferGearModal } from './OfferGearModal';
import { WantedDetailModal } from './WantedDetailModal';
import type { GearItem } from '../types/gear';

interface WantedScreenProps {
  currentUser: ApiUser | null;
  onOpenAuth: () => void;
  onProceedToBooking: (item: GearItem, startDate: string, endDate: string) => void;
  initialSelectedRequestId?: string | null;
  onClearInitialRequestId?: () => void;
}

export const WantedScreen: React.FC<WantedScreenProps> = ({
  currentUser,
  onOpenAuth,
  onProceedToBooking,
  initialSelectedRequestId = null,
  onClearInitialRequestId,
}) => {
  const [requests, setRequests] = useState<ApiWantedRequest[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<ApiWantedUrgency | 'all'>('all');
  const [statusTab, setStatusTab] = useState<'OPEN' | 'MY_REQUESTS' | 'ALL'>('OPEN');
  const [sortOption, setSortOption] = useState<'newest' | 'urgent'>('newest');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ApiWantedRequest | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offeringRequest, setOfferingRequest] = useState<ApiWantedRequest | null>(null);
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    let isMounted = true;
    categoriesApi
      .list()
      .then((res) => {
        if (isMounted) setCategories(res.items);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle deep-linked or notification-linked request ID
  useEffect(() => {
    if (initialSelectedRequestId) {
      setDetailRequestId(initialSelectedRequestId);
      if (onClearInitialRequestId) {
        onClearInitialRequestId();
      }
    }
  }, [initialSelectedRequestId, onClearInitialRequestId]);

  // Load requests from backend
  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam: ApiWantedStatus | 'ALL' | undefined =
        statusTab === 'OPEN' ? 'OPEN' : statusTab === 'ALL' ? 'ALL' : undefined;

      const res = await wantedApi.list({
        pageSize: 50,
        q: searchQuery.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: statusParam,
        urgency: selectedUrgency !== 'all' ? selectedUrgency : undefined,
        sort: sortOption,
      });

      let items = res.items;
      if (statusTab === 'MY_REQUESTS' && currentUser) {
        items = items.filter((r) => r.userId === currentUser.id);
      }
      setRequests(items);
    } catch {
      setError('Could not load wanted requests. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedUrgency, statusTab, sortOption, currentUser]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleOpenCreate = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setEditingRequest(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (req: ApiWantedRequest) => {
    setEditingRequest(req);
    setIsFormModalOpen(true);
  };

  const handleOpenOffer = (req: ApiWantedRequest) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setOfferingRequest(req);
    setIsOfferModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] pb-24 text-[#1c2421]">
      {/* Hero Banner with LENDR Forest Green Theme */}
      <section className="bg-gradient-to-b from-[#092620] via-[#0d382f] to-[#114b3f] text-white pt-10 pb-12 px-4 sm:px-6 lg:px-8 border-b border-emerald-950/80 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-700/60 text-xs font-mono font-medium text-emerald-200 shadow-sm mb-3">
                <span className="w-2 h-2 rounded-full bg-[#d96543] animate-pulse"></span>
                CAMPUS WANTED BOARD • VIT VELLORE
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Student Gear <span className="text-[#f6aa97]">Wanted Board</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-emerald-100/80 max-w-2xl leading-relaxed">
                Need a specific camera, lens, drone, audio recorder, or lab tool that isn’t listed? Post a request to notify peer lenders across campus hostels and blocks.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleOpenCreate}
                className="px-6 py-3.5 rounded-full bg-[#d96543] hover:bg-[#c85635] text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span>
                <span>Post Wanted Request</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-3xl">
            <div className="flex items-center bg-[#092620]/90 rounded-2xl border border-emerald-700/60 px-4 py-3 shadow-inner focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20">
              <svg className="w-4 h-4 text-emerald-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requests by gear, keyword, purpose, or model (e.g. Ronin, FX3, Zoom H6)..."
                className="w-full bg-transparent border-0 p-0 text-sm text-white placeholder-emerald-300/50 focus:outline-none focus:ring-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-emerald-400 hover:text-white px-2 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Filter Controls Row */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-2 bg-[#f4f1ea] p-1 rounded-xl">
              <button
                onClick={() => setStatusTab('OPEN')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusTab === 'OPEN'
                    ? 'bg-[#114b3f] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Open Requests
              </button>
              {currentUser && (
                <button
                  onClick={() => setStatusTab('MY_REQUESTS')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusTab === 'MY_REQUESTS'
                      ? 'bg-[#114b3f] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  My Requests
                </button>
              )}
              <button
                onClick={() => setStatusTab('ALL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusTab === 'ALL'
                    ? 'bg-[#114b3f] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All (incl. Fulfilled)
              </button>
            </div>

            {/* Urgency & Sort Controls */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-stone-500 text-[11px]">Urgency:</span>
                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value as ApiWantedUrgency | 'all')}
                  className="bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1 text-stone-700 font-medium focus:outline-none focus:border-[#114b3f]"
                >
                  <option value="all">All Urgencies</option>
                  <option value="HIGH">High Urgency</option>
                  <option value="MEDIUM">Medium Urgency</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-stone-500 text-[11px]">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as 'newest' | 'urgent')}
                  className="bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1 text-stone-700 font-medium focus:outline-none focus:border-[#114b3f]"
                >
                  <option value="newest">Newest First</option>
                  <option value="urgent">Most Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none border-t border-stone-100 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#114b3f] text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-[#114b3f] text-white font-bold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Wanted Cards */}
        {error ? (
          <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-sm text-red-700">
            {error}
            <div className="mt-3">
              <button
                onClick={loadRequests}
                className="px-4 py-2 bg-[#114b3f] text-white rounded-xl text-xs font-bold"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-3 border-[#114b3f] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-xs font-mono text-stone-500">Loading campus wanted board…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-10 bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs max-w-lg mx-auto">
            <h3 className="font-display font-bold text-lg text-stone-800">No Gear Requests Found</h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'all' || selectedUrgency !== 'all'
                ? 'Try broadening your search filters or clear your keyword query.'
                : 'No student requests currently posted in this category. Be the first to post what you need!'}
            </p>
            <div className="mt-5">
              <button
                onClick={handleOpenCreate}
                className="px-5 py-2.5 rounded-full bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold transition-all shadow-sm"
              >
                + Post a Request
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {requests.map((req) => {
              const isOwner = currentUser && currentUser.id === req.userId;
              return (
                <div
                  key={req.id}
                  onClick={() => setDetailRequestId(req.id)}
                  className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs hover:shadow-md hover:border-emerald-700/40 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        req.urgency === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : req.urgency === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {req.urgency} URGENCY
                      </span>

                      <span className="text-[10px] font-mono text-stone-400">
                        {formatTimeAgo(req.createdAt)}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-display font-bold text-base text-stone-900 group-hover:text-[#114b3f] transition-colors line-clamp-1">
                      {req.title}
                    </h3>
                    <p className="mt-2 text-xs text-stone-600 line-clamp-3 leading-relaxed">
                      {req.description}
                    </p>

                    {/* Meta Info */}
                    <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-[11px] font-mono text-stone-500">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Category:</span>
                        <span className="text-stone-700 font-medium">{req.categoryName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Required:</span>
                        <span className="text-stone-700 font-medium">{req.startDate} → {req.endDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Zone:</span>
                        <span className="text-stone-700 font-medium truncate max-w-[160px]">{req.locationBlock || 'Campus Area'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Author + Action CTA */}
                  <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#114b3f] text-emerald-100 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {req.author.initials}
                      </div>
                      <div className="truncate text-xs font-medium text-stone-800">
                        {req.author.fullName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailRequestId(req.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Manage ({req.offersCount})
                        </button>
                      ) : req.status === 'OPEN' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOffer(req);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          Offer Gear
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-stone-400">
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <WantedFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingRequest(null);
        }}
        onSuccess={loadRequests}
        initialData={editingRequest}
      />

      <OfferGearModal
        isOpen={isOfferModalOpen}
        onClose={() => {
          setIsOfferModalOpen(false);
          setOfferingRequest(null);
        }}
        request={offeringRequest}
        onSuccess={loadRequests}
      />

      <WantedDetailModal
        isOpen={!!detailRequestId}
        requestId={detailRequestId}
        currentUser={currentUser}
        onClose={() => setDetailRequestId(null)}
        onOpenAuth={onOpenAuth}
        onOpenOfferModal={handleOpenOffer}
        onOpenEditModal={handleOpenEdit}
        onRequestWithdrawn={loadRequests}
        onProceedToBooking={onProceedToBooking}
      />
    </div>
  );
};
