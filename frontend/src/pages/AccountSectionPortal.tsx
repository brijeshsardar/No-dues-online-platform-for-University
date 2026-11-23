import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ClearanceRequest, FeeRecord, PaymentTransaction } from '../types/index.js';
import {
  DollarSign,
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
  FileText,
  CreditCard,
  Ban,
  Receipt,
  Edit3,
  History,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const AccountSectionPortal: React.FC = () => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feeSearchTerm, setFeeSearchTerm] = useState('');

  // Clearance Action Modal
  const [selectedRequest, setSelectedRequest] = useState<ClearanceRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'RETURN' | 'REJECT' | null>(null);
  const [remarks, setRemarks] = useState('');

  // Payment Recording Modal
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<FeeRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentRemarks, setPaymentRemarks] = useState<string>('');

  // Fee Editing Modal
  const [selectedFeeForEdit, setSelectedFeeForEdit] = useState<FeeRecord | null>(null);
  const [newTotalFee, setNewTotalFee] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  // Transaction History Modal
  const [viewHistoryFee, setViewHistoryFee] = useState<FeeRecord | null>(null);

  // Digital Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<PaymentTransaction | null>(null);
  const [receiptStudentInfo, setReceiptStudentInfo] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'FEE_MANAGEMENT' | 'QUEUE'>('FEE_MANAGEMENT');

  useEffect(() => {
    fetchAccountData();
  }, [user]);

  const fetchAccountData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [resQueue, resFees] = await Promise.all([
        fetch('/api/clearance/assigned', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/fees/records', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resQueue.ok) {
        const d = await resQueue.json();
        setRequests(d.requests || []);
      }
      if (resFees.ok) {
        const d = await resFees.json();
        setFeeRecords(d.feeRecords || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Clearance Approval / Rejection
  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // Student fee check
    const studentFee = selectedRequest.student?.feeRecords?.[0];
    const outstanding = studentFee ? studentFee.outstandingBalance : 0;

    if (actionType === 'APPROVE' && outstanding > 0) {
      setErrorMsg(`Clearance Hold Enforced: Student has an outstanding balance of ₹${outstanding.toLocaleString()}. Approvals are strictly prohibited by university policy.`);
      return;
    }

    let endpoint = `/api/clearance/${selectedRequest.id}/approve`;
    if (actionType === 'RETURN') endpoint = `/api/clearance/${selectedRequest.id}/return`;
    if (actionType === 'REJECT') endpoint = `/api/clearance/${selectedRequest.id}/reject`;

    try {
      setSubmitting(true);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          remarks: remarks || `Fee verification approved by Account Section (${user?.fullName})`,
          reason: remarks,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Clearance Request ${selectedRequest.requestId} ${actionType.toLowerCase()}ed successfully.`);
        setSelectedRequest(null);
        setActionType(null);
        setRemarks('');
        fetchAccountData();
      } else {
        setErrorMsg(data.error || 'Failed to process fee clearance.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeForPayment) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/fees/record-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feeRecordId: selectedFeeForPayment.id,
          amount: amountNum,
          paymentMode,
          transactionRef: transactionRef.trim() || undefined,
          paymentDate,
          remarks: paymentRemarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Payment of ₹${amountNum.toLocaleString()} recorded successfully! Receipt: ${data.transaction.receiptNumber}`);
        setSelectedFeeForPayment(null);
        setPaymentAmount('');
        setTransactionRef('');
        setPaymentRemarks('');
        fetchAccountData();
      } else {
        setErrorMsg(data.error || 'Failed to record payment.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Total Fee
  const handleUpdateTotalFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeForEdit) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const newFeeNum = parseFloat(newTotalFee);
    if (isNaN(newFeeNum) || newFeeNum < 0) {
      setErrorMsg('Please enter a valid non-negative fee amount.');
      return;
    }
    if (!editReason.trim()) {
      setErrorMsg('A valid reason is required for auditing fee modifications.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/fees/update-total-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feeRecordId: selectedFeeForEdit.id,
          newTotalFee: newFeeNum,
          reason: editReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Total fee updated to ₹${newFeeNum.toLocaleString()} for student ${selectedFeeForEdit.student?.user?.fullName}.`);
        setSelectedFeeForEdit(null);
        setNewTotalFee('');
        setEditReason('');
        fetchAccountData();
      } else {
        setErrorMsg(data.error || 'Failed to update total fee.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Fee update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.requestId.toLowerCase().includes(q) ||
      r.student?.user.fullName.toLowerCase().includes(q) ||
      r.student?.studentId.toLowerCase().includes(q)
    );
  });

  const filteredFeeRecords = feeRecords.filter((f) => {
    const q = feeSearchTerm.toLowerCase();
    const name = f.student?.user?.fullName?.toLowerCase() || '';
    const studentId = f.student?.studentId?.toLowerCase() || '';
    const email = f.student?.user?.email?.toLowerCase() || '';
    const roll = f.student?.enrollmentNo?.toLowerCase() || '';
    return name.includes(q) || studentId.includes(q) || email.includes(q) || roll.includes(q);
  });

  // Calculate financial statistics
  const totalFeesSum = feeRecords.reduce((acc, f) => acc + (f.totalFee || 0), 0);
  const totalPaidSum = feeRecords.reduce((acc, f) => acc + (f.paidAmount || 0), 0);
  const totalOutstandingSum = feeRecords.reduce((acc, f) => acc + (f.outstandingBalance || 0), 0);
  const fullyPaidCount = feeRecords.filter((f) => f.outstandingBalance === 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Account Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Student Accounts & Financial Management Section</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Account Section Dashboard
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Officer in Charge: <strong className="text-white">{user?.fullName}</strong> | Department: <strong className="text-white">University Bursar & Finance Office</strong>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Department Code</div>
            <div className="font-bold text-emerald-300 text-sm">ACCOUNT_SECTION</div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <div className="text-slate-400 text-[10px] uppercase">Clearance Queue</div>
            <div className="font-bold text-white text-sm">{requests.length} Requests</div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold hover:underline">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Fees Assessed</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{totalFeesSum.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">{feeRecords.length} Active student ledgers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Paid Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">₹{totalPaidSum.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">{fullyPaidCount} students fully cleared</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Outstanding Balance</span>
            <CreditCard className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">₹{totalOutstandingSum.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">Pending student recovery</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Zero-Balance Policy</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">Active Block</div>
          <p className="text-xs text-slate-500 mt-1">No-Dues requires ₹0.00 balance</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('FEE_MANAGEMENT')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'FEE_MANAGEMENT'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment & Student Fee Management ({feeRecords.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'QUEUE'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>No-Dues Clearance Queue ({requests.length})</span>
        </button>
      </div>

      {/* Tab 1: Payment & Student Fee Management */}
      {activeTab === 'FEE_MANAGEMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-base text-slate-900">Student Fee Management & Payment Ledger</h3>
              <p className="text-xs text-slate-500">
                Search students by Name, Registration No, or Email to view fee breakdown, record new payments, edit total fees, or inspect receipts.
              </p>
            </div>

            <div className="w-full sm:w-80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={feeSearchTerm}
                  onChange={(e) => setFeeSearchTerm(e.target.value)}
                  placeholder="Search by student name, ID, or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Student Info</th>
                  <th className="py-3 px-3">Registration ID</th>
                  <th className="py-3 px-3">Total Fee</th>
                  <th className="py-3 px-3">Amount Paid</th>
                  <th className="py-3 px-3">Remaining Balance</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Payment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFeeRecords.map((f) => {
                  const isPaid = f.outstandingBalance === 0;
                  const isPartial = f.paidAmount > 0 && f.outstandingBalance > 0;

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{f.student?.user?.fullName || 'Student'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{f.student?.user?.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-700">
                        <div>{f.student?.studentId}</div>
                        <div className="text-[10px] text-slate-400">Roll: {f.student?.enrollmentNo}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        ₹{f.totalFee.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">
                        ₹{f.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          ₹{f.outstandingBalance.toLocaleString()} {isPaid ? 'CLEARED' : 'DUE'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record Payment Button */}
                          <button
                            onClick={() => {
                              setSelectedFeeForPayment(f);
                              setPaymentAmount('');
                              setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 flex items-center gap-1 shadow-sm"
                            title="Record received fee payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>

                          {/* Edit Total Fee Button */}
                          <button
                            onClick={() => {
                              setSelectedFeeForEdit(f);
                              setNewTotalFee(f.totalFee.toString());
                              setEditReason('');
                            }}
                            className="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-300 flex items-center gap-1 shadow-sm"
                            title="Edit and adjust total fee structure"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Fee</span>
                          </button>

                          {/* Payment History Button */}
                          <button
                            onClick={() => setViewHistoryFee(f)}
                            className="px-2 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 flex items-center gap-1 shadow-sm"
                            title="View transaction receipts & logs"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Clearance Queue */}
      {activeTab === 'QUEUE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-base text-slate-900">Fee Clearance Queue</h3>
              <p className="text-xs text-slate-500">
                Inspect official payment receipts. Students with pending balances cannot be approved.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search student or request..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              No clearance requests currently awaiting Account Section verification.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Request ID</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Student ID</th>
                    <th className="py-3 px-3">Stage & Status</th>
                    <th className="py-3 px-3">Total Fee</th>
                    <th className="py-3 px-3">Paid Amount</th>
                    <th className="py-3 px-3">Outstanding Balance</th>
                    <th className="py-3 px-3 text-right">Fee Clearance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const fee = req.student?.feeRecords?.[0];
                    const balance = fee ? fee.outstandingBalance : 0;
                    const isBlocked = balance > 0;
                    const accountApproval = req.approvals?.find((a) => a.departmentCode === 'ACCOUNT');
                    const isReapplication = accountApproval?.status === 'REAPPLICATION_SUBMITTED';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700">
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
                              <RotateCcw className="w-3 h-3" />
                              <span>Reapplication Submitted</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {req.currentStage.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          ₹{fee?.totalFee.toLocaleString() || '0'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          ₹{fee?.paidAmount.toLocaleString() || '0'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-full ${
                              balance === 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            ₹{balance.toLocaleString()} DUE
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isBlocked ? (
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setActionType('APPROVE');
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-300 flex items-center gap-1"
                                title="Fee balance > ₹0: clicking will demonstrate system rejection"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Fee Hold</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setActionType('APPROVE');
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300"
                              >
                                {isReapplication ? 'Re-Approve Fee' : 'Approve Fee'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType('REJECT');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-300"
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
      )}

      {/* RECORD PAYMENT MODAL with Live Auto-Calculation */}
      {selectedFeeForPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Record Student Fee Payment
                </h3>
              </div>
              <button onClick={() => setSelectedFeeForPayment(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Student Account Summary */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Student: <strong>{selectedFeeForPayment.student?.user?.fullName}</strong> ({selectedFeeForPayment.student?.studentId})</div>
              <div className="flex justify-between">
                <span>Total Assessed Fee: <strong>₹{selectedFeeForPayment.totalFee.toLocaleString()}</strong></span>
                <span>Currently Paid: <strong className="text-emerald-700">₹{selectedFeeForPayment.paidAmount.toLocaleString()}</strong></span>
              </div>
              <div>Current Balance: <strong className="text-rose-700">₹{selectedFeeForPayment.outstandingBalance.toLocaleString()}</strong></div>
            </div>

            {/* Live Calculation Preview Card */}
            {paymentAmount && !isNaN(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0 && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 font-mono">
                <div className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automatic Balance Calculation Preview</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Total Fee:</span>
                  <span>₹{selectedFeeForPayment.totalFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Previous Payment:</span>
                  <span>₹{selectedFeeForPayment.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>+ New Payment:</span>
                  <span>₹{parseFloat(paymentAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-emerald-200 pt-1">
                  <span>= New Total Paid:</span>
                  <span>₹{(selectedFeeForPayment.paidAmount + parseFloat(paymentAmount)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black">
                  <span>= Resulting Remaining Balance:</span>
                  <span className={selectedFeeForPayment.totalFee - (selectedFeeForPayment.paidAmount + parseFloat(paymentAmount)) <= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    ₹{Math.max(0, selectedFeeForPayment.totalFee - (selectedFeeForPayment.paidAmount + parseFloat(paymentAmount))).toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-emerald-900 mt-1">
                  New Status: {selectedFeeForPayment.totalFee - (selectedFeeForPayment.paidAmount + parseFloat(paymentAmount)) <= 0 ? 'FULLY PAID (ELIGIBLE FOR CLEARANCE)' : 'PARTIALLY PAID'}
                </div>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 3000"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="NET_BANKING">Net Banking (NEFT / RTGS)</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="CHEQUE">Bank Cheque / Demand Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transaction / Reference Number
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI-2026-981729 or Bank Ref"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Receipt Note
                </label>
                <input
                  type="text"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  placeholder="e.g. Semester 5 installment fee received"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedFeeForPayment(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Generating Receipt...' : 'Record Payment & Issue Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TOTAL FEE MODAL */}
      {selectedFeeForEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Update Total Fee Structure
                </h3>
              </div>
              <button onClick={() => setSelectedFeeForEdit(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Student: <strong>{selectedFeeForEdit.student?.user?.fullName}</strong> ({selectedFeeForEdit.student?.studentId})</div>
              <div>Current Total Fee: <strong>₹{selectedFeeForEdit.totalFee.toLocaleString()}</strong></div>
              <div>Already Paid: <strong className="text-emerald-700">₹{selectedFeeForEdit.paidAmount.toLocaleString()}</strong></div>
            </div>

            <form onSubmit={handleUpdateTotalFee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Total Assessed Fee (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newTotalFee}
                  onChange={(e) => setNewTotalFee(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Audit Reason / Justification *
                </label>
                <textarea
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Merit scholarship concession applied / Hostel fee adjustment"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedFeeForEdit(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Fee Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY & RECEIPTS MODAL */}
      {viewHistoryFee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Payment History & Official Receipts
                </h3>
              </div>
              <button onClick={() => setViewHistoryFee(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900">{viewHistoryFee.student?.user?.fullName}</div>
                <div className="text-slate-500 font-mono">ID: {viewHistoryFee.student?.studentId} | Roll: {viewHistoryFee.student?.enrollmentNo}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-600">Total: <strong>₹{viewHistoryFee.totalFee.toLocaleString()}</strong> | Paid: <strong className="text-emerald-700">₹{viewHistoryFee.paidAmount.toLocaleString()}</strong></div>
                <div className="font-bold text-rose-700">Balance: ₹{viewHistoryFee.outstandingBalance.toLocaleString()}</div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Issued Payment Receipts ({viewHistoryFee.transactions?.length || 0})
              </h4>

              {(!viewHistoryFee.transactions || viewHistoryFee.transactions.length === 0) ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No payment transactions recorded for this student yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {viewHistoryFee.transactions.map((tx) => (
                    <div key={tx.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between hover:border-emerald-300 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-800 text-xs">{tx.receiptNumber}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{tx.paymentMode}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Date: {new Date(tx.paymentDate).toLocaleDateString()} | Ref: {tx.transactionRef || 'N/A'}
                        </div>
                        {tx.remarks && <div className="text-[11px] text-slate-600 italic">"{tx.remarks}"</div>}
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className="font-black text-slate-900 text-sm">₹{tx.amount.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500">Bal after: ₹{tx.remainingBalance.toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveReceipt(tx);
                            setReceiptStudentInfo(viewHistoryFee.student);
                          }}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-300"
                          title="Print official receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fee Modification Logs */}
            {viewHistoryFee.modificationLogs && viewHistoryFee.modificationLogs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Fee Modification Audit Trail
                </h4>
                <div className="space-y-1.5">
                  {viewHistoryFee.modificationLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>₹{log.previousTotalFee.toLocaleString()} → ₹{log.newTotalFee.toLocaleString()}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-600">Reason: {log.reason}</div>
                      <div className="text-[10px] text-slate-500">Modified by: {log.modifiedByUser?.fullName || 'Account Officer'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OFFICIAL DIGITAL RECEIPT VIEW / PRINT */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="border-b-2 border-emerald-800 pb-3 text-center">
              <div className="text-xs font-black tracking-widest text-emerald-900 uppercase">CT UNIVERSITY</div>
              <div className="text-[10px] text-slate-500">Office of the Bursar & Financial Comptroller</div>
              <div className="text-sm font-black text-slate-900 mt-1">OFFICIAL PAYMENT RECEIPT</div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-mono bg-slate-50 p-2 rounded border border-slate-200">
                <span>Receipt No: <strong>{activeReceipt.receiptNumber}</strong></span>
                <span>Date: <strong>{new Date(activeReceipt.paymentDate).toLocaleDateString()}</strong></span>
              </div>

              <div className="space-y-1 py-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <strong className="text-slate-900">{receiptStudentInfo?.user?.fullName || 'Student'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student ID / Enrollment:</span>
                  <span className="font-mono font-bold text-slate-800">{receiptStudentInfo?.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-semibold">{activeReceipt.paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Reference:</span>
                  <span className="font-mono text-slate-700">{activeReceipt.transactionRef || 'N/A'}</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2.5 my-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Amount Received:</span>
                  <span className="text-lg font-black text-emerald-800">₹{activeReceipt.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Remaining Fee Balance:</span>
                  <span className="font-bold text-slate-700">₹{activeReceipt.remainingBalance.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center italic">
                Digitally generated and verified by CT University Accounts Division. No physical signature required.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveReceipt(null)}
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

      {/* Confirmation Modal for Clearance Decision */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {actionType === 'APPROVE' ? 'Authorize Fee Clearance' : 'Reject / Return Clearance Request'}
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div>Request: <strong className="font-mono text-emerald-800">{selectedRequest.requestId}</strong></div>
              <div>Student: <strong>{selectedRequest.student?.user.fullName}</strong> ({selectedRequest.student?.studentId})</div>
              <div>
                Outstanding Fee:{' '}
                <strong className={selectedRequest.student?.feeRecords?.[0]?.outstandingBalance ? 'text-rose-600' : 'text-emerald-700'}>
                  ₹{selectedRequest.student?.feeRecords?.[0]?.outstandingBalance?.toLocaleString() || '0'}
                </strong>
              </div>
            </div>

            {/* If Reapplication Submitted, show Student's explanation */}
            {selectedRequest.approvals?.find((a) => a.departmentCode === 'ACCOUNT')?.reapplicationRemarks && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Student Reapplication Justification:</span>
                </div>
                <div className="text-slate-800 italic">
                  "{selectedRequest.approvals?.find((a) => a.departmentCode === 'ACCOUNT')?.reapplicationRemarks}"
                </div>
              </div>
            )}

            {selectedRequest.student?.feeRecords?.[0]?.outstandingBalance! > 0 && actionType === 'APPROVE' && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>CRITICAL FEE BLOCK:</strong> This student has an unpaid balance. The backend will strictly reject any approval attempt.
                </span>
              </div>
            )}

            <form onSubmit={handleAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Section Remarks / Reason
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    actionType === 'APPROVE'
                      ? 'e.g. Official fee records verified. Student has zero outstanding balance.'
                      : 'e.g. Pending tuition dues of ₹5,000 for Semester 5'
                  }
                  required={actionType === 'REJECT'}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submitting ? 'Recording...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
