import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, RotateCcw, X, KeyRound, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';

interface DemoAccount {
  roleName: string;
  loginPath: string;
  email: string;
  idNumber: string;
  scenario: string;
  category: 'Student' | 'Faculty' | 'Department' | 'Admin';
}

export const DemoCredentialsHelper: React.FC<{ onFillCredentials?: (email: string, pass: string) => void }> = ({
  onFillCredentials,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const demoAccounts: DemoAccount[] = [
    {
      roleName: 'Student 1 (Clean Fee)',
      loginPath: '/login/student',
      email: 'rahul.sharma@ctuniversity.edu',
      idNumber: 'CT-2026-1042',
      scenario: 'Tuition Fee Cleared ($0.00 bal). Submit clearance request & test 6-step approvals.',
      category: 'Student',
    },
    {
      roleName: 'Student 2 (Pending Fee)',
      loginPath: '/login/student',
      email: 'priya.patel@ctuniversity.edu',
      idNumber: 'CT-2026-1043',
      scenario: 'Has $1,500 pending fee balance. Demonstrates authoritative fee clearance hold.',
      category: 'Student',
    },
    {
      roleName: 'Student 3 (Approved)',
      loginPath: '/login/student',
      email: 'amit.verma@ctuniversity.edu',
      idNumber: 'CT-2026-1044',
      scenario: 'Pre-cleared with RSA-2048 signed Digital Certificate. Download PDF & verify live QR.',
      category: 'Student',
    },
    {
      roleName: 'Account Section Officer',
      loginPath: '/login/account',
      email: 'account@ctuniversity.edu',
      idNumber: 'FAC-ACC-101',
      scenario: 'Authoritative fee records verifier. Blocks approval if student has unpaid balance.',
      category: 'Department',
    },
    {
      roleName: 'Student Affairs Section',
      loginPath: '/login/faculty',
      email: 'studentsection@ctuniversity.edu',
      idNumber: 'FAC-REG-102',
      scenario: 'Administrative conduct and academic enrollment verification officer.',
      category: 'Department',
    },
    {
      roleName: 'Chief Librarian',
      loginPath: '/login/library',
      email: 'library@ctuniversity.edu',
      idNumber: 'FAC-LIB-103',
      scenario: 'Inspects library book checkouts and verifies zero outstanding library dues.',
      category: 'Department',
    },
    {
      roleName: 'IT Infrastructure Dept',
      loginPath: '/login/it',
      email: 'itdept@ctuniversity.edu',
      idNumber: 'FAC-IT-104',
      scenario: 'Verifies campus network access, computing hardware, and lab accounts.',
      category: 'Department',
    },
    {
      roleName: 'Class Coordinator',
      loginPath: '/login/coordinator',
      email: 'coordinator@ctuniversity.edu',
      idNumber: 'FAC-CRD-105',
      scenario: 'Reviews all 4 department approvals and academic attendance (>75% mandatory).',
      category: 'Faculty',
    },
    {
      roleName: 'Controller of Examinations',
      loginPath: '/login/exam-controller',
      email: 'examcontroller@ctuniversity.edu',
      idNumber: 'FAC-COE-106',
      scenario: 'Final authority: issues asymmetric RSA-2048 cryptographically signed Certificate.',
      category: 'Department',
    },
    {
      roleName: 'System Administrator',
      loginPath: '/login/admin',
      email: 'admin@ctuniversity.edu',
      idNumber: 'ADM-SYS-001',
      scenario: 'Full administrative access: audit logs, threat surveillance, user accounts & revocations.',
      category: 'Admin',
    },
  ];

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all clearance requests and fee statuses to initial pristine demo state?')) {
      return;
    }
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/auth/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResetMsg('Database reset to clean initial demo state successfully!');
        setTimeout(() => setResetMsg(null), 4000);
      } else {
        alert(data.error || 'Reset failed');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-400 border border-amber-500/40 shadow-xl backdrop-blur text-xs font-bold transition-all hover:scale-105 group"
          title="Open Demo & Evaluation Credentials Reference"
        >
          <KeyRound className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Demo Credentials Reference</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </button>
      </div>

      {/* Slide-over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-2">
                    Evaluation Credentials Reference
                    <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-semibold">
                      Demo Mode
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Individual login credentials for evaluation & security verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Default Password for all accounts: <code className="bg-white px-2 py-0.5 rounded font-mono font-bold text-slate-900 border border-amber-300">Password123!</code>
                </span>
              </div>
            </div>

            {resetMsg && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{resetMsg}</span>
              </div>
            )}

            {/* Account List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-slate-100">
              {demoAccounts.map((acc) => (
                <div key={acc.email} className="pt-3 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{acc.roleName}</span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
                        {acc.idNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onFillCredentials && (
                        <button
                          onClick={() => {
                            onFillCredentials(acc.email, 'Password123!');
                            setIsOpen(false);
                          }}
                          className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors"
                        >
                          Fill Form
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(acc.email)}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 flex items-center gap-1 transition-colors"
                        title="Copy Email"
                      >
                        {copiedEmail === acc.email ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-blue-700 font-medium">
                    {acc.email}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {acc.scenario}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-400/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Resetting Database...' : 'Reset Demo Database'}</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
