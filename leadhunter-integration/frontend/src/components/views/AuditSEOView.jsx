import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Legend, AreaChart, Area, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  Search, TrendingUp, Target, Shield, Sparkles, ChevronDown, ExternalLink, Zap,
} from 'lucide-react';
import ScoreGauge from '../audit/ScoreGauge';
import CheckItem from '../audit/CheckItem';
import AnimatedCounter from '../audit/AnimatedCounter';

/* ───── H-TIC palette ───── */
const PRIMARY = '#2E6AB0';
const ACCENT  = '#F5A623';
const DARK    = '#1A2744';

/* ───── helpers ───── */
function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1000)} Ko`;
}

function scoreColor(score) {
  if (score >= 80) return '#28A745';
  if (score >= 50) return '#F5A623';
  return '#DC3545';
}

function posBadgeColor(pos) {
  if (pos <= 3)  return 'text-green-500';
  if (pos <= 10) return 'text-blue-500';
  if (pos <= 20) return 'text-orange-500';
  return 'text-gray-400';
}

function barColor(pos) {
  if (pos <= 3)  return '#28A745';
  if (pos <= 10) return '#2E6AB0';
  if (pos <= 20) return '#F5A623';
  return '#9CA3AF';
}

/* ───── component ───── */
export default function AuditSEOView() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [kwOpen, setKwOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const d = domain.trim();
    if (!d) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/audit-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── radar data ── */
  const radarData = data ? [
    { subject: 'On-page', value: data.scores?.onpage ?? 0 },
    { subject: 'Rankings', value: data.scores?.rankings ?? 0 },
    { subject: 'Performance', value: data.scores?.performance ?? 0 },
    { subject: 'Usability', value: data.scores?.usability ?? 0 },
    { subject: 'Social', value: data.scores?.social ?? 0 },
  ] : [];

  /* ── lighthouse data ── */
  const lhCategories = data?.lighthouse
    ? Object.entries(data.lighthouse).map(([k, v]) => ({ name: k, score: Math.round(v * 100) }))
    : [];

  /* ── core web vitals area data ── */
  const cwvData = data?.coreWebVitals?.history ?? [];

  /* ── keyword charts ── */
  const topKw = (data?.keywords ?? []).slice(0, 10).map(k => ({
    name: k.keyword?.substring(0, 18) ?? '',
    traffic: k.traffic ?? 0,
    position: k.position ?? 0,
  }));

  const posDistribution = (() => {
    const buckets = { '1-3': 0, '4-10': 0, '11-20': 0, '21+': 0 };
    (data?.keywords ?? []).forEach(k => {
      const p = k.position ?? 99;
      if (p <= 3) buckets['1-3']++;
      else if (p <= 10) buckets['4-10']++;
      else if (p <= 20) buckets['11-20']++;
      else buckets['21+']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  })();
  const PIE_COLORS = ['#28A745', '#2E6AB0', '#F5A623', '#9CA3AF'];

  /* ── on-page checks ── */
  const checks = data?.onPageChecks ?? [];
  const passCount = checks.filter(c => c.ok).length;
  const checkPct = checks.length ? Math.round((passCount / checks.length) * 100) : 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ──────── Search bar ──────── */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 bg-bg-card border border-border rounded-btn p-4">
        <div className="flex items-center gap-2 flex-1 bg-bg-card border border-border rounded-btn px-3 py-2">
          <Search size={18} className="text-text-secondary shrink-0" />
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-2 rounded-btn font-semibold text-white text-sm transition-colors"
          style={{ backgroundColor: PRIMARY }}
        >
          <Zap size={16} />
          Analyser
        </button>
      </form>

      {/* ──────── Loading ──────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: `${PRIMARY}33`, borderTopColor: PRIMARY }} />
          <p className="text-text-secondary text-sm animate-pulse">Analyse en cours...</p>
        </div>
      )}

      {/* ──────── Error ──────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-btn p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* ──────── Results ──────── */}
      {data && (
        <div className="space-y-6">

          {/* ── A. Hero section ── */}
          <section className="bg-bg-card border border-border rounded-btn p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Target size={20} style={{ color: PRIMARY }} />
              Score global
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Score gauge */}
              <div className="relative">
                <ScoreGauge score={data.scores?.global ?? 0} label="Global" size="lg" />
              </div>

              {/* Radar chart */}
              <div className="flex-1 w-full" style={{ minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Mini score pills */}
              <div className="flex sm:flex-col gap-2 flex-wrap justify-center">
                {radarData.map(r => (
                  <span
                    key={r.subject}
                    className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: scoreColor(r.value) }}
                  >
                    {r.subject} {r.value}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── B. Lighthouse ── */}
          {lhCategories.length > 0 && (
            <section className="bg-bg-card border border-border rounded-btn p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Zap size={20} style={{ color: ACCENT }} />
                Lighthouse
              </h2>
              <div className="w-full" style={{ minHeight: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={lhCategories} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={75} />
                    <Tooltip contentStyle={{ backgroundColor: DARK, border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {lhCategories.map((entry, i) => (
                        <Cell key={i} fill={scoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {lhCategories.map(c => (
                  <ScoreGauge key={c.name} score={c.score} label={c.name} size="md" />
                ))}
              </div>
            </section>
          )}

          {/* ── C. Core Web Vitals ── */}
          {data.coreWebVitals && (
            <section className="bg-bg-card border border-border rounded-btn p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <TrendingUp size={20} style={{ color: PRIMARY }} />
                Core Web Vitals
              </h2>

              {/* Area chart */}
              {cwvData.length > 0 && (
                <div className="w-full" style={{ minHeight: 220 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={cwvData}>
                      <defs>
                        <linearGradient id="gradLcp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: DARK, border: 'none', borderRadius: 8, color: '#fff' }} />
                      <ReferenceLine y={2500} stroke="#DC3545" strokeDasharray="4 4" label={{ value: 'Poor', fill: '#DC3545', fontSize: 10 }} />
                      <ReferenceLine y={1200} stroke="#F5A623" strokeDasharray="4 4" label={{ value: 'Needs work', fill: '#F5A623', fontSize: 10 }} />
                      <Area type="monotone" dataKey="lcp" stroke={PRIMARY} fill="url(#gradLcp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'LCP', value: data.coreWebVitals.lcp, fmt: formatMs },
                  { label: 'FID', value: data.coreWebVitals.fid, fmt: formatMs },
                  { label: 'CLS', value: data.coreWebVitals.cls, fmt: v => v?.toFixed(3) },
                  { label: 'TTFB', value: data.coreWebVitals.ttfb, fmt: formatMs },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-bg-card border border-border rounded-btn p-3 text-center">
                    <p className="text-xs text-text-secondary">{kpi.label}</p>
                    <p className="text-xl font-bold text-text-primary">{kpi.value != null ? kpi.fmt(kpi.value) : '-'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── D. On-page checks ── */}
          {checks.length > 0 && (
            <section className="bg-bg-card border border-border rounded-btn p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Shield size={20} style={{ color: PRIMARY }} />
                On-page ({passCount}/{checks.length})
              </h2>
              {/* progress bar */}
              <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${checkPct}%`, backgroundColor: scoreColor(checkPct) }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checks.map((c, i) => (
                  <CheckItem key={i} ok={c.ok} label={c.label} detail={c.detail} />
                ))}
              </div>
            </section>
          )}

          {/* ── E. Keywords ── */}
          {(data.keywords ?? []).length > 0 && (
            <section className="bg-bg-card border border-border rounded-btn p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Target size={20} style={{ color: ACCENT }} />
                Mots-clés
              </h2>

              {/* Gradient KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total mots-clés', value: data.keywords.length, suffix: '' },
                  { label: 'Top 3', value: data.keywords.filter(k => k.position <= 3).length, suffix: '' },
                  { label: 'Top 10', value: data.keywords.filter(k => k.position <= 10).length, suffix: '' },
                  { label: 'Trafic total', value: data.keywords.reduce((s, k) => s + (k.traffic ?? 0), 0), suffix: '' },
                ].map(kpi => (
                  <div
                    key={kpi.label}
                    className="rounded-btn p-3 text-center text-white"
                    style={{ background: `linear-gradient(135deg, ${DARK}, ${PRIMARY})` }}
                  >
                    <p className="text-xs opacity-80">{kpi.label}</p>
                    <AnimatedCounter value={kpi.value} suffix={kpi.suffix} className="text-xl font-bold" />
                  </div>
                ))}
              </div>

              {/* Top 10 traffic bar chart */}
              {topKw.length > 0 && (
                <div className="w-full" style={{ minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topKw}>
                      <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: DARK, border: 'none', borderRadius: 8, color: '#fff' }} />
                      <Bar dataKey="traffic" radius={[4, 4, 0, 0]}>
                        {topKw.map((entry, i) => (
                          <Cell key={i} fill={barColor(entry.position)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Position distribution pie */}
              <div className="w-full flex justify-center" style={{ minHeight: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={posDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fill: '#9CA3AF', fontSize: 11 }}>
                      {posDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
                    <Tooltip contentStyle={{ backgroundColor: DARK, border: 'none', borderRadius: 8, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Collapsible keyword table */}
              <div>
                <button
                  type="button"
                  onClick={() => setKwOpen(o => !o)}
                  className="flex items-center gap-2 text-sm font-semibold text-accent w-full"
                >
                  <ChevronDown
                    size={16}
                    className="transition-transform duration-200"
                    style={{ transform: kwOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                  {kwOpen ? 'Masquer' : 'Voir'} le tableau complet ({data.keywords.length})
                </button>
                {kwOpen && (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-border text-text-secondary text-xs uppercase">
                          <th className="py-2 pr-2">Mot-clé</th>
                          <th className="py-2 pr-2 text-right">Position</th>
                          <th className="py-2 pr-2 text-right hidden sm:table-cell">Volume</th>
                          <th className="py-2 pr-2 text-right">Trafic</th>
                          <th className="py-2 hidden sm:table-cell">URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.keywords.map((kw, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                            <td className="py-1.5 pr-2 text-text-primary font-medium">{kw.keyword}</td>
                            <td className={`py-1.5 pr-2 text-right font-bold ${posBadgeColor(kw.position)}`}>{kw.position}</td>
                            <td className="py-1.5 pr-2 text-right text-text-secondary hidden sm:table-cell">{(kw.volume ?? 0).toLocaleString('fr-FR')}</td>
                            <td className="py-1.5 pr-2 text-right text-text-secondary">{(kw.traffic ?? 0).toLocaleString('fr-FR')}</td>
                            <td className="py-1.5 text-text-secondary truncate max-w-[200px] hidden sm:table-cell">
                              {kw.url && (
                                <a href={kw.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-accent">
                                  <ExternalLink size={12} />
                                  <span className="truncate">{kw.url}</span>
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── F. AI Recommendations ── */}
          {data.recommendations && (
            <section className="bg-bg-card border border-border rounded-btn p-4 sm:p-6 space-y-3" style={{ borderLeftWidth: 4, borderLeftColor: ACCENT }}>
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Sparkles size={20} style={{ color: ACCENT }} />
                Recommandations IA
              </h2>
              <div
                className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.recommendations.replace(/\n/g, '<br/>') }}
              />
            </section>
          )}

          {/* ── G. Server info ── */}
          {data.serverInfo && (
            <section className="bg-bg-card border border-border rounded-btn p-4 sm:p-6 space-y-3">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Shield size={20} style={{ color: PRIMARY }} />
                Serveur
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(data.serverInfo).map(([k, v]) => (
                  <div key={k} className="bg-bg-card border border-border rounded-btn p-3">
                    <p className="text-xs text-text-secondary">{k}</p>
                    <p className="text-sm font-semibold text-text-primary truncate" title={String(v)}>{String(v)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
