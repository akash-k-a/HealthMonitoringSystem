'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Users, Shield, RefreshCw, UserPlus, HelpCircle, Globe } from 'lucide-react';
import { ElderlyTodayView } from '../components/ElderlyTodayView';
import { CaregiverDashboardView } from '../components/CaregiverDashboardView';
import { FamilyReassuranceView } from '../components/FamilyReassuranceView';
import type {
  DoseEvent,
  ElderlyProfile,
  Appointment,
  CareNote,
  CareCircleMember,
  EmergencyContact,
  AuditEvent,
  NotificationRecord,
  DailyHealthCheckin,
  ShiftHandoff,
  MedicationRiskFlag,
  AbdmProfile,
  SmartPillbox,
  SupportedLanguage
} from '@elderly-care/types';

export default function HomePage() {
  const [activePersona, setActivePersona] = useState<'elderly' | 'caregiver' | 'family'>('elderly');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [showAddPatientModal, setShowAddPatientModal] = useState<boolean>(false);
  const [showOnboardingInfoModal, setShowOnboardingInfoModal] = useState<boolean>(false);

  // New Patient Form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPreferred, setNewPatientPreferred] = useState('');
  const [newPatientDOB, setNewPatientDOB] = useState('1950-01-01');
  const [newPatientBlood, setNewPatientBlood] = useState('B+');
  const [newPatientAllergies, setNewPatientAllergies] = useState('');
  const [newPatientConditions, setNewPatientConditions] = useState('');

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    profile: ElderlyProfile | null;
    allProfiles: ElderlyProfile[];
    todayEvents: DoseEvent[];
    appointments: Appointment[];
    careNotes: CareNote[];
    emergencyContacts: EmergencyContact[];
    circleMembers: CareCircleMember[];
    auditEvents: AuditEvent[];
    notifications: NotificationRecord[];
    checkins: DailyHealthCheckin[];
    shiftHandoffs: ShiftHandoff[];
    riskFlags: MedicationRiskFlag[];
    abdmProfile: AbdmProfile | null;
    smartPillbox: SmartPillbox | null;
  }>({
    profile: null,
    allProfiles: [],
    todayEvents: [],
    appointments: [],
    careNotes: [],
    emergencyContacts: [],
    circleMembers: [],
    auditEvents: [],
    notifications: [],
    checkins: [],
    shiftHandoffs: [],
    riskFlags: [],
    abdmProfile: null,
    smartPillbox: null
  });

  const fetchData = async (overrideProfileId?: string) => {
    try {
      const pid = overrideProfileId !== undefined ? overrideProfileId : selectedProfileId;
      const url = pid ? `/api/data?profileId=${encodeURIComponent(pid)}` : '/api/data';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData({
          profile: json.profile,
          allProfiles: json.allProfiles || [],
          todayEvents: json.todayEvents || [],
          appointments: json.appointments || [],
          careNotes: json.careNotes || [],
          emergencyContacts: json.emergencyContacts || [],
          circleMembers: json.circleMembers || [],
          auditEvents: json.auditEvents || [],
          notifications: json.notifications || [],
          checkins: json.checkins || [],
          shiftHandoffs: json.shiftHandoffs || [],
          riskFlags: json.riskFlags || [],
          abdmProfile: json.abdmProfile || null,
          smartPillbox: json.smartPillbox || null
        });
        if (json.profile?.preferredLanguage) {
          setCurrentLanguage(json.profile.preferredLanguage);
        }
        if (!selectedProfileId && json.profile) {
          setSelectedProfileId(json.profile.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 3000);
    return () => clearInterval(interval);
  }, [selectedProfileId]);

  const handleSelectPatient = (id: string) => {
    setSelectedProfileId(id);
    fetchData(id);
  };

  const handleToggleLanguage = async () => {
    const nextLang = currentLanguage === 'en' ? 'ml' : 'en';
    setCurrentLanguage(nextLang);
    if (data.profile) {
      data.profile.preferredLanguage = nextLang;
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHANGE_LANGUAGE',
          payload: {
            profileId: data.profile.id,
            language: nextLang
          }
        })
      });
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName) return;

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_PATIENT',
        payload: {
          fullName: newPatientName,
          preferredName: newPatientPreferred || newPatientName.split(' ')[0],
          dateOfBirth: newPatientDOB,
          bloodGroup: newPatientBlood,
          allergies: newPatientAllergies ? newPatientAllergies.split(',').map((s) => s.trim()) : [],
          medicalConditions: newPatientConditions ? newPatientConditions.split(',').map((s) => s.trim()) : []
        }
      })
    });

    if (res.ok) {
      const json = await res.json();
      if (json.elderlyProfile) {
        setSelectedProfileId(json.elderlyProfile.id);
        fetchData(json.elderlyProfile.id);
      }
      setShowAddPatientModal(false);
      setNewPatientName('');
      setNewPatientPreferred('');
      setNewPatientAllergies('');
      setNewPatientConditions('');
    }
  };

  const handleRecordDose = async (doseEventId: string, actionType: string, notes?: string) => {
    let actorId = 'usr-margaret';
    let actorName = data.profile?.fullName || 'Elderly Patient';

    if (activePersona === 'caregiver') {
      actorId = 'usr-sarah';
      actorName = 'Sarah Jenkins';
    } else if (activePersona === 'family') {
      actorId = 'usr-ramesh';
      actorName = 'Ramesh Sharma';
    }

    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RECORD_DOSE',
        payload: {
          doseEventId,
          actorId,
          actorName,
          actionType,
          notes
        }
      })
    });
    await fetchData();
  };

  const handleUndoDose = async (doseEventId: string, reason?: string) => {
    let actorId = 'usr-margaret';
    let actorName = data.profile?.fullName || 'Elderly Patient';

    if (activePersona === 'caregiver') {
      actorId = 'usr-sarah';
      actorName = 'Sarah Jenkins';
    }

    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UNDO_DOSE',
        payload: {
          doseEventId,
          actorId,
          actorName,
          reason
        }
      })
    });
    await fetchData();
  };

  const handleAddMedication = async (medication: any, schedule: any) => {
    if (!data.profile) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_MEDICATION',
        payload: {
          elderlyProfileId: data.profile.id,
          medication,
          schedule,
          actorId: 'usr-sarah',
          actorName: 'Sarah Jenkins'
        }
      })
    });
    await fetchData();
  };

  const handleRefillStock = async (medicationId: string, quantity: number) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'REFILL_STOCK',
        payload: {
          medicationId,
          addedQuantity: quantity,
          actorName: 'Sarah Jenkins'
        }
      })
    });
    await fetchData();
  };

  const handleCreateHandoff = async (handoffData: any) => {
    if (!data.profile) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_SHIFT_HANDOFF',
        payload: {
          elderlyProfileId: data.profile.id,
          ...handoffData
        }
      })
    });
    await fetchData();
  };

  const handleAcknowledgeHandoff = async (handoffId: string) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ACKNOWLEDGE_SHIFT_HANDOFF',
        payload: {
          handoffId,
          acknowledgedByName: 'Priya Nair (Incoming Nurse)'
        }
      })
    });
    await fetchData();
  };

  const handleRecordCheckin = async (checkin: any) => {
    if (!data.profile) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RECORD_HEALTH_CHECKIN',
        payload: {
          elderlyProfileId: data.profile.id,
          checkin
        }
      })
    });
    await fetchData();
  };

  const handleSimulatePillbox = async () => {
    if (!data.profile) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SIMULATE_PILLBOX_OPEN',
        payload: {
          elderlyProfileId: data.profile.id,
          compartmentNumber: 1
        }
      })
    });
    await fetchData();
  };

  const handleAddAppointment = async (appointment: any) => {
    if (!data.profile) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_APPOINTMENT',
        payload: {
          elderlyProfileId: data.profile.id,
          appointment
        }
      })
    });
    await fetchData();
  };

  const handleAddCareNote = async (note: any) => {
    if (!data.profile) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_CARE_NOTE',
        payload: {
          elderlyProfileId: data.profile.id,
          note
        }
      })
    });
    await fetchData();
  };

  const handleInviteMember = async (email: string, role: string) => {
    const circle = data.circleMembers[0];
    if (!circle) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INVITE_MEMBER',
        payload: {
          circleId: circle.circleId,
          invitedByUserId: 'usr-sarah',
          email,
          role
        }
      })
    });
    await fetchData();
  };

  if (loading || !data.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-slate-700 font-bold">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading CareConnect Shared Platform...</span>
        </div>
      </div>
    );
  }

  // Active checkin for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckin = data.checkins.find((c) => c.date === todayStr);

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* Platform Navigation Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl">
              C
            </div>
            <div>
              <span className="font-black text-lg tracking-tight">CareConnect</span>
              <span className="text-xs text-emerald-400 block font-semibold">Collaborative Platform</span>
            </div>
          </div>

          {/* Patient Selector & New Patient Button */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Patient:</span>
            <select
              value={selectedProfileId}
              onChange={(e) => handleSelectPatient(e.target.value)}
              className="bg-transparent text-sm font-bold text-emerald-300 focus:outline-none cursor-pointer"
            >
              {data.allProfiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.fullName}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAddPatientModal(true)}
              title="Add New Patient"
              className="ml-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">New Patient</span>
            </button>
          </div>

          {/* Interactive Persona Switcher */}
          <div className="flex items-center bg-slate-800 p-1 rounded-2xl border border-slate-700 shrink-0">
            <button
              onClick={() => setActivePersona('elderly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activePersona === 'elderly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Elderly Mobile</span>
            </button>

            <button
              onClick={() => setActivePersona('caregiver')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activePersona === 'caregiver'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Caregiver Web</span>
            </button>

            <button
              onClick={() => setActivePersona('family')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activePersona === 'family'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Family Digest</span>
            </button>
          </div>

          {/* Multilingual Toggle: English ⇄ മലയാളം */}
          <button
            onClick={handleToggleLanguage}
            title="Toggle Language (English / Malayalam)"
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentLanguage === 'en' ? 'EN | മലയാളം' : 'മലയാളം | EN'}</span>
          </button>

          <button
            onClick={() => setShowOnboardingInfoModal(true)}
            title="How do patients join?"
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* Helper Explanation Banner */}
        <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>One shared care record for {data.profile.fullName}:</strong> Live connected across Elderly Mobile, Caregiver Dashboard, and Family Digest.
            </span>
          </div>
          <button
            onClick={() => setShowOnboardingInfoModal(true)}
            className="text-emerald-700 font-bold hover:underline shrink-0 ml-2"
          >
            How does onboarding work? →
          </button>
        </div>

        {/* View Routing */}
        {activePersona === 'elderly' && (
          <div className="py-4">
            <div className="text-center mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
                Simulated Mobile Screen • {data.profile.fullName}'s Companion
              </span>
            </div>
            <ElderlyTodayView
              profile={{ ...data.profile, preferredLanguage: currentLanguage }}
              events={data.todayEvents}
              appointments={data.appointments}
              emergencyContacts={data.emergencyContacts}
              todayCheckin={todayCheckin}
              onRecordDose={handleRecordDose}
              onUndoDose={handleUndoDose}
              onRecordCheckin={handleRecordCheckin}
            />
          </div>
        )}

        {activePersona === 'caregiver' && (
          <CaregiverDashboardView
            profile={data.profile}
            events={data.todayEvents}
            appointments={data.appointments}
            careNotes={data.careNotes}
            circleMembers={data.circleMembers}
            auditEvents={data.auditEvents}
            notifications={data.notifications}
            shiftHandoffs={data.shiftHandoffs}
            riskFlags={data.riskFlags}
            abdmProfile={data.abdmProfile}
            smartPillbox={data.smartPillbox}
            currentActor={{ id: 'usr-sarah', name: 'Sarah Jenkins', role: 'caregiver' }}
            onRecordDose={handleRecordDose}
            onAddMedication={handleAddMedication}
            onAddAppointment={handleAddAppointment}
            onAddCareNote={handleAddCareNote}
            onInviteMember={handleInviteMember}
            onRefillStock={handleRefillStock}
            onCreateHandoff={handleCreateHandoff}
            onAcknowledgeHandoff={handleAcknowledgeHandoff}
            onSimulatePillboxOpen={handleSimulatePillbox}
          />
        )}

        {activePersona === 'family' && (
          <div className="py-4">
            <FamilyReassuranceView
              profile={data.profile}
              events={data.todayEvents}
              appointments={data.appointments}
              careNotes={data.careNotes}
              emergencyContacts={data.emergencyContacts}
            />
          </div>
        )}
      </main>

      {/* Modal: Add New Patient */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-800">
              <UserPlus className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900">Add New Patient / Care Recipient</h3>
            </div>
            <p className="text-xs text-slate-600">
              Creates a new shared care profile and circle. You can add medications, appointments, and invite family/caregivers.
            </p>

            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="e.g. Ramachandran Nair"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Preferred Name</label>
                  <input
                    type="text"
                    value={newPatientPreferred}
                    onChange={(e) => setNewPatientPreferred(e.target.value)}
                    placeholder="e.g. Uncle / Dad"
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Blood Group</label>
                  <select
                    value={newPatientBlood}
                    onChange={(e) => setNewPatientBlood(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Date of Birth</label>
                <input
                  type="date"
                  value={newPatientDOB}
                  onChange={(e) => setNewPatientDOB(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Medical Conditions (comma separated)</label>
                <input
                  type="text"
                  value={newPatientConditions}
                  onChange={(e) => setNewPatientConditions(e.target.value)}
                  placeholder="e.g. Hypertension, Asthma"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Allergies (comma separated)</label>
                <input
                  type="text"
                  value={newPatientAllergies}
                  onChange={(e) => setNewPatientAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts"
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: How do Patients Join (Onboarding Guide) */}
      {showOnboardingInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-black text-slate-900">How Does an Elderly Patient Join?</h3>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <h4 className="font-bold text-emerald-900">Path A: Caregiver-Assisted Onboarding (Recommended)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  1. A family member (e.g. Ramesh) or caregiver (Sarah) creates the patient profile from web or mobile, enters prescriptions, doctor visits, and emergency contacts.
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  2. They hand the phone to the senior. The mobile app opens with a 4-digit PIN setup (no complicated email/password for the senior).
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  3. A guided interactive demo lets the senior practice tapping "I TOOK IT" and testing the 30-second Undo button.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900">Path B: Senior Self-Registration</h4>
                <p className="text-xs text-slate-600 mt-1">
                  If the senior is tech-savvy, they download the app, create their account, and use the <strong>"Invite Member"</strong> button to send invite codes to their daughter, son, or hired nurse.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowOnboardingInfoModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
