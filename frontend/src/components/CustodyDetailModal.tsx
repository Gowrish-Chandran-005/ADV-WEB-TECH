import React, { useState } from 'react';

interface CustodyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustodyDetailModal: React.FC<CustodyDetailModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [zoomLender, setZoomLender] = useState(false);
  const [zoomRenter, setZoomRenter] = useState(false);
  const [checklist, setChecklist] = useState({
    outerBody: true,
    frontGlass: true,
    focusRing: true,
    rearContacts: true,
    apertureBlades: true,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative border border-[#ece8e0] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f1ede6] hover:bg-[#ece8e0] flex items-center justify-center text-[#404947] hover:text-[#1c1c17] transition-colors"
        >
          ✕
        </button>

        {/* Modal Eyebrow */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#094d48]" />
          <span className="font-label-stamp text-xs text-[#094d48] uppercase font-bold tracking-wider">
            Verified Custody Record #882
          </span>
        </div>

        <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-[#1c1c17]">
          Digital Custody Inspection Stamp
        </h2>
        <p className="font-body-md text-sm text-[#404947] mt-1 max-w-xl">
          Pre- and post-rental photography paired with dual cryptographic approval. Eliminates deposit anxiety in under 90 seconds.
        </p>

        {/* Side-by-side Inspection Views */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Pickup Photo */}
          <div className="bg-[#f7f3eb] p-4 rounded-2xl border border-[#e6e2da]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-stamp text-[11px] text-[#404947] uppercase font-bold">
                1. Pickup Check (Lender: Meera K.)
              </span>
              <button
                onClick={() => setZoomLender(!zoomLender)}
                className="text-[11px] font-mono text-[#094d48] underline cursor-pointer"
              >
                {zoomLender ? 'Reset Zoom' : 'Micro-zoom 🔍'}
              </button>
            </div>

            <div className="h-56 rounded-xl overflow-hidden bg-black/5 relative">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcphJvV4lvjCzbX5yD1NkvXZjDaqbDCiPW80BSaU6JBG_EEuvCW9tNAf7y2HI8utklTlJKnCbN1TlKpsCYqTO2eXl8qQV10fkm7uk2yeeZbuuX7X2oJeWRgAist_NMGKDEr6NXFtDHUXwXJLSD61HRCEoZtEOhWLOO3WsinEdCtIgWwL-kVw4HRm_K0H7LlBjKnvAuKy8nUXIfK98PqrRNk__8-zv73_HvGoZ1oJEjl-dRam_54M1dAQ"
                alt="Pickup lens front glass"
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  zoomLender ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setZoomLender(!zoomLender)}
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-white/95 font-label-stamp text-[10px] text-[#094d48] font-bold shadow-xs">
                LENS FRONT: CLEAN & DUST-FREE
              </div>
            </div>
            <p className="text-[11px] font-mono text-[#707977] mt-2">
              Captured: Oct 14, 2026 · 14:22:04 IST · Tech Block Hub
            </p>
          </div>

          {/* Return Photo */}
          <div className="bg-[#f7f3eb] p-4 rounded-2xl border border-[#e6e2da]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-stamp text-[11px] text-[#404947] uppercase font-bold">
                2. Return Check (Renter: Rishi V.)
              </span>
              <button
                onClick={() => setZoomRenter(!zoomRenter)}
                className="text-[11px] font-mono text-[#094d48] underline cursor-pointer"
              >
                {zoomRenter ? 'Reset Zoom' : 'Micro-zoom 🔍'}
              </button>
            </div>

            <div className="h-56 rounded-xl overflow-hidden bg-black/5 relative">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5PF6yslGXk97XRF8RPOp0O-w0yc_WpUYLaZHE9p_AT9Rf2QrKv5V-IXp9bk_4HUEVbQ8-LsxHgX4ih2bIMwZE8SQS3pC3eVnnWNYBJGFbjSixPaC_1OF336yWpEb8XhFBXdpsG3kf5cOlcLrySiKXYyzhmjSb1TaMz7u7rBrmdK1psPEJtB88jM3sJfyHHWnuf0bNx3LK_mjmOGFb4x37JI3NEdRiwJ4sFB9om9i4Vv8-uPWa4J-vJg"
                alt="Return rear optic contacts"
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  zoomRenter ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setZoomRenter(!zoomRenter)}
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-white/95 font-label-stamp text-[10px] text-[#094d48] font-bold shadow-xs">
                REAR CONTACTS & MOUNT: OK
              </div>
            </div>
            <p className="text-[11px] font-mono text-[#707977] mt-2">
              Captured: Oct 16, 2026 · 17:04:12 IST · Central Quad
            </p>
          </div>
        </div>

        {/* Interactive Verification Checklist */}
        <div className="mt-6">
          <h4 className="font-headline-sm text-sm font-bold text-[#1c1c17] mb-2">
            Condition Inspection Criteria (90-sec Handover Protocol)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'outerBody', label: 'Outer Body & Barrel' },
              { key: 'frontGlass', label: 'Front Glass Optic' },
              { key: 'focusRing', label: 'Focus / Zoom Ring Smooth' },
              { key: 'rearContacts', label: 'Rear Bayonet & Pins' },
              { key: 'apertureBlades', label: 'Aperture Response' },
            ].map((item) => (
              <label
                key={item.key}
                className="p-2.5 rounded-xl bg-[#fdf9f1] border border-[#e6e2da] flex items-center gap-2 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={(checklist as any)[item.key]}
                  onChange={(e) =>
                    setChecklist({ ...checklist, [item.key]: e.target.checked })
                  }
                  className="accent-[#094d48] w-4 h-4 rounded"
                />
                <span className="font-semibold text-[#1c1c17]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Stamp Box / Resolution */}
        <div className="mt-6 p-4 rounded-2xl bg-[#b2eee7]/30 border-2 border-dashed border-[#094d48] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#094d48] text-xl">
                verified
              </span>
              <span className="font-headline-sm text-sm font-bold text-[#00201e]">
                Both Meera K. & Rishi V. approved condition
              </span>
            </div>
            <p className="text-xs text-[#0e4f4b] mt-0.5 font-mono">
              Cryptographic custody hash: #882-99f2a7-vit-stamp
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-[#094d48] text-white font-label-stamp text-xs uppercase font-bold tracking-wider shrink-0">
            ₹3,000 Deposit Released
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-[#f1ede6] hover:bg-[#ece8e0] text-[#1c1c17] text-xs font-bold font-mono transition-colors"
        >
          Close Custody Log
        </button>
      </div>
    </div>
  );
};
