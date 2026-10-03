/**
 * MOTEUR PÉDAGOGIQUE CENTRALISÉ — SUKULU Phase 4
 * ===============================================
 * Source unique de vérité pour tous les calculs scolaires.
 * Fonctions PURES (aucune I/O) : testées unitairement dans
 * `grading-engine.test.ts`. Aucune vue, aucun composant ne doit
 * réimplémenter ces formules (Règle : zéro divergence de calcul).
 *
 * Formules du cahier des charges :
 *   MID (moyenne de contrôle continu) = moyenne des notes CC
 *   Moyenne matière  = (MID + Composition) / 2  — ou MID si pas de composition
 *   Points matière   = Moyenne × Coefficient
 *   Moyenne générale = Σ Points / Σ Coefficients
 *   Rangs            = RANK() SQL : 1er, 2e, 2e, 4e (ex æquo partagent le rang)
 */

/** Note de réussite sur 20 (standard francophone). */
export const PASS_MARK = 10;

/** Nombre de décimales conservées pour l'affichage des moyennes. */
export const SCORE_DECIMALS = 2;

/** Arrondi standard à 2 décimales (0.005 → supérieur). */
export function round2(value: number): number {
  const factor = 10 ** SCORE_DECIMALS;
  // Epsilon évite le piège des flottants (ex: 1.005 * 100 = 100.4999…)
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Moyenne arithmétique d'une liste de notes ; null si vide. */
export function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (valid.length === 0) return null;
  return round2(valid.reduce((sum, v) => sum + v, 0) / valid.length);
}

/**
 * MID — moyenne de contrôle continu : moyenne de TOUTES les évaluations
 * de type « cc » d'une matière sur une période.
 */
export function midTermAverage(ccScores: Array<number | null | undefined>): number | null {
  return average(ccScores);
}

/**
 * Moyenne finale d'une matière pour une période :
 *   (MID + Composition) / 2 si une composition existe,
 *   sinon MID uniquement.
 */
export function subjectAverage(params: {
  ccScores: Array<number | null | undefined>;
  compositionScore?: number | null;
}): number | null {
  const mid = midTermAverage(params.ccScores);
  const composition =
    typeof params.compositionScore === "number" && Number.isFinite(params.compositionScore)
      ? params.compositionScore
      : null;

  if (mid === null && composition === null) return null;
  if (mid === null) return round2(composition as number);
  if (composition === null) return round2(mid);
  return round2((mid + composition) / 2);
}

/** Points d'une matière : Moyenne × Coefficient (null si pas de moyenne). */
export function subjectPoints(averageScore: number | null, coefficient: number): number | null {
  if (averageScore === null) return null;
  return round2(averageScore * coefficient);
}

export interface SubjectResult {
  /** Moyenne sur 20 de la matière (null = non évaluée) */
  average: number | null;
  /** Coefficient de la matière dans la classe */
  coefficient: number;
}

/**
 * Moyenne générale de l'élève :
 *   Σ (Moyenne_matière × Coefficient) / Σ Coefficient
 * Les matières non évaluées sont ignorées (non comptées au dénominateur).
 */
export function overallAverage(subjects: SubjectResult[]): number | null {
  let points = 0;
  let totalCoeff = 0;

  for (const subject of subjects) {
    if (subject.average === null) continue;
    const coeff = Number(subject.coefficient);
    if (!Number.isFinite(coeff) || coeff <= 0) continue;
    points += subject.average * coeff;
    totalCoeff += coeff;
  }

  if (totalCoeff === 0) return null;
  return round2(points / totalCoeff);
}

export interface RankedStudent {
  studentId: string;
  average: number | null;
  /** Rang calculé (1, 2, 2, 4…) — remplacé par computeRanks */
  rank?: number;
}

/**
 * Calcul des rangs — équivalent strict de RANK() PostgreSQL :
 * les ex æquo partagent un rang, le rang suivant est sauté
 * (1er, 2e, 2e, 4e). Les élèves sans moyenne ne sont PAS classés
 * (rank undefined) et n'affectent pas la suite.
 */
export function computeRanks<T extends { average: number | null }>(
  students: Array<T & { studentId: string }>
): Array<T & { studentId: string; rank?: number }> {
  const sorted = students
    .filter((s) => s.average !== null)
    .sort((a, b) => (b.average as number) - (a.average as number));

  const rankById = new Map<string, number>();
  let previousAverage: number | null = null;
  let previousRank = 0;

  sorted.forEach((student, index) => {
    const avg = student.average as number;
    // Ex æquo : même rang que le précédent ; sinon rang positionnel (saut inclus)
    const rank = previousAverage !== null && avg === previousAverage
      ? previousRank
      : index + 1;
    rankById.set(student.studentId, rank);
    previousAverage = avg;
    previousRank = rank;
  });

  // Réinjecter en conservant l'ordre d'entrée ; sans moyenne → non classé
  return students.map((s) => ({
    ...s,
    ...(s.average !== null ? { rank: rankById.get(s.studentId) } : {}),
  }));
}

export interface ClassStats {
  /** Effectif total des élèves évalués */
  evaluatedCount: number;
  /** Moyenne de la classe (null si personne n'est évalué) */
  classAverage: number | null;
  /** Plus forte moyenne */
  highest: number | null;
  /** Plus faible moyenne */
  lowest: number | null;
  /** Taux de réussite (%) — moyennes ≥ 10/20, arrondi à 1 décimale */
  successRate: number | null;
}

/** Statistiques de classe à partir des moyennes générales des élèves. */
export function classStats(averages: Array<number | null>): ClassStats {
  const valid = averages.filter(
    (a): a is number => typeof a === "number" && Number.isFinite(a)
  );

  if (valid.length === 0) {
    return {
      evaluatedCount: 0,
      classAverage: null,
      highest: null,
      lowest: null,
      successRate: null,
    };
  }

  const classAverage = round2(valid.reduce((sum, a) => sum + a, 0) / valid.length);
  const successes = valid.filter((a) => a >= PASS_MARK).length;

  return {
    evaluatedCount: valid.length,
    classAverage,
    highest: round2(Math.max(...valid)),
    lowest: round2(Math.min(...valid)),
    successRate: round2((successes / valid.length) * 100),
  };
}

/** Mention qualitative à partir d'une moyenne (bulletins & appréciations). */
export function mentionFor(averageScore: number | null): string {
  if (averageScore === null) return "Non évalué";
  if (averageScore >= 16) return "Excellent";
  if (averageScore >= 14) return "Très bien";
  if (averageScore >= 12) return "Bien";
  if (averageScore >= 10) return "Assez bien";
  if (averageScore >= 8) return "Insuffisant";
  return "Très insuffisant";
}
