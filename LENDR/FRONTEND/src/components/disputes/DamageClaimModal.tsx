import React, { useState, useRef } from 'react';
import {
  damageClaimsApi,
  uploadApi,
  type ApiDamageClaim,
  ApiError,
} from '../../services/api';

interface DamageClaimModalProps {
  bookingId: string;
  gearTitle: string;
  returnRecordedAt?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimCreated: (claim: ApiDamageClaim) => void;
}

export const DamageClaimModal: React.FC<DamageClaimModalProps> = ({
  bookingId,
  gearTitle,
  returnRecordedAt,
  isOpen,
  onClose,
  onClaimCreated,
}) => {
  const [description, setDescription] = useState('');
  const [proposedFineAmount, setProposedFineAmount] = useState<string>('');
  const [fineExplanation, setFineExplanation] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Window calculation helper (informative display only; backend remains authoritative)
  const returnDate = returnRecordedAt ? new Date(returnRecordedAt) : null;
  const isExpired = returnDate
    ? Date.now() - returnDate.getTime() > 24 * 60 * 60 * 1000
    : false;
  const hoursLeft = returnDate
    ? Math.max(0, Math.floor((24 * 60 * 60 * 1000 - (Date.now() - returnDate.getTime())) / (60 * 60 * 1000)))
    : null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceUrls.length + files.length > 10) {
      setUploadError('Maximum 10 evidence photos allowed.');
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

    if (description.trim().length < 5) {
      setSubmitError('Damage description must be at least 5 characters long.');
      return;
    }

    if (evidenceUrls.length === 0) {
      setSubmitError('At least one photograph of the damage is required.');
      return;
    }

    let parsedFine: number | null = null;
    if (proposedFineAmount.trim()) {
      const num = parseFloat(proposedFineAmount);
      if (isNaN(num) || num < 0) {
        setSubmitError('Proposed fine amount must be a positive number.');
        return;
      }
      parsedFine = Math.round(num * 100) / 100;
    }

    setIsSubmitting(true);
    try {
      const res = await damageClaimsApi.create(bookingId, {
        description: description.trim(),
        evidenceUrls,
        proposedFineAmount: parsedFine,
        fineExplanation: fineExplanation.trim() ? fineExplanation.trim() : null,
      });

      onClaimCreated(res.damageClaim);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'CLAIM_WINDOW_EXPIRED') {
          setSubmitError(
            'The 24-hour return inspection window has expired. Contact an administrator to request case reopening.',
          );
        } else if (err.code === 'DUPLICATE_CLAIM_NOT_ALLOWED') {
          setSubmitError('An active damage claim is already open for this booking.');
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('Failed to submit damage claim. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs modal-backdrop-enter">
      <div className="bg-[#fbf9f5] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#e7e2d7] flex flex-col overflow-hidden modal-card-enter">
        {/* Header */}
        <div className="p-6 border-b border-[#e7e2d7] flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
                Lender Protection
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-[10px] font-mono text-[#697a73]">{bookingId.slice(0, 8)}</span>
            </div>
            <h2 className="font-display text-xl font-bold text-[#114b3f]">File Return Damage Claim</h2>
            <p className="text-xs text-[#697a73] font-mono mt-0.5">{gearTitle}</p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 24-Hour Return Inspection Window Alert */}
          {returnRecordedAt && (
            <div
              className={`p-4 rounded-2xl border text-xs ${
                isExpired
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>24-Hour Return Inspection Window</span>
                <span className="font-mono text-[11px]">
                  {isExpired ? 'Window Expired' : `${hoursLeft}h remaining`}
                </span>
              </div>
              <p className="text-[11px] mt-1 text-stone-700">
                {isExpired
                  ? 'The standard 24-hour return inspection period has concluded. Late submissions require administrator reopening.'
                  : 'Claims must be filed within 24 hours of return. The backend database timestamp governs authoritative verification.'}
              </p>
            </div>
          )}

          {/* Financial Safety Guard Alert */}
          <div className="p-4 bg-[#f4ede2] border border-[#e6d8c3] rounded-2xl text-xs text-[#523d24] space-y-1">
            <span className="font-bold font-mono text-[10px] uppercase text-[#114b3f] block">
              Financial Safety Guarantee
            </span>
            <p className="text-[11px]">
              Submitting a proposed fine does NOT automatically charge the borrower or deduct their security deposit.
              Fines are reviewed mutually or by campus administrators before any resolution is finalized.
            </p>
          </div>

          {submitError && (
            <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                  Damage Description (Required)
                </label>
                <span className="text-[10px] font-mono text-[#697a73]">
                  {description.length}/5000 chars
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail what damage or issue was discovered, which component was affected, and how it differs from handover condition..."
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
                  Evidence Photographs ({evidenceUrls.length}/10 required)
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
                  {evidenceUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative w-20 h-20 rounded-xl border border-stone-200 overflow-hidden bg-stone-100 group"
                    >
                      <img
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove photo"
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
                    id="damage-claim-evidence-input"
                  />
                  <label
                    htmlFor="damage-claim-evidence-input"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#114b3f]/40 bg-[#114b3f]/5 hover:bg-[#114b3f]/10 text-xs font-semibold text-[#114b3f] cursor-pointer transition-colors"
                  >
                    <span>Attach Damage Photos</span>
                    <span className="text-[10px] font-mono text-[#697a73]">(JPG, PNG, WEBP)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Proposed Fine & Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                  Proposed Fine (INR, Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-stone-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999.99"
                    value={proposedFineAmount}
                    onChange={(e) => setProposedFineAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                  Cost Explanation (Optional)
                </label>
                <input
                  type="text"
                  maxLength={2000}
                  value={fineExplanation}
                  onChange={(e) => setFineExplanation(e.target.value)}
                  placeholder="e.g. Lens cap replacement / filter buffing cost"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30 placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex justify-end gap-3 border-t border-[#e7e2d7]">
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
                className="px-6 py-2.5 rounded-xl bg-[#d96543] hover:bg-[#c85635] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'Filing Claim...' : 'Submit Damage Claim'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
