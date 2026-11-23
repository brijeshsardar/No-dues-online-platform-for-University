import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Layers,
  Settings,
  Bell,
  Lock,
  Eye,
  KeyRound,
  ShieldCheck,
  Edit,
  UserCheck,
  Clock,
  RotateCcw,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ExternalLink,
  Award,
  RefreshCw
} from 'lucide-react';

interface Student {
  id: string;
  studentId: string;
  enrollmentNo: string;
  admissionNumber?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  admissionDate?: string | null;
  enrollmentStatus: string;
  batchYear?: string;
  courseId: string;
  course?: { id: string; name: string; code: string };
  semesterId: string;
  semester?: { id: string; name: string; number: number; code: string };
  department?: { id: string; name: string; code: string } | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    isActive: boolean;
    lastLoginAt?: string | null;
  };
  feeRecords?: Array<{
    totalFee: number;
    paidAmount: number;
    outstandingBalance: number;
    paymentStatus: string;
  }>;
}

interface Course {
  id: string;
  code: string;
  name: string;
  departmentName: string;
  durationYears: number;
  _count?: { students: number };
}

interface Semester {
  id: string;
  number: number;
  code: string;
  name: string;
}

export const StudentSectionPortal: React.FC = () => {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active module tab
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [clearanceQueue, setClearanceQueue] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Inspection State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [clearanceAction, setClearanceAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [clearanceRemarks, setClearanceRemarks] = useState('');

  // Action status feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Student Registration Form State
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    fatherName: '',
    motherName: '',
    dob: '2004-05-15',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    photoUrl: '',
    studentId: '',
    rollNumber: '',
    admissionNumber: '',
    courseId: '',
    semesterId: '',
    academicSession: '2025-2026',
    admissionDate: new Date().toISOString().split('T')[0],
    enrollmentStatus: 'ACTIVE',
    batchYear: '2025-2029',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  // New Course Form State
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    departmentName: 'School of Engineering and Technology',
    durationYears: 4,
  });

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, [token]);

  const fetchInitialData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      const [statsRes, studentsRes, coursesRes, semRes, queueRes] = await Promise.all([
        fetch('/api/student-section/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student-section/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student-section/courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student-section/semesters', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student-section/clearance-queue', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students || []);
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.courses || []);
        if (data.courses?.length > 0 && !newStudent.courseId) {
          setNewStudent((prev) => ({ ...prev, courseId: data.courses[0].id }));
        }
      }
      if (semRes.ok) {
        const data = await semRes.json();
        setSemesters(data.semesters || []);
        if (data.semesters?.length > 0 && !newStudent.semesterId) {
          setNewStudent((prev) => ({ ...prev, semesterId: data.semesters[0].id }));
        }
      }
      if (queueRes.ok) {
        const data = await queueRes.json();
        setClearanceQueue(data.requests || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading Student Section records.');
    } finally {
      setLoading(false);
    }
  };

  // Register New Student
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudent.password !== newStudent.confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/student-section/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newStudent),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register student');
      }

      setSuccessMsg(`Student ${data.student.studentId} (${data.student.user.fullName}) registered successfully! Student login account generated.`);
      // Reset form
      setNewStudent({
        fullName: '',
        fatherName: '',
        motherName: '',
        dob: '2004-05-15',
        gender: 'Male',
        phone: '',
        email: '',
        address: '',
        photoUrl: '',
        studentId: '',
        rollNumber: '',
        admissionNumber: '',
        courseId: courses[0]?.id || '',
        semesterId: semesters[0]?.id || '',
        academicSession: '2025-2026',
        admissionDate: new Date().toISOString().split('T')[0],
        enrollmentStatus: 'ACTIVE',
        batchYear: '2025-2029',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      // Refresh list
      fetchInitialData();
      setActiveTab('manage');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Student Account Active/Suspended
  const handleToggleStatus = async (student: Student) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/student-section/students/${student.id}/toggle-status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Status updated: ${student.user.fullName} is now ${data.isActive ? 'ACTIVE' : 'SUSPENDED'}`);
      fetchInitialData();
      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) => prev ? {
          ...prev,
          enrollmentStatus: data.enrollmentStatus,
          user: { ...prev.user, isActive: data.isActive }
        } : null);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Student Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newPassword) return;

    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/student-section/students/${selectedStudent.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(data.message || 'Password reset successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/student-section/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCourse),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Course ${data.course.name} (${data.course.code}) added successfully.`);
      setNewCourse({ code: '', name: '', departmentName: 'School of Engineering and Technology', durationYears: 4 });
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Clearance Action for Student Section
  const handleClearanceAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/student-section/clearance-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: clearanceAction,
          remarks: clearanceRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(data.message || 'Conduct clearance action submitted successfully.');
      setShowClearanceModal(false);
      setSelectedRequest(null);
      setClearanceRemarks('');
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      s.studentId.toLowerCase().includes(q) ||
      s.enrollmentNo.toLowerCase().includes(q) ||
      s.user.fullName.toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q) ||
      (s.user.phone && s.user.phone.toLowerCase().includes(q));

    const matchesCourse = !selectedCourse || s.courseId === selectedCourse;
    const matchesSemester = !selectedSemester || s.semesterId === selectedSemester;
    const matchesStatus = !selectedStatus || s.enrollmentStatus === selectedStatus;

    return matchesSearch && matchesCourse && matchesSemester && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-blue-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/30 text-sky-200 border border-sky-400/30">
                Official Registrar Terminal
              </span>
              <span className="flex items-center gap-1 text-[11px] text-sky-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Verified Student Administration Session
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Student Section Portal
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 max-w-2xl">
              Central university registry for student enrollment records, academic registration, personal dossier management, and conduct clearance verification.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('register')}
              className="px-4 py-2 bg-white text-sky-900 hover:bg-sky-50 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-sky-700" />
              <span>Register Student</span>
            </button>
            <button
              onClick={fetchInitialData}
              disabled={loading}
              className="p-2 bg-sky-800/80 hover:bg-sky-700 text-white rounded-xl border border-sky-600/50 transition cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-100 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-200 hover:text-white font-bold ml-2">×</button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-400/40 rounded-xl text-rose-100 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-200 hover:text-white font-bold ml-2">×</button>
          </div>
        )}
      </div>

      {/* 12 Module Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex items-center gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
        {[
          { id: 'overview', label: '1. Dashboard Overview', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'register', label: '2. Add New Student', icon: <UserPlus className="w-3.5 h-3.5" /> },
          { id: 'manage', label: '3. Manage Students', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'enrollments', label: '4. Enrollment Records', icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: 'personal', label: '5. Personal Details', icon: <UserCheck className="w-3.5 h-3.5" /> },
          { id: 'academic', label: '6. Academic Information', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'courses', label: '7. Courses & Semesters', icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'documents', label: '8. Student Documents', icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'search', label: '9. Student Search', icon: <Search className="w-3.5 h-3.5" /> },
          { id: 'conduct', label: '10. Clearance Verification', icon: <Award className="w-3.5 h-3.5" /> },
          { id: 'notifications', label: '11. Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
          { id: 'profile', label: '12. Profile & Settings', icon: <Settings className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Registered Students</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalStudents || students.length}</h3>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Enrolled across all faculties</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Enrollment Status</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-1">{stats?.activeStudents || students.filter(s => s.enrollmentStatus === 'ACTIVE').length}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Good academic standing</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Offered Degree Programs</p>
                <h3 className="text-2xl font-black text-indigo-700 mt-1">{courses.length}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Undergraduate & Graduate</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Conduct Approvals</p>
                <h3 className="text-2xl font-black text-amber-700 mt-1">{clearanceQueue.filter(q => q.currentStage === 'STUDENT_SECTION').length}</h3>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Awaiting Student Section sign-off</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Students */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Recent Student Enrollments
                  </h3>
                  <p className="text-xs text-slate-500">Latest admission records recorded in system</p>
                </div>
                <button
                  onClick={() => setActiveTab('manage')}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  View Directory <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {students.slice(0, 5).map((student) => (
                  <div key={student.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center">
                        {student.user.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{student.user.fullName}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {student.studentId} • {student.course?.code || 'BTECH'} • {student.semester?.code || 'SEM-1'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        student.enrollmentStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {student.enrollmentStatus}
                      </span>
                      <button
                        onClick={() => { setSelectedStudent(student); setActiveTab('personal'); }}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Registrar Quick Actions
              </h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => setActiveTab('register')}
                  className="w-full p-3 rounded-xl border border-sky-100 bg-sky-50/50 hover:bg-sky-100 text-sky-900 font-bold text-xs flex items-center gap-3 transition cursor-pointer"
                >
                  <UserPlus className="w-5 h-5 text-sky-600" />
                  <div className="text-left">
                    <div>Register New Student</div>
                    <div className="text-[10px] text-sky-700/80 font-normal">Generate student account & profile</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('conduct')}
                  className="w-full p-3 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-3 transition cursor-pointer"
                >
                  <Award className="w-5 h-5 text-amber-600" />
                  <div className="text-left">
                    <div>Conduct Clearance Queue</div>
                    <div className="text-[10px] text-amber-700/80 font-normal">
                      {clearanceQueue.filter(q => q.currentStage === 'STUDENT_SECTION').length} requests pending review
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('courses')}
                  className="w-full p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center gap-3 transition cursor-pointer"
                >
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <div className="text-left">
                    <div>Curriculum & Semesters</div>
                    <div className="text-[10px] text-indigo-700/80 font-normal">Inspect course distribution & cohorts</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD NEW STUDENT (REGISTRATION FORM) */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 px-2.5 py-0.5 rounded-full border border-sky-200 uppercase tracking-wider">
              Student Enrollment Form
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">
              Register New University Student
            </h2>
            <p className="text-xs text-slate-500">
              Fill in student personal details, academic cohort information, and set up individual student login credentials.
            </p>
          </div>

          <form onSubmit={handleRegisterStudent} className="space-y-6">
            {/* Section A: Personal Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px]">A</span>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.fullName}
                    onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                    placeholder="e.g. Aryan Sharma"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })}
                    placeholder="e.g. R. K. Sharma"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mother's Name</label>
                  <input
                    type="text"
                    value={newStudent.motherName}
                    onChange={(e) => setNewStudent({ ...newStudent, motherName: e.target.value })}
                    placeholder="e.g. Sunita Sharma"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newStudent.dob}
                    onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Permanent Residential Address</label>
                  <input
                    type="text"
                    value={newStudent.address}
                    onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                    placeholder="Campus Hostel Block A / City Residence"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Photograph URL</label>
                  <input
                    type="url"
                    value={newStudent.photoUrl}
                    onChange={(e) => setNewStudent({ ...newStudent, photoUrl: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Academic Information */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px]">B</span>
                Academic & Enrollment Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Registration No (Unique ID) *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value.toUpperCase() })}
                    placeholder="e.g. CT-2026-1050"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Roll / Enrollment Number *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.rollNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. EN20261050"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={newStudent.admissionNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, admissionNumber: e.target.value })}
                    placeholder="e.g. ADM-2026-9050"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enrolled Course / Program *</label>
                  <select
                    required
                    value={newStudent.courseId}
                    onChange={(e) => setNewStudent({ ...newStudent, courseId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Semester *</label>
                  <select
                    required
                    value={newStudent.semesterId}
                    onChange={(e) => setNewStudent({ ...newStudent, semesterId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={newStudent.academicSession}
                    onChange={(e) => setNewStudent({ ...newStudent, academicSession: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Login Account Credentials */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px]">C</span>
                Student Login Account Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student University Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    placeholder="aryan.sharma@ctuniversity.edu"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Password *</label>
                  <input
                    type="password"
                    required
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={newStudent.confirmPassword}
                    onChange={(e) => setNewStudent({ ...newStudent, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Saving Student Record...' : 'Complete Registration & Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MANAGE STUDENTS TABLE */}
      {/* ========================================================================= */}
      {(activeTab === 'manage' || activeTab === 'search' || activeTab === 'enrollments') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                {activeTab === 'enrollments' ? 'Student Enrollment Records' : 'Registered Student Directory'}
              </h2>
              <p className="text-xs text-slate-500">
                {filteredStudents.length} student records found
              </p>
            </div>
            <button
              onClick={() => setActiveTab('register')}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, Reg No, Roll No, Email..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Degree Programs</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Semesters</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="GRADUATED">GRADUATED</option>
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student Profile</th>
                  <th className="py-3 px-4">Reg No / Roll No</th>
                  <th className="py-3 px-4">Course & Semester</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No student records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0">
                            {s.user.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{s.user.fullName}</div>
                            <div className="text-[11px] text-slate-500">{s.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800">{s.studentId}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{s.enrollmentNo}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{s.course?.code || 'BTECH'}</div>
                        <div className="text-[11px] text-slate-500">{s.semester?.name || '5th Sem'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.enrollmentStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {s.enrollmentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => { setSelectedStudent(s); setActiveTab('personal'); }}
                          className="px-2 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50 rounded-lg cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => { setSelectedStudent(s); setShowPasswordModal(true); }}
                          className="px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                            s.user.isActive
                              ? 'text-rose-700 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {s.user.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STUDENT PERSONAL DETAILS & DOSSIER */}
      {/* ========================================================================= */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 px-2.5 py-0.5 rounded-full border border-sky-200 uppercase tracking-wider">
                Student Profile Dossier
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                {selectedStudent ? selectedStudent.user.fullName : 'Select a student from directory'}
              </h2>
              {selectedStudent && (
                <p className="text-xs text-slate-500 font-mono">
                  {selectedStudent.studentId} • {selectedStudent.user.email}
                </p>
              )}
            </div>

            {selectedStudent && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Reset Password</span>
                </button>
                <button
                  onClick={() => handleToggleStatus(selectedStudent)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer ${
                    selectedStudent.user.isActive
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{selectedStudent.user.isActive ? 'Suspend Account' : 'Activate Account'}</span>
                </button>
              </div>
            )}
          </div>

          {!selectedStudent ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-xs">No student selected. Please select a student from the directory.</p>
              <button
                onClick={() => setActiveTab('manage')}
                className="mt-3 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Browse Students
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Personal Information</h4>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-slate-500">Father's Name:</span> <strong className="text-slate-800">{selectedStudent.fatherName || 'Not recorded'}</strong></div>
                  <div><span className="text-slate-500">Mother's Name:</span> <strong className="text-slate-800">{selectedStudent.motherName || 'Not recorded'}</strong></div>
                  <div><span className="text-slate-500">Date of Birth:</span> <strong className="text-slate-800">{selectedStudent.dob || 'Not recorded'}</strong></div>
                  <div><span className="text-slate-500">Gender:</span> <strong className="text-slate-800">{selectedStudent.gender || 'Not Specified'}</strong></div>
                  <div><span className="text-slate-500">Phone:</span> <strong className="text-slate-800">{selectedStudent.user.phone || 'N/A'}</strong></div>
                  <div><span className="text-slate-500">Address:</span> <strong className="text-slate-800">{selectedStudent.address || 'Campus Resident'}</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Academic Standing</h4>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-slate-500">Course / Degree:</span> <strong className="text-slate-800">{selectedStudent.course?.name} ({selectedStudent.course?.code})</strong></div>
                  <div><span className="text-slate-500">Current Semester:</span> <strong className="text-slate-800">{selectedStudent.semester?.name}</strong></div>
                  <div><span className="text-slate-500">Enrollment No:</span> <strong className="font-mono text-slate-800">{selectedStudent.enrollmentNo}</strong></div>
                  <div><span className="text-slate-500">Batch Year:</span> <strong className="text-slate-800">{selectedStudent.batchYear || '2022-2026'}</strong></div>
                  <div><span className="text-slate-500">Admission Date:</span> <strong className="text-slate-800">{selectedStudent.admissionDate || 'N/A'}</strong></div>
                  <div><span className="text-slate-500">Status:</span> <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">{selectedStudent.enrollmentStatus}</span></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Account & Security</h4>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-slate-500">Account Active:</span> <strong className={selectedStudent.user.isActive ? 'text-emerald-700' : 'text-rose-700'}>{selectedStudent.user.isActive ? 'YES (Active)' : 'NO (Suspended)'}</strong></div>
                  <div><span className="text-slate-500">User ID:</span> <strong className="font-mono text-slate-800">{selectedStudent.user.id.slice(0, 12)}...</strong></div>
                  <div><span className="text-slate-500">Last Login:</span> <strong className="text-slate-800">{selectedStudent.user.lastLoginAt ? new Date(selectedStudent.user.lastLoginAt).toLocaleString() : 'Never logged in'}</strong></div>
                  <div><span className="text-slate-500">Role:</span> <strong className="text-sky-700 font-bold">STUDENT</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. COURSES & SEMESTERS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Add New Academic Course / Degree Program
            </h3>
            <form onSubmit={handleCreateCourse} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BTECH_AI"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="e.g. B.Tech in Artificial Intelligence"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Faculty / School</label>
                <input
                  type="text"
                  value={newCourse.departmentName}
                  onChange={(e) => setNewCourse({ ...newCourse, departmentName: e.target.value })}
                  placeholder="School of Engineering"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Existing University Degree Programs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div key={course.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {course._count?.students || 0} Students
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{course.name}</h4>
                  <p className="text-[11px] text-slate-500">{course.departmentName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. STUDENT DOCUMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Student Document Dossiers & Verification
            </h3>
            <p className="text-xs text-slate-500">
              Inspect admission documents, verified student identities, and bonafide certification records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">1</div>
              <h4 className="text-xs font-bold text-slate-900">Student Identity Verification</h4>
              <p className="text-[11px] text-slate-500">
                Official enrollment numbers and institutional email domains are verified upon admission.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">2</div>
              <h4 className="text-xs font-bold text-slate-900">Conduct Verification Dossier</h4>
              <p className="text-[11px] text-slate-500">
                Disciplinary records and academic conduct checked before signing off clearance pipeline.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">3</div>
              <h4 className="text-xs font-bold text-slate-900">Digital No-Dues Clearance</h4>
              <p className="text-[11px] text-slate-500">
                Forwarded sequentially to Library, IT, and Coordinator after Student Section approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. CONDUCT & CLEARANCE VERIFICATION */}
      {/* ========================================================================= */}
      {activeTab === 'conduct' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Student Section Conduct Clearance Queue
              </h3>
              <p className="text-xs text-slate-500">
                Verify student administrative conduct, disciplinary status, and enrollment standing in the 6-stage clearance pipeline.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
              {clearanceQueue.filter(q => q.currentStage === 'STUDENT_SECTION').length} Pending
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Current Pipeline Stage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clearanceQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No clearance requests pending review.
                    </td>
                  </tr>
                ) : (
                  clearanceQueue.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {req.student?.user?.fullName}
                        <div className="text-[11px] font-normal text-slate-500 font-mono">
                          {req.student?.studentId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {req.student?.course?.code || 'BTECH'} • {req.student?.semester?.code || 'SEM-5'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {req.currentStage}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.overallStatus.includes('APPROVED') || req.overallStatus.includes('ISSUED')
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.overallStatus === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.overallStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.currentStage === 'STUDENT_SECTION' ? (
                          <button
                            onClick={() => { setSelectedRequest(req); setShowClearanceModal(true); }}
                            className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Verify & Sign Off
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Not at this stage</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
            Student Section Notifications & Alerts
          </h3>
          <div className="divide-y divide-slate-100">
            <div className="py-3 flex items-start gap-3">
              <Bell className="w-4 h-4 text-sky-600 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Academic Year 2025-2026 Admissions Active</h4>
                <p className="text-[11px] text-slate-500">Student Section is authorized to register and enroll new students.</p>
              </div>
            </div>
            <div className="py-3 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Cryptographic Clearance Pipeline Active</h4>
                <p className="text-[11px] text-slate-500">Digital clearance requests flow sequentially from Account Section to Student Section.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. PROFILE & SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Student Section Officer Profile & Settings
            </h3>
            <p className="text-xs text-slate-500">
              Department permissions, administrative credentials, and session details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider">Officer Credentials</h4>
              <div><span className="text-slate-500">Name:</span> <strong className="text-slate-900">{user?.fullName}</strong></div>
              <div><span className="text-slate-500">Email:</span> <strong className="text-slate-900">{user?.email}</strong></div>
              <div><span className="text-slate-500">Role:</span> <strong className="text-sky-700 font-bold">{user?.role}</strong></div>
              <div><span className="text-slate-500">Department:</span> <strong className="text-slate-900">Student Section (Registrar Office)</strong></div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider">Departmental Responsibilities</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Register new university students into database</li>
                <li>Create secure individual student login accounts</li>
                <li>Manage student profile and personal information</li>
                <li>Update academic enrollment and session statuses</li>
                <li>Verify student conduct for examination clearance</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET STUDENT PASSWORD */}
      {/* ========================================================================= */}
      {showPasswordModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Reset Student Password
              </h3>
              <button
                onClick={() => { setShowPasswordModal(false); setNewPassword(''); }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Reset the login password for <strong>{selectedStudent.user.fullName}</strong> ({selectedStudent.studentId}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setNewPassword(''); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEARANCE ACTION */}
      {/* ========================================================================= */}
      {showClearanceModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Student Section Conduct Clearance
              </h3>
              <button
                onClick={() => { setShowClearanceModal(false); setSelectedRequest(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Student: <strong>{selectedRequest.student?.user?.fullName}</strong> ({selectedRequest.student?.studentId})
            </p>

            <form onSubmit={handleClearanceAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clearance Decision *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClearanceAction('APPROVE')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      clearanceAction === 'APPROVE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Approve Conduct</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearanceAction('REJECT')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      clearanceAction === 'REJECT'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Hold / Reject</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Verification Remarks {clearanceAction === 'REJECT' && '* (Required)'}
                </label>
                <textarea
                  rows={3}
                  required={clearanceAction === 'REJECT'}
                  value={clearanceRemarks}
                  onChange={(e) => setClearanceRemarks(e.target.value)}
                  placeholder={clearanceAction === 'APPROVE' ? 'Student conduct and academic standing verified clear.' : 'Specify reason for conduct hold...'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowClearanceModal(false); setSelectedRequest(null); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:opacity-50 ${
                    clearanceAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionLoading ? 'Submitting...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
