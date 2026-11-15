import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { platformDataStore } from '@elderly-care/shared';
import type { DoseEvent, ElderlyProfile } from '@elderly-care/types';

export default function MobileMedicinesScreen() {
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [events, setEvents] = useState<DoseEvent[]>([]);

  const loadData = () => {
    const prof = Array.from(platformDataStore.elderlyProfiles.values())[0];
    if (prof) {
      setProfile(prof);
      const todayStr = new Date().toISOString().split('T')[0];
      const evs = Array.from(platformDataStore.doseEvents.values()).filter(
        (e) => e.elderlyProfileId === prof.id && e.scheduledDate === todayStr
      );
      setEvents(evs);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = platformDataStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MY MEDICINES</Text>
        <Text style={styles.headerSub}>Today's Routine</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {events.map((ev) => (
          <View key={ev.id} style={styles.medCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.routineTime}>
                {ev.routineCategory.toUpperCase()} • {ev.scheduledTime.substring(0, 5)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  ev.status === 'taken' ? styles.takenBadge : styles.dueBadge
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    ev.status === 'taken' ? styles.takenText : styles.dueText
                  ]}
                >
                  {ev.status === 'taken' ? '✓ Taken' : 'Due'}
                </Text>
              </View>
            </View>

            <Text style={styles.medName}>💊 {ev.medication?.name}</Text>
            <Text style={styles.dosageText}>
              {ev.medication?.doseAmount} ({ev.medication?.strength})
            </Text>

            {ev.medication?.purpose && (
              <Text style={styles.purposeText}>For: {ev.medication.purpose}</Text>
            )}

            {ev.medication?.instructions && (
              <Text style={styles.instructionsText}>
                Instructions: {ev.medication.instructions}
              </Text>
            )}

            {ev.status === 'taken' && ev.resolvedByName && (
              <Text style={styles.auditInfo}>
                Confirmed by: {ev.resolvedByName}
              </Text>
            )}
          </View>
        ))}
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
    backgroundColor: '#047857',
    padding: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  headerSub: {
    fontSize: 16,
    color: '#A7F3D0',
    marginTop: 2
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  medCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  routineTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  takenBadge: {
    backgroundColor: '#D1FAE5'
  },
  dueBadge: {
    backgroundColor: '#FEF3C7'
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  takenText: {
    color: '#065F46'
  },
  dueText: {
    color: '#92400E'
  },
  medName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  dosageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4
  },
  purposeText: {
    fontSize: 16,
    color: '#047857',
    fontWeight: '600',
    marginBottom: 4
  },
  instructionsText: {
    fontSize: 15,
    color: '#64748B'
  },
  auditInfo: {
    fontSize: 13,
    color: '#059669',
    marginTop: 8,
    fontStyle: 'italic'
  }
});
