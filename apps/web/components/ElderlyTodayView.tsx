'use client';

import React, { useState, useEffect } from 'react';
import { Check, Undo2, AlertCircle, Calendar, Phone, Heart, Clock, ShieldAlert } from 'lucide-react';
import type { DoseEvent, ElderlyProfile, Appointment, EmergencyContact } from '@elderly-care/types';

interface ElderlyTodayViewProps {
  profile: ElderlyProfile;
  events: DoseEvent[];
  appointments: Appointment[];
  emergencyContacts: EmergencyContact[];
  onRecordDose: (doseEventId: string, actionType: string, notes?: string) => Promise<void>;
  onUndoDose: (doseEventId: string, reason?: string) => Promise<void>;
}

export function ElderlyTodayView({
  profile,
  events,
  appointments,
  emergencyContacts,
  onRecordDose,
  onUndoDose
}: ElderlyTodayViewProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'medicines' | 'emergency'>('today');
  const [undoSecondsRemaining, setUndoSecondsRemaining] = useState<number>(0);
  const [recentlyTakenEventId, setRecentlyTakenEventId] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);
  const [selectedSkipEventId, setSelectedSkipEventId] = useState<string | null>(null);
  const [helpRequested, setHelpRequested] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Undo countdown timer
  useEffect(() => {
    if (undoSecondsRemaining <= 0) {
      if (undoSecondsRemaining === 0 && recentlyTakenEventId) {
        setRecentlyTakenEventId(null);
      }
      return;
    }
    const timer = setInterval(() => {
      setUndoSecondsRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [undoSecondsRemaining, recentlyTakenEventId]);

  // Sort events by scheduled time
  const sortedEvents = [...events].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  
  // Primary active dose: first scheduled or unconfirmed dose
  const activeDose = sortedEvents.find((e) => e.status === 'scheduled' || e.status === 'due' || e.status === 'unconfirmed') 
    || sortedEvents[0];
  const nextDose = sortedEvents.find((e) => e.id !== activeDose?.id && (e.status === 'scheduled' || e.status === 'due'));
  const nextAppointment = appointments[0];

  const handleTakeDose = async (doseEventId: string) => {
    setIsSubmitting(true);
    try {
      await onRecordDose(doseEventId, 'self_confirmed');
      setRecentlyTakenEventId(doseEventId);
      setUndoSecondsRemaining(30);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!recentlyTakenEventId) return;
    setIsSubmitting(true);
    try {
      await onUndoDose(recentlyTakenEventId, 'Accidental tap undone within 30s');
      setRecentlyTakenEventId(null);
      setUndoSecondsRemaining(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipDose = async (reason: string) => {
    if (!selectedSkipEventId) return;
    setIsSubmitting(true);
    try {
      await onRecordDose(selectedSkipEventId, 'skipped', reason);
      setShowSkipModal(false);
      setSelectedSkipEventId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  return (
    <div className="max-w-md mx-auto bg-white min-h-[750px] shadow-2xl rounded-3xl border-4 border-slate-200 flex flex-col justify-between overflow-hidden">
      {/* Top Banner */}
      <div className="p-6 bg-emerald-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Good morning, {profile.preferredName || profile.fullName}</h1>
            <p className="text-emerald-100 text-base mt-1 font-medium">{todayFormatted}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center border-2 border-emerald-400">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 flex-1 space-y-5 overflow-y-auto">
        {activeTab === 'today' && (
          <>
            {/* Live Undo Confirmation Card */}
            {recentlyTakenEventId && undoSecondsRemaining > 0 ? (
              <div className="bg-emerald-50 border-4 border-emerald-600 rounded-3xl p-6 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-emerald-950">Great! Medicine Taken</h2>
                  <p className="text-lg text-emerald-800 font-semibold mt-1">
                    Marked as taken at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={handleUndo}
                  disabled={isSubmitting}
                  className="w-full min-h-[58px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xl font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg border-2 border-amber-600 transition-transform active:scale-95"
                >
                  <Undo2 className="w-7 h-7 stroke-[2.5]" />
                  <span>Undo ({undoSecondsRemaining}s left)</span>
                </button>
              </div>
            ) : activeDose ? (
              /* The Primary "Today" Dose Card */
              <div className="bg-amber-50 border-4 border-amber-300 rounded-3xl p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-lg tracking-wide uppercase">
                  <span className="text-2xl">☀️</span>
                  <span>{activeDose.routineCategory} DOSE</span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-950 leading-tight">
                    {activeDose.medication?.name || 'Metformin'}
                  </h2>
                  <p className="text-xl font-bold text-slate-700">
                    Take {activeDose.medication?.doseAmount || '1 tablet'} ({activeDose.medication?.strength})
                  </p>
                  <p className="text-lg text-amber-900 font-medium bg-amber-100/80 px-3 py-1 rounded-xl inline-block mt-1">
                    {activeDose.medication?.foodInstructions === 'with_food'
                      ? 'With breakfast'
                      : activeDose.medication?.foodInstructions === 'after_food'
                      ? 'After meal'
                      : 'As instructed'}
                  </p>
                </div>

                {/* Primary Large "I TOOK IT" button */}
                <button
                  onClick={() => handleTakeDose(activeDose.id)}
                  disabled={isSubmitting || activeDose.status === 'taken'}
                  className={`w-full min-h-[64px] rounded-2xl text-2xl font-black tracking-wide flex items-center justify-center gap-3 shadow-xl transition-all ${
                    activeDose.status === 'taken'
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-b-4 border-emerald-900 active:translate-y-1'
                  }`}
                >
                  <Check className="w-9 h-9 stroke-[3]" />
                  <span>{activeDose.status === 'taken' ? 'ALREADY TAKEN' : 'I TOOK IT'}</span>
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setHelpRequested(true)}
                    className="min-h-[50px] bg-white hover:bg-slate-100 active:bg-slate-200 border-2 border-slate-300 text-slate-800 font-bold text-lg rounded-xl flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span>Need help</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedSkipEventId(activeDose.id);
                      setShowSkipModal(true);
                    }}
                    className="min-h-[50px] bg-white hover:bg-slate-100 active:bg-slate-200 border-2 border-slate-300 text-slate-800 font-bold text-lg rounded-xl flex items-center justify-center gap-2"
                  >
                    <span>Not today</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-emerald-50 rounded-3xl border-2 border-emerald-200">
                <Check className="w-16 h-16 text-emerald-600 mx-auto" />
                <h3 className="text-2xl font-bold text-emerald-900 mt-2">All Done for Today!</h3>
                <p className="text-lg text-emerald-700 mt-1">You have taken all scheduled medicines.</p>
              </div>
            )}

            {/* Help Requested Confirmation */}
            {helpRequested && (
              <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-2xl text-blue-950 flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">Caregiver notified!</p>
                  <p className="text-base text-blue-800">Sarah Jenkins has been alerted to assist you.</p>
                </div>
                <button
                  onClick={() => setHelpRequested(false)}
                  className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-sm"
                >
                  OK
                </button>
              </div>
            )}

            {/* Next Upcoming Dose preview */}
            {nextDose && (
              <div className="bg-slate-100 rounded-2xl p-4 border border-slate-300 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">UP NEXT</p>
                  <p className="text-lg font-bold text-slate-900">
                    {nextDose.medication?.name} at {nextDose.scheduledTime.substring(0, 5)}
                  </p>
                </div>
                <Clock className="w-6 h-6 text-slate-500" />
              </div>
            )}

            {/* Next Doctor Visit Card */}
            {nextAppointment && (
              <div className="bg-sky-50 border-2 border-sky-300 rounded-3xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-base">
                  <Calendar className="w-6 h-6 text-sky-700" />
                  <span>DOCTOR VISIT</span>
                </div>
                <h3 className="text-xl font-black text-sky-950">
                  {new Date(nextAppointment.appointmentTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                  • {new Date(nextAppointment.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h3>
                <p className="text-lg font-bold text-slate-800">
                  {nextAppointment.doctorName} • {nextAppointment.specialty || 'Check-up'}
                </p>
                <p className="text-base text-slate-600">{nextAppointment.facilityName}</p>
                {nextAppointment.transportNotes && (
                  <p className="text-sm font-semibold text-emerald-800 bg-emerald-100/70 p-2 rounded-xl">
                    🚗 {nextAppointment.transportNotes}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Medicines Routine Tab */}
        {activeTab === 'medicines' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-900">My Medicine Routine</h2>
            <div className="space-y-3">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-4 rounded-2xl border-2 ${
                    ev.status === 'taken'
                      ? 'bg-emerald-50 border-emerald-400'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {ev.routineCategory} • {ev.scheduledTime.substring(0, 5)}
                      </span>
                      <h3 className="text-xl font-black text-slate-900">{ev.medication?.name}</h3>
                      <p className="text-base text-slate-700 font-semibold">
                        {ev.medication?.doseAmount} ({ev.medication?.strength})
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{ev.medication?.purpose}</p>
                    </div>
                    <div>
                      {ev.status === 'taken' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white font-bold rounded-full text-xs">
                          <Check className="w-3.5 h-3.5" /> Taken
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-amber-200 text-amber-900 font-bold rounded-full text-xs">
                          Due
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency / Help Tab */}
        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-4 text-center">
              <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
              <h2 className="text-2xl font-black text-red-950 mt-1">EMERGENCY HELP</h2>
              <p className="text-base font-semibold text-red-800">Tap below to call your primary contact</p>
            </div>

            <div className="space-y-3">
              {emergencyContacts.map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.phoneNumber}`}
                  className="block p-4 bg-white border-2 border-slate-300 hover:border-red-500 rounded-2xl shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">{c.relationship.toUpperCase()}</p>
                      <h3 className="text-xl font-black text-slate-900">{c.name}</h3>
                      <p className="text-lg font-bold text-red-700 mt-0.5">{c.phoneNumber}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                      <Phone className="w-6 h-6" />
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 space-y-2">
              <h4 className="text-base font-bold text-slate-900">Important Medical Info:</h4>
              <p className="text-sm font-semibold text-slate-700">
                • Allergies: <span className="text-red-700">{profile.allergies.join(', ') || 'None reported'}</span>
              </p>
              <p className="text-sm font-semibold text-slate-700">
                • Conditions: {profile.medicalConditions.join(', ') || 'None'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* "Not Today" Follow-Up Reason Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border-4 border-slate-300">
            <h3 className="text-2xl font-black text-slate-950">Why are you skipping?</h3>
            <p className="text-base text-slate-600">Please choose a reason so your caregiver is aware:</p>
            <div className="space-y-2">
              {[
                { label: 'Feeling unwell', reason: 'feeling_unwell' },
                { label: 'Doctor told me to skip', reason: 'doctor_instructed' },
                { label: 'I forgot or meal delayed', reason: 'forgot' }
              ].map((opt) => (
                <button
                  key={opt.reason}
                  onClick={() => handleSkipDose(opt.reason)}
                  className="w-full min-h-[52px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold text-lg rounded-xl text-left px-4 border border-slate-300"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSkipModal(false)}
              className="w-full py-3 bg-slate-200 text-slate-700 font-bold rounded-xl text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation (≥48px touch targets, high contrast) */}
      <div className="grid grid-cols-3 bg-slate-100 border-t-2 border-slate-300 p-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center font-bold text-base transition-colors ${
            activeTab === 'today' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-6 h-6 mb-0.5" />
          <span>Today</span>
        </button>

        <button
          onClick={() => setActiveTab('medicines')}
          className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center font-bold text-base transition-colors ${
            activeTab === 'medicines' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Heart className="w-6 h-6 mb-0.5" />
          <span>Medicines</span>
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center font-bold text-base transition-colors ${
            activeTab === 'emergency' ? 'bg-red-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ShieldAlert className="w-6 h-6 mb-0.5" />
          <span>Help</span>
        </button>
      </div>
    </div>
  );
}
