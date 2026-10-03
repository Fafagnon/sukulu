import * as React from "react";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";

export async function DashboardHeader() {
  let activeYearName = "Non définie";
  let activePeriodName = "Aucune période active";
  let activePeriodStatus: "open" | "review" | "locked" = "open";

  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id, name, periods(*)")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (activeYear) {
      activeYearName = activeYear.name;
      const periods =
        (activeYear.periods as Array<{
          name: string;
          status: "open" | "review" | "locked";
        }>) || [];
      const openPeriod = periods.find((p) => p.status === "open") || periods[0];
      if (openPeriod) {
        activePeriodName = openPeriod.name;
        activePeriodStatus = openPeriod.status;
      }
    }
  } catch {
    // Pas de session ou pas d'établissement : on garde les libellés par défaut
  }

  const statusLabels = {
    open: { label: "Saisies ouvertes", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    review: { label: "En relecture", color: "bg-amber-50 text-amber-700 border-amber-200" },
    locked: { label: "Verrouillé", color: "bg-slate-100 text-slate-700 border-slate-300" },
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
      {/* Espace gauche (laissé pour le bouton toggle mobile si besoin) */}
      <div className="flex items-center gap-3 pl-10 md:pl-0">
        <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
          Portail Direction SUKULU
        </span>
      </div>

      {/* Badges d'état de l'année scolaire et période active */}
      <div className="flex items-center gap-2.5">
        <Link
          href="/admin/academic-years"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors text-xs text-slate-700"
          title="Cliquez pour changer d'année ou de période"
        >
          <Calendar className="w-3.5 h-3.5 text-[#002B5B]" />
          <span className="font-semibold text-slate-900">{activeYearName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </Link>

        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${statusLabels[activePeriodStatus].color}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>{activePeriodName}</span>
          <span className="text-[10px] opacity-75">({statusLabels[activePeriodStatus].label})</span>
        </div>
      </div>
    </header>
  );
}
