import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée racine :
 * Oriente immédiatement l'utilisateur vers son espace de travail ou vers la connexion.
 */
export default async function HomePage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.school_id) {
      redirect("/onboarding");
    }

    if (profile.role === "enseignant") {
      redirect("/teacher");
    } else if (profile.role === "parent") {
      redirect("/parent");
    }

    redirect("/admin");
  } catch {
    redirect("/login");
  }
}
