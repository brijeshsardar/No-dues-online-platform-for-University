import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Laptop,
  DollarSign,
  BookOpen,
  ClipboardList,
  Award
} from 'lucide-react';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal.js';
import { DemoCredentialsHelper } from '../components/DemoCredentialsHelper.js';

export type DepartmentType = 'it' | 'coordinator' | 'library' | 'exam-controller' | 'account';

interface DepartmentLoginProps {
  dept: DepartmentType;
}

export const DepartmentLogin: React.FC<DepartmentLoginProps> = ({ dept }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const deptConfigs: Record<
    DepartmentType,
    {
      title: string;
      subtitle: string;
      role: string;
      defaultEmail: string;
      defaultId: string;
      icon: React.ReactNode;
      color: string;
      badgeColor: string;
    }
  > = {
    it: {
      title: 'IT Infrastructure Portal',
      subtitle: 'Lab hardware returns, computing accounts & cryptographic hashes',
      role: 'IT_DEPARTMENT',
      defaultEmail: 'itdept@ctuniversity.edu',
      defaultId: 'FAC-IT-104',
      icon: <Laptop className="w-8 h-8 text-cyan-600" />,
      color: 'cyan',
      badgeColor: 'bg-cyan-100/70 text-cyan-800 border-cyan-200',
    },
    account: {
      title: 'Account Section Portal',
      subtitle: 'Authoritative tuition fees verification & financial clearance holds',
      role: 'ACCOUNT_SECTION',
      defaultEmail: 'account@ctuniversity.edu',
      defaultId: 'FAC-ACC-101',
      icon: <DollarSign className="w-8 h-8 text-emerald-600" />,
      color: 'emerald',
      badgeColor: 'bg-emerald-100/70 text-emerald-800 border-emerald-200',
    },
    library: {
      title: 'University Library Portal',
      subtitle: 'Book checkout audit, overdue returns & fine clearance verification',
      role: 'LIBRARY',
      defaultEmail: 'library@ctuniversity.edu',
      defaultId: 'FAC-LIB-103',
      icon: <BookOpen className="w-8 h-8 text-amber-600" />,
      color: 'amber',
      badgeColor: 'bg-amber-100/70 text-amber-800 border-amber-200',
    },
    coordinator: {
      title: 'Class Coordinator Portal',
      subtitle: 'Cohort academic attendance checks (>75%) & clearance endorsement',
      role: 'CLASS_COORDINATOR',
      defaultEmail: 'coordinator@ctuniversity.edu',
      defaultId: 'FAC-CRD-105',
      icon: <ClipboardList className="w-8 h-8 text-teal-600" />,
      color: 'teal',
      badgeColor: 'bg-teal-100/70 text-teal-800 border-teal-200',
    },
    'exam-controller': {
      title: 'Controller of Examinations Portal',
      subtitle: 'Final examination eligibility authorization & RSA-2048 certificate issuance',
      role: 'EXAMINATION_CONTROLLER',
      defaultEmail: 'examcontroller@ctuniversity.edu',
      defaultId: 'FAC-COE-106',
      icon: <Award className="w-8 h-8 text-purple-600" />,
      color: 'purple',
      badgeColor: 'bg-purple-100/70 text-purple-800 border-purple-200',
    },
  };

  const config = deptConfigs[dept] || deptConfigs.it;

  const [identifier, setIdentifier] = useState(config.defaultEmail);
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // MFA Challenge State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTicket, setMfaTicket] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier.trim(),
          password,
          expectedRole: config.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Department authentication failed');
        setLoading(false);
        return;
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaTicket(data.mfaTicket);
        setLoading(false);
        return;
      }

      if (data.user.role !== config.role && data.user.role !== 'ADMIN') {
        setErrorMsg(`Access Denied: This terminal is strictly reserved for ${config.title} personnel.`);
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error encountered.');
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
      setErrorMsg(err.message || 'MFA validation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-3">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Portals</span>
        </Link>
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-lg shadow-slate-300/40">
          {config.icon}
        </div>
        <div className="text-center">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${config.badgeColor}`}>
            DEPARTMENT PORTAL
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            {config.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {config.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="leading-tight font-medium">{errorMsg}</span>
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Officer Email or Employee ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder={`e.g. ${config.defaultEmail} or ${config.defaultId}`}
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-500 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter departmental password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : `Sign In to ${config.title}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* MFA Verification */
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Privileged department authentication: enter 6-digit TOTP code.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="000000"
                  className="w-full text-center text-lg tracking-widest font-mono py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Verifying...' : 'Verify MFA & Continue'}</span>
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Need another portal?</span>
            <Link to="/login" className="font-bold text-blue-600 hover:underline">
              View All Portals →
            </Link>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        portalName={config.title}
        defaultIdentifier={identifier}
      />

      <DemoCredentialsHelper
        onFillCredentials={(email, pass) => {
          setIdentifier(email);
          setPassword(pass);
        }}
      />
    </div>
  );
};
