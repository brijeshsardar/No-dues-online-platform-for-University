import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  DollarSign,
  GraduationCap,
  Award,
  AlertTriangle,
  FileCheck2,
  Bell,
  BookOpen,
  Calendar,
  Send,
  UserCheck
} from 'lucide-react';

interface StudentRosterItem {
  id: string;
  studentId: string;
  enrollmentNo: string;
  fullName: string;
  email: string;
  phone: string;
  courseName: string;
  courseCode: string;
  semesterName: string;
  section: string;
  batchYear: string;
  attendancePercentage: number;
  attendanceEligible: boolean;
  feeStatus: string;
  feeOutstanding: number;
  clearanceStatus: string;
  currentClearanceStage: string;
  hasCertificate: boolean;
  certificateId: string | null;
}

export const FacultyPortal: React.FC = () => {
  const { user, token, notifications } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [academicCohort, setAcademicCohort] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRosterItem | null>(null);
  const [attendanceRemark, setAttendanceRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchFacultyData();
  }, [user]);

  const fetchFacultyData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [resProf, resStudents, resCohort] = await Promise.all([
        fetch('/api/faculty/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/faculty/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/faculty/academic-records', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resProf.ok) {
        const d = await resProf.json();
        setProfile(d.profile);
      }
      if (resStudents.ok) {
        const d = await resStudents.json();
        setStudents(d.students || []);
      }
      if (resCohort.ok) {
        const d = await resCohort.json();
        setAcademicCohort(d.cohort);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/faculty/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          attendancePercentage: selectedStudent.attendancePercentage,
          remarks: attendanceRemark,
        }),
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setMsg({ type: 'success', text: d.message || 'Academic attendance remarks recorded.' });
        setSelectedStudent(null);
        setAttendanceRemark('');
        fetchFacultyData();
      } else {
        setMsg({ type: 'error', text: d.error || 'Failed to update attendance.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Faculty Profile Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Faculty & Academic Coordinator Portal</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {profile?.fullName || user?.fullName}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Designation: <strong className="text-white">{profile?.designation || 'Class Coordinator'}</strong> | Dept: <strong className="text-white">{profile?.departmentCode || 'Computer Science & Engineering'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Employee ID</div>
            <div className="font-bold text-white text-sm">{profile?.employeeId || 'FAC-CRD-105'}</div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <div className="text-slate-400 text-[10px] uppercase">Assigned Cohort</div>
            <div className="font-bold text-indigo-300 text-sm">B.Tech CSE Sem-5</div>
          </div>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Enrolled Cohort</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{students.length} Students</div>
          <p className="text-xs text-slate-500 mt-1">B.Tech Computer Science & Engg</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Compliant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {students.filter((s) => s.attendanceEligible).length} / {students.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Meets &ge; 75% Examination Criterion</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Clearance Submissions</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {students.filter((s) => s.clearanceStatus !== 'NOT_APPLIED').length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active clearance pipelines</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Certificates Issued</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {students.filter((s) => s.hasCertificate).length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Signed & QR verified</p>
        </div>
      </div>

      {/* Academic Records / Subjects Overview */}
      {academicCohort && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Academic Subjects & Schedule ({academicCohort.semester})
              </h3>
            </div>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
              Academic Year: {academicCohort.academicYear}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {academicCohort.subjects?.map((subj: any) => (
              <div key={subj.code} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-700">{subj.code}</span>
                  <span className="text-[10px] font-semibold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    {subj.credits} Credits
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">{subj.title}</div>
                <div className="text-[11px] text-slate-500">Instructor: {subj.faculty}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-base text-slate-900">Enrolled Students Academic & Clearance Roster</h3>
            <p className="text-xs text-slate-500">
              Inspect student attendance compliance, fee balances, and digital clearance pipeline status
            </p>
          </div>

          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Student Name & ID</th>
                <th className="py-3 px-3">Program & Sem</th>
                <th className="py-3 px-3">Attendance %</th>
                <th className="py-3 px-3">Fee Status</th>
                <th className="py-3 px-3">Clearance Stage</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{st.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {st.studentId} | {st.enrollmentNo}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800">{st.courseName}</div>
                    <div className="text-[11px] text-slate-500">
                      {st.semesterName} (Sec {st.section})
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-black text-xs ${
                          st.attendanceEligible ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {st.attendancePercentage}%
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          st.attendanceEligible
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {st.attendanceEligible ? 'ELIGIBLE' : 'SHORTAGE'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        st.feeStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {st.feeStatus === 'PAID' ? 'FEES CLEARED' : `$${st.feeOutstanding} DUE`}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-xs font-semibold text-slate-700">
                      {st.clearanceStatus.replace(/_/g, ' ')}
                    </div>
                    {st.certificateId && (
                      <span className="text-[10px] text-purple-700 font-mono font-bold">
                        Cert: {st.certificateId}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedStudent(st)}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                    >
                      Update Attendance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Remarks Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Academic Attendance Sign-off: {selectedStudent.fullName}
              </h3>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div>Student ID: <strong className="font-mono text-slate-900">{selectedStudent.studentId}</strong></div>
              <div>Current Attendance: <strong className={selectedStudent.attendanceEligible ? 'text-emerald-700' : 'text-rose-700'}>{selectedStudent.attendancePercentage}%</strong></div>
              <div>Eligibility: <strong>{selectedStudent.attendanceEligible ? 'Authorized (>75%)' : 'Attendance Shortage Warning'}</strong></div>
            </div>

            <form onSubmit={handleUpdateAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Faculty Endorsement Remarks
                </label>
                <textarea
                  rows={3}
                  value={attendanceRemark}
                  onChange={(e) => setAttendanceRemark(e.target.value)}
                  placeholder="e.g. Attendance criteria verified. Student has completed all required laboratory assignments."
                  required
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Confirm Endorsement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
