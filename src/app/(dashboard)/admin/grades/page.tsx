import * as React from "react";
import { getClasses } from "@/features/academic/actions";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";
import { GradesClient } from "./grades-client";

interface PeriodItem {
  id: string;
  name: string;
  status: "open" | "review" | "locked";
  order_index: number;
}

export default async function GradesPage() {
  let periods: PeriodItem[] = [];
  let activeYearId: string | null = null;
  let teachers: Array<{ id: string; first_name: string; last_name: string }> = [];

  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const [yearRes, teachersRes] = await Promise.all([
      supabase
        .from("academic_years")
        .select("id")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("school_id", schoolId)
        .eq("role", "enseignant")
        .order("last_name", { ascending: true }),
    ]);

    activeYearId = yearRes.data?.id || null;
    teachers = teachersRes.data || [];

    if (activeYearId) {
      const { data: periodsData } = await supabase
        .from("periods")
        .select("id, name, status, order_index")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYearId)
        .order("order_index", { ascending: true });

      periods = (periodsData || []) as PeriodItem[];
    }
  } catch {
    // Hors session / établissement : classesRes ci-dessous renverra l'erreur explicite
  }

  const classesRes = await getClasses(activeYearId || undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Notes, Moyennes &amp; Rangs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Saisissez les évaluations par classe et matière : moyennes, points et rangs sont
          calculés par le moteur centralisé SUKULU.
        </p>
      </div>

      <GradesClient
        classes={classesRes.data || []}
        periods={periods}
        teachers={teachers}
        activeYearId={activeYearId}
        loadError={classesRes.error}
      />
    </div>
  );
}
