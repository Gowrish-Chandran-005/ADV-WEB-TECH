import React, { useState, useEffect, useCallback } from 'react';
import {
  damageClaimsApi,
  complaintsApi,
  type ApiDamageClaim,
  type ApiComplaint,
  type ApiUser,
  type DisputeStatus,
  ApiError,
} from '../../services/api';
import { DamageClaimDetailModal } from './DamageClaimDetailModal';

interface AdminDisputesScreenProps {
  currentUser: ApiUser | null;
  onNavigateHome: () => void;
}

const CLAIM_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'AWAITING_BORROWER_RESPONSE', label: 'Awaiting Borrower' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const COMPLAINT_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

export const AdminDisputesScreen: React.FC<AdminDisputesScreenProps> = ({
  currentUser,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'complaints'>('claims');

  // Claims State
  const [claims, setClaims] = useState<ApiDamageClaim[]>([]);
  const [claimStatusFilter, setClaimStatusFilter] = useState('ALL');
  const [claimPage, setClaimPage] = useState(1);
  const [claimTotalPages, setClaimTotalPages] = useState(1);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);

  // Complaints State
  const [complaints, setComplaints] = useState<ApiComplaint[]>([]);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('ALL');
  const [complaintPage, setComplaintPage] = useState(1);
  const [complaintTotalPages, setComplaintTotalPages] = useState(1);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);

  // Selected Claim for Detail Modal
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  // Update Complaint State
  const [editingComplaint, setEditingComplaint] = useState<ApiComplaint | null>(null);
  const [complaintStatusUpdate, setComplaintStatusUpdate] = useState<'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'>('UNDER_REVIEW');
  const [complaintAdminNotes, setComplaintAdminNotes] = useState('');
  const [isUpdatingComplaint, setIsUpdatingComplaint] = useState(false);
  const [updateComplaintError, setUpdateComplaintError] = useState<string | null>(null);

  const loadClaims = useCallback(async () => {
    setIsLoadingClaims(true);
    setClaimsError(null);
    try {
      const res = await damageClaimsApi.list({
        status: claimStatusFilter,
        page: claimPage,
        pageSize: 15,
      });
      setClaims(res.items);
      setClaimTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setClaimsError(err.message);
      } else {
        setClaimsError('Failed to load damage claims.');
      }
    } finally {
      setIsLoadingClaims(false);
    }
  }, [claimStatusFilter, claimPage]);

  const loadComplaints = useCallback(async () => {
    setIsLoadingComplaints(true);
    setComplaintsError(null);
    try {
      const res = await complaintsApi.list({
        status: complaintStatusFilter,
        page: complaintPage,
        pageSize: 15,
      });
      setComplaints(res.items);
      setComplaintTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setComplaintsError(err.message);
      } else {
        setComplaintsError('Failed to load complaints.');
      }
    } finally {
      setIsLoadingComplaints(false);
    }
  }, [complaintStatusFilter, complaintPage]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      if (activeTab === 'claims') {
        loadClaims();
      } else {
        loadComplaints();
      }
    }
  }, [currentUser, activeTab, loadClaims, loadComplaints]);

  // Security gate: non-admin users cannot access this screen
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 font-mono font-bold flex items-center justify-center mx-auto text-xl">
          403
        </div>
        <h2 className="font-display text-2xl font-bold text-[#114b3f]">Access Restricted</h2>
        <p className="text-xs text-[#697a73] max-w-md mx-auto">
          The administrative dispute and grievance portal is restricted to authorized campus moderators.
        </p>
        <button
          onClick={onNavigateHome}
          className="px-6 py-2.5 rounded-xl bg-[#114b3f] text-white text-xs font-bold hover:bg-[#0c382f] cursor-pointer"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const handleSaveComplaintStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComplaint) return;
    setUpdateComplaintError(null);
    setIsUpdatingComplaint(true);

    try {
      const res = await complaintsApi.update(editingComplaint.id, {
        status: complaintStatusUpdate,
        adminNotes: complaintAdminNotes.trim() ? complaintAdminNotes.trim() : null,
      });

      setComplaints((prev) => prev.map((c) => (c.id === res.complaint.id ? res.complaint : c)));
      setEditingComplaint(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setUpdateComplaintError(err.message);
      } else {
        setUpdateComplaintError('Failed to update complaint status.');
      }
    } finally {
      setIsUpdatingComplaint(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e7e2d7] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d96543]">
              Administrative Portal
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
              VIT Vellore Moderator Access
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-[#114b3f] tracking-tight mt-1">
            Campus Disputes &amp; Adjudication
          </h1>
          <p className="text-xs text-[#697a73] font-mono mt-1">
            Formal damage dispute review, photographic evidence comparison, and student grievance moderation.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-200/80 p-1 rounded-2xl border border-stone-300/80">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'claims'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Damage Claims
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'complaints'
                ? 'bg-[#114b3f] text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Student Grievances
          </button>
        </div>
      </div>

      {/* Tab Content: Damage Claims */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e7e2d7]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[#114b3f]">Filter Status:</span>
              <select
                value={claimStatusFilter}
                onChange={(e) => {
                  setClaimStatusFilter(e.target.value);
                  setClaimPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#e7e2d7] bg-[#fbf9f5] text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
              >
                {CLAIM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-mono text-[#697a73]">
              Page {claimPage} of {claimTotalPages}
            </div>
          </div>

          {claimsError && (
            <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
              {claimsError}
            </div>
          )}

          {isLoadingClaims ? (
            <div className="py-16 text-center text-xs text-[#697a73] font-mono">
              Loading damage dispute dossiers...
            </div>
          ) : claims.length === 0 ? (
            <div className="p-12 bg-white border border-[#e7e2d7] rounded-3xl text-center space-y-2">
              <p className="text-sm font-bold text-[#114b3f]">No claims match the selected criteria.</p>
              <p className="text-xs text-[#697a73]">
                Disputes filed by equipment lenders will appear here for administrative adjudication.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-white border border-[#e7e2d7] rounded-3xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-mono text-stone-500 uppercase">
                        {claim.id.slice(0, 8)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-stone-100 text-stone-800">
                        {claim.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-[#114b3f] line-clamp-1">
                      {claim.equipmentTitle || 'Equipment Claim'}
                    </h3>

                    <p className="text-xs text-[#1c2421] line-clamp-2 leading-relaxed">
                      {claim.description}
                    </p>

                    <div className="pt-2 border-t border-stone-100 text-[11px] space-y-1 text-stone-600 font-mono">
                      <div>Lender: {claim.reporterFullName || 'Verified Lender'}</div>
                      <div>Borrower: {claim.renterFullName || 'Verified Borrower'}</div>
                      {claim.proposedFineAmount && (
                        <div className="text-amber-800 font-bold">
                          Proposed Fine: ₹{claim.proposedFineAmount}
                        </div>
                      )}
                      {claim.finalApprovedFine !== null && (
                        <div className="text-emerald-800 font-bold">
                          Approved Fine: ₹{claim.finalApprovedFine}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedClaimId(claim.id)}
                      className="w-full py-2.5 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold transition-colors cursor-pointer text-center"
                    >
                      Review Claim Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {claimTotalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                disabled={claimPage <= 1}
                onClick={() => setClaimPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl border border-[#e7e2d7] bg-white disabled:opacity-40 text-xs font-bold"
              >
                Previous
              </button>
              <button
                disabled={claimPage >= claimTotalPages}
                onClick={() => setClaimPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl border border-[#e7e2d7] bg-white disabled:opacity-40 text-xs font-bold"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Student Complaints */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e7e2d7]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[#114b3f]">Filter Status:</span>
              <select
                value={complaintStatusFilter}
                onChange={(e) => {
                  setComplaintStatusFilter(e.target.value);
                  setComplaintPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#e7e2d7] bg-[#fbf9f5] text-xs text-[#1c2421] focus:outline-none focus:ring-2 focus:ring-[#114b3f]/30"
              >
                {COMPLAINT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-mono text-[#697a73]">
              Page {complaintPage} of {complaintTotalPages}
            </div>
          </div>

          {complaintsError && (
            <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
              {complaintsError}
            </div>
          )}

          {isLoadingComplaints ? (
            <div className="py-16 text-center text-xs text-[#697a73] font-mono">
              Loading campus complaints...
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 bg-white border border-[#e7e2d7] rounded-3xl text-center space-y-2">
              <p className="text-sm font-bold text-[#114b3f]">No grievances recorded under this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-[#e7e2d7] rounded-3xl p-6 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#114b3f]">{c.category}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-stone-100 border border-stone-200">
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#697a73]">
                      Logged: {formatTimestamp(c.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-[#1c2421] leading-relaxed whitespace-pre-wrap">
                    {c.description}
                  </p>

                  {c.adminNotes && (
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 space-y-1">
                      <span className="font-bold text-[10px] font-mono uppercase text-[#114b3f] block">
                        Admin Review Notes
                      </span>
                      <p className="text-[11px] leading-relaxed">{c.adminNotes}</p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setEditingComplaint(c);
                        setComplaintStatusUpdate(c.status === 'OPEN' ? 'UNDER_REVIEW' : (c.status as any));
                        setComplaintAdminNotes(c.adminNotes || '');
                      }}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Update Review Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complaint Update Modal */}
      {editingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fbf9f5] w-full max-w-lg rounded-3xl shadow-2xl border border-[#e7e2d7] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-display text-base font-bold text-[#114b3f]">Update Complaint Status</h3>
              <button
                onClick={() => setEditingComplaint(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center cursor-pointer hover:bg-stone-200 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {updateComplaintError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {updateComplaintError}
              </div>
            )}

            <form onSubmit={handleSaveComplaintStatus} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">New Status</label>
                <select
                  value={complaintStatusUpdate}
                  onChange={(e) => setComplaintStatusUpdate(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#e7e2d7] bg-white text-xs"
                >
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#114b3f]">Admin Notes</label>
                <textarea
                  value={complaintAdminNotes}
                  onChange={(e) => setComplaintAdminNotes(e.target.value)}
                  placeholder="Record outcome, corrective student warning, or resolution notes..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#e7e2d7] bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingComplaint(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingComplaint}
                  className="px-5 py-2 rounded-xl bg-[#114b3f] hover:bg-[#0c382f] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingComplaint ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Detail Modal */}
      {selectedClaimId && (
        <DamageClaimDetailModal
          claimId={selectedClaimId}
          isOpen={true}
          onClose={() => setSelectedClaimId(null)}
          currentUser={currentUser}
          onClaimUpdated={() => {
            loadClaims();
          }}
        />
      )}
    </div>
  );
};
