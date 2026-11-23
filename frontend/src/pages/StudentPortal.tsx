import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ClearanceRequest, FeeRecord, PaymentTransaction } from '../types/index.js';
import {
  FileText,
  DollarSign,
  GraduationCap,
  Award,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Building,
  User,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  Receipt,
  Printer,
  ChevronRight,
  Info,
  Check,
  X,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENT_METADATA: Record<string, { name: string; icon: string; description: string }> = {
  ACCOUNT: {
    name: 'Account Section (Fee Clearance)',
    icon: 'DollarSign',
    description: 'Tuition fees, lab fees, and university financial liabilities',
  },
  STUDENT_SECTION: {
    name: 'Student Affairs Section',
    icon: 'User',
    description: 'Identity cards, administrative documents, and code of conduct',
  },
  LIBRARY: {
    name: 'University Library',
    icon: 'Building',
    description: 'Book return audit and overdue fine settlement',
  },
  IT: {
    name: 'IT Department',
    icon: 'Laptop',
    description: 'Computing hardware assets, smart cards, and campus accounts',
  },
  CLASS_COORDINATOR: {
    name: 'Class Coordinator',
    icon: 'GraduationCap',
    description: 'Academic attendance (>= 75%) and continuous evaluation',
  },
  EXAM_CONTROLLER: {
    name: 'Controller of Examinations',
    icon: 'Award',
    description: 'Final eligibility validation and certificate issuance',
  },
};

export const StudentPortal: React.FC = () => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<FeeRecord | null>(null);
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [remarks, setRemarks] = useState<string>('');
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Department-Specific Reapplication Modal State
  const [reapplyDept, setReapplyDept] = useState<{ code: string; name: string; rejectionReason?: string } | null>(null);
  const [reapplyStudentRemarks, setReapplyStudentRemarks] = useState<string>('');

  // Payment Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);
  const [showReceiptHistory, setShowReceiptHistory] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const fetchStudentData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [resProfile, resFee, resReq] = await Promise.all([
        fetch('/api/student/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student/fee-details', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student/requests', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resProfile.ok) {
        const d = await resProfile.json();
        setProfile(d.student);
      }
      if (resFee.ok) {
        const d = await resFee.json();
        setFeeRecord(d.feeRecord);
      }
      if (resReq.ok) {
        const d = await resReq.json();
        setRequests(d.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setSubmitting(true);
      const res = await fetch('/api/student/requests/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Clearance Request ${data.request.requestId} submitted successfully.`);
        setShowSubmitModal(false);
        setRemarks('');
        fetchStudentData();
      } else {
        setErrorMsg(data.error || 'Failed to submit clearance request.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Department-Specific Reapplication
  const handleDepartmentReapply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !reapplyDept) return;
    if (!reapplyStudentRemarks.trim()) {
      setErrorMsg('Please enter an explanation or remarks for reapplication.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setSubmitting(true);
      const res = await fetch(`/api/student/requests/${activeRequest.id}/reapply/${reapplyDept.code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          remarks: reapplyStudentRemarks.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(
          `Reapplication submitted to ${reapplyDept.name} successfully! Approved departments remain intact.`
        );
        setReapplyDept(null);
        setReapplyStudentRemarks('');
        fetchStudentData();
      } else {
        setErrorMsg(data.error || 'Failed to submit reapplication.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Reapplication error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRequest = requests[0]; // Most recent
  const transactions = feeRecord?.transactions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Profile Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Student Academic & No-Dues Clearance Portal</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Welcome, {user?.fullName}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Program: <strong className="text-white">{profile?.course?.name || 'B.Tech CSE'}</strong> | Current: <strong className="text-white">{profile?.semester?.name || '5th Semester'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Student ID</div>
            <div className="font-bold text-white text-sm">{profile?.studentId || 'CT-2026-1042'}</div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <div className="text-slate-400 text-[10px] uppercase">Enrollment No</div>
            <div className="font-bold text-blue-300 text-sm">{profile?.enrollmentNo || 'EN202609812'}</div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold hover:underline text-xs">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold hover:underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Primary Status Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Fee Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Fee Account Status</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {feeRecord?.outstandingBalance === 0 ? '₹0 Due' : `₹${feeRecord?.outstandingBalance.toLocaleString()} Due`}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total: ₹{feeRecord?.totalFee.toLocaleString() || '0'} | Paid: ₹{feeRecord?.paidAmount.toLocaleString() || '0'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              feeRecord?.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {feeRecord?.paymentStatus === 'PAID' ? 'PAID' : feeRecord?.paidAmount ? 'PARTIALLY PAID' : 'PENDING'}
            </span>
            {transactions.length > 0 && (
              <button
                onClick={() => setShowReceiptHistory(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-0.5"
              >
                <span>{transactions.length} Receipts</span>
              </button>
            )}
          </div>
        </div>

        {/* Clearance Request Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">No-Dues Application</span>
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-slate-900 truncate">
              {activeRequest ? activeRequest.requestId : 'Not Applied'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {activeRequest ? `Stage: ${activeRequest.currentStage.replace(/_/g, ' ')}` : 'Ready to apply'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">
              {activeRequest ? activeRequest.overallStatus.replace(/_/g, ' ') : 'No Active Request'}
            </span>
            {activeRequest?.approvals?.some((a) => a.status === 'REJECTED') && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Action Required</span>
            )}
          </div>
        </div>

        {/* Examination Eligibility */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Exam Eligibility</span>
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {activeRequest?.examEligibility ? 'AUTHORIZED' : 'PENDING'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Spring 2026 Regular End-Sem
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              activeRequest?.examEligibility ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {activeRequest?.examEligibility ? 'Hall Ticket Permitted' : 'Clearance Required'}
            </span>
          </div>
        </div>

        {/* Digital Certificate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Digital Certificate</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-slate-900 truncate">
              {activeRequest?.certificate ? activeRequest.certificate.certificateId : 'Not Issued'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {activeRequest?.certificate ? 'Cryptographically Sealed' : 'Issued after Exam Controller'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            {activeRequest?.certificate ? (
              <a
                href={`/api/certificates/${activeRequest.certificate.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            ) : (
              <span className="text-[11px] text-slate-400">Awaiting Final Clearance</span>
            )}
          </div>
        </div>
      </div>

      {/* Submit Clearance Request Trigger if no active request */}
      {!activeRequest ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Apply for No-Dues & Examination Clearance</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Initiate your centralized digital clearance request. Your application will route independently through Account Section, Student Affairs, Library, IT Department, Class Coordinator, and the Examination Controller.
          </p>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Clearance Application</span>
          </button>
        </div>
      ) : (
        /* CRITICAL REQUIREMENT: Department-Wise Clearance Tracking Table */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Department-Wise Clearance Status & Reapplication
              </h2>
              <p className="text-xs text-slate-500">
                Each department reviews your clearance independently. If any department rejects your request, you can reapply specifically to that department without restarting approved clearances.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Request ID: <strong className="text-slate-900">{activeRequest.requestId}</strong> | Submitted: {new Date(activeRequest.submittedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Department Clearance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Scope of Verification</th>
                    <th className="py-3.5 px-4">Clearance Status</th>
                    <th className="py-3.5 px-4">Officer Remarks / Rejection Reason</th>
                    <th className="py-3.5 px-4 text-right">Department Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {['ACCOUNT', 'STUDENT_SECTION', 'LIBRARY', 'IT', 'CLASS_COORDINATOR', 'EXAM_CONTROLLER'].map((deptCode) => {
                    const deptInfo = DEPARTMENT_METADATA[deptCode] || { name: deptCode, description: '' };
                    const approval = activeRequest.approvals?.find((a) => a.departmentCode === deptCode);
                    const status = approval?.status || 'PENDING';
                    const isRejected = status === 'REJECTED';
                    const isReapplied = status === 'REAPPLICATION_SUBMITTED';
                    const isApproved = status === 'APPROVED';

                    return (
                      <tr key={deptCode} className={`hover:bg-slate-50/80 transition-colors ${isRejected ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{deptInfo.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{deptCode}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                          {deptInfo.description}
                        </td>

                        <td className="py-3.5 px-4">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {isReapplied && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                              <span>Reapplication Submitted</span>
                            </span>
                          )}
                          {!isApproved && !isRejected && !isReapplied && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pending Review</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-md">
                          {approval?.rejectionReason && (
                            <div className="text-rose-800 font-medium">
                              <strong className="text-rose-900">Rejection Reason:</strong> {approval.rejectionReason}
                            </div>
                          )}
                          {approval?.remarks && !approval?.rejectionReason && (
                            <div className="text-slate-600 italic">
                              "{approval.remarks}"
                            </div>
                          )}
                          {approval?.reapplicationRemarks && (
                            <div className="text-blue-800 text-[11px] mt-1 bg-blue-50 p-1.5 rounded border border-blue-200">
                              <strong>Your Reapplication Note:</strong> {approval.reapplicationRemarks}
                            </div>
                          )}
                          {!approval?.remarks && !approval?.rejectionReason && (
                            <span className="text-slate-400 italic">Awaiting departmental inspection</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isRejected ? (
                            /* CRITICAL REAPPLICATION BUTTON */
                            <button
                              onClick={() => {
                                setReapplyDept({
                                  code: deptCode,
                                  name: deptInfo.name,
                                  rejectionReason: approval?.rejectionReason,
                                });
                                setReapplyStudentRemarks('');
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reapply to Department</span>
                            </button>
                          ) : isReapplied ? (
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                              Under Review
                            </span>
                          ) : isApproved ? (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center justify-end gap-1">
                              <Check className="w-3.5 h-3.5" /> Cleared
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">In Queue</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Certificate Download & Real-Time QR Verification Banner */}
          {activeRequest.certificate && (
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-700/50 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                {activeRequest.certificate.qrCodeDataUrl ? (
                  <img
                    src={activeRequest.certificate.qrCodeDataUrl}
                    alt="Certificate QR Verification"
                    className="w-24 h-24 rounded-lg bg-white p-1 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-emerald-800 flex items-center justify-center">
                    <Award className="w-10 h-10 text-white" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-0.5 rounded border border-emerald-400/40">
                      OFFICIAL CLEARANCE COMPLETED
                    </span>
                    <span className="text-xs text-slate-300 font-mono">{activeRequest.certificate.certificateId}</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    No-Dues & Examination Eligibility Certificate Issued
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    All departmental obligations cleared. You are unconditionally authorized to sit for the Spring 2026 Regular End-Semester Examinations.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      to={`/verify/${activeRequest.certificate.verificationToken}`}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Public Verification Page
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <a
                  href={`/api/certificates/${activeRequest.certificate.id}/download`}
                  className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-5 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Download Signed PDF</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEPARTMENT-SPECIFIC REAPPLICATION MODAL */}
      {reapplyDept && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900">
                  Reapply for Clearance - {reapplyDept.name}
                </h3>
              </div>
              <button onClick={() => setReapplyDept(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Department-Specific Reapplication Rule:</span>
              </div>
              <p className="text-amber-800">
                Your reapplication will be submitted <strong>only to {reapplyDept.name}</strong>. Clearances already approved by other departments will remain safely approved and will <strong>not</strong> be restarted.
              </p>
            </div>

            {reapplyDept.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-rose-900">Previous Rejection Reason:</div>
                <div className="text-rose-800 italic">"{reapplyDept.rejectionReason}"</div>
              </div>
            )}

            <form onSubmit={handleDepartmentReapply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Explanation / Settlement Proof Details *
                </label>
                <textarea
                  rows={4}
                  value={reapplyStudentRemarks}
                  onChange={(e) => setReapplyStudentRemarks(e.target.value)}
                  placeholder="e.g. Dues settled via transaction ref UPI-981273. Books returned on Monday. Kindly review and approve."
                  required
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReapplyDept(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Reapplication to Department'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT RECEIPTS DRAWER / MODAL */}
      {showReceiptHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Your Payment Receipts & Transaction History
                </h3>
              </div>
              <button onClick={() => setShowReceiptHistory(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-500">Total Assessed: </span>
                <strong className="text-slate-900">₹{feeRecord?.totalFee.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Total Paid: </span>
                <strong className="text-emerald-700">₹{feeRecord?.paidAmount.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Remaining Balance: </span>
                <strong className={feeRecord?.outstandingBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  ₹{feeRecord?.outstandingBalance.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No payment receipts recorded yet.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between hover:border-emerald-300">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-800 text-xs">{tx.receiptNumber}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{tx.paymentMode}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Date: {new Date(tx.paymentDate).toLocaleDateString()} | Ref: {tx.transactionRef || 'N/A'}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-black text-slate-900 text-sm">₹{tx.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">Balance: ₹{tx.remainingBalance.toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-300"
                        title="View printable receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="border-b-2 border-emerald-800 pb-3 text-center">
              <div className="text-xs font-black tracking-widest text-emerald-900 uppercase">CT UNIVERSITY</div>
              <div className="text-[10px] text-slate-500">Office of the Bursar & Financial Comptroller</div>
              <div className="text-sm font-black text-slate-900 mt-1">OFFICIAL PAYMENT RECEIPT</div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-mono bg-slate-50 p-2 rounded border border-slate-200">
                <span>Receipt No: <strong>{selectedReceipt.receiptNumber}</strong></span>
                <span>Date: <strong>{new Date(selectedReceipt.paymentDate).toLocaleDateString()}</strong></span>
              </div>

              <div className="space-y-1 py-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <strong className="text-slate-900">{user?.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student ID / Enrollment:</span>
                  <span className="font-mono font-bold text-slate-800">{profile?.studentId || 'CT-2026-1042'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-semibold">{selectedReceipt.paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Reference:</span>
                  <span className="font-mono text-slate-700">{selectedReceipt.transactionRef || 'N/A'}</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2.5 my-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Amount Paid:</span>
                  <span className="text-lg font-black text-emerald-800">₹{selectedReceipt.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Remaining Fee Balance:</span>
                  <span className="font-bold text-slate-700">₹{selectedReceipt.remainingBalance.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center italic">
                Digitally generated and verified by CT University Accounts Division. Valid without physical signature.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Application Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Confirm Clearance Submission</h3>
            <p className="text-xs text-slate-500 mb-4">
              By submitting, your official clearance request will enter the departmental verification pipeline.
            </p>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission Remarks / Note (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Requesting No-Dues clearance for Spring 2026 Examination hall ticket..."
                  rows={3}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
