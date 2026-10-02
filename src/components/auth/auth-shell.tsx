"use client";

import * as React from "react";

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Conteneur épuré centré, sans texte superflu ni décorations parasites */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-200/80 shadow-[0_12px_40px_rgba(0,43,91,0.06)] p-6 sm:p-8 transition-all">
        {children}
      </div>
    </main>
  );
}
