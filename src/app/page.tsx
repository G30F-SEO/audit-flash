"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Zap } from "lucide-react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = domain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
    if (clean) {
      router.push(`/audit/${encodeURIComponent(clean)}`);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[#F8FAFC]">
      <main className="flex flex-1 w-full max-w-2xl flex-col items-center justify-center px-6 py-20 gap-10">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#1A2744] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#1A2744] tracking-tight">
              H-TIC Digital
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A2744] text-center mt-6 leading-tight">
            Audit Flash
          </h1>
          <p className="text-lg text-[#64748B] text-center max-w-md">
            Diagnostic SEO en 20 secondes. Entrez un nom de domaine pour obtenir un rapport complet.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-lg">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="exemple.fr"
                className="w-full h-13 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-[#1E293B] text-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent shadow-sm"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="h-13 px-6 rounded-xl bg-[#2E86C1] text-white font-semibold text-base hover:bg-[#2573A7] transition-colors shadow-sm cursor-pointer"
            >
              Lancer l&apos;audit
            </button>
          </div>
        </form>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 text-center mt-4">
          {[
            { n: "Lighthouse", d: "Performance, accessibilite, SEO" },
            { n: "Mots-cles", d: "Positions et trafic organique" },
            { n: "On-page", d: "Balises, securite, vitesse" },
          ].map((f) => (
            <div key={f.n} className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#1A2744]">{f.n}</span>
              <span className="text-xs text-[#64748B]">{f.d}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-[#64748B] border-t border-slate-100">
        H-TIC Digital — Agence Webmarketing
      </footer>
    </div>
  );
}
