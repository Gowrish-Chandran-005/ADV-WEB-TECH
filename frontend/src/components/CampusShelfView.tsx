import React, { useState, useMemo } from 'react';
import { GearCategory, GearItem, RentalBooking } from '../types';

interface CampusShelfViewProps {
  items: GearItem[];
  userBorrows: RentalBooking[];
  initialCategory?: GearCategory;
  initialSearch?: string;
  onOpenListGear: () => void;
  onRentItem: (item: GearItem) => void;
  onToggleBookmark: (itemId: string) => void;
  onOpenCustodyModal: () => void;
  onBackToNoticeboard: () => void;
  onOpenNotifications: () => void;
}

export const CampusShelfView: React.FC<CampusShelfViewProps> = ({
  items,
  userBorrows,
  initialCategory,
  initialSearch = '',
  onOpenListGear,
  onRentItem,
  onToggleBookmark,
  onOpenCustodyModal,
  onBackToNoticeboard,
  onOpenNotifications,
}) => {
  // Sidebar state
  const [activeTab, setActiveTab] = useState<'discover' | 'borrows' | 'lending' | 'items' | 'profile'>(
    'discover'
  );

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<GearCategory | 'All'>(
    initialCategory || 'All'
  );
  const [selectedBlock, setSelectedBlock] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'price-low' | 'price-high' | 'rating'>('recent');
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [priceMax, setPriceMax] = useState<number>(3000);

  // Filter items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesQuery =
          !searchQuery.trim() ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === 'All' || item.category === selectedCategory;

        const matchesBlock =
          selectedBlock === 'All' || item.location.toLowerCase().includes(selectedBlock.toLowerCase());

        const matchesPrice = item.pricePerDay <= priceMax;

        return matchesQuery && matchesCategory && matchesBlock && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.pricePerDay - b.pricePerDay;
        if (sortBy === 'price-high') return b.pricePerDay - a.pricePerDay;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // recent default
      });
  }, [items, searchQuery, selectedCategory, selectedBlock, priceMax, sortBy]);

  const campusBlocks = [
    'All',
    'Technology Block',
    'Architecture Block',
    'Auditorium Pod',
    'Sports Complex',
    'T-Hub',
    'Media Lab',
    'Workshop',
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full bg-[#fdf9f1]">
      {/* LEFT SIDEBAR (Matching Image 3) */}
      <aside className="w-64 shrink-0 bg-[#f7f3eb] border-r border-[#ece8e0] p-4 flex flex-col justify-between hidden md:flex">
        <div className="flex flex-col gap-6">
          {/* Sidebar Brand Header */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#fd947b] text-[#762b1a] flex items-center justify-center font-bold text-sm shadow-xs">
                <span className="material-symbols-outlined text-base">emergency_share</span>
              </div>
              <span className="font-headline-sm text-lg font-bold tracking-widest text-[#1c1c17]">
                LENDR
              </span>
            </div>
            <button
              onClick={onBackToNoticeboard}
              className="text-[11px] font-mono text-[#094d48] hover:underline"
              title="Return to Public Noticeboard"
            >
              Noticeboard ↗
            </button>
          </div>

          {/* Section: CAMPUS EXCHANGE */}
          <div className="flex flex-col gap-1.5">
            <span className="font-label-stamp text-[10px] text-[#707977] uppercase tracking-wider px-3 pb-1 font-bold">
              Campus Exchange
            </span>

            {/* Discover Tab */}
            <button
              onClick={() => setActiveTab('discover')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-md text-sm font-semibold transition-colors cursor-pointer text-left ${
                activeTab === 'discover'
                  ? 'bg-[#1b4d45] text-white shadow-sm'
                  : 'text-[#404947] hover:bg-[#ece8e0] hover:text-[#1c1c17]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">explore</span>
              <span>Discover</span>
            </button>

            {/* My Borrows Tab */}
            <button
              onClick={() => setActiveTab('borrows')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-body-md text-sm font-semibold transition-colors cursor-pointer text-left ${
                activeTab === 'borrows'
                  ? 'bg-[#1b4d45] text-white shadow-sm'
                  : 'text-[#404947] hover:bg-[#ece8e0] hover:text-[#1c1c17]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">inventory_2</span>
                <span>My borrows</span>
              </div>
              {userBorrows.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#b2eee7] text-[#00201e] font-bold">
                  {userBorrows.length}
                </span>
              )}
            </button>

            {/* My Lending Tab */}
            <button
              onClick={() => setActiveTab('lending')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-md text-sm font-semibold transition-colors cursor-pointer text-left ${
                activeTab === 'lending'
                  ? 'bg-[#1b4d45] text-white shadow-sm'
                  : 'text-[#404947] hover:bg-[#ece8e0] hover:text-[#1c1c17]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">group</span>
              <span>My lending</span>
            </button>

            {/* My Items Tab */}
            <button
              onClick={() => setActiveTab('items')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-md text-sm font-semibold transition-colors cursor-pointer text-left ${
                activeTab === 'items'
                  ? 'bg-[#1b4d45] text-white shadow-sm'
                  : 'text-[#404947] hover:bg-[#ece8e0] hover:text-[#1c1c17]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">package_2</span>
              <span>My items</span>
            </button>
          </div>

          {/* Section: YOUR SPACE */}
          <div className="flex flex-col gap-1.5 pt-2">
            <span className="font-label-stamp text-[10px] text-[#707977] uppercase tracking-wider px-3 pb-1 font-bold">
              Your Space
            </span>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-md text-sm font-semibold transition-colors cursor-pointer text-left ${
                activeTab === 'profile'
                  ? 'bg-[#1b4d45] text-white shadow-sm'
                  : 'text-[#404947] hover:bg-[#ece8e0] hover:text-[#1c1c17]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">person</span>
              <span>Profile</span>
            </button>

            <button
              onClick={onOpenNotifications}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-body-md text-sm font-semibold text-[#404947] hover:bg-[#ece8e0] hover:text-[#1c1c17] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">notifications</span>
                <span>Notifications</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#994531]" />
            </button>
          </div>
        </div>

        {/* Sidebar Footer Cards */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#ece8e0]">
          {/* Card: Keep good things in circulation */}
          <div className="bg-[#f1ede6] p-3.5 rounded-2xl flex items-start gap-2.5 border border-[#e6e2da]">
            <span className="material-symbols-outlined text-[#094d48] text-lg mt-0.5">
              auto_awesome
            </span>
            <p className="font-body-sm text-xs text-[#1c1c17] leading-snug font-medium">
              Keep good things <br />
              <strong className="font-bold">in circulation.</strong>
            </p>
          </div>

          {/* Bottom Dashed Button: + List an item */}
          <button
            onClick={onOpenListGear}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#707977] text-xs font-semibold text-[#1c1c17] hover:border-[#094d48] hover:text-[#094d48] hover:bg-white transition-all flex items-center justify-center gap-1.5 cursor-pointer font-body-md"
          >
            <span className="text-sm font-mono">+</span>
            <span>List an item</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top App Bar */}
        <div className="h-16 border-b border-[#ece8e0] px-6 flex items-center justify-between bg-[#fdf9f1]/70 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3 w-full max-w-md">
            <span className="material-symbols-outlined text-[#707977] text-xl">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the campus shelf..."
              className="w-full bg-transparent text-sm text-[#1c1c17] placeholder:text-[#707977] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#707977] hover:text-[#1c1c17]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-full hover:bg-[#ece8e0] text-[#404947] transition-colors"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#994531]" />
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 pl-2 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#1b4d45] text-white flex items-center justify-center font-bold text-xs">
                L
              </div>
              <span className="text-xs font-semibold text-[#1c1c17] hidden sm:inline">
                Sign in
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          {activeTab === 'discover' && (
            <div className="flex flex-col gap-6">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-label-eyebrow text-xs text-[#094d48] uppercase tracking-wider font-bold">
                    The Campus Shelf
                  </span>
                  <h1 className="font-headline-lg text-3xl sm:text-4xl text-[#1c1c17] mt-1 font-bold">
                    Find what you need.
                  </h1>
                  <p className="font-body-md text-sm text-[#404947] mt-1">
                    Borrow something useful for a few days, from someone who gets it.
                  </p>
                </div>

                <button
                  onClick={onOpenListGear}
                  className="inline-flex items-center justify-center gap-1.5 bg-[#1b4d45] text-white px-5 py-2.5 rounded-xl font-label-btn text-sm hover:bg-[#094d48] shadow-sm transition-all cursor-pointer self-start sm:self-auto font-bold"
                >
                  <span className="font-mono text-base">+</span>
                  <span>List an item</span>
                </button>
              </div>

              {/* Main Search and Filter Input Strip (Matching Image 3) */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch relative">
                <div className="flex-1 bg-white border border-[#bfc8c6] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xs focus-within:border-[#094d48] focus-within:ring-1 focus-within:ring-[#094d48]">
                  <span className="material-symbols-outlined text-[#707977] text-xl">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Try "tripod", "blue notebook", "near library"...'
                    className="w-full bg-transparent text-sm text-[#1c1c17] placeholder:text-[#707977] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-[#707977] hover:text-[#1c1c17] font-mono"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters Button */}
                <button
                  onClick={() => setShowFiltersPopover(!showFiltersPopover)}
                  className={`px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer border ${
                    showFiltersPopover || selectedCategory !== 'All' || selectedBlock !== 'All'
                      ? 'bg-[#1b4d45] text-white border-[#1b4d45]'
                      : 'bg-[#f1ede6] text-[#1c1c17] border-[#bfc8c6] hover:bg-[#ece8e0]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">tune</span>
                  <span>Filters</span>
                  {(selectedCategory !== 'All' || selectedBlock !== 'All') && (
                    <span className="w-2 h-2 rounded-full bg-[#fd947b]" />
                  )}
                </button>
              </div>

              {/* Expandable Filter Drawer */}
              {showFiltersPopover && (
                <div className="bg-white border border-[#ece8e0] rounded-2xl p-5 shadow-lg flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-[#ece8e0]">
                    <span className="font-headline-sm text-sm font-bold text-[#1c1c17]">
                      Filter Campus Shelf
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCategory('All');
                        setSelectedBlock('All');
                        setPriceMax(3000);
                      }}
                      className="text-xs font-mono text-[#094d48] underline"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Category Filter Pills */}
                  <div>
                    <label className="text-xs font-bold text-[#404947] uppercase font-label-eyebrow mb-2 block">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['All', 'Cameras', 'Drones', 'Audio & Mics', 'Projectors', 'Outdoors', 'Makers & Tools'] as (GearCategory | 'All')[]).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-[#094d48] text-white'
                              : 'bg-[#f1ede6] text-[#404947] hover:bg-[#ece8e0]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campus Location Filter */}
                  <div>
                    <label className="text-xs font-bold text-[#404947] uppercase font-label-eyebrow mb-2 block">
                      Campus Block
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {campusBlocks.map((block) => (
                        <button
                          key={block}
                          onClick={() => setSelectedBlock(block)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            selectedBlock === block
                              ? 'bg-[#994531] text-white'
                              : 'bg-[#f1ede6] text-[#404947] hover:bg-[#ece8e0]'
                          }`}
                        >
                          {block}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#404947] uppercase font-label-eyebrow mb-1">
                      <span>Max Price / Day</span>
                      <span className="text-[#094d48] font-mono">₹{priceMax}/day</span>
                    </div>
                    <input
                      type="range"
                      min={300}
                      max={3000}
                      step={100}
                      value={priceMax}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      className="w-full accent-[#094d48]"
                    />
                  </div>
                </div>
              )}

              {/* Status and Sort Bar */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="font-label-stamp text-[#404947] uppercase font-bold tracking-wider">
                  {filteredItems.length} THINGS AVAILABLE
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[#707977] hidden sm:inline">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent font-label-stamp text-xs text-[#1c1c17] uppercase font-bold cursor-pointer border-none focus:outline-none"
                  >
                    <option value="recent">RECENTLY LISTED ▾</option>
                    <option value="price-low">PRICE: LOW TO HIGH ▾</option>
                    <option value="price-high">PRICE: HIGH TO LOW ▾</option>
                    <option value="rating">HIGHEST RATED ▾</option>
                  </select>
                </div>
              </div>

              {/* EMPTY STATE (Matching Image 3) */}
              {filteredItems.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-[#ece8e0] shadow-xs flex flex-col items-center justify-center text-center my-6 min-h-[380px]">
                  <div className="w-16 h-16 rounded-full bg-[#f1ede6] flex items-center justify-center text-[#707977] mb-4">
                    <span className="material-symbols-outlined text-3xl">search</span>
                  </div>

                  <h3 className="font-headline-md text-xl sm:text-2xl text-[#1c1c17] font-bold">
                    Nothing on this stretch of campus
                  </h3>

                  <p className="font-body-md text-sm text-[#404947] max-w-md mt-2 leading-relaxed">
                    Try a broader search, or list the thing someone else is looking for.
                  </p>

                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedBlock('All');
                      setPriceMax(3000);
                    }}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-[#f1ede6] hover:bg-[#ece8e0] text-[#1c1c17] text-sm font-semibold transition-colors cursor-pointer border border-[#bfc8c6]"
                  >
                    Reset search
                  </button>
                </div>
              ) : (
                /* RESULTS GRID */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((gear) => (
                    <div
                      key={gear.id}
                      className="bg-white rounded-3xl p-3 flex flex-col shadow-xs hover:shadow-xl transition-all duration-300 group border border-[#ece8e0]"
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative h-48 rounded-2xl overflow-hidden bg-[#ece8e0]">
                        <img
                          src={gear.imageUrl}
                          alt={gear.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {gear.badge && (
                          <div
                            className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full font-label-stamp text-[10px] uppercase font-bold ${
                              gear.badge === 'Just Listed'
                                ? 'bg-[#994531] text-white'
                                : gear.badge === 'Available Now'
                                ? 'bg-[#b2eee7] text-[#00201e]'
                                : gear.badge === 'Weekend Special'
                                ? 'bg-[#ffdad2] text-[#3d0600]'
                                : 'bg-[#f1ede6] text-[#404947]'
                            }`}
                          >
                            {gear.badge}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleBookmark(gear.id)}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1c1c17] hover:text-[#994531] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {gear.isBookmarked ? 'bookmark_added' : 'bookmark'}
                          </span>
                        </button>
                      </div>

                      {/* Info & Metadata */}
                      <div className="p-3 flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-center justify-between text-[#404947]">
                            <span className="font-label-stamp text-[10px] uppercase font-bold truncate max-w-[170px]">
                              {gear.category} · {gear.location}
                            </span>
                            <span className="font-label-stamp text-[11px] text-[#094d48] font-bold">
                              ★ {gear.rating}
                            </span>
                          </div>

                          <h3 className="font-headline-sm text-base font-bold text-[#1c1c17] mt-1 group-hover:text-[#094d48] transition-colors line-clamp-1">
                            {gear.title}
                          </h3>

                          <p className="font-body-sm text-xs text-[#404947] mt-1 line-clamp-2">
                            {gear.description}
                          </p>
                        </div>

                        {/* Lender info pill */}
                        <div className="flex items-center justify-between mt-3 py-1.5 px-2 rounded-xl bg-[#f7f3eb] text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#094d48] text-white flex items-center justify-center font-bold text-[10px]">
                              {gear.owner.avatarInitials}
                            </div>
                            <span className="font-medium text-[#1c1c17] truncate max-w-[100px]">
                              {gear.owner.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#707977]">
                            Dep: ₹{gear.depositAmount}
                          </span>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#ece8e0]">
                          <div className="font-headline-sm text-base text-[#094d48] font-bold">
                            ₹{gear.pricePerDay.toLocaleString()}
                            <span className="font-body-sm text-xs text-[#404947] font-normal">
                              /day
                            </span>
                          </div>
                          <button
                            onClick={() => onRentItem(gear)}
                            className="px-4 py-1.5 rounded-full bg-[#1b4d45] hover:bg-[#094d48] font-label-btn text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                          >
                            Rent
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY BORROWS TAB */}
          {activeTab === 'borrows' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#ece8e0]">
                <div>
                  <h2 className="font-headline-md text-2xl font-bold text-[#1c1c17]">
                    My Active Borrows
                  </h2>
                  <p className="font-body-md text-sm text-[#404947]">
                    Track your campus rentals, escrow status, and custody proof stamps.
                  </p>
                </div>
                <button
                  onClick={onOpenCustodyModal}
                  className="text-xs font-mono font-bold text-[#094d48] underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span>View Custody Stamp Protocol</span>
                </button>
              </div>

              {userBorrows.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-[#ece8e0]">
                  <p className="text-sm text-[#404947]">You don't have any active borrows right now.</p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#094d48] text-white text-xs font-bold"
                  >
                    Browse the Campus Shelf
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userBorrows.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white rounded-3xl p-5 border border-[#ece8e0] shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 rounded-full font-label-stamp text-[10px] uppercase font-bold bg-[#b2eee7] text-[#00201e]">
                            {b.status === 'deposit_released' ? 'Returned · Deposit Released' : 'Active Custody'}
                          </span>
                          <span className="font-mono text-xs text-[#707977]">{b.custodyStampId}</span>
                        </div>

                        <div className="flex gap-4">
                          <img
                            src={b.item.imageUrl}
                            alt={b.item.title}
                            className="w-20 h-20 rounded-2xl object-cover shrink-0"
                          />
                          <div>
                            <h4 className="font-headline-sm text-base font-bold text-[#1c1c17]">
                              {b.item.title}
                            </h4>
                            <p className="text-xs text-[#404947]">
                              Lender: {b.item.owner.name} ({b.item.owner.department})
                            </p>
                            <p className="text-xs font-mono text-[#094d48] mt-1">
                              Dates: {b.startDate} → {b.endDate} ({b.totalDays} days)
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-[#f7f3eb] rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[#707977] block text-[10px] uppercase font-mono">
                              Total Rental Fee
                            </span>
                            <span className="font-bold text-[#1c1c17]">₹{b.rentalFee}</span>
                          </div>
                          <div>
                            <span className="text-[#707977] block text-[10px] uppercase font-mono">
                              Escrow Deposit
                            </span>
                            <span className="font-bold text-[#094d48]">
                              ₹{b.depositAmount} (Released)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#ece8e0] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#707977]">
                          Timestamp: {b.timestamp}
                        </span>
                        <button
                          onClick={onOpenCustodyModal}
                          className="px-3 py-1.5 rounded-xl bg-[#f1ede6] hover:bg-[#ece8e0] text-xs font-bold text-[#094d48]"
                        >
                          Inspect Photos
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY LENDING TAB */}
          {activeTab === 'lending' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#ece8e0]">
                <div>
                  <h2 className="font-headline-md text-2xl font-bold text-[#1c1c17]">
                    My Lending & Earnings
                  </h2>
                  <p className="font-body-md text-sm text-[#404947]">
                    Gear you have loaned to peers with active escrow protection.
                  </p>
                </div>
                <button
                  onClick={onOpenListGear}
                  className="px-4 py-2 rounded-xl bg-[#094d48] text-white text-xs font-bold"
                >
                  + Add More Gear
                </button>
              </div>

              {/* Earnings overview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-[#ece8e0]">
                  <span className="text-xs font-mono text-[#707977] uppercase font-bold">
                    This Semester
                  </span>
                  <p className="font-headline-sm text-2xl font-bold text-[#094d48] mt-1">₹8,450</p>
                  <p className="text-[11px] text-[#404947] mt-0.5">Across 7 successful handovers</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#ece8e0]">
                  <span className="text-xs font-mono text-[#707977] uppercase font-bold">
                    In Protected Escrow
                  </span>
                  <p className="font-headline-sm text-2xl font-bold text-[#994531] mt-1">₹3,000</p>
                  <p className="text-[11px] text-[#404947] mt-0.5">1 active loan out</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#ece8e0]">
                  <span className="text-xs font-mono text-[#707977] uppercase font-bold">
                    Peer Trust Score
                  </span>
                  <p className="font-headline-sm text-2xl font-bold text-[#1c1c17] mt-1">4.98 / 5.0</p>
                  <p className="text-[11px] text-[#404947] mt-0.5">100% dispute-free record</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-[#ece8e0]">
                <h4 className="font-headline-sm text-sm font-bold text-[#1c1c17] mb-3">
                  Current Loaned Gear
                </h4>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f7f3eb]">
                  <div className="flex items-center gap-3">
                    <img
                      src={items[0].imageUrl}
                      alt="Sony A7 IV"
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-bold text-xs text-[#1c1c17]">Sony A7 IV + 28-70mm</p>
                      <p className="text-[11px] text-[#404947]">Rented by Rishi V. (Mech Dept)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[#094d48] block">₹2,400</span>
                    <span className="text-[10px] text-[#707977]">Due Oct 20</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MY ITEMS TAB */}
          {activeTab === 'items' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#ece8e0]">
                <div>
                  <h2 className="font-headline-md text-2xl font-bold text-[#1c1c17]">
                    My Pinned Gear Inventory
                  </h2>
                  <p className="font-body-md text-sm text-[#404947]">
                    Manage items you have placed in the campus collective loop.
                  </p>
                </div>
                <button
                  onClick={onOpenListGear}
                  className="px-4 py-2 rounded-xl bg-[#094d48] text-white text-xs font-bold"
                >
                  + Pin New Gear
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-[#ece8e0] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-[#1c1c17]">{item.title}</h4>
                        <p className="text-xs text-[#404947]">
                          ₹{item.pricePerDay}/day · {item.location}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#b2eee7] text-[#00201e] font-bold">
                          Live on Shelf
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRentItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#f1ede6] text-xs font-bold text-[#1c1c17] hover:bg-[#ece8e0]"
                    >
                      Preview
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="bg-white rounded-3xl p-6 border border-[#ece8e0] shadow-sm flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#1b4d45] text-white flex items-center justify-center font-bold text-2xl">
                    MK
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-xl font-bold text-[#1c1c17]">
                        Meera K.
                      </h2>
                      <span className="px-2 py-0.5 rounded-full font-label-stamp text-[10px] uppercase font-bold bg-[#b2eee7] text-[#00201e]">
                        Verified Maker
                      </span>
                    </div>
                    <p className="text-xs text-[#404947] mt-0.5">
                      Film & Media Arts · Year 4 · Student ID #VIT-88492
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 bg-[#f7f3eb] rounded-2xl text-center">
                  <div>
                    <span className="font-headline-sm text-lg font-bold text-[#094d48]">4.98</span>
                    <span className="text-[10px] font-mono text-[#707977] block">Trust Rating</span>
                  </div>
                  <div>
                    <span className="font-headline-sm text-lg font-bold text-[#094d48]">14</span>
                    <span className="text-[10px] font-mono text-[#707977] block">Handovers</span>
                  </div>
                  <div>
                    <span className="font-headline-sm text-lg font-bold text-[#094d48]">100%</span>
                    <span className="text-[10px] font-mono text-[#707977] block">On-Time Return</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-headline-sm text-sm font-bold text-[#1c1c17] mb-2">
                    Verified Campus Badges
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-xl bg-[#ffdad2] text-[#762b1a] text-xs font-bold font-mono">
                      🎯 Camera Specialist
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-[#dae2ff] text-[#111b33] text-xs font-bold font-mono">
                      ⚡ 90-sec Handover Fast
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-[#b2eee7] text-[#00201e] text-xs font-bold font-mono">
                      🛡️ Clean Sensor Certified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
