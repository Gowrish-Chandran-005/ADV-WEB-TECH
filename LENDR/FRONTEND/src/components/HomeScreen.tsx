import React, { useState, useEffect } from 'react';
import { GearItem, GearCategory } from '../types/gear';
import { CATEGORIES_CONFIG } from '../data/gearData';

const renderCategoryIcon = (catId: string) => {
  switch (catId) {
    case 'cameras':
      return (
        <svg className="w-10 h-10 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'drones':
      return (
        <svg className="w-10 h-10 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.88 9.88L6 6m12 0l-3.88 3.88M9.88 14.12L6 18m12 0l-3.88-3.88M4 6a2 2 0 104 0 2 2 0 00-4 0zm12 0a2 2 0 104 0 2 2 0 00-4 0zm-12 12a2 2 0 104 0 2 2 0 00-4 0zm12 0a2 2 0 104 0 2 2 0 00-4 0z" />
        </svg>
      );
    case 'audio':
      return (
        <svg className="w-10 h-10 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    case 'projectors':
      return (
        <svg className="w-10 h-10 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="6" width="20" height="11" rx="2" strokeWidth="1.8" />
          <circle cx="16" cy="11.5" r="2.5" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 10h3M6 13h2M6 17v2M18 17v2" />
        </svg>
      );
    case 'outdoors':
      return (
        <svg className="w-10 h-10 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 20l9-15 9 15H3zm9-15v15m0 0l4-6" />
        </svg>
      );
    case 'makers':
    default:
      return (
        <svg className="w-10 h-10 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      );
  }
};

interface HomeScreenProps {
  featuredItems: GearItem[];
  onSelectItem: (item: GearItem) => void;
  onNavigateCatalog: (category?: GearCategory, query?: string) => void;
  onOpenListGear: () => void;
  onOpenStudentBoard: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  featuredItems,
  onSelectItem,
  onNavigateCatalog,
  onOpenListGear,
  onOpenStudentBoard,
}) => {
  const [activeHostelTab, setActiveHostelTab] = useState<'all' | 'mens' | 'ladies' | 'tech'>('all');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Live countdown timer state (hours, minutes, seconds)
  const [countdown, setCountdown] = useState({ h: 3, m: 24, s: 49 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { ...prev, h: prev.h - 1, m: 59, s: 59 };
        return { h: 3, m: 30, s: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Professional IntersectionObserver for scroll-triggered fadeIn and popIn
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll, .reveal-pop');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [featuredItems]);

  const filteredFeatured = featuredItems.filter((item) => {
    if (activeHostelTab === 'all') return true;
    if (activeHostelTab === 'mens') return item.locationCategory === 'mens_hostel';
    if (activeHostelTab === 'ladies') return item.locationCategory === 'ladies_hostel';
    if (activeHostelTab === 'tech') return item.locationCategory === 'sjt' || item.locationCategory === 'tt';
    return true;
  });

  // Find featured camera kit for hero banner
  const sonyA7 = featuredItems.find((item) => item.category === 'cameras') || featuredItems[0];


  return (
    <div className="space-y-16 lg:space-y-24">
      {/* ── 1. DRIBBLE HERO SECTION: Multi-Banner Bento Grid ── */}
      <section className="relative pt-4 pb-8 overflow-hidden reveal-on-scroll is-revealed">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Bento Grid: 8 Cols Left (Main + 2 Stacked Sub-Banners) & 4 Cols Right (Tall Banner) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Columns */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* Primary Large Banner (Top) */}
              <div className="relative bg-gradient-to-r from-[#e8efe9] via-[#f2f7f4] to-[#fbf9f5] rounded-3xl p-8 sm:p-12 border border-[#d2e3dc] overflow-hidden flex flex-col sm:flex-row items-center justify-between min-h-[300px] shadow-sm hover:shadow-xl transition-all duration-500 group">
                <div className="sm:max-w-xs z-10 space-y-3 text-left">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#114b3f]/10 text-[#114b3f] text-xs font-mono font-bold uppercase tracking-wider shimmer-hover">
                    ✦ Campus Gear Fest • 50% Off
                  </span>
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 leading-[1.1]">
                    Best Creator <br />
                    <span className="text-[#114b3f] relative inline-block">
                      Collection
                      <span className="absolute -bottom-1 left-0 w-full h-1 bg-[#114b3f]/20 rounded-full"></span>
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Borrow pro cameras, 4K drones, gimbals &amp; mics directly from campus peers with zero deposit awkwardness.
                  </p>
                  <button
                    onClick={() => onNavigateCatalog()}
                    className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#114b3f] hover:bg-[#0c382f] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-2xl btn-magnetic cursor-pointer"
                  >
                    <span>Shop Now</span>
                    <span className="text-emerald-300 group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                  </button>
                </div>

                {/* Arched Hero Graphic Frame with Gentle Floating Animation */}
                <div className="relative mt-6 sm:mt-0 flex-shrink-0 flex items-center justify-center animate-float">
                  <div className="w-56 h-64 sm:w-64 sm:h-72 rounded-t-full bg-gradient-to-b from-[#bde3d8] to-[#9cd4c4] border-4 border-white shadow-2xl flex items-center justify-center relative overflow-hidden group">
                    <img
                      src={sonyA7?.image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'}
                      alt="Featured Gear"
                      className="w-48 h-48 object-contain drop-shadow-2xl group-hover:scale-115 transition-transform duration-700"
                    />
                    <div className="absolute bottom-3 bg-white/95 backdrop-blur-md px-3.5 py-1 rounded-full text-[10px] font-mono font-bold text-[#0d382f] shadow-md border border-emerald-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      {sonyA7?.title || 'Camera Kit'} • ₹{sonyA7?.pricePerDay || 450}/day
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub Banners (2 Columns side-by-side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Sub Banner 1: Filmmaking Gear */}
                <div
                  onClick={() => onNavigateCatalog('cameras')}
                  className="bg-[#fef4ee] hover:bg-white rounded-3xl p-6 border border-[#fed7c7] flex items-center justify-between shadow-xs hover:shadow-xl transition-all duration-400 cursor-pointer group hover:-translate-y-1.5"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-[#d96543] uppercase tracking-wider bg-orange-100 px-2 py-0.5 rounded-full">
                      Trending Now
                    </span>
                    <h3 className="font-display font-black text-lg text-neutral-900 group-hover:text-[#d96543] transition-colors leading-tight">
                      Cinema Cameras <br />&amp; Gimbals
                    </h3>
                    <p className="text-[11px] text-stone-500 font-mono">From ₹250/day</p>
                    <span className="inline-flex items-center text-xs font-bold text-[#d96543] group-hover:translate-x-1.5 transition-transform">
                      Rent Now →
                    </span>
                  </div>
                  <div className="w-24 h-24 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-400">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBljI2vIkpByTDwkBWUsqglH8QhU0Qi1z2xy1XaX2Wi3OxYoEJ7In95btO7SMct_OqSP7rKqRN3l7UraJKHBYYUz4mvQ13fbpPH7x4lmDXH5NeLSEN_iGu8GRe4NB0nDzqHO7CMxRfXRvN8gjp66vcDj5yu-IOCAzzvLx37I4Lzf2PryLGX8i2szVsJdvAzMZl7o9vM0rHDpWaMDaT2ALPjUz73-XuqOPUNkZlxcLdrAB-G1mnedf4BGg"
                      alt="Gimbal"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Sub Banner 2: Audio & Makers */}
                <div
                  onClick={() => onNavigateCatalog('audio')}
                  className="bg-[#edf5f2] hover:bg-white rounded-3xl p-6 border border-[#cbe4db] flex items-center justify-between shadow-xs hover:shadow-xl transition-all duration-400 cursor-pointer group hover:-translate-y-1.5"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-[#114b3f] uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full">
                      Studio Ready
                    </span>
                    <h3 className="font-display font-black text-lg text-neutral-900 group-hover:text-[#114b3f] transition-colors leading-tight">
                      Wireless Mics <br />&amp; Podcasts
                    </h3>
                    <p className="text-[11px] text-stone-500 font-mono">From ₹180/day</p>
                    <span className="inline-flex items-center text-xs font-bold text-[#114b3f] group-hover:translate-x-1.5 transition-transform">
                      Rent Now →
                    </span>
                  </div>
                  <div className="w-24 h-24 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 group-hover:scale-110 group-hover:-rotate-2 transition-transform duration-400">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCKkASELoLx7eAY-3rtgec7y1OTOoYmxxXi55YKwSS3v8mkZt6qG9XkQfPU0aTSUb1hv6c8sXmwdxXXoqvCOEmucjBdt0jokoi4qUiP4nBR-tiQhZ5sRREjSudV6OYz-pCrbZnIzDNNqlqIX8G1JvqSX2jBdfV1EqgacnB2yoltaueDlP5tj4QUctDrUK2ETlAEqROxZCPgVEtwdM9wOr5LSmrPul276MQmgMfUA4swPjfpvGxG-c5jA"
                      alt="Audio Mic"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Tall Feature Banner */}
            <div className="lg:col-span-4 bg-[#f8f5ee] rounded-3xl p-8 border border-[#e5decb] flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-400 relative overflow-hidden group">
              <div className="z-10 space-y-3 text-left">
                <span className="inline-block px-3 py-1 rounded-full bg-[#d96543] text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                  HOT STUDENT SEASON
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-neutral-900 leading-tight">
                  Festival Ready <br />
                  <span className="text-[#d96543]">Drone Rigging</span>
                </h2>
                <p className="text-xs text-neutral-600">
                  Full 4K HDR vertical video ready. 3 intelligent batteries included for aerial coverage.
                </p>
                <button
                  onClick={() => onNavigateCatalog('drones')}
                  className="px-5 py-2.5 rounded-full bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c382f] shadow-md hover:shadow-lg btn-magnetic transition-all cursor-pointer"
                >
                  Rent Drone Kit →
                </button>
              </div>

              {/* Large Product Showcase with Gentle Float */}
              <div className="relative mt-8 flex items-center justify-center animate-float-delayed">
                <div className="w-52 h-52 rounded-full bg-[#f1ebe0] flex items-center justify-center p-4 shadow-inner group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwkBn74vCwMwfoQOurN5IMPThdXtYGYk3cjxyLb307i5NoD39HEMz677zrvVbcXgGy9OR6SLLTl0G8qZLapKr1tROeLbbl2_iLfruECKFg5l5z7VBggax9w1fA_EaSQsPiL4o_ZQzyCM5NfyrFtC4x7pUZP7rcLZUdPLAw-D-rMXPialefHgktuORKcg3aufpPRo9aVg1fJVUt3S8QkbRgg7OFhYmR9tH5agHZj9lK0XV5QfWx5bpbeA"
                    alt="DJI Drone"
                    className="w-full h-full object-contain drop-shadow-xl"
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#e2d6bf] flex items-center justify-between text-xs font-mono text-stone-600">
                <span className="font-medium">DJI Mini 3 Pro</span>
                <span className="font-black text-[#114b3f] text-sm">₹750/day</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. CIRCULAR CATEGORY SHOWCASE ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll" id="categories">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
            CAMPUS DEPARTMENTS
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-neutral-900 mt-1">
            Shop Deals by Category
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Browse all verified tech and creative equipment available across campus
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {CATEGORIES_CONFIG.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => onNavigateCatalog(cat.id as GearCategory)}
              className={`category-bubble group flex flex-col items-center text-center p-3 cursor-pointer reveal-pop stagger-${idx + 1}`}
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-2 border-[#e7e2d7] group-hover:border-[#114b3f] shadow-sm flex items-center justify-center p-4">
                <span className="bubble-icon flex items-center justify-center">
                  {renderCategoryIcon(cat.id)}
                </span>
              </div>
              <span className="mt-3 font-bold text-sm text-neutral-900 group-hover:text-[#114b3f] transition-colors">
                {cat.label}
              </span>
              <span className="text-[11px] font-mono text-stone-500 mt-0.5">
                {cat.count} listings
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 3. WEEKLY BEST DEALS: FULL-WIDTH STITCH DEEP FOREST GREEN SECTION ── */}
      <section className="bg-[#092620] text-white py-16 sm:py-20 shadow-2xl relative overflow-hidden reveal-on-scroll" id="browse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row: Title & Countdown Timer */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-emerald-900/80 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Weekly Best Deals
                </h2>
                <span className="px-3 py-1 rounded-full bg-[#d96543] text-white text-xs font-mono font-bold uppercase animate-pulse shadow-xs">
                  Flash Rates
                </span>
              </div>
              <p className="text-emerald-300/80 text-xs sm:text-sm mt-1">
                Verified equipment with immediate campus pickup across VIT Hostels
              </p>
            </div>

            {/* Countdown Timer with Live Clock State */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-emerald-300 uppercase font-semibold">Limited time only!</span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                <span className="w-8 h-8 rounded-lg bg-[#d96543] text-white flex items-center justify-center shadow-md">
                  {String(countdown.h).padStart(2, '0')}
                </span>
                <span className="text-emerald-400 font-bold">:</span>
                <span className="w-8 h-8 rounded-lg bg-[#d96543] text-white flex items-center justify-center shadow-md">
                  {String(countdown.m).padStart(2, '0')}
                </span>
                <span className="text-emerald-400 font-bold">:</span>
                <span className="w-8 h-8 rounded-lg bg-[#d96543] text-white flex items-center justify-center shadow-md">
                  {String(countdown.s).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Tabs Bar (Matching Dribbble: Up to 50% off, Under 100, Almost Sold Out...) */}
          <div className="flex items-center gap-2 overflow-x-auto py-6 scrollbar-none">
            {[
              { id: 'all', label: 'All Hostels' },
              { id: 'mens', label: "Men's Hostels" },
              { id: 'ladies', label: 'Ladies Hostels' },
              { id: 'tech', label: 'SJT & Tech Park' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveHostelTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeHostelTab === tab.id
                    ? 'bg-[#d96543] text-white shadow-lg scale-105'
                    : 'bg-[#0d382f] hover:bg-[#134e43] text-emerald-200 border border-emerald-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 5 Product Cards Grid (Matching Dribbble Row of 5) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {filteredFeatured.slice(0, 5).map((item, idx) => (
              <article
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`product-card-modern bg-white text-neutral-900 rounded-2xl overflow-hidden flex flex-col justify-between group cursor-pointer shadow-lg hover:shadow-2xl reveal-pop stagger-${(idx % 5) + 1}`}
              >
                <div>
                  {/* Image container with sale tag */}
                  <div className="h-40 sm:h-44 bg-stone-50 relative p-3 flex items-center justify-center image-zoom-container">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <span className="absolute top-2.5 left-2.5 bg-[#d96543] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-xs uppercase">
                      Deal
                    </span>
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      {item.images && item.images.length > 1 && (
                        <span className="bg-[#092620]/80 text-emerald-200 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {item.images.length}P
                        </span>
                      )}
                      <span className="bg-emerald-100 text-[#0d382f] text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-xs">
                        {item.depositType === 'zero' ? '₹0 Dep' : 'Token'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5">
                    <span className="text-[10px] font-mono text-[#d96543] font-bold uppercase tracking-wider block truncate">
                      {item.categoryLabel}
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm text-neutral-900 mt-1 line-clamp-1 group-hover:text-[#0d382f] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-mono mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                      <span className="truncate">{item.location}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-800">
                      <span className="font-mono text-[10px] font-bold bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">
                        RATING {item.owner.rating}
                      </span>
                      <span className="text-stone-400 font-mono text-[10px]">({item.owner.handoversCount} handovers)</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Price & Add to Cart button */}
                <div className="p-3.5 pt-2 border-t border-stone-100 flex items-center justify-between bg-stone-50/60">
                  <div>
                    <span className="text-base sm:text-lg font-black text-[#0d382f]">₹{item.pricePerDay}</span>
                    <span className="text-[10px] text-stone-500 font-mono">/day</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0d382f] hover:bg-[#134e43] text-white text-[11px] font-bold transition-all shadow-xs btn-magnetic cursor-pointer"
                  >
                    Rent
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* 3 Horizontal Banner Cards under Best Deals (Matching Dribbble layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
            <div
              onClick={() => onNavigateCatalog('makers')}
              className="bg-[#0d382f] hover:bg-[#134e43] rounded-2xl p-6 border border-emerald-700/60 flex items-center justify-between cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 group"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">Hackathon Kits</span>
                <h3 className="font-display font-black text-lg text-white mt-1">Raspberry Pi &amp; IoT</h3>
                <p className="text-xs text-emerald-200 mt-0.5">From ₹90 / day</p>
                <span className="mt-3 inline-block text-xs font-bold text-white underline group-hover:text-emerald-300">
                  Browse Hardware →
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div
              onClick={() => onNavigateCatalog('cameras')}
              className="bg-[#0a2c25] hover:bg-[#0f3f35] rounded-2xl p-6 border border-emerald-700/60 flex items-center justify-between cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 group"
            >
              <div>
                <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">4K Cinema Rigs</span>
                <h3 className="font-display font-black text-lg text-white mt-1">Blackmagic &amp; Sony</h3>
                <p className="text-xs text-emerald-200 mt-0.5">With SSD + cage</p>
                <span className="mt-3 inline-block text-xs font-bold text-white underline group-hover:text-amber-300">
                  Reserve Cinema →
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div
              onClick={() => onNavigateCatalog('projectors')}
              className="bg-[#103e34] hover:bg-[#175447] rounded-2xl p-6 border border-emerald-700/60 flex items-center justify-between cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 group"
            >
              <div>
                <span className="text-[10px] font-mono text-orange-300 font-bold uppercase">Hostel Events</span>
                <h3 className="font-display font-black text-lg text-white mt-1">LED Projectors</h3>
                <p className="text-xs text-emerald-200 mt-0.5">Harman Kardon sound</p>
                <span className="mt-3 inline-block text-xs font-bold text-white underline group-hover:text-orange-300">
                  Book Projector →
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="6" width="20" height="11" rx="2" strokeWidth="1.8" />
                  <circle cx="16" cy="11.5" r="2.5" strokeWidth="1.8" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 10h3M6 13h2M6 17v2M18 17v2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. POPULAR PRODUCTS: CLEAN RETAIL SHOWCASE ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 border-b border-stone-200 pb-4">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#114b3f]">
              TOP RATED ON CAMPUS
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-neutral-900 mt-1">
              Popular Equipment
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-stone-600">
            <button
              onClick={() => onNavigateCatalog()}
              className="text-[#114b3f] border-b-2 border-[#114b3f] pb-1 cursor-pointer font-bold"
            >
              All Gear
            </button>
            <button
              onClick={() => onNavigateCatalog('cameras')}
              className="hover:text-[#114b3f] pb-1 cursor-pointer"
            >
              Cameras
            </button>
            <button
              onClick={() => onNavigateCatalog('audio')}
              className="hover:text-[#114b3f] pb-1 cursor-pointer"
            >
              Audio
            </button>
            <button
              onClick={() => onNavigateCatalog('makers')}
              className="hover:text-[#114b3f] pb-1 cursor-pointer"
            >
              Makers
            </button>
          </div>
        </div>

        {/* 10 Items Retail Grid with Staggered Pop-In & Depth Lift */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {featuredItems.slice(0, 10).map((item, idx) => (
            <article
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={`product-card-modern bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col justify-between group cursor-pointer shadow-xs hover:shadow-2xl reveal-pop stagger-${(idx % 5) + 1}`}
            >
              <div>
                <div className="h-40 bg-stone-50 relative p-3 flex items-center justify-center image-zoom-container">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {item.images && item.images.length > 1 && (
                      <span className="bg-[#092620]/80 text-emerald-200 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs">
                        {item.images.length}P
                      </span>
                    )}
                    <span className="bg-white/95 backdrop-blur-sm text-stone-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-xs border border-stone-200/80">
                      RATING {item.owner.rating}
                    </span>
                  </div>
                </div>
                <div className="p-3.5">
                  <span className="text-[10px] font-mono text-[#d96543] font-bold uppercase tracking-wider block truncate">
                    {item.categoryLabel}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-neutral-900 mt-1 line-clamp-1 group-hover:text-[#114b3f] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                    <span className="truncate">{item.location}</span>
                  </p>
                </div>
              </div>
              <div className="p-3.5 pt-2 border-t border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div>
                  <span className="text-base font-black text-[#114b3f]">₹{item.pricePerDay}</span>
                  <span className="text-[10px] text-stone-500 font-mono">/day</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem(item);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#114b3f] hover:bg-[#0c382f] text-white text-[11px] font-bold transition-all btn-magnetic cursor-pointer shadow-xs"
                >
                  View
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => onNavigateCatalog()}
            className="px-8 py-3.5 rounded-full border-2 border-[#114b3f] hover:bg-[#114b3f] text-[#114b3f] hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 btn-magnetic cursor-pointer shadow-xs hover:shadow-lg"
          >
            Load More Products ({featuredItems.length} Total)
          </button>
        </div>
      </section>

      {/* ── 5. FULL-WIDTH HORIZONTAL PROMO BANNER (Amazfit Style in Dribbble) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="bg-gradient-to-r from-[#9cd4c4] via-[#bde3d8] to-[#d4ece4] rounded-3xl p-8 sm:p-12 border border-[#8ec7b6] flex flex-col md:flex-row items-center justify-between gap-8 shadow-md hover:shadow-xl transition-all duration-400 relative overflow-hidden group">
          <div className="flex items-center gap-6 z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#114b3f] text-emerald-200 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300">
              <svg className="w-9 h-9 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-[#114b3f] text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                COMMUNITY SAFEGUARD
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-black text-[#114b3f]">
                Campus Gear Protection Pool
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 max-w-lg">
                Every rental on LENDR is backed up to ₹15,000 for accidental damage. Zero cash deposits needed between verified classmates.
              </p>
            </div>
          </div>
          <div className="z-10 flex-shrink-0">
            <button
              onClick={() => onNavigateCatalog()}
              className="px-6 py-3.5 rounded-full bg-[#114b3f] hover:bg-[#0c382f] text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-2xl btn-magnetic transition-all cursor-pointer"
            >
              Learn More &amp; Browse →
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. CAMPUS APP AVAILABLE PROMO (Matching Dribbble NexCart Banner) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="bg-[#114b3f] text-white rounded-3xl p-8 sm:p-12 border border-emerald-800/80 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
          <div className="max-w-xl z-10 space-y-4">
            <span className="px-3 py-1 rounded-full bg-[#d96543] text-white text-xs font-mono font-bold uppercase shadow-xs">
              STUDENT BOARD
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white leading-tight">
              LENDR Student Board <br />Is Live Right Now
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Need gear that isn't listed? Post a Wanted Note or browse requests from classmates filming club events and hackathon projects.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={onOpenStudentBoard}
                className="px-6 py-3.5 rounded-full bg-[#d96543] hover:bg-[#c85635] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-xl btn-magnetic transition-all cursor-pointer"
              >
                Open Live Board →
              </button>
              <button
                onClick={onOpenListGear}
                className="px-6 py-3.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-white font-bold text-xs sm:text-sm btn-magnetic transition-all cursor-pointer"
              >
                + List Your Gear
              </button>
            </div>
          </div>

          <div className="z-10 flex items-center justify-center animate-float">
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 text-center space-y-2 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-white/20 text-emerald-200 flex items-center justify-center mx-auto shadow-inner group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="font-bold text-base text-white">Instant UPI Payouts</div>
              <p className="text-xs text-emerald-200">100% direct release upon return</p>
              <div className="pt-2 font-mono text-xs text-amber-300 font-bold">● 450+ Active Campus Users</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. MOST POPULAR HUBS (Matching Dribbble Most Popular Seller) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 reveal-on-scroll">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
            CAMPUS HUBS
          </span>
          <h2 className="font-display text-2xl font-black text-neutral-900 mt-1">
            Top Handover Zones
          </h2>
          <p className="text-xs text-stone-500">
            Convenient meeting spots verified across Vellore Institute of Technology
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              name: 'SJT Foodys',
              code: 'SJT-01',
              count: '142 swaps',
              renderIcon: () => (
                <svg className="w-5 h-5 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            },
            {
              name: 'TT Library Lawn',
              code: 'TT-02',
              count: '98 swaps',
              renderIcon: () => (
                <svg className="w-5 h-5 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ),
            },
            {
              name: 'MH Block D/L',
              code: 'MH-03',
              count: '124 swaps',
              renderIcon: () => (
                <svg className="w-5 h-5 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
            },
            {
              name: 'LH Gazebo Block E',
              code: 'LH-04',
              count: '87 swaps',
              renderIcon: () => (
                <svg className="w-5 h-5 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              ),
            },
            {
              name: 'SMV Design Lab',
              code: 'SMV-05',
              count: '64 swaps',
              renderIcon: () => (
                <svg className="w-5 h-5 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4 4 4 0 014-4c.7 0 1.35.18 1.92.5L18 4.41a2 2 0 112.83 2.83L11.75 16.33c.32.57.5 1.22.5 1.92a4 4 0 01-4 4h-.25z" />
                </svg>
              ),
            },
            {
              name: 'MB Main Gate',
              code: 'MB-06',
              count: '45 swaps',
              renderIcon: () => (
                <svg className="w-5 h-5 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              ),
            },
          ].map((hub, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border border-stone-200/90 text-center flex flex-col items-center justify-center shadow-xs hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                {hub.renderIcon()}
              </div>
              <div className="font-bold text-xs text-neutral-900 group-hover:text-[#114b3f] transition-colors">{hub.name}</div>
              <div className="text-[10px] font-mono text-[#d96543] font-bold mt-0.5">{hub.code}</div>
              <div className="text-[10px] font-mono text-stone-400 mt-0.5">{hub.count}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
