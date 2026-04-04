"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

const messages = [
  "Analyse du site...",
  "Test Lighthouse...",
  "Collecte des mots-cles...",
  "Analyse des concurrents...",
  "Calcul du score...",
];

export default function AuditLoading() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < messages.length - 1 ? s + 1 : s));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[#F8FAFC] min-h-screen gap-8">
      {/* Pulsing score circle */}
      <div className="relative">
        <svg width={160} height={160} className="animate-pulse-slow">
          <circle cx={80} cy={80} r={70} fill="none" stroke="#E5E7EB" strokeWidth={10} />
          <circle
            cx={80}
            cy={80}
            r={70}
            fill="none"
            stroke="#2E6AB0"
            strokeWidth={10}
            strokeDasharray={440}
            strokeDashoffset={320}
            strokeLinecap="round"
            className="animate-spin"
            style={{ transformOrigin: "center", animationDuration: "3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-8 h-8 text-[#2E6AB0]" />
        </div>
      </div>

      {/* Progress messages */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-semibold text-[#1A2744]">{messages[step]}</p>
        <div className="flex gap-1.5">
          {messages.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= step ? "w-8 bg-[#2E6AB0]" : "w-4 bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-4xl px-6 grid grid-cols-4 gap-4 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="w-full max-w-4xl px-6 grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
