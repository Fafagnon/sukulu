import { describe, it, expect } from "vitest";
import {
  round2,
  midTermAverage,
  subjectAverage,
  subjectPoints,
  overallAverage,
  computeRanks,
  classStats,
  mentionFor,
  PASS_MARK,
} from "./grading-engine";

describe("round2", () => {
  it("arrondit à 2 décimales", () => {
    expect(round2(12.345)).toBe(12.35);
    expect(round2(12.344)).toBe(12.34);
    expect(round2(10)).toBe(10);
    expect(round2(1.005)).toBe(1.01); // piège flottant
  });
});

describe("midTermAverage (MID)", () => {
  it("moyenne simple des notes CC", () => {
    expect(midTermAverage([12, 14, 16])).toBe(14);
    expect(midTermAverage([8.5, 9.5])).toBe(9);
  });

  it("ignore les valeurs nulles / invalides", () => {
    expect(midTermAverage([10, null, 15, undefined])).toBe(12.5);
  });

  it("retourne null sans aucune note", () => {
    expect(midTermAverage([])).toBeNull();
    expect(midTermAverage([null])).toBeNull();
  });
});

describe("subjectAverage", () => {
  it("(MID + Composition) / 2 quand une composition existe", () => {
    // MID = (10 + 14) / 2 = 12 ; (12 + 16) / 2 = 14
    expect(subjectAverage({ ccScores: [10, 14], compositionScore: 16 })).toBe(14);
  });

  it("MID seul quand il n'y a pas de composition", () => {
    expect(subjectAverage({ ccScores: [12, 16] })).toBe(14);
  });

  it("composition seule si aucun CC saisi", () => {
    expect(subjectAverage({ ccScores: [], compositionScore: 8 })).toBe(8);
  });

  it("null si rien n'est saisi", () => {
    expect(subjectAverage({ ccScores: [] })).toBeNull();
  });
});

describe("subjectPoints", () => {
  it("Moyenne × Coefficient", () => {
    expect(subjectPoints(15, 4)).toBe(60);
    expect(subjectPoints(12.5, 3)).toBe(37.5);
  });

  it("null si pas de moyenne", () => {
    expect(subjectPoints(null, 4)).toBeNull();
  });
});

describe("overallAverage (moyenne générale)", () => {
  it("Σ Points / Σ Coefficients", () => {
    // Maths 15×4 = 60 ; Français 12×3 = 36 ; Anglais 10×2 = 20
    // Total 116 / 9 coefficients = 12.89
    expect(
      overallAverage([
        { average: 15, coefficient: 4 },
        { average: 12, coefficient: 3 },
        { average: 10, coefficient: 2 },
      ])
    ).toBe(12.89);
  });

  it("ignore les matières non évaluées", () => {
    expect(
      overallAverage([
        { average: 15, coefficient: 4 },
        { average: null, coefficient: 5 },
      ])
    ).toBe(15);
  });

  it("null si aucune matière évaluée", () => {
    expect(overallAverage([{ average: null, coefficient: 4 }])).toBeNull();
    expect(overallAverage([])).toBeNull();
  });
});

describe("computeRanks (RANK SQL)", () => {
  it("ex æquo partagent le rang et le suivant est sauté : 1, 2, 2, 4", () => {
    const ranked = computeRanks([
      { studentId: "a", average: 15 },
      { studentId: "b", average: 14 },
      { studentId: "c", average: 14 },
      { studentId: "d", average: 11 },
    ]);

    expect(ranked.map((s) => s.rank)).toEqual([1, 2, 2, 4]);
  });

  it("classe par ordre décroissant quel que soit l'ordre d'entrée", () => {
    const ranked = computeRanks([
      { studentId: "a", average: 8 },
      { studentId: "b", average: 18 },
    ]);
    const b = ranked.find((s) => s.studentId === "b");
    expect(b?.rank).toBe(1);
  });

  it("les élèves sans moyenne ne sont pas classés", () => {
    const ranked = computeRanks([
      { studentId: "a", average: 12 },
      { studentId: "b", average: null },
    ]);
    const b = ranked.find((s) => s.studentId === "b");
    expect(b?.rank).toBeUndefined();
  });
});

describe("classStats", () => {
  it("moyenne, extrêmes et taux de réussite", () => {
    const stats = classStats([12, 8, 16, 10]);
    expect(stats.evaluatedCount).toBe(4);
    expect(stats.classAverage).toBe(11.5);
    expect(stats.highest).toBe(16);
    expect(stats.lowest).toBe(8);
    expect(stats.successRate).toBe(75); // 3/4 ≥ 10
  });

  it("tableau vide → tous les indicateurs null", () => {
    const stats = classStats([]);
    expect(stats.evaluatedCount).toBe(0);
    expect(stats.classAverage).toBeNull();
    expect(stats.successRate).toBeNull();
  });
});

describe("mentionFor", () => {
  it("barèmes de mention", () => {
    expect(mentionFor(17)).toBe("Excellent");
    expect(mentionFor(14)).toBe("Très bien");
    expect(mentionFor(10)).toBe("Assez bien");
    expect(mentionFor(PASS_MARK)).toBe("Assez bien");
    expect(mentionFor(7)).toBe("Très insuffisant");
    expect(mentionFor(null)).toBe("Non évalué");
  });
});
