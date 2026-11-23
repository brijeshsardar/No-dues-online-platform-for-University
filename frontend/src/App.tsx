import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { DemoCredentialsHelper } from './components/DemoCredentialsHelper.js';

// Portal Select & Dedicated Login Pages
import { PortalSelect } from './pages/PortalSelect.js';
import { StudentLogin } from './pages/StudentLogin.js';
import { StudentSectionLogin } from './pages/StudentSectionLogin.js';
import { FacultyLogin } from './pages/FacultyLogin.js';
import { AdminLogin } from './pages/AdminLogin.js';
import { DepartmentLogin } from './pages/DepartmentLogin.js';

// Dedicated Role Dashboards
import { StudentPortal } from './pages/StudentPortal.js';
import { StudentSectionPortal } from './pages/StudentSectionPortal.js';
import { FacultyPortal } from './pages/FacultyPortal.js';
import { ITDepartmentPortal } from './pages/ITDepartmentPortal.js';
import { AccountSectionPortal } from './pages/AccountSectionPortal.js';
import { LibraryPortal } from './pages/LibraryPortal.js';
import { CoordinatorPortal } from './pages/CoordinatorPortal.js';
import { ExamControllerPortal } from './pages/ExamControllerPortal.js';
import { AdminPortal } from './pages/AdminPortal.js';
import { PublicVerificationPage } from './pages/PublicVerificationPage.js';

// Dynamic Dashboard Dispatcher: Routes user strictly to their role's authorized dashboard
const DashboardDispatcher: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Verifying authenticated security session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'STUDENT':
      return <StudentPortal />;
    case 'IT_DEPARTMENT':
      return <ITDepartmentPortal />;
    case 'ACCOUNT_SECTION':
      return <AccountSectionPortal />;
    case 'LIBRARY':
      return <LibraryPortal />;
    case 'CLASS_COORDINATOR':
      return <CoordinatorPortal />;
    case 'EXAMINATION_CONTROLLER':
      return <ExamControllerPortal />;
    case 'ADMIN':
      return <AdminPortal />;
    case 'STUDENT_SECTION':
      return <StudentSectionPortal />;
    default:
      return <FacultyPortal />;
  }
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {user && <Sidebar />}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
      <DemoCredentialsHelper />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Verification Routes */}
          <Route
            path="/verify/:token"
            element={
              <Layout>
                <PublicVerificationPage />
              </Layout>
            }
          />
          <Route
            path="/verify"
            element={
              <Layout>
                <PublicVerificationPage />
              </Layout>
            }
          />

          {/* Unified Gateway & Login Directory */}
          <Route
            path="/login"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <PortalSelect />
              </div>
            }
          />

          {/* Dedicated Individual Login Pages */}
          <Route
            path="/login/student"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <StudentLogin />
              </div>
            }
          />
          <Route
            path="/login/student-section"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <StudentSectionLogin />
              </div>
            }
          />
          <Route
            path="/login/faculty"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <FacultyLogin />
              </div>
            }
          />
          <Route
            path="/login/admin"
            element={
              <div className="min-h-screen bg-slate-950 flex flex-col">
                <Navbar />
                <AdminLogin />
              </div>
            }
          />
          <Route
            path="/login/it"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <DepartmentLogin dept="it" />
              </div>
            }
          />
          <Route
            path="/login/account"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <DepartmentLogin dept="account" />
              </div>
            }
          />
          <Route
            path="/login/library"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <DepartmentLogin dept="library" />
              </div>
            }
          />
          <Route
            path="/login/coordinator"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <DepartmentLogin dept="coordinator" />
              </div>
            }
          />
          <Route
            path="/login/exam-controller"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <DepartmentLogin dept="exam-controller" />
              </div>
            }
          />

          {/* Unified Authenticated Dashboard (Role-based Dynamic Dispatcher) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardDispatcher />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Student Section Dedicated Route */}
          <Route
            path="/dashboard/student-section"
            element={
              <ProtectedRoute allowedRoles={['STUDENT_SECTION', 'ADMIN']}>
                <Layout>
                  <StudentSectionPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Student Protected Routes */}
          <Route
            path="/fee-status"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <Layout>
                  <StudentPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply-nodues"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <Layout>
                  <StudentPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-requests"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <Layout>
                  <StudentPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-eligibility"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <Layout>
                  <StudentPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-certificate"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <Layout>
                  <StudentPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Faculty & Coordinator Protected Routes */}
          <Route
            path="/faculty/students"
            element={
              <ProtectedRoute allowedRoles={['CLASS_COORDINATOR', 'ADMIN', 'STUDENT_SECTION']}>
                <Layout>
                  <FacultyPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/attendance"
            element={
              <ProtectedRoute allowedRoles={['CLASS_COORDINATOR', 'ADMIN']}>
                <Layout>
                  <FacultyPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/queue"
            element={
              <ProtectedRoute allowedRoles={['CLASS_COORDINATOR', 'ADMIN']}>
                <Layout>
                  <CoordinatorPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/cleared"
            element={
              <ProtectedRoute allowedRoles={['CLASS_COORDINATOR', 'ADMIN']}>
                <Layout>
                  <CoordinatorPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* IT Department Protected Routes */}
          <Route
            path="/it/queue"
            element={
              <ProtectedRoute allowedRoles={['IT_DEPARTMENT', 'ADMIN']}>
                <Layout>
                  <ITDepartmentPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Account Section Protected Routes */}
          <Route
            path="/account/fees"
            element={
              <ProtectedRoute allowedRoles={['ACCOUNT_SECTION', 'ADMIN']}>
                <Layout>
                  <AccountSectionPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Library Protected Routes */}
          <Route
            path="/library/queue"
            element={
              <ProtectedRoute allowedRoles={['LIBRARY', 'ADMIN']}>
                <Layout>
                  <LibraryPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Exam Controller Protected Routes */}
          <Route
            path="/exam/eligible"
            element={
              <ProtectedRoute allowedRoles={['EXAMINATION_CONTROLLER', 'ADMIN']}>
                <Layout>
                  <ExamControllerPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/audit"
            element={
              <ProtectedRoute allowedRoles={['EXAMINATION_CONTROLLER', 'ADMIN']}>
                <Layout>
                  <ExamControllerPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Administrator Protected Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout>
                  <AdminPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout>
                  <AdminPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/monitor"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout>
                  <AdminPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/certificates"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout>
                  <AdminPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout>
                  <AdminPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/security-events"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout>
                  <AdminPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Home / Gateway Routing */}
          <Route
            path="/"
            element={
              <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <PortalSelect />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
