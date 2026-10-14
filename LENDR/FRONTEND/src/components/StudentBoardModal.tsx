import React, { useState } from 'react';
import { WantedPost } from '../types/gear';
import { useAuth } from '../context/AuthContext';
import { getUserInitials, getUserDisplayName } from '../services/adapters';

interface StudentBoardModalProps {
  posts: WantedPost[];
  onClose: () => void;
  onAddPost: (post: WantedPost) => void;
}

export const StudentBoardModal: React.FC<StudentBoardModalProps> = ({ posts, onClose, onAddPost }) => {
  const { user } = useAuth();
  const [showNewForm, setShowNewForm] = useState(false);
  const [wantedText, setWantedText] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('TT Block');
  const [category, setCategory] = useState('Gimbals & Stabilizers');
  const [filterCategory, setFilterCategory] = useState('all');


  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wantedText.trim()) return;

    const authorName = user ? getUserDisplayName(user) : 'Aarav K.';
    const authorInitials = user ? getUserInitials(user) : 'AK';

    const newPost: WantedPost = {
      id: `wp-${Date.now()}`,
      author: authorName,
      initials: authorInitials,

      location: '3rd Floor SMV Studio',
      block: selectedBlock,
      text: `“${wantedText.replace(/^[“"']+|[”"']+$/g, '')}”`,
      timeAgo: 'Just now',
      repliesCount: 0,
      category,
      urgency: 'HIGH',
    };

    onAddPost(newPost);
    setWantedText('');
    setShowNewForm(false);
  };

  const filteredPosts = posts.filter((p) => {
    if (filterCategory === 'all') return true;
    return p.category.toLowerCase().includes(filterCategory.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter">
      <div className="bg-[#114b3f] text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-board relative border border-emerald-900/60 my-8 modal-card-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#14594b]/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#d96543]">★</span>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase">
                LENDR / NOTICEBOARD 01 • CAMPUS BOARD
              </div>
              <h2 className="font-display text-xl font-black text-white">Student Gear Wanted Board</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#14594b] hover:bg-[#0c382f] flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter bar & CTA */}
        <div className="flex items-center justify-between gap-4 py-4 border-b border-[#14594b]/60 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            {['all', 'Gimbals', 'Makers', 'Audio', 'Projectors'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-mono transition-colors cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-emerald-300 text-stone-900 font-bold'
                    : 'bg-[#14594b]/60 text-emerald-100 hover:bg-[#14594b]'
                }`}
              >
                {cat === 'all' ? 'All Requests' : cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="px-3.5 py-1.5 rounded-full bg-[#d96543] hover:bg-[#c85635] text-white font-bold text-xs transition-all shadow cursor-pointer"
          >
            {showNewForm ? 'Close Form' : '+ Post Wanted Note'}
          </button>
        </div>

        {/* Post Form */}
        {showNewForm && (
          <form onSubmit={handlePostSubmit} className="my-4 bg-[#fbf9f5] text-stone-900 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#d96543] font-bold">
              <span>NEW CAMPUS WANTED NOTE</span>
              <span className="text-stone-500">Auto-expires in 48h</span>
            </div>
            <textarea
              value={wantedText}
              onChange={(e) => setWantedText(e.target.value)}
              required
              rows={2}
              placeholder="e.g. Does anyone have a DJI RS3 gimbal or camera tripod for Friday Riviera shoot?"
              className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xs focus:outline-none focus:border-[#114b3f]"
            ></textarea>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 font-bold mb-1">
                  Location / Hostel Block
                </label>
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-xs"
                >
                  <option>TT Block</option>
                  <option>SJT Academic Tower</option>
                  <option>Foodys Lawn</option>
                  <option>Ladies Hostel (Block L)</option>
                  <option>Men's Hostel (Block D/P)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 font-bold mb-1">
                  Gear Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-xs"
                >
                  <option>Gimbals &amp; Stabilizers</option>
                  <option>Makers &amp; Dev</option>
                  <option>Audio &amp; Mics</option>
                  <option>Projectors &amp; Displays</option>
                  <option>Cameras &amp; DSLRs</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#114b3f] hover:bg-[#0c382f] text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Pin to Vellore Noticeboard
            </button>
          </form>
        )}

        {/* Wanted Notes List */}
        <div className="space-y-3.5 my-4 max-h-96 overflow-y-auto pr-1">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-[#fdf5e7] text-neutral-900 rounded-2xl p-4.5 shadow-lg border border-amber-200/80 relative"
            >
              <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-[#d96543] text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                    WANTED
                  </span>
                  <span className="text-stone-600 font-semibold">{post.block}</span>
                </div>
                <span className="text-stone-500">{post.timeAgo}</span>
              </div>
              <p className="text-xs sm:text-sm font-medium italic text-stone-800 my-1">{post.text}</p>
              <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-stone-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#14594b] text-white text-[9px] flex items-center justify-center font-bold">
                    {post.initials}
                  </span>
                  <span>
                    — {post.author}, {post.location}
                  </span>
                </div>
                <button
                  onClick={() => alert(`Offer reply sent to ${post.author} on campus chat!`)}
                  className="font-bold text-[#114b3f] hover:text-[#d96543] underline font-mono text-xs cursor-pointer"
                >
                  Reply &amp; Offer Gear ({post.repliesCount} offers) →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#14594b]/60 flex items-center justify-between text-[11px] font-mono text-emerald-200/80">
          <span>VIT VELLORE • REAL-TIME FEED</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            80% MATCH RATE WITHIN 45m
          </span>
        </div>
      </div>
    </div>
  );
};
