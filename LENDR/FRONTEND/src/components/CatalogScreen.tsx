import React, { useState, useMemo } from 'react';
import { GearItem, GearCategory } from '../types/gear';
import { useFavorites } from '../context/FavoritesContext';

interface CatalogScreenProps {
  items: GearItem[];
  onSelectItem: (item: GearItem) => void;
  onOpenWantedModal: () => void;
  initialCategory?: GearCategory;
  initialQuery?: string;
  onNavigateHome: () => void;
  onOpenAuth?: () => void;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  items,
  onSelectItem,
  onOpenWantedModal,
  initialCategory,
  initialQuery = '',
  onNavigateHome,
  onOpenAuth,
}) => {
  const { isFavorited, isToggling, toggleFavorite, error: favoritesError, clearError } = useFavorites();
  // Filters state
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [maxPrice, setMaxPrice] = useState(850);
  const [selectedCategories, setSelectedCategories] = useState<GearCategory[]>(
    initialCategory ? [initialCategory] : ['cameras', 'audio', 'lighting']
  );
  const [timeSlot, setTimeSlot] = useState<'today' | 'weekend' | 'tomorrow' | 'custom'>('weekend');
  const [depositFilter, setDepositFilter] = useState<'all' | 'zero' | 'token' | 'club'>('zero');
  const [activeUseCase, setActiveUseCase] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'landmark' | 'recent'>('rating');
  const [currentPage, setCurrentPage] = useState(1);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      cameras: items.filter((i) => i.category === 'cameras').length + 42,
      audio: items.filter((i) => i.category === 'audio').length + 33,
      drones: items.filter((i) => i.category === 'drones').length + 17,
      projectors: items.filter((i) => i.category === 'projectors').length + 12,
      makers: items.filter((i) => i.category === 'makers').length + 39,
      lighting: items.filter((i) => i.category === 'lighting').length + 22,
    };
  }, [items]);

  const handleToggleCategory = (cat: GearCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedLocation('All');
    setMaxPrice(1500);
    setTimeSlot('weekend');
    setDepositFilter('all');
    setActiveUseCase(null);
    setQuickFilter(null);
    setSearchQuery('');
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSubtitle = item.subtitle.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSubtitle && !matchTags) return false;
      }

      // Categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }

      // Max Price
      if (item.pricePerDay > maxPrice) {
        return false;
      }

      // Location
      if (selectedLocation !== 'All') {
        if (selectedLocation === 'SJT' && item.locationCategory !== 'sjt') return false;
        if (selectedLocation === 'TT' && item.locationCategory !== 'tt') return false;
        if (selectedLocation === 'MB' && item.locationCategory !== 'mb') return false;
        if (selectedLocation === 'Mens' && item.locationCategory !== 'mens_hostel') return false;
        if (selectedLocation === 'Ladies' && item.locationCategory !== 'ladies_hostel') return false;
      }

      // Deposit
      if (depositFilter === 'zero' && item.depositType !== 'zero') return false;
      if (depositFilter === 'token' && item.depositType !== 'token') return false;

      // Quick filter
      if (quickFilter === 'available_now' && !item.isAvailableToday) return false;
      if (quickFilter === 'zero_deposit' && item.depositType !== 'zero') return false;
      if (quickFilter === 'favorites' && !isFavorited(item.id)) return false;
      if (quickFilter === 'film' && item.category !== 'cameras' && item.category !== 'lighting') return false;
      if (quickFilter === 'tech' && item.category !== 'makers' && item.category !== 'drones') return false;
      if (quickFilter === 'weekend' && !item.isWeekendFriendly) return false;

      // Use Case
      if (activeUseCase && !item.useCases.includes(activeUseCase as any)) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, selectedCategories, maxPrice, selectedLocation, depositFilter, quickFilter, activeUseCase, isFavorited]);

  // Sort items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    if (sortBy === 'rating') {
      list.sort((a, b) => b.owner.rating - a.owner.rating);
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => a.pricePerDay - b.pricePerDay);
    } else if (sortBy === 'landmark') {
      list.sort((a, b) => a.location.localeCompare(b.location));
    }
    return list;
  }, [filteredItems, sortBy]);

  return (
    <div className="space-y-8 screen-transition-enter">
      {/* BEGIN: PageHeader */}
      <section className="border-b border-[#e7e2d7] bg-[#fbf9f5] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title & Badge in single concise line */}
            <div className="flex items-center gap-3 shrink-0">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0d382f] tracking-tight">
                Campus Equipment<span className="text-[#d96543]">.</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#092620] text-emerald-200 text-[11px] font-mono font-bold shadow-xs">
                184 items
              </span>
            </div>

            {/* Quick Filter Shortcuts in single aligned row */}
            <div aria-label="Quick Filter Shortcuts" className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => setQuickFilter(quickFilter === 'available_now' ? null : 'available_now')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all outline-hover-green cursor-pointer ${
                  quickFilter === 'available_now'
                    ? 'bg-[#0d382f] text-white shadow-sm'
                    : 'bg-white hover:bg-[#f2eee6] text-[#1c2421] border border-[#e7e2d7]'
                }`}
              >
                Available Now
              </button>
              <button
                onClick={() => setQuickFilter(quickFilter === 'zero_deposit' ? null : 'zero_deposit')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors outline-hover-green cursor-pointer ${
                  quickFilter === 'zero_deposit'
                    ? 'bg-[#114b3f] text-white border-[#114b3f]'
                    : 'bg-white hover:bg-[#f2eee6] text-[#1c2421] border-[#e7e2d7]'
                }`}
              >
                Zero Deposit
              </button>
              <button
                type="button"
                onClick={() => setQuickFilter(quickFilter === 'favorites' ? null : 'favorites')}
                aria-pressed={quickFilter === 'favorites'}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors outline-hover-green cursor-pointer flex items-center gap-1.5 ${
                  quickFilter === 'favorites'
                    ? 'bg-[#d96543] text-white border-[#d96543] shadow-xs'
                    : 'bg-white hover:bg-[#f2eee6] text-[#1c2421] border-[#e7e2d7]'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill={quickFilter === 'favorites' ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <span>Saved Gear</span>
              </button>
              <button
                onClick={() => setQuickFilter(quickFilter === 'film' ? null : 'film')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors outline-hover-green cursor-pointer ${
                  quickFilter === 'film'
                    ? 'bg-[#114b3f] text-white border-[#114b3f]'
                    : 'bg-white hover:bg-[#f2eee6] text-[#1c2421] border-[#e7e2d7]'
                }`}
              >
                Film &amp; Media
              </button>
              <button
                onClick={() => setQuickFilter(quickFilter === 'tech' ? null : 'tech')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors outline-hover-green cursor-pointer ${
                  quickFilter === 'tech'
                    ? 'bg-[#114b3f] text-white border-[#114b3f]'
                    : 'bg-white hover:bg-[#f2eee6] text-[#1c2421] border-[#e7e2d7]'
                }`}
              >
                Tech &amp; Lab Kits
              </button>
              <button
                onClick={() => setQuickFilter(quickFilter === 'weekend' ? null : 'weekend')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors outline-hover-green cursor-pointer ${
                  quickFilter === 'weekend'
                    ? 'bg-[#114b3f] text-white border-[#114b3f]'
                    : 'bg-white hover:bg-[#f2eee6] text-[#1c2421] border-[#e7e2d7]'
                }`}
              >
                Weekend Friendly
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BEGIN: MainContentDiscoveryLayout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* BEGIN: LeftFilterSidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#e7e2d7] shadow-sm space-y-6">
              {/* Filter Panel Title & Clear */}
              <div className="flex items-center justify-between pb-4 border-b border-[#e7e2d7]">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <h2 className="font-display font-bold text-base text-[#114b3f]">Filter Catalog</h2>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-[#e97753] hover:underline cursor-pointer"
                >
                  Reset All
                </button>
              </div>

              {/* Filter Group: Campus Location */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#697a73]">
                  Campus Handover Location
                </label>
                <div className="relative">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full text-xs font-medium rounded-xl border border-[#e7e2d7] bg-[#fbf9f5]/80 py-2.5 px-3 focus:outline-none focus:border-[#114b3f] cursor-pointer"
                  >
                    <option value="All">All VIT Vellore (Any Location)</option>
                    <option value="SJT">SJT (Silver Jubilee Tower)</option>
                    <option value="TT">TT Block (Technology Tower)</option>
                    <option value="MB">MB (Main Building &amp; Audi)</option>
                    <option value="Mens">Mens Hostel Blocks (A to R)</option>
                    <option value="Ladies">Ladies Hostel Blocks (LH)</option>
                  </select>
                </div>
              </div>

              {/* Filter Group: Categories Multi-select */}
              <div className="space-y-3 pt-2 border-t border-[#e7e2d7]/80">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#697a73]">
                    Equipment Category
                  </label>
                  <span className="text-[11px] text-[#697a73]">8 total</span>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { id: 'cameras', label: 'Cameras & DSLRs', count: categoryCounts.cameras },
                    { id: 'audio', label: 'Audio & Podcast Mics', count: categoryCounts.audio },
                    { id: 'drones', label: 'Drones & Aerial', count: categoryCounts.drones },
                    { id: 'projectors', label: 'Projectors & Displays', count: categoryCounts.projectors },
                    { id: 'makers', label: 'Makers & Hardware Kits', count: categoryCounts.makers },
                    { id: 'lighting', label: 'Lighting & Gimbals', count: categoryCounts.lighting },
                  ].map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#fbf9f5] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.id as GearCategory)}
                          onChange={() => handleToggleCategory(cat.id as GearCategory)}
                          className="w-4 h-4 rounded text-[#114b3f] focus:ring-[#114b3f] border-[#e7e2d7] accent-[#114b3f]"
                        />
                        <span className="font-medium text-[#1c2421]">{cat.label}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#f2eee6] text-[10px] font-bold text-[#697a73]">
                        {cat.count}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter Group: Rental Rate Slider */}
              <div className="space-y-3 pt-2 border-t border-[#e7e2d7]/80">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#697a73]">
                    Daily Rental Rate
                  </label>
                  <span className="text-xs font-bold text-[#114b3f]">Up to ₹{maxPrice}/day</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-2 bg-[#f2eee6] rounded-lg appearance-none cursor-pointer accent-[#114b3f]"
                />
                <div className="flex justify-between text-[11px] text-[#697a73] font-medium">
                  <span>₹50/day</span>
                  <span>₹1,500/day</span>
                </div>
              </div>

              {/* Filter Group: Availability Calendar Slot */}
              <div className="space-y-3 pt-2 border-t border-[#e7e2d7]/80">
                <label className="text-xs font-bold uppercase tracking-wider text-[#697a73]">Needed For</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTimeSlot('today')}
                    className={`py-2 px-3 rounded-xl border font-medium text-left flex items-center justify-between cursor-pointer ${
                      timeSlot === 'today'
                        ? 'border-[#114b3f] bg-[#e8f3ef] text-[#114b3f] font-bold'
                        : 'border-[#e7e2d7] bg-white hover:border-[#114b3f]'
                    }`}
                  >
                    <span>Today</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSlot('weekend')}
                    className={`py-2 px-3 rounded-xl border font-medium text-left flex items-center justify-between cursor-pointer ${
                      timeSlot === 'weekend'
                        ? 'border-[#114b3f] bg-[#e8f3ef] text-[#114b3f] font-bold'
                        : 'border-[#e7e2d7] bg-white hover:border-[#114b3f]'
                    }`}
                  >
                    <span>Weekend</span>
                    <span className="w-2 h-2 rounded-full bg-[#114b3f]"></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSlot('tomorrow')}
                    className={`py-2 px-3 rounded-xl border font-medium text-left cursor-pointer ${
                      timeSlot === 'tomorrow'
                        ? 'border-[#114b3f] bg-[#e8f3ef] text-[#114b3f] font-bold'
                        : 'border-[#e7e2d7] bg-white hover:border-[#114b3f]'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSlot('custom')}
                    className={`py-2 px-3 rounded-xl border font-medium text-left cursor-pointer ${
                      timeSlot === 'custom'
                        ? 'border-[#114b3f] bg-[#e8f3ef] text-[#114b3f] font-bold'
                        : 'border-[#e7e2d7] bg-white hover:border-[#114b3f]'
                    }`}
                  >
                    Custom Dates
                  </button>
                </div>
              </div>

              {/* Filter Group: Security Deposit Requirement */}
              <div className="space-y-3 pt-2 border-t border-[#e7e2d7]/80">
                <label className="text-xs font-bold uppercase tracking-wider text-[#697a73]">
                  Deposit &amp; Verification
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="security"
                      checked={depositFilter === 'zero'}
                      onChange={() => setDepositFilter('zero')}
                      className="text-[#114b3f] focus:ring-[#114b3f] accent-[#114b3f]"
                    />
                    <span className="font-medium">VIT ID Only (Zero Deposit)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="security"
                      checked={depositFilter === 'token'}
                      onChange={() => setDepositFilter('token')}
                      className="text-[#114b3f] focus:ring-[#114b3f] accent-[#114b3f]"
                    />
                    <span className="font-medium">Refundable Token (&lt;₹300)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="security"
                      checked={depositFilter === 'club'}
                      onChange={() => setDepositFilter('club')}
                      className="text-[#114b3f] focus:ring-[#114b3f] accent-[#114b3f]"
                    />
                    <span className="font-medium">Club Letter / Authorization</span>
                  </label>
                </div>
              </div>

              {/* Filter Group: SmartMatch Use Case */}
              <div className="space-y-3 pt-2 border-t border-[#e7e2d7]/80">
                <label className="text-xs font-bold uppercase tracking-wider text-[#697a73]">
                  SmartMatch Use Case
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'filmmaking', label: 'Filmmaking' },
                    { id: 'hackathon', label: 'Hackathon' },
                    { id: 'podcast', label: 'Podcast' },
                    { id: 'robotics', label: 'Robotics' },
                    { id: 'club_event', label: 'Club Event' },
                  ].map((uc) => (
                    <button
                      key={uc.id}
                      type="button"
                      onClick={() => setActiveUseCase(activeUseCase === uc.id ? null : uc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeUseCase === uc.id
                          ? 'bg-[#114b3f] text-white'
                          : 'bg-[#f2eee6] text-[#1c2421] hover:bg-[#d1e7dd]'
                      }`}
                    >
                      {uc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Promo / Trust Badge Note */}
            <div className="p-5 rounded-2xl bg-[#e8f3ef] border border-[#d1e7dd] space-y-2">
              <div className="flex items-center gap-2 text-[#114b3f] font-bold text-xs uppercase tracking-wide">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  />
                </svg>
                Campus Handover Protocol
              </div>
              <p className="text-xs text-[#1c2421] leading-relaxed">
                All gear checked via digital condition log before &amp; after handoff. Zero deposit awkwardness between verified students.
              </p>
            </div>
          </aside>

          {/* BEGIN: RightMainGrid */}
          <section className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* Unified Filter & Sorting Action Bar */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#e7e2d7] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Active filter pills & Quick Reset */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="text-[#697a73] font-semibold text-[11px] uppercase tracking-wider">Active:</span>
                {selectedCategories.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f3ef] text-[#114b3f] font-semibold border border-[#d1e7dd] outline-hover-green">
                    {selectedCategories.length} Categories
                    <button
                      onClick={() => setSelectedCategories([])}
                      aria-label="Remove category filter"
                      className="hover:text-red-600 cursor-pointer ml-0.5 flex items-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {timeSlot && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f3ef] text-[#114b3f] font-semibold border border-[#d1e7dd] outline-hover-green">
                    {timeSlot === 'weekend' ? 'Weekend Slot' : `${timeSlot.toUpperCase()} Slot`}
                    <button
                      onClick={() => setTimeSlot('weekend')}
                      aria-label="Remove time slot filter"
                      className="hover:text-red-600 cursor-pointer ml-0.5 flex items-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {depositFilter === 'zero' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f3ef] text-[#114b3f] font-semibold border border-[#d1e7dd] outline-hover-green">
                    Zero Deposit
                    <button
                      onClick={() => setDepositFilter('all')}
                      aria-label="Remove deposit filter"
                      className="hover:text-red-600 cursor-pointer ml-0.5 flex items-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] text-[#e97753] hover:underline font-bold px-2 py-0.5 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              {/* Sorting Selector with dark outline hover */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <label htmlFor="sort-by" className="text-xs font-semibold text-[#697a73] whitespace-nowrap">
                  Sort:
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-bold rounded-xl border border-[#e7e2d7] bg-[#fbf9f5] py-1.5 px-3 focus:outline-none focus:border-[#0d382f] text-[#0d382f] cursor-pointer outline-hover-green transition-all"
                >
                  <option value="rating">Highest Rated Peer</option>
                  <option value="price_asc">Lowest Rate (₹/day)</option>
                  <option value="landmark">Nearest Location</option>
                </select>
              </div>
            </div>

            {/* Inline Noticeboard Callout Banner */}
            <div className="rounded-2xl bg-[#114b3f] text-white px-5 py-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-900/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#d96543]" />
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Need gear not listed here?
                  </h3>
                  <p className="text-[11px] text-emerald-200/80">
                    Post a quick request on the campus wanted board.
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenWantedModal}
                className="px-4 py-2 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                Post Wanted Request →
              </button>
            </div>

            {/* Favorites Feedback Banner */}
            {favoritesError && (
              <div
                role="alert"
                className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">Favorites notice:</span>
                  <span>{favoritesError}</span>
                </div>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-amber-800 hover:text-amber-950 font-bold px-2 py-1 rounded cursor-pointer"
                  aria-label="Dismiss notice"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Gear Listings Cards Grid (6 items) */}
            {sortedItems.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#e7e2d7] space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 text-[#114b3f] flex items-center justify-center mx-auto shadow-inner">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-[#114b3f]">No gear matched your exact filters</h3>
                <p className="text-xs text-[#697a73] max-w-md mx-auto">
                  Try adjusting the rental rate slider, clearing category checkboxes, or post a Wanted Request on the campus board!
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c382f] cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedItems.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="product-card-modern bg-white rounded-3xl overflow-hidden border border-stone-200/80 hover:border-emerald-700/40 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
                  >
                    <div>
                      {/* Image Preview with Floating Badges */}
                      <div className="relative bg-stone-100 aspect-[16/10] overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Top Left: Availability Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#092620]/90 text-emerald-200 text-[10px] font-mono font-bold backdrop-blur-md shadow-sm border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {item.availabilityBadge}
                          </span>
                          {item.images && item.images.length > 1 && (
                            <span className="px-2 py-1 rounded-full bg-black/70 text-white text-[9px] font-mono font-bold backdrop-blur-md">
                              {item.images.length} Photos
                            </span>
                          )}
                        </div>

                        {/* Top Right: Handover Location & Favorite Toggle */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 text-stone-800 text-[10px] font-semibold backdrop-blur-md shadow-sm border border-stone-200/60">
                            {item.location}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item.id, onOpenAuth);
                            }}
                            disabled={isToggling(item.id)}
                            aria-label={isFavorited(item.id) ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`}
                            title={isFavorited(item.id) ? 'Remove from favorites' : 'Save to favorites'}
                            className={`p-2 rounded-full transition-all duration-200 cursor-pointer shadow-sm backdrop-blur-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#114b3f] active:scale-90 motion-reduce:transform-none ${
                              isFavorited(item.id)
                                ? 'bg-white text-[#d96543] border-[#d96543]/40 shadow-xs'
                                : 'bg-white/95 text-stone-600 hover:text-[#d96543] hover:bg-white border-stone-200/70'
                            } ${isToggling(item.id) ? 'opacity-60 cursor-wait' : ''}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="w-4 h-4 transition-transform motion-reduce:transform-none"
                              fill={isFavorited(item.id) ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                            </svg>
                          </button>
                        </div>

                        {/* Bottom Tag on image */}
                        <div className="absolute bottom-3 left-3">
                          <span className="px-2.5 py-0.5 rounded-md bg-stone-900/80 text-white text-[10px] font-mono tracking-wide backdrop-blur-sm">
                            {item.categoryLabel}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 pb-3">
                        <h3 className="font-display font-bold text-base text-stone-900 group-hover:text-[#114b3f] transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-1 leading-relaxed">
                          {item.subtitle}
                        </p>

                        {/* Key tags */}
                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                          {item.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-stone-600 text-[10px] font-mono"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[10px] font-mono font-medium">
                            {item.depositType === 'zero' ? 'Zero Deposit' : '₹' + item.depositAmount + ' Deposit'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Cleanly Aligned Lender and Rate */}
                    <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between gap-3 bg-stone-50/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#114b3f] text-emerald-100 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {item.owner.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-800 truncate">
                            {item.owner.name}
                          </div>
                          <div className="text-[10px] text-stone-500 font-mono">
                            {item.owner.rating} ★
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-display font-bold text-base text-[#114b3f]">
                            ₹{item.pricePerDay}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono block -mt-1">
                            /day
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(item);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold transition-all shadow-sm group-hover:bg-[#d96543] btn-magnetic cursor-pointer"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination Bar */}
            <nav aria-label="Pagination" className="pt-6 flex items-center justify-between border-t border-[#e7e2d7]">
              <p className="text-xs text-[#697a73]">
                Showing <span className="font-bold text-[#1c2421]">1–{Math.min(6, sortedItems.length)}</span> of{' '}
                <span className="font-bold text-[#1c2421]">184</span> items
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-[#e7e2d7] bg-white text-xs font-bold text-[#697a73] hover:bg-[#f2eee6] transition-colors cursor-pointer"
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold cursor-pointer ${
                    currentPage === 1 ? 'bg-[#114b3f] text-white' : 'bg-white border border-[#e7e2d7]'
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setCurrentPage(2)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold cursor-pointer ${
                    currentPage === 2 ? 'bg-[#114b3f] text-white' : 'bg-white border border-[#e7e2d7] hover:bg-[#f2eee6]'
                  }`}
                >
                  2
                </button>
                <button
                  onClick={() => setCurrentPage(3)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold cursor-pointer ${
                    currentPage === 3 ? 'bg-[#114b3f] text-white' : 'bg-white border border-[#e7e2d7] hover:bg-[#f2eee6]'
                  }`}
                >
                  3
                </button>
                <span className="text-xs text-[#697a73] px-1">...</span>
                <button
                  onClick={() => setCurrentPage(31)}
                  className="w-8 h-8 rounded-xl bg-white border border-[#e7e2d7] hover:bg-[#f2eee6] text-xs font-bold text-[#1c2421] cursor-pointer"
                >
                  31
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(31, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-[#e7e2d7] bg-white text-xs font-bold text-[#1c2421] hover:bg-[#f2eee6] transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </nav>
          </section>
        </div>
      </main>
    </div>
  );
};
