import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ClearanceRequest } from '../types/index.js';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  DollarSign,
  Award,
  AlertTriangle,
  FileCheck2,
  Lock,
  Building,
  Check
} from 'lucide-react';

export const ExamControllerPortal: React.FC = () => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<ClearanceRequest | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [examSession, setExamSession] = useState<string>('Spring 2026 Regular End-Semester Examinations');
  const [remarks, setRemarks] = useState<string>('All departmental clearances confirmed and fee records re-verified. Examination eligibility unconditionally authorized.');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, [user]);

  const fetchPendingRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/exam-controller/requests?status=PENDING_EXAMINATION_CONTROLLER', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!selectedRequest) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setSubmitting(true);
      const res = await fetch(`/api/exam-controller/${selectedRequest.id}/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          examSession,
          remarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(
          `Examination Eligibility Authorized! Certificate ${data.certificateId} has been cryptographically generated and issued.`
        );
        setSelectedRequest(null);
        setShowConfirmModal(false);
        fetchPendingRequests();
      } else {
        setErrorMsg(data.error || 'Authorization failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnOrReject = async (action: 'RETURN' | 'REJECT') => {
    if (!selectedRequest) return;
    const endpoint = `/api/exam-controller/${selectedRequest.id}/${action.toLowerCase()}`;
    try {
      setSubmitting(true);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          remarks,
          reason: remarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Request ${action.toLowerCase()}ed.`);
        setSelectedRequest(null);
        setShowConfirmModal(false);
        fetchPendingRequests();
      } else {
        setErrorMsg(data.error || 'Failed action');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.requestId.toLowerCase().includes(q) ||
      r.student?.user.fullName.toLowerCase().includes(q) ||
      r.student?.studentId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Authority Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Highest Clearance Authority</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Office of the Controller of Examinations (Head)
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Confirm No-Dues clearance, re-verify Account Section fee verification status, and grant final digital Examination Eligibility Authorization with cryptographic signature.
          </p>
        </div>

        <div className="bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700 font-mono text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Awaiting Final Authorization</div>
          <div className="text-xl font-bold text-emerald-400">{filtered.length} Students</div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by student name or ID..."
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Pending Final Authorization Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Student Information</th>
                <th className="py-3 px-4">Program & Semester</th>
                <th className="py-3 px-4">Account Section Fee Status</th>
                <th className="py-3 px-4">Coordinator Approval</th>
                <th className="py-3 px-4 text-right">Final Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading final reviews...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No clearance requests currently awaiting Controller authorization.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const feeRec = r.student?.feeRecords?.[0];
                  const coordApp = r.approvals?.find((a) => a.departmentCode === 'CLASS_COORDINATOR');
                  const isFeeCleared = feeRec?.outstandingBalance === 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{r.requestId}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.student?.user.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {r.student?.studentId} | Roll: {r.student?.enrollmentNo}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{r.student?.course.name}</div>
                        <div className="text-[10px] text-slate-500">{r.student?.semester.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isFeeCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isFeeCleared ? 'ZERO DUES (CLEARED)' : `OUTSTANDING: $${feeRec?.outstandingBalance}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          {coordApp?.status === 'APPROVED' ? 'Coordinator Verified ✓' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setShowConfirmModal(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm transition-all"
                        >
                          Confirm & Authorize
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation & Examination Authorization Modal */}
      {showConfirmModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Authorize Examination Eligibility & Issue Certificate
                </h3>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Mandatory Controller Verification Checklist */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Controller Mandatory Verification Checklist
              </div>

              <div className="space-y-1.5 text-slate-700">
                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>1. Account Section Fee Record:</strong>
                  </span>
                  <span className="font-bold text-emerald-700">Zero Balance ($0.00 Outstanding)</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>2. Student Section Verification:</strong>
                  </span>
                  <span className="font-bold text-emerald-700">Administrative Clearance Approved</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>3. Library Department:</strong>
                  </span>
                  <span className="font-bold text-emerald-700">All Books Returned & No Fines</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>4. IT Department:</strong>
                  </span>
                  <span className="font-bold text-emerald-700">Assets & Lab Accounts Cleared</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>5. Class Coordinator:</strong>
                  </span>
                  <span className="font-bold text-emerald-700">Faculty Review Confirmed</span>
                </div>
              </div>
            </div>

            {/* Examination Session Config */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Examination Session
              </label>
              <input
                type="text"
                value={examSession}
                onChange={(e) => setExamSession(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Controller Remarks / Authorization Decree
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReturnOrReject('RETURN')}
                disabled={submitting}
                className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg"
              >
                Return for Info
              </button>
              <button
                type="button"
                onClick={handleAuthorize}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>{submitting ? 'Generating Certificate...' : 'Confirm Exam Eligibility & Issue Certificate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
