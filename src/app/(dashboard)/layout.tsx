import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type SchoolRow = Database["public"]["Tables"]["schools"]["Row"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;
  let school: SchoolRow | null = null;

  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    profile = profileData;

    if (profile?.school_id) {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .eq("id", profile.school_id)
        .maybeSingle();

      school = schoolData;
    }
  }

  const schoolName = school?.name || "Mon Établissement";
  const schoolCode = school?.short_name || school?.code || "SUKULU";
  const userName = profile ? `${profile.first_name} ${profile.last_name}` : "Direction";
  const userRole = profile?.role || "direction";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Barre latérale permanente sur grand écran, escamotable sur mobile */}
      <Sidebar
        schoolName={schoolName}
        schoolCode={schoolCode}
        userName={userName}
        userRole={userRole}
      />

      {/* Conteneur principal décalé de la largeur de la sidebar sur grand écran */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
