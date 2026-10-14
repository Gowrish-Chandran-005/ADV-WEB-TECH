import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  complaintsApi,
  uploadApi,
  type ApiComplaint,
  ApiError,
} from '../../services/api';
import type { BookingRequest } from '../../types/gear';

interface ComplaintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: BookingRequest[];
  initialBookingId?: string | null;
}

const COMPLAINT_CATEGORIES = [
  'Equipment Malfunction',
  'Late Return / Unresponsive Peer',
  'Listing Misrepresentation',
  'Safety & Handover Issue',
  'Payment or Deposit Question',
  'General Violation / Grievance',
];

const COMPLAINT_STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  OPEN: { label: 'Open', badge: 'bg-blue-50 text-blue-800 border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', badge: 'bg-purple-50 text-purple-800 border-purple-200' },
  RESOLVED: { label: 'Resolved', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  DISMISSED: { label: 'Dismissed', badge: 'bg-stone-100 text-stone-700 border-stone-200' },
};

export const ComplaintsModal: React.FC<ComplaintsModalProps> = ({
  isOpen,
  onClose,
  bookings,
  initialBookingId = null,
}) => {
  const [tab, setTab] = useState<'submit' | 'history'>('submit');
  const [myComplaints, setMyComplaints] = useState<ApiComplaint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Form State
  const [selectedBookingId, setSelectedBookingId] = useState<string>(initialBookingId || '');
  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMyComplaints = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await complaintsApi.myComplaints({ pageSize: 50 });
      setMyComplaints(res.items);
    } catch (err) {
      if (err instanceof ApiError) {
        setHistoryError(err.message);
      } else {
        setHistoryError('Failed to load your complaints.');
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedBookingId(initialBookingId || '');
      setSubmitError(null);
      setSubmitSuccess(null);
      loadMyComplaints();
    }
  }, [isOpen, initialBookingId, loadMyComplaints]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceUrls.length + files.length > 10) {
      setUploadError('Maximum 10 supporting photos allowed.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadPromises = Array.from(files).map((file) => uploadApi.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.url);
      setEvidenceUrls((prev) => [...prev, ...newUrls]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (description.trim().length < 5) {
      setSubmitError('Complaint description must be at least 5 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await complaintsApi.create({
        bookingId: selectedBookingId.trim() ? selectedBookingId.trim() : null,
        category,
        description: description.trim(),
        evidenceUrls,
      });

      setMyComplaints((prev) => [res.complaint, ...prev]);
      setSubmitSuccess('Grievance logged securely. Our campus moderation team will review this ticket.');
      setDescription('');
      setEvidenceUrls([]);
      setTab('history');
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to submit grievance. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs modal-backdrop-enter">
      <div className="bg-[#fbf9f5] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#e7e2d7] flex flex-col overflow-hidden modal-card-enter">
        {/* Header */}
        <div className="p-6 border-b border-[#e7e2d7] flex items-center justify-between bg-white">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d96543] block">
              Support &amp; Campus Standards
            </span>
            <h2 className="font-display text-xl font-bold text-[#114b3f]">Campus Grievance &amp; Complaints</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e7e2d7] bg-stone-50 px-6 gap-4">
          <button
            onClick={() => setTab('submit')}
            className={`py-3 text-xs font-bold font-mono uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
              tab === 'submit'
                ? 'border-[#114b3f] text-[#114b3f]'
                : 'border-transparent text-[#697a73] hover:text-[#114b3f]'
            }`}
          >
            File New Complaint
          </button>
          <button
            onClick={() => {
              setTab('history');
              loadMyComplaints();
            }}
            className={`py-3 text-xs font-bold font-mono uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
              tab === 'history'
                ? 'border-[#114b3f] text-[#114b3f]'
                : 'border-transparent text-[#697a73] hover:text-[#114b3f]'
            }`}
          >
            My Complaints ({myComplaints.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'submit' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium">
                  {submitSuccess}
                </div>
              )}

              {submitError && (
                <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
                  {submitError}
                </div>
              )}

              {/* Related Booking (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                  Related Booking (Optional)
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
                >
                  <option value="">None (General campus equipment grievance)</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.gearTitle} — {b.id.slice(0, 8)} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                  Complaint Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                    Detailed Description
                  </label>
                  <span className="text-[10px] font-mono text-[#697a73]">
                    {description.length}/5000 chars
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail what occurred, dates, interactions, or equipment concerns..."
                  rows={4}
                  maxLength={5000}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30 placeholder:text-stone-400"
                />
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                    Supporting Evidence ({evidenceUrls.length}/10)
                  </label>
                  {isUploading && (
                    <span className="text-[11px] font-mono text-[#d96543] animate-pulse">
                      Uploading...
                    </span>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {uploadError}
                  </div>
                )}

                {evidenceUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {evidenceUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative w-18 h-18 rounded-xl border border-stone-200 overflow-hidden bg-stone-100 group"
                      >
                        <img
                          src={url}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {evidenceUrls.length < 10 && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="complaint-evidence-input"
                    />
                    <label
                      htmlFor="complaint-evidence-input"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#114b3f]/40 bg-[#114b3f]/5 hover:bg-[#114b3f]/10 text-xs font-semibold text-[#114b3f] cursor-pointer transition-colors"
                    >
                      <span>Upload Photos or Screenshots</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#e7e2d7]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-[#114b3f] hover:bg-[#0d382f] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Logging Ticket...' : 'Submit Grievance'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-[#697a73] font-mono">
                  Loading your complaints...
                </div>
              ) : historyError ? (
                <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
                  {historyError}
                </div>
              ) : myComplaints.length === 0 ? (
                <div className="p-8 bg-white border border-[#e7e2d7] rounded-2xl text-center space-y-1">
                  <p className="text-xs font-bold text-[#114b3f]">No complaints submitted.</p>
                  <p className="text-[11px] text-[#697a73]">
                    Your history of resolved and open grievances will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myComplaints.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 bg-white border border-[#e7e2d7] rounded-2xl space-y-2 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#114b3f]">{c.category}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                              COMPLAINT_STATUS_LABELS[c.status]?.badge || 'bg-stone-100'
                            }`}
                          >
                            {COMPLAINT_STATUS_LABELS[c.status]?.label || c.status}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#697a73]">
                          {formatTimestamp(c.createdAt)}
                        </span>
                      </div>

                      {c.bookingId && (
                        <div className="text-[10px] font-mono text-stone-500">
                          Booking ID: {c.bookingId}
                        </div>
                      )}

                      <p className="text-xs text-[#1c2421] leading-relaxed whitespace-pre-wrap">
                        {c.description}
                      </p>

                      {c.adminNotes && (
                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 space-y-1">
                          <span className="font-bold text-[10px] font-mono uppercase text-[#114b3f] block">
                            Administrator Resolution Notes
                          </span>
                          <p className="text-[11px] leading-relaxed">{c.adminNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
