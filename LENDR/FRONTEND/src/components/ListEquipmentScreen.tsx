import React, { useState, useEffect, useRef } from 'react';
import type { GearItem, GearCategory } from '../types/gear';
import {
  equipmentApi,
  categoriesApi,
  uploadApi,
  ApiCategory,
  ApiEquipmentListing,
} from '../services/api';
import { adaptEquipmentToGearItem } from '../services/adapters';
import { useAuth } from '../context/AuthContext';

interface ListEquipmentScreenProps {
  onBack: () => void;
  onListingCreated: (item: GearItem) => void;
  onOpenAuth: () => void;
}

interface PhotoItem {
  id: string;
  file?: File;
  previewUrl: string;
  uploadedUrl?: string;
  isCover: boolean;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  errorMessage?: string;
}

const CAMPUS_LOCATION_PRESETS = [
  'SJT Ground / Reception',
  'Technology Tower (TT) Foodys',
  'Main Building (MB) Portico',
  'Men\'s Hostels (Blocks A-Q)',
  'Ladies\' Hostels (LH Blocks)',
  'GDN Block Library Entrance',
];

const CONDITION_DESCRIPTIONS: Record<string, { label: string; desc: string; color: string }> = {
  NEW: {
    label: 'Brand New',
    desc: 'Flawless condition, original box, zero blemishes or marks.',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  LIKE_NEW: {
    label: 'Like New',
    desc: 'Pristine condition, used once or twice, completely scratch-free.',
    color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  GOOD: {
    label: 'Good (Standard)',
    desc: 'Minor cosmetic signs of normal campus usage, 100% functionally perfect.',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  FAIR: {
    label: 'Fair',
    desc: 'Visible wear/scratches, fully operational, optics/mechanics intact.',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  POOR: {
    label: 'Poor',
    desc: 'Heavy cosmetic wear or quirks; still functional for basic projects.',
    color: 'bg-stone-100 text-stone-800 border-stone-300',
  },
};

const CATEGORY_PRICING_GUIDANCE: Record<string, { range: string; deposit: string }> = {
  cameras: { range: '₹350 - ₹750/day', deposit: '₹0 for verified students or ₹500 token' },
  audio: { range: '₹120 - ₹250/day', deposit: '₹0 for verified students or ₹200 token' },
  electronics: { range: '₹400 - ₹900/day', deposit: '₹500 - ₹1,000 security token' },
  'event-equipment': { range: '₹250 - ₹500/day', deposit: '₹0 for verified students' },
  'project-kits': { range: '₹60 - ₹180/day', deposit: '₹0 (Zero deposit recommended)' },
  lighting: { range: '₹150 - ₹300/day', deposit: '₹0 for verified students' },
  sports: { range: '₹100 - ₹250/day', deposit: '₹0 for verified students' },
  academic: { range: '₹80 - ₹200/day', deposit: '₹0 for verified students' },
  drones: { range: '₹600 - ₹1,200/day', deposit: '₹500 - ₹1,000 security token' },
  projectors: { range: '₹250 - ₹500/day', deposit: '₹0 for verified students' },
  makers: { range: '₹50 - ₹150/day', deposit: '₹0 (Zero deposit recommended)' },
  outdoors: { range: '₹100 - ₹250/day', deposit: '₹0 for verified students' },
};

interface CategoryOption {
  slug: string;
  label: string;
  desc: string;
  icon: (active: boolean) => React.ReactNode;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    slug: 'cameras',
    label: 'Cameras & Lenses',
    desc: 'Cinema bodies, primes, zooms, gimbals',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <circle cx="12" cy="13" r="3" strokeWidth="1.75" />
      </svg>
    ),
  },
  {
    slug: 'audio',
    label: 'Audio & Mics',
    desc: 'Wireless lavs, shotguns, podcasts',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    slug: 'electronics',
    label: 'Drones & Electronics',
    desc: 'FPV drones, action cams, telemetry',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    slug: 'event-equipment',
    label: 'Displays & Projectors',
    desc: '4K monitors, projectors, screens',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4" />
      </svg>
    ),
  },
  {
    slug: 'project-kits',
    label: 'Makers & Kits',
    desc: 'RPi, Jetson, Arduino, scopes',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.75" />
        <rect x="9" y="9" width="6" height="6" strokeWidth="1.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 1v3m6-3v3m-6 16v3m6-3v3M1 9h3m-3 6h3m16-6h3m-3 6h3" />
      </svg>
    ),
  },
  {
    slug: 'lighting',
    label: 'Studio Lighting',
    desc: 'COB lights, softboxes, RGB wands',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    slug: 'sports',
    label: 'Sports & Outdoors',
    desc: 'GoPro mounts, bikes, turf gear',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="9" strokeWidth="1.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9m0-18a15.3 15.3 0 00-4 9 15.3 15.3 0 004 9" />
      </svg>
    ),
  },
  {
    slug: 'academic',
    label: 'Academic & Lab Gear',
    desc: 'Scientific calcs, sensors, probes',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-emerald-300' : 'text-[#0d382f]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
];

export const ListEquipmentScreen: React.FC<ListEquipmentScreenProps> = ({
  onBack,
  onListingCreated,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories from backend
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('cameras');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Form Fields
  const [title, setTitle] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [dailyRentalPrice, setDailyRentalPrice] = useState<number>(350);
  const [isZeroDeposit, setIsZeroDeposit] = useState<boolean>(true);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [pickupLocation, setPickupLocation] = useState<string>('SJT Ground / Reception');
  const [customLocation, setCustomLocation] = useState<string>('');
  const [maxRentalDays, setMaxRentalDays] = useState<number>(14);

  // Inclusions & Tags
  const [inclusions, setInclusions] = useState<string[]>([
    'Main device body',
    'OEM Battery',
    'Charging cable',
  ]);
  const [inclusionInput, setInclusionInput] = useState('');

  // Photos State
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    categoriesApi
      .list()
      .then((res) => {
        if (isMounted) {
          setCategories(res.items);
          setIsLoadingCategories(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingCategories(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Photo selection from disk
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const validFiles: File[] = [];
    const maxFilesAllowed = 10 - photos.length;

    if (files.length > maxFilesAllowed) {
      setPhotoError(`You can only upload up to 10 photos total. Only the first ${maxFilesAllowed} were taken.`);
    }

    const filesToProcess = Array.from(files).slice(0, maxFilesAllowed);

    for (const file of filesToProcess) {
      // Validate MIME type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setPhotoError(`"${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP.`);
        continue;
      }
      // Validate Size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError(`"${file.name}" exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newPhotos: PhotoItem[] = validFiles.map((file, idx) => ({
      id: `photo-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isCover: photos.length === 0 && idx === 0,
      status: 'pending',
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  // Add image by URL
  const handleAddUrlImage = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setPhotoError('Image URL must start with http:// or https://');
      return;
    }
    if (photos.length >= 10) {
      setPhotoError('A maximum of 10 photos is supported per listing.');
      return;
    }
    setPhotoError(null);
    const newPhoto: PhotoItem[] = [
      {
        id: `url-${Date.now()}`,
        previewUrl: trimmed,
        uploadedUrl: trimmed,
        isCover: photos.length === 0,
        status: 'ready',
      },
    ];
    setPhotos((prev) => [...prev, ...newPhoto]);
    setUrlInput('');
  };

  // Set cover photo
  const handleSetCover = (id: string) => {
    setPhotos((prev) => {
      const targetIndex = prev.findIndex((p) => p.id === id);
      if (targetIndex === -1) return prev;
      const target = prev[targetIndex];
      const others = prev.filter((p) => p.id !== id);
      return [{ ...target, isCover: true }, ...others.map((p) => ({ ...p, isCover: false }))];
    });
  };

  // Remove photo
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (filtered.length > 0 && !filtered.some((p) => p.isCover)) {
        filtered[0].isCover = true;
      }
      return filtered;
    });
  };

  // Add inclusion
  const handleAddInclusion = () => {
    const val = inclusionInput.trim();
    if (val && !inclusions.includes(val)) {
      setInclusions((prev) => [...prev, val]);
      setInclusionInput('');
    }
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusions((prev) => prev.filter((_, i) => i !== index));
  };

  // Form submission & photo upload
  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!title.trim()) {
      setSubmitError('Please provide an equipment title.');
      return;
    }
    if (!description.trim()) {
      setSubmitError('Please provide a brief description of the equipment.');
      return;
    }
    if (dailyRentalPrice <= 0) {
      setSubmitError('Daily rental price must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Upload pending files
      const finalImageUrls: string[] = [];
      const updatedPhotos = [...photos];

      for (let i = 0; i < updatedPhotos.length; i++) {
        const item = updatedPhotos[i];
        if (item.uploadedUrl) {
          finalImageUrls.push(item.uploadedUrl);
        } else if (item.file) {
          try {
            item.status = 'uploading';
            const uploadRes = await uploadApi.uploadFile(item.file);
            item.uploadedUrl = uploadRes.url;
            item.status = 'ready';
            finalImageUrls.push(uploadRes.url);
          } catch (err) {
            item.status = 'error';
            throw new Error(`Failed to upload ${item.file.name}: ${(err as Error).message}`);
          }
        }
      }

      // Step 2: Determine backend categoryId
      let categoryId = categories.find((c) => c.slug === selectedCategorySlug)?.id;
      if (!categoryId && categories.length > 0) {
        categoryId = categories[0].id;
      }
      if (!categoryId) {
        // Fallback fetch if categories weren't loaded yet
        const fresh = await categoriesApi.list();
        categoryId =
          fresh.items.find((c) => c.slug === selectedCategorySlug)?.id || fresh.items[0]?.id;
      }

      if (!categoryId) {
        throw new Error('Unable to resolve equipment category. Please refresh and try again.');
      }

      // Step 3: Location resolution
      const finalLocation = customLocation.trim() || pickupLocation;

      // Step 4: Call equipmentApi.create
      const result = await equipmentApi.create({
        categoryId,
        title: title.trim(),
        description: description.trim(),
        tags: [selectedCategorySlug, condition.toLowerCase()],
        features: inclusions,
        useCases: ['academic', 'projects'],
        specifications: brandModel.trim() ? { model: brandModel.trim() } : {},
        imageUrls: finalImageUrls,
        dailyRentalPrice,
        securityDeposit: isZeroDeposit ? null : securityDeposit,
        maxRentalDays,
        pickupLocation: finalLocation,
        condition,
        status: 'ACTIVE',
      });

      const gearItem = adaptEquipmentToGearItem(result.equipment);
      onListingCreated(gearItem);
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to publish equipment listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePricing = CATEGORY_PRICING_GUIDANCE[selectedCategorySlug] || {
    range: '₹150 - ₹450/day',
    deposit: '₹0 for verified students',
  };

  return (
    <div className="space-y-8 pb-20 screen-transition-enter">
      {/* Sub-Navigation & Studio Badge Bar */}
      <section className="border-b border-[#e9decb] pb-4 bg-[#fbf9f5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs sm:text-sm text-[#6c7772] font-medium">
            <button
              onClick={onBack}
              className="hover:text-[#0d382f] transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            >
              <span>← Back to Catalog</span>
            </button>
            <span className="text-[#cfc4b0]">/</span>
            <span className="text-[#0d382f] font-bold">Lender Studio</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-[#092620] text-emerald-200 border border-emerald-800 px-3.5 py-1 rounded-full text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono tracking-wider">VIT CAMPUS LENDER STUDIO</span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Studio Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#092620] via-[#0d382f] to-[#124b3f] text-white p-6 sm:p-8 md:p-10 border border-emerald-950/80 shadow-board mb-8">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/70 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                CAMPUS PEER HARDWARE POOL
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                List Equipment for Campus Rent
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl font-normal">
                Put your cameras, audio gear, sensors, dev kits, and tools into circulation. Earn passive student income with zero-deposit trust and verified campus handovers.
              </p>
            </div>

            {/* Quick trust metrics badge */}
            <div className="shrink-0 flex flex-col gap-2.5 bg-black/25 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[240px]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Peer Guarantee
              </div>
              <div className="text-xs text-white/90 space-y-1.5 font-medium">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                  <span className="text-emerald-200/80">Platform Fee</span>
                  <span className="font-mono font-bold text-emerald-300">0% Free</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                  <span className="text-emerald-200/80">Protection</span>
                  <span className="font-bold text-white">Condition Logged</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-emerald-200/80">Eligibility</span>
                  <span className="font-bold text-emerald-300">VIT Students Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Notice if not signed in */}
        {!user && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-amber-900">Sign in with your VIT student email</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                You must be logged in with a valid @vitstudent.ac.in account to publish listings.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-[#0d382f] text-white text-xs font-bold hover:bg-[#134e43] transition cursor-pointer shrink-0 shadow-sm"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmitListing} className="space-y-10">
          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium">
              <span className="font-bold">Error:</span> {submitError}
            </div>
          )}

          {/* Section 1: Category & Details */}
          <section className="bg-white rounded-3xl border border-[#ded0bf] p-6 sm:p-8 shadow-sm space-y-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 border-b border-[#ebdccd] pb-4">
              <span className="w-7 h-7 rounded-xl bg-[#0d382f] text-emerald-300 text-xs font-mono font-bold flex items-center justify-center">
                1
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0d382f]">Equipment Category & Identity</h2>
                <p className="text-xs text-[#6c7772]">Choose the campus catalog category and naming</p>
              </div>
            </div>

            {/* Category Grid */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase">
                  Category *
                </label>
                <span className="text-[11px] font-mono text-[#6c7772]">
                  {CATEGORY_OPTIONS.find((c) => c.slug === selectedCategorySlug)?.label || selectedCategorySlug} selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = selectedCategorySlug === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setSelectedCategorySlug(cat.slug)}
                      className={`p-3.5 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 group ${
                        isSelected
                          ? 'border-[#0d382f] bg-[#092620] text-white ring-2 ring-[#0d382f]/20 shadow-md'
                          : 'border-[#ebdccd] bg-[#fbf9f5] hover:bg-white hover:border-[#0d382f]/60 text-[#1c2421]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-emerald-950/80 text-emerald-300'
                              : 'bg-stone-100 text-[#0d382f] group-hover:bg-emerald-50'
                          }`}
                        >
                          {cat.icon(isSelected)}
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </div>
                      <div>
                        <span className="block text-xs font-bold leading-tight">{cat.label}</span>
                        <span
                          className={`block text-[10px] mt-0.5 leading-tight ${
                            isSelected ? 'text-emerald-200/80' : 'text-[#6c7772]'
                          }`}
                        >
                          {cat.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-1">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony FX3 Cinema Camera or Arduino Nano BLE Kit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#cfc4b0] text-xs sm:text-sm bg-[#fbf9f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-1">
                  Brand / Model Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sony ILME-FX3 or ESP32-WROOM-32"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#cfc4b0] text-xs sm:text-sm bg-[#fbf9f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-1">
                Description & Usage Details *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe optical condition, battery health, project recommendations (e.g. ideal for Riviera short film or RoboVITics hackathon)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#cfc4b0] text-xs sm:text-sm bg-[#fbf9f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
              />
            </div>
          </section>

          {/* Section 2: Photo Studio & Evidence */}
          <section className="bg-white rounded-3xl border border-[#ded0bf] p-6 sm:p-8 shadow-sm space-y-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between border-b border-[#ebdccd] pb-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-[#0d382f] text-emerald-300 text-xs font-mono font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-bold text-[#0d382f]">Equipment Photo Studio</h2>
                  <p className="text-xs text-[#6c7772]">
                    Upload clear photos (cover + side angles / condition proof). Max 10 photos, 5MB each.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#0d382f] bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                {photos.length} / 10 Photos
              </span>
            </div>

            {photoError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {photoError}
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#cfc4b0] hover:border-[#0d382f] bg-[#fbf9f5] hover:bg-emerald-50/20 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-[#0d382f]/10 text-[#0d382f] group-hover:bg-[#0d382f] group-hover:text-white transition-all flex items-center justify-center mx-auto mb-3 shadow-xs">
                <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#0d382f]">Choose photos or drag &amp; drop</h3>
              <p className="text-xs text-[#6c7772] mt-1">
                JPEG, PNG, or WebP up to 5MB each. First photo will be your Cover.
              </p>
            </div>

            {/* Or add by Image URL */}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Or paste an image web URL (https://...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrlImage();
                  }
                }}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#cfc4b0] text-xs bg-[#fbf9f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30 transition"
              />
              <button
                type="button"
                onClick={handleAddUrlImage}
                className="px-4 py-2.5 rounded-xl bg-[#0d382f] hover:bg-[#134e43] text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Add URL
              </button>
            </div>

            {/* Photo Previews Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {photos.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl overflow-hidden border-2 bg-stone-100 group transition-all aspect-square ${
                      item.isCover
                        ? 'border-[#0d382f] ring-2 ring-[#0d382f]/30 shadow-md'
                        : 'border-[#ebdccd]'
                    }`}
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Cover badge */}
                    {item.isCover ? (
                      <span className="absolute top-2 left-2 bg-[#092620] text-emerald-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs border border-emerald-600/40">
                        PRIMARY COVER
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(item.id)}
                        className="absolute top-2 left-2 bg-white/90 hover:bg-[#0d382f] text-stone-700 hover:text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                      >
                        Set as Cover
                      </button>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(item.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer shadow-xs p-1"
                      title="Remove photo"
                      aria-label="Remove photo"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="block text-[9px] font-mono text-white bg-black/50 backdrop-blur-xs rounded px-1.5 py-0.5 truncate">
                        {item.file ? item.file.name : `Web Image #${idx + 1}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Condition Guidelines */}
          <section className="bg-white rounded-3xl border border-[#ded0bf] p-6 sm:p-8 shadow-sm space-y-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 border-b border-[#ebdccd] pb-4">
              <span className="w-7 h-7 rounded-xl bg-[#0d382f] text-emerald-300 text-xs font-mono font-bold flex items-center justify-center">
                3
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0d382f]">Condition &amp; Transparency</h2>
                <p className="text-xs text-[#6c7772]">
                  Transparent condition reporting ensures high lender rating and avoids return disputes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'] as const).map((lvl) => {
                const info = CONDITION_DESCRIPTIONS[lvl];
                const isSelected = condition === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setCondition(lvl)}
                    className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0d382f] bg-emerald-50/50 ring-2 ring-[#0d382f]/20 shadow-xs'
                        : 'border-[#ebdccd] bg-white hover:border-[#0d382f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#0d382f]">{info.label}</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${info.color}`}
                      >
                        {lvl}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#55635e]">{info.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 4: Pricing & Security Deposit */}
          <section className="bg-white rounded-3xl border border-[#ded0bf] p-6 sm:p-8 shadow-sm space-y-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 border-b border-[#ebdccd] pb-4">
              <span className="w-7 h-7 rounded-xl bg-[#0d382f] text-emerald-300 text-xs font-mono font-bold flex items-center justify-center">
                4
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0d382f]">Rental Pricing &amp; Deposit</h2>
                <p className="text-xs text-[#6c7772]">
                  Set student-friendly daily rates and deposit rules
                </p>
              </div>
            </div>

            {/* Smart Pricing Guidance */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-[#f0f7f4] to-emerald-50/50 border border-emerald-800/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#0d382f] text-emerald-300 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </span>
                <span className="font-mono text-[#0d382f] font-bold">
                  Campus Benchmark for {CATEGORY_OPTIONS.find((c) => c.slug === selectedCategorySlug)?.label || selectedCategorySlug}:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#d96543] font-mono text-sm">{activePricing.range}</span>
                <span className="text-[#55635e] text-[11px]">({activePricing.deposit})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Daily Rate */}
              <div>
                <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-1">
                  Daily Rental Rate (₹/day) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#6c7772]">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={99999}
                    value={dailyRentalPrice}
                    onChange={(e) => setDailyRentalPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#cfc4b0] text-sm font-bold text-[#0d382f] bg-[#fbf9f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
                  />
                </div>
              </div>

              {/* Security Deposit Selection */}
              <div>
                <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-1">
                  Security Deposit Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsZeroDeposit(true);
                      setSecurityDeposit(0);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isZeroDeposit
                        ? 'border-[#0d382f] bg-[#0d382f] text-white shadow-xs'
                        : 'border-[#cfc4b0] bg-[#fbf9f5] hover:bg-white text-[#1c2421]'
                    }`}
                  >
                    Zero Deposit (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsZeroDeposit(false)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      !isZeroDeposit
                        ? 'border-[#0d382f] bg-[#0d382f] text-white shadow-xs'
                        : 'border-[#cfc4b0] bg-[#fbf9f5] hover:bg-white text-[#1c2421]'
                    }`}
                  >
                    Token Deposit
                  </button>
                </div>

                {!isZeroDeposit && (
                  <div className="mt-3 relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#6c7772]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={securityDeposit}
                      onChange={(e) =>
                        setSecurityDeposit(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      placeholder="Token amount (e.g. 500)"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-[#cfc4b0] text-xs font-bold text-[#0d382f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 5: Campus Handover Logistics */}
          <section className="bg-white rounded-3xl border border-[#ded0bf] p-6 sm:p-8 shadow-sm space-y-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 border-b border-[#ebdccd] pb-4">
              <span className="w-7 h-7 rounded-xl bg-[#0d382f] text-emerald-300 text-xs font-mono font-bold flex items-center justify-center">
                5
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0d382f]">Campus Handover Location &amp; Inclusions</h2>
                <p className="text-xs text-[#6c7772]">
                  Specify verified handover points and accessories provided
                </p>
              </div>
            </div>

            {/* Handover Location Presets */}
            <div>
              <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-2">
                Handover Landmark Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {CAMPUS_LOCATION_PRESETS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setPickupLocation(loc);
                      setCustomLocation('');
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      pickupLocation === loc && !customLocation
                        ? 'border-[#0d382f] bg-[#0d382f] text-white shadow-xs'
                        : 'border-[#ebdccd] bg-[#fbf9f5] hover:border-[#0d382f] text-[#1c2421]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Or enter specific room / block (e.g. SJT 4th floor labs, D-Block 312)"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#cfc4b0] text-xs bg-[#fbf9f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
                />
              </div>
            </div>

            {/* Accessories / Inclusions Checklist */}
            <div>
              <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-2">
                Inclusions / Accessories Provided
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {inclusions.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-[#0d382f] border border-stone-300 text-xs font-medium"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInclusion(idx)}
                      className="text-stone-400 hover:text-rose-600 cursor-pointer p-0.5"
                      aria-label="Remove inclusion"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add accessory (e.g. 64GB V90 SD Card, HDMI Cable, Tripod plate)"
                  value={inclusionInput}
                  onChange={(e) => setInclusionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInclusion();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#cfc4b0] text-xs bg-[#fbf9f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
                />
                <button
                  type="button"
                  onClick={handleAddInclusion}
                  className="px-4 py-2 rounded-xl bg-[#0d382f] hover:bg-[#134e43] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Max Rental Duration */}
            <div className="max-w-xs">
              <label className="block text-xs font-mono font-bold text-[#0d382f] uppercase mb-1">
                Max Consecutive Rental Days
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={maxRentalDays}
                onChange={(e) => setMaxRentalDays(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 14)))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#cfc4b0] text-xs font-bold text-[#0d382f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0d382f]/30"
              />
            </div>
          </section>

          {/* Action Bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#ebdccd]">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 rounded-full border border-[#cfc4b0] bg-white text-stone-700 text-xs sm:text-sm font-bold hover:bg-stone-100 transition cursor-pointer w-full sm:w-auto shadow-xs"
            >
              Cancel &amp; Return
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-full bg-[#d96543] hover:bg-[#c85635] text-white text-sm font-bold transition-all shadow-md hover:shadow-xl disabled:opacity-50 cursor-pointer w-full sm:w-auto btn-magnetic flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  <span>Publishing Listing...</span>
                </>
              ) : (
                <span>Publish Equipment Listing</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
