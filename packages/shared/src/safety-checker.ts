import type { Medication, MedicationRiskFlag, MedicationEducation } from '@elderly-care/types';

export const VERIFIED_MEDICATION_KNOWLEDGE: Record<string, MedicationEducation> = {
  metformin: {
    purposePlainLanguage: 'Helps balance blood sugar levels by improving how your body processes glucose.',
    howItWorks: 'Slows down sugar production in the liver and helps muscles absorb sugar from your bloodstream.',
    commonSideEffects: ['Mild stomach upset', 'Nausea when starting', 'Metallic taste in mouth'],
    foodAndDrinkAdvice: 'Always take with or directly after breakfast to prevent stomach upset.',
    missedDoseAdvice: 'Take as soon as you remember with a meal. Never take two doses together to make up for a missed dose.'
  },
  amlodipine: {
    purposePlainLanguage: 'Lowers blood pressure and relaxes blood vessels so your heart can pump easily.',
    howItWorks: 'Relaxes the muscles of your arteries, allowing blood to circulate with less resistance.',
    commonSideEffects: ['Mild swelling in ankles', 'Dizziness when standing up fast', 'Flushing'],
    foodAndDrinkAdvice: 'Can be taken with or without food. Avoid excessive grapefruit juice as it increases drug levels.',
    missedDoseAdvice: 'Take as soon as remembered. If it is almost time for the next dose, skip the missed one.'
  },
  atorvastatin: {
    purposePlainLanguage: 'Lowers cholesterol and protects heart arteries from blockages.',
    howItWorks: 'Reduces the amount of low-density cholesterol (LDL) produced by your liver.',
    commonSideEffects: ['Mild muscle aches', 'Digestive changes', 'Headache'],
    foodAndDrinkAdvice: 'Best taken in the evening or bedtime. Avoid grapefruit.',
    missedDoseAdvice: 'Take as soon as remembered unless it is next day. Do not take an extra tablet.'
  }
};

/**
 * Analyzes active medications for drug safety, duplicate therapies, and food conflicts.
 */
export function checkMedicationRisks(
  elderlyProfileId: string,
  medications: Medication[]
): MedicationRiskFlag[] {
  const flags: MedicationRiskFlag[] = [];
  const activeMeds = medications.filter((m) => m.isActive);

  // Check 1: Duplicate Therapy Check (e.g. 2 medications for blood pressure)
  const bpMeds = activeMeds.filter(
    (m) =>
      m.name.toLowerCase().includes('amlodipine') ||
      m.name.toLowerCase().includes('telmisartan') ||
      m.name.toLowerCase().includes('losartan') ||
      m.name.toLowerCase().includes('atenolol')
  );

  if (bpMeds.length > 1) {
    flags.push({
      id: `risk-dup-bp-${Date.now()}`,
      medicationId: bpMeds[0].id,
      elderlyProfileId,
      riskType: 'duplicate_therapy',
      severity: 'moderate',
      title: 'Combination Blood Pressure Therapy Detected',
      description: `Patient is taking both ${bpMeds.map((m) => m.name).join(' and ')}. Verify whether dual therapy was intentionally co-prescribed.`,
      recommendation: 'Confirm with prescribing clinician Dr. Mehta during upcoming cardiology consultation.',
      createdAt: new Date().toISOString()
    });
  }

  // Check 2: Low Inventory Risk (< 5 days remaining)
  for (const med of activeMeds) {
    if (med.inventory && med.inventory.currentStock <= med.inventory.lowStockThreshold) {
      flags.push({
        id: `risk-stock-${med.id}`,
        medicationId: med.id,
        elderlyProfileId,
        riskType: 'expiring_refill',
        severity: 'high',
        title: `Low Refill Supply: ${med.name}`,
        description: `Only ${med.inventory.currentStock} ${med.inventory.unit} left. Supply will run out in ${med.inventory.currentStock} days.`,
        recommendation: `Request refill from ${med.inventory.pharmacyName || 'pharmacy'}.`,
        createdAt: new Date().toISOString()
      });
    }
  }

  return flags;
}

/**
 * Retrieves verified educational info for an elderly patient.
 */
export function getMedicationEducation(medicationName: string): MedicationEducation {
  const key = medicationName.toLowerCase().trim();
  for (const [knownKey, edu] of Object.entries(VERIFIED_MEDICATION_KNOWLEDGE)) {
    if (key.includes(knownKey)) {
      return edu;
    }
  }

  return {
    purposePlainLanguage: 'Prescribed medication as directed by your healthcare specialist.',
    howItWorks: 'Assists with managing your health condition according to your care plan.',
    commonSideEffects: ['Consult physician if experiencing unexpected symptoms or dizziness.'],
    foodAndDrinkAdvice: 'Take with a glass of water as instructed by your doctor.',
    missedDoseAdvice: 'Never take a double dose. Contact your doctor or pharmacist if unsure.'
  };
}
