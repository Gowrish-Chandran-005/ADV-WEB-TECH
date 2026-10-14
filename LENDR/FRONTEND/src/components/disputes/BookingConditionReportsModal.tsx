import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  conditionReportsApi,
  uploadApi,
  type ApiBookingConditionReport,
  type ConditionReportType,
  type EquipmentCondition,
  ApiError,
} from '../../services/api';

interface BookingConditionReportsModalProps {
  bookingId: string;
  gearTitle: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

const REPORT_TYPE_LABELS: Record<ConditionReportType, string> = {
  HANDOVER: 'Handover Condition',
  RETURN: 'Return Condition',
  DAMAGE_INSPECTION: 'Damage Inspection',
};

const CONDITION_RATING_LABELS: Record<EquipmentCondition, { label: string; desc: string }> = {
  NEW: { label: 'New', desc: 'Flawless condition, original packaging or unused' },
  LIKE_NEW: { label: 'Like New', desc: 'Minimal signs of use, fully functional optics and mechanics' },
  GOOD: { label: 'Good', desc: 'Minor cosmetic wear, all features verified working' },
  FAIR: { label: 'Fair', desc: 'Visible scratches or cosmetic marks, fully operational' },
  POOR: { label: 'Poor', desc: 'Heavy wear, functional quirks, or pre-existing damage' },
};

export const BookingConditionReportsModal: React.FC<BookingConditionReportsModalProps> = ({
  bookingId,
  gearTitle,
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [reports, setReports] = useState<ApiBookingConditionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ConditionReportType>('HANDOVER');
  const [condition, setCondition] = useState<EquipmentCondition>('GOOD');
  const [notes, setNotes] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active view image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!bookingId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await conditionReportsApi.list(bookingId);
      setReports(res.items);
    } catch (err) {
      if (err instanceof ApiError) {
        setLoadError(err.message);
      } else {
        setLoadError('Failed to load condition reports.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (isOpen) {
      loadReports();
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  }, [isOpen, loadReports]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceUrls.length + files.length > 10) {
      setUploadError('Maximum 10 evidence photos allowed per condition report.');
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

    if (notes.trim().length > 3000) {
      setSubmitError('Notes cannot exceed 3000 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await conditionReportsApi.create(bookingId, {
        reportType,
        condition,
        notes: notes.trim(),
        evidenceUrls,
      });

      setReports((prev) => [res.conditionReport, ...prev]);
      setSubmitSuccess('Condition report recorded with server verification timestamp.');
      setNotes('');
      setEvidenceUrls([]);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to record condition report. Please try again.');
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
      <div className="bg-[#fbf9f5] w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#e7e2d7] flex flex-col overflow-hidden modal-card-enter">
        {/* Header */}
        <div className="p-6 border-b border-[#e7e2d7] flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
                Audit Trail
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-[10px] font-mono text-[#697a73]">{bookingId.slice(0, 8)}</span>
            </div>
            <h2 className="font-display text-xl font-bold text-[#114b3f]">Equipment Condition Reports</h2>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1: Previous Condition Reports */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#114b3f] uppercase tracking-wide">
                Recorded Condition History
              </h3>
              <span className="text-xs font-mono text-[#697a73]">{reports.length} snapshot(s)</span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#697a73] font-mono">
                Loading verified condition records...
              </div>
            ) : loadError ? (
              <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
                {loadError}
              </div>
            ) : reports.length === 0 ? (
              <div className="p-6 bg-white border border-[#e7e2d7] rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-[#114b3f]">No condition reports filed yet.</p>
                <p className="text-[11px] text-[#697a73]">
                  Both lender and borrower can record condition observations before handover or upon return.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-white border border-[#e7e2d7] rounded-2xl space-y-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {REPORT_TYPE_LABELS[report.reportType] || report.reportType}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-stone-100 text-stone-700">
                          Condition: {report.condition.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#697a73]">
                        {formatTimestamp(report.createdAt)}
                      </div>
                    </div>

                    {report.notes && (
                      <p className="text-xs text-[#1c2421] leading-relaxed whitespace-pre-wrap">
                        {report.notes}
                      </p>
                    )}

                    {report.evidenceUrls && report.evidenceUrls.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono uppercase text-[#697a73] block">
                          Attached Photographs ({report.evidenceUrls.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {report.evidenceUrls.map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreviewImageUrl(url)}
                              className="w-16 h-16 rounded-xl border border-stone-200 overflow-hidden shrink-0 hover:opacity-85 transition-opacity cursor-pointer bg-stone-100"
                            >
                              <img
                                src={url}
                                alt={`Evidence ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Submit New Condition Report */}
          <div className="border-t border-[#e7e2d7] pt-6 space-y-4">
            <div>
              <h3 className="font-display text-sm font-bold text-[#114b3f] uppercase tracking-wide">
                Record New Condition Evidence
              </h3>
              <p className="text-xs text-[#697a73] mt-0.5">
                Take photographs during handover or return to ensure mutual protection against false damage claims.
              </p>
            </div>

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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Report Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                    Report Milestone
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ConditionReportType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
                  >
                    <option value="HANDOVER">Handover Condition (Pre-Rental)</option>
                    <option value="RETURN">Return Condition (Post-Rental)</option>
                    <option value="DAMAGE_INSPECTION">Damage Inspection Check</option>
                  </select>
                </div>

                {/* Rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                    Assessed Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
                  >
                    {Object.entries(CONDITION_RATING_LABELS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label} — {item.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                    Condition Notes &amp; Observations
                  </label>
                  <span className="text-[10px] font-mono text-[#697a73]">
                    {notes.length}/3000 chars
                  </span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note existing cosmetic marks, battery state, clean optics, or any observed functional details..."
                  rows={3}
                  maxLength={3000}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30 placeholder:text-stone-400"
                />
              </div>

              {/* Photos Attachment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">
                    Evidence Photographs ({evidenceUrls.length}/10)
                  </label>
                  {isUploading && (
                    <span className="text-[11px] font-mono text-[#d96543] animate-pulse">
                      Uploading to secure server...
                    </span>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {uploadError}
                  </div>
                )}

                {/* Photo Previews */}
                {evidenceUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {evidenceUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative w-20 h-20 rounded-xl border border-stone-200 overflow-hidden bg-stone-100 group"
                      >
                        <img
                          src={url}
                          alt={`Uploaded evidence ${index + 1}`}
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

                {/* Upload Button */}
                {evidenceUrls.length < 10 && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="condition-evidence-input"
                    />
                    <label
                      htmlFor="condition-evidence-input"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#114b3f]/40 bg-[#114b3f]/5 hover:bg-[#114b3f]/10 text-xs font-semibold text-[#114b3f] cursor-pointer transition-colors"
                    >
                      <span>Upload Photos</span>
                      <span className="text-[10px] font-mono text-[#697a73]">(JPG, PNG, WEBP up to 5MB)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-[#e7e2d7] bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-[#114b3f] hover:bg-[#0d382f] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Recording Snapshot...' : 'Save Condition Record'}
                </button>
              </div>
            </form>
          </div>
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
