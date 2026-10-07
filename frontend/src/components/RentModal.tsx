import React, { useState } from 'react';
import { GearItem } from '../types';

interface RentModalProps {
  item: GearItem | null;
  onClose: () => void;
  onConfirmRent: (item: GearItem, days: number, startDate: string, endDate: string) => void;
}

export const RentModal: React.FC<RentModalProps> = ({ item, onClose, onConfirmRent }) => {
  const [days, setDays] = useState(2);
  const [startDate, setStartDate] = useState('2026-10-18');
  const [endDate, setEndDate] = useState('2026-10-20');
  const [agreedToProtocol, setAgreedToProtocol] = useState(true);

  if (!item) return null;

  const rentalTotal = item.pricePerDay * days;
  const totalCharge = rentalTotal + item.depositAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToProtocol) return;
    onConfirmRent(item, days, startDate, endDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-[#ece8e0] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f1ede6] hover:bg-[#ece8e0] flex items-center justify-center text-[#404947] hover:text-[#1c1c17] transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#094d48]" />
          <span className="font-label-stamp text-xs text-[#094d48] uppercase font-bold tracking-wider">
            Rent with Proof™ Protocol
          </span>
        </div>

        <h2 className="font-headline-lg text-2xl font-bold text-[#1c1c17]">
          Book {item.title}
        </h2>
        <p className="font-body-sm text-xs text-[#404947] mt-1">
          Handovers occur in person on campus with digital photo timestamping.
        </p>

        {/* Gear Preview Card */}
        <div className="flex items-center gap-4 p-3 bg-[#f7f3eb] rounded-2xl mt-4 border border-[#e6e2da]">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-16 h-16 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-[#1c1c17] truncate">{item.title}</h4>
            <p className="text-xs text-[#404947]">{item.category} · {item.location}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs font-bold text-[#094d48]">
                ₹{item.pricePerDay}/day
              </span>
              <span className="text-[10px] text-[#707977]">
                • Owner: {item.owner.name} (★ {item.owner.rating})
              </span>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
                Pickup Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-xs font-mono font-medium text-[#1c1c17] border border-[#bfc8c6] focus:outline-none focus:border-[#094d48]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#404947] uppercase font-label-eyebrow block mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#f1ede6] p-2.5 rounded-xl text-xs font-mono font-medium text-[#1c1c17] border border-[#bfc8c6] focus:outline-none focus:border-[#094d48]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold text-[#404947] uppercase font-label-eyebrow mb-1">
              <span>Rental Duration</span>
              <span className="text-[#094d48] font-mono">{days} Day{days > 1 ? 's' : ''}</span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-[#094d48]"
            />
          </div>

          {/* Escrow Breakdown Box */}
          <div className="p-4 rounded-2xl bg-[#fdf9f1] border border-[#e6e2da] space-y-2">
            <div className="flex justify-between text-xs text-[#404947]">
              <span>Rental Fee ({days} × ₹{item.pricePerDay})</span>
              <span className="font-mono font-semibold text-[#1c1c17]">₹{rentalTotal}</span>
            </div>
            <div className="flex justify-between text-xs text-[#404947]">
              <span className="flex items-center gap-1">
                <span>Refundable Escrow Deposit</span>
                <span className="text-[10px] text-[#094d48] font-mono font-bold">(Protected)</span>
              </span>
              <span className="font-mono font-semibold text-[#094d48]">₹{item.depositAmount}</span>
            </div>
            <div className="pt-2 border-t border-[#e6e2da] flex justify-between text-sm font-bold text-[#1c1c17]">
              <span>Total Upfront Hold</span>
              <span className="font-mono text-[#094d48]">₹{totalCharge}</span>
            </div>
            <p className="text-[10px] text-[#707977] leading-relaxed pt-1">
              🛡️ Deposit ₹{item.depositAmount} is held automatically in trust. The moment you return the gear and both peers confirm the condition check, it is instantly unlocked back to your account.
            </p>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-2.5 text-xs text-[#404947] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={agreedToProtocol}
              onChange={(e) => setAgreedToProtocol(e.target.checked)}
              className="mt-0.5 accent-[#094d48] w-4 h-4 rounded"
            />
            <span>
              I agree to snap 3 condition photos at pickup and sign the timestamped handover custody log at {item.owner.handoverLocation}.
            </span>
          </label>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={!agreedToProtocol}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#094d48] text-white font-label-btn text-sm font-bold hover:bg-[#2a6560] shadow-[0_4px_0_0_#0e4f4b] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#0e4f4b] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
          >
            Confirm Rental & Lock Escrow (₹{totalCharge})
          </button>
        </form>
      </div>
    </div>
  );
};
