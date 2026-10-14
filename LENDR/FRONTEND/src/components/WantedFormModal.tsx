import React, { useState, useEffect } from 'react';
import {
  categoriesApi,
  wantedApi,
  type ApiCategory,
  type ApiWantedRequest,
  type ApiWantedUrgency,
} from '../services/api';
import { todayIST, addDays } from '../services/adapters';

interface WantedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ApiWantedRequest | null;
}

const VIT_BLOCKS = [
  'PRP Block',
  'Technology Tower (TT)',
  'SMV Studio / Block',
  'SJT Block',
  'MGB Block',
  'GDN Block',
  'CDMM Block',
  'Men\'s Hostels (MH)',
  'Ladies Hostels (LH)',
  'Main Gate / Gazebo',
];

export const WantedFormModal: React.FC<WantedFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
}) => {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationBlock, setLocationBlock] = useState(VIT_BLOCKS[0]);
  const [urgency, setUrgency] = useState<ApiWantedUrgency>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    categoriesApi
      .list()
      .then((res) => {
        if (isMounted) {
          setCategories(res.items);
          if (!categoryId && res.items.length > 0) {
            setCategoryId(res.items[0].id);
          }
        }
      })
      .catch(() => {
        // Handled silently
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setCategoryId(initialData.categoryId || '');
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setLocationBlock(initialData.locationBlock || VIT_BLOCKS[0]);
      setUrgency(initialData.urgency);
    } else {
      const today = todayIST();
      setTitle('');
      setDescription('');
      setStartDate(today);
      setEndDate(addDays(today, 2));
      setLocationBlock(VIT_BLOCKS[0]);
      setUrgency('MEDIUM');
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
      }
    }
    setError(null);
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title for what you need.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a brief description of what you need.');
      return;
    }
    if (!categoryId) {
      setError('Please select an equipment category.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please specify both start and end dates.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialData) {
        await wantedApi.update(initialData.id, {
          title: title.trim(),
          description: description.trim(),
          categoryId,
          startDate,
          endDate,
          locationBlock,
          urgency,
        });
      } else {
        await wantedApi.create({
          title: title.trim(),
          description: description.trim(),
          categoryId,
          startDate,
          endDate,
          locationBlock,
          urgency,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save request. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter">
      <div className="bg-[#114b3f] text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-board relative border border-emerald-900/60 my-8 modal-card-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#14594b]/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#d96543]">★</span>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase">
                CAMPUS WANTED REQUEST
              </div>
              <h2 className="font-display text-xl font-black text-white">
                {initialData ? 'Edit Wanted Request' : 'Post Gear Request'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-[#14594b] hover:bg-[#0c382f] flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-mono text-emerald-200 mb-1">GEAR TITLE / ITEM NEEDED *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DJI Ronin SC Gimbal or Sony FX3"
              className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2.5 text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="block font-mono text-emerald-200 mb-1">DESCRIPTION & DETAILS *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what project or shoot this is for, required mounts/batteries, or acceptable alternatives..."
              className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-emerald-200 mb-1">EQUIPMENT CATEGORY *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-400"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#092620] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-emerald-200 mb-1">URGENCY</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as ApiWantedUrgency)}
                className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="MEDIUM" className="bg-[#092620] text-white">MEDIUM (Standard need)</option>
                <option value="HIGH" className="bg-[#092620] text-white">HIGH (Urgent campus shoot/event)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-emerald-200 mb-1">START DATE *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block font-mono text-emerald-200 mb-1">END DATE *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-emerald-200 mb-1">CAMPUS PICKUP / MEETUP ZONE</label>
            <select
              value={locationBlock}
              onChange={(e) => setLocationBlock(e.target.value)}
              className="w-full bg-[#0d382f] border border-emerald-700/60 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-400"
            >
              {VIT_BLOCKS.map((blk) => (
                <option key={blk} value={blk} className="bg-[#092620] text-white">
                  {blk}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#14594b]/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-transparent hover:bg-[#14594b] text-emerald-300 font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#d96543] hover:bg-[#c85635] text-white font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Request' : 'Publish Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
