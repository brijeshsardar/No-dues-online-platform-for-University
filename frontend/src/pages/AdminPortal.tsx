import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Department, Faculty, StudentProfile, User } from '../types/index.js';
import {
  ShieldAlert,
  History,
  Users,
  Award,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Building,
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Key,
  DollarSign,
  Receipt,
  Printer,
  Bell,
  Settings,
  BarChart3,
  BookOpen,
  Check,
  UserCheck,
  Briefcase,
  Layers,
  ChevronRight,
  Eye,
  Send,
  CreditCard,
  Laptop
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, token } = useAuth();

  // Navigation: 14 Working Sections
  const [activeSection, setActiveSection] = useState<
    | 'OVERVIEW'
    | 'STUDENTS'
    | 'FACULTY'
    | 'STUDENT_SECTION'
    | 'DEPARTMENTS'
    | 'USERS'
    | 'FEES'
    | 'PAYMENTS'
    | 'CLEARANCE'
    | 'REAPPLICATIONS'
    | 'NOTIFICATIONS'
    | 'REPORTS'
    | 'AUDIT_LOGS'
    | 'SETTINGS'
  >('OVERVIEW');

  // Shared Data States
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<any[]>([]);
  const [reapplications, setReapplications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [academicMeta, setAcademicMeta] = useState<{ courses: any[]; semesters: any[]; academicYears: any[]; departments: any[] }>({
    courses: [],
    semesters: [],
    academicYears: [],
    departments: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyDeptFilter, setFacultyDeptFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [clearanceSearch, setClearanceSearch] = useState('');
  const [clearanceStageFilter, setClearanceStageFilter] = useState('');

  // Modals States
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [viewingStudent, setViewingStudent] = useState<any | null>(null);

  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [viewingFaculty, setViewingFaculty] = useState<any | null>(null);

  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [viewingDept, setViewingDept] = useState<any | null>(null);

  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; name: string; type: 'student' | 'faculty' | 'user' } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: 'student' | 'faculty' | 'department' | 'user' } | null>(null);

  // Fee Adjustment Modal
  const [feeAdjustRecord, setFeeAdjustRecord] = useState<any | null>(null);
  const [adjustTotalFee, setAdjustTotalFee] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Broadcast Notification Modal
  const [broadcastRole, setBroadcastRole] = useState('ALL');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('INFO');

  // New Course / Academic Year Modals
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDept, setNewCourseDept] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');

  // Certificate Revocation Modal State
  const [certSearchToken, setCertSearchToken] = useState('');
  const [foundCert, setFoundCert] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    fatherName: '',
    motherName: '',
    dob: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    photoUrl: '',
    studentId: '',
    enrollmentNo: '',
    admissionNumber: '',
    courseId: '',
    departmentId: '',
    semesterId: '',
    academicYearId: '',
    admissionDate: new Date().toISOString().split('T')[0],
    enrollmentStatus: 'ACTIVE',
    section: 'A',
    batchYear: '2024-2028',
    initialTotalFee: 10000,
    initialPaidAmount: 0,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  // Faculty Form State
  const [facultyForm, setFacultyForm] = useState({
    fullName: '',
    fatherName: '',
    dob: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    photoUrl: '',
    employeeId: '',
    departmentId: '',
    designation: 'Assistant Professor',
    specialization: '',
    assignedCourses: '',
    assignedClasses: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'ACTIVE',
    role: 'CLASS_COORDINATOR',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  // Department Form State
  const [deptForm, setDeptForm] = useState({
    code: '',
    name: '',
    type: 'ACADEMIC',
    description: '',
    headUserId: '',
  });

  useEffect(() => {
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [
        resStats,
        resMeta,
        resStudents,
        resFaculty,
        resDepts,
        resUsers,
        resFees,
        resClearances,
        resReapp,
        resLogs,
        resSec,
      ] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/academic-meta', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/faculty', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/departments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/fees/records', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/clearance/all', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/clearance/reapplications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/security-events', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resStats.ok) setStats((await resStats.json()).stats);
      if (resMeta.ok) setAcademicMeta(await resMeta.json());
      if (resStudents.ok) setStudents((await resStudents.json()).students || []);
      if (resFaculty.ok) setFacultyList((await resFaculty.json()).faculty || []);
      if (resDepts.ok) setDepartments((await resDepts.json()).departments || []);
      if (resUsers.ok) setUsersList((await resUsers.json()).users || []);
      if (resFees.ok) setFeeRecords((await resFees.json()).feeRecords || []);
      if (resClearances.ok) setClearanceRequests((await resClearances.json()).requests || []);
      if (resReapp.ok) setReapplications((await resReapp.json()).reapplications || []);
      if (resLogs.ok) setAuditLogs((await resLogs.json()).logs || []);
      if (resSec.ok) setSecurityEvents((await resSec.json()).events || []);
    } catch (e: any) {
      console.error(e);
      setStatusMsg({ type: 'error', text: e.message || 'Error loading admin data' });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // HANDLERS: STUDENT
  // =========================================================================

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentForm.password !== studentForm.confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(studentForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Student ${data.student.studentId} (${data.student.user.fullName}) registered successfully!` });
        setShowAddStudentModal(false);
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to create student' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: editingStudent.user?.fullName,
          fatherName: editingStudent.fatherName,
          motherName: editingStudent.motherName,
          dob: editingStudent.dob,
          gender: editingStudent.gender,
          phone: editingStudent.user?.phone,
          address: editingStudent.address,
          photoUrl: editingStudent.photoUrl,
          enrollmentStatus: editingStudent.enrollmentStatus,
          courseId: editingStudent.courseId,
          departmentId: editingStudent.departmentId,
          semesterId: editingStudent.semesterId,
          section: editingStudent.section,
          batchYear: editingStudent.batchYear,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Student ${editingStudent.studentId} updated successfully!` });
        setEditingStudent(null);
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update student' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleStudentStatus = async (studentId: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Account status updated to ${data.isActive ? 'ACTIVE' : 'DEACTIVATED'}.` });
        fetchAllData();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // =========================================================================
  // HANDLERS: FACULTY
  // =========================================================================

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (facultyForm.password !== facultyForm.confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      const res = await fetch('/api/admin/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(facultyForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Faculty member ${data.faculty.employeeId} (${data.faculty.user.fullName}) created successfully!` });
        setShowAddFacultyModal(false);
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to add faculty' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaculty) return;
    try {
      const res = await fetch(`/api/admin/faculty/${editingFaculty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: editingFaculty.user?.fullName,
          phone: editingFaculty.user?.phone,
          departmentId: editingFaculty.departmentId,
          designation: editingFaculty.designation,
          specialization: editingFaculty.specialization,
          assignedCourses: editingFaculty.assignedCourses,
          assignedClasses: editingFaculty.assignedClasses,
          employmentStatus: editingFaculty.employmentStatus,
          address: editingFaculty.address,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Faculty member ${editingFaculty.employeeId} updated!` });
        setEditingFaculty(null);
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update faculty' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleFacultyStatus = async (facultyId: string) => {
    try {
      const res = await fetch(`/api/admin/faculty/${facultyId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Faculty account ${data.isActive ? 'ACTIVATED' : 'DEACTIVATED'}.` });
        fetchAllData();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // =========================================================================
  // HANDLERS: DEPARTMENTS
  // =========================================================================

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(deptForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Department ${data.department.name} (${data.department.code}) created successfully!` });
        setShowAddDeptModal(false);
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to create department' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      const res = await fetch(`/api/admin/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editingDept.name,
          type: editingDept.type,
          description: editingDept.description,
          headUserId: editingDept.headUserId || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Department ${data.department.name} updated!` });
        setEditingDept(null);
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update department' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // =========================================================================
  // HANDLERS: DELETE WITH CONFIRMATION
  // =========================================================================

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    try {
      let endpoint = '';
      if (deleteConfirm.type === 'student') endpoint = `/api/admin/students/${deleteConfirm.id}`;
      if (deleteConfirm.type === 'faculty') endpoint = `/api/admin/faculty/${deleteConfirm.id}`;
      if (deleteConfirm.type === 'department') endpoint = `/api/admin/departments/${deleteConfirm.id}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `${deleteConfirm.name} deleted successfully.` });
        setDeleteConfirm(null);
        fetchAllData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to delete record' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // =========================================================================
  // HANDLERS: SECURE PASSWORD RESET
  // =========================================================================

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPasswordInput) return;
    try {
      let endpoint = '';
      if (resetPasswordUser.type === 'student') endpoint = `/api/admin/students/${resetPasswordUser.id}/reset-password`;
      if (resetPasswordUser.type === 'faculty') endpoint = `/api/admin/faculty/${resetPasswordUser.id}/reset-password`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: data.message });
        setResetPasswordUser(null);
        setNewPasswordInput('');
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Password reset failed' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // =========================================================================
  // HANDLERS: NOTIFICATIONS BROADCAST
  // =========================================================================

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetRole: broadcastRole,
          title: broadcastTitle,
          message: broadcastMessage,
          type: broadcastType,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Broadcast dispatched successfully to ${data.count} users!` });
        setBroadcastTitle('');
        setBroadcastMessage('');
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to broadcast' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // =========================================================================
  // FILTER LOGIC
  // =========================================================================

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    const matchQ =
      s.studentId.toLowerCase().includes(q) ||
      s.enrollmentNo.toLowerCase().includes(q) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
      s.user.fullName.toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q);
    const matchCourse = !studentCourseFilter || s.courseId === studentCourseFilter;
    const matchStatus = !studentStatusFilter || s.enrollmentStatus === studentStatusFilter;
    return matchQ && matchCourse && matchStatus;
  });

  const filteredFaculty = facultyList.filter((f) => {
    const q = facultySearch.toLowerCase();
    const matchQ =
      f.employeeId.toLowerCase().includes(q) ||
      f.user.fullName.toLowerCase().includes(q) ||
      f.user.email.toLowerCase().includes(q) ||
      f.designation.toLowerCase().includes(q);
    const matchDept = !facultyDeptFilter || f.departmentId === facultyDeptFilter;
    return matchQ && matchDept;
  });

  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchQ = u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !userRoleFilter || u.role === userRoleFilter;
    return matchQ && matchRole;
  });

  const filteredFees = feeRecords.filter((f) => {
    const q = feeSearch.toLowerCase();
    const name = f.student?.user?.fullName?.toLowerCase() || '';
    const sid = f.student?.studentId?.toLowerCase() || '';
    return name.includes(q) || sid.includes(q);
  });

  const filteredClearances = clearanceRequests.filter((r) => {
    const q = clearanceSearch.toLowerCase();
    const matchQ =
      r.requestId.toLowerCase().includes(q) ||
      r.student?.user?.fullName?.toLowerCase().includes(q) ||
      r.student?.studentId?.toLowerCase().includes(q);
    const matchStage = !clearanceStageFilter || r.currentStage === clearanceStageFilter;
    return matchQ && matchStage;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Admin Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Chief System Administration & University Control Center</span>
          </div>
          <h1 className="text-2xl font-black text-white">Central Admin Management Portal</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Logged in: <strong className="text-white">{user?.fullName}</strong> ({user?.email}) | Role: <span className="text-emerald-400 font-bold uppercase">System Admin</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('NOTIFICATIONS')}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 shadow-sm"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Broadcast Alert</span>
          </button>
          <button
            onClick={fetchAllData}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Refresh System</span>
          </button>
        </div>
      </div>

      {/* Global Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="font-bold underline text-[11px]">Dismiss</button>
        </div>
      )}

      {/* 14 Navigation Sections Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'OVERVIEW', label: '1. Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'STUDENTS', label: '2. Students', icon: <GraduationCap className="w-4 h-4" /> },
            { id: 'FACULTY', label: '3. Faculty', icon: <Briefcase className="w-4 h-4" /> },
            { id: 'STUDENT_SECTION', label: '4. Student Section', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'DEPARTMENTS', label: '5. Departments', icon: <Building className="w-4 h-4" /> },
            { id: 'USERS', label: '6. Users & Roles', icon: <Users className="w-4 h-4" /> },
            { id: 'FEES', label: '7. Fees & Ledgers', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'PAYMENTS', label: '8. Payment History', icon: <Receipt className="w-4 h-4" /> },
            { id: 'CLEARANCE', label: '9. Clearance Pipeline', icon: <Layers className="w-4 h-4" /> },
            { id: 'REAPPLICATIONS', label: '10. Reapplications', icon: <RotateCcw className="w-4 h-4" /> },
            { id: 'NOTIFICATIONS', label: '11. Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'REPORTS', label: '12. Reports', icon: <FileText className="w-4 h-4" /> },
            { id: 'AUDIT_LOGS', label: '13. Activity Logs', icon: <History className="w-4 h-4" /> },
            { id: 'SETTINGS', label: '14. Settings', icon: <Settings className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeSection === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Enrolled Students</span>
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{stats?.totalStudents || students.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Undergraduate & postgraduate</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Faculty & Staff</span>
                <Briefcase className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{stats?.totalFaculty || facultyList.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Professors, coordinators & staff</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Clearance Applications</span>
                <Layers className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-3xl font-black text-purple-700">{stats?.totalRequests || clearanceRequests.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">{stats?.approvedRequests || 0} Certificates issued</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Active Departments</span>
                <Building className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{stats?.totalDepartments || departments.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Academic & clearance divisions</p>
            </div>
          </div>

          {/* Quick Management Launchpad */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Centralized Administrative Launchpad
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  setActiveSection('STUDENTS');
                  setShowAddStudentModal(true);
                }}
                className="p-4 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-left transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-900 text-xs">Add New Student</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Register profile & create student login</div>
              </button>

              <button
                onClick={() => {
                  setActiveSection('FACULTY');
                  setShowAddFacultyModal(true);
                }}
                className="p-4 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-left transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-900 text-xs">Add New Faculty</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Register faculty member & set courses</div>
              </button>

              <button
                onClick={() => {
                  setActiveSection('DEPARTMENTS');
                  setShowAddDeptModal(true);
                }}
                className="p-4 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl text-left transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <Building className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-900 text-xs">Add Department</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Create clearance or academic branch</div>
              </button>

              <button
                onClick={() => setActiveSection('NOTIFICATIONS')}
                className="p-4 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 rounded-xl text-left transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-900 text-xs">Broadcast Notice</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Send alerts to students or faculty</div>
              </button>
            </div>
          </div>

          {/* Department Queue Breakdown */}
          {stats?.departmentBreakdown && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Clearance Queue Load Across Departments
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                {[
                  { label: 'Account Section', count: stats.departmentBreakdown.account },
                  { label: 'Student Section', count: stats.departmentBreakdown.studentSection },
                  { label: 'Library', count: stats.departmentBreakdown.library },
                  { label: 'IT Department', count: stats.departmentBreakdown.it },
                  { label: 'Class Coordinator', count: stats.departmentBreakdown.coordinator },
                  { label: 'Exam Controller', count: stats.departmentBreakdown.examController },
                ].map((d) => (
                  <div key={d.label} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-2xl font-black text-slate-900">{d.count}</div>
                    <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: STUDENT MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'STUDENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Student Management</h2>
              <p className="text-xs text-slate-500">
                Register students, edit records, toggle accounts, reset passwords, and inspect dossiers.
              </p>
            </div>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Student</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by student name, registration ID, email..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={studentCourseFilter}
              onChange={(e) => setStudentCourseFilter(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="">All Courses</option>
              {academicMeta.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={studentStatusFilter}
              onChange={(e) => setStudentStatusFilter(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Registration & Roll No</th>
                  <th className="py-3 px-3">Course & Sem</th>
                  <th className="py-3 px-3">Fee Status</th>
                  <th className="py-3 px-3">Clearance Status</th>
                  <th className="py-3 px-3">Login Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No students found.</td></tr>
                ) : (
                  filteredStudents.map((s) => {
                    const fee = s.feeRecords?.[0];
                    const req = s.requests?.[0];

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{s.user?.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.user?.email}</div>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="font-bold text-blue-700">{s.studentId}</div>
                          <div className="text-[10px] text-slate-500">Roll: {s.enrollmentNo}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{s.course?.name}</div>
                          <div className="text-[10px] text-slate-500">{s.semester?.name} | Sec {s.section}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fee?.outstandingBalance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {fee?.outstandingBalance === 0 ? 'CLEARED' : `₹${fee?.outstandingBalance || 0} DUE`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {req ? req.overallStatus.replace(/_/g, ' ') : 'NOT APPLIED'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleStudentStatus(s.id)}
                            className={`px-2 py-0.5 text-[10px] font-black rounded-full transition-all ${
                              s.user?.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                            title="Click to toggle account activation"
                          >
                            {s.user?.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingStudent(s)}
                              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200"
                              title="View Full Student Dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingStudent(s)}
                              className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg border border-indigo-200"
                              title="Edit Student Information"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setResetPasswordUser({ id: s.id, name: s.user?.fullName, type: 'student' });
                                setNewPasswordInput('');
                              }}
                              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ id: s.id, name: `${s.studentId} - ${s.user?.fullName}`, type: 'student' })}
                              className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: FACULTY MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'FACULTY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Faculty Management</h2>
              <p className="text-xs text-slate-500">
                Register professors, assign departments & courses, manage credentials, and toggle status.
              </p>
            </div>

            <button
              onClick={() => setShowAddFacultyModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Faculty</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                placeholder="Search by faculty name, employee ID, designation..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={facultyDeptFilter}
              onChange={(e) => setFacultyDeptFilter(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Faculty Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Faculty Name</th>
                  <th className="py-3 px-3">Employee ID</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Designation & Subject</th>
                  <th className="py-3 px-3">Assigned Classes</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFaculty.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No faculty members found.</td></tr>
                ) : (
                  filteredFaculty.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{f.user?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{f.user?.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        {f.employeeId}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {f.department?.name || 'Central Academic'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{f.designation}</div>
                        <div className="text-[10px] text-slate-500">{f.specialization || 'General'}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {f.assignedClasses || 'All Classes'}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleFacultyStatus(f.id)}
                          className={`px-2 py-0.5 text-[10px] font-black rounded-full transition-all ${
                            f.user?.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {f.user?.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingFaculty(f)}
                            className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg border border-indigo-200"
                            title="Edit Faculty Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordUser({ id: f.id, name: f.user?.fullName, type: 'faculty' });
                              setNewPasswordInput('');
                            }}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: f.id, name: `${f.employeeId} - ${f.user?.fullName}`, type: 'faculty' })}
                            className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200"
                            title="Delete Faculty"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
      {/* SECTION 4: STUDENT SECTION MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'STUDENT_SECTION' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Student Section (Student Affairs Management)</h2>
              <p className="text-xs text-slate-500">
                Oversight of Student Section conduct reviews, bonafide verifications, and administrative dossiers.
              </p>
            </div>
            <span className="text-xs font-mono bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-200 font-bold">
              Officer: Anita Roy (Registrar)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-slate-500 text-[10px] font-bold uppercase">Administrative Verification Queue</div>
              <div className="text-2xl font-black text-slate-900">
                {clearanceRequests.filter((r) => r.currentStage === 'STUDENT_SECTION').length} Students
              </div>
              <p className="text-[11px] text-slate-400">Sequential clearance stage 2</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-slate-500 text-[10px] font-bold uppercase">Total Conduct Clearances</div>
              <div className="text-2xl font-black text-emerald-700">
                {clearanceRequests.filter((r) => r.approvals?.some((a: any) => a.departmentCode === 'STUDENT_SECTION' && a.status === 'APPROVED')).length} Approved
              </div>
              <p className="text-[11px] text-slate-400">Bonafide & disciplinary cleared</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-slate-500 text-[10px] font-bold uppercase">Disciplinary Holds / Rejections</div>
              <div className="text-2xl font-black text-rose-700">
                {clearanceRequests.filter((r) => r.approvals?.some((a: any) => a.departmentCode === 'STUDENT_SECTION' && a.status === 'REJECTED')).length} Holds
              </div>
              <p className="text-[11px] text-slate-400">Requires student reapplication</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: DEPARTMENT MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'DEPARTMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Department Management</h2>
              <p className="text-xs text-slate-500">
                Manage university divisions, assign department heads, and inspect department-wise students & faculty.
              </p>
            </div>

            <button
              onClick={() => setShowAddDeptModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div key={d.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {d.code}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {d.type}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{d.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{d.description || 'No description provided.'}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Department Head</span>
                    <strong className="text-slate-800 text-[11px]">{d.headUser?.fullName || 'Not Assigned'}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Roster Counts</span>
                    <strong className="text-slate-800 text-[11px]">
                      {d._count?.students || 0} Students | {d._count?.faculty || 0} Faculty
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setEditingDept(d)}
                    className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg border border-indigo-200"
                    title="Edit Department"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ id: d.id, name: `${d.name} (${d.code})`, type: 'department' })}
                    className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200"
                    title="Delete Department"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: USER AND ROLE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'USERS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">User and Role Management</h2>
              <p className="text-xs text-slate-500">
                System-wide account directory across all 8 user roles. Manage privileges and access control.
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name or email..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-white font-bold"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">STUDENT</option>
              <option value="ACCOUNT_SECTION">ACCOUNT_SECTION</option>
              <option value="STUDENT_SECTION">STUDENT_SECTION</option>
              <option value="LIBRARY">LIBRARY</option>
              <option value="IT_DEPARTMENT">IT_DEPARTMENT</option>
              <option value="CLASS_COORDINATOR">CLASS_COORDINATOR / FACULTY</option>
              <option value="EXAMINATION_CONTROLLER">EXAMINATION_CONTROLLER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Full Name</th>
                  <th className="py-3 px-3">Email Address</th>
                  <th className="py-3 px-3">System Role</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Created Date</th>
                  <th className="py-3 px-3 text-right">Role Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{u.fullName}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{u.department?.name || u.departmentCode || 'Institutional'}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <select
                        value={u.role}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          await fetch(`/api/admin/users/${u.id}/role`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ role: newRole }),
                          });
                          fetchAllData();
                        }}
                        className="text-[10px] font-bold p-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="ACCOUNT_SECTION">ACCOUNT_SECTION</option>
                        <option value="STUDENT_SECTION">STUDENT_SECTION</option>
                        <option value="LIBRARY">LIBRARY</option>
                        <option value="IT_DEPARTMENT">IT_DEPARTMENT</option>
                        <option value="CLASS_COORDINATOR">CLASS_COORDINATOR</option>
                        <option value="EXAMINATION_CONTROLLER">EXAMINATION_CONTROLLER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: ACCOUNT AND FEE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'FEES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Account and Fee Configuration</h2>
              <p className="text-xs text-slate-500">
                Administrative fee ledger view. Edit student fee assessments with audit tracking.
              </p>
            </div>
          </div>

          <div className="max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={feeSearch}
              onChange={(e) => setFeeSearch(e.target.value)}
              placeholder="Search by student name or registration ID..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Student Name & ID</th>
                  <th className="py-3 px-3">Total Assessed Fee</th>
                  <th className="py-3 px-3">Amount Paid</th>
                  <th className="py-3 px-3">Remaining Balance</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Admin Fee Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFees.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{f.student?.user?.fullName}</div>
                      <div className="font-mono text-slate-500 text-[10px]">{f.student?.studentId}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">₹{f.totalFee.toLocaleString()}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-700">₹{f.paidAmount.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span className={`font-black text-xs px-2 py-0.5 rounded-full ${
                        f.outstandingBalance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        ₹{f.outstandingBalance.toLocaleString()} DUE
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {f.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setFeeAdjustRecord(f);
                          setAdjustTotalFee(String(f.totalFee));
                          setAdjustReason('');
                        }}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200"
                      >
                        Adjust Total Fee
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: PAYMENT HISTORY */}
      {/* ========================================================================= */}
      {activeSection === 'PAYMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">University Payment Ledger & History</h2>
              <p className="text-xs text-slate-500">
                Official transaction log and digital receipts issued to students across all payment modes.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {feeRecords.flatMap((f) => f.transactions || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                No payment transactions recorded yet.
              </div>
            ) : (
              feeRecords.flatMap((f) => f.transactions || []).map((tx: any) => (
                <div key={tx.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-800 text-xs">{tx.receiptNumber}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{tx.paymentMode}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Date: {new Date(tx.paymentDate).toLocaleDateString()} | Ref: {tx.transactionRef || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm">₹{tx.amount.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">Balance after: ₹{tx.remainingBalance.toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: CLEARANCE PIPELINE */}
      {/* ========================================================================= */}
      {activeSection === 'CLEARANCE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Department Clearance Pipeline Monitoring</h2>
              <p className="text-xs text-slate-500">
                Live oversight of student applications through Account, Student Section, Library, IT, Coordinator, and Exam Controller.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Student Name & ID</th>
                  <th className="py-3 px-3">Current Stage</th>
                  <th className="py-3 px-3">Overall Status</th>
                  <th className="py-3 px-3">Department Approvals Status</th>
                  <th className="py-3 px-3">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClearances.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{r.requestId}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{r.student?.user?.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.student?.studentId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        {r.currentStage}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.overallStatus === 'CERTIFICATE_ISSUED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.overallStatus === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.overallStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {['ACCOUNT', 'STUDENT_SECTION', 'LIBRARY', 'IT', 'CLASS_COORDINATOR', 'EXAM_CONTROLLER'].map((dept) => {
                          const app = r.approvals?.find((a: any) => a.departmentCode === dept);
                          return (
                            <span
                              key={dept}
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                app?.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app?.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : app?.status === 'REAPPLICATION_SUBMITTED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {dept.slice(0, 4)}: {app?.status || 'PEND'}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 10: REAPPLICATION MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'REAPPLICATIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Department-Specific Reapplication Log</h2>
              <p className="text-xs text-slate-500">
                Audited logs of all student resubmissions after departmental rejections.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {reapplications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                No reapplications submitted.
              </div>
            ) : (
              reapplications.map((rap) => (
                <div key={rap.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-800">
                      Department: {rap.departmentCode}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Submitted: {new Date(rap.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <strong>Rejection Reason:</strong> {rap.rejectionReason}
                  </div>
                  <div className="p-2 bg-blue-50/70 rounded border border-blue-200 text-blue-900">
                    <strong>Student Explanation:</strong> "{rap.studentResponse}"
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    Status: <span className="text-emerald-700">{rap.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 11: NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activeSection === 'NOTIFICATIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">University Broadcast Alerts & Notices</h2>
            <p className="text-xs text-slate-500">
              Broadcast high-priority notifications to students, faculty, or clearance department officers.
            </p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={broadcastRole}
                  onChange={(e) => setBroadcastRole(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="ALL">All University Users</option>
                  <option value="STUDENT">All Students</option>
                  <option value="CLASS_COORDINATOR">All Faculty Members</option>
                  <option value="ACCOUNT_SECTION">Account Section Officers</option>
                  <option value="LIBRARY">Library Officers</option>
                  <option value="IT_DEPARTMENT">IT Department Officers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="INFO">Informational (Blue)</option>
                  <option value="SUCCESS">Success / Clearance (Green)</option>
                  <option value="WARNING">Important Notice (Yellow)</option>
                  <option value="ALERT">Urgent Deadline / Alert (Red)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Spring 2026 Examination Clearance Deadline"
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Message</label>
              <textarea
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your official administrative announcement here..."
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Announcement Now</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 12: REPORTS AND ANALYTICS */}
      {/* ========================================================================= */}
      {activeSection === 'REPORTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Institutional Reports & Analytics</h2>
              <p className="text-xs text-slate-500">
                Export clearance data, fee audit reports, and audit dossiers in machine-readable formats.
              </p>
            </div>

            <button
              onClick={async () => {
                const res = await fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } });
                const d = await res.json();
                const blob = new Blob([JSON.stringify(d.requests, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CT_University_Full_Clearance_Report_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Official Report (JSON)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Clearance Completion Rate</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {clearanceRequests.length > 0
                  ? `${Math.round((clearanceRequests.filter((r) => r.overallStatus === 'CERTIFICATE_ISSUED').length / clearanceRequests.length) * 100)}%`
                  : '0%'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Certificates issued</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Fee Collection Health</div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {stats?.financial?.totalAssessed > 0
                  ? `${Math.round((stats.financial.totalCollected / stats.financial.totalAssessed) * 100)}%`
                  : '100%'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Collected vs Assessed</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Department Latency</div>
              <div className="text-2xl font-black text-slate-900 mt-1">&lt; 24 Hours</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Average departmental turnaround</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 13: SYSTEM ACTIVITY LOGS */}
      {/* ========================================================================= */}
      {activeSection === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">Immutable System Activity & Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Chronological log of administrative actions, fee modifications, and security events.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor / Role</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Audit Details</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-blue-700">{log.action}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900">{log.user?.fullName || 'System'}</span>{' '}
                      <span className="text-[10px] text-slate-400">({log.userRole || 'ANON'})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{log.entityType}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-sans max-w-sm">{log.details}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 14: SYSTEM SETTINGS */}
      {/* ========================================================================= */}
      {activeSection === 'SETTINGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">University System Configuration & Settings</h2>
            <p className="text-xs text-slate-500">
              Configure academic sessions, semesters, curriculum branches, and security parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Years Configuration */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Academic Sessions ({academicMeta.academicYears.length})
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {academicMeta.academicYears.map((ay) => (
                  <div key={ay.id} className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex justify-between">
                    <span className="font-bold">{ay.yearString}</span>
                    {ay.isCurrent && <span className="text-emerald-700 font-bold">Current Active Session</span>}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="flex-1 text-xs p-2 border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newAcademicYear) return;
                    await fetch('/api/admin/settings/academic-year', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ yearString: newAcademicYear, isCurrent: false }),
                    });
                    setNewAcademicYear('');
                    fetchAllData();
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg"
                >
                  Add Session
                </button>
              </div>
            </div>

            {/* Courses / Branches Configuration */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Academic Programs & Branches ({academicMeta.courses.length})
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {academicMeta.courses.map((c) => (
                  <div key={c.id} className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex justify-between">
                    <div>
                      <span className="font-mono font-bold text-blue-700">{c.code}</span> - {c.name}
                    </div>
                    <span className="text-slate-400">{c.durationYears} Yrs</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="Code (e.g. BTECH_ECE)"
                    className="text-xs p-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Course Name"
                    className="text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCourseCode || !newCourseName) return;
                    await fetch('/api/admin/settings/course', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ code: newCourseCode, name: newCourseName }),
                    });
                    setNewCourseCode('');
                    setNewCourseName('');
                    fetchAllData();
                  }}
                  className="w-full py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg"
                >
                  Add Academic Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD STUDENT REGISTRATION FORM */}
      {/* ========================================================================= */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>Student Admission & Account Registration Form</span>
              </h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              {/* Group 1: Personal Information */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
                  1. Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.fullName}
                      onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      placeholder="+91-9812345678"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Father's Name</label>
                    <input
                      type="text"
                      value={studentForm.fatherName}
                      onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mother's Name</label>
                    <input
                      type="text"
                      value={studentForm.motherName}
                      onChange={(e) => setStudentForm({ ...studentForm, motherName: e.target.value })}
                      placeholder="e.g. Sunita Sharma"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={studentForm.dob}
                      onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={studentForm.gender}
                      onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Complete Residential Address</label>
                  <input
                    type="text"
                    value={studentForm.address}
                    onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                    placeholder="e.g. House No. 142, Model Town, Ludhiana, Punjab"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Group 2: Academic Information */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
                  2. Academic Information
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Registration ID *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.studentId}
                      onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                      placeholder="e.g. CT-2026-1045"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Roll / Enrollment No</label>
                    <input
                      type="text"
                      value={studentForm.enrollmentNo}
                      onChange={(e) => setStudentForm({ ...studentForm, enrollmentNo: e.target.value })}
                      placeholder="e.g. EN202609815"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admission Number</label>
                    <input
                      type="text"
                      value={studentForm.admissionNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, admissionNumber: e.target.value })}
                      placeholder="e.g. ADM-2026-1045"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Course Name</label>
                    <select
                      value={studentForm.courseId}
                      onChange={(e) => setStudentForm({ ...studentForm, courseId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select Course</option>
                      {academicMeta.courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <select
                      value={studentForm.departmentId}
                      onChange={(e) => setStudentForm({ ...studentForm, departmentId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Semester</label>
                    <select
                      value={studentForm.semesterId}
                      onChange={(e) => setStudentForm({ ...studentForm, semesterId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select Semester</option>
                      {academicMeta.semesters.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 3: Login Information */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
                  3. Individual Student Login Account
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Email / User ID *</label>
                    <input
                      type="email"
                      required
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      placeholder="e.g. rahul.sharma@ctuniversity.edu"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={studentForm.confirmPassword}
                      onChange={(e) => setStudentForm({ ...studentForm, confirmPassword: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md"
                >
                  Save & Create Student Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD FACULTY REGISTRATION FORM */}
      {/* ========================================================================= */}
      {showAddFacultyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <span>Faculty Registration & Account Form</span>
              </h3>
              <button onClick={() => setShowAddFacultyModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateFaculty} className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
                  1. Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Faculty Full Name *</label>
                    <input
                      type="text"
                      required
                      value={facultyForm.fullName}
                      onChange={(e) => setFacultyForm({ ...facultyForm, fullName: e.target.value })}
                      placeholder="e.g. Dr. Amit Sharma"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={facultyForm.phone}
                      onChange={(e) => setFacultyForm({ ...facultyForm, phone: e.target.value })}
                      placeholder="+91-9876543200"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Father's Name</label>
                    <input
                      type="text"
                      value={facultyForm.fatherName}
                      onChange={(e) => setFacultyForm({ ...facultyForm, fatherName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={facultyForm.gender}
                      onChange={(e) => setFacultyForm({ ...facultyForm, gender: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={facultyForm.address}
                    onChange={(e) => setFacultyForm({ ...facultyForm, address: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
                  2. Professional Information
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Employee ID *</label>
                    <input
                      type="text"
                      required
                      value={facultyForm.employeeId}
                      onChange={(e) => setFacultyForm({ ...facultyForm, employeeId: e.target.value })}
                      placeholder="e.g. FAC-2026-003"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <select
                      value={facultyForm.departmentId}
                      onChange={(e) => setFacultyForm({ ...facultyForm, departmentId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={facultyForm.designation}
                      onChange={(e) => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                      placeholder="e.g. Associate Professor"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subject Specialization</label>
                    <input
                      type="text"
                      value={facultyForm.specialization}
                      onChange={(e) => setFacultyForm({ ...facultyForm, specialization: e.target.value })}
                      placeholder="e.g. Operating Systems / AI"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Classes</label>
                    <input
                      type="text"
                      value={facultyForm.assignedClasses}
                      onChange={(e) => setFacultyForm({ ...facultyForm, assignedClasses: e.target.value })}
                      placeholder="e.g. SEM-5 Section A, B"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
                  3. Login Information
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={facultyForm.email}
                      onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                      placeholder="e.g. amit.sharma@ctuniversity.edu"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={facultyForm.password}
                      onChange={(e) => setFacultyForm({ ...facultyForm, password: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={facultyForm.confirmPassword}
                      onChange={(e) => setFacultyForm({ ...facultyForm, confirmPassword: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddFacultyModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md"
                >
                  Save & Create Faculty Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD DEPARTMENT */}
      {/* ========================================================================= */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">Add New Department</h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  placeholder="e.g. MECH or HOSTEL"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Department of Mechanical Engineering"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Type</label>
                <select
                  value={deptForm.type}
                  onChange={(e) => setDeptForm({ ...deptForm, type: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ACADEMIC">ACADEMIC (Teaching & Curriculum)</option>
                  <option value="CLEARANCE">CLEARANCE (No-Dues Verification Branch)</option>
                  <option value="ADMINISTRATIVE">ADMINISTRATIVE (Registry / Controller)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Mandate & operational scope"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD */}
      {/* ========================================================================= */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              <span>Reset User Password</span>
            </h3>
            <p className="text-xs text-slate-500">
              Set new secure password for <strong>{resetPasswordUser.name}</strong>.
            </p>

            <form onSubmit={handleExecutePasswordReset} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE */}
      {/* ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm Permanent Deletion</span>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW STUDENT FULL DOSSIER */}
      {/* ========================================================================= */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{viewingStudent.user?.fullName}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {viewingStudent.studentId} | Roll: {viewingStudent.enrollmentNo}
                </p>
              </div>
              <button onClick={() => setViewingStudent(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div><strong>Email:</strong> {viewingStudent.user?.email}</div>
              <div><strong>Phone:</strong> {viewingStudent.user?.phone || 'N/A'}</div>
              <div><strong>Course:</strong> {viewingStudent.course?.name}</div>
              <div><strong>Semester:</strong> {viewingStudent.semester?.name}</div>
              <div><strong>Father:</strong> {viewingStudent.fatherName || 'N/A'}</div>
              <div><strong>Mother:</strong> {viewingStudent.motherName || 'N/A'}</div>
              <div><strong>Address:</strong> {viewingStudent.address || 'N/A'}</div>
              <div><strong>Admission Date:</strong> {viewingStudent.admissionDate || 'N/A'}</div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
