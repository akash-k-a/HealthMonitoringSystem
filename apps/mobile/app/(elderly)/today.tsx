import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { platformDataStore } from '@elderly-care/shared';
import type { DoseEvent, ElderlyProfile, Appointment } from '@elderly-care/types';

export default function MobileTodayScreen() {
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [events, setEvents] = useState<DoseEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [undoSeconds, setUndoSeconds] = useState<number>(0);
  const [recentlyTakenId, setRecentlyTakenId] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);
  const [helpNotified, setHelpNotified] = useState<boolean>(false);

  const loadData = () => {
    const prof = Array.from(platformDataStore.elderlyProfiles.values())[0];
    if (prof) {
      setProfile(prof);
      const todayStr = new Date().toISOString().split('T')[0];
      const evs = Array.from(platformDataStore.doseEvents.values()).filter(
        (e) => e.elderlyProfileId === prof.id && e.scheduledDate === todayStr
      );
      setEvents(evs);
      const apts = Array.from(platformDataStore.appointments.values()).filter(
        (a) => a.elderlyProfileId === prof.id
      );
      setAppointments(apts);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = platformDataStore.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (undoSeconds <= 0) {
      if (undoSeconds === 0 && recentlyTakenId) {
        setRecentlyTakenId(null);
      }
      return;
    }
    const timer = setInterval(() => {
      setUndoSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [undoSeconds, recentlyTakenId]);

  const activeDose = events.find(
    (e) => e.status === 'scheduled' || e.status === 'due' || e.status === 'unconfirmed'
  ) || events[0];

  const nextDose = events.find(
    (e) => e.id !== activeDose?.id && (e.status === 'scheduled' || e.status === 'due')
  );

  const nextAppointment = appointments[0];

  const handleTakeDose = (id: string) => {
    platformDataStore.recordDoseAction(
      id,
      'usr-margaret',
      'Margaret Sharma',
      'self_confirmed'
    );
    setRecentlyTakenId(id);
    setUndoSeconds(30);
    loadData();
  };

  const handleUndo = () => {
    if (!recentlyTakenId) return;
    platformDataStore.undoDoseAction(
      recentlyTakenId,
      'usr-margaret',
      'Margaret Sharma',
      'Accidental tap undone within 30s'
    );
    setRecentlyTakenId(null);
    setUndoSeconds(0);
    loadData();
  };

  const handleSkip = (reason: string) => {
    if (!activeDose) return;
    platformDataStore.recordDoseAction(
      activeDose.id,
      'usr-margaret',
      'Margaret Sharma',
      'skipped',
      reason
    );
    setShowSkipModal(false);
    loadData();
  };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning, {profile?.preferredName || 'Margaret'}</Text>
        <Text style={styles.dateText}>{todayFormatted}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Undo Card */}
        {recentlyTakenId && undoSeconds > 0 ? (
          <View style={styles.undoCard}>
            <Text style={styles.undoTitle}>✅ Great! Medicine Taken</Text>
            <Text style={styles.undoSub}>Marked as taken at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
              <Text style={styles.undoButtonText}>UNDO ({undoSeconds}s left)</Text>
            </TouchableOpacity>
          </View>
        ) : activeDose ? (
          /* Primary Today Dose Card */
          <View style={styles.doseCard}>
            <Text style={styles.routineTag}>☀️ {activeDose.routineCategory.toUpperCase()} DOSE</Text>
            <Text style={styles.medName}>{activeDose.medication?.name || 'Metformin'}</Text>
            <Text style={styles.doseAmount}>
              Take {activeDose.medication?.doseAmount} ({activeDose.medication?.strength})
            </Text>
            <Text style={styles.foodText}>
              {activeDose.medication?.foodInstructions === 'with_food'
                ? 'With breakfast'
                : activeDose.medication?.foodInstructions === 'after_food'
                ? 'After meal'
                : 'As instructed'}
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                activeDose.status === 'taken' && styles.disabledActionButton
              ]}
              disabled={activeDose.status === 'taken'}
              onPress={() => handleTakeDose(activeDose.id)}
            >
              <Text style={styles.primaryActionButtonText}>
                {activeDose.status === 'taken' ? 'ALREADY TAKEN' : 'I TOOK IT'}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setHelpNotified(true)}
              >
                <Text style={styles.secondaryButtonText}>Need help</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowSkipModal(true)}
              >
                <Text style={styles.secondaryButtonText}>Not today</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.allDoneCard}>
            <Text style={styles.allDoneTitle}>All Done for Today!</Text>
            <Text style={styles.allDoneSub}>You have taken all scheduled medicines.</Text>
          </View>
        )}

        {helpNotified && (
          <View style={styles.helpAlert}>
            <Text style={styles.helpAlertText}>Caregiver Sarah has been notified to assist you.</Text>
          </View>
        )}

        {nextDose && (
          <View style={styles.nextDosePreview}>
            <Text style={styles.nextLabel}>UP NEXT</Text>
            <Text style={styles.nextText}>
              {nextDose.medication?.name} at {nextDose.scheduledTime.substring(0, 5)}
            </Text>
          </View>
        )}

        {nextAppointment && (
          <View style={styles.appointmentCard}>
            <Text style={styles.aptHeader}>📅 DOCTOR VISIT</Text>
            <Text style={styles.aptTitle}>
              {new Date(nextAppointment.appointmentTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
              • {new Date(nextAppointment.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.aptDoctor}>
              {nextAppointment.doctorName} • {nextAppointment.specialty}
            </Text>
            <Text style={styles.aptFacility}>{nextAppointment.facilityName}</Text>
          </View>
        )}
      </ScrollView>

      {/* Skip Follow-up Modal */}
      <Modal visible={showSkipModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Why are you skipping?</Text>
            {['Feeling unwell', 'Doctor told me to skip', 'I forgot'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.modalOption}
                onPress={() => handleSkip(opt.toLowerCase().replace(/ /g, '_'))}
              >
                <Text style={styles.modalOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowSkipModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#047857',
    padding: 20
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  dateText: {
    fontSize: 16,
    color: '#A7F3D0',
    marginTop: 4,
    fontWeight: '600'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  doseCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 24,
    padding: 24,
    borderWidth: 3,
    borderColor: '#FCD34D',
    marginBottom: 16
  },
  routineTag: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8
  },
  medName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  doseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6
  },
  foodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#78350F',
    backgroundColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20
  },
  primaryActionButton: {
    backgroundColor: '#059669',
    minHeight: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#064E3B',
    marginBottom: 12
  },
  disabledActionButton: {
    backgroundColor: '#94A3B8',
    borderBottomColor: '#64748B'
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1'
  },
  secondaryButtonText: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: 'bold'
  },
  undoCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 24,
    borderWidth: 3,
    borderColor: '#059669',
    alignItems: 'center',
    marginBottom: 16
  },
  undoTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#064E3B'
  },
  undoSub: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginTop: 6,
    marginBottom: 16
  },
  undoButton: {
    backgroundColor: '#F59E0B',
    minHeight: 56,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D97706'
  },
  undoButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  allDoneCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    marginBottom: 16
  },
  allDoneTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46'
  },
  allDoneSub: {
    fontSize: 16,
    color: '#047857',
    marginTop: 4
  },
  helpAlert: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#93C5FD',
    marginBottom: 16
  },
  helpAlertText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF'
  },
  nextDosePreview: {
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B'
  },
  nextText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2
  },
  appointmentCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#BAE6FD'
  },
  aptHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0369A1'
  },
  aptTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0C4A6E',
    marginTop: 4
  },
  aptDoctor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 2
  },
  aptFacility: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16
  },
  modalOption: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  modalOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  modalCancel: {
    padding: 14,
    alignItems: 'center'
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B'
  }
});
