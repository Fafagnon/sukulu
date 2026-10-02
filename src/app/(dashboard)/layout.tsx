import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, School } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/features/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const roleLabels: Record<string, { label: string; variant: "default" | "warning" | "info" }> = {
    direction: { label: "Direction", variant: "default" },
    enseignant: { label: "Enseignant", variant: "warning" },
    parent: { label: "Parent", variant: "info" },
    superadmin: { label: "SuperAdmin", variant: "default" },
  };

  const currentRole = profile?.role || (user?.app_metadata?.role as string) || "direction";
  const roleBadge = roleLabels[currentRole] || { label: currentRole, variant: "default" };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Barre de navigation supérieure unifiée */}
      <header className="border-b border-border bg-surface sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="relative w-36 h-10 block">
              <Image
                src="/logo.svg"
                alt="SUKULU"
                fill
                priority
                className="object-contain object-left"
              />
            </Link>

            {school && (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border text-xs text-foreground">
                <School className="h-4 w-4 text-brand-primary" />
                <span className="font-semibold">{school.name}</span>
                <span className="text-foreground-muted font-mono">({school.code})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={roleBadge.variant} className="text-xs uppercase tracking-wider">
              {roleBadge.label}
            </Badge>

            {profile && (
              <span className="hidden sm:inline-block text-xs font-medium text-foreground">
                {profile.first_name} {profile.last_name}
              </span>
            )}

            <form action={signOutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-xs text-foreground-muted hover:text-error"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Corps de page */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
