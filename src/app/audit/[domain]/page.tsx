"use client";

import { useEffect, useState, use } from "react";
import { Printer, Zap, ExternalLink, ArrowLeft, TrendingUp, Target, Shield, Sparkles } from "lucide-react";
import ScoreGauge from "@/components/score-gauge";
import CheckItem from "@/components/check-item";
import KpiCard from "@/components/kpi-card";
import AnimatedCounter from "@/components/animated-counter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  ReferenceLine,
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
  aiRecommendations: string | null;
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

function scoreColor(score: number) {
  if (score >= 80) return "#28A745";
  if (score >= 50) return "#F39C12";
  return "#DC3545";
}

// ---------------------------------------------------------------------------
// Loading skeleton used during fetch
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  const msgs = [
    "Analyse du site...",
    "Test Lighthouse...",
    "Collecte des mots-cles...",
    "Generation des recommandations IA...",
    "Calcul du score...",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, msgs.length - 1)), 4000);
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
// Section wrapper with animated entrance
// ---------------------------------------------------------------------------

function Section({ title, icon, children, className = "" }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={`mb-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className}`}>
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
        {icon}
        <h2 className="text-lg font-bold text-[#1A2744]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Staggered fade-in wrapper
// ---------------------------------------------------------------------------

function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={`transition-all duration-600 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {children}
    </div>
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

  // -- Prepare chart data --

  const radarData = [
    { subject: "On-page", value: data.scores.onpage, fullMark: 100 },
    { subject: "Positionnement", value: data.scores.rankings, fullMark: 100 },
    { subject: "Performance", value: data.scores.performance, fullMark: 100 },
    { subject: "Ergonomie", value: data.scores.usability, fullMark: 100 },
    { subject: "Social", value: data.scores.social, fullMark: 100 },
  ];

  const keywordDistribution = [
    { name: "Top 3", value: data.keywords.top3, fill: "#28A745" },
    { name: "Top 4-10", value: Math.max(0, data.keywords.top10 - data.keywords.top3), fill: "#2E86C1" },
    { name: "Top 11-50", value: Math.max(0, data.keywords.top50 - data.keywords.top10), fill: "#F39C12" },
    { name: "Top 51-100", value: Math.max(0, data.keywords.top100 - data.keywords.top50), fill: "#94A3B8" },
  ].filter(d => d.value > 0);

  const cwvChartData = [
    { name: "TTFB", value: data.cwv.ttfb, good: 800, bad: 1800 },
    { name: "FCP", value: data.cwv.fcp, good: 1800, bad: 3000 },
    { name: "LCP", value: data.cwv.lcp, good: 2500, bad: 4000 },
    { name: "TBT", value: data.cwv.tbt, good: 200, bad: 600 },
  ];

  const lighthouseBarData = [
    { name: "Performance", score: data.lighthouse.performance },
    { name: "Accessibilite", score: data.lighthouse.accessibility },
    { name: "Bonnes pratiques", score: data.lighthouse.bestPractices },
    { name: "SEO", score: data.lighthouse.seo },
  ];

  const trafficChartData = data.keywords.topKeywords.slice(0, 10).map((kw) => ({
    keyword: kw.keyword.length > 20 ? kw.keyword.slice(0, 18) + "..." : kw.keyword,
    traffic: kw.traffic,
    volume: kw.volume,
    position: kw.position,
  }));

  const checksCount = [
    data.checks.title.ok, data.checks.description.ok, data.checks.h1.ok,
    data.checks.ssl, data.checks.canonical, data.checks.robots,
    data.checks.sitemap, data.checks.viewport, data.checks.favicon, data.checks.analytics,
  ];
  const passedChecks = checksCount.filter(Boolean).length;
  const totalChecks = checksCount.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* ---- Header ---- */}
      <header className="bg-gradient-to-r from-[#1A2744] to-[#2E4A6E] text-white px-6 py-4 flex items-center justify-between no-print:sticky no-print:top-0 no-print:z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <a href="/" className="no-print hover:bg-white/10 p-1.5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-semibold opacity-80">Audit Flash</span>
            <span className="mx-2 text-white/30">|</span>
            <span className="text-base font-bold">{data.domain}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/60 hidden sm:block">{formatDate(data.timestamp)}</span>
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
            style={{ backgroundColor: scoreColor(data.scores.global) }}
          >
            {data.scores.global}/100
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer backdrop-blur"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ---- Hero: Score global + Radar ---- */}
        <FadeIn delay={0}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Big score */}
              <div className="flex flex-col items-center gap-2">
                <ScoreGauge score={data.scores.global} label="Score global" size="lg" />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: scoreColor(data.scores.global) + "20", color: scoreColor(data.scores.global) }}>
                    {data.scores.global >= 80 ? "Excellent" : data.scores.global >= 60 ? "Correct" : data.scores.global >= 40 ? "A ameliorer" : "Critique"}
                  </span>
                </div>
              </div>

              {/* Radar chart */}
              <div className="flex-1 w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#475569" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="#2E86C1"
                      fill="#2E86C1"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#2E86C1" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Mini scores */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 min-w-[160px]">
                {([
                  ["On-page", data.scores.onpage],
                  ["Positionnement", data.scores.rankings],
                  ["Performance", data.scores.performance],
                  ["Ergonomie", data.scores.usability],
                  ["Social", data.scores.social],
                ] as const).map(([label, score]) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: scoreColor(score) }}>
                      {score}
                    </div>
                    <span className="text-xs font-medium text-slate-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ---- Lighthouse scores as horizontal bars ---- */}
        <FadeIn delay={150}>
          <Section title="Scores Lighthouse" icon={<Target className="w-5 h-5 text-[#2E86C1]" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lighthouseBarData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: "#475569" }} />
                    <Tooltip
                      formatter={(value) => [`${value}/100`, "Score"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                    />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={1500}>
                      {lighthouseBarData.map((entry, idx) => (
                        <Cell key={idx} fill={scoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ["Performance", data.lighthouse.performance],
                  ["Accessibilite", data.lighthouse.accessibility],
                  ["Bonnes pratiques", data.lighthouse.bestPractices],
                  ["SEO", data.lighthouse.seo],
                ] as const).map(([label, score]) => (
                  <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center justify-center">
                    <ScoreGauge score={score} label={label} size="md" />
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </FadeIn>

        {/* ---- Core Web Vitals ---- */}
        <FadeIn delay={300}>
          <Section title="Core Web Vitals" icon={<TrendingUp className="w-5 h-5 text-[#2E86C1]" />}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CWV Bar chart with thresholds */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cwvChartData} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <Tooltip
                      formatter={(value) => [formatMs(Number(value)), "Valeur"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60} animationDuration={1500}>
                      {cwvChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.value <= entry.good ? "#28A745" : entry.value <= entry.bad ? "#F39C12" : "#DC3545"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* KPI cards */}
              <div className="flex flex-col gap-3">
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
                <KpiCard value={formatMs(data.cwv.tbt)} label="TBT (Total Blocking Time)" />
                <KpiCard value={formatMs(data.cwv.speedIndex)} label="Speed Index" />
                <KpiCard value={formatBytes(data.cwv.totalWeight)} label="Poids total" />
              </div>
            </div>
          </Section>
        </FadeIn>

        {/* ---- Checks on-page ---- */}
        <FadeIn delay={450}>
          <Section title="Verification on-page" icon={<Shield className="w-5 h-5 text-[#2E86C1]" />}>
            {/* Summary bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">
                  <AnimatedCounter value={passedChecks} className="text-lg font-bold" /> / {totalChecks} verifications reussies
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: scoreColor(data.scores.onpage) + "20", color: scoreColor(data.scores.onpage) }}>
                  {data.scores.onpage}/100
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${(passedChecks / totalChecks) * 100}%`,
                    backgroundColor: scoreColor(data.scores.onpage),
                  }}
                />
              </div>
            </div>

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
        </FadeIn>

        {/* ---- Mots-cles ---- */}
        <FadeIn delay={600}>
          <Section title="Analyse des mots-cles" icon={<TrendingUp className="w-5 h-5 text-[#2E86C1]" />}>
            {/* Big KPIs with animated counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-4 shadow-md">
                <AnimatedCounter value={data.keywords.total} className="text-2xl font-bold block" />
                <span className="text-xs opacity-80 mt-1 block">Mots-cles totaux</span>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-4 shadow-md">
                <AnimatedCounter value={data.keywords.top3} className="text-2xl font-bold block" />
                <span className="text-xs opacity-80 mt-1 block">Top 3</span>
              </div>
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-2xl p-4 shadow-md">
                <AnimatedCounter value={data.keywords.top10} className="text-2xl font-bold block" />
                <span className="text-xs opacity-80 mt-1 block">Top 10</span>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-2xl p-4 shadow-md">
                <AnimatedCounter value={data.keywords.top50} className="text-2xl font-bold block" />
                <span className="text-xs opacity-80 mt-1 block">Top 50</span>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-4 shadow-md">
                <AnimatedCounter value={Math.round(data.keywords.estimatedTraffic)} className="text-2xl font-bold block" />
                <span className="text-xs opacity-80 mt-1 block">Trafic estime/mois</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Bar chart: top keywords traffic */}
              {trafficChartData.length > 0 && (
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-80">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Trafic par mot-cle (top 10)</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={trafficChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                      <YAxis dataKey="keyword" type="category" width={140} tick={{ fontSize: 11, fill: "#475569" }} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "traffic" ? `${Math.round(Number(value))} visites/mois` : Number(value).toLocaleString("fr-FR"),
                          name === "traffic" ? "Trafic" : "Volume",
                        ]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                      />
                      <Bar dataKey="traffic" radius={[0, 6, 6, 0]} maxBarSize={22} animationDuration={1500}>
                        {trafficChartData.map((entry, idx) => (
                          <Cell key={idx} fill={barColor(entry.position)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie chart: keyword distribution */}
              {keywordDistribution.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-80">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Repartition des positions</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={keywordDistribution}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={1500}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {keywordDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Keywords table */}
            {data.keywords.topKeywords.length > 0 && (
              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-[#64748B] uppercase bg-slate-50/50">
                      <th className="px-4 py-3">Mot-cle</th>
                      <th className="px-4 py-3 text-center">Position</th>
                      <th className="px-4 py-3 text-right">Volume</th>
                      <th className="px-4 py-3 text-right">Trafic</th>
                      <th className="px-4 py-3">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keywords.topKeywords.map((kw, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-[#1E293B]">{kw.keyword}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${posBadgeColor(kw.position)}`}>
                            {kw.position}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{kw.volume.toLocaleString("fr-FR")}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{Math.round(kw.traffic).toLocaleString("fr-FR")}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">
                          <a href={kw.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#2E86C1] transition-colors">
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
        </FadeIn>

        {/* ---- AI Recommendations ---- */}
        {data.aiRecommendations && (
          <FadeIn delay={750}>
            <Section title="Recommandations IA" icon={<Sparkles className="w-5 h-5 text-amber-500" />}>
              <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl border border-amber-200/50 shadow-sm p-6">
                <div className="prose prose-sm prose-slate max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[#1A2744] [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#1A2744] [&_h3]:text-sm [&_h3]:font-semibold [&_strong]:text-[#1A2744] [&_li]:text-slate-600 [&_p]:text-slate-600">
                  {data.aiRecommendations.split("\n").map((line, i) => {
                    if (line.startsWith("# ")) return <h1 key={i}>{line.slice(2)}</h1>;
                    if (line.startsWith("## ")) return <h2 key={i} className="mt-4">{line.slice(3)}</h2>;
                    if (line.startsWith("### ")) return <h3 key={i} className="mt-3">{line.slice(4)}</h3>;
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold mt-3">{line.slice(2, -2)}</p>;
                    if (line.startsWith("- ") || line.startsWith("* ")) {
                      const content = line.slice(2);
                      const parts = content.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 my-1">
                          <span className="text-amber-500 mt-0.5">&#8226;</span>
                          <span>
                            {parts.map((part, j) =>
                              part.startsWith("**") && part.endsWith("**")
                                ? <strong key={j}>{part.slice(2, -2)}</strong>
                                : <span key={j}>{part}</span>
                            )}
                          </span>
                        </div>
                      );
                    }
                    if (line.match(/^\d+\.\s/)) {
                      const content = line.replace(/^\d+\.\s/, "");
                      const parts = content.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 my-1">
                          <span className="text-amber-600 font-semibold min-w-[1.2em]">{line.match(/^\d+/)?.[0]}.</span>
                          <span>
                            {parts.map((part, j) =>
                              part.startsWith("**") && part.endsWith("**")
                                ? <strong key={j}>{part.slice(2, -2)}</strong>
                                : <span key={j}>{part}</span>
                            )}
                          </span>
                        </div>
                      );
                    }
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </div>
            </Section>
          </FadeIn>
        )}

        {/* ---- Infos serveur ---- */}
        <FadeIn delay={900}>
          <Section title="Informations serveur">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard value={data.server.cms} label="CMS" />
              <KpiCard value={data.server.server} label="Serveur" />
              <KpiCard value={data.server.encoding} label="Encodage" />
              <KpiCard value={formatBytes(data.cwv.totalWeight)} label="Poids page" />
            </div>
          </Section>
        </FadeIn>

        {/* ---- Footer ---- */}
        <footer className="text-center text-xs text-[#64748B] py-8 border-t border-slate-100 mt-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-5 h-5 rounded bg-[#1A2744] flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-[#1A2744]">H-TIC Digital</span>
          </div>
          Audit realise le {formatDate(data.timestamp)}
        </footer>
      </div>
    </div>
  );
}
