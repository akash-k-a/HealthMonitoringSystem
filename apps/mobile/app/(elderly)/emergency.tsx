import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { platformDataStore } from '@elderly-care/shared';
import type { ElderlyProfile, EmergencyContact } from '@elderly-care/types';

export default function MobileEmergencyScreen() {
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    const prof = Array.from(platformDataStore.elderlyProfiles.values())[0];
    if (prof) {
      setProfile(prof);
      const emgs = Array.from(platformDataStore.emergencyContacts.values()).filter(
        (c) => c.elderlyProfileId === prof.id
      );
      setContacts(emgs);
    }
  }, []);

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EMERGENCY HELP</Text>
        <Text style={styles.headerSub}>One-tap assistance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            Tap below to immediately call your primary family contact or caregiver:
          </Text>
        </View>

        {contacts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.contactCard}
            onPress={() => handleCall(c.phoneNumber)}
          >
            <View>
              <Text style={styles.contactRelation}>{c.relationship.toUpperCase()}</Text>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactPhone}>{c.phoneNumber}</Text>
            </View>
            <View style={styles.callBadge}>
              <Text style={styles.callBadgeText}>CALL</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>Important Medical Details</Text>
          <Text style={styles.infoRow}>
            • Allergies:{' '}
            <Text style={styles.highlightText}>
              {profile?.allergies.join(', ') || 'None listed'}
            </Text>
          </Text>
          <Text style={styles.infoRow}>
            • Conditions: {profile?.medicalConditions.join(', ') || 'None listed'}
          </Text>
          <Text style={styles.infoRow}>
            • Blood Group: {profile?.bloodGroup || 'O+'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#DC2626',
    padding: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  headerSub: {
    fontSize: 16,
    color: '#FECACA',
    marginTop: 2
  },
  scrollContent: {
    padding: 16
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#F87171',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16
  },
  alertText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991B1B'
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  contactRelation: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B'
  },
  contactName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2
  },
  contactPhone: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 4
  },
  callBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14
  },
  callBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  infoCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    padding: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  infoHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8
  },
  infoRow: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6
  },
  highlightText: {
    color: '#DC2626',
    fontWeight: 'bold'
  }
});
