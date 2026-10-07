import React, { useState } from 'react';
import { GearCategory, GearItem } from '../types';

interface ListGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (newItem: GearItem) => void;
}

export const ListGearModal: React.FC<ListGearModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GearCategory>('Cameras');
  const [location, setLocation] = useState('Technology Block');
  const [pricePerDay, setPricePerDay] = useState(800);
  const [depositAmount, setDepositAmount] = useState(2000);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'
  );

  if (!isOpen) return null;

  const sampleImages = [
    { label: 'Camera / Lens', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80' },
    { label: 'Audio / Mic', url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80' },
    { label: 'Drone / Aerial', url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80' },
    { label: 'Projector', url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80' },
    { label: 'Camping / Outdoor', url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80' },
    { label: 'Maker Tools', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: GearItem = {
      id: `item-${Date.now()}`,
      title: title.trim(),
      category,
      location,
      pricePerDay,
      depositAmount,
      description: description.trim() || 'Verified student equipment in pristine condition.',
      rating: 5.0,
      reviewsCount: 1,
      badge: 'Just Listed',
      imageUrl,
      owner: {
        name: 'Meera K.',
        avatarInitials: 'MK',
        rating: 4.98,
        department: 'Film & Media Arts',
        handoverLocation: `${location} Lobby or Cafe`,
      },
      isBookmarked: false,
    };

    onAddItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-[#ece8e0] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f1ede6] hover:bg-[#ece8e0] flex items-center justify-center text-[#404947] hover:text-[#1c1c17] transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#994531]" />
          <span className="font-label-stamp text-xs text-[#994531] uppercase font-bold tracking-wider">
            Lender Onboarding
          </span>
        </div>

        <h2 className="font-headline-lg text-2xl font-bold text-[#1c1c17]">
          List your gear on the loop
        </h2>
        <p className="font-body-sm text-xs text-[#404947] mt-1">
          Turn your idle creator kit into safe income with automated escrow and condition stamps.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
              Gear Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sony FX30 Cinema Kit, Rode Wireless Go II..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-sm text-[#1c1c17] border border-[#bfc8c6] focus:outline-none focus:border-[#094d48]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GearCategory)}
                className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-xs font-semibold text-[#1c1c17] border border-[#bfc8c6] focus:outline-none"
              >
                <option value="Cameras">Cameras</option>
                <option value="Drones">Drones</option>
                <option value="Audio & Mics">Audio & Mics</option>
                <option value="Projectors">Projectors</option>
                <option value="Outdoors">Outdoors</option>
                <option value="Makers & Tools">Makers & Tools</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
                Campus Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-xs font-semibold text-[#1c1c17] border border-[#bfc8c6] focus:outline-none"
              >
                <option value="Technology Block">Technology Block</option>
                <option value="Architecture Block">Architecture Block</option>
                <option value="Auditorium Pod">Auditorium Pod</option>
                <option value="Sports Complex">Sports Complex</option>
                <option value="T-Hub Block">T-Hub Block</option>
                <option value="Media Lab">Media Lab</option>
                <option value="Mechanical Workshop">Mechanical Workshop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
                Rate / Day (₹)
              </label>
              <input
                type="number"
                min={100}
                max={10000}
                step={50}
                value={pricePerDay}
                onChange={(e) => setPricePerDay(Number(e.target.value))}
                className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-sm font-mono font-bold text-[#094d48] border border-[#bfc8c6] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
                Security Escrow (₹)
              </label>
              <input
                type="number"
                min={500}
                max={20000}
                step={100}
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-sm font-mono font-bold text-[#994531] border border-[#bfc8c6] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
              Included Items & Condition
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Includes carrying case, 2 batteries, charger, and strap. Pristine lens glass."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-xs text-[#1c1c17] border border-[#bfc8c6] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1.5">
              Select Cover Image
            </label>
            <div className="grid grid-cols-3 gap-2">
              {sampleImages.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setImageUrl(s.url)}
                  className={`p-1 rounded-xl border text-left transition-all ${
                    imageUrl === s.url
                      ? 'border-[#094d48] ring-2 ring-[#094d48]/30 bg-[#f7f3eb]'
                      : 'border-[#bfc8c6] hover:border-[#707977]'
                  }`}
                >
                  <img src={s.url} alt={s.label} className="w-full h-14 rounded-lg object-cover" />
                  <span className="text-[10px] font-semibold text-[#1c1c17] block truncate mt-1">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl bg-[#094d48] text-white font-label-btn text-sm font-bold hover:bg-[#2a6560] shadow-[0_4px_0_0_#0e4f4b] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#0e4f4b] active:translate-y-1 active:shadow-none transition-all cursor-pointer mt-2"
          >
            Pin Item to Campus Shelf
          </button>
        </form>
      </div>
    </div>
  );
};
