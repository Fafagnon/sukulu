import * as React from "react";
import { getClasses } from "@/features/academic/actions";
import { getSubjects } from "@/features/academic/subjects-actions";
import { getTimetableSlots } from "@/features/academic/timetable-actions";
import { createClient } from "@/lib/supabase/server";
import { TimetableClient } from "./timetable-client";

export default async function TimetablePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teachers: Array<{ id: string; first_name: string; last_name: string; email: string }> = [];
  let activeYear: { id: string; name: string } | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.school_id) {
      const [teachersRes, yearRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("school_id", profile.school_id)
          .eq("role", "enseignant"),
        supabase
          .from("academic_years")
          .select("id, name")
          .eq("school_id", profile.school_id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      teachers = teachersRes.data || [];
      activeYear = yearRes.data;
    }
  }

  const [classesRes, subjectsRes, slotsRes] = await Promise.all([
    getClasses(activeYear?.id),
    getSubjects(),
    getTimetableSlots({ academicYearId: activeYear?.id }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Planification des Emplois du Temps
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Organisez les créneaux horaires hebdomadaires par classe et par enseignant avec le moteur de détection anti-conflits.
        </p>
      </div>

      <TimetableClient
        classes={classesRes.data || []}
        subjects={subjectsRes.data || []}
        teachers={teachers}
        initialSlots={(slotsRes.data as unknown as any[]) || []}
        activeYear={activeYear}
        loadError={slotsRes.error}
      />
    </div>
  );
}
