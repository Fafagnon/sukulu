import * as React from "react";
import Link from "next/link";
import { CheckSquare, Edit3, Calendar, GraduationCap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTeacherAttendanceContext } from "@/features/attendance/attendance-actions";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const contextRes = await getTeacherAttendanceContext();
  const context = contextRes.data;

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12">
      {/* En-tête mobile */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant="warning" className="text-[10px] font-bold">
            ESPACE ENSEIGNANT
          </Badge>
          {context?.academicYear && (
            <span className="text-[11px] font-mono text-foreground-muted">
              {context.academicYear.name}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Bonjour, {context?.teacherProfile.fullName || "Enseignant"}
        </h1>
        <p className="text-xs text-foreground-muted">
          Interface optimisée pour smartphone, mode classe et travail hors-connexion
        </p>
      </div>

      {/* Cartes d'action rapide */}
      <div className="space-y-3">
        {/* Action 1 : Faire l'Appel */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CheckSquare className="h-5 w-5" />
            </div>
            <Badge variant="success" className="text-[10px]">
              Hors-Ligne Compatible
            </Badge>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Faire l&apos;Appel</h2>
            <p className="text-xs text-foreground-muted">
              Pointez les présences et absences de vos élèves. Fonctionne même en cas de coupure réseau en classe.
            </p>
          </div>
          <Link
            href="/teacher/attendance"
            className="w-full h-10 rounded-md text-xs font-bold text-white bg-[#002B5B] hover:bg-[#002047] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Démarrer l&apos;appel de la séance</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>

        {/* Action 2 : Saisir les Notes */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-brand-primary-subtle text-brand-primary flex items-center justify-center">
              <Edit3 className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Notes Pédagogiques
            </Badge>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Saisir les Notes</h2>
            <p className="text-xs text-foreground-muted">
              Renseignez les notes de contrôles continus et compositions avec calcul automatique des moyennes.
            </p>
          </div>
          <Link
            href="/admin/grades"
            className="w-full h-10 rounded-md text-xs font-semibold text-foreground border border-border bg-surface hover:bg-surface-subtle flex items-center justify-center transition-colors shadow-2xs"
          >
            <span>Accéder à la grille de notes</span>
          </Link>
        </div>

        {/* Action 3 : Planning */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-brand-accent-subtle text-brand-accent flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Planning
            </Badge>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Mon Emploi du Temps</h2>
            <p className="text-xs text-foreground-muted">
              Consultez vos créneaux de cours, matières et salles de la semaine.
            </p>
          </div>
          <Link
            href="/admin/timetable"
            className="w-full h-10 rounded-md text-xs font-semibold text-foreground bg-surface-subtle hover:bg-slate-200/80 flex items-center justify-center transition-colors"
          >
            <span>Voir mon planning hebdomadaire</span>
          </Link>
        </div>
      </div>

      {/* Mes Classes */}
      {context && context.classes.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Mes Classes Affectées ({context.classes.length})
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {context.classes.map((cls) => (
              <Link
                key={cls.id}
                href="/teacher/attendance"
                className="p-3 bg-surface rounded-xl border border-border hover:border-slate-300 transition-colors shadow-2xs group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1 rounded-md bg-slate-100 text-brand-primary">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-brand-primary truncate">
                    {cls.name}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted">
                  {cls.totalEnrolled} élève{cls.totalEnrolled > 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
