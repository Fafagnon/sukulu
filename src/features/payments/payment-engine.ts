import type { PaymentMethod } from "@/types/database";

export type PaymentStatus = "paid" | "partial" | "unpaid" | "overpaid";

export interface StudentFinancialStatus {
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
  overpaid: number;
  recoveryRate: number; // 0 à 100%
  status: PaymentStatus;
}

export interface SchoolFinancialKPIs {
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  overallRecoveryRate: number;
  totalPaymentsCount: number;
  fullyPaidCount: number;
  partialPaidCount: number;
  unpaidCount: number;
}

/**
 * Calcule l'état financier et le solde d'un élève.
 */
export function calculateStudentFinancialStatus(
  totalDue: number,
  totalPaid: number
): StudentFinancialStatus {
  const safeDue = Math.max(0, totalDue);
  const safePaid = Math.max(0, totalPaid);

  const remainingBalance = Math.max(0, safeDue - safePaid);
  const overpaid = Math.max(0, safePaid - safeDue);

  let status: PaymentStatus = "unpaid";
  if (safeDue === 0) {
    status = safePaid > 0 ? "overpaid" : "paid";
  } else if (safePaid >= safeDue) {
    status = overpaid > 0 ? "overpaid" : "paid";
  } else if (safePaid > 0) {
    status = "partial";
  } else {
    status = "unpaid";
  }

  const recoveryRate =
    safeDue > 0
      ? Math.min(100, Math.round((safePaid / safeDue) * 1000) / 10)
      : 100;

  return {
    totalDue: safeDue,
    totalPaid: safePaid,
    remainingBalance,
    overpaid,
    recoveryRate,
    status,
  };
}

/**
 * Calcule la synthèse globale des KPIs financiers de l'établissement.
 */
export function calculateSchoolFinancialKPIs(
  students: { totalDue: number; totalPaid: number }[],
  totalPaymentsCount: number = 0
): SchoolFinancialKPIs {
  let totalExpected = 0;
  let totalCollected = 0;
  let totalRemaining = 0;
  let fullyPaidCount = 0;
  let partialPaidCount = 0;
  let unpaidCount = 0;

  for (const s of students) {
    const calc = calculateStudentFinancialStatus(s.totalDue, s.totalPaid);
    totalExpected += calc.totalDue;
    totalCollected += calc.totalPaid;
    totalRemaining += calc.remainingBalance;

    if (calc.status === "paid" || calc.status === "overpaid") {
      fullyPaidCount += 1;
    } else if (calc.status === "partial") {
      partialPaidCount += 1;
    } else {
      unpaidCount += 1;
    }
  }

  const overallRecoveryRate =
    totalExpected > 0
      ? Math.min(100, Math.round((totalCollected / totalExpected) * 1000) / 10)
      : 100;

  return {
    totalExpected,
    totalCollected,
    totalRemaining,
    overallRecoveryRate,
    totalPaymentsCount,
    fullyPaidCount,
    partialPaidCount,
    unpaidCount,
  };
}

/**
 * Formate un montant monétaire selon les standards d'Afrique de l'Ouest (ex: "150 000 F CFA").
 */
export function formatCurrency(amount: number, currency: string = "F CFA"): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} ${currency}`.trim();
}

/**
 * Convertit un entier numérique en toutes lettres en français (indispensable pour les reçus officiels).
 * Gère jusqu'à 999 999 999.
 */
export function numberToFrenchWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "zéro";

  const units = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];

  const tens = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante-dix",
    "quatre-vingts",
    "quatre-vingt-dix",
  ];

  function convertBelowHundred(val: number): string {
    if (val < 20) return units[val];
    const ten = Math.floor(val / 10);
    const unit = val % 10;

    if (ten === 7) {
      if (unit === 1) return "soixante et onze";
      return `soixante-${units[10 + unit]}`;
    }
    if (ten === 9) {
      return `quatre-vingt-${units[10 + unit]}`;
    }

    if (unit === 0) {
      return tens[ten];
    }
    if (unit === 1 && ten < 8) {
      return `${tens[ten]} et un`;
    }
    const tenWord = ten === 8 && unit > 0 ? "quatre-vingt" : tens[ten];
    return `${tenWord}-${units[unit]}`;
  }

  function convertBelowThousand(val: number): string {
    if (val < 100) return convertBelowHundred(val);
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
    const hundredWord =
      hundred === 1 ? "cent" : rest === 0 ? `${units[hundred]} cents` : `${units[hundred]} cent`;

    if (rest === 0) return hundredWord;
    return `${hundredWord} ${convertBelowHundred(rest)}`;
  }

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  const parts: string[] = [];

  if (millions > 0) {
    if (millions === 1) {
      parts.push("un million");
    } else {
      parts.push(`${convertBelowThousand(millions)} millions`);
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push("mille");
    } else {
      parts.push(`${convertBelowThousand(thousands)} mille`);
    }
  }

  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  return parts.join(" ").trim();
}

/**
 * Valide les entrées d'un règlement.
 */
export function validatePaymentInput(input: {
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validMethods: PaymentMethod[] = [
    "cash",
    "mobile_money",
    "bank_transfer",
    "cheque",
    "other",
  ];

  if (!input.amount || isNaN(input.amount) || input.amount <= 0) {
    errors.push("Le montant du versement doit être un nombre strictement supérieur à 0.");
  }

  if (!validMethods.includes(input.paymentMethod as PaymentMethod)) {
    errors.push(
      `Mode de paiement « ${input.paymentMethod} » invalide. Modes autorisés : espèces, mobile money, virement, chèque, autre.`
    );
  }

  if (
    (input.paymentMethod === "mobile_money" ||
      input.paymentMethod === "bank_transfer" ||
      input.paymentMethod === "cheque") &&
    (!input.reference || input.reference.trim().length === 0)
  ) {
    errors.push("Une référence (n° de transaction, chèque ou virement) est obligatoire pour ce mode de règlement.");
  }

  if (input.notes && input.notes.length > 500) {
    errors.push("Les remarques ou observations ne peuvent excéder 500 caractères.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
