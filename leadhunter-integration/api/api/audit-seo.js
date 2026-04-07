/**
 * Audit SEO complet — Haloscan + DataForSEO + OpenAI
 * Route : POST /api/audit-seo  { domain: "example.com" }
 *
 * Retourne scores, Lighthouse, CWV, checks on-page, mots-clés, recommandations IA.
 * Variables d'environnement requises :
 *   HALOSCAN_API_KEY, DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, OPEN_AI_KEY
 */

/** @param {import('@vercel/node').VercelRequest} req */
/** @param {import('@vercel/node').VercelResponse} res */
export default async function handler(req, res) {
  // CORS
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Accept both GET ?domain=xxx and POST { domain: xxx }
  let domain = req.method === 'GET'
    ? req.query.domain
    : req.body?.domain;

  if (!domain) return res.status(400).json({ error: 'Paramètre domain requis' });

  domain = domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  if (!domain) return res.status(400).json({ error: 'Domaine invalide' });

  try {
    // Run all API calls in parallel
    const [haloscanOverview, haloscanPositions, lighthouseData, onPageData] = await Promise.all([
      fetchHaloscanOverview(domain),
      fetchHaloscanPositions(domain),
      fetchLighthouse(domain),
      fetchOnPage(domain),
    ]);

    // Extract structured data
    const { lighthouse, cwv } = extractLighthouse(lighthouseData.data);
    const { checks, social, server } = extractOnPage(onPageData.data);
    const keywords = extractKeywords(haloscanOverview.data, haloscanPositions.data);
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

    // AI recommendations (non-blocking)
    const aiRecommendations = await fetchAIRecommendations(domain, partialResult);

    return res.status(200).json({
      ...partialResult,
      aiRecommendations,
      _debug: {
        haloscanOverview: haloscanOverview.status,
        haloscanPositions: haloscanPositions.status,
        lighthouse: lighthouseData.status,
        onPage: onPageData.status,
      },
    });
  } catch (err) {
    console.error('Audit SEO error:', err);
    return res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

// ---------------------------------------------------------------------------
// Haloscan
// ---------------------------------------------------------------------------

async function fetchHaloscanOverview(domain) {
  const key = process.env.HALOSCAN_API_KEY;
  if (!key) return { data: null, status: 'NO_API_KEY' };
  try {
    const r = await fetch('https://api.haloscan.com/api/domains/overview', {
      method: 'POST',
      headers: { 'haloscan-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: domain, requested_data: ['metrics', 'positions_breakdown', 'best_keywords'] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return { data: null, status: `HTTP_${r.status}` };
    return { data: await r.json(), status: 'OK' };
  } catch (e) { return { data: null, status: `ERROR: ${e.message}` }; }
}

async function fetchHaloscanPositions(domain) {
  const key = process.env.HALOSCAN_API_KEY;
  if (!key) return { data: null, status: 'NO_API_KEY' };
  try {
    const r = await fetch('https://api.haloscan.com/api/domains/positions', {
      method: 'POST',
      headers: { 'haloscan-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: domain, lineCount: 20, order_by: 'traffic', order: 'desc' }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return { data: null, status: `HTTP_${r.status}` };
    return { data: await r.json(), status: 'OK' };
  } catch (e) { return { data: null, status: `ERROR: ${e.message}` }; }
}

// ---------------------------------------------------------------------------
// DataForSEO
// ---------------------------------------------------------------------------

function dfsHeaders() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return {
    Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
    'Content-Type': 'application/json',
  };
}

async function fetchLighthouse(domain) {
  const headers = dfsHeaders();
  if (!headers) return { data: null, status: 'NO_CREDENTIALS' };
  try {
    const r = await fetch('https://api.dataforseo.com/v3/on_page/lighthouse/live/json', {
      method: 'POST', headers,
      body: JSON.stringify([{ url: `https://${domain}/`, enable_javascript: true }]),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return { data: null, status: `HTTP_${r.status}` };
    return { data: await r.json(), status: 'OK' };
  } catch (e) { return { data: null, status: `ERROR: ${e.message}` }; }
}

async function fetchOnPage(domain) {
  const headers = dfsHeaders();
  if (!headers) return { data: null, status: 'NO_CREDENTIALS' };
  try {
    const r = await fetch('https://api.dataforseo.com/v3/on_page/instant_pages', {
      method: 'POST', headers,
      body: JSON.stringify([{ url: `https://${domain}/`, enable_javascript: true }]),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return { data: null, status: `HTTP_${r.status}` };
    return { data: await r.json(), status: 'OK' };
  } catch (e) { return { data: null, status: `ERROR: ${e.message}` }; }
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function extractLighthouse(raw) {
  const defaults = {
    lighthouse: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
    cwv: { fcp: 0, lcp: 0, cls: 0, tbt: 0, ttfb: 0, speedIndex: 0, totalWeight: 0 },
  };
  if (!raw) return defaults;
  try {
    const task = raw?.tasks?.[0]?.result?.[0];
    if (!task) return defaults;
    const cats = task.categories;
    const audits = task.audits;
    return {
      lighthouse: {
        performance: Math.round((cats?.performance?.score ?? 0) * 100),
        accessibility: Math.round((cats?.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((cats?.['best-practices']?.score ?? 0) * 100),
        seo: Math.round((cats?.seo?.score ?? 0) * 100),
      },
      cwv: {
        fcp: audits?.['first-contentful-paint']?.numericValue ?? 0,
        lcp: audits?.['largest-contentful-paint']?.numericValue ?? 0,
        cls: audits?.['cumulative-layout-shift']?.numericValue ?? 0,
        tbt: audits?.['total-blocking-time']?.numericValue ?? 0,
        ttfb: audits?.['server-response-time']?.numericValue ?? 0,
        speedIndex: audits?.['speed-index']?.numericValue ?? 0,
        totalWeight: audits?.['total-byte-weight']?.numericValue ?? 0,
      },
    };
  } catch { return defaults; }
}

function extractOnPage(raw) {
  const defaults = {
    checks: {
      title: { value: '', length: 0, ok: false }, description: { value: '', length: 0, ok: false },
      h1: { value: '', count: 0, ok: false }, ssl: false, canonical: false, robots: true,
      sitemap: false, viewport: false, favicon: false, analytics: false,
      imagesWithoutAlt: 0, totalImages: 0,
    },
    social: { facebook: null, instagram: null, linkedin: null, youtube: null, twitter: null, og: false },
    server: { cms: 'Inconnu', server: 'Inconnu', encoding: 'Inconnu' },
  };
  if (!raw) return defaults;
  try {
    const taskResult = raw?.tasks?.[0]?.result?.[0];
    if (!taskResult) return defaults;
    const page = taskResult?.items?.[0] ?? taskResult;
    const meta = page?.meta ?? {};
    const pageChecks = page?.checks ?? {};

    const titleVal = meta?.title ?? '';
    const descVal = meta?.description ?? '';
    const h1Val = meta?.htags?.h1?.[0] ?? '';
    const h1Count = meta?.htags?.h1?.length ?? 0;

    return {
      checks: {
        title: { value: titleVal, length: titleVal.length, ok: titleVal.length > 0 && titleVal.length <= 65 },
        description: { value: descVal, length: descVal.length, ok: descVal.length > 0 && descVal.length <= 160 },
        h1: { value: h1Val, count: h1Count, ok: h1Count === 1 },
        ssl: pageChecks?.is_https === true || (page?.url?.startsWith('https') ?? false),
        canonical: pageChecks?.canonical === true || !!meta?.canonical,
        robots: pageChecks?.is_no_index !== true,
        sitemap: pageChecks?.from_sitemap === true,
        viewport: !pageChecks?.no_encoding_meta_tag,
        favicon: !pageChecks?.no_favicon && !!meta?.favicon,
        analytics: pageChecks?.has_micromarkup === true,
        imagesWithoutAlt: pageChecks?.no_image_alt ? (meta?.images_count ?? 0) : 0,
        totalImages: meta?.images_count ?? 0,
      },
      social: {
        facebook: null, instagram: null, linkedin: null, youtube: null, twitter: null,
        og: !!meta?.social_media_tags && Object.keys(meta.social_media_tags).length > 0,
      },
      server: {
        cms: meta?.generator ?? 'Inconnu',
        server: page?.server ?? 'Inconnu',
        encoding: page?.content_encoding ?? 'Inconnu',
      },
    };
  } catch { return defaults; }
}

function extractKeywords(overview, positions) {
  const defaults = {
    total: 0, top3: 0, top10: 0, top50: 0, top100: 0,
    estimatedTraffic: 0, topKeywords: [],
  };
  try {
    const metrics = overview?.metrics ?? {};
    const stats = metrics?.stats ?? {};
    defaults.total = stats?.total_keyword_count ?? 0;
    defaults.estimatedTraffic = stats?.total_traffic ?? 0;
    defaults.top3 = stats?.top_3_positions ?? 0;
    defaults.top10 = stats?.top_10_positions ?? 0;
    defaults.top50 = stats?.top_50_positions ?? 0;
    defaults.top100 = stats?.top_100_positions ?? 0;

    const lines = positions?.results ?? [];
    if (Array.isArray(lines)) {
      defaults.topKeywords = lines.slice(0, 20).map((l) => ({
        keyword: l.keyword ?? '', position: l.position ?? 0,
        volume: l.volume ?? l.search_volume ?? 0,
        traffic: l.traffic ?? l.estimated_traffic ?? 0,
        url: l.url ?? l.landing_page ?? '',
      }));
    }
  } catch { /* keep defaults */ }
  return defaults;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function computeScores(checks, keywords, lighthouse, social) {
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

  const performance = clamp(lighthouse.performance);

  let usability = 100;
  if (!checks.viewport) usability -= 20;
  if (!checks.favicon) usability -= 5;
  if (lighthouse.accessibility < 70) usability -= 15;
  usability = clamp(usability);

  let socialScore = 0;
  if (social.facebook) socialScore += 20;
  if (social.instagram) socialScore += 15;
  if (social.linkedin) socialScore += 15;
  if (social.youtube) socialScore += 15;
  if (social.twitter) socialScore += 10;
  if (social.og) socialScore += 10;
  socialScore = clamp(socialScore);

  const global = clamp(Math.round(
    onpage * 0.35 + rankings * 0.3 + performance * 0.2 + usability * 0.1 + socialScore * 0.05
  ));

  return { global, onpage, rankings, performance, usability, social: socialScore };
}

// ---------------------------------------------------------------------------
// OpenAI recommendations
// ---------------------------------------------------------------------------

async function fetchAIRecommendations(domain, result) {
  const apiKey = process.env.OPEN_AI_KEY;
  if (!apiKey) return null;
  try {
    const prompt = `Tu es un expert SEO senior. Voici les résultats d'un audit SEO pour "${domain}".
SCORES: Global ${result.scores.global}/100 | On-page ${result.scores.onpage}/100 | Positionnement ${result.scores.rankings}/100 | Performance ${result.scores.performance}/100
LIGHTHOUSE: Performance ${result.lighthouse.performance} | Accessibilité ${result.lighthouse.accessibility} | SEO ${result.lighthouse.seo}
CORE WEB VITALS: LCP ${result.cwv.lcp}ms | FCP ${result.cwv.fcp}ms | CLS ${result.cwv.cls} | TBT ${result.cwv.tbt}ms
MOTS-CLÉS: ${result.keywords.total} total | Top 3: ${result.keywords.top3} | Top 10: ${result.keywords.top10} | Trafic: ${result.keywords.estimatedTraffic}/mois

Génère un rapport markdown concis :
1. **Diagnostic express** (2-3 phrases)
2. **Actions prioritaires** (3-5 actions avec difficulté Facile/Moyen/Complexe)
3. **Opportunités SEO** (2-3 opportunités)
4. **Points forts** (2-3 points positifs)

Sois actionnable et orienté business.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.7 }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}
