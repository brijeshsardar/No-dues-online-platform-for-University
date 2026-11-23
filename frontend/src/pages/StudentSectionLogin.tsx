import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal.js';

export const StudentSectionLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('studentsection@ctuniversity.edu');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
          expectedRole: 'STUDENT_SECTION',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Student Section authentication failed');
        setLoading(false);
        return;
      }

      if (data.user.role !== 'STUDENT_SECTION') {
        setErrorMsg('Access Denied: This login portal is strictly reserved for Student Section personnel only.');
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate('/dashboard/student-section');
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error encountered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-3">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 mb-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Portals</span>
        </Link>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
          <Users className="w-8 h-8" />
        </div>
        <div className="text-center">
          <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 px-2.5 py-0.5 rounded-full border border-sky-200 uppercase tracking-wider">
            STUDENT ADMINISTRATION
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            Student Section Portal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sign in with your Student Section Officer Email or Employee ID (e.g. studentsection@ctuniversity.edu)
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Officer Email / Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="studentsection@ctuniversity.edu"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Officer...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Student Section</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Institutional Security Notice */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Role-Based Access Control
            </span>
            <span>Student Administration</span>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          portalName="Student Section Portal"
          defaultIdentifier={identifier}
          onClose={() => setShowForgotPassword(false)}
        />
      )}
    </div>
  );
};
