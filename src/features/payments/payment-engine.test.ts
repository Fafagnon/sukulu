import { describe, it, expect } from "vitest";
import {
  calculateStudentFinancialStatus,
  calculateSchoolFinancialKPIs,
  formatCurrency,
  numberToFrenchWords,
  validatePaymentInput,
} from "./payment-engine";

describe("payment-engine", () => {
  describe("calculateStudentFinancialStatus", () => {
    it("returns unpaid status when nothing has been paid", () => {
      const res = calculateStudentFinancialStatus(150000, 0);
      expect(res.totalDue).toBe(150000);
      expect(res.totalPaid).toBe(0);
      expect(res.remainingBalance).toBe(150000);
      expect(res.overpaid).toBe(0);
      expect(res.recoveryRate).toBe(0);
      expect(res.status).toBe("unpaid");
    });

    it("returns partial status when paid amount is less than total due", () => {
      const res = calculateStudentFinancialStatus(150000, 75000);
      expect(res.totalDue).toBe(150000);
      expect(res.totalPaid).toBe(75000);
      expect(res.remainingBalance).toBe(75000);
      expect(res.overpaid).toBe(0);
      expect(res.recoveryRate).toBe(50);
      expect(res.status).toBe("partial");
    });

    it("returns paid status when exact amount is paid", () => {
      const res = calculateStudentFinancialStatus(150000, 150000);
      expect(res.totalDue).toBe(150000);
      expect(res.totalPaid).toBe(150000);
      expect(res.remainingBalance).toBe(0);
      expect(res.overpaid).toBe(0);
      expect(res.recoveryRate).toBe(100);
      expect(res.status).toBe("paid");
    });

    it("returns overpaid status when paid amount exceeds total due", () => {
      const res = calculateStudentFinancialStatus(150000, 160000);
      expect(res.totalDue).toBe(150000);
      expect(res.totalPaid).toBe(160000);
      expect(res.remainingBalance).toBe(0);
      expect(res.overpaid).toBe(10000);
      expect(res.recoveryRate).toBe(100);
      expect(res.status).toBe("overpaid");
    });

    it("handles zero total due gracefully", () => {
      const res = calculateStudentFinancialStatus(0, 0);
      expect(res.remainingBalance).toBe(0);
      expect(res.recoveryRate).toBe(100);
      expect(res.status).toBe("paid");
    });
  });

  describe("calculateSchoolFinancialKPIs", () => {
    it("correctly aggregates multiple students with different payment states", () => {
      const students = [
        { totalDue: 100000, totalPaid: 100000 }, // paid
        { totalDue: 100000, totalPaid: 50000 }, // partial
        { totalDue: 100000, totalPaid: 0 }, // unpaid
        { totalDue: 100000, totalPaid: 120000 }, // overpaid
      ];
      const kpis = calculateSchoolFinancialKPIs(students, 5);

      expect(kpis.totalExpected).toBe(400000);
      expect(kpis.totalCollected).toBe(270000);
      expect(kpis.totalRemaining).toBe(150000); // 0 + 50000 + 100000 + 0
      expect(kpis.overallRecoveryRate).toBe(67.5);
      expect(kpis.totalPaymentsCount).toBe(5);
      expect(kpis.fullyPaidCount).toBe(2); // 1 paid + 1 overpaid
      expect(kpis.partialPaidCount).toBe(1);
      expect(kpis.unpaidCount).toBe(1);
    });

    it("handles empty student list", () => {
      const kpis = calculateSchoolFinancialKPIs([]);
      expect(kpis.totalExpected).toBe(0);
      expect(kpis.totalCollected).toBe(0);
      expect(kpis.totalRemaining).toBe(0);
      expect(kpis.overallRecoveryRate).toBe(100);
    });
  });

  describe("formatCurrency", () => {
    it("formats thousands with space separators and currency unit", () => {
      expect(formatCurrency(150000)).toBe("150 000 F CFA");
      expect(formatCurrency(50000)).toBe("50 000 F CFA");
      expect(formatCurrency(1250000, "FCFA")).toBe("1 250 000 FCFA");
      expect(formatCurrency(0)).toBe("0 F CFA");
    });
  });

  describe("numberToFrenchWords", () => {
    it("converts simple numbers to French words", () => {
      expect(numberToFrenchWords(0)).toBe("zéro");
      expect(numberToFrenchWords(5)).toBe("cinq");
      expect(numberToFrenchWords(12)).toBe("douze");
      expect(numberToFrenchWords(20)).toBe("vingt");
      expect(numberToFrenchWords(71)).toBe("soixante et onze");
      expect(numberToFrenchWords(80)).toBe("quatre-vingts");
      expect(numberToFrenchWords(95)).toBe("quatre-vingt-quinze");
    });

    it("converts typical tuition fee amounts", () => {
      expect(numberToFrenchWords(50000)).toBe("cinquante mille");
      expect(numberToFrenchWords(100000)).toBe("cent mille");
      expect(numberToFrenchWords(150000)).toBe("cent cinquante mille");
      expect(numberToFrenchWords(25000)).toBe("vingt-cinq mille");
      expect(numberToFrenchWords(1000)).toBe("mille");
      expect(numberToFrenchWords(1500)).toBe("mille cinq cents");
    });
  });

  describe("validatePaymentInput", () => {
    it("accepts valid cash payment without reference", () => {
      const res = validatePaymentInput({
        amount: 50000,
        paymentMethod: "cash",
      });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("requires reference for mobile money or bank transfers", () => {
      const res = validatePaymentInput({
        amount: 25000,
        paymentMethod: "mobile_money",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("Une référence");
    });

    it("accepts valid mobile money payment with reference", () => {
      const res = validatePaymentInput({
        amount: 25000,
        paymentMethod: "mobile_money",
        reference: "TMONEY-98745612",
      });
      expect(res.isValid).toBe(true);
    });

    it("rejects 0 or negative amounts", () => {
      const res = validatePaymentInput({
        amount: 0,
        paymentMethod: "cash",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("strictement supérieur à 0");
    });

    it("rejects invalid payment methods", () => {
      const res = validatePaymentInput({
        amount: 10000,
        paymentMethod: "bitcoin",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("invalide");
    });
  });
});
