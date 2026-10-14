import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 py-14 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-stone-800">
          {/* Brand Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#14594b] flex items-center justify-center text-white font-bold text-base">
                L
              </div>
              <span className="font-display text-xl font-black text-white">
                LENDR<span className="text-[#d96543]">.</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed font-sans">
              The student-led peer gear exchange network. Reducing equipment redundancy and powering creative projects across campus.
            </p>
            <div className="text-[11px] font-mono text-emerald-400">
              ● Server status: Vellore Node Operational
            </div>
          </div>

          {/* Campus Hubs */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200 font-bold mb-3">
              Vellore Hubs
            </h4>
            <ul className="text-xs space-y-2 text-stone-400">
              <li>Technology Tower (TT)</li>
              <li>SJT Tech Block</li>
              <li>SMV Labs &amp; Design Studio</li>
              <li>Men's Hostels (A to R)</li>
              <li>Ladies Hostels (A to H)</li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200 font-bold mb-3">
              Popular Gear
            </h4>
            <ul className="text-xs space-y-2 text-stone-400">
              <li>Mirrorless 4K Cameras</li>
              <li>Drone &amp; Aerial Photography</li>
              <li>Robotics &amp; Arduino Sensors</li>
              <li>Gimbals &amp; Stabilizers</li>
              <li>Lavaliers &amp; Shotgun Mics</li>
            </ul>
          </div>

          {/* Trust & Protocols */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200 font-bold mb-3">
              Trust &amp; Protocols
            </h4>
            <ul className="text-xs space-y-2 text-stone-400">
              <li>Campus ID Verification</li>
              <li>Community SafeGuard Fund</li>
              <li>Noticeboard Guidelines</li>
              <li>Club Partnership Form</li>
              <li>Report An Issue</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-500">
          <div>© 2025 LENDR Peer Collective. Built by student makers at VIT.</div>
          <div className="flex gap-6">
            <span className="hover:text-stone-300 cursor-pointer">Privacy Protocol</span>
            <span className="hover:text-stone-300 cursor-pointer">Campus Terms</span>
            <span className="hover:text-stone-300 cursor-pointer">Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
