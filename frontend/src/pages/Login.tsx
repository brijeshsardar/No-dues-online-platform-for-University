import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  UserCheck
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // MFA Challenge State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTicket, setMfaTicket] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaTicket(data.mfaTicket);
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaTicket, token: totpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid MFA code');
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogins = [
    { title: 'Student 1 (Clean Fee)', role: 'STUDENT', email: 'rahul.sharma@ctuniversity.edu', desc: 'Can submit clearance' },
    { title: 'Student 2 (Pending Fee)', role: 'STUDENT', email: 'priya.patel@ctuniversity.edu', desc: 'Demonstrates fee block' },
    { title: 'Student 3 (Approved)', role: 'STUDENT', email: 'amit.verma@ctuniversity.edu', desc: 'Pre-cleared with certificate' },
    { title: 'Account Section', role: 'ACCOUNT_SECTION', email: 'account@ctuniversity.edu', desc: 'Fee records authority' },
    { title: 'Student Section', role: 'STUDENT_SECTION', email: 'studentsection@ctuniversity.edu', desc: 'Administrative clearance' },
    { title: 'Library Head', role: 'LIBRARY', email: 'library@ctuniversity.edu', desc: 'Books & fines clearance' },
    { title: 'IT Infrastructure', role: 'IT_DEPARTMENT', email: 'itdept@ctuniversity.edu', desc: 'Computing assets clearance' },
    { title: 'Class Coordinator', role: 'CLASS_COORDINATOR', email: 'coordinator@ctuniversity.edu', desc: 'Academic review' },
    { title: 'Examination Controller', role: 'EXAMINATION_CONTROLLER', email: 'examcontroller@ctuniversity.edu', desc: 'Final Exam Authority' },
    { title: 'System Administrator', role: 'ADMIN', email: 'admin@ctuniversity.edu', desc: 'Audit & user control' },
  ];

  const handleQuickLogin = async (role: string, userEmail: string) => {
    await switchRole(role, userEmail);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">CT UNIVERSITY</h2>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            Digital No-Dues & Examination Clearance System
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-8 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  University Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g. rahul.sharma@ctuniversity.edu"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Default test password: Password123!</div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In Securely'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* MFA Challenge Screen */
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <strong>Two-Factor Authentication:</strong> Enter the 6-digit code from your authenticator app.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6-Digit Authenticator Token
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-base tracking-widest font-mono text-center border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                {loading ? 'Verifying MFA...' : 'Confirm MFA & Sign In'}
              </button>
            </form>
          )}

          {/* 1-Click Evaluation Fast Switcher */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Evaluation Fast-Login (1-Click Test Any Role):</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-0.5">
              {quickLogins.map((ql) => (
                <button
                  key={ql.email}
                  type="button"
                  onClick={() => handleQuickLogin(ql.role, ql.email)}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all"
                >
                  <div className="font-bold text-[11px] text-slate-900 truncate">{ql.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{ql.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
