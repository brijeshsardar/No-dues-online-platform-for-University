import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Laptop,
  DollarSign,
  BookOpen,
  ClipboardList,
  Award,
  Search,
  ExternalLink,
  Users
} from 'lucide-react';
import { DemoCredentialsHelper } from '../components/DemoCredentialsHelper.js';

export const PortalSelect: React.FC = () => {
  const [search, setSearch] = useState('');

  const portals = [
    {
      id: 'student',
      title: 'Student Portal',
      category: 'Student',
      path: '/login/student',
      color: 'blue',
      badge: 'Academic & Clearance',
      icon: <GraduationCap className="w-7 h-7 text-blue-600" />,
      desc: 'Enrolled students can submit digital no-dues requests, inspect fee verification records, track sequential clearance, and download official certificates.',
      bullets: [
        'Apply for No-Dues Clearance',
        'Inspect Authoritative Fee Status',
        'Download RSA-Signed Certificate with QR',
      ],
    },
    {
      id: 'student-section',
      title: 'Student Section Portal',
      category: 'STUDENT ADMINISTRATION',
      path: '/login/student-section',
      color: 'sky',
      badge: 'Student Administration',
      icon: <Users className="w-7 h-7 text-sky-600" />,
      desc: 'Manage student registration, personal details, academic records, enrollment information and student profiles.',
      bullets: [
        'Register New Students',
        'Manage Student Profiles',
        'Update Academic Information',
        'View Student Records',
        'Manage Enrollment Details',
      ],
    },
    {
      id: 'faculty',
      title: 'Faculty & Coordinator Portal',
      category: 'Faculty',
      path: '/login/faculty',
      color: 'indigo',
      badge: 'Academic Coordination',
      icon: <Building2 className="w-7 h-7 text-indigo-600" />,
      desc: 'Class coordinators and academic faculty members can review student attendance, inspect academic performance, and authorize clearance.',
      bullets: [
        'Enrolled Cohort Roster & Attendance Checks',
        'Academic Clearance Verification',
        'Coordinate Departmental Approvals',
      ],
    },
    {
      id: 'admin',
      title: 'University Administration Terminal',
      category: 'Admin',
      path: '/login/admin',
      color: 'rose',
      badge: 'Chief Administration',
      icon: <ShieldAlert className="w-7 h-7 text-rose-600" />,
      desc: 'Chief university administrators can manage user accounts, oversee clearance processes, adjust fees, review audit logs, and monitor security events.',
      bullets: [
        'Manage Students, Faculty & System Roles',
        'Real-Time Threat Surveillance & Lockout Controls',
        'Cryptographic Certificate Revocation Engine',
      ],
    },
    {
      id: 'it',
      title: 'IT Infrastructure Portal',
      category: 'Department',
      path: '/login/it',
      color: 'cyan',
      badge: 'Technical Services',
      icon: <Laptop className="w-7 h-7 text-cyan-600" />,
      desc: 'Verify campus computing assets, lab hardware returns, and campus network account de-provisioning with cryptographic integrity hashes.',
      bullets: [
        'Lab Hardware & Asset Verification',
        'Campus Network Credentials Clearance',
        'SHA-256 Approval Digest Generation',
      ],
    },
    {
      id: 'account',
      title: 'Account Section Portal',
      category: 'Department',
      path: '/login/account',
      color: 'emerald',
      badge: 'Financial Services',
      icon: <DollarSign className="w-7 h-7 text-emerald-600" />,
      desc: 'Authoritative source of fee records. Inspect student tuition, exam, and hostel fees. System blocks approval if unpaid dues remain.',
      bullets: [
        'Authoritative Fee Clearance & Verification',
        'Automatic Fee Deficit Block Enforcement',
        'Transaction Reference & Receipt Logging',
      ],
    },
    {
      id: 'library',
      title: 'University Library Portal',
      category: 'Department',
      path: '/login/library',
      color: 'amber',
      badge: 'Library & Learning',
      icon: <BookOpen className="w-7 h-7 text-amber-600" />,
      desc: 'Verify returned books, catalog borrower records, and ensure zero outstanding library fines prior to clearance sign-off.',
      bullets: [
        'Borrower Checkout History Inspection',
        'Overdue Book Return Verification',
        'Fine Clearance & Library Sign-Off',
      ],
    },
    {
      id: 'coordinator',
      title: 'Class Coordinator Portal',
      category: 'Faculty',
      path: '/login/coordinator',
      color: 'teal',
      badge: 'Academic Sign-Off',
      icon: <ClipboardList className="w-7 h-7 text-teal-600" />,
      desc: 'Review 4 department pre-requisites and verify minimum 75% student attendance compliance before endorsing for examination.',
      bullets: [
        'Attendance Compliance Verification (>75%)',
        'Prerequisite Department Clearance Audit',
        'Academic Clearance Recommendation',
      ],
    },
    {
      id: 'exam-controller',
      title: 'Controller of Examinations Portal',
      category: 'Department',
      path: '/login/exam-controller',
      color: 'purple',
      badge: 'Final Authority',
      icon: <Award className="w-7 h-7 text-purple-600" />,
      desc: 'Highest clearance authority: Re-verifies all prerequisites and issues tamper-evident RSA-2048 cryptographically signed certificates.',
      bullets: [
        'Dual-Verification of Fee & Academic Records',
        'Asymmetric RSA-2048 Cryptographic Signing',
        'Instant High-Density QR Verification Generation',
      ],
    },
  ];

  const filteredPortals = portals.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Gateway Banner */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-widest bg-blue-100/70 px-3 py-1 rounded-full border border-blue-200">
              OFFICIAL INSTITUTIONAL GATEWAY
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2.5">
              CT UNIVERSITY DIGITAL CLEARANCE SYSTEM
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto mt-2 leading-relaxed">
              Select your designated institutional login portal. Each role features isolated sessions, role-based access control (RBAC), and cryptographically verified workflows.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-md mx-auto pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search portals (e.g. Student, Faculty, IT, Library, Accounts)..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2">
          {filteredPortals.map((portal) => (
            <div
              key={portal.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {portal.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    {portal.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-3">
                    {portal.desc}
                  </p>
                </div>

                <div className="text-[10px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {portal.bullets.map((b, i) => (
                    <div key={i} className="truncate">• {b}</div>
                  ))}
                </div>
              </div>

              <Link
                to={portal.path}
                className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group-hover:shadow-blue-500/20"
              >
                <span>Enter Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Public Online Verification Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4 border border-emerald-800/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">Public Certificate Verification Portal</h4>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Scan QR codes or enter 192-bit cryptographic verification tokens without signing in.
              </p>
            </div>
          </div>
          <Link
            to="/verify"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
          >
            <span>Verify Certificate Online</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Demo Credentials Helper */}
      <DemoCredentialsHelper />
    </div>
  );
};
