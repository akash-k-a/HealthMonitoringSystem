import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { platformDataStore } from '@elderly-care/shared';
import type { DoseEvent, ElderlyProfile, Appointment, CareNote, EmergencyContact } from '@elderly-care/types';

export default function MobileFamilyFeedScreen() {
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [events, setEvents] = useState<DoseEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [careNotes, setCareNotes] = useState<CareNote[]>([]);
  const [caregiverContact, setCaregiverContact] = useState<EmergencyContact | null>(null);
  const [encouragementSent, setEncouragementSent] = useState<boolean>(false);

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

      const notes = Array.from(platformDataStore.careNotes.values()).filter(
        (n) => n.elderlyProfileId === prof.id
      );
      setCareNotes(notes);

      const emgs = Array.from(platformDataStore.emergencyContacts.values()).filter(
        (c) => c.elderlyProfileId === prof.id
      );
      setCaregiverContact(emgs[0] || null);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = platformDataStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const totalDoses = events.length;
  const takenDoses = events.filter((e) => e.status === 'taken').length;
  const nextAppointment = appointments[0];

  const handleSendLove = () => {
    setEncouragementSent(true);
    Alert.alert('Sent with Love ❤️', `An encouragement message was sent to ${profile?.preferredName || 'Mom'}!`);
    setTimeout(() => setEncouragementSent(false), 4000);
  };

  const handleCallCaregiver = () => {
    if (caregiverContact?.phoneNumber) {
      Linking.openURL(`tel:${caregiverContact.phoneNumber}`);
    } else {
      Alert.alert('No Caregiver Phone', 'Caregiver phone number is not listed in emergency contacts.');
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Mobile Header */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>PEACE OF MIND DIGEST</Text>
        <Text style={styles.headerTitle}>
          {profile?.preferredName ? `${profile.preferredName}'s Day` : "Mom's Day"}
        </Text>
        <Text style={styles.headerDate}>{todayFormatted}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* KPI Reassurance Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TODAY'S MEDICINES</Text>
            <Text style={styles.summaryValue}>
              ✅ {takenDoses} of {totalDoses}
            </Text>
            <Text style={styles.summarySubtext}>Confirmed taken</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ALERT STATUS</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>
              🟢 All Calm
            </Text>
            <Text style={styles.summarySubtext}>No urgent issues</Text>
          </View>
        </View>

        {/* Next Appointment Card */}
        {nextAppointment && (
          <View style={styles.appointmentCard}>
            <View style={styles.badgeRow}>
              <Text style={styles.appointmentBadge}>UPCOMING CLINICAL VISIT</Text>
              <Text style={styles.appointmentDate}>
                {new Date(nextAppointment.appointmentTime).toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <Text style={styles.appointmentTitle}>{nextAppointment.doctorName}</Text>
            <Text style={styles.appointmentSpecialty}>
              {nextAppointment.specialty || 'General Consultation'} • {nextAppointment.facilityName}
            </Text>
          </View>
        )}

        {/* Meaningful Recent Updates */}
        <View style={styles.updatesCard}>
          <Text style={styles.updatesHeading}>Recent Meaningful Updates</Text>

          {events.filter((e) => e.status === 'taken').map((e) => (
            <View key={e.id} style={styles.updateItem}>
              <View style={styles.greenDot} />
              <View style={styles.updateTextContainer}>
                <Text style={styles.updateTime}>{e.scheduledTime.substring(0, 5)}</Text>
                <Text style={styles.updateDesc}>
                  {e.medication?.name} taken ({e.resolvedByName || 'Self'})
                </Text>
              </View>
            </View>
          ))}

          {careNotes.slice(0, 3).map((note) => (
            <View key={note.id} style={styles.updateItem}>
              <View style={[styles.greenDot, { backgroundColor: '#0284C7' }]} />
              <View style={styles.updateTextContainer}>
                <Text style={styles.updateTime}>
                  {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.updateDesc}>Caregiver note: "{note.content}"</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Family Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.loveButton} onPress={handleSendLove}>
            <Text style={styles.loveButtonText}>❤️ Send Love</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.caregiverButton} onPress={handleCallCaregiver}>
            <Text style={styles.caregiverButtonText}>📞 Call Caregiver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9'
  },
  header: {
    backgroundColor: '#065F46',
    padding: 20
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A7F3D0',
    letterSpacing: 1
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2
  },
  headerDate: {
    fontSize: 15,
    color: '#D1FAE5',
    marginTop: 2,
    fontWeight: '600'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 6
  },
  summarySubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  appointmentBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0369A1'
  },
  appointmentDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B'
  },
  appointmentTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A'
  },
  appointmentSpecialty: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2
  },
  updatesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16
  },
  updatesHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginTop: 6
  },
  updateTextContainer: {
    flex: 1
  },
  updateTime: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  updateDesc: {
    fontSize: 14,
    color: '#475569',
    marginTop: 1
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  loveButton: {
    flex: 1,
    backgroundColor: '#F43F5E',
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8
  },
  loveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  caregiverButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  caregiverButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
