import * as React from "react";
import { Badge } from "@/components/ui/badge";

export default function ParentDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <Badge variant="info" className="text-[10px]">
          PORTAIL PARENT / TUTEUR
        </Badge>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Suivi Scolaire de vos Enfants
        </h1>
        <p className="text-xs sm:text-sm text-foreground-muted">
          Consultez les notes, bulletins officiels, assiduité et situation financière de vos enfants rattachés.
        </p>
      </div>

      {/* Carte exemple enfant */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-brand-primary-subtle text-brand-primary flex items-center justify-center font-bold text-base">
              KM
            </div>
            <div>
              <div className="text-base font-bold text-foreground">Koffi Mensah</div>
              <div className="text-xs text-foreground-muted">
                Classe : <span className="font-semibold text-foreground">3ème A</span> • Matricule :{" "}
                <span className="font-mono">SUK-2026-0042</span>
              </div>
            </div>
          </div>

          <Badge variant="success">Inscrit — Année 2026-2027</Badge>
        </div>

        {/* Résumé des 4 piliers élève */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Moyenne T1
            </div>
            <div className="text-lg font-bold text-foreground">15,40 / 20</div>
            <div className="text-[11px] text-success font-medium">3ème / 42 élèves</div>
          </div>

          <div className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Assiduité
            </div>
            <div className="text-lg font-bold text-foreground">1 Absence</div>
            <div className="text-[11px] text-foreground-muted">Justifiée</div>
          </div>

          <div className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Scolarité
            </div>
            <div className="text-lg font-bold text-foreground">100 000 F</div>
            <div className="text-[11px] text-warning font-medium">Reste : 50 000 F</div>
          </div>

          <div className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Bulletin T1
            </div>
            <div className="text-sm font-bold text-foreground">Disponible</div>
            <button className="text-[11px] text-brand-primary font-semibold hover:underline block">
              Télécharger PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
