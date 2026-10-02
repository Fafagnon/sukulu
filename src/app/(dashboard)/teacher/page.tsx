import * as React from "react";
import { CheckSquare, Edit3, Calendar, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TeacherDashboardPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* En-tête mobile */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant="warning" className="text-[10px]">
            ESPACE ENSEIGNANT
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-success font-medium">
            <Wifi className="h-3.5 w-3.5" />
            <span>En ligne</span>
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Mes Actions Rapides
        </h1>
        <p className="text-xs text-foreground-muted">
          Interface optimisée pour smartphone et travail en classe
        </p>
      </div>

      {/* Cartes d'action rapide */}
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-success-bg text-success flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Quotidien
            </Badge>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Faire l&apos;Appel</h2>
            <p className="text-xs text-foreground-muted">
              Pointez les présences et absences de votre séance actuelle.
            </p>
          </div>
          <Button variant="default" className="w-full text-xs justify-center">
            Démarrer l&apos;appel de la séance
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-brand-primary-subtle text-brand-primary flex items-center justify-center">
              <Edit3 className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Trimestre 1
            </Badge>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Saisir les Notes</h2>
            <p className="text-xs text-foreground-muted">
              Saisissez les contrôles continus et compositions de vos classes.
            </p>
          </div>
          <Button variant="outline" className="w-full text-xs justify-center">
            Accéder à la grille de notes
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-brand-accent-subtle text-brand-accent flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Mon Emploi du Temps</h2>
            <p className="text-xs text-foreground-muted">
              Consultez vos créneaux de cours et salles de la semaine.
            </p>
          </div>
          <Button variant="secondary" className="w-full text-xs justify-center">
            Voir mon planning hebdomadaire
          </Button>
        </div>
      </div>
    </div>
  );
}
