"use client";

import { useEffect, useState, use } from "react";
import { Printer, Zap, ExternalLink, ArrowLeft } from "lucide-react";
import ScoreGauge from "@/components/score-gauge";
import CheckItem from "@/components/check-item";
import KpiCard from "@/components/kpi-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types (mirrors API response)
// ---------------------------------------------------------------------------

interface AuditResult {
  domain: string;
  timestamp: string;
  scores: {
    global: number;
    onpage: number;
    rankings: number;
    performance: number;
    usability: number;
    social: number;
  };
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  cwv: {
    fcp: number;
    lcp: number;
    cls: number;
    tbt: number;
    ttfb: number;
    speedIndex: number;
    totalWeight: number;
  };
  checks: {
    title: { value: string; length: number; ok: boolean };
    description: { value: string; length: number; ok: boolean };
    h1: { value: string; count: number; ok: boolean };
    ssl: boolean;
    canonical: boolean;
    robots: boolean;
    sitemap: boolean;
    viewport: boolean;
    favicon: boolean;
    analytics: boolean;
    imagesWithoutAlt: number;
    totalImages: number;
  };
  keywords: {
    total: number;
    top3: number;
    top10: number;
    top50: number;
    top100: number;
    estimatedTraffic: number;
    topKeywords: Array<{
      keyword: string;
      position: number;
      volume: number;
      traffic: number;
      url: string;
    }>;
  };
  social: {
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    youtube: string | null;
    twitter: string | null;
    og: boolean;
  };
  server: {
    cms: string;
    server: string;
    encoding: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
}

function posBadgeColor(pos: number) {
  if (pos <= 3) return "bg-green-100 text-green-800";
  if (pos <= 10) return "bg-blue-100 text-blue-800";
  if (pos <= 20) return "bg-orange-100 text-orange-800";
  return "bg-slate-100 text-slate-600";
}

function barColor(pos: number) {
  if (pos <= 3) return "#28A745";
  if (pos <= 10) return "#2E86C1";
  if (pos <= 20) return "#F39C12";
  return "#94A3B8";
}

function truncateUrl(url: string, max = 40) {
  if (!url) return "-";
  const clean = url.replace(/^https?:\/\//, "");
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

// ---------------------------------------------------------------------------
// Loading skeleton used during fetch
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  const msgs = [
    "Analyse du site...",
    "Test Lighthouse...",
    "Collecte des mots-cles...",
    "Analyse des concurrents...",
    "Calcul du score...",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, msgs.length - 1)), 3500);
    return () => clearInterval(t);
  }, [msgs.length]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[#F8FAFC] min-h-screen gap-8">
      <div className="relative">
        <svg width={160} height={160} className="animate-pulse-slow">
          <circle cx={80} cy={80} r={70} fill="none" stroke="#E5E7EB" strokeWidth={10} />
          <circle
            cx={80} cy={80} r={70} fill="none" stroke="#2E86C1" strokeWidth={10}
            strokeDasharray={440} strokeDashoffset={320} strokeLinecap="round"
            className="animate-spin" style={{ transformOrigin: "center", animationDuration: "3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-8 h-8 text-[#2E86C1]" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-semibold text-[#1A2744]">{msgs[step]}</p>
        <div className="flex gap-1.5">
          {msgs.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "w-8 bg-[#2E86C1]" : "w-4 bg-slate-200"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-[#1A2744] mb-3 border-b border-slate-200 pb-1.5">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AuditPage({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = use(params);
  const domain = decodeURIComponent(resolvedParams.domain);
  const [data, setData] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });
        if (!res.ok) throw new Error("Erreur API");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [domain]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-4">
        <p className="text-lg text-red-600 font-semibold">Erreur : {error}</p>
        <a href="/" className="text-[#2E86C1] underline">Retour</a>
      </div>
    );
  }

  if (!data) return <LoadingSkeleton />;

  const chartData = data.keywords.topKeywords.slice(0, 10).map((kw) => ({
    keyword: kw.keyword.length > 20 ? kw.keyword.slice(0, 18) + "..." : kw.keyword,
    traffic: kw.traffic,
    position: kw.position,
  }));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ---- Header ---- */}
      <header className="bg-[#1A2744] text-white px-6 py-3 flex items-center justify-between no-print:sticky no-print:top-0 no-print:z-50 print:bg-[#1A2744]">
        <div className="flex items-center gap-3">
          <a href="/" className="no-print">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-semibold">Audit Flash</span>
            <span className="mx-2 text-white/40">|</span>
            <span className="text-sm font-bold">{data.domain}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/60">{formatDate(data.timestamp)}</span>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
            style={{
              backgroundColor:
                data.scores.global >= 80 ? "#28A745" : data.scores.global >= 50 ? "#F39C12" : "#DC3545",
            }}
          >
            {data.scores.global}/100
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* ---- Row 1 : Score global ---- */}
        <Section title="Score global">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative flex items-center justify-center">
              <ScoreGauge score={data.scores.global} label="Score global" size="lg" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1">
              {(
                [
                  ["On-page", data.scores.onpage],
                  ["Positionnement", data.scores.rankings],
                  ["Performance", data.scores.performance],
                  ["Ergonomie", data.scores.usability],
                  ["Social", data.scores.social],
                ] as const
              ).map(([label, score]) => (
                <div key={label} className="relative flex items-center justify-center">
                  <ScoreGauge score={score} label={label} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ---- Row 2 : Lighthouse ---- */}
        <Section title="Scores Lighthouse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(
              [
                ["Performance", data.lighthouse.performance],
                ["Accessibilite", data.lighthouse.accessibility],
                ["Bonnes pratiques", data.lighthouse.bestPractices],
                ["SEO", data.lighthouse.seo],
              ] as const
            ).map(([label, score]) => (
              <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <ScoreGauge score={score} label={label} size="md" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Row 3 : Core Web Vitals ---- */}
        <Section title="Core Web Vitals">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              value={formatMs(data.cwv.lcp)}
              label="LCP (Largest Contentful Paint)"
              threshold={{ good: 2500, bad: 4000 }}
              numericValue={data.cwv.lcp}
            />
            <KpiCard
              value={data.cwv.cls.toFixed(3)}
              label="CLS (Cumulative Layout Shift)"
              threshold={{ good: 0.1, bad: 0.25, unit: "" }}
              numericValue={data.cwv.cls}
            />
            <KpiCard
              value={formatMs(data.cwv.fcp)}
              label="FCP (First Contentful Paint)"
              threshold={{ good: 1800, bad: 3000 }}
              numericValue={data.cwv.fcp}
            />
            <KpiCard
              value={formatMs(data.cwv.ttfb)}
              label="TTFB (Time to First Byte)"
              threshold={{ good: 800, bad: 1800 }}
              numericValue={data.cwv.ttfb}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <KpiCard value={formatMs(data.cwv.tbt)} label="TBT (Total Blocking Time)" />
            <KpiCard value={formatMs(data.cwv.speedIndex)} label="Speed Index" />
            <KpiCard value={formatBytes(data.cwv.totalWeight)} label="Poids total de la page" />
          </div>
        </Section>

        {/* ---- Row 4 : Checks on-page ---- */}
        <Section title="Verification on-page">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <CheckItem
              ok={data.checks.title.ok}
              label="Balise Title"
              detail={data.checks.title.value ? `${data.checks.title.value} (${data.checks.title.length} car.)` : "Absente"}
            />
            <CheckItem
              ok={data.checks.description.ok}
              label="Meta Description"
              detail={data.checks.description.value ? `${data.checks.description.length} caracteres` : "Absente"}
            />
            <CheckItem
              ok={data.checks.h1.ok}
              label="Balise H1"
              detail={data.checks.h1.count === 1 ? data.checks.h1.value : `${data.checks.h1.count} H1 detecte(s)`}
            />
            <CheckItem ok={data.checks.ssl} label="HTTPS / SSL" />
            <CheckItem ok={data.checks.canonical} label="Canonical" />
            <CheckItem ok={data.checks.robots} label="Robots (indexable)" />
            <CheckItem ok={data.checks.sitemap} label="Sitemap" />
            <CheckItem ok={data.checks.viewport} label="Viewport" />
            <CheckItem ok={data.checks.favicon} label="Favicon" />
            <CheckItem ok={data.checks.analytics} label="Google Analytics" />
            <CheckItem
              ok={data.checks.totalImages === 0 || data.checks.imagesWithoutAlt / data.checks.totalImages < 0.5}
              label="Images alt"
              detail={`${data.checks.imagesWithoutAlt} sans alt / ${data.checks.totalImages} images`}
            />
          </div>
        </Section>

        {/* ---- Row 5 : Mots-cles ---- */}
        <Section title="Top mots-cles">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <KpiCard value={data.keywords.total.toLocaleString("fr-FR")} label="Mots-cles totaux" />
            <KpiCard value={data.keywords.top3} label="Top 3" />
            <KpiCard value={data.keywords.top10} label="Top 10" />
            <KpiCard value={data.keywords.top50} label="Top 50" />
            <KpiCard value={Math.round(data.keywords.estimatedTraffic).toLocaleString("fr-FR")} label="Trafic estime / mois" />
          </div>

          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm mb-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="keyword" type="category" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${value} visites/mois`, "Trafic"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="traffic" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={barColor(entry.position)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.keywords.topKeywords.length > 0 && (
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-[#64748B] uppercase">
                    <th className="px-4 py-2">Mot-cle</th>
                    <th className="px-4 py-2 text-center">Position</th>
                    <th className="px-4 py-2 text-right">Volume</th>
                    <th className="px-4 py-2 text-right">Trafic</th>
                    <th className="px-4 py-2">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.keywords.topKeywords.map((kw, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-medium text-[#1E293B]">{kw.keyword}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${posBadgeColor(kw.position)}`}>
                          {kw.position}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">{kw.volume.toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-2 text-right font-medium">{Math.round(kw.traffic).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">
                        <a
                          href={kw.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-[#2E86C1]"
                        >
                          {truncateUrl(kw.url)} <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ---- Row 6 : Infos serveur ---- */}
        <Section title="Informations serveur">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard value={data.server.cms} label="CMS" />
            <KpiCard value={data.server.server} label="Serveur" />
            <KpiCard value={data.server.encoding} label="Encodage" />
            <KpiCard value={formatBytes(data.cwv.totalWeight)} label="Poids page" />
          </div>
        </Section>

        {/* ---- Footer ---- */}
        <footer className="text-center text-xs text-[#64748B] py-6 border-t border-slate-100 mt-2">
          Audit realise par H-TIC Digital — h-tic.fr — {formatDate(data.timestamp)}
        </footer>
      </div>
    </div>
  );
}
