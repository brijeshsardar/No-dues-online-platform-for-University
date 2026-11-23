import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ClearanceRequest } from '../types/index.js';
import {
  Laptop,
  CheckCircle,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  User,
  Clock,
  Send,
  HardDrive,
  FileCheck
} from 'lucide-react';

export const ITDepartmentPortal: React.FC = () => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ClearanceRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'RETURN' | 'REJECT' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // IT Checklist State
  const [labHardwareReturned, setLabHardwareReturned] = useState(true);
  const [computingAccountDeactivated, setComputingAccountDeactivated] = useState(true);
  const [smartCardReturned, setSmartCardReturned] = useState(true);

  useEffect(() => {
    fetchITRequests();
  }, [user]);

  const fetchITRequests = async () => {
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

    const verificationDetails = {
      labHardwareReturned,
      computingAccountDeactivated,
      smartCardReturned,
      departmentCode: 'IT',
      verifiedBy: user?.fullName,
      timestamp: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          remarks: remarks || `IT department hardware assets and lab accounts verified by ${user?.fullName}`,
          reason: remarks,
          verificationDetails,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Clearance Request ${selectedRequest.requestId} ${actionType.toLowerCase()}ed with cryptographic integrity hash.`);
        setSelectedRequest(null);
        setActionType(null);
        setRemarks('');
        fetchITRequests();
      } else {
        setErrorMsg(data.error || 'Failed to process request.');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* IT Header */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Laptop className="w-4 h-4" />
            <span>IT Infrastructure & Asset Clearance</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            IT Department Clearance Dashboard
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Verified Officer: <strong className="text-white">{user?.fullName}</strong> | Station: <strong className="text-white">Central Campus IT Network Operations Center</strong>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Department Code</div>
            <div className="font-bold text-cyan-300 text-sm">IT_DEPARTMENT</div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <div className="text-slate-400 text-[10px] uppercase">Pending in Queue</div>
            <div className="font-bold text-white text-sm">{requests.length} Requests</div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
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
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting IT Sign-off</span>
            <Clock className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{requests.length}</div>
          <p className="text-xs text-slate-500 mt-1">Sequential Stage 4</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Hardware Verification</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">Lab Check Active</div>
          <p className="text-xs text-slate-500 mt-1">Peripherals & smart access cards</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cryptographic Hash</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">SHA-256 Active</div>
          <p className="text-xs text-slate-500 mt-1">Approval integrity digest generated</p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-base text-slate-900">IT Department Clearance Queue</h3>
            <p className="text-xs text-slate-500">
              Students who have passed Account, Student Section, and Library approvals, or submitted an IT reapplication
            </p>
          </div>

          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search request or student..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
            No clearance requests currently awaiting IT department approval.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Student ID</th>
                  <th className="py-3 px-3">Status / Queue Type</th>
                  <th className="py-3 px-3">Program & Sem</th>
                  <th className="py-3 px-3">Remarks</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => {
                  const itApproval = req.approvals?.find((a) => a.departmentCode === 'IT');
                  const isReapplication = itApproval?.status === 'REAPPLICATION_SUBMITTED';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-700">
                        {req.requestId}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {req.student?.user.fullName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {req.student?.studentId}
                      </td>
                      <td className="py-3 px-3">
                        {isReapplication ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit">
                            <RotateCcw className="w-3 h-3 text-blue-600" />
                            <span>Reapplication Submitted</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            Initial Queue
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {req.student?.course?.name} ({req.semester?.name})
                      </td>
                      <td className="py-3 px-3 text-slate-500 italic max-w-xs truncate">
                        {isReapplication ? itApproval?.reapplicationRemarks : req.submissionRemarks || 'No remarks'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('APPROVE');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                          >
                            {isReapplication ? 'Re-Approve' : 'Approve IT'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('REJECT');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {actionType === 'APPROVE' ? 'Authorize IT Clearance' : 'Reject IT Clearance'}
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div>Request: <strong className="font-mono text-cyan-800">{selectedRequest.requestId}</strong></div>
              <div>Student: <strong>{selectedRequest.student?.user.fullName}</strong> ({selectedRequest.student?.studentId})</div>
            </div>

            {/* Student Reapplication Note */}
            {selectedRequest.approvals?.find((a) => a.departmentCode === 'IT')?.reapplicationRemarks && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Student Reapplication Response:</span>
                </div>
                <div className="text-slate-800 italic">
                  "{selectedRequest.approvals?.find((a) => a.departmentCode === 'IT')?.reapplicationRemarks}"
                </div>
              </div>
            )}

            {actionType === 'APPROVE' && (
              <div className="space-y-2.5 p-3 bg-cyan-50/50 rounded-xl border border-cyan-200 text-xs">
                <span className="font-bold text-cyan-900 block">IT Asset Verification Checklist:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labHardwareReturned}
                    onChange={(e) => setLabHardwareReturned(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Laboratory peripherals & hardware returned</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={computingAccountDeactivated}
                    onChange={(e) => setComputingAccountDeactivated(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Campus computing & cloud lab account de-provisioned</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smartCardReturned}
                    onChange={(e) => setSmartCardReturned(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Lab access smart-keycard returned</span>
                </label>
              </div>
            )}

            <form onSubmit={handleAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Verification Remarks / Reason *
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    actionType === 'APPROVE'
                      ? 'e.g. All computing assets and lab accounts cleared.'
                      : 'e.g. Returned due to unreturned IoT lab development board.'
                  }
                  required={actionType !== 'APPROVE'}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionType(null);
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md disabled:opacity-50 ${
                    actionType === 'APPROVE' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submitting ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
