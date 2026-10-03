/**
 * Retour haptique (vibrations) optimisé pour les interactions mobiles en classe.
 * Assure un retour tactile immédiat (yeux levés sur les élèves lors de l'appel)
 * sans nécessiter de regarder constamment l'écran du smartphone.
 */

export type HapticFeedbackType =
  | "present"
  | "absent"
  | "late"
  | "excused"
  | "success"
  | "warning"
  | "error";

const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  // Présent : impulsion brève, nette et discrète (25ms)
  present: 25,
  // Absent : double pulsation vigilante (35ms pulse, 50ms pause, 35ms pulse)
  absent: [35, 50, 35],
  // Retard : impulsion moyenne (45ms)
  late: 45,
  // Justifié : impulsion très douce (20ms)
  excused: 20,
  // Succès de sauvegarde ou synchronisation : double pulsation harmonieuse
  success: [40, 60, 50],
  // Avertissement : vibration soutenue (70ms)
  warning: 70,
  // Erreur ou conflit : triple pulsation d'alerte
  error: [80, 50, 80, 50, 80],
};

export function triggerHaptic(type: HapticFeedbackType): void {
  if (typeof window === "undefined") return;
  if (!("navigator" in window) || typeof window.navigator.vibrate !== "function") {
    return;
  }

  try {
    const pattern = HAPTIC_PATTERNS[type];
    window.navigator.vibrate(pattern);
  } catch {
    // Fallback silencieux sur les plateformes ne supportant pas ou restreignant l'API vibrate
  }
}
