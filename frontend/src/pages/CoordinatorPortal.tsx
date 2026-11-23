import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ClearanceRequest } from '../types/index.js';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  User,
  GraduationCap,
  Building2,
  AlertTriangle,
  History,
  ShieldCheck,
  Check
} from 'lucide-react';

export const CoordinatorPortal: React.FC = () => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<ClearanceRequest | null>(null);
  const [remarks, setRemarks] = useState<string>('Academic eligibility and department clearances verified. Approved for Examination Controller.');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/clearance/assigned', {
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

  const handleAction = async (action: 'APPROVE' | 'RETURN' | 'REJECT') => {
    if (!selectedRequest) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    let endpoint = `/api/clearance/${selectedRequest.id}/approve`;
    if (action === 'RETURN') endpoint = `/api/clearance/${selectedRequest.id}/return`;
    if (action === 'REJECT') endpoint = `/api/clearance/${selectedRequest.id}/reject`;

    try {
      setSubmitting(true);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          departmentCode: 'CLASS_COORDINATOR',
          remarks,
          reason: remarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Coordinator review recorded: Request ${action.toLowerCase()}ed.`);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        setErrorMsg(data.error || 'Action failed.');
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
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Academic Faculty Clearance</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Class Coordinator - Department Clearance Review Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review completed departmental approvals (Account, Student Section, Library, IT) before forwarding to Examination Controller
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-slate-900">{filtered.length} Requests Awaiting Coordinator Approval</div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold hover:underline">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search student name or ID..."
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Student Name & ID</th>
                <th className="py-3 px-4">Course & Sem</th>
                <th className="py-3 px-4">Department Statuses</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">No requests awaiting coordinator review.</td></tr>
              ) : (
                filtered.map((r) => {
                  const coordApproval = r.approvals?.find((a) => a.departmentCode === 'CLASS_COORDINATOR');
                  const isReapplication = coordApproval?.status === 'REAPPLICATION_SUBMITTED';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{r.requestId}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.student?.user.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.student?.studentId} | {r.student?.enrollmentNo}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{r.student?.course.name}</div>
                        <div className="text-[10px] text-slate-500">{r.student?.semester.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {['ACCOUNT', 'STUDENT_SECTION', 'LIBRARY', 'IT'].map((dept) => {
                            const app = r.approvals?.find((a) => a.departmentCode === dept);
                            return (
                              <span
                                key={dept}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                  app?.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : app?.status === 'REAPPLICATION_SUBMITTED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {dept}: {app?.status || 'PENDING'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedRequest(r)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm"
                        >
                          {isReapplication ? 'Review Reapplication' : 'Coordinator Review'}
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

      {/* Review Dossier Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Coordinator Clearance Review: {selectedRequest.requestId}
                </h3>
                <p className="text-xs text-slate-500">
                  Student: {selectedRequest.student?.user.fullName} ({selectedRequest.student?.studentId})
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* If Reapplication Submitted, show Student's explanation */}
            {selectedRequest.approvals?.find((a) => a.departmentCode === 'CLASS_COORDINATOR')?.reapplicationRemarks && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Student Reapplication Explanation:</span>
                </div>
                <div className="text-slate-800 italic">
                  "{selectedRequest.approvals?.find((a) => a.departmentCode === 'CLASS_COORDINATOR')?.reapplicationRemarks}"
                </div>
              </div>
            )}

            {/* Department Approval Dossier Checklist */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Prior Department Verification Checklist
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedRequest.approvals
                  ?.filter((a) => ['ACCOUNT', 'STUDENT_SECTION', 'LIBRARY', 'IT'].includes(a.departmentCode))
                  .map((a) => (
                    <div key={a.departmentCode} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{a.departmentCode.replace(/_/g, ' ')}</span>
                        <span className={`font-bold flex items-center gap-0.5 ${a.status === 'APPROVED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {a.status === 'APPROVED' ? <Check className="w-3.5 h-3.5" /> : null}
                          {a.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 italic">
                        "{a.remarks || 'Cleared by department officer'}"
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coordinator Evaluation Remarks / Justification
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction('REJECT')}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleAction('APPROVE')}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
              >
                {submitting ? 'Approving...' : 'Approve & Route to Exam Controller'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
