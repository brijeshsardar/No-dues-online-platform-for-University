import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ShieldCheck, UserCheck, RotateCcw } from 'lucide-react';

export const RoleDemoBar: React.FC = () => {
  const { user, switchRole, loading } = useAuth();

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all clearance requests, test accounts, and fee records to clean initial state?')) {
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        window.location.reload();
      } else {
        alert(data.error || 'Reset failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const roles = [
    { label: 'Student 1 (Clean Fee)', role: 'STUDENT', email: 'rahul.sharma@ctuniversity.edu', badge: 'Submit Clearance' },
    { label: 'Student 2 (Pending Fee)', role: 'STUDENT', email: 'priya.patel@ctuniversity.edu', badge: 'Fee Block Demo' },
    { label: 'Student 3 (Approved)', role: 'STUDENT', email: 'amit.verma@ctuniversity.edu', badge: 'Certificate Demo' },
    { label: 'Account Section', role: 'ACCOUNT_SECTION', email: 'account@ctuniversity.edu', badge: 'Step 2' },
    { label: 'Student Section', role: 'STUDENT_SECTION', email: 'studentsection@ctuniversity.edu', badge: 'Step 3' },
    { label: 'Library', role: 'LIBRARY', email: 'library@ctuniversity.edu', badge: 'Step 4' },
    { label: 'IT Department', role: 'IT_DEPARTMENT', email: 'itdept@ctuniversity.edu', badge: 'Step 5' },
    { label: 'Coordinator', role: 'CLASS_COORDINATOR', email: 'coordinator@ctuniversity.edu', badge: 'Step 6' },
    { label: 'Exam Controller', role: 'EXAMINATION_CONTROLLER', email: 'examcontroller@ctuniversity.edu', badge: 'Step 7: Final' },
    { label: 'Admin', role: 'ADMIN', email: 'admin@ctuniversity.edu', badge: 'Security/Logs' },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white text-xs px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 z-50">
      <div className="flex items-center gap-1.5 font-medium text-amber-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold tracking-wide uppercase">Evaluation Quick-Role Switcher:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
        {roles.map((r) => {
          const isCurrent = user?.email === r.email;
          return (
            <button
              key={r.email}
              disabled={loading}
              onClick={() => switchRole(r.role, r.email)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
                isCurrent
                  ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              <span>{r.label}</span>
              <span className={`text-[9px] px-1 rounded ${isCurrent ? 'bg-blue-800 text-blue-100' : 'bg-slate-900 text-slate-400'}`}>
                {r.badge}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
        <button
          onClick={handleResetDemo}
          title="Reset all test accounts, fee statuses, and requests to initial clean state"
          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All Demo Data</span>
        </button>
        <div className="hidden lg:flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Active: <strong className="text-white">{user?.fullName || 'Not logged in'}</strong></span>
        </div>
      </div>
    </div>
  );
};
