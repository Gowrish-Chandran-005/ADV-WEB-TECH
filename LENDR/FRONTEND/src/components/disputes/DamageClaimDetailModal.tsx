import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  damageClaimsApi,
  uploadApi,
  type ApiDamageClaim,
  type ApiDamageClaimStatusHistory,
  type DisputeStatus,
  type ApiUser,
  ApiError,
} from '../../services/api';

interface DamageClaimDetailModalProps {
  claimId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: ApiUser | null;
  onClaimUpdated?: (updated: ApiDamageClaim) => void;
}

const STATUS_LABELS: Record<DisputeStatus, { label: string; badgeClass: string; desc: string }> = {
  SUBMITTED: {
    label: 'Submitted',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    desc: 'Lender filed damage inspection report; review initiated.',
  },
  AWAITING_BORROWER_RESPONSE: {
    label: 'Awaiting Borrower Response',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    desc: 'Proposed fine submitted; awaiting borrower review or dispute counter-evidence.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    desc: 'Borrower has responded or case was reopened; pending review.',
  },
  RESOLVED: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    desc: 'Case concluded with formal administrative determination.',
  },
  DISMISSED: {
    label: 'Dismissed',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    desc: 'Claim was dismissed by administration without penalty.',
  },
};

export const DamageClaimDetailModal: React.FC<DamageClaimDetailModalProps> = ({
  claimId,
  isOpen,
  onClose,
  currentUser,
  onClaimUpdated,
}) => {
  const [claim, setClaim] = useState<ApiDamageClaim | null>(null);
  const [history, setHistory] = useState<ApiDamageClaimStatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Borrower Response Form State
  const [borrowerResponseText, setBorrowerResponseText] = useState('');
  const [borrowerDisputed, setBorrowerDisputed] = useState(true);
  const [borrowerEvidenceUrls, setBorrowerEvidenceUrls] = useState<string[]>([]);
  const [isUploadingCounterEvidence, setIsUploadingCounterEvidence] = useState(false);
  const [uploadCounterError, setUploadCounterError] = useState<string | null>(null);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Resolution Form State
  const [showAdminResolveForm, setShowAdminResolveForm] = useState(false);
  const [adminDecision, setAdminDecision] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [adminApprovedFine, setAdminApprovedFine] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isAdminResolving, setIsAdminResolving] = useState(false);
  const [adminResolveError, setAdminResolveError] = useState<string | null>(null);

  // Admin Reopen Form State
  const [showAdminReopenForm, setShowAdminReopenForm] = useState(false);
  const [adminReopenReason, setAdminReopenReason] = useState('');
  const [isAdminReopening, setIsAdminReopening] = useState(false);
  const [adminReopenError, setAdminReopenError] = useState<string | null>(null);

  // Lightbox Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadClaim = useCallback(async () => {
    if (!claimId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await damageClaimsApi.getById(claimId);
      setClaim(res.damageClaim);
      setHistory(res.statusHistory);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load dispute details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    if (isOpen) {
      loadClaim();
      setShowAdminResolveForm(false);
      setShowAdminReopenForm(false);
    }
  }, [isOpen, loadClaim]);

  if (!isOpen) return null;

  const isBorrower = currentUser && claim && claim.renterId === currentUser.id;
  const isLender = currentUser && claim && claim.reporterId === currentUser.id;
  const isAdmin = currentUser && currentUser.role === 'ADMIN';

  const canBorrowerRespond =
    isBorrower &&
    claim &&
    ['SUBMITTED', 'AWAITING_BORROWER_RESPONSE'].includes(claim.status) &&
    !claim.borrowerRespondedAt;

  const handleCounterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (borrowerEvidenceUrls.length + files.length > 10) {
      setUploadCounterError('Maximum 10 counter-evidence photos allowed.');
      return;
    }

    setIsUploadingCounterEvidence(true);
    setUploadCounterError(null);

    try {
      const uploadPromises = Array.from(files).map((file) => uploadApi.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.url);
      setBorrowerEvidenceUrls((prev) => [...prev, ...newUrls]);
    } catch (err) {
      setUploadCounterError(err instanceof Error ? err.message : 'Photo upload failed. Please try again.');
    } finally {
      setIsUploadingCounterEvidence(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCounterPhoto = (index: number) => {
    setBorrowerEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBorrowerSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseError(null);

    if (borrowerResponseText.trim().length < 2) {
      setResponseError('Response text must be at least 2 characters long.');
      return;
    }

    setIsSubmittingResponse(true);
    try {
      const res = await damageClaimsApi.respond(claimId, {
        response: borrowerResponseText.trim(),
        disputed: borrowerDisputed,
        evidenceUrls: borrowerEvidenceUrls,
      });

      setClaim(res.damageClaim);
      if (onClaimUpdated) onClaimUpdated(res.damageClaim);
      // Reload history to reflect state transition
      loadClaim();
    } catch (err) {
      if (err instanceof ApiError) {
        setResponseError(err.message);
      } else {
        setResponseError('Failed to submit response. Please try again.');
      }
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleAdminResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResolveError(null);

    if (adminNotes.trim().length < 5) {
      setAdminResolveError('Administrative decision notes must be at least 5 characters long.');
      return;
    }

    let parsedFine: number | null = null;
    if (adminDecision === 'RESOLVED' && adminApprovedFine.trim()) {
      const num = parseFloat(adminApprovedFine);
      if (isNaN(num) || num < 0) {
        setAdminResolveError('Approved fine must be a valid positive number.');
        return;
      }
      parsedFine = Math.round(num * 100) / 100;
    }

    setIsAdminResolving(true);
    try {
      const res = await damageClaimsApi.adminResolve(claimId, {
        decision: adminDecision,
        finalApprovedFine: parsedFine,
        notes: adminNotes.trim(),
      });

      setClaim(res.damageClaim);
      setShowAdminResolveForm(false);
      if (onClaimUpdated) onClaimUpdated(res.damageClaim);
      loadClaim();
    } catch (err) {
      if (err instanceof ApiError) {
        setAdminResolveError(err.message);
      } else {
        setAdminResolveError('Failed to finalize dispute resolution.');
      }
    } finally {
      setIsAdminResolving(false);
    }
  };

  const handleAdminReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminReopenError(null);

    if (adminReopenReason.trim().length < 5) {
      setAdminReopenError('Reopening justification must be at least 5 characters long.');
      return;
    }

    setIsAdminReopening(true);
    try {
      const res = await damageClaimsApi.adminReopen(claimId, {
        reason: adminReopenReason.trim(),
      });

      setClaim(res.damageClaim);
      setShowAdminReopenForm(false);
      if (onClaimUpdated) onClaimUpdated(res.damageClaim);
      loadClaim();
    } catch (err) {
      if (err instanceof ApiError) {
        setAdminReopenError(err.message);
      } else {
        setAdminReopenError('Failed to reopen claim.');
      }
    } finally {
      setIsAdminReopening(false);
    }
  };

  const formatTimestamp = (iso: string | null | undefined) => {
    if (!iso) return 'Not recorded';
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
      return String(iso);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs modal-backdrop-enter">
      <div className="bg-[#fbf9f5] w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#e7e2d7] flex flex-col overflow-hidden modal-card-enter">
        {/* Header */}
        <div className="p-6 border-b border-[#e7e2d7] flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
                Dispute Adjudication
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-[10px] font-mono text-[#697a73]">{claimId.slice(0, 8)}</span>
            </div>
            <h2 className="font-display text-xl font-bold text-[#114b3f]">
              {claim?.equipmentTitle || 'Equipment Damage Claim'}
            </h2>
            <p className="text-xs text-[#697a73] font-mono mt-0.5">
              Booking Ref: {claim?.bookingId || ''}
            </p>
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
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#697a73] font-mono">
              Loading dispute dossier and immutable audit log...
            </div>
          ) : error ? (
            <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
              {error}
            </div>
          ) : claim ? (
            <>
              {/* Status Header Badge Card */}
              <div className="p-4 bg-white border border-[#e7e2d7] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#697a73] block">Current Dossier Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                        STATUS_LABELS[claim.status]?.badgeClass || 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      {STATUS_LABELS[claim.status]?.label || claim.status}
                    </span>
                    <span className="text-xs text-[#697a73]">
                      {STATUS_LABELS[claim.status]?.desc}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-[#697a73]">
                  <div>Filed: {formatTimestamp(claim.createdAt)}</div>
                  {claim.returnRecordedAt && <div>Returned: {formatTimestamp(claim.returnRecordedAt)}</div>}
                </div>
              </div>

              {/* Proposed Fine vs Approved Fine Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-900 block">
                    Proposed Fine (Lender Request)
                  </span>
                  <div className="text-lg font-bold text-amber-900">
                    {claim.proposedFineAmount ? `₹${claim.proposedFineAmount}` : 'None proposed'}
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-tight">
                    {claim.fineExplanation || 'No fine explanation provided by lender.'}
                  </p>
                  <span className="text-[10px] font-mono text-amber-700 block mt-1">
                    Informational only — Not deducted automatically.
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-900 block">
                    Final Approved Fine (Admin Resolution)
                  </span>
                  <div className="text-lg font-bold text-emerald-900">
                    {claim.finalApprovedFine !== null ? `₹${claim.finalApprovedFine}` : 'Pending Admin Decision'}
                  </div>
                  <p className="text-[11px] text-emerald-800/90 leading-tight">
                    {claim.adminDecisionNotes || 'Awaiting formal dispute determination by administrator.'}
                  </p>
                  {claim.resolvedAt && (
                    <span className="text-[10px] font-mono text-emerald-700 block mt-1">
                      Finalized at: {formatTimestamp(claim.resolvedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Section 1: Lender's Allegation & Evidence */}
              <div className="p-5 bg-white border border-[#e7e2d7] rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="font-display text-xs font-bold text-[#114b3f] uppercase tracking-wide">
                    Lender Allegation &amp; Primary Evidence
                  </span>
                  <span className="text-[11px] font-mono text-[#697a73]">
                    Reported by: {claim.reporterFullName || 'Equipment Lender'}
                  </span>
                </div>
                <p className="text-xs text-[#1c2421] leading-relaxed whitespace-pre-wrap">
                  {claim.description}
                </p>

                {claim.evidenceUrls && claim.evidenceUrls.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-mono uppercase text-[#697a73] block">
                      Lender Inspection Photographs ({claim.evidenceUrls.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {claim.evidenceUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewImageUrl(url)}
                          className="w-18 h-18 rounded-xl border border-stone-200 overflow-hidden shrink-0 hover:opacity-85 transition-opacity cursor-pointer bg-stone-100"
                        >
                          <img
                            src={url}
                            alt={`Lender evidence ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Borrower's Counter-Statement & Counter-Evidence */}
              <div className="p-5 bg-white border border-[#e7e2d7] rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="font-display text-xs font-bold text-[#d96543] uppercase tracking-wide">
                    Borrower Counter-Statement &amp; Evidence
                  </span>
                  <span className="text-[11px] font-mono text-[#697a73]">
                    Borrower: {claim.renterFullName || 'Verified Renter'}
                  </span>
                </div>

                {claim.borrowerRespondedAt ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          claim.borrowerDisputed
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {claim.borrowerDisputed ? 'Disputed by Borrower' : 'Borrower Accepted Responsibility'}
                      </span>
                      <span className="text-[11px] font-mono text-[#697a73]">
                        Responded: {formatTimestamp(claim.borrowerRespondedAt)}
                      </span>
                    </div>

                    <p className="text-xs text-[#1c2421] leading-relaxed whitespace-pre-wrap">
                      {claim.borrowerResponse}
                    </p>

                    {claim.borrowerEvidenceUrls && claim.borrowerEvidenceUrls.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-mono uppercase text-[#697a73] block">
                          Borrower Counter-Evidence Photographs ({claim.borrowerEvidenceUrls.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {claim.borrowerEvidenceUrls.map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreviewImageUrl(url)}
                              className="w-18 h-18 rounded-xl border border-stone-200 overflow-hidden shrink-0 hover:opacity-85 transition-opacity cursor-pointer bg-stone-100"
                            >
                              <img
                                src={url}
                                alt={`Borrower counter evidence ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3 text-xs text-[#697a73]">
                    {canBorrowerRespond
                      ? 'You have not responded to this claim yet. Complete the response form below to provide your counter-evidence.'
                      : 'No borrower response recorded yet.'}
                  </div>
                )}

                {/* Borrower Response Form (Only if active borrower and pending response) */}
                {canBorrowerRespond && (
                  <form onSubmit={handleBorrowerSubmitResponse} className="pt-4 border-t border-stone-100 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                        Submit Your Response &amp; Counter-Evidence
                      </h4>
                      <p className="text-[11px] text-[#697a73]">
                        Provide your statement regarding the condition at handover and attach any photos taken during checkout.
                      </p>
                    </div>

                    {responseError && (
                      <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                        {responseError}
                      </div>
                    )}

                    {/* Dispute Toggle */}
                    <div className="flex gap-4 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                        <input
                          type="radio"
                          name="dispute_toggle"
                          checked={borrowerDisputed}
                          onChange={() => setBorrowerDisputed(true)}
                          className="accent-[#d96543]"
                        />
                        <span>I dispute this claim / fine</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                        <input
                          type="radio"
                          name="dispute_toggle"
                          checked={!borrowerDisputed}
                          onChange={() => setBorrowerDisputed(false)}
                          className="accent-[#114b3f]"
                        />
                        <span>I accept responsibility</span>
                      </label>
                    </div>

                    {/* Response Text */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                        Statement / Explanation
                      </label>
                      <textarea
                        value={borrowerResponseText}
                        onChange={(e) => setBorrowerResponseText(e.target.value)}
                        placeholder="Explain your account of the equipment condition, whether markings were pre-existing at SJT / TT handover..."
                        rows={3}
                        maxLength={5000}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
                      />
                    </div>

                    {/* Photos */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                          Counter-Evidence Photographs ({borrowerEvidenceUrls.length}/10)
                        </label>
                        {isUploadingCounterEvidence && (
                          <span className="text-[11px] font-mono text-[#d96543] animate-pulse">
                            Uploading...
                          </span>
                        )}
                      </div>

                      {uploadCounterError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                          {uploadCounterError}
                        </div>
                      )}

                      {borrowerEvidenceUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {borrowerEvidenceUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative w-18 h-18 rounded-xl border border-stone-200 overflow-hidden bg-stone-100 group"
                            >
                              <img
                                src={url}
                                alt={`Counter evidence ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveCounterPhoto(idx)}
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

                      {borrowerEvidenceUrls.length < 10 && (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleCounterFileUpload}
                            className="hidden"
                            id="counter-evidence-input"
                          />
                          <label
                            htmlFor="counter-evidence-input"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#114b3f]/40 bg-[#114b3f]/5 hover:bg-[#114b3f]/10 text-xs font-semibold text-[#114b3f] cursor-pointer transition-colors"
                          >
                            <span>Attach Counter-Evidence Photos</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingResponse || isUploadingCounterEvidence}
                        className="px-6 py-2.5 rounded-xl bg-[#114b3f] hover:bg-[#0d382f] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        {isSubmittingResponse ? 'Submitting Response...' : 'Submit Counter-Statement'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Section 3: Status Transition Audit History Timeline */}
              <div className="p-5 bg-white border border-[#e7e2d7] rounded-2xl space-y-3 shadow-xs">
                <span className="font-display text-xs font-bold text-[#114b3f] uppercase tracking-wide block border-b border-stone-100 pb-2">
                  Immutable State Machine Timeline ({history.length} events)
                </span>

                {history.length === 0 ? (
                  <p className="text-xs text-[#697a73] font-mono">No transition history recorded yet.</p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                    {history.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-start gap-4 pl-8 relative">
                        <span className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#114b3f] ring-4 ring-emerald-50"></span>
                        <div className="flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#114b3f]">
                              {STATUS_LABELS[item.newStatus as DisputeStatus]?.label || item.newStatus}
                            </span>
                            <span className="font-mono text-[10px] text-[#697a73]">
                              {formatTimestamp(item.createdAt)}
                            </span>
                          </div>
                          {item.notes && <p className="text-stone-700 mt-0.5">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Administrative Actions (Admin Only) */}
              {isAdmin && (
                <div className="p-5 bg-[#092620] text-white rounded-2xl space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-emerald-900 pb-2">
                    <span className="font-display text-xs font-bold text-emerald-300 uppercase tracking-wide">
                      Admin Adjudication Suite
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Authenticated Administrator</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!['RESOLVED', 'DISMISSED'].includes(claim.status) && (
                      <button
                        onClick={() => {
                          setShowAdminResolveForm((prev) => !prev);
                          setShowAdminReopenForm(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold transition-colors cursor-pointer"
                      >
                        {showAdminResolveForm ? 'Cancel Resolution' : 'Adjudicate & Resolve Case'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowAdminReopenForm((prev) => !prev);
                        setShowAdminResolveForm(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {showAdminReopenForm ? 'Cancel Reopening' : 'Reopen Case Exception'}
                    </button>
                  </div>

                  {/* Admin Resolve Form */}
                  {showAdminResolveForm && (
                    <form onSubmit={handleAdminResolve} className="p-4 bg-emerald-950/80 rounded-xl border border-emerald-800 space-y-4">
                      <h4 className="text-xs font-mono font-bold uppercase text-emerald-200">
                        Formal Dispute Resolution Form
                      </h4>

                      {adminResolveError && (
                        <div role="alert" className="p-3 bg-red-950 border border-red-700 text-xs text-red-200 rounded-lg">
                          {adminResolveError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-emerald-200">Determination</label>
                          <select
                            value={adminDecision}
                            onChange={(e) => setAdminDecision(e.target.value as 'RESOLVED' | 'DISMISSED')}
                            className="w-full px-3 py-2 rounded-lg bg-emerald-900 border border-emerald-700 text-xs text-white"
                          >
                            <option value="RESOLVED">Resolve (Affirm Fine or Partial Split)</option>
                            <option value="DISMISSED">Dismiss (No Fine / Wear & Tear)</option>
                          </select>
                        </div>

                        {adminDecision === 'RESOLVED' && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-mono text-emerald-200">Approved Fine (INR)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={adminApprovedFine}
                              onChange={(e) => setAdminApprovedFine(e.target.value)}
                              placeholder="e.g. 250"
                              className="w-full px-3 py-2 rounded-lg bg-emerald-900 border border-emerald-700 text-xs text-white"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-emerald-200">Administrative Decision Notes (Required)</label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Document rationale, examination of photo timestamps, wear-and-tear division, or reason for dismissal..."
                          rows={3}
                          required
                          className="w-full px-3 py-2 rounded-lg bg-emerald-900 border border-emerald-700 text-xs text-white placeholder-emerald-400/50"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="submit"
                          disabled={isAdminResolving}
                          className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isAdminResolving ? 'Finalizing Resolution...' : 'Finalize Determination'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Admin Reopen Form */}
                  {showAdminReopenForm && (
                    <form onSubmit={handleAdminReopen} className="p-4 bg-amber-950/80 rounded-xl border border-amber-800 space-y-4">
                      <h4 className="text-xs font-mono font-bold uppercase text-amber-200">
                        Admin Case Reopening Justification
                      </h4>

                      {adminReopenError && (
                        <div role="alert" className="p-3 bg-red-950 border border-red-700 text-xs text-red-200 rounded-lg">
                          {adminReopenError}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-amber-200">Reason for Late / Reopened Review (Required)</label>
                        <textarea
                          value={adminReopenReason}
                          onChange={(e) => setAdminReopenReason(e.target.value)}
                          placeholder="Document verifiable reason (e.g. hospitalization during 24h window, newly surfaced CCTV handover evidence)..."
                          rows={3}
                          required
                          className="w-full px-3 py-2 rounded-lg bg-amber-900 border border-amber-700 text-xs text-white placeholder-amber-400/50"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="submit"
                          disabled={isAdminReopening}
                          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isAdminReopening ? 'Reopening...' : 'Reopen Claim Dossier'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Lightbox / Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] p-2">
            <img
              src={previewImageUrl}
              alt="Evidence zoom"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
