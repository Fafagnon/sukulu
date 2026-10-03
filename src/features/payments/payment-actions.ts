"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit";
import type { PaymentMethod } from "@/types/database";
import {
  calculateStudentFinancialStatus,
  calculateSchoolFinancialKPIs,
  validatePaymentInput,
  type SchoolFinancialKPIs,
  type StudentFinancialStatus,
} from "./payment-engine";

export interface FeeStructureItem {
  id: string;
  name: string;
  amount: number;
  dueDate: string | null;
  isMandatory: boolean;
  classId: string | null;
  className: string | null;
  academicYearId: string;
}

export interface StudentFinancialRecord {
  studentId: string;
  enrollmentId: string | null;
  matricule: string;
  fullName: string;
  className: string;
  classId: string;
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
  overpaid: number;
  recoveryRate: number;
  status: StudentFinancialStatus["status"];
  lastPaymentDate: string | null;
}

export interface PaymentTransactionItem {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  studentId: string;
  studentName: string;
  matricule: string;
  className: string;
  feeName: string | null;
  recordedByName: string | null;
  createdAt: string;
}

interface RawPaymentRow {
  id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  student_id: string;
  fee_structure_id: string | null;
  recorded_by: string | null;
  academic_year_id: string;
  created_at: string;
  students?: {
    id: string;
    matricule: string;
    first_name: string;
    last_name: string;
  } | null;
  fee_structures?: {
    name: string;
  } | null;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
  enrollments?: {
    classes?: {
      name: string;
    } | null;
  } | null;
}

export interface OfficialReceiptData {
  id: string;
  receiptNumber: string;
  schoolName: string;
  schoolCode: string;
  schoolAddress: string | null;
  schoolCity: string | null;
  schoolPhone: string | null;
  currency: string;
  studentId: string;
  studentName: string;
  matricule: string;
  className: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  feeName: string | null;
  totalDue: number;
  totalPaidBefore: number;
  totalPaidAfter: number;
  remainingBalance: number;
  recordedByName: string;
}

export interface FinancialDashboardOverview {
  academicYear: {
    id: string;
    name: string;
  } | null;
  kpis: SchoolFinancialKPIs;
  todayCollected: number;
  monthCollected: number;
  feeStructures: FeeStructureItem[];
  students: StudentFinancialRecord[];
  recentPayments: PaymentTransactionItem[];
}

/**
 * 1. Vue d'ensemble financière de l'établissement (KPIs, impayés, historique, grille tarifaire).
 */
export async function getFinancialDashboardOverviewAction(filter?: {
  classId?: string;
  status?: string;
}): Promise<{
  data?: FinancialDashboardOverview;
  error?: string;
}> {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Accès réservé à la Direction et au service financier." };
    }

    // 1. Année scolaire active
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (!activeYear) {
      return { error: "Aucune année scolaire active dans l'établissement." };
    }

    // 2. Grille tarifaire de l'année
    const { data: feeStructuresData } = await supabase
      .from("fee_structures")
      .select(`
        id,
        name,
        amount,
        due_date,
        is_mandatory,
        class_id,
        academic_year_id,
        classes (
          name
        )
      `)
      .eq("school_id", schoolId)
      .eq("academic_year_id", activeYear.id)
      .order("name", { ascending: true });

    const feeStructures: FeeStructureItem[] = (feeStructuresData ?? []).map((f) => {
      const cls = f.classes as { name: string } | null;
      return {
        id: f.id,
        name: f.name,
        amount: Number(f.amount),
        dueDate: f.due_date,
        isMandatory: f.is_mandatory,
        classId: f.class_id,
        className: cls?.name ?? null,
        academicYearId: f.academic_year_id,
      };
    });

    // 3. Inscriptions actives
    let enrollmentsQuery = supabase
      .from("enrollments")
      .select(`
        id,
        class_id,
        student_id,
        students (
          id,
          matricule,
          first_name,
          last_name,
          status
        ),
        classes (
          id,
          name
        )
      `)
      .eq("school_id", schoolId)
      .eq("academic_year_id", activeYear.id)
      .eq("status", "enrolled");

    if (filter?.classId) {
      enrollmentsQuery = enrollmentsQuery.eq("class_id", filter.classId);
    }

    const { data: enrollmentsData } = await enrollmentsQuery;

    // 4. Paiements de l'année
    const { data: paymentsData } = await supabase
      .from("payments")
      .select(`
        id,
        receipt_number,
        amount,
        payment_date,
        payment_method,
        reference,
        notes,
        student_id,
        fee_structure_id,
        recorded_by,
        created_at,
        students (
          id,
          matricule,
          first_name,
          last_name
        ),
        fee_structures (
          name
        ),
        profiles:recorded_by (
          first_name,
          last_name
        )
      `)
      .eq("school_id", schoolId)
      .eq("academic_year_id", activeYear.id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    // Agréger les paiements par student_id
    const studentPaymentsMap = new Map<
      string,
      { totalPaid: number; lastDate: string | null }
    >();

    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
    let todayCollected = 0;
    let monthCollected = 0;

    const rawPayments = (paymentsData as unknown as RawPaymentRow[]) ?? [];

    rawPayments.forEach((p) => {
      const amt = Number(p.amount);
      const prev = studentPaymentsMap.get(p.student_id) ?? {
        totalPaid: 0,
        lastDate: null,
      };
      prev.totalPaid += amt;
      if (!prev.lastDate || p.payment_date > prev.lastDate) {
        prev.lastDate = p.payment_date;
      }
      studentPaymentsMap.set(p.student_id, prev);

      if (p.payment_date === todayStr) {
        todayCollected += amt;
      }
      if (p.payment_date.startsWith(currentMonthStr)) {
        monthCollected += amt;
      }
    });

    // 5. Calculer le total dû et la situation de chaque élève
    const studentsFinancialRecords: StudentFinancialRecord[] = [];

    for (const en of enrollmentsData ?? []) {
      const s = en.students as {
        id: string;
        matricule: string;
        first_name: string;
        last_name: string;
        status: string;
      } | null;
      const c = en.classes as { id: string; name: string } | null;
      if (!s || !c || s.status !== "active") continue;

      // Frais obligatoires applicables à la classe de l'élève ou à toute l'école
      let studentTotalDue = 0;
      for (const fee of feeStructures) {
        if (!fee.isMandatory) continue;
        if (fee.classId === null || fee.classId === c.id) {
          studentTotalDue += fee.amount;
        }
      }

      const paymentInfo = studentPaymentsMap.get(s.id) ?? {
        totalPaid: 0,
        lastDate: null,
      };
      const statusCalc = calculateStudentFinancialStatus(
        studentTotalDue,
        paymentInfo.totalPaid
      );

      // Filtre optionnel par statut
      if (filter?.status && filter.status !== "all" && statusCalc.status !== filter.status) {
        continue;
      }

      studentsFinancialRecords.push({
        studentId: s.id,
        enrollmentId: en.id,
        matricule: s.matricule,
        fullName: `${s.first_name} ${s.last_name}`.trim(),
        className: c.name,
        classId: c.id,
        totalDue: statusCalc.totalDue,
        totalPaid: statusCalc.totalPaid,
        remainingBalance: statusCalc.remainingBalance,
        overpaid: statusCalc.overpaid,
        recoveryRate: statusCalc.recoveryRate,
        status: statusCalc.status,
        lastPaymentDate: paymentInfo.lastDate,
      });
    }

    studentsFinancialRecords.sort((a, b) =>
      b.remainingBalance - a.remainingBalance || a.fullName.localeCompare(b.fullName)
    );

    // Calcul des KPIs
    const kpis = calculateSchoolFinancialKPIs(
      studentsFinancialRecords.map((s) => ({
        totalDue: s.totalDue,
        totalPaid: s.totalPaid,
      })),
      paymentsData?.length ?? 0
    );

    // 6. Historique récent des paiements
    const recentPayments: PaymentTransactionItem[] = rawPayments
      .slice(0, 50)
      .map((p) => {
        const s = p.students as {
          id: string;
          matricule: string;
          first_name: string;
          last_name: string;
        } | null;
        const fee = p.fee_structures as { name: string } | null;
        const prof = p.profiles as { first_name: string; last_name: string } | null;

        // Trouver la classe de l'élève
        const foundStudent = studentsFinancialRecords.find((r) => r.studentId === p.student_id);

        return {
          id: p.id,
          receiptNumber: p.receipt_number,
          amount: Number(p.amount),
          paymentDate: p.payment_date,
          paymentMethod: p.payment_method as PaymentMethod,
          reference: p.reference,
          notes: p.notes,
          studentId: p.student_id,
          studentName: s ? `${s.first_name} ${s.last_name}`.trim() : "Élève",
          matricule: s?.matricule || "—",
          className: foundStudent?.className || "—",
          feeName: fee?.name || "Scolarité",
          recordedByName: prof ? `${prof.first_name} ${prof.last_name}`.trim() : "Caissier",
          createdAt: p.created_at,
        };
      });

    return {
      data: {
        academicYear: {
          id: activeYear.id,
          name: activeYear.name,
        },
        kpis,
        todayCollected,
        monthCollected,
        feeStructures,
        students: studentsFinancialRecords,
        recentPayments,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors du calcul de la trésorerie.",
    };
  }
}

/**
 * 2. Enregistrement d'un paiement / encaissement avec émission du reçu officiel.
 */
export async function recordPaymentAction(input: {
  studentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  feeStructureId?: string | null;
  paymentDate?: string;
  reference?: string | null;
  notes?: string | null;
}): Promise<{
  success: boolean;
  receipt?: OfficialReceiptData;
  error?: string;
}> {
  try {
    const { supabase, schoolId, user, profile, school } =
      await getAuthenticatedSchoolContext();

    if (!user || !profile) {
      return { success: false, error: "Session non authentifiée." };
    }

    if (profile.role !== "direction" && profile.role !== "superadmin") {
      return { success: false, error: "Droit d'encaissement réservé à la Direction." };
    }

    // Validation des données financières
    const validation = validatePaymentInput({
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      notes: input.notes,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(" ; ") };
    }

    // Récupérer l'année scolaire active
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .single();

    if (!activeYear) {
      return { success: false, error: "Aucune année scolaire active dans l'établissement." };
    }

    // Récupérer l'élève et son inscription
    const { data: enrollment, error: enrollErr } = await supabase
      .from("enrollments")
      .select(`
        id,
        class_id,
        student_id,
        students (
          id,
          matricule,
          first_name,
          last_name
        ),
        classes (
          id,
          name
        )
      `)
      .eq("school_id", schoolId)
      .eq("student_id", input.studentId)
      .eq("academic_year_id", activeYear.id)
      .eq("status", "enrolled")
      .single();

    if (enrollErr || !enrollment) {
      return { success: false, error: "Élève non inscrit pour l'année scolaire en cours." };
    }

    const student = enrollment.students as {
      id: string;
      matricule: string;
      first_name: string;
      last_name: string;
    };
    const studentClass = enrollment.classes as { id: string; name: string };

    // Calculer le total dû et ce qui a déjà été payé avant ce versement
    const [feeStructuresRes, priorPaymentsRes] = await Promise.all([
      supabase
        .from("fee_structures")
        .select("amount, class_id, is_mandatory")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYear.id)
        .eq("is_mandatory", true),
      supabase
        .from("payments")
        .select("amount")
        .eq("school_id", schoolId)
        .eq("student_id", input.studentId)
        .eq("academic_year_id", activeYear.id),
    ]);

    let totalDue = 0;
    (feeStructuresRes.data ?? []).forEach((f) => {
      if (f.class_id === null || f.class_id === studentClass.id) {
        totalDue += Number(f.amount);
      }
    });

    let totalPaidBefore = 0;
    (priorPaymentsRes.data ?? []).forEach((p) => {
      totalPaidBefore += Number(p.amount);
    });

    // Génération du numéro de reçu unique séquentiel
    const yearPrefix = new Date().getFullYear().toString();
    let receiptNumber = "";

    const { data: generatedNum, error: rpcErr } = await supabase.rpc(
      "generate_receipt_number",
      {
        p_school_id: schoolId,
        p_year_prefix: yearPrefix,
      }
    );

    if (generatedNum && !rpcErr) {
      receiptNumber = generatedNum;
    } else {
      // Fallback de numérotation séquentielle propre
      const { count } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId);
      const nextNum = (count ?? 0) + 1;
      receiptNumber = `REC-${yearPrefix}-${String(nextNum).padStart(5, "0")}`;
    }

    const paymentDate = input.paymentDate || new Date().toISOString().split("T")[0];

    // Insertion du règlement
    const { data: newPayment, error: insertErr } = await supabase
      .from("payments")
      .insert({
        school_id: schoolId,
        academic_year_id: activeYear.id,
        student_id: input.studentId,
        enrollment_id: enrollment.id,
        fee_structure_id: input.feeStructureId || null,
        amount: input.amount,
        payment_date: paymentDate,
        payment_method: input.paymentMethod,
        reference: input.reference?.trim() || null,
        receipt_number: receiptNumber,
        notes: input.notes?.trim() || null,
        recorded_by: user.id,
      })
      .select("id, created_at")
      .single();

    if (insertErr || !newPayment) {
      return {
        success: false,
        error: "Erreur lors de l'enregistrement du paiement: " + insertErr?.message,
      };
    }

    // Récupérer le nom du frais si spécifié
    let feeName = "Scolarité";
    if (input.feeStructureId) {
      const { data: feeData } = await supabase
        .from("fee_structures")
        .select("name")
        .eq("id", input.feeStructureId)
        .maybeSingle();
      if (feeData) feeName = feeData.name;
    }

    const totalPaidAfter = totalPaidBefore + input.amount;
    const remainingBalance = Math.max(0, totalDue - totalPaidAfter);

    // Audit log obligatoire
    await logAuditEvent({
      schoolId,
      userId: user.id,
      action: "record_payment",
      entityType: "payments",
      entityId: newPayment.id,
      newData: {
        receiptNumber,
        studentId: input.studentId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        remainingBalance,
      },
    });

    revalidatePath("/admin/payments");

    const receipt: OfficialReceiptData = {
      id: newPayment.id,
      receiptNumber,
      schoolName: school?.name || "Établissement Scolaire",
      schoolCode: school?.code || "SCOLAIRE",
      schoolAddress: null,
      schoolCity: null,
      schoolPhone: null,
      currency: school?.currency || "F CFA",
      studentId: input.studentId,
      studentName: `${student.first_name} ${student.last_name}`.trim(),
      matricule: student.matricule,
      className: studentClass.name,
      amount: input.amount,
      paymentDate,
      paymentMethod: input.paymentMethod,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
      feeName,
      totalDue,
      totalPaidBefore,
      totalPaidAfter,
      remainingBalance,
      recordedByName: `${profile.first_name} ${profile.last_name}`.trim(),
    };

    return {
      success: true,
      receipt,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de l'encaissement.",
    };
  }
}

/**
 * 3. Création d'une nouvelle ligne tarifaire (frais scolaire, tranche, inscription).
 */
export async function createFeeStructureAction(input: {
  name: string;
  amount: number;
  classId?: string | null;
  dueDate?: string | null;
  isMandatory?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { success: false, error: "Action réservée à la Direction." };
    }

    if (!input.name || input.name.trim().length < 2) {
      return { success: false, error: "Le nom du frais scolaire est requis." };
    }

    if (isNaN(input.amount) || input.amount < 0) {
      return { success: false, error: "Le montant doit être supérieur ou égal à 0." };
    }

    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .single();

    if (!activeYear) {
      return { success: false, error: "Aucune année scolaire active." };
    }

    const { error: insertErr } = await supabase.from("fee_structures").insert({
      school_id: schoolId,
      academic_year_id: activeYear.id,
      class_id: input.classId || null,
      name: input.name.trim(),
      amount: input.amount,
      due_date: input.dueDate || null,
      is_mandatory: input.isMandatory ?? true,
    });

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    revalidatePath("/admin/payments");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erreur lors de la création de la ligne tarifaire.",
    };
  }
}

/**
 * 4. Récupère les données complètes d'un reçu pour réimpression ou consultation.
 */
export async function getReceiptDetailsAction(
  paymentId: string
): Promise<{ data?: OfficialReceiptData; error?: string }> {
  try {
    const { supabase, schoolId, school } = await getAuthenticatedSchoolContext();

    const { data: payment, error } = await supabase
      .from("payments")
      .select(`
        id,
        receipt_number,
        amount,
        payment_date,
        payment_method,
        reference,
        notes,
        student_id,
        fee_structure_id,
        academic_year_id,
        created_at,
        students (
          id,
          matricule,
          first_name,
          last_name
        ),
        enrollments (
          classes (
            name
          )
        ),
        fee_structures (
          name
        ),
        profiles:recorded_by (
          first_name,
          last_name
        )
      `)
      .eq("id", paymentId)
      .eq("school_id", schoolId)
      .single();

    if (error || !payment) {
      return { error: "Reçu introuvable." };
    }

    const p = payment as unknown as RawPaymentRow;

    const s = p.students as {
      id: string;
      matricule: string;
      first_name: string;
      last_name: string;
    } | null;
    const en = p.enrollments as { classes: { name: string } | null } | null;
    const fee = p.fee_structures as { name: string } | null;
    const prof = p.profiles as { first_name: string; last_name: string } | null;

    // Calculer les cumuls
    const { data: allPayments } = await supabase
      .from("payments")
      .select("amount, created_at")
      .eq("school_id", schoolId)
      .eq("student_id", p.student_id)
      .eq("academic_year_id", p.academic_year_id)
      .order("created_at", { ascending: true });

    let totalPaidAfter = 0;
    const allPaymentsList = (allPayments as unknown as Array<{ amount: number; created_at: string }>) ?? [];
    allPaymentsList.forEach((prevPay) => {
      if (prevPay.created_at <= p.created_at) {
        totalPaidAfter += Number(prevPay.amount);
      }
    });

    const totalPaidBefore = Math.max(0, totalPaidAfter - Number(p.amount));

    return {
      data: {
        id: p.id,
        receiptNumber: p.receipt_number,
        schoolName: school?.name || "Établissement Scolaire",
        schoolCode: school?.code || "SCOLAIRE",
        schoolAddress: null,
        schoolCity: null,
        schoolPhone: null,
        currency: school?.currency || "F CFA",
        studentId: p.student_id,
        studentName: s ? `${s.first_name} ${s.last_name}`.trim() : "Élève",
        matricule: s?.matricule || "—",
        className: en?.classes?.name || "Classe",
        amount: Number(p.amount),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method as PaymentMethod,
        reference: p.reference,
        notes: p.notes,
        feeName: fee?.name || "Scolarité",
        totalDue: 0,
        totalPaidBefore,
        totalPaidAfter,
        remainingBalance: 0,
        recordedByName: prof ? `${prof.first_name} ${prof.last_name}`.trim() : "Service Trésorerie",
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erreur lors de la récupération du reçu.",
    };
  }
}
