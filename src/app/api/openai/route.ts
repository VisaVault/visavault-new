import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

type Source = { title: string; url: string; content: string };

const ALLOWED_HOSTS = [
  'www.uscis.gov',
  'uscis.gov',
  'www.federalregister.gov',
  'federalregister.gov',
  'travel.state.gov',
];

const DEFAULT_DAILY_CAP = Number(process.env.FRESH_LOOKUP_DAILY_CAP || '120'); // cheap & safe default
const PER_REQUEST_MAX_SOURCES = 3;
const PER_SOURCE_MAX_CHARS = 800;

// naive, best-effort in-memory cap + cache (may reset on cold start, which is OK for cost control MVP)
const state = {
  today: new Date().toISOString().slice(0, 10),
  freshLookupsUsed: 0,
  cache: new Map<string, { at: number; data: Source }>(), // key = url
};

function resetDailyIfNeeded() {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== state.today) {
    state.today = d;
    state.freshLookupsUsed = 0;
    state.cache.clear();
  }
}

function needsFreshInfo(text: string) {
  const t = text.toLowerCase();
  return /today|latest|recent|as of|update|changed|increase|new|deadline|fee|price|cost|uscis|federal register|notice|rule|policy|lottery|cap|2024|2025/.test(
    t,
  );
}

// Very small, opinionated “router” that picks URLs to try based on query
function pickCandidateUrls(query: string): string[] {
  const urls: string[] = [];

  // Fees
  if (/fee|price|cost/i.test(query)) {
    urls.push('https://www.uscis.gov/forms/filing-fees');
  }

  // USCIS general news
  if (/uscis|h-?1b|o-?1|perm|i-129|i-140|i-485|i-765|cap|lottery|rule|policy|deadline/i.test(query)) {
    urls.push('https://www.uscis.gov/newsroom/all-news');
  }

  // Federal Register (rules / notices)
  if (/rule|proposed|final|notice|federal register/i.test(query)) {
    urls.push('https://www.federalregister.gov/');
  }

  // Travel / DOS
  if (/consulate|visa bulletin|travel|state department|ds-|appointment|backlog/i.test(query)) {
    urls.push('https://travel.state.gov/content/travel/en/us-visas.html');
  }

  // Fallback: core USCIS landing for orientation
  if (urls.length === 0) {
    urls.push('https://www.uscis.gov/');
  }

  // de-dup & cap
  return Array.from(new Set(urls)).slice(0, 6);
}

function isAllowed(url: string) {
  try {
    const host = new URL(url).host.toLowerCase();
    return ALLOWED_HOSTS.includes(host);
  } catch {
    return false;
  }
}

// very small sanitizer
function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSource(url: string): Promise<Source | null> {
  if (!isAllowed(url)) return null;

  // lightweight cache ~5 minutes
  resetDailyIfNeeded();
  const now = Date.now();
  const cached = state.cache.get(url);
  if (cached && now - cached.at < 5 * 60 * 1000) return cached.data;

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      // Let upstream cache help us
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'VisaVaultBot/1.0 (+https://visavault.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(id);
    if (!res.ok) return null;

    const html = await res.text();
    const text = stripHtml(html).slice(0, 20000); // hard cap
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || url).trim();

    const data: Source = {
      title,
      url,
      content: text.slice(0, PER_SOURCE_MAX_CHARS),
    };

    state.cache.set(url, { at: now, data });
    return data;
  } catch {
    clearTimeout(id);
    return null;
  }
}

async function gatherSources(query: string): Promise<Source[]> {
  resetDailyIfNeeded();
  if (state.freshLookupsUsed >= DEFAULT_DAILY_CAP) return [];

  const candidates = pickCandidateUrls(query);
  const results: Source[] = [];
  for (const url of candidates) {
    if (results.length >= PER_REQUEST_MAX_SOURCES) break;
    const s = await fetchSource(url);
    if (s) results.push(s);
  }

  if (results.length > 0) {
    state.freshLookupsUsed += 1;
  }
  return results;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body?.messages as Msg[] | undefined;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: OPENAI_API_KEY is missing' },
        { status: 500 }
      );
    }

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const userQuery = lastUser?.content ?? '';

    const todayISO = new Date().toISOString().split('T')[0];
    const forceFresh = needsFreshInfo(userQuery);

    // If not obviously fresh, skip web to save $
    const sources = forceFresh ? await gatherSources(userQuery) : [];

    const system: Msg = {
      role: 'system',
      content: [
        `You are VisaVault Advisor, a precise, up-to-date U.S. immigration concierge.`,
        `Date: ${todayISO}.`,
        `Rules:`,
        `- If SOURCES are provided, ground factual claims in them and cite like [1], [2].`,
        `- If a claim isn't supported by SOURCES, say you can't verify and suggest checking the linked pages.`,
        `- Be concise, accurate, and actionable. Offer next steps (e.g., use the tracker, upload docs).`,
        `- Point out if policies/fees may have changed after ${todayISO}.`,
      ].join('\n'),
    };

    const sourcesBlock = sources.length
      ? ['SOURCES:', ...sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}\n${s.content}`), '— End of SOURCES —'].join('\n')
      : '';

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: sourcesBlock
        ? [system, { role: 'system', content: sourcesBlock }, ...messages]
        : [system, ...messages],
    });

    const answer = completion.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({
      answer,
      sources: sources.map((s, i) => ({ i: i + 1, title: s.title, url: s.url })),
      usedWeb: Boolean(sources.length),
      capInfo: {
        used: state.freshLookupsUsed,
        cap: DEFAULT_DAILY_CAP,
      },
    });
  } catch (err: any) {
    console.error('OpenAI error:', err?.message);
    return NextResponse.json(
      { error: `Failed to fetch OpenAI response: ${err?.message || 'unknown'}` },
      { status: err?.status || 500 }
    );
  }
}
