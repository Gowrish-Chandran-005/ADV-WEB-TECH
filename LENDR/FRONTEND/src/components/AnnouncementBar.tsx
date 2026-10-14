import React from 'react';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="bg-[#08241e] text-emerald-200 text-xs py-2 px-4 border-b border-emerald-950/80">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-center md:text-left font-mono">
        <div className="flex items-center gap-2 mx-auto md:mx-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            THE CAMPUS SHELF, OPEN • VIT COLLECTIVE CO-OP
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-emerald-300/80">
          <span>Handover Hubs: SJT Gate 2 • TT Library Lawn • MH Block D/L • LH Gazebo</span>
        </div>
      </div>
    </div>
  );
};

