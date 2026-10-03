"use client";

import * as React from "react";
import {
  Coins,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Plus,
  Search,
  Printer,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { PaymentMethod } from "@/types/database";
import { formatCurrency } from "./payment-engine";
import {
  getFinancialDashboardOverviewAction,
  recordPaymentAction,
  createFeeStructureAction,
  getReceiptDetailsAction,
  type FinancialDashboardOverview,
  type StudentFinancialRecord,
  type OfficialReceiptData,
} from "./payment-actions";
import { ReceiptSlip } from "./receipt-slip";

interface PaymentsDashboardProps {
  initialData: FinancialDashboardOverview;
}

export function PaymentsDashboard({ initialData }: PaymentsDashboardProps) {
  const [data, setData] = React.useState<FinancialDashboardOverview>(initialData);
  const [activeTab, setActiveTab] = React.useState<"payments" | "students" | "fees">("payments");
  const [activeReceipt, setActiveReceipt] = React.useState<OfficialReceiptData | null>(null);

  // Filtres
  const [studentSearch, setStudentSearch] = React.useState<string>("");
  const [paymentSearch, setPaymentSearch] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Modale d'encaissement
  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
  const [paymentAmount, setPaymentAmount] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = React.useState<string>("");
  const [selectedFeeStructureId, setSelectedFeeStructureId] = React.useState<string>("");
  const [paymentDate, setPaymentDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentNotes, setPaymentNotes] = React.useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState<boolean>(false);

  // Modale de création de frais
  const [isFeeModalOpen, setIsFeeModalOpen] = React.useState<boolean>(false);
  const [feeName, setFeeName] = React.useState<string>("");
  const [feeAmount, setFeeAmount] = React.useState<string>("");
  const [feeDueDate, setFeeDueDate] = React.useState<string>("");
  const [isSubmittingFee, setIsSubmittingFee] = React.useState<boolean>(false);

  const refreshData = async () => {
    try {
      const res = await getFinancialDashboardOverviewAction();
      if (res.data) {
        setData(res.data);
      }
    } catch {
      toast.error("Erreur lors de l'actualisation des données.");
    }
  };

  // Sélection d'un élève pour encaissement direct
  const handleOpenPaymentForStudent = (student: StudentFinancialRecord) => {
    setSelectedStudentId(student.studentId);
    setPaymentAmount(student.remainingBalance > 0 ? String(student.remainingBalance) : "");
    setIsRecordModalOpen(true);
  };

  // Soumission de l'encaissement
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Veuillez renseigner un montant valide supérieur à 0.");
      return;
    }
    if (!selectedStudentId) {
      toast.error("Veuillez sélectionner un élève.");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await recordPaymentAction({
        studentId: selectedStudentId,
        amount: amt,
        paymentMethod,
        feeStructureId: selectedFeeStructureId || null,
        paymentDate,
        reference: paymentReference || null,
        notes: paymentNotes || null,
      });

      if (res.success && res.receipt) {
        toast.success("Paiement enregistré avec succès !");
        setIsRecordModalOpen(false);
        // Réinitialisation du formulaire
        setPaymentAmount("");
        setPaymentReference("");
        setPaymentNotes("");
        // Ouvre le reçu officiel pour impression
        setActiveReceipt(res.receipt);
        await refreshData();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement.");
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Soumission d'une nouvelle ligne tarifaire
  const handleSubmitFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(feeAmount);
    if (isNaN(amt) || amt < 0) {
      toast.error("Montant tarifaire invalide.");
      return;
    }

    setIsSubmittingFee(true);
    try {
      const res = await createFeeStructureAction({
        name: feeName,
        amount: amt,
        dueDate: feeDueDate || null,
        isMandatory: true,
      });

      if (res.success) {
        toast.success("Ligne tarifaire ajoutée !");
        setIsFeeModalOpen(false);
        setFeeName("");
        setFeeAmount("");
        setFeeDueDate("");
        await refreshData();
      } else {
        toast.error(res.error || "Erreur lors de la création.");
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setIsSubmittingFee(false);
    }
  };

  // Affichage d'un reçu existant
  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await getReceiptDetailsAction(paymentId);
      if (res.data) {
        setActiveReceipt(res.data);
      } else {
        toast.error(res.error || "Reçu introuvable.");
      }
    } catch {
      toast.error("Impossible de charger le reçu.");
    }
  };

  // Élève sélectionné pour la modale
  const currentSelectedStudent = data.students.find(
    (s) => s.studentId === selectedStudentId
  );

  // Filtrage des élèves
  const filteredStudents = data.students.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase().trim();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.matricule.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q)
    );
  });

  // Filtrage des paiements
  const filteredPayments = data.recentPayments.filter((p) => {
    if (!paymentSearch.trim()) return true;
    const q = paymentSearch.toLowerCase().trim();
    return (
      p.receiptNumber.toLowerCase().includes(q) ||
      p.studentName.toLowerCase().includes(q) ||
      p.matricule.toLowerCase().includes(q) ||
      p.className.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Bouton d'action principale d'encaissement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Trésorerie Scolaire • {data.academicYear?.name || "Année Active"}
          </h2>
          <p className="text-xs text-foreground-muted">
            Gestion des encaissements, suivi des impayés et émission de reçus officiels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedStudentId("");
              setPaymentAmount("");
              setIsRecordModalOpen(true);
            }}
            className="text-xs h-9 gap-1.5 bg-[#002B5B] hover:bg-[#002047] font-bold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Encaisser un Paiement</span>
          </Button>
        </div>
      </div>

      {/* 2. Cartes de KPIs financiers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Attendu */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Total Attendu</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(data.kpis.totalExpected)}
          </p>
          <p className="text-[11px] text-foreground-muted">
            {data.students.length} élèves inscrits
          </p>
        </div>

        {/* Total Encaissé */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Total Encaissé</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600">
            {formatCurrency(data.kpis.totalCollected)}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold">
            Taux de recouvrement : {data.kpis.overallRecoveryRate}%
          </p>
        </div>

        {/* Reste à Recouvrer (Impayés) */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Reste à Recouvrer</span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600">
            {formatCurrency(data.kpis.totalRemaining)}
          </p>
          <p className="text-[11px] text-foreground-muted">
            {data.kpis.unpaidCount + data.kpis.partialPaidCount} élèves avec solde
          </p>
        </div>

        {/* Encaissements du jour */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Aujourd&apos;hui</span>
            <div className="h-7 w-7 rounded-lg bg-brand-primary-subtle text-brand-primary flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-brand-primary">
            {formatCurrency(data.todayCollected)}
          </p>
          <p className="text-[11px] text-foreground-muted">
            Ce mois : {formatCurrency(data.monthCollected)}
          </p>
        </div>
      </div>

      {/* 3. Onglets de gestion */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "payments"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            Historique des Règlements ({data.recentPayments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "students"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            Suivi des Élèves & Soldes ({data.students.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fees")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "fees"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            Grille Tarifaire ({data.feeStructures.length})
          </button>
        </nav>
      </div>

      {/* 4. CONTENU DES ONGLETS */}

      {/* ONGLET 1 : HISTORIQUE DES RÈGLEMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher n° reçu, élève ou matricule..."
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border text-foreground-muted font-semibold">
                  <tr>
                    <th className="p-3.5">N° Reçu</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Élève</th>
                    <th className="p-3.5">Classe</th>
                    <th className="p-3.5">Motif</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5 text-right">Montant</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-foreground-muted">
                        Aucun paiement enregistré correspondant.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-mono font-bold text-foreground">
                          {p.receiptNumber}
                        </td>
                        <td className="p-3.5 text-foreground-muted">
                          {new Date(p.paymentDate).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-foreground">{p.studentName}</p>
                          <p className="text-[10px] font-mono text-foreground-muted">{p.matricule}</p>
                        </td>
                        <td className="p-3.5 text-foreground-muted">{p.className}</td>
                        <td className="p-3.5 font-medium text-foreground">{p.feeName}</td>
                        <td className="p-3.5 capitalize text-foreground-muted">
                          {p.paymentMethod === "cash"
                            ? "Espèces"
                            : p.paymentMethod === "mobile_money"
                            ? "Mobile Money"
                            : p.paymentMethod === "bank_transfer"
                            ? "Virement"
                            : "Autre"}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-600">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="p-3.5 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReceipt(p.id)}
                            className="h-8 text-xs gap-1"
                          >
                            <Printer className="h-3 w-3" />
                            <span>Reçu</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 2 : SUIVI DES ÉLÈVES & SOLDES */}
      {activeTab === "students" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Filtrer élève, matricule, classe..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-[#002B5B] text-white"
                    : "bg-surface text-foreground-muted hover:bg-slate-100"
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("unpaid")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "unpaid"
                    ? "bg-rose-600 text-white"
                    : "bg-surface text-foreground-muted hover:bg-slate-100"
                }`}
              >
                Impayés
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("partial")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "partial"
                    ? "bg-amber-600 text-white"
                    : "bg-surface text-foreground-muted hover:bg-slate-100"
                }`}
              >
                Partiels
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("paid")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "paid"
                    ? "bg-emerald-600 text-white"
                    : "bg-surface text-foreground-muted hover:bg-slate-100"
                }`}
              >
                Soldés
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border text-foreground-muted font-semibold">
                  <tr>
                    <th className="p-3.5">Élève</th>
                    <th className="p-3.5">Classe</th>
                    <th className="p-3.5 text-right">Total Dû</th>
                    <th className="p-3.5 text-right">Total Payé</th>
                    <th className="p-3.5 text-right">Solde Restant</th>
                    <th className="p-3.5 text-center">Taux</th>
                    <th className="p-3.5 text-center">Statut</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-foreground-muted">
                        Aucun élève trouvé pour ces critères.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.studentId} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <p className="font-bold text-foreground">{s.fullName}</p>
                          <p className="text-[10px] font-mono text-foreground-muted">{s.matricule}</p>
                        </td>
                        <td className="p-3.5 font-medium text-foreground">{s.className}</td>
                        <td className="p-3.5 text-right text-foreground-muted">
                          {formatCurrency(s.totalDue)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-600">
                          {formatCurrency(s.totalPaid)}
                        </td>
                        <td
                          className={`p-3.5 text-right font-black ${
                            s.remainingBalance > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {formatCurrency(s.remainingBalance)}
                        </td>
                        <td className="p-3.5 text-center font-bold text-brand-primary">
                          {s.recoveryRate}%
                        </td>
                        <td className="p-3.5 text-center">
                          {s.status === "paid" || s.status === "overpaid" ? (
                            <Badge variant="success" className="text-[10px]">
                              Soldé
                            </Badge>
                          ) : s.status === "partial" ? (
                            <Badge variant="warning" className="text-[10px]">
                              Partiel
                            </Badge>
                          ) : (
                            <Badge variant="error" className="text-[10px]">
                              Impayé
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenPaymentForStudent(s)}
                            className="h-8 text-xs bg-[#002B5B] hover:bg-[#002047]"
                          >
                            Encaisser
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 3 : GRILLE TARIFAIRE */}
      {activeTab === "fees" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground-muted">
              Configurez les tarifs annuels de scolarité, inscriptions et tranches exigibles.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFeeModalOpen(true)}
              className="text-xs h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter un tarif</span>
            </Button>
          </div>

          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-foreground-muted font-semibold">
                <tr>
                  <th className="p-3.5">Intitulé du Frais</th>
                  <th className="p-3.5">Portée</th>
                  <th className="p-3.5">Échéance</th>
                  <th className="p-3.5">Caractère</th>
                  <th className="p-3.5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.feeStructures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-foreground-muted">
                      Aucune ligne tarifaire configurée pour cette année scolaire.
                    </td>
                  </tr>
                ) : (
                  data.feeStructures.map((fee) => (
                    <tr key={fee.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-foreground">{fee.name}</td>
                      <td className="p-3.5 text-foreground-muted">
                        {fee.className ? fee.className : "Tout l'établissement"}
                      </td>
                      <td className="p-3.5 text-foreground-muted">
                        {fee.dueDate
                          ? new Date(fee.dueDate).toLocaleDateString("fr-FR")
                          : "Non spécifiée"}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={fee.isMandatory ? "default" : "secondary"} className="text-[10px]">
                          {fee.isMandatory ? "Obligatoire" : "Optionnel"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-black text-sm text-[#002B5B]">
                        {formatCurrency(fee.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODALE D'ENCAISSEMENT RAPIDE */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 my-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Encaisser un Paiement</h3>
                <p className="text-xs text-foreground-muted">
                  Génération instantanée du reçu officiel avec numérotation unique
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3.5">
              {/* Sélection élève */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Élève concerné *
                </label>
                <div className="relative">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      const stId = e.target.value;
                      setSelectedStudentId(stId);
                      const found = data.students.find((s) => s.studentId === stId);
                      if (found && found.remainingBalance > 0) {
                        setPaymentAmount(String(found.remainingBalance));
                      }
                    }}
                    required
                    className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-surface text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">Sélectionner un élève...</option>
                    {data.students.map((s) => (
                      <option key={s.studentId} value={s.studentId}>
                        {s.fullName} ({s.matricule}) — {s.className} [Solde: {formatCurrency(s.remainingBalance)}]
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none text-foreground-muted" />
                </div>
              </div>

              {/* Solde restant actuel de l'élève */}
              {currentSelectedStudent && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-foreground-muted uppercase block">
                      Classe & Statut
                    </span>
                    <span className="font-bold text-foreground">
                      {currentSelectedStudent.className}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-foreground-muted uppercase block">
                      Solde Restant Dû
                    </span>
                    <span
                      className={`font-black ${
                        currentSelectedStudent.remainingBalance > 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(currentSelectedStudent.remainingBalance)}
                    </span>
                  </div>
                </div>
              )}

              {/* Ligne : Montant + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Montant versé (F CFA) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ex: 50000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="h-10 text-xs font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Date du règlement *
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="h-10 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Ligne : Mode de règlement + Tranche */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Mode de règlement *
                  </label>
                  <div className="relative">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-surface text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="cash">Espèces</option>
                      <option value="mobile_money">Mobile Money (T-Money / Moov)</option>
                      <option value="bank_transfer">Virement bancaire</option>
                      <option value="cheque">Chèque</option>
                      <option value="other">Autre</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none text-foreground-muted" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Ligne de frais / Tranche
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFeeStructureId}
                      onChange={(e) => setSelectedFeeStructureId(e.target.value)}
                      className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-surface text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">Scolarité générale</option>
                      {data.feeStructures.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({formatCurrency(f.amount)})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none text-foreground-muted" />
                  </div>
                </div>
              </div>

              {/* Référence de transaction si nécessaire */}
              {paymentMethod !== "cash" && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Référence obligatoire (n° transaction, chèque ou bordereau) *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: TMONEY-092847291"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    required
                    className="h-10 text-xs font-mono"
                  />
                </div>
              )}

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Observations / Notes (facultatif)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Règlement versé par l'oncle maternel..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRecordModalOpen(false)}
                  disabled={isSubmittingPayment}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isSubmittingPayment}
                  className="text-xs bg-[#002B5B] hover:bg-[#002047] font-bold"
                >
                  {isSubmittingPayment ? "Encaissement..." : "Valider & Imprimer le Reçu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODALE D'AJOUT DE LIGNE TARIFAIRE */}
      {isFeeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Ajouter un Frais Scolaire</h3>
              <button
                type="button"
                onClick={() => setIsFeeModalOpen(false)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitFee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Intitulé du frais *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Scolarité annuelle, Tranche 1, Inscription..."
                  value={feeName}
                  onChange={(e) => setFeeName(e.target.value)}
                  required
                  className="h-10 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Montant (F CFA) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Ex: 150000"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  required
                  className="h-10 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Date d&apos;échéance limite (facultatif)
                </label>
                <Input
                  type="date"
                  value={feeDueDate}
                  onChange={(e) => setFeeDueDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFeeModalOpen(false)}
                  disabled={isSubmittingFee}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isSubmittingFee}
                  className="text-xs bg-[#002B5B] hover:bg-[#002047] font-bold"
                >
                  {isSubmittingFee ? "Enregistrement..." : "Créer le tarif"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. REÇU OFFICIEL IMPRIMABLE EN MODALE */}
      {activeReceipt && (
        <ReceiptSlip receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}
