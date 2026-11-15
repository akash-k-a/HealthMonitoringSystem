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
  UserCheck
} from 'lucide-react';
import type {
  DoseEvent,
  ElderlyProfile,
  Appointment,
  CareNote,
  CareCircleMember,
  AuditEvent,
  NotificationRecord
} from '@elderly-care/types';

interface CaregiverDashboardViewProps {
  profile: ElderlyProfile;
  events: DoseEvent[];
  appointments: Appointment[];
  careNotes: CareNote[];
  circleMembers: CareCircleMember[];
  auditEvents: AuditEvent[];
  notifications: NotificationRecord[];
  currentActor: { id: string; name: string; role: string };
  onRecordDose: (doseEventId: string, actionType: string, notes?: string) => Promise<void>;
  onAddMedication: (medication: any, schedule: any) => Promise<void>;
  onAddAppointment: (appointment: any) => Promise<void>;
  onAddCareNote: (note: any) => Promise<void>;
  onInviteMember: (email: string, role: string) => Promise<void>;
}

export function CaregiverDashboardView({
  profile,
  events,
  appointments,
  careNotes,
  circleMembers,
  auditEvents,
  notifications,
  currentActor,
  onRecordDose,
  onAddMedication,
  onAddAppointment,
  onAddCareNote,
  onInviteMember
}: CaregiverDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'appointments' | 'notes' | 'circle' | 'audit'>('schedule');
  const [showAddMedModal, setShowAddMedModal] = useState<boolean>(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showAddAptModal, setShowAddAptModal] = useState<boolean>(false);

  // Form states
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'general' | 'vital_signs' | 'mood' | 'meal' | 'concern'>('general');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'caregiver' | 'family' | 'clinician'>('caregiver');

  // Stats calculation
  const totalDoses = events.length;
  const takenDoses = events.filter((e) => e.status === 'taken').length;
  const pendingDoses = events.filter((e) => e.status === 'scheduled' || e.status === 'due');
  const duplicateWarnings = events.filter((e) => e.hasDuplicateWarning);

  const handleAdminister = async (doseEventId: string) => {
    await onRecordDose(doseEventId, 'caregiver_administered', `Administered by ${currentActor.name}`);
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
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900">{profile.fullName}</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider">
              Care Active
            </span>
          </div>
          <p className="text-slate-600 mt-1 font-medium">
            DOB: {profile.dateOfBirth} • Blood: {profile.bloodGroup || 'O+'} • Conditions: {profile.medicalConditions.join(', ')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddNoteModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm flex items-center gap-2 border border-slate-300"
          >
            <Plus className="w-4 h-4" />
            <span>Add Care Note</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm"
          >
            <Users className="w-4 h-4" />
            <span>Invite to Circle</span>
          </button>
        </div>
      </div>

      {/* Duplicate Administration Alert Banner */}
      {duplicateWarnings.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-5 shadow-sm flex items-start gap-4">
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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Progress</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900">{takenDoses}</span>
            <span className="text-lg font-bold text-slate-400">/ {totalDoses} doses taken</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${totalDoses ? (takenDoses / totalDoses) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Doses</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{pendingDoses.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Scheduled for later today</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Care Circle</span>
          <p className="text-3xl font-black text-blue-600 mt-2">{circleMembers.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Active authorized contributors</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Visit</span>
          <p className="text-lg font-bold text-slate-900 mt-2 truncate">
            {appointments[0]?.doctorName || 'None scheduled'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {appointments[0]
              ? new Date(appointments[0].appointmentTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'All clear'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        {[
          { id: 'schedule', label: "Today's Schedule", icon: Clock },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'notes', label: 'Care Notes & Vitals', icon: FileText },
          { id: 'circle', label: 'Care Circle Members', icon: Users },
          { id: 'audit', label: 'Audit Trail', icon: UserCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
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
            <h2 className="text-lg font-bold text-slate-900">Scheduled Medications & Doses</h2>
            <span className="text-xs text-slate-500 font-medium">
              Universal shared editing enabled — all changes are auditable.
            </span>
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

                {/* Caregiver Actions */}
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

      {/* Tab 2: Appointments */}
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

      {/* Tab 3: Care Notes */}
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

      {/* Tab 4: Care Circle */}
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

      {/* Tab 5: Tamper-Evident Audit Trail */}
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
