import React from 'react';
import { CheckCircle2, Clock, XCircle, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Approval } from '../types/index.js';

interface WorkflowTrackerProps {
  currentStage: string;
  overallStatus: string;
  approvals?: Approval[];
  compact?: boolean;
}

export const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({
  currentStage,
  overallStatus,
  approvals = [],
  compact = false,
}) => {
  const steps = [
    {
      code: 'ACCOUNT',
      number: 1,
      title: 'Account Section',
      subtitle: 'Fee & Payment Clearance',
      description: 'Zero fee balance & payment voucher verification',
    },
    {
      code: 'STUDENT_SECTION',
      number: 2,
      title: 'Student Section',
      subtitle: 'Administrative Records',
      description: 'Discipline records, conduct & documentation check',
    },
    {
      code: 'LIBRARY',
      number: 3,
      title: 'Library',
      subtitle: 'Books & Fine Dues',
      description: 'Verification of returned books and overdue fines',
    },
    {
      code: 'IT',
      number: 4,
      title: 'IT Department',
      subtitle: 'Equipment & IT Dues',
      description: 'Lab access clearance & computing asset return',
    },
    {
      code: 'CLASS_COORDINATOR',
      number: 5,
      title: 'Class Coordinator',
      subtitle: 'Academic Verification',
      description: 'Faculty review of completed departmental approvals',
    },
    {
      code: 'EXAM_CONTROLLER',
      number: 6,
      title: 'Exam Controller',
      subtitle: 'Final Authorization',
      description: 'Re-verifies fee status & grants exam eligibility',
    },
  ];

  const getStepStatus = (code: string) => {
    const app = approvals.find((a) => a.departmentCode === code);
    if (app) {
      if (app.status === 'APPROVED') return 'APPROVED';
      if (app.status === 'RETURNED') return 'RETURNED';
      if (app.status === 'REJECTED') return 'REJECTED';
    }

    if (overallStatus === 'REJECTED') return 'PENDING';
    if (currentStage === code) return 'ACTIVE';

    const stageOrder = ['ACCOUNT', 'STUDENT_SECTION', 'LIBRARY', 'IT', 'CLASS_COORDINATOR', 'EXAM_CONTROLLER', 'COMPLETED'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const thisIndex = stageOrder.indexOf(code);

    if (currentIndex > thisIndex || overallStatus === 'CERTIFICATE_ISSUED' || overallStatus === 'EXAM_ELIGIBLE') {
      return 'APPROVED';
    }

    return 'PENDING';
  };

  return (
    <div className={`w-full bg-white rounded-xl border border-slate-200 ${compact ? 'p-3' : 'p-6'} shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Sequential Clearance & Examination Authorization Pipeline
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Backend-enforced multi-tier departmental authorization workflow
          </p>
        </div>

        {/* Overall Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm ${
              overallStatus === 'CERTIFICATE_ISSUED' || overallStatus === 'EXAM_ELIGIBLE'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : overallStatus === 'RETURNED'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : overallStatus === 'REJECTED'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}
          >
            {overallStatus === 'CERTIFICATE_ISSUED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            {overallStatus === 'RETURNED' && <RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
            {overallStatus === 'REJECTED' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
            {overallStatus.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Stepper Flow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        {steps.map((step) => {
          const status = getStepStatus(step.code);
          const app = approvals.find((a) => a.departmentCode === step.code);

          let borderClass = 'border-slate-200 bg-slate-50';
          let icon = <Clock className="w-4 h-4 text-slate-400" />;
          let statusText = 'Pending';
          let statusBadgeClass = 'bg-slate-200 text-slate-700';

          if (status === 'APPROVED') {
            borderClass = 'border-emerald-200 bg-emerald-50/50 shadow-sm';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
            statusText = 'Approved';
            statusBadgeClass = 'bg-emerald-100 text-emerald-800 font-semibold';
          } else if (status === 'ACTIVE') {
            borderClass = 'border-blue-400 bg-blue-50/70 ring-2 ring-blue-300 shadow-md';
            icon = <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
            statusText = 'In Review';
            statusBadgeClass = 'bg-blue-600 text-white font-bold animate-pulse';
          } else if (status === 'RETURNED') {
            borderClass = 'border-amber-300 bg-amber-50';
            icon = <RotateCcw className="w-4 h-4 text-amber-600" />;
            statusText = 'Returned';
            statusBadgeClass = 'bg-amber-100 text-amber-800 font-bold';
          } else if (status === 'REJECTED') {
            borderClass = 'border-rose-300 bg-rose-50';
            icon = <XCircle className="w-4 h-4 text-rose-600" />;
            statusText = 'Rejected';
            statusBadgeClass = 'bg-rose-100 text-rose-800 font-bold';
          }

          return (
            <div
              key={step.code}
              className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all duration-200 ${borderClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {step.number}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${statusBadgeClass}`}>
                    {statusText}
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                  {icon}
                  <span>{step.title}</span>
                </div>
                <div className="text-[11px] font-medium text-slate-600 mt-0.5">{step.subtitle}</div>
                {!compact && (
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{step.description}</p>
                )}
              </div>

              {app?.remarks && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[10px] text-slate-700 italic bg-white/70 p-1.5 rounded">
                  <span className="font-semibold not-italic text-slate-900">Remarks: </span>
                  "{app.remarks}"
                </div>
              )}

              {app?.actionTimestamp && (
                <div className="mt-1.5 text-[9px] text-slate-400 font-mono">
                  {new Date(app.actionTimestamp).toLocaleDateString()} {new Date(app.actionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Return Warning Banner if Returned */}
      {overallStatus === 'RETURNED' && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Clarification Required: </span>
            This clearance request was returned by the department. Please review the remarks above and resolve any pending obligations.
          </div>
        </div>
      )}
    </div>
  );
};
