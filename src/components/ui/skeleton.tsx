import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Composant de base Skeleton atomique.
 * Affiche une surface pulsatile douce respectant les espacements et angles du design system.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Squelette composé pour les tableaux de données scolaires (élèves, notes, finances).
 * Reproduit la barre d'outils, l'en-tête du tableau et N lignes de données pour éviter tout CLS.
 */
export function TableSkeleton({
  rowCount = 5,
  columnCount = 6,
  className,
}: {
  rowCount?: number;
  columnCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Barre d'outils (recherche, filtres, actions) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Skeleton className="h-10 w-full sm:w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Structure du tableau */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
        {/* En-tête */}
        <div className="border-b border-border bg-surface-subtle/60 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {Array.from({ length: columnCount }).map((_, i) => (
              <Skeleton
                key={`th-${i}`}
                className={cn("h-4", i === 0 ? "w-32" : "w-20")}
              />
            ))}
          </div>
        </div>

        {/* Lignes de données fantômes */}
        <div className="divide-y divide-border">
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <div
              key={`tr-${rowIdx}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              {Array.from({ length: columnCount }).map((_, colIdx) => (
                <Skeleton
                  key={`td-${rowIdx}-${colIdx}`}
                  className={cn(
                    "h-4",
                    colIdx === 0
                      ? "w-36"
                      : colIdx === columnCount - 1
                      ? "w-16"
                      : "w-24"
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Squelette composé pour les cartes statistiques et KPI de direction.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 space-y-3 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

/**
 * Squelette composé pour les formulaires de saisie ou modales.
 */
export function FormSkeleton({
  fieldCount = 4,
  className,
}: {
  fieldCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fieldCount }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Squelette pour l'en-tête de page standard (titre, fil d'Ariane, bouton d'action).
 */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border",
        className
      )}
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}
