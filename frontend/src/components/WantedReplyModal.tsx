import React, { useState } from 'react';
import { WantedPost } from '../types';

interface WantedReplyModalProps {
  post: WantedPost | null;
  onClose: () => void;
  onSubmitReply: (postId: string, replyText: string) => void;
}

export const WantedReplyModal: React.FC<WantedReplyModalProps> = ({
  post,
  onClose,
  onSubmitReply,
}) => {
  const [replyText, setReplyText] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSubmitReply(post.id, replyText);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-[#ece8e0]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f1ede6] hover:bg-[#ece8e0] flex items-center justify-center text-[#404947] hover:text-[#1c1c17] transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fd947b]" />
          <span className="font-label-stamp text-xs text-[#994531] uppercase font-bold tracking-wider">
            Campus Bulletin Reply
          </span>
        </div>

        <h2 className="font-headline-lg text-xl sm:text-2xl font-bold text-[#1c1c17]">
          Reply to Peer Request
        </h2>

        {/* The pinned sticky note */}
        <div className="p-4 rounded-2xl bg-[#f7f3eb] border border-[#e6e2da] mt-4 relative">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] font-mono font-bold uppercase bg-[#fd947b] text-[#762b1a] px-2 py-0.5 rounded">
              WANTED
            </span>
            <span className="text-xs font-mono text-[#707977]">{post.timeAgo}</span>
          </div>
          <p className="font-headline-sm text-base text-[#1c1c17] font-semibold italic mt-1">
            "{post.text}"
          </p>
          <span className="font-label-eyebrow text-xs text-[#404947] block mt-2">
            — {post.author} · {post.location}
          </span>
        </div>

        {sentSuccess ? (
          <div className="mt-6 p-4 rounded-2xl bg-[#b2eee7]/50 text-center text-[#00201e] font-bold text-sm">
            ✓ Reply sent to {post.author}! Notification pinned.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="text-xs font-bold text-[#404947] uppercase font-label-eyebrow block">
              Your message or offer
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Hey Aarav! I have a DJI RS3 gimbal with briefcase handle you can borrow for Saturday. Can meet at T-Hub food street tomorrow."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full bg-[#f1ede6] p-3 rounded-xl text-xs text-[#1c1c17] border border-[#bfc8c6] focus:outline-none focus:border-[#094d48]"
            />

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-2xl bg-[#094d48] text-white font-label-btn text-xs font-bold hover:bg-[#2a6560] shadow-[0_4px_0_0_#0e4f4b] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#0e4f4b] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              Send Reply & Connect
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
