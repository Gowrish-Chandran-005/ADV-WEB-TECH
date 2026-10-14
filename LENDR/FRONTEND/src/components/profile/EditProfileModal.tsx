import React, { useState } from 'react';
import type { ApiUser } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ApiUser | null;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { updateProfile } = useAuth();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [registrationNumber, setRegistrationNumber] = useState(currentUser?.registrationNumber || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMessage('Full name is required.');
      return;
    }

    const trimmedRegNo = registrationNumber.trim();
    const trimmedPhone = phone.trim();

    setIsSubmitting(true);
    try {
      await updateProfile({
        fullName: trimmedName,
        registrationNumber: trimmedRegNo ? trimmedRegNo.toUpperCase() : null,
        phone: trimmedPhone ? trimmedPhone : null,
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update profile. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto modal-backdrop-enter"
    >
      <div className="bg-[#fbf9f5] border-2 border-[#114b3f] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-8 modal-card-enter">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pb-5 border-b border-[#ebdccd]">
          <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest text-[#d96543]">
            STUDENT GEAR HUB
          </span>
          <h2 id="edit-profile-title" className="font-display text-2xl font-black text-[#114b3f]">
            Edit Profile
          </h2>
          <p className="text-xs text-stone-600 font-medium">
            Keep your campus identity and contact details up-to-date.
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Read-Only Campus Email */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Campus Email (Verified)
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-100 text-stone-500 text-xs font-mono cursor-not-allowed select-none pl-9"
              />
              <svg
                className="w-4 h-4 text-stone-400 absolute left-3 top-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="absolute right-3 top-2.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                VIT VELLORE
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              Institutional email address is permanent and cannot be changed.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="profile-fullName" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Full Name <span className="text-[#d96543]">*</span>
            </label>
            <input
              id="profile-fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:ring-2 focus:ring-[#114b3f] focus:border-transparent outline-none transition-all shadow-inner"
            />
          </div>

          {/* Registration Number */}
          <div>
            <label htmlFor="profile-regNo" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Registration / Student ID
            </label>
            <input
              id="profile-regNo"
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. 21BCE1042"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs font-mono uppercase focus:ring-2 focus:ring-[#114b3f] focus:border-transparent outline-none transition-all shadow-inner"
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Helps gear owners verify your student status during campus handovers.
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="profile-phone" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Phone / WhatsApp
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:ring-2 focus:ring-[#114b3f] focus:border-transparent outline-none transition-all shadow-inner"
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Used strictly for handover coordination on campus.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#ebdccd]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c362d] text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
