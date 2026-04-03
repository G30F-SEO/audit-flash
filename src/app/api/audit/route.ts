import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
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

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Haloscan fetchers
// ---------------------------------------------------------------------------

async function fetchHaloscanOverview(domain: string) {
  const key = process.env.HALOSCAN_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.haloscan.com/v2/domains/overview?input=${encodeURIComponent(domain)}`,
      { headers: { "x-api-key": key }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

async function fetchHaloscanPositions(domain: string) {
  const key = process.env.HALOSCAN_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.haloscan.com/v2/domains/positions?input=${encodeURIComponent(domain)}&lineCount=20&order_by=traffic&order=desc`,
      { headers: { "x-api-key": key }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DataForSEO fetchers
// ---------------------------------------------------------------------------

function dfsHeaders() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return {
    Authorization: "Basic " + Buffer.from(`${login}:${password}`).toString("base64"),
    "Content-Type": "application/json",
  };
}

async function fetchLighthouse(domain: string) {
  const headers = dfsHeaders();
  if (!headers) return null;
  try {
    const res = await fetch("https://api.dataforseo.com/v3/on_page/lighthouse/live/json", {
      method: "POST",
      headers,
      body: JSON.stringify([{ url: `https://www.${domain}/`, enable_javascript: true }]),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchOnPage(domain: string) {
  const headers = dfsHeaders();
  if (!headers) return null;
  try {
    const res = await fetch("https://api.dataforseo.com/v3/on_page/instant_pages", {
      method: "POST",
      headers,
      body: JSON.stringify([{ url: `https://www.${domain}/`, enable_javascript: true }]),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function extractLighthouse(raw: Record<string, unknown> | null) {
  const defaults = {
    lighthouse: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
    cwv: { fcp: 0, lcp: 0, cls: 0, tbt: 0, ttfb: 0, speedIndex: 0, totalWeight: 0 },
  };
  if (!raw) return defaults;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = (raw as any)?.tasks?.[0]?.result?.[0];
    if (!task) return defaults;
    const cats = task.categories;
    const audits = task.audits;
    const lighthouse = {
      performance: Math.round((cats?.performance?.score ?? 0) * 100),
      accessibility: Math.round((cats?.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((cats?.["best-practices"]?.score ?? 0) * 100),
      seo: Math.round((cats?.seo?.score ?? 0) * 100),
    };
    const cwv = {
      fcp: audits?.["first-contentful-paint"]?.numericValue ?? 0,
      lcp: audits?.["largest-contentful-paint"]?.numericValue ?? 0,
      cls: audits?.["cumulative-layout-shift"]?.numericValue ?? 0,
      tbt: audits?.["total-blocking-time"]?.numericValue ?? 0,
      ttfb: audits?.["server-response-time"]?.numericValue ?? 0,
      speedIndex: audits?.["speed-index"]?.numericValue ?? 0,
      totalWeight: audits?.["total-byte-weight"]?.numericValue ?? 0,
    };
    return { lighthouse, cwv };
  } catch {
    return defaults;
  }
}

function extractOnPage(raw: Record<string, unknown> | null) {
  const defaults = {
    checks: {
      title: { value: "", length: 0, ok: false },
      description: { value: "", length: 0, ok: false },
      h1: { value: "", count: 0, ok: false },
      ssl: false,
      canonical: false,
      robots: true,
      sitemap: false,
      viewport: false,
      favicon: false,
      analytics: false,
      imagesWithoutAlt: 0,
      totalImages: 0,
    },
    social: {
      facebook: null as string | null,
      instagram: null as string | null,
      linkedin: null as string | null,
      youtube: null as string | null,
      twitter: null as string | null,
      og: false,
    },
    server: { cms: "Inconnu", server: "Inconnu", encoding: "Inconnu" },
  };
  if (!raw) return defaults;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (raw as any)?.tasks?.[0]?.result;
    if (!items || !items.length) return defaults;
    const page = items[0];
    const meta = page?.meta ?? {};
    const onPage = page?.on_page ?? {};
    const pageChecks = page?.checks ?? {};

    const titleVal = meta?.title ?? "";
    const descVal = meta?.description ?? "";
    const h1Val = meta?.htags?.h1?.[0] ?? "";
    const h1Count = meta?.htags?.h1?.length ?? 0;

    const checks = {
      title: { value: titleVal, length: titleVal.length, ok: titleVal.length > 0 && titleVal.length <= 65 },
      description: { value: descVal, length: descVal.length, ok: descVal.length > 0 && descVal.length <= 160 },
      h1: { value: h1Val, count: h1Count, ok: h1Count === 1 },
      ssl: page?.url?.startsWith("https") ?? false,
      canonical: !!onPage?.canonical,
      robots: !pageChecks?.is_no_index,
      sitemap: !!pageChecks?.sitemap,
      viewport: !!meta?.viewport,
      favicon: !!pageChecks?.has_favicon,
      analytics: !!pageChecks?.has_google_analytics,
      imagesWithoutAlt: onPage?.images_without_alt ?? 0,
      totalImages: onPage?.images_count ?? 0,
    };

    const socialLinks = page?.social_links ?? {};
    const social = {
      facebook: socialLinks?.facebook_url ?? null,
      instagram: socialLinks?.instagram_url ?? null,
      linkedin: socialLinks?.linkedin_url ?? null,
      youtube: socialLinks?.youtube_url ?? null,
      twitter: socialLinks?.twitter_url ?? null,
      og: !!meta?.open_graph,
    };

    const server = {
      cms: page?.cms ?? "Inconnu",
      server: page?.server ?? "Inconnu",
      encoding: page?.encoding ?? "Inconnu",
    };

    return { checks, social, server };
  } catch {
    return defaults;
  }
}

function extractKeywords(overview: Record<string, unknown> | null, positions: Record<string, unknown> | null) {
  const defaults = {
    total: 0,
    top3: 0,
    top10: 0,
    top50: 0,
    top100: 0,
    estimatedTraffic: 0,
    topKeywords: [] as Array<{ keyword: string; position: number; volume: number; traffic: number; url: string }>,
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ov = overview as any;
    const stats = ov?.data?.metrics?.stats ?? ov?.metrics?.stats ?? {};
    const breakdown = ov?.data?.positions_breakdown ?? ov?.positions_breakdown ?? {};

    defaults.total = stats?.keywords_count ?? stats?.total_keywords ?? 0;
    defaults.estimatedTraffic = stats?.estimated_traffic ?? stats?.traffic ?? 0;
    defaults.top3 = breakdown?.top3 ?? 0;
    defaults.top10 = breakdown?.top10 ?? 0;
    defaults.top50 = breakdown?.top50 ?? 0;
    defaults.top100 = breakdown?.top100 ?? 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pos = positions as any;
    const lines = pos?.data ?? pos?.lines ?? pos?.result ?? [];
    if (Array.isArray(lines)) {
      defaults.topKeywords = lines.slice(0, 20).map((l: Record<string, unknown>) => ({
        keyword: (l.keyword as string) ?? "",
        position: (l.position as number) ?? 0,
        volume: (l.volume as number) ?? 0,
        traffic: (l.traffic as number) ?? 0,
        url: (l.url as string) ?? "",
      }));
    }
  } catch {
    // keep defaults
  }
  return defaults;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function computeScores(
  checks: AuditResult["checks"],
  keywords: AuditResult["keywords"],
  lighthouse: AuditResult["lighthouse"],
  social: AuditResult["social"]
) {
  // On-page score
  let onpage = 100;
  if (!checks.title.ok) onpage -= checks.title.length === 0 ? 10 : 5;
  if (!checks.description.ok) onpage -= checks.description.length === 0 ? 10 : 5;
  if (!checks.h1.ok) onpage -= checks.h1.count === 0 ? 10 : 5;
  if (!checks.ssl) onpage -= 10;
  if (!checks.canonical) onpage -= 5;
  if (!checks.sitemap) onpage -= 5;
  if (!checks.robots) onpage -= 5;
  if (!checks.analytics) onpage -= 5;
  if (checks.totalImages > 0 && checks.imagesWithoutAlt / checks.totalImages > 0.5) onpage -= 10;
  onpage = clamp(onpage);

  // Rankings score
  let rankings = 0;
  const traffic = keywords.estimatedTraffic;
  if (traffic > 5000) rankings = 90;
  else if (traffic > 1000) rankings = 75;
  else if (traffic > 500) rankings = 60;
  else if (traffic > 200) rankings = 45;
  else if (traffic > 50) rankings = 30;
  else if (traffic > 0) rankings = 15;
  if (keywords.top3 > 0) rankings = Math.min(100, rankings + 5);
  if (keywords.top10 > 5) rankings = Math.min(100, rankings + 5);
  rankings = clamp(rankings);

  // Performance score
  const performance = clamp(lighthouse.performance);

  // Usability score
  let usability = 100;
  if (!checks.viewport) usability -= 20;
  if (!checks.favicon) usability -= 5;
  if (lighthouse.accessibility < 70) usability -= 15;
  usability = clamp(usability);

  // Social score
  let socialScore = 0;
  if (social.facebook) socialScore += 20;
  if (social.instagram) socialScore += 15;
  if (social.linkedin) socialScore += 15;
  if (social.youtube) socialScore += 15;
  if (social.twitter) socialScore += 10;
  if (social.og) socialScore += 10;
  socialScore = clamp(socialScore);

  const global = clamp(
    Math.round(
      onpage * 0.35 + rankings * 0.3 + performance * 0.2 + usability * 0.1 + socialScore * 0.05
    )
  );

  return { global, onpage, rankings, performance, usability, social: socialScore };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const domain = (body.domain as string)?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!domain) {
      return NextResponse.json({ error: "Domaine requis" }, { status: 400 });
    }

    // Run all API calls in parallel
    const [haloscanOverview, haloscanPositions, lighthouseRaw, onPageRaw] = await Promise.all([
      fetchHaloscanOverview(domain),
      fetchHaloscanPositions(domain),
      fetchLighthouse(domain),
      fetchOnPage(domain),
    ]);

    // Extract structured data
    const { lighthouse, cwv } = extractLighthouse(lighthouseRaw);
    const { checks, social, server } = extractOnPage(onPageRaw);
    const keywords = extractKeywords(haloscanOverview, haloscanPositions);
    const scores = computeScores(checks, keywords, lighthouse, social);

    const result: AuditResult = {
      domain,
      timestamp: new Date().toISOString(),
      scores,
      lighthouse,
      cwv,
      checks,
      keywords,
      social,
      server,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Audit API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
