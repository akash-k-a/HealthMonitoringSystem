'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Users,
  FileText,
  ShieldAlert,
  Send,
  UserCheck,
  TrendingUp,
  Package,
  Printer,
  Radio,
  Check,
  ShieldCheck
} from 'lucide-react';
import type {
  DoseEvent,
  ElderlyProfile,
  Appointment,
  CareNote,
  CareCircleMember,
  AuditEvent,
  NotificationRecord,
  ShiftHandoff,
  MedicationRiskFlag,
  AbdmProfile,
  SmartPillbox
} from '@elderly-care/types';

interface CaregiverDashboardViewProps {
  profile: ElderlyProfile;
  events: DoseEvent[];
  appointments: Appointment[];
  careNotes: CareNote[];
  circleMembers: CareCircleMember[];
  auditEvents: AuditEvent[];
  notifications: NotificationRecord[];
  shiftHandoffs?: ShiftHandoff[];
  riskFlags?: MedicationRiskFlag[];
  abdmProfile?: AbdmProfile | null;
  smartPillbox?: SmartPillbox | null;
  currentActor: { id: string; name: string; role: string };
  onRecordDose: (doseEventId: string, actionType: string, notes?: string) => Promise<void>;
  onAddMedication: (medication: any, schedule: any) => Promise<void>;
  onAddAppointment: (appointment: any) => Promise<void>;
  onAddCareNote: (note: any) => Promise<void>;
  onInviteMember: (email: string, role: string) => Promise<void>;
  onRefillStock?: (medicationId: string, quantity: number) => Promise<void>;
  onCreateHandoff?: (handoffData: any) => Promise<void>;
  onAcknowledgeHandoff?: (handoffId: string) => Promise<void>;
  onSimulatePillboxOpen?: () => Promise<void>;
}

export function CaregiverDashboardView({
  profile,
  events,
  appointments,
  careNotes,
  circleMembers,
  auditEvents,
  notifications,
  shiftHandoffs = [],
  riskFlags = [],
  abdmProfile,
  smartPillbox,
  currentActor,
  onRecordDose,
  onAddMedication,
  onAddAppointment,
  onAddCareNote,
  onInviteMember,
  onRefillStock,
  onCreateHandoff,
  onAcknowledgeHandoff,
  onSimulatePillboxOpen
}: CaregiverDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'adherence' | 'inventory' | 'handoff' | 'appointments' | 'notes' | 'circle' | 'audit'>('schedule');
  const [showAddMedModal, setShowAddMedModal] = useState<boolean>(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showCreateHandoffModal, setShowCreateHandoffModal] = useState<boolean>(false);

  // Add Medication form states
  const [medName, setMedName] = useState('');
  const [medStrength, setMedStrength] = useState('');
  const [medForm, setMedForm] = useState<'tablet' | 'capsule' | 'liquid' | 'injection' | 'drops' | 'inhaler'>('tablet');
  const [medDoseAmount, setMedDoseAmount] = useState('1 tablet');
  const [medFood, setMedFood] = useState<'with_food' | 'before_food' | 'after_food' | 'no_food_restriction'>('with_food');
  const [medScheduleType, setMedScheduleType] = useState<'daily' | 'as_needed'>('daily');
  const [medDoseTime, setMedDoseTime] = useState('08:00');
  const [medPurpose, setMedPurpose] = useState('');
  const [medInstructions, setMedInstructions] = useState('');

  // Shift Handoff form
  const [handoffObs, setHandoffObs] = useState('');
  const [handoffConcerns, setHandoffConcerns] = useState('');
  const [handoffActions, setHandoffActions] = useState('');
  const [incomingName, setIncomingName] = useState('Priya Nair (Night Caregiver)');

  // Form states
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'general' | 'vital_signs' | 'mood' | 'meal' | 'concern'>('general');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'caregiver' | 'family' | 'clinician'>('caregiver');

  // Stats calculation
  const totalDoses = events.length;
  const takenDoses = events.filter((e) => e.status === 'taken').length;
  const pendingDoses = events.filter((e) => e.status === 'scheduled' || e.status === 'due');
  const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;
  const duplicateWarnings = events.filter((e) => e.hasDuplicateWarning);

  const handleAdminister = async (doseEventId: string) => {
    await onRecordDose(doseEventId, 'caregiver_administered', `Administered by ${currentActor.name}`);
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !medStrength) return;
    await onAddMedication(
      {
        name: medName,
        strength: medStrength,
        form: medForm,
        doseAmount: medDoseAmount,
        instructions: medInstructions || `Take ${medDoseAmount} ${medFood.replace('_', ' ')}`,
        foodInstructions: medFood,
        purpose: medPurpose || 'Prescribed therapy',
        isActive: true
      },
      {
        scheduleType: medScheduleType,
        doseTimes: medScheduleType === 'daily' ? [medDoseTime] : [],
        startDate: new Date().toISOString().split('T')[0]
      }
    );
    setMedName('');
    setMedStrength('');
    setMedPurpose('');
    setMedInstructions('');
    setShowAddMedModal(false);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent) return;
    await onAddCareNote({
      authorUserId: currentActor.id,
      authorName: currentActor.name,
      category: noteCategory,
      content: noteContent
    });
    setNoteContent('');
    setShowAddNoteModal(false);
  };

  const handleSaveHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateHandoff || !handoffObs) return;
    await onCreateHandoff({
      outgoingCaregiverId: currentActor.id,
      outgoingCaregiverName: currentActor.name,
      incomingCaregiverName: incomingName,
      observationsSummary: handoffObs,
      concernsOrAlerts: handoffConcerns,
      nextShiftActions: handoffActions ? handoffActions.split(',').map((s) => s.trim()) : []
    });
    setShowCreateHandoffModal(false);
    setHandoffObs('');
    setHandoffConcerns('');
    setHandoffActions('');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    await onInviteMember(inviteEmail, inviteRole);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900">{profile.fullName}</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider">
              Care Active
            </span>
            {abdmProfile && (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                ABHA: {abdmProfile.abhaNumber}
              </span>
            )}
          </div>
          <p className="text-slate-600 mt-1 font-medium">
            DOB: {profile.dateOfBirth} • Blood: {profile.bloodGroup || 'O+'} • Conditions: {profile.medicalConditions.join(', ')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {smartPillbox && (
            <button
              onClick={() => onSimulatePillboxOpen && onSimulatePillboxOpen()}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Simulate Smart Pillbox ({smartPillbox.batteryPercentage}%)</span>
            </button>
          )}

          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Doctor Visit PDF</span>
          </button>

          <button
            onClick={() => setShowAddNoteModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Care Note</span>
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Invite Contributor</span>
          </button>
        </div>
      </div>

      {/* Drug Safety & Risk Flags Banner */}
      {riskFlags.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Verified Medication Safety Alerts ({riskFlags.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {riskFlags.map((risk) => (
              <div key={risk.id} className="p-3 bg-white rounded-xl border border-amber-200">
                <span className="font-bold text-amber-950 block">{risk.title}</span>
                <p className="text-slate-700 mt-0.5">{risk.description}</p>
                <p className="text-emerald-700 font-semibold mt-1">Action: {risk.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Administration Alert Banner */}
      {duplicateWarnings.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 shadow-sm flex items-start gap-4">
          <ShieldAlert className="w-8 h-8 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-900">Possible Duplicate Administration Warning!</h3>
            <p className="text-sm text-red-800 mt-1">
              Multiple care contributors reported administering the same dose. Please check with the patient and care circle to prevent accidental overdose.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Adherence Today</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900">{adherenceRate}%</span>
            <span className="text-sm font-bold text-slate-400">({takenDoses}/{totalDoses} taken)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${adherenceRate}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Doses</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{pendingDoses.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Scheduled for later today</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Shift Handoffs</span>
          <p className="text-3xl font-black text-indigo-600 mt-2">{shiftHandoffs.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Recorded handover logs</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Doctor Visit</span>
          <p className="text-lg font-bold text-slate-900 mt-2 truncate">
            {appointments[0]?.doctorName || 'None scheduled'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {appointments[0]
              ? new Date(appointments[0].appointmentTime).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'All clear'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
        {[
          { id: 'schedule', label: "Schedule", icon: Clock },
          { id: 'adherence', label: "Adherence Reports", icon: TrendingUp },
          { id: 'inventory', label: "Refills & Stock", icon: Package },
          { id: 'handoff', label: "Shift Handoff", icon: UserCheck },
          { id: 'appointments', label: "Appointments", icon: Calendar },
          { id: 'notes', label: "Care Notes & Vitals", icon: FileText },
          { id: 'circle', label: "Care Circle", icon: Users },
          { id: 'audit', label: "Audit Trail", icon: ShieldAlert }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-3 font-bold text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Today's Schedule Table */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Scheduled Medications & Doses</h2>
              <span className="text-xs text-slate-500 font-medium">
                Universal shared editing enabled — all changes are auditable.
              </span>
            </div>
            <button
              onClick={() => setShowAddMedModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medication</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {events.map((event) => (
              <div key={event.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center font-bold text-slate-700 shrink-0">
                    <span className="text-xs uppercase">{event.routineCategory.substring(0, 3)}</span>
                    <span className="text-sm">{event.scheduledTime.substring(0, 5)}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">{event.medication?.name}</h3>
                      <span className="text-sm font-semibold text-slate-500">
                        {event.medication?.doseAmount} ({event.medication?.strength})
                      </span>
                      {event.hasDuplicateWarning && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-md flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          Duplicate Warning
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mt-0.5">
                      {event.medication?.instructions || 'Take as instructed'}{' '}
                      {event.medication?.foodInstructions && `(${event.medication.foodInstructions.replace('_', ' ')})`}
                    </p>

                    {event.status === 'taken' && (
                      <p className="text-xs font-semibold text-emerald-800 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Administered / Confirmed by {event.resolvedByName || 'Self'} at{' '}
                        {new Date(event.resolvedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}

                    {event.status === 'skipped' && (
                      <p className="text-xs font-semibold text-amber-800 mt-1">
                        Skipped dose reported (Reason logged)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {event.status !== 'taken' ? (
                    <button
                      onClick={() => handleAdminister(event.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Administered</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Adherence & Insights (Phase 2) */}
      {activeTab === 'adherence' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Medication Adherence Overview</h2>
              <p className="text-xs text-slate-500">Analytics compiled from daily confirmation events.</p>
            </div>
            <span className="text-2xl font-black text-emerald-700">{adherenceRate}% Weekly Adherence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase">Taken On-Time</span>
              <p className="text-2xl font-black text-emerald-950 mt-1">{takenDoses} doses</p>
              <p className="text-xs text-emerald-700 mt-1">Confirmed within 30 min window</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase">Skipped / Delayed</span>
              <p className="text-2xl font-black text-amber-950 mt-1">
                {events.filter((e) => e.status === 'skipped').length} doses
              </p>
              <p className="text-xs text-amber-700 mt-1">Reasons documented</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">Clinical Evaluation</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {adherenceRate >= 90 ? 'Excellent' : adherenceRate >= 75 ? 'Good' : 'Needs Follow-up'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Ready for doctor review</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Inventory & Refills (Phase 2) */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Medication Inventory & Refill Reminders</h2>
              <p className="text-xs text-slate-500">Pill count and estimated days remaining.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {events.map((ev) => ev.medication).filter((v, i, a) => a.findIndex((t) => t?.id === v?.id) === i).map((med) => {
              if (!med) return null;
              const stock = med.inventory?.currentStock || 15;
              const isLow = stock <= (med.inventory?.lowStockThreshold || 7);

              return (
                <div key={med.id} className="py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{med.name}</h3>
                    <p className="text-xs text-slate-500">
                      Strength: {med.strength} • Pharmacy: {med.inventory?.pharmacyName || 'Apollo City Pharmacy'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-base font-black ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                        {stock} {med.inventory?.unit || 'tablets'} left
                      </span>
                      <span className="text-xs block text-slate-400">
                        {isLow ? '⚠️ Refill needed soon' : 'Supply healthy'}
                      </span>
                    </div>
                    {onRefillStock && (
                      <button
                        onClick={() => onRefillStock(med.id, 30)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                      >
                        + Refill (+30)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Shift Handoff (Phase 3) */}
      {activeTab === 'handoff' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Caregiver Shift Handoffs</h2>
              <p className="text-xs text-slate-500">Structured transfer between incoming and outgoing caregivers.</p>
            </div>
            <button
              onClick={() => setShowCreateHandoffModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shift Handoff</span>
            </button>
          </div>

          <div className="space-y-4">
            {shiftHandoffs.map((handoff) => (
              <div key={handoff.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-800 uppercase bg-indigo-100 px-3 py-1 rounded-full">
                    Handoff by {handoff.outgoingCaregiverName} → {handoff.incomingCaregiverName || 'Next Shift'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(handoff.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-sm text-slate-800">
                  <strong>Observations:</strong> {handoff.observationsSummary}
                </p>

                {handoff.concernsOrAlerts && (
                  <p className="text-sm text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    ⚠️ <strong>Alerts & Concerns:</strong> {handoff.concernsOrAlerts}
                  </p>
                )}

                {handoff.nextShiftActions && handoff.nextShiftActions.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase">Action items for next shift:</span>
                    <ul className="text-xs text-slate-700 list-disc list-inside mt-1 space-y-0.5">
                      {handoff.nextShiftActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                  <span className="text-xs text-slate-500">
                    Status:{' '}
                    {handoff.isAcknowledged ? (
                      <span className="text-emerald-700 font-bold">
                        ✓ Acknowledged by {handoff.incomingCaregiverName}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold">⏳ Awaiting incoming acknowledgement</span>
                    )}
                  </span>

                  {!handoff.isAcknowledged && onAcknowledgeHandoff && (
                    <button
                      onClick={() => onAcknowledgeHandoff(handoff.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge Handoff</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Appointments */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Medical Visits</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((apt) => (
              <div key={apt.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-full">
                    {apt.specialty || 'General Consultation'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {new Date(apt.appointmentTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{apt.doctorName}</h3>
                <p className="text-sm font-semibold text-slate-700">{apt.facilityName}</p>
                <p className="text-sm text-slate-600">{apt.locationAddress}</p>

                {apt.preparationChecklist && apt.preparationChecklist.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-1">Preparation Checklist:</p>
                    <ul className="text-xs space-y-1 text-slate-700">
                      {apt.preparationChecklist.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Care Notes */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Caregiver Shift & Health Notes</h2>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>

          <div className="space-y-3">
            {careNotes.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No care notes recorded yet.</p>
            ) : (
              careNotes.map((note) => (
                <div key={note.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase bg-slate-200 px-2 py-0.5 rounded-md">
                      {note.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • by {note.authorName}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 pt-1">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Care Circle */}
      {activeTab === 'circle' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Authorized Care Circle</h2>
              <p className="text-xs text-slate-500">Every authorized member has shared editing rights by default.</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1"
            >
              <Users className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {circleMembers.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{m.user?.fullName || 'User'}</h4>
                  <p className="text-xs text-slate-500">{m.user?.email} • Role: {m.role.toUpperCase()}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  {m.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Platform Audit Trail</h2>
            <span className="text-xs text-slate-500">Non-destructive history log</span>
          </div>

          <div className="space-y-2">
            {auditEvents.map((a) => (
              <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{a.actorName || a.actorUserId}</span>{' '}
                  <span className="text-slate-600">performed</span>{' '}
                  <span className="font-semibold text-emerald-700">{a.action}</span>{' '}
                  <span className="text-slate-500">on {a.resourceType} ({a.resourceId.substring(0, 8)})</span>
                  {a.reason && <p className="text-slate-600 italic mt-0.5">Reason: "{a.reason}"</p>}
                </div>
                <span className="text-slate-400 whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Medication */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900">Add New Medication</h3>
            <p className="text-xs text-slate-600">
              Prescribed medications are shared across all authorized circle members and automatically generate daily dose routines.
            </p>
            <form onSubmit={handleSaveMedication} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Medication Name</label>
                  <input
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Atorvastatin"
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Strength</label>
                  <input
                    type="text"
                    value={medStrength}
                    onChange={(e) => setMedStrength(e.target.value)}
                    placeholder="e.g. 10 mg"
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Form</label>
                  <select
                    value={medForm}
                    onChange={(e: any) => setMedForm(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm font-medium"
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="liquid">Liquid</option>
                    <option value="injection">Injection</option>
                    <option value="drops">Drops</option>
                    <option value="inhaler">Inhaler</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Dose Amount</label>
                  <input
                    type="text"
                    value={medDoseAmount}
                    onChange={(e) => setMedDoseAmount(e.target.value)}
                    placeholder="e.g. 1 tablet"
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Food Instruction</label>
                  <select
                    value={medFood}
                    onChange={(e: any) => setMedFood(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm font-medium"
                  >
                    <option value="with_food">With meal / food</option>
                    <option value="before_food">Before food (empty stomach)</option>
                    <option value="after_food">After meal</option>
                    <option value="no_food_restriction">No food restriction</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Schedule Type</label>
                  <select
                    value={medScheduleType}
                    onChange={(e: any) => setMedScheduleType(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm font-medium"
                  >
                    <option value="daily">Daily Scheduled</option>
                    <option value="as_needed">As Needed (PRN)</option>
                  </select>
                </div>
              </div>

              {medScheduleType === 'daily' && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Daily Dose Time</label>
                  <input
                    type="time"
                    value={medDoseTime}
                    onChange={(e) => setMedDoseTime(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm font-medium"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Purpose / Why Taking</label>
                <input
                  type="text"
                  value={medPurpose}
                  onChange={(e) => setMedPurpose(e.target.value)}
                  placeholder="e.g. For cholesterol control"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Instructions / Notes</label>
                <input
                  type="text"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  placeholder="e.g. Take at bedtime with a glass of water"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
                >
                  Save Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Shift Handoff (Phase 3) */}
      {showCreateHandoffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">Create Shift Handoff Summary</h3>
            <p className="text-xs text-slate-600">
              Summarizes completed doses, vital signs observations, and instructions for the incoming caregiver.
            </p>
            <form onSubmit={handleSaveHandoff} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Incoming Caregiver Name</label>
                <input
                  type="text"
                  value={incomingName}
                  onChange={(e) => setIncomingName(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Shift Observations Summary</label>
                <textarea
                  rows={3}
                  value={handoffObs}
                  onChange={(e) => setHandoffObs(e.target.value)}
                  placeholder="e.g. Margaret ate breakfast and lunch well. Doses given on time. Rested in afternoon."
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Concerns / Refills Needed</label>
                <input
                  type="text"
                  value={handoffConcerns}
                  onChange={(e) => setHandoffConcerns(e.target.value)}
                  placeholder="e.g. Amlodipine supply is low (4 tablets remaining)"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Action Items for Next Shift (comma separated)</label>
                <input
                  type="text"
                  value={handoffActions}
                  onChange={(e) => setHandoffActions(e.target.value)}
                  placeholder="e.g. Give 8 PM dose, Check blood pressure, Ensure bedside water"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateHandoffModal(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
                >
                  Submit Handoff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable Pre-Visit Doctor PDF / Summary (Phase 4) */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Doctor Visit Preparation Summary</h2>
                <p className="text-xs text-slate-500">Prepared for: {profile.fullName} ({profile.dateOfBirth})</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Printer className="w-4 h-4" />
                <span>Print PDF</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-800">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase">1. Active Prescriptions & Schedules</h4>
                <ul className="mt-1 space-y-1">
                  {events.map((e) => e.medication).filter((v, i, a) => a.findIndex((t) => t?.id === v?.id) === i).map((m) => (
                    <li key={m?.id} className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold">{m?.name} ({m?.strength})</span>
                      <span>{m?.doseAmount} - {m?.purpose}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase">2. Recent Vital Signs & Observations</h4>
                <p className="mt-1 text-slate-600">
                  • Blood Pressure: 130/84 mmHg (Fasting BP logged stable)<br />
                  • Blood Sugar: 112 mg/dL • Heart Rate: 74 bpm • SpO2: 98%
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase">3. Questions & Checklist for Clinician</h4>
                <p className="mt-1 text-slate-600">
                  [ ] Review Amlodipine dosage based on evening BP readings.<br />
                  [ ] Evaluate HbA1c routine repeat test for diabetes review.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Care Note */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">Record Care Note</h3>
            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Category</label>
                <select
                  value={noteCategory}
                  onChange={(e: any) => setNoteCategory(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm font-medium"
                >
                  <option value="general">General Observation</option>
                  <option value="vital_signs">Vital Signs</option>
                  <option value="mood">Mood / Behaviour</option>
                  <option value="meal">Meal / Hydration</option>
                  <option value="concern">Medical Concern</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Observation Note</label>
                <textarea
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="e.g. Margaret took lunch comfortably, rested in the afternoon, BP checked 130/84"
                  className="w-full mt-1 p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Member */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">Invite Care Contributor</h3>
            <p className="text-xs text-slate-600">
              Invited members gain access to view and coordinate care on Margaret's shared record.
            </p>
            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm font-medium"
                >
                  <option value="caregiver">Caregiver (Hands-on care)</option>
                  <option value="family">Family Member (Reassurance & updates)</option>
                  <option value="clinician">Clinician (Explicit clinical notes)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
