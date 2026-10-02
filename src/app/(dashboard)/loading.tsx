import * as React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* En-tête de page skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200/80 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-slate-200/60 rounded-md" />
        </div>
        <div className="h-10 w-36 bg-slate-200/80 rounded-xl shrink-0" />
      </div>

      {/* Cartes KPI stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-200/70 rounded-md" />
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-7 w-16 bg-slate-200/90 rounded-md" />
            <div className="h-3 w-32 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* Tableau / Carte principale skeleton */}
      <div className="rounded-2xl bg-white border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="h-9 w-72 max-w-full bg-slate-100 rounded-xl" />
          <div className="h-8 w-24 bg-slate-100 rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200/80 rounded-md" />
                  <div className="h-3 w-28 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="h-4 w-24 bg-slate-100 rounded-md hidden sm:block" />
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
