import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ClearanceRequest } from '../types/index.js';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  DollarSign,
  BookOpen,
  Laptop,
  FileCheck2,
  AlertTriangle,
  User,
  Clock,
  ShieldCheck,
  Send
} from 'lucide-react';

export const DepartmentPortal: React.FC = () => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<ClearanceRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'RETURN' | 'REJECT' | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Department-specific state inputs
  const [booksReturned, setBooksReturned] = useState<boolean>(true);
  const [libraryFine, setLibraryFine] = useState<number>(0);
  const [itAssetsReturned, setItAssetsReturned] = useState<boolean>(true);
  const [adminRecordVerified, setAdminRecordVerified] = useState<boolean>(true);

  const role = user?.role;

  useEffect(() => {
    fetchAssignedRequests();
  }, [user]);

  const fetchAssignedRequests = async () => {
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

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    let endpoint = `/api/clearance/${selectedRequest.id}/approve`;
    if (actionType === 'RETURN') endpoint = `/api/clearance/${selectedRequest.id}/return`;
    if (actionType === 'REJECT') endpoint = `/api/clearance/${selectedRequest.id}/reject`;

    const verificationDetails: Record<string, any> = {};
    if (role === 'LIBRARY') {
      verificationDetails.booksReturned = booksReturned;
      verificationDetails.libraryFine = libraryFine;
    } else if (role === 'IT_DEPARTMENT') {
      verificationDetails.itAssetsReturned = itAssetsReturned;
    } else if (role === 'STUDENT_SECTION') {
      verificationDetails.adminRecordVerified = adminRecordVerified;
    }

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
          verificationDetails,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Request ${selectedRequest.requestId} ${actionType.toLowerCase()}ed successfully.`);
        setSelectedRequest(null);
        setActionType(null);
        setRemarks('');
        fetchAssignedRequests();
      } else {
        setErrorMsg(data.error || 'Action failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.requestId.toLowerCase().includes(q) ||
      r.student?.user.fullName.toLowerCase().includes(q) ||
      r.student?.studentId.toLowerCase().includes(q) ||
      r.student?.enrollmentNo.toLowerCase().includes(q)
    );
  });

  const getDepartmentTitle = () => {
    switch (role) {
      case 'ACCOUNT_SECTION': return 'Account Section - Fee & Dues Clearance Queue';
      case 'STUDENT_SECTION': return 'Student Section - Administrative Records Queue';
      case 'LIBRARY': return 'Library Department - Books & Overdue Fines Clearance';
      case 'IT_DEPARTMENT': return 'IT Infrastructure - Computing Assets & Access Clearance';
      default: return 'Department Clearance Review Queue';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Authorized Departmental Portal</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{getDepartmentTitle()}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Backend-enforced clearance authority with cryptographic signing and audit trail
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-900">{filteredRequests.length} Pending</div>
            <div className="text-[10px] text-slate-400">Assigned for clearance review</div>
          </div>
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
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, Student ID, or Request ID..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Program & Semester</th>
                <th className="py-3 px-4">Submitted At</th>
                {role === 'ACCOUNT_SECTION' && <th className="py-3 px-4">Fee Record</th>}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading assigned queue...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No requests currently pending for this department.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const feeRec = req.student?.feeRecords?.[0];
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{req.requestId}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{req.student?.user.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {req.student?.studentId} | Roll: {req.student?.enrollmentNo}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{req.student?.course.name}</div>
                        <div className="text-[10px] text-slate-500">{req.student?.semester.name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(req.submittedAt).toLocaleDateString()}
                      </td>

                      {/* Account Section specific fee display */}
                      {role === 'ACCOUNT_SECTION' && (
                        <td className="py-3 px-4">
                          {feeRec ? (
                            <div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                feeRec.outstandingBalance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {feeRec.outstandingBalance === 0 ? 'CLEARED ($0.00)' : `BAL: $${feeRec.outstandingBalance.toFixed(2)}`}
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                Paid: ${feeRec.paidAmount.toFixed(2)} / ${feeRec.totalFee.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No record</span>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setActionType('APPROVE');
                          }}
                          className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-all"
                        >
                          Review & Action
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

      {/* Review & Clearance Action Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Clearance Review: {selectedRequest.requestId}
                </h3>
                <p className="text-xs text-slate-500">
                  Student: {selectedRequest.student?.user.fullName} ({selectedRequest.student?.studentId})
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Department-Specific Verification Controls */}
            {role === 'ACCOUNT_SECTION' && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-700" />
                  <span>Account Section Official Fee Verification</span>
                </div>
                {selectedRequest.student?.feeRecords?.[0] ? (
                  <div className="text-xs space-y-1 text-slate-700">
                    <div>Total Prescribed Fee: <strong>${selectedRequest.student.feeRecords[0].totalFee.toFixed(2)}</strong></div>
                    <div>Total Paid to Date: <strong>${selectedRequest.student.feeRecords[0].paidAmount.toFixed(2)}</strong></div>
                    <div className="flex items-center gap-2">
                      <span>Outstanding Balance:</span>
                      <strong className={selectedRequest.student.feeRecords[0].outstandingBalance === 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        ${selectedRequest.student.feeRecords[0].outstandingBalance.toFixed(2)}
                      </strong>
                    </div>
                    {selectedRequest.student.feeRecords[0].outstandingBalance > 0 && (
                      <div className="p-2 bg-rose-100 border border-rose-300 text-rose-800 text-[11px] rounded font-medium mt-1">
                        ⚠️ Security Rule: Clearance cannot be approved while outstanding balance is greater than zero. You must Return or Reject.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-rose-600">No official fee record mapped for this student.</div>
                )}
              </div>
            )}

            {role === 'LIBRARY' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>Library Obligations & Book Returns Check</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={booksReturned}
                    onChange={(e) => setBooksReturned(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>All borrowed books returned and accounted for</span>
                </label>
                <div className="flex items-center gap-2">
                  <span>Outstanding Library Fine ($):</span>
                  <input
                    type="number"
                    value={libraryFine}
                    onChange={(e) => setLibraryFine(Number(e.target.value))}
                    className="w-20 p-1 border border-slate-300 rounded text-xs"
                    min="0"
                  />
                </div>
              </div>
            )}

            {role === 'IT_DEPARTMENT' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>IT Infrastructure & Asset Clearance</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itAssetsReturned}
                    onChange={(e) => setItAssetsReturned(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Campus computing assets, lab devices & accounts cleared</span>
                </label>
              </div>
            )}

            {role === 'STUDENT_SECTION' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Administrative & Conduct Verification</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminRecordVerified}
                    onChange={(e) => setAdminRecordVerified(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Student administrative records and conduct verified</span>
                </label>
              </div>
            )}

            {/* Action Type Selector */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActionType('APPROVE')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Approve Clearance
              </button>
              <button
                type="button"
                onClick={() => setActionType('RETURN')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                  actionType === 'RETURN'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Return for Info
              </button>
              <button
                type="button"
                onClick={() => setActionType('REJECT')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                  actionType === 'REJECT'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Reject Request
              </button>
            </div>

            {/* Remarks Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Staff Remarks {actionType !== 'APPROVE' && <span className="text-rose-500">* (Mandatory)</span>}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  actionType === 'APPROVE'
                    ? 'Verification confirmed and clearance granted.'
                    : 'State the specific discrepancy or clarification required...'
                }
                rows={3}
                required={actionType !== 'APPROVE'}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Submit Action */}
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
                onClick={handleAction}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : actionType === 'RETURN'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {submitting ? 'Signing & Recording...' : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
