import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  GraduationCap,
  Award,
  CheckSquare,
  Users,
  ShieldAlert,
  ClipboardList,
  History,
  QrCode,
  Building2,
  FileCheck,
  Laptop,
  BookOpen,
  CheckCircle2,
  Layers
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  // Student Links
  const studentLinks = [
    { to: '/dashboard', label: 'Student Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/fee-status', label: 'Official Fee Status', icon: <DollarSign className="w-4 h-4" /> },
    { to: '/apply-nodues', label: 'Apply for No-Dues', icon: <FileText className="w-4 h-4" /> },
    { to: '/my-requests', label: 'Clearance Pipeline', icon: <ClipboardList className="w-4 h-4" /> },
    { to: '/exam-eligibility', label: 'Exam Eligibility', icon: <GraduationCap className="w-4 h-4" /> },
    { to: '/my-certificate', label: 'Digital Certificate', icon: <Award className="w-4 h-4" /> },
  ];

  // Faculty & Class Coordinator Links
  const coordinatorLinks = [
    { to: '/dashboard', label: 'Coordinator Queue', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/faculty/students', label: 'Enrolled Students', icon: <Users className="w-4 h-4" /> },
    { to: '/faculty/attendance', label: 'Academic Attendance', icon: <CheckCircle2 className="w-4 h-4" /> },
    { to: '/coordinator/cleared', label: 'Approved Cohort', icon: <FileCheck className="w-4 h-4" /> },
  ];

  // IT Department Links
  const itLinks = [
    { to: '/dashboard', label: 'IT Clearance Queue', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/it/queue', label: 'Lab Assets Review', icon: <Laptop className="w-4 h-4" /> },
    { to: '/department/approved', label: 'Approved Students', icon: <FileCheck className="w-4 h-4" /> },
  ];

  // Account Section Links
  const accountLinks = [
    { to: '/dashboard', label: 'Fee Clearance Queue', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/account/fees', label: 'Student Fee Records', icon: <DollarSign className="w-4 h-4" /> },
    { to: '/department/approved', label: 'Fee Cleared Students', icon: <FileCheck className="w-4 h-4" /> },
  ];

  // Library Links
  const libraryLinks = [
    { to: '/dashboard', label: 'Library Clearance Queue', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/library/queue', label: 'Book Returns & Fines', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/department/approved', label: 'Cleared Borrowers', icon: <FileCheck className="w-4 h-4" /> },
  ];

  // Student Section Links
  const studentSectionLinks = [
    { to: '/dashboard', label: 'Administrative Queue', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/department/approved', label: 'Cleared Records', icon: <FileCheck className="w-4 h-4" /> },
  ];

  // Examination Controller Links
  const examControllerLinks = [
    { to: '/dashboard', label: 'Final Exam Authorization', icon: <GraduationCap className="w-4 h-4" /> },
    { to: '/exam/eligible', label: 'Exam Eligible Students', icon: <Award className="w-4 h-4" /> },
    { to: '/exam/audit', label: 'Cryptographic Dossiers', icon: <History className="w-4 h-4" /> },
  ];

  // Admin Links
  const adminLinks = [
    { to: '/dashboard', label: 'Admin Command Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/admin/users', label: 'User & Staff Management', icon: <Users className="w-4 h-4" /> },
    { to: '/admin/students', label: 'Student Management', icon: <GraduationCap className="w-4 h-4" /> },
    { to: '/admin/monitor', label: 'Clearance Pipeline Monitor', icon: <Layers className="w-4 h-4" /> },
    { to: '/admin/certificates', label: 'Certificates & Revocation', icon: <Award className="w-4 h-4" /> },
    { to: '/admin/audit-logs', label: 'System Audit Logs', icon: <History className="w-4 h-4" /> },
    { to: '/admin/security-events', label: 'Security Threat Monitor', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  let links = studentLinks;
  let sectionTitle = 'Student Portal';
  let badgeColor = 'bg-blue-900/60 text-blue-300 border-blue-700/50';

  if (role === 'ADMIN') {
    links = adminLinks;
    sectionTitle = 'Administration';
    badgeColor = 'bg-rose-900/60 text-rose-300 border-rose-700/50';
  } else if (role === 'EXAMINATION_CONTROLLER') {
    links = examControllerLinks;
    sectionTitle = 'Exam Controller';
    badgeColor = 'bg-purple-900/60 text-purple-300 border-purple-700/50';
  } else if (role === 'CLASS_COORDINATOR') {
    links = coordinatorLinks;
    sectionTitle = 'Class Coordinator';
    badgeColor = 'bg-teal-900/60 text-teal-300 border-teal-700/50';
  } else if (role === 'IT_DEPARTMENT') {
    links = itLinks;
    sectionTitle = 'IT Infrastructure';
    badgeColor = 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50';
  } else if (role === 'ACCOUNT_SECTION') {
    links = accountLinks;
    sectionTitle = 'Account Section';
    badgeColor = 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50';
  } else if (role === 'LIBRARY') {
    links = libraryLinks;
    sectionTitle = 'University Library';
    badgeColor = 'bg-amber-900/60 text-amber-300 border-amber-700/50';
  } else if (role === 'STUDENT_SECTION') {
    links = studentSectionLinks;
    sectionTitle = 'Student Affairs';
    badgeColor = 'bg-blue-900/60 text-blue-300 border-blue-700/50';
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 shadow-lg">
      <div>
        <div className="flex items-center justify-between px-3 mb-4">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Navigation Menu
          </span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
            {sectionTitle}
          </span>
        </div>

        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <div className="text-slate-400 group-hover:text-white">
                {link.icon}
              </div>
              <span className="truncate">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* University System Security Badge */}
      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2 text-[11px] text-slate-400 mt-6">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Session Encrypted</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Asymmetric RSA-2048 signing & TOTP RFC 6238 MFA active.
        </p>
      </div>
    </aside>
  );
};
