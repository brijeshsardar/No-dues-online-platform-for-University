import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal.js';
import { DemoCredentialsHelper } from '../components/DemoCredentialsHelper.js';

export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('admin@ctuniversity.edu');
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
          expectedRole: 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Administrator authentication failed');
        setLoading(false);
        return;
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaTicket(data.mfaTicket);
        setLoading(false);
        return;
      }

      if (data.user.role !== 'ADMIN') {
        setErrorMsg('Access Denied: Strictly restricted to System Administrators.');
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
        setErrorMsg(data.error || 'Invalid administrative MFA token');
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-3">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Portals</span>
        </Link>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-700 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-600/30">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="text-center">
          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-700/50 uppercase tracking-wider">
            HIGH-SECURITY CLEARANCE
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1.5">
            Admin Command Terminal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Restricted access for Chief University Administrators
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="leading-tight font-medium">{errorMsg}</span>
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Administrator Official Email or Admin ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="e.g. admin@ctuniversity.edu or ADM-SYS-001"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Admin Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter administrative master password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-950 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating Terminal...' : 'Authenticate as Administrator'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Admin MFA Verification */
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <Terminal className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Elevated administrator verification required (RFC 6238 TOTP).</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  6-Digit Master Security Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="000000"
                  className="w-full text-center text-lg tracking-widest font-mono py-2.5 bg-slate-950 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authorizing...' : 'Authorize Admin Session'}</span>
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            All administrative logins are immutably logged to the CT University security audit ledger.
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        portalName="Admin Command Terminal"
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
