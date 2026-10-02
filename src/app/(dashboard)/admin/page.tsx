import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  GraduationCap,
  BookOpen,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let schoolName = "Établissement";
  let activeYearName = "Non définie";
  let classesCount = 0;
  let periodsCount = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.school_id) {
      const [schoolRes, yearRes, classesRes] = await Promise.all([
        supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle(),
        supabase.from("academic_years").select("id, name, periods(id)").eq("school_id", profile.school_id).eq("is_active", true).maybeSingle(),
        supabase.from("classes").select("id", { count: "exact" }).eq("school_id", profile.school_id),
      ]);

      schoolName = schoolRes.data?.name || "Établissement";
      if (yearRes.data) {
        activeYearName = yearRes.data.name;
        periodsCount = (yearRes.data.periods as unknown[])?.length || 0;
      }
      classesCount = classesRes.count || 0;
    }
  }

  return (
    <div className="space-y-8">
      {/* Bannière institutionnelle */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#002B5B]/10 text-[#002B5B]">
                <ShieldCheck className="w-3 h-3" />
                Direction Générale
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {schoolName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Structure Scolaire &amp; Pédagogie
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Configurez la hiérarchie de votre établissement, l&apos;année scolaire en cours, les trimestres d&apos;évaluation et vos divisions de classes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/academic-years"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Année : {activeYearName}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Raccourcis des modules de la Phase 2 */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Modules Pédagogiques (Phase 2)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Années & Périodes */}
          <Link
            href="/admin/academic-years"
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 hover:border-[#002B5B] transition-all shadow-xs hover:shadow-sm group flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#002B5B] group-hover:text-white text-[#002B5B] flex items-center justify-center transition-colors">
                <Calendar className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#002B5B] transition-colors">
                  Années &amp; Périodes
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Année active ({activeYearName}), trimestres et cycle de saisie des notes.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#002B5B]">
              <span>Gérer les périodes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Cycles & Classes */}
          <Link
            href="/admin/classes"
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 hover:border-[#002B5B] transition-all shadow-xs hover:shadow-sm group flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#002B5B] group-hover:text-white text-[#002B5B] flex items-center justify-center transition-colors">
                <GraduationCap className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#002B5B] transition-colors">
                  Cycles &amp; Classes
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {classesCount} classe(s) configurée(s) (Primaire, Collège, Lycée &amp; Séries).
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#002B5B]">
              <span>Gérer les classes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. Matières & Coefficients (Étape 2.2) */}
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5 space-y-3 flex flex-col justify-between opacity-80">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-700">Matières &amp; Coeffs</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                    Étape 2.2
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Catalogue des disciplines et matrice matière &times; classe &times; coefficients.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] font-medium text-slate-400">
              Prochaine sous-étape
            </div>
          </div>

          {/* 4. Emplois du temps (Étape 2.3) */}
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5 space-y-3 flex flex-col justify-between opacity-80">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
                <Clock className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-700">Emplois du temps</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                    Étape 2.3
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Planification hebdomadaire avec moteur de détection anti-conflits.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] font-medium text-slate-400">
              Prochaine sous-étape
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
