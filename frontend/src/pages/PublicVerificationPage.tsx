import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GraduationCap,
  Award,
  Search,
  ExternalLink,
  Lock
} from 'lucide-react';

export const PublicVerificationPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const [searchToken, setSearchToken] = useState<string>(token || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (targetToken: string) => {
    if (!targetToken) return;
    try {
      setLoading(true);
      setSearched(true);
      const res = await fetch(`/api/certificates/verify/${targetToken.trim()}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ status: 'ERROR', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    verifyToken(searchToken);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <span>Official Public Verification Service</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          CT University Document Verification Portal
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Verify authenticity and validity of No-Dues & Examination Eligibility Certificates issued by the Office of the Controller of Examinations.
        </p>
      </div>

      {/* Token Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchToken}
            onChange={(e) => setSearchToken(e.target.value)}
            placeholder="Enter Certificate Verification Token (e.g. 8a3f912c4b8e71d60f5a9e2c)..."
            className="w-full pl-10 pr-4 py-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-sm font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all shrink-0"
        >
          {loading ? 'Verifying...' : 'Verify Online'}
        </button>
      </form>

      {/* Verification Result Card */}
      {searched && result && (
        <div className="max-w-2xl mx-auto animate-fadeIn">
          {result.status === 'VALID' ? (
            /* VALID CERTIFICATE CARD */
            <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-2xl overflow-hidden">
              {/* Green Header */}
              <div className="bg-emerald-600 text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                      STATUS: OFFICIAL & VALID
                    </span>
                    <h2 className="text-xl font-black mt-1">Authentic University Document</h2>
                  </div>
                </div>
                <ShieldCheck className="w-10 h-10 text-emerald-200 opacity-60" />
              </div>

              {/* Minimal Safe Information Display */}
              <div className="p-6 space-y-4 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Cryptographic signature is verified. This document was officially authorized by the Controller of Examinations.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Student Name</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{result.certificate.studentName}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Student ID (Masked)</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">{result.certificate.studentIdMasked}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Academic Course</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{result.certificate.course}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Current Semester</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{result.certificate.semester}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Certificate ID</div>
                    <div className="font-bold text-blue-600 font-mono mt-0.5">{result.certificate.certificateId}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Date of Issuance</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {new Date(result.certificate.issueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Examination Eligibility</div>
                    <div className="font-black text-emerald-700 text-sm mt-0.5 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span>{result.certificate.examinationEligibility} (FULL NO-DUES CLEARANCE)</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 text-center pt-2">
                  Issued by: {result.certificate.issuingInstitution}
                </div>
              </div>
            </div>
          ) : result.status === 'REVOKED' ? (
            /* REVOKED CERTIFICATE CARD */
            <div className="bg-white rounded-2xl border-2 border-rose-500 shadow-2xl overflow-hidden">
              <div className="bg-rose-600 text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                      STATUS: REVOKED
                    </span>
                    <h2 className="text-xl font-black mt-1">Certificate Revoked by University</h2>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3 text-xs">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-medium">
                  <strong>Notice:</strong> This certificate was officially revoked by University Administration on{' '}
                  {new Date(result.revokedAt).toLocaleString()}. It is invalid and no longer conveys examination eligibility.
                </div>
                {result.revocationReason && (
                  <div className="text-slate-700">
                    <strong>Official Revocation Reason:</strong> "{result.revocationReason}"
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* NOT FOUND / FORGED CARD */
            <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-xl p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Certificate Not Found</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                No certificate matches this token. Please ensure the token or QR code was scanned directly from an official CT University certificate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Security Privacy Notice */}
      <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-500 max-w-xl mx-auto flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-700">Student Privacy Shield: </span>
          In accordance with University Cybersecurity Policy, this public verification interface displays only authorized credential verification. Personal financial records, home addresses, and internal remarks are strictly confidential.
        </div>
      </div>
    </div>
  );
};
