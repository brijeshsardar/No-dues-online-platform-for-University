export interface Department {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string | null;
  headUserId?: string | null;
  headUser?: { id: string; fullName: string; email: string; role: string; phone?: string } | null;
  permissions?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    faculty?: number;
    students?: number;
    users?: number;
  };
}

export interface Faculty {
  id: string;
  userId: string;
  user: User;
  employeeId: string;
  fatherName?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  designation: string;
  specialization?: string | null;
  assignedCourses?: string | null;
  assignedClasses?: string | null;
  joiningDate?: string | null;
  employmentStatus: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'ACCOUNT_SECTION' | 'STUDENT_SECTION' | 'LIBRARY' | 'IT_DEPARTMENT' | 'CLASS_COORDINATOR' | 'EXAMINATION_CONTROLLER' | 'ADMIN' | 'FACULTY';
  departmentCode?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  isMfaEnabled: boolean;
  isMfaVerified?: boolean;
  studentProfile?: StudentProfile | null;
  facultyProfile?: Faculty | null;
}

export interface StudentProfile {
  id: string;
  userId?: string;
  user?: User;
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
  enrollmentStatus?: string;
  section?: string;
  batchYear?: string;
  departmentId?: string | null;
  department?: Department | null;
  course?: { id: string; code: string; name: string; departmentName: string };
  semester?: { id: string; number: number; code: string; name: string };
  academicYear?: { id: string; yearString: string };
  feeRecords?: FeeRecord[];
  requests?: ClearanceRequest[];
}

export interface PaymentTransaction {
  id: string;
  receiptNumber: string;
  amount: number;
  previousTotalPaid: number;
  newTotalPaid: number;
  remainingBalance: number;
  paymentDate: string;
  paymentMode: string;
  transactionRef?: string | null;
  remarks?: string | null;
  recordedByUser?: { fullName: string; role: string };
  createdAt: string;
}

export interface FeeModificationLog {
  id: string;
  previousTotalFee: number;
  newTotalFee: number;
  reason: string;
  modifiedByUser?: { fullName: string; role: string };
  createdAt: string;
}

export interface ReapplicationRecord {
  id: string;
  departmentCode: string;
  rejectionReason: string;
  studentResponse: string;
  status: string;
  reviewedAt?: string | null;
  reviewerRemarks?: string | null;
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  totalFee: number;
  paidAmount: number;
  outstandingBalance: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'WAIVED' | 'NOT_RECORDED';
  paymentReference?: string;
  remarks?: string;
  verifiedAt?: string;
  verifiedByUser?: { fullName: string };
  student?: {
    id: string;
    studentId: string;
    enrollmentNo: string;
    user: { fullName: string; email: string };
  };
  transactions?: PaymentTransaction[];
  modificationLogs?: FeeModificationLog[];
}

export interface Approval {
  id: string;
  departmentCode: 'ACCOUNT' | 'STUDENT_SECTION' | 'LIBRARY' | 'IT' | 'CLASS_COORDINATOR' | 'EXAM_CONTROLLER';
  status: 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED' | 'REAPPLICATION_SUBMITTED';
  remarks?: string;
  rejectionReason?: string;
  reapplicationRemarks?: string;
  reapplicationSubmittedAt?: string;
  reviewedByUser?: { fullName: string; role: string };
  digitalSignatureHash?: string;
  actionTimestamp?: string;
  reapplicationRecords?: ReapplicationRecord[];
}

export interface ClearanceRequest {
  id: string;
  requestId: string;
  studentId: string;
  overallStatus: string;
  currentStage: string;
  submissionRemarks?: string;
  returnReason?: string;
  rejectionReason?: string;
  returnedByDepartment?: string;
  submittedAt: string;
  completedAt?: string;
  student?: {
    studentId: string;
    enrollmentNo: string;
    user: { fullName: string; email: string; phone?: string };
    course: { name: string; code: string };
    semester: { name: string };
    academicYear?: { yearString: string };
    feeRecords?: FeeRecord[];
  };
  semester?: { name: string; code: string };
  academicYear?: { yearString: string };
  approvals?: Approval[];
  examEligibility?: {
    id: string;
    examinationSession: string;
    hallTicketAllowed: boolean;
    authorizedAt: string;
    remarks?: string;
  };
  certificate?: {
    id: string;
    certificateId: string;
    verificationToken: string;
    qrCodeDataUrl?: string;
    digitalSignature: string;
    issuedAt: string;
    status: 'VALID' | 'REVOKED';
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}
