/**
 * AuthModal — login / register modal for LENDR.
 *
 * Design rule: Uses the same styling patterns as existing modals
 * (BookingConfirmationModal, ListGearModal) — same border, background,
 * rounded corners, button styles, and typography tokens.
 * No new design patterns introduced.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialMode = 'login' }) => {
  const { login, register, error, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register extra fields
  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const rawError = localError ?? error;
  const displayError = typeof rawError === 'string'
    ? rawError
    : rawError && typeof rawError === 'object' && 'message' in (rawError as Record<string, unknown>) && typeof (rawError as Record<string, unknown>).message === 'string'
    ? (rawError as { message: string }).message
    : rawError
    ? 'An unexpected error occurred. Please try again.'
    : null;

  const switchMode = () => {
    clearError();
    setLocalError(null);
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === 'register') {
      const emailDomain = email.trim().toLowerCase().split('@')[1];
      if (emailDomain !== 'vitstudent.ac.in') {
        setLocalError('Email must use the @vitstudent.ac.in domain.');
        return;
      }

      if (password.length < 12) {
        setLocalError('Password must be at least 12 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
          registrationNumber: registrationNumber.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {

      // Error is already set in context; suppress ApiError here
      if (!(err instanceof ApiError)) {
        setLocalError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter">
      <div className="bg-[#fbf9f5] border-2 border-[#114b3f] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-8 modal-card-enter">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 border-b border-stone-200 pb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e8f3ef] text-[#114b3f] text-[10px] font-mono font-bold uppercase mb-2">
            <span>●</span> VIT Campus Network
          </div>
          <h3 className="font-display text-xl font-bold text-[#114b3f]">
            {mode === 'login' ? 'Sign in to LENDR' : 'Join LENDR'}
          </h3>
          <p className="text-xs text-[#697a73] mt-1">
            {mode === 'login'
              ? 'Access your campus gear borrowing account.'
              : 'Create your VIT student account.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 bg-stone-200/80 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => mode !== 'login' && switchMode()}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login' ? 'bg-[#114b3f] text-white shadow-sm' : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => mode !== 'register' && switchMode()}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register' ? 'bg-[#114b3f] text-white shadow-sm' : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error banner */}
        {displayError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aarav Kumar"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#1c2421] focus:outline-none focus:border-[#114b3f]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
              VIT Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@vitstudent.ac.in"
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#1c2421] focus:outline-none focus:border-[#114b3f]"
            />
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                  Reg. Number
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="21BCE1492"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-mono text-[#1c2421] focus:outline-none focus:border-[#114b3f]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#1c2421] focus:outline-none focus:border-[#114b3f]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 12 characters' : '••••••••'}
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#1c2421] focus:outline-none focus:border-[#114b3f]"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono font-bold text-[#114b3f] uppercase mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#1c2421] focus:outline-none focus:border-[#114b3f]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#114b3f] hover:bg-[#0c382f] disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting
              ? mode === 'login'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'login'
              ? 'Sign In →'
              : 'Join Campus Network →'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#697a73]">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-bold text-[#114b3f] hover:text-[#d96543] underline cursor-pointer"
          >
            {mode === 'login' ? 'Register →' : 'Sign in →'}
          </button>
        </p>
      </div>
    </div>
  );
};
