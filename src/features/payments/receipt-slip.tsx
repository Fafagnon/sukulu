"use client";

import * as React from "react";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, numberToFrenchWords } from "./payment-engine";
import type { OfficialReceiptData } from "./payment-actions";

interface ReceiptSlipProps {
  receipt: OfficialReceiptData;
  onClose: () => void;
}

export function ReceiptSlip({ receipt, onClose }: ReceiptSlipProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const amountInWords = numberToFrenchWords(receipt.amount);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Barre d'action supérieure (masquée lors de l'impression) */}
        <div className="p-3.5 bg-slate-50 border-b border-border flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-foreground">
              Reçu Officiel généré
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5 bg-[#002B5B] hover:bg-[#002047]"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimer</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* CONTENU DU REÇU OFFICIEL (Imprimable) */}
        <div
          id="official-receipt-printable"
          className="p-6 sm:p-8 space-y-5 bg-white text-slate-900 font-sans"
        >
          {/* En-tête Établissement */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#002B5B]">
                {receipt.schoolName}
              </h1>
              <p className="text-[11px] font-semibold text-slate-600 font-mono">
                CODE : {receipt.schoolCode}
              </p>
              {receipt.schoolCity && (
                <p className="text-[11px] text-slate-500">
                  {receipt.schoolCity} {receipt.schoolAddress ? `• ${receipt.schoolAddress}` : ""}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-slate-300">
                {receipt.receiptNumber}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Date : {new Date(receipt.paymentDate).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>

          {/* Titre du document */}
          <div className="text-center py-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 inline-block px-4">
              Reçu de Paiement de Frais Scolaires
            </h2>
          </div>

          {/* Identité de l'élève */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                Élève
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {receipt.studentName}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                Matricule & Classe
              </span>
              <span className="font-bold text-slate-900 font-mono">
                {receipt.matricule}
              </span>{" "}
              • <span className="font-semibold text-slate-700">{receipt.className}</span>
            </div>
          </div>

          {/* Détails du versement */}
          <div className="space-y-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-[10px] uppercase font-bold text-left">
                  <th className="py-1">Motif / Tranche</th>
                  <th className="py-1 text-center">Mode</th>
                  <th className="py-1 text-right">Montant Réglé</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2.5 font-semibold text-slate-900">
                    {receipt.feeName || "Scolarité"}
                    {receipt.reference && (
                      <span className="block text-[10px] font-normal text-slate-500 font-mono">
                        Réf : {receipt.reference}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-center capitalize text-slate-700">
                    {receipt.paymentMethod === "cash"
                      ? "Espèces"
                      : receipt.paymentMethod === "mobile_money"
                      ? "Mobile Money"
                      : receipt.paymentMethod === "bank_transfer"
                      ? "Virement"
                      : receipt.paymentMethod === "cheque"
                      ? "Chèque"
                      : "Autre"}
                  </td>
                  <td className="py-2.5 text-right font-black text-sm text-[#002B5B]">
                    {formatCurrency(receipt.amount, receipt.currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Montant en toutes lettres */}
            <div className="p-2.5 bg-slate-50 rounded border border-dashed border-slate-300 text-xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                Montant en toutes lettres :
              </span>
              <span className="font-bold italic text-slate-800 capitalize">
                {amountInWords} {receipt.currency}
              </span>
            </div>
          </div>

          {/* Situation financière de l'élève */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-center">
            <div>
              <span className="text-[10px] text-slate-500 block">Total Déjà Versé</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(receipt.totalPaidAfter, receipt.currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Ce Versement</span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(receipt.amount, receipt.currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Reste à Payer</span>
              <span
                className={`font-black ${
                  receipt.remainingBalance > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {receipt.remainingBalance > 0
                  ? formatCurrency(receipt.remainingBalance, receipt.currency)
                  : "SOLDÉ (0 F)"}
              </span>
            </div>
          </div>

          {/* Signatures & Cachet */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-700">
            <div>
              <p className="font-semibold text-slate-500 text-[10px] uppercase">
                Le Parent / Le Payeur
              </p>
              <div className="h-12 border-b border-dashed border-slate-300 mt-2" />
            </div>

            <div className="text-right">
              <p className="font-semibold text-slate-500 text-[10px] uppercase">
                Pour l&apos;Administration / Le Caissier
              </p>
              <p className="text-[11px] font-bold text-slate-900 mt-0.5">
                {receipt.recordedByName}
              </p>
              <div className="h-10 border-b border-dashed border-slate-300 mt-1 flex items-end justify-end">
                <span className="text-[9px] text-slate-400 italic">Cachet & Signature</span>
              </div>
            </div>
          </div>

          {/* Pied de page du reçu */}
          <div className="border-t border-slate-200 pt-2 text-center text-[9px] text-slate-400">
            SUKULU Système de Gestion Scolaire • Document certifié conforme • Numéro : {receipt.receiptNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
