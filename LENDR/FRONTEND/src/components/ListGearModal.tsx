import React, { useState } from 'react';
import { GearItem, GearCategory } from '../types/gear';
import { useAuth } from '../context/AuthContext';
import { getUserInitials, getUserDisplayName } from '../services/adapters';

interface ListGearModalProps {
  onClose: () => void;
  onAddGearItem: (item: GearItem) => Promise<void>;
}

export const ListGearModal: React.FC<ListGearModalProps> = ({ onClose, onAddGearItem }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calculator' | 'form'>('calculator');

  // Calculator state
  const [calcCategory, setCalcCategory] = useState<'camera' | 'drone' | 'audio' | 'projector' | 'makers'>('camera');
  const [calcDays, setCalcDays] = useState(8);

  const categoryRates: { [key: string]: number } = {
    camera: 450,
    drone: 750,
    audio: 180,
    projector: 320,
    makers: 90,
  };

  const estimatedMonthly = categoryRates[calcCategory] * calcDays;

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GearCategory>('cameras');
  const [pricePerDay, setPricePerDay] = useState(350);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [location, setLocation] = useState('SJT Ground');
  const [description, setDescription] = useState('');
  const [inclusions, setInclusions] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const newItem: GearItem = {
      id: `#${Math.floor(2000 + Math.random() * 7000)}`,
      title,
      subtitle: description,
      category,
      categoryLabel:
        category === 'cameras'
          ? 'Mirrorless Camera'
          : category === 'audio'
          ? 'Audio Recording'
          : category === 'drones'
          ? 'Aerial Drone'
          : category === 'projectors'
          ? 'Displays & Audio'
          : category === 'makers'
          ? 'Makers & Hardware'
          : 'Video Kit',
      pricePerDay,
      location,
      locationCategory: location.includes('SJT')
        ? 'sjt'
        : location.includes('TT')
        ? 'tt'
        : location.includes('Ladies')
        ? 'ladies_hostel'
        : 'mens_hostel',
      depositType: securityDeposit > 0 ? 'token' : 'zero',
      depositAmount: securityDeposit,
      tags: [],
      availabilityBadge: 'Available Today',
      isAvailableToday: true,
      isWeekendFriendly: true,
      image:
        category === 'cameras'
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuClbV_8AIuJyHB6JHw7SaQm2trBBiXrpi_etEVTSejLnVZ5enz71nMv_K8pvwHdQZqJl5ME1eDqacy1b_Wa81bjdxnyRTlkvTkGBhFDgEbwJvaT8DhgbfHXIB9VaWOfs8tndAS7bX-LaCAXm6l8HPypBuaNfmUYm7vnnShKl95m58B0dcmg6UQ_i02ENsRhWl6upz9EFps0VGGWkK-qGPrvRIJ16j2nf7ysor1Cx9lCjf6xwWX-I6vQ0A'
          : category === 'audio'
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCKkASELoLx7eAY-3rtgec7y1OTOoYmxxXi55YKwSS3v8mkZt6qG9XkQfPU0aTSUb1hv6c8sXmwdxXXoqvCOEmucjBdt0jokoi4qUiP4nBR-tiQhZ5sRREjSudV6OYz-pCrbZnIzDNNqlqIX8G1JvqSX2jBdfV1EqgacnB2yoltaueDlP5tj4QUctDrUK2ETlAEqROxZCPgVEtwdM9wOr5LSmrPul276MQmgMfUA4swPjfpvGxG-c5jA'
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBljI2vIkpByTDwkBWUsqglH8QhU0Qi1z2xy1XaX2Wi3OxYoEJ7In95btO7SMct_OqSP7rKqRN3l7UraJKHBYYUz4mvQ13fbpPH7x4lmDXH5NeLSEN_iGu8GRe4NB0nDzqHO7CMxRfXRvN8gjp66vcDj5yu-IOCAzzvLx37I4Lzf2PryLGX8i2szVsJdvAzMZl7o9vM0rHDpWaMDaT2ALPjUz73-XuqOPUNkZlxcLdrAB-G1mnedf4BGg',
      specs: [
        { label: 'Condition', value: 'Not provided', desc: '' },
        { label: 'Deposit', value: `₹${securityDeposit}`, desc: 'Security deposit' },
      ],
      inclusions: inclusions.split(',').map((value) => value.trim()).filter(Boolean),
      owner: {
        name: user ? getUserDisplayName(user) : 'Aarav K.',
        initials: user ? getUserInitials(user) : 'AK',
        department: "B.Tech '26",
        block: location || 'Campus',
        rating: 5.0,
        handoversCount: 0,
        avgReplyTime: '< 10m',
        isVerified: true,
        badge: 'Verified Student Lender',
      },
      useCases: [],
    };

    try {
      await onAddGearItem(newItem);
      setIsSuccess(true);
      setTimeout(onClose, 1200);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The listing could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter">
      <div className="bg-[#fbf9f5] border-2 border-[#114b3f] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 modal-card-enter">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tab switch */}
        <div className="flex gap-2 p-1 bg-stone-200/80 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Earnings Calculator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            + List Your Gear
          </button>
        </div>

        {activeTab === 'calculator' ? (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-[#d96543]">
                Dorm Room Cash Potential
              </span>
              <h3 className="font-display text-2xl font-black text-[#114b3f]">
                Turn Idle Gear into ₹3,000+ / mo
              </h3>
              <p className="text-xs text-[#697a73]">
                Lent safely to verified VIT students with digital condition logs &amp; mutual damage coverage.
              </p>
            </div>

            {/* Category Select */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#114b3f]">Select Equipment Type:</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'camera', label: 'Camera', rate: '₹450/d' },
                  { id: 'drone', label: 'Drone', rate: '₹750/d' },
                  { id: 'audio', label: 'Audio', rate: '₹180/d' },
                  { id: 'projector', label: 'Projector', rate: '₹320/d' },
                  { id: 'makers', label: 'Dev Kit', rate: '₹90/d' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCalcCategory(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      calcCategory === item.id
                        ? 'border-[#114b3f] bg-[#e8f3ef] font-bold text-[#114b3f]'
                        : 'border-stone-200 bg-white hover:border-[#114b3f]'
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-[10px] text-[#697a73] font-mono mt-0.5">{item.rate}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Days Slider */}
            <div className="space-y-2 bg-white p-4 rounded-2xl border border-stone-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#114b3f]">Days lent out per month:</span>
                <span className="font-mono font-bold text-[#d96543] text-sm">{calcDays} Days</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={calcDays}
                onChange={(e) => setCalcDays(Number(e.target.value))}
                className="w-full h-2 bg-[#f2eee6] rounded-lg cursor-pointer accent-[#114b3f]"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>1 weekend (2d)</span>
                <span>4 weekends (8d)</span>
                <span>20 days</span>
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="bg-[#114b3f] text-white rounded-2xl p-5 text-center space-y-1 shadow-board">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-200">
                Estimated Monthly Pocket Cash
              </span>
              <div className="font-display text-3xl sm:text-4xl font-black text-white">
                ₹{estimatedMonthly.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-100/80">
                Covers hostel food, canteen snacks, or new camera accessories!
              </p>
            </div>

            <button
              onClick={() => setActiveTab('form')}
              className="w-full py-3.5 bg-[#d96543] hover:bg-[#c85635] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer"
            >
              Start Listing Your Gear Now →
            </button>
          </div>
        ) : isSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-[#114b3f] rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-black text-[#114b3f]">Gear Listed Successfully!</h3>
            <p className="text-xs text-[#697a73]">
              Your listing has been saved to the Vellore campus catalog.
            </p>
          </div>
        ) : (
          <form onSubmit={handleListingSubmit} className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#114b3f]">List Your Gear on Campus</h3>
              <p className="text-xs text-[#697a73]">Available to LENDR student accounts at VIT Vellore.</p>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                Equipment Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Canon EOS R6 Mark II / Rode VideoMic Pro"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-[#1c2421] focus:outline-none focus:border-[#114b3f]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs cursor-pointer"
                >
                  <option value="cameras">Cameras &amp; DSLRs</option>
                  <option value="audio">Audio &amp; Mics</option>
                  <option value="drones">Drones &amp; Aerial</option>
                  <option value="projectors">Projectors</option>
                  <option value="makers">Makers &amp; Dev</option>
                  <option value="lighting">Lighting &amp; Gimbals</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                  Daily Rate (₹/day)
                </label>
                <input
                  type="number"
                  required
                  min="30"
                  max="2000"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(Number(e.target.value))}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#114b3f]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                  Security Deposit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#114b3f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                Handover Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs cursor-pointer"
              >
                <option value="SJT Ground">SJT Ground / Nescafe</option>
                <option value="TT Block">TT Block Library Lawn</option>
                <option value="Foodys">Foodys Courtyard</option>
                <option value="Block D Mens">Block D (MH)</option>
                <option value="Block L Ladies">Block L (LH)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                Kit Inclusions (comma-separated)
              </label>
              <input
                type="text"
                value={inclusions}
                onChange={(e) => setInclusions(e.target.value)}
                placeholder="List included accessories, if any"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-[#1c2421]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">Short Notes</label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the equipment and its condition."
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-[#1c2421]"
              ></textarea>
            </div>

            {submitError && (
              <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#114b3f] hover:bg-[#0c382f] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              {isSubmitting ? 'Saving Listing...' : 'Publish Listing to Campus Shelf →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
