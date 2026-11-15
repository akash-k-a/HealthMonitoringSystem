'use client';

import React, { useState } from 'react';
import { CheckCircle, Calendar, MessageSquare, Heart, ShieldCheck, Phone, Bell, Clock } from 'lucide-react';
import type { DoseEvent, ElderlyProfile, Appointment, CareNote, EmergencyContact } from '@elderly-care/types';

interface FamilyReassuranceViewProps {
  profile: ElderlyProfile;
  events: DoseEvent[];
  appointments: Appointment[];
  careNotes: CareNote[];
  emergencyContacts: EmergencyContact[];
}

export function FamilyReassuranceView({
  profile,
  events,
  appointments,
  careNotes,
  emergencyContacts
}: FamilyReassuranceViewProps) {
  const [encouragementSent, setEncouragementSent] = useState(false);
  const [digestTime, setDigestTime] = useState('19:00');
  const [showSettings, setShowSettings] = useState(false);

  const totalDoses = events.length;
  const takenDoses = events.filter((e) => e.status === 'taken').length;
  const nextAppointment = appointments[0];
  const primaryCaregiver = emergencyContacts[0];

  const handleSendLove = () => {
    setEncouragementSent(true);
    setTimeout(() => setEncouragementSent(false), 4000);
  };

  const todayDate = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Calm Reassurance Banner */}
      <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-emerald-200 text-xs font-bold uppercase tracking-wider">Peace of Mind Digest</span>
            <h1 className="text-3xl font-black">{profile.preferredName || profile.fullName}'s Day — {todayDate}</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Digest Preferences"
            className="w-10 h-10 rounded-full bg-emerald-700 hover:bg-emerald-600 flex items-center justify-center border border-emerald-500"
          >
            <Bell className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-emerald-900/60 p-3 rounded-2xl border border-emerald-700/60">
            <p className="text-xs text-emerald-200 font-bold uppercase">Daily Adherence</p>
            <p className="text-2xl font-black text-white mt-1">
              ✅ {takenDoses} of {totalDoses} taken
            </p>
          </div>
          <div className="bg-emerald-900/60 p-3 rounded-2xl border border-emerald-700/60">
            <p className="text-xs text-emerald-200 font-bold uppercase">Safety Status</p>
            <p className="text-xl font-bold text-emerald-300 mt-1">🟢 Calm & Stable</p>
          </div>
        </div>
      </div>

      {/* Digest Settings Drawer */}
      {showSettings && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Family Daily Digest Notification Settings</span>
          </h4>
          <p className="text-slate-600">
            Choose when you receive your peace-of-mind summary. Routine pills will not ping you during work hours.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="font-semibold text-slate-700">Preferred Digest Time:</span>
            <select
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg text-xs font-bold"
            >
              <option value="08:00">08:00 AM (Morning update)</option>
              <option value="13:00">01:00 PM (Afternoon check)</option>
              <option value="19:00">07:00 PM (Evening recap)</option>
              <option value="21:00">09:00 PM (Bedtime summary)</option>
            </select>
          </div>
        </div>
      )}

      {/* Encouragement Alert */}
      {encouragementSent && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
          <Heart className="w-5 h-5 fill-rose-600 text-rose-600" />
          <span>Encouragement message sent to {profile.preferredName || profile.fullName}!</span>
        </div>
      )}

      {/* Next Appointment Card */}
      {nextAppointment && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-sky-800 font-bold text-sm">
            <Calendar className="w-5 h-5 text-sky-600" />
            <span>UPCOMING VISIT</span>
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {nextAppointment.doctorName} • {nextAppointment.specialty}
          </h3>
          <p className="text-sm font-semibold text-slate-600">
            {new Date(nextAppointment.appointmentTime).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}{' '}
            at {nextAppointment.facilityName}
          </p>
        </div>
      )}

      {/* Recent Meaningful Updates */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-slate-900">Recent Meaningful Updates</h3>
        <div className="space-y-3">
          {events.filter((e) => e.status === 'taken').map((e) => (
            <div key={e.id} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-900">{e.scheduledTime.substring(0, 5)}</span>
              <span>— {e.medication?.name} confirmed taken ({e.resolvedByName || 'Self'})</span>
            </div>
          ))}

          {careNotes.slice(0, 3).map((note) => (
            <div key={note.id} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="w-2 h-2 rounded-full bg-sky-500 mt-1.5" />
              <div>
                <span className="font-bold text-slate-900">
                  {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-slate-600"> — Caregiver note: "{note.content}"</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Family Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleSendLove}
          className="min-h-[54px] bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm text-base"
        >
          <Heart className="w-5 h-5 fill-white" />
          <span>Send Love</span>
        </button>

        {primaryCaregiver ? (
          <a
            href={`tel:${primaryCaregiver.phoneNumber}`}
            className="min-h-[54px] bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm text-base"
          >
            <Phone className="w-5 h-5" />
            <span>Contact Caregiver</span>
          </a>
        ) : (
          <button
            onClick={() => alert('Caregiver contact not set yet')}
            className="min-h-[54px] bg-slate-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Contact Caretaker</span>
          </button>
        )}
      </div>
    </div>
  );
}
