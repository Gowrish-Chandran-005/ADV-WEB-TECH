import React, { useState } from 'react';
import type { BookingRequest } from '../types/gear';
import { paymentsApi, type ApiPaymentRecord } from '../services/api';
import { adaptBookingToRequest } from '../services/adapters';

interface MockPaymentModalProps {
  isOpen: boolean;
  booking: BookingRequest | null;
  onClose: () => void;
  onPaymentSuccess: (payment: ApiPaymentRecord, updatedBooking: BookingRequest) => void;
}

export const MockPaymentModal: React.FC<MockPaymentModalProps> = ({
  isOpen,
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  const [simulationMode, setSimulationMode] = useState<'SUCCESS' | 'FAIL'>('SUCCESS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureNotice, setFailureNotice] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setFailureNotice(null);

    try {
      const result = await paymentsApi.pay(booking.id, simulationMode);

      if (result.payment.status === 'SUCCESS') {
        const adapted = adaptBookingToRequest(result.booking, booking.gearImage);
        onPaymentSuccess(result.payment, adapted);
      } else {
        // Failed simulation path
        setFailureNotice(
          'Simulated payment failed as requested. Your booking remains unpaid and eligible for retry.',
        );
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Payment processing encountered an error. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const dailyRate = booking.durationDays > 0 ? Math.round(booking.baseAmount / booking.durationDays) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter"
    >
      <div className="bg-[#fbf9f5] border-2 border-[#114b3f] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 modal-card-enter">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#ebdccd]">
          <div className="w-10 h-10 rounded-2xl bg-[#114b3f] text-emerald-200 flex items-center justify-center font-bold shadow-xs shrink-0">
            <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
              CAMPUS PEER CHECKOUT
            </span>
            <h2 id="mock-payment-title" className="font-display text-lg sm:text-xl font-bold text-[#114b3f]">
              Mock Payment Simulation
            </h2>
          </div>
        </div>

        {/* Error / Failure Banner */}
        {errorMessage && (
          <div role="alert" className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            <span className="font-bold">Error:</span> {errorMessage}
          </div>
        )}

        {failureNotice && (
          <div role="alert" className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Simulated Payment Failure</span>
            </div>
            <p className="leading-relaxed">{failureNotice}</p>
            <button
              onClick={() => {
                setSimulationMode('SUCCESS');
                setFailureNotice(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-800 text-white font-bold text-[11px] hover:bg-amber-900 transition-colors cursor-pointer"
            >
              Switch to Success Mode &amp; Retry
            </button>
          </div>
        )}

        {/* Equipment & Rental Summary */}
        <div className="mt-5 p-4 rounded-2xl bg-white border border-[#ebdccd] flex items-center gap-4 shadow-2xs">
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
            <h3 className="font-bold text-sm text-[#114b3f] truncate">{booking.gearTitle}</h3>
            <p className="text-xs text-stone-600 truncate">
              Owner: <span className="font-semibold text-stone-800">{booking.lenderName}</span>
              {booking.lenderBlock ? ` • ${booking.lenderBlock}` : ''}
            </p>
            <p className="text-[11px] font-mono text-stone-500 mt-0.5">
              {booking.startDate} → {booking.endDate} ({booking.durationDays} {booking.durationDays === 1 ? 'day' : 'days'})
            </p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mt-4 p-4 rounded-2xl bg-[#f4ede2] border border-[#e6d8c3] space-y-2 text-xs">
          <div className="flex items-center justify-between text-stone-700">
            <span>Rental Fee ({booking.durationDays} {booking.durationDays === 1 ? 'day' : 'days'} × ₹{dailyRate})</span>
            <span className="font-mono font-semibold text-stone-900">₹{booking.baseAmount}</span>
          </div>
          <div className="flex items-center justify-between text-stone-700">
            <span>Refundable Deposit</span>
            <span className="font-mono font-semibold text-stone-900">
              {booking.securityDeposit > 0 ? `₹${booking.securityDeposit}` : '₹0 (Zero Deposit)'}
            </span>
          </div>
          <div className="flex items-center justify-between text-stone-700">
            <span>Campus Platform Fee</span>
            <span className="font-mono font-semibold text-emerald-700">0% (Peer Pool)</span>
          </div>
          <div className="pt-2 border-t border-[#dfd0bd] flex items-center justify-between font-bold text-sm text-[#114b3f]">
            <span>Total Payable Amount</span>
            <span className="font-mono text-base text-[#d96543]">₹{booking.totalAmount}</span>
          </div>
        </div>

        {/* Simulation Options Selector */}
        <div className="mt-5 space-y-2.5">
          <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#114b3f]">
            Select Simulation Outcome
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSimulationMode('SUCCESS')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                simulationMode === 'SUCCESS'
                  ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Success</span>
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  simulationMode === 'SUCCESS' ? 'border-emerald-600 bg-emerald-600' : 'border-stone-300'
                }`}>
                  {simulationMode === 'SUCCESS' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  )}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 mt-1 leading-snug">
                Simulate approved payment &amp; confirm booking.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSimulationMode('FAIL')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                simulationMode === 'FAIL'
                  ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Failure</span>
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  simulationMode === 'FAIL' ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                }`}>
                  {simulationMode === 'FAIL' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  )}
                </span>
              </div>
              <p className="text-[10px] text-amber-700 mt-1 leading-snug">
                Simulate bank decline to test retry workflow.
              </p>
            </button>
          </div>
        </div>

        {/* Visible Disclaimer */}
        <div className="mt-4 p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center gap-2.5">
          <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] font-semibold text-amber-900 leading-snug">
            Demo payment only. No real money will be charged.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto sm:flex-1 py-3 px-4 rounded-full border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs transition cursor-pointer disabled:opacity-50 text-center"
          >
            Cancel &amp; Return
          </button>

          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={isProcessing}
            className={`w-full sm:w-auto sm:flex-1 py-3 px-6 rounded-full font-bold text-xs text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
              simulationMode === 'SUCCESS'
                ? 'bg-[#d96543] hover:bg-[#c85635] shadow-[#d96543]/20'
                : 'bg-amber-700 hover:bg-amber-800 shadow-amber-700/20'
            }`}
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Processing Demo Payment...</span>
              </>
            ) : simulationMode === 'SUCCESS' ? (
              <span>Pay ₹{booking.totalAmount} (Demo)</span>
            ) : (
              <span>Simulate Payment Failure</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
