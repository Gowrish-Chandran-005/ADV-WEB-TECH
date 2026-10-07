import React from 'react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenListGear: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onOpenListGear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-[#ece8e0] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f1ede6] hover:bg-[#ece8e0] flex items-center justify-center text-[#404947] hover:text-[#1c1c17] transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#094d48]" />
          <span className="font-label-stamp text-xs text-[#094d48] uppercase font-bold tracking-wider">
            Handbook & Protocols
          </span>
        </div>

        <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-[#1c1c17]">
          How GearLoop Works
        </h2>
        <p className="font-body-md text-sm text-[#404947] mt-1">
          Peer gear rental built specifically for students, campus creators, and labs.
        </p>

        {/* 4 Pillars */}
        <div className="space-y-4 mt-6">
          <div className="p-4 rounded-2xl bg-[#f7f3eb] flex gap-3.5 border border-[#e6e2da]">
            <div className="w-9 h-9 rounded-xl bg-[#ffdad2] text-[#994531] flex items-center justify-center font-bold shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1c1c17]">Peer Discovery on Noticeboard</h4>
              <p className="text-xs text-[#404947] mt-0.5 leading-relaxed">
                Find available cameras, drones, audio rigs, and prototyping tools within your campus blocks. Only verified university members can rent or list.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f7f3eb] flex gap-3.5 border border-[#e6e2da]">
            <div className="w-9 h-9 rounded-xl bg-[#b2eee7] text-[#00201e] flex items-center justify-center font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1c1c17]">Automated Escrow Deposit</h4>
              <p className="text-xs text-[#404947] mt-0.5 leading-relaxed">
                No awkward deposit transfers directly to strangers. The deposit stays locked in neutral escrow during the rental period.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f7f3eb] flex gap-3.5 border border-[#e6e2da]">
            <div className="w-9 h-9 rounded-xl bg-[#dae2ff] text-[#111b33] flex items-center justify-center font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1c1c17]">90-Second Photo Inspection Check</h4>
              <p className="text-xs text-[#404947] mt-0.5 leading-relaxed">
                At handover, both peers snap 3 quick macro photos (front optic, rear contacts, outer body). Both tap approve on their phone, locking the baseline condition in stone.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f7f3eb] flex gap-3.5 border border-[#e6e2da]">
            <div className="w-9 h-9 rounded-xl bg-[#e6e2da] text-[#404947] flex items-center justify-center font-bold shrink-0">
              4
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1c1c17]">Instant Return & Deposit Release</h4>
              <p className="text-xs text-[#404947] mt-0.5 leading-relaxed">
                When you hand the gear back, the lender verifies the return condition against the original pickup photos. Once signed off, the full security deposit is unlocked immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenListGear();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#094d48] text-white font-label-btn text-xs font-bold hover:bg-[#2a6560] shadow-sm transition-all"
          >
            I have gear to list
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-2xl bg-[#f1ede6] hover:bg-[#ece8e0] text-[#1c1c17] text-xs font-bold transition-all"
          >
            Got it, take me back
          </button>
        </div>
      </div>
    </div>
  );
};
