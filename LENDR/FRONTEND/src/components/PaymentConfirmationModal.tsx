import React from 'react';
import type { BookingRequest } from '../types/gear';
import type { ApiPaymentRecord } from '../services/api';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  booking: BookingRequest | null;
  payment: ApiPaymentRecord | null;
  onClose: () => void;
  onViewBookings: () => void;
  onBackToEquipment: () => void;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  booking,
  payment,
  onClose,
  onViewBookings,
  onBackToEquipment,
}) => {
  if (!isOpen || !booking) return null;

  const transactionRef = payment?.providerReference || `MOCK-TXN-${booking.id.slice(0, 8).toUpperCase()}`;
  const amountPaid = payment?.amount ? Math.round(parseFloat(payment.amount)) : booking.totalAmount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-confirmation-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter"
    >
      <div className="bg-[#fbf9f5] border-2 border-[#114b3f] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 modal-card-enter">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Success Icon & Header */}
        <div className="text-center space-y-2 pb-5 border-b border-[#ebdccd]">
          <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 text-[#114b3f] rounded-full flex items-center justify-center mx-auto shadow-sm">
            <svg className="w-8 h-8 text-[#114b3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest text-[#d96543] pt-1">
            PAYMENT CONFIRMED • DEMO MODE
          </span>
          <h2 id="payment-confirmation-title" className="font-display text-2xl font-black text-[#114b3f]">
            Booking &amp; Payment Confirmed!
          </h2>
          <p className="text-xs text-stone-600 font-medium max-w-sm mx-auto">
            Your demo payment was successful. No real money was charged.
          </p>
        </div>

        {/* References Strip */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-white rounded-2xl border border-[#ebdccd]">
            <span className="text-[10px] font-mono uppercase text-[#697a73] font-bold block">
              Booking Reference
            </span>
            <span className="font-mono font-bold text-stone-900 text-[11px] select-all block truncate" title={booking.id}>
              {booking.id}
            </span>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#ebdccd]">
            <span className="text-[10px] font-mono uppercase text-[#697a73] font-bold block">
              Mock Txn ID
            </span>
            <span className="font-mono font-bold text-emerald-800 text-[11px] select-all block truncate" title={transactionRef}>
              {transactionRef}
            </span>
          </div>
        </div>

        {/* Equipment Card */}
        <div className="mt-3 p-4 rounded-2xl bg-white border border-[#ebdccd] flex items-center gap-4">
          {booking.gearImage ? (
            <img
              src={booking.gearImage}
              alt={booking.gearTitle}
              className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-[#092620] text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
              GEAR
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#114b3f] truncate">{booking.gearTitle}</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 shrink-0">
                PAID
              </span>
            </div>
            <p className="text-xs text-stone-600 truncate mt-0.5">
              Owner: <span className="font-semibold text-stone-800">{booking.lenderName}</span>
              {booking.lenderBlock ? ` • ${booking.lenderBlock}` : ''}
            </p>
            <p className="text-[11px] font-mono text-stone-500 mt-0.5">
              Dates: {booking.startDate} → {booking.endDate} ({booking.durationDays} {booking.durationDays === 1 ? 'day' : 'days'})
            </p>
          </div>
        </div>

        {/* Amount Paid Summary */}
        <div className="mt-3 p-3.5 bg-[#f4ede2] rounded-2xl border border-[#e6d8c3] flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-700">Amount Paid (Demo)</span>
          <span className="font-mono font-bold text-base text-[#114b3f]">₹{amountPaid}</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onBackToEquipment}
            className="w-full sm:w-auto sm:flex-1 py-3 px-4 rounded-full border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs transition cursor-pointer text-center"
          >
            Back to Equipment
          </button>

          <button
            type="button"
            onClick={onViewBookings}
            className="w-full sm:w-auto sm:flex-1 py-3 px-6 rounded-full bg-[#114b3f] hover:bg-[#0c382f] text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 text-center"
          >
            <span>View My Bookings</span>
            <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
