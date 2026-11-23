import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Bell,
  LogOut,
  ChevronDown,
  User,
  CheckCircle,
  FileText,
  DollarSign,
  Laptop,
  BookOpen,
  ClipboardList,
  Award,
  Layers,
  Menu,
  X
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, notifications, unreadCount, markNotificationRead } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPortalsMenu, setShowPortalsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate('/login');
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'STUDENT': return 'Student';
      case 'ACCOUNT_SECTION': return 'Account Section Officer';
      case 'STUDENT_SECTION': return 'Student Affairs Registrar';
      case 'LIBRARY': return 'Chief Librarian';
      case 'IT_DEPARTMENT': return 'IT Infrastructure';
      case 'CLASS_COORDINATOR': return 'Class Coordinator';
      case 'EXAMINATION_CONTROLLER': return 'Controller of Examinations';
      case 'ADMIN': return 'System Administrator';
      default: return role || 'Guest';
    }
  };

  // Role-Aware Navigation Links
  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'STUDENT':
        return [
          { label: 'My Dashboard', path: '/dashboard', icon: <GraduationCap className="w-3.5 h-3.5" /> },
          { label: 'Clearance Status', path: '/my-requests', icon: <ClipboardList className="w-3.5 h-3.5" /> },
          { label: 'Fee Details', path: '/fee-status', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { label: 'Digital Certificate', path: '/my-certificate', icon: <Award className="w-3.5 h-3.5" /> },
        ];
      case 'CLASS_COORDINATOR':
        return [
          { label: 'Coordinator Dashboard', path: '/dashboard', icon: <Building2 className="w-3.5 h-3.5" /> },
          { label: 'Enrolled Students', path: '/faculty/students', icon: <User className="w-3.5 h-3.5" /> },
          { label: 'Academic Attendance', path: '/faculty/attendance', icon: <CheckCircle className="w-3.5 h-3.5" /> },
        ];
      case 'ADMIN':
        return [
          { label: 'Admin Overview', path: '/dashboard', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
          { label: 'User & Staff Management', path: '/admin/users', icon: <User className="w-3.5 h-3.5" /> },
          { label: 'Clearance Monitor', path: '/admin/monitor', icon: <Layers className="w-3.5 h-3.5" /> },
          { label: 'Security & Audit Logs', path: '/admin/audit-logs', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
        ];
      case 'IT_DEPARTMENT':
        return [
          { label: 'IT Dashboard', path: '/dashboard', icon: <Laptop className="w-3.5 h-3.5" /> },
          { label: 'Lab Assets Queue', path: '/it/queue', icon: <Layers className="w-3.5 h-3.5" /> },
        ];
      case 'ACCOUNT_SECTION':
        return [
          { label: 'Account Dashboard', path: '/dashboard', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { label: 'Student Fee Records', path: '/account/fees', icon: <FileText className="w-3.5 h-3.5" /> },
        ];
      case 'LIBRARY':
        return [
          { label: 'Library Dashboard', path: '/dashboard', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { label: 'Book Returns & Fines', path: '/library/queue', icon: <Layers className="w-3.5 h-3.5" /> },
        ];
      case 'EXAMINATION_CONTROLLER':
        return [
          { label: 'Exam Controller Dashboard', path: '/dashboard', icon: <Award className="w-3.5 h-3.5" /> },
          { label: 'Eligible Students', path: '/exam/eligible', icon: <CheckCircle className="w-3.5 h-3.5" /> },
        ];
      default:
        return [{ label: 'Dashboard', path: '/dashboard', icon: <GraduationCap className="w-3.5 h-3.5" /> }];
    }
  };

  const navItems = getNavItems();

  const allPortals = [
    { label: 'Student Portal', path: '/login/student', desc: 'Enrolled students clearance & certificates', icon: <GraduationCap className="w-4 h-4 text-blue-400" /> },
    { label: 'Faculty & Coordinator Portal', path: '/login/faculty', desc: 'Class coordinators & academic faculty', icon: <Building2 className="w-4 h-4 text-indigo-400" /> },
    { label: 'Admin Command Terminal', path: '/login/admin', desc: 'System administrator & security surveillance', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
    { label: 'IT Department Portal', path: '/login/it', desc: 'Lab assets & computing credentials', icon: <Laptop className="w-4 h-4 text-cyan-400" /> },
    { label: 'Account Section Portal', path: '/login/account', desc: 'Tuition fees & official clearance verification', icon: <DollarSign className="w-4 h-4 text-emerald-400" /> },
    { label: 'Library Clearance Portal', path: '/login/library', desc: 'Book returns & fines verification', icon: <BookOpen className="w-4 h-4 text-amber-400" /> },
    { label: 'Coordinator Portal', path: '/login/coordinator', desc: 'Class attendance & academic eligibility', icon: <ClipboardList className="w-4 h-4 text-teal-400" /> },
    { label: 'Exam Controller Portal', path: '/login/exam-controller', desc: 'Final exam authorization & digital certificates', icon: <Award className="w-4 h-4 text-purple-400" /> },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Crest & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wide text-white">CT UNIVERSITY</span>
              <span className="bg-blue-900/80 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-700/50">
                OFFICIAL PORTAL
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium tracking-tight">
              Secure Digital No-Dues & Examination Clearance System
            </div>
          </div>
        </Link>

        {/* Center Navigation - Role Aware */}
        {user ? (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          /* Public Portals Dropdown */
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowPortalsMenu(!showPortalsMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>University Login Portals</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPortalsMenu && (
                <div
                  onMouseLeave={() => setShowPortalsMenu(false)}
                  className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-900 p-2 z-50 animate-fade-in"
                >
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Select Institutional Portal
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 py-1">
                    {allPortals.map((p) => (
                      <Link
                        key={p.path}
                        to={p.path}
                        onClick={() => setShowPortalsMenu(false)}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-blue-50/70 transition-colors group"
                      >
                        <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white transition-colors shrink-0">
                          {p.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {p.label}
                          </div>
                          <div className="text-[11px] text-slate-500 leading-tight">
                            {p.desc}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {/* Public Verification Link */}
          <Link
            to="/verify"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Certificate Online</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Drawer */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-900 overflow-hidden z-50 animate-fade-in">
                    <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-sm">Clearance Notifications</span>
                      </div>
                      <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full font-medium">
                        {unreadCount} unread
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          No notifications yet. You will receive updates as clearances progress.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                              !n.isRead ? 'bg-blue-50/60 font-medium' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-900">{n.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile & Logout Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left pr-1">
                    <div className="text-xs font-bold text-white truncate max-w-[130px] leading-tight">
                      {user.fullName}
                    </div>
                    <div className="text-[10px] text-blue-300 font-semibold leading-tight">
                      {getRoleDisplayName(user.role)}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div
                    onMouseLeave={() => setShowUserMenu(false)}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-900 p-2 z-50 animate-fade-in"
                  >
                    <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-xl mb-1">
                      <div className="font-bold text-xs text-slate-900">{user.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
                      <div className="mt-1.5 inline-block text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {getRoleDisplayName(user.role)}
                      </div>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>My Dashboard</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-t border-slate-100 pt-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
