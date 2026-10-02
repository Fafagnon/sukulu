import * as React from "react";
import { getSubjects } from "@/features/academic/subjects-actions";
import { getClasses } from "@/features/academic/actions";
import { createClient } from "@/lib/supabase/server";
import { SubjectsClient } from "./subjects-client";

export default async function SubjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teachers: Array<{ id: string; first_name: string; last_name: string; email: string }> = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.school_id) {
      const { data: teachersData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("school_id", profile.school_id)
        .eq("role", "enseignant");

      teachers = teachersData || [];
    }
  }

  const [subjectsRes, classesRes] = await Promise.all([
    getSubjects(),
    getClasses(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Catalogue des Matières &amp; Coefficients
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gérez le référentiel des disciplines scolaires et paramétrez les coefficients officiels par classe.
        </p>
      </div>

      <SubjectsClient
        initialSubjects={subjectsRes.data || []}
        classes={classesRes.data || []}
        teachers={teachers}
        loadError={subjectsRes.error}
      />
    </div>
  );
}
