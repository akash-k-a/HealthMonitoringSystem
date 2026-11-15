'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Users, Shield, RefreshCw } from 'lucide-react';
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
  NotificationRecord
} from '@elderly-care/types';

export default function HomePage() {
  const [activePersona, setActivePersona] = useState<'elderly' | 'caregiver' | 'family'>('elderly');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    profile: ElderlyProfile | null;
    todayEvents: DoseEvent[];
    appointments: Appointment[];
    careNotes: CareNote[];
    emergencyContacts: EmergencyContact[];
    circleMembers: CareCircleMember[];
    auditEvents: AuditEvent[];
    notifications: NotificationRecord[];
  }>({
    profile: null,
    todayEvents: [],
    appointments: [],
    careNotes: [],
    emergencyContacts: [],
    circleMembers: [],
    auditEvents: [],
    notifications: []
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        setData({
          profile: json.profile,
          todayEvents: json.todayEvents || [],
          appointments: json.appointments || [],
          careNotes: json.careNotes || [],
          emergencyContacts: json.emergencyContacts || [],
          circleMembers: json.circleMembers || [],
          auditEvents: json.auditEvents || [],
          notifications: json.notifications || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Simulate real-time polling / WebSocket connection
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRecordDose = async (doseEventId: string, actionType: string, notes?: string) => {
    let actorId = 'usr-margaret';
    let actorName = 'Margaret Sharma';

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
    let actorName = 'Margaret Sharma';

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

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* Platform Navigation Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl">
              C
            </div>
            <div>
              <span className="font-black text-lg tracking-tight">CareConnect</span>
              <span className="text-xs text-emerald-400 block font-semibold">Elderly Healthcare Platform</span>
            </div>
          </div>

          {/* Interactive Persona Switcher */}
          <div className="flex items-center bg-slate-800 p-1 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActivePersona('elderly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activePersona === 'elderly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Margaret (Elderly Mobile)</span>
            </button>

            <button
              onClick={() => setActivePersona('caregiver')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activePersona === 'caregiver'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Sarah (Caregiver Web)</span>
            </button>

            <button
              onClick={() => setActivePersona('family')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activePersona === 'family'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ramesh (Family Digest)</span>
            </button>
          </div>

          {/* Realtime Synchronized Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/70 px-3 py-1.5 rounded-full border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Shared Care Sync Active</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* Helper Explanation Banner */}
        <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>One shared care record:</strong> Any action taken on the elderly mobile view immediately reflects on the caregiver web view and vice versa in real time.
            </span>
          </div>
          <span className="text-slate-400">Phase 1 MVP Interactive Demonstration</span>
        </div>

        {/* View Routing */}
        {activePersona === 'elderly' && (
          <div className="py-4">
            <div className="text-center mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
                Simulated Mobile Screen • 390 × 844 CSS Viewport
              </span>
            </div>
            <ElderlyTodayView
              profile={data.profile}
              events={data.todayEvents}
              appointments={data.appointments}
              emergencyContacts={data.emergencyContacts}
              onRecordDose={handleRecordDose}
              onUndoDose={handleUndoDose}
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
            currentActor={{ id: 'usr-sarah', name: 'Sarah Jenkins', role: 'caregiver' }}
            onRecordDose={handleRecordDose}
            onAddMedication={handleAddMedication}
            onAddAppointment={handleAddAppointment}
            onAddCareNote={handleAddCareNote}
            onInviteMember={handleInviteMember}
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
    </div>
  );
}
