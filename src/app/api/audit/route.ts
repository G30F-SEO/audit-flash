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
  aiRecommendations: string | null;
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

async function fetchHaloscanOverview(domain: string): Promise<{ data: Record<string, unknown> | null; status: string }> {
  const key = process.env.HALOSCAN_API_KEY;
  if (!key) return { data: null, status: "NO_API_KEY" };
  try {
    const url = "https://api.haloscan.com/api/domains/overview";
    console.log("[Haloscan Overview] POST:", url, "domain:", domain);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "haloscan-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: domain,
        requested_data: ["metrics", "positions_breakdown", "best_keywords"],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[Haloscan Overview] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return { data: null, status: `HTTP_${res.status}` };
    }
    const data = await res.json();
    console.log("[Haloscan Overview] Success, keys:", Object.keys(data));
    return { data, status: "OK" };
  } catch (err) {
    console.error("[Haloscan Overview] Error:", err);
    return { data: null, status: `ERROR: ${(err as Error).message}` };
  }
}

async function fetchHaloscanPositions(domain: string): Promise<{ data: Record<string, unknown> | null; status: string }> {
  const key = process.env.HALOSCAN_API_KEY;
  if (!key) return { data: null, status: "NO_API_KEY" };
  try {
    const url = "https://api.haloscan.com/api/domains/positions";
    console.log("[Haloscan Positions] POST:", url, "domain:", domain);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "haloscan-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: domain,
        lineCount: 20,
        order_by: "traffic",
        order: "desc",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[Haloscan Positions] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return { data: null, status: `HTTP_${res.status}` };
    }
    const data = await res.json();
    console.log("[Haloscan Positions] Success, keys:", Object.keys(data));
    return { data, status: "OK" };
  } catch (err) {
    console.error("[Haloscan Positions] Error:", err);
    return { data: null, status: `ERROR: ${(err as Error).message}` };
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

async function fetchLighthouse(domain: string): Promise<{ data: Record<string, unknown> | null; status: string }> {
  const headers = dfsHeaders();
  if (!headers) return { data: null, status: "NO_CREDENTIALS" };
  try {
    const targetUrl = `https://${domain}/`;
    console.log("[DataForSEO Lighthouse] Fetching for:", targetUrl);
    const res = await fetch("https://api.dataforseo.com/v3/on_page/lighthouse/live/json", {
      method: "POST",
      headers,
      body: JSON.stringify([{ url: targetUrl, enable_javascript: true }]),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[DataForSEO Lighthouse] HTTP ${res.status}: ${text.slice(0, 300)}`);
      return { data: null, status: `HTTP_${res.status}` };
    }
    const data = await res.json();
    console.log("[DataForSEO Lighthouse] Success, status_code:", data?.status_code, "tasks:", data?.tasks?.length);
    return { data, status: "OK" };
  } catch (err) {
    console.error("[DataForSEO Lighthouse] Error:", err);
    return { data: null, status: `ERROR: ${(err as Error).message}` };
  }
}

async function fetchOnPage(domain: string): Promise<{ data: Record<string, unknown> | null; status: string }> {
  const headers = dfsHeaders();
  if (!headers) return { data: null, status: "NO_CREDENTIALS" };
  try {
    const targetUrl = `https://${domain}/`;
    console.log("[DataForSEO OnPage] Fetching for:", targetUrl);
    const res = await fetch("https://api.dataforseo.com/v3/on_page/instant_pages", {
      method: "POST",
      headers,
      body: JSON.stringify([{ url: targetUrl, enable_javascript: true }]),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[DataForSEO OnPage] HTTP ${res.status}: ${text.slice(0, 300)}`);
      return { data: null, status: `HTTP_${res.status}` };
    }
    const data = await res.json();
    console.log("[DataForSEO OnPage] Success, status_code:", data?.status_code, "tasks:", data?.tasks?.length);
    return { data, status: "OK" };
  } catch (err) {
    console.error("[DataForSEO OnPage] Error:", err);
    return { data: null, status: `ERROR: ${(err as Error).message}` };
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
    if (!task) {
      console.log("[extractLighthouse] No task found. Raw keys:", Object.keys(raw), "tasks:", JSON.stringify((raw as any)?.tasks?.map((t: any) => ({ status: t?.status_code, result_count: t?.result?.length })) ?? "none").slice(0, 300));
      return defaults;
    }
    const cats = task.categories;
    const audits = task.audits;
    console.log("[extractLighthouse] Found task. Categories keys:", Object.keys(cats ?? {}), "Audits sample keys:", Object.keys(audits ?? {}).slice(0, 5));
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
    if (!items || !items.length) {
      console.log("[extractOnPage] No items found. Raw keys:", Object.keys(raw), "tasks:", JSON.stringify((raw as any)?.tasks?.map((t: any) => ({ status: t?.status_code, result_count: t?.result?.length })) ?? "none").slice(0, 300));
      return defaults;
    }
    const page = items[0];
    console.log("[extractOnPage] Page keys:", Object.keys(page ?? {}));
    const meta = page?.meta ?? {};
    const onPage = page?.on_page ?? {};
    const pageChecks = page?.checks ?? {};
    console.log("[extractOnPage] meta keys:", Object.keys(meta), "onPage keys:", Object.keys(onPage), "checks keys:", Object.keys(pageChecks));

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
// OpenAI recommendations
// ---------------------------------------------------------------------------

async function fetchAIRecommendations(domain: string, result: Omit<AuditResult, "aiRecommendations">): Promise<string | null> {
  const apiKey = process.env.OPEN_AI_KEY;
  if (!apiKey) return null;
  try {
    const prompt = `Tu es un expert SEO senior. Voici les résultats d'un audit SEO pour le domaine "${domain}".

SCORES: Global ${result.scores.global}/100 | On-page ${result.scores.onpage}/100 | Positionnement ${result.scores.rankings}/100 | Performance ${result.scores.performance}/100 | Ergonomie ${result.scores.usability}/100 | Social ${result.scores.social}/100

LIGHTHOUSE: Performance ${result.lighthouse.performance} | Accessibilité ${result.lighthouse.accessibility} | Bonnes pratiques ${result.lighthouse.bestPractices} | SEO ${result.lighthouse.seo}

CORE WEB VITALS: LCP ${result.cwv.lcp}ms | FCP ${result.cwv.fcp}ms | CLS ${result.cwv.cls} | TBT ${result.cwv.tbt}ms | TTFB ${result.cwv.ttfb}ms

CHECKS: Title "${result.checks.title.value}" (${result.checks.title.length} car, OK: ${result.checks.title.ok}) | Description (${result.checks.description.length} car, OK: ${result.checks.description.ok}) | H1 (count: ${result.checks.h1.count}, OK: ${result.checks.h1.ok}) | SSL: ${result.checks.ssl} | Canonical: ${result.checks.canonical} | Sitemap: ${result.checks.sitemap} | Robots: ${result.checks.robots} | Analytics: ${result.checks.analytics} | Images sans alt: ${result.checks.imagesWithoutAlt}/${result.checks.totalImages}

MOTS-CLÉS: ${result.keywords.total} total | Top 3: ${result.keywords.top3} | Top 10: ${result.keywords.top10} | Trafic estimé: ${result.keywords.estimatedTraffic}/mois

SOCIAL: Facebook: ${result.social.facebook ? "Oui" : "Non"} | Instagram: ${result.social.instagram ? "Oui" : "Non"} | LinkedIn: ${result.social.linkedin ? "Oui" : "Non"} | OG Tags: ${result.social.og ? "Oui" : "Non"}

CMS: ${result.server.cms} | Serveur: ${result.server.server}

Génère un rapport de recommandations structuré en markdown avec :
1. **Diagnostic express** (2-3 phrases résumant la situation)
2. **Actions prioritaires** (3-5 actions concrètes classées par impact, avec une estimation de difficulté : Facile/Moyen/Complexe)
3. **Opportunités SEO** (2-3 opportunités de croissance basées sur les mots-clés)
4. **Points forts** (2-3 éléments positifs à valoriser)

Sois concis, actionnable et orienté business. Le ton doit être professionnel mais accessible pour un dirigeant d'entreprise.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const domain = (body.domain as string)
      ?.trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
    if (!domain) {
      return NextResponse.json({ error: "Domaine requis" }, { status: 400 });
    }

    console.log("[Audit] Starting audit for domain:", domain);

    // Run all API calls in parallel
    const [haloscanOverviewRes, haloscanPositionsRes, lighthouseRes, onPageRes] = await Promise.all([
      fetchHaloscanOverview(domain),
      fetchHaloscanPositions(domain),
      fetchLighthouse(domain),
      fetchOnPage(domain),
    ]);

    const _debug = {
      domain,
      haloscanOverview: haloscanOverviewRes.status,
      haloscanPositions: haloscanPositionsRes.status,
      lighthouse: lighthouseRes.status,
      onPage: onPageRes.status,
      envKeys: {
        haloscan: !!process.env.HALOSCAN_API_KEY,
        dataforseoLogin: !!process.env.DATAFORSEO_LOGIN,
        dataforseoPassword: !!process.env.DATAFORSEO_PASSWORD,
        openai: !!process.env.OPEN_AI_KEY,
      },
    };
    console.log("[Audit] API statuses:", JSON.stringify(_debug));

    // Extract structured data
    const { lighthouse, cwv } = extractLighthouse(lighthouseRes.data);
    const { checks, social, server } = extractOnPage(onPageRes.data);
    const keywords = extractKeywords(haloscanOverviewRes.data, haloscanPositionsRes.data);
    const scores = computeScores(checks, keywords, lighthouse, social);

    const partialResult = {
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

    const aiRecommendations = await fetchAIRecommendations(domain, partialResult);

    const result: AuditResult = {
      ...partialResult,
      aiRecommendations,
    };

    return NextResponse.json({ ...result, _debug });
  } catch (err) {
    console.error("Audit API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
