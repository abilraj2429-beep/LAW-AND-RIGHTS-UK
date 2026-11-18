import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { XMLParser } from 'fast-xml-parser';
import { SEED_ARTICLES, SEED_RULES } from './server/seedData.ts';
import type {
  Article,
  AuthorProfile,
  LawRule,
  LegislationFeedItem,
  LegislationFeedResponse,
} from './src/types.ts';

dotenv.config();

const PORT = 3000;
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'gazette-store.json');

const AUTHOR_EMAIL = (process.env.AUTHOR_EMAIL || '').trim().toLowerCase();
const AUTHOR_PASSCODE = process.env.AUTHOR_PASSCODE || '';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`chambers-gazette-${AUTHOR_EMAIL}`).digest('hex');

interface StoreData {
  articles: Article[];
  rules: LawRule[];
}

function ensureStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreData = {
      articles: SEED_ARTICLES,
      rules: SEED_RULES,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoreData;
    return {
      articles: Array.isArray(parsed.articles) ? parsed.articles : SEED_ARTICLES,
      rules: Array.isArray(parsed.rules) ? parsed.rules : SEED_RULES,
    };
  } catch {
    const fallback: StoreData = { articles: SEED_ARTICLES, rules: SEED_RULES };
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function saveStore(data: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

let store: StoreData = ensureStore();

function signSessionToken(profile: AuthorProfile): string {
  const payload = Buffer.from(
    JSON.stringify({
      email: profile.email,
      name: profile.name,
      role: profile.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined): AuthorProfile | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as AuthorProfile & {
      exp: number;
    };
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return {
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

function extractTokenFromRequest(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key === 'cg_author_session') {
      return decodeURIComponent(val);
    }
  }
  return undefined;
}

function getAuthenticatedAuthor(req: express.Request): AuthorProfile | null {
  const token = extractTokenFromRequest(req);
  return verifySessionToken(token);
}

// --- Legislation.gov.uk XML Atom Feed Parser & Cache ---
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: false,
});

interface CachedFeed {
  expiresAt: number;
  data: LegislationFeedResponse;
}

const feedCache = new Map<string, CachedFeed>();
const CACHE_TTL_MS = 1000 * 60 * 10;

const TYPE_LABELS: Record<string, string> = {
  ukpga: 'UK Public General Act',
  uksi: 'UK Statutory Instrument',
  asp: 'Act of Scottish Parliament',
  ssi: 'Scottish Statutory Instrument',
  wsi: 'Wales Statutory Instrument',
  asc: 'Act of Senedd Cymru',
  nia: 'Act of Northern Ireland Assembly',
  nisr: 'Northern Ireland Statutory Rule',
  ukdsi: 'UK Draft Statutory Instrument',
  ukla: 'UK Local Act',
  ukmo: 'UK Ministerial Order',
};

const FULL_TYPE_MAP: Record<string, string> = {
  unitedkingdompublicgeneralact: 'ukpga',
  unitedkingdomstatutoryinstrument: 'uksi',
  actofscottishparliament: 'asp',
  scottishstatutoryinstrument: 'ssi',
  walesstatutoryinstrument: 'wsi',
  actofseneddcymru: 'asc',
  northernirelandact: 'nia',
  northernirelandstatutoryrule: 'nisr',
  unitedkingdomdraftstatutoryinstrument: 'ukdsi',
  unitedkingdomlocalact: 'ukla',
  unitedkingdomministerialorder: 'ukmo',
};

function normalizeDocType(raw: string, inferredType: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (FULL_TYPE_MAP[cleaned]) return FULL_TYPE_MAP[cleaned];
  if (TYPE_LABELS[cleaned]) return cleaned;
  if (inferredType && TYPE_LABELS[inferredType]) return inferredType;
  return inferredType || cleaned || 'uksi';
}

function readText(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj['#text'] === 'string') return obj['#text'].trim();
    if (typeof obj['#text'] === 'number') return String(obj['#text']);
    if (obj['@_Value'] !== undefined) return String(obj['@_Value']).trim();
  }
  return '';
}

function pickEntryLink(links: unknown): string {
  const list = Array.isArray(links) ? links : links ? [links] : [];
  for (const item of list) {
    if (item && typeof item === 'object') {
      const linkObj = item as Record<string, unknown>;
      const rel = String(linkObj['@_rel'] || 'alternate');
      const type = String(linkObj['@_type'] || '');
      const href = String(linkObj['@_href'] || '');
      if (href && (rel === 'alternate' || !type.includes('atom'))) {
        return href;
      }
    }
  }
  for (const item of list) {
    if (item && typeof item === 'object') {
      const href = String((item as Record<string, unknown>)['@_href'] || '');
      if (href) return href.replace(/\/data\.xml$/, '').replace(/\/data\.feed$/, '');
    }
  }
  return 'https://www.legislation.gov.uk';
}

function formatCitation(type: string, year: string, number: string): string {
  const upper = type.toUpperCase();
  if (type === 'ukpga' && year && number) return `UKPGA ${year} c. ${number}`;
  if (type === 'uksi' && year && number) return `SI ${year}/${number}`;
  if (year && number) return `${upper} ${year}/${number}`;
  if (year) return `${upper} ${year}`;
  return upper || 'UK STATUTE';
}

function inferTypeFromId(idUrl: string): { type: string; year: string; number: string } {
  const match = idUrl.match(/legislation\.gov\.uk\/id\/([a-z]+)\/(\d{4})\/(\d+)/i);
  if (match) {
    return { type: match[1].toLowerCase(), year: match[2], number: match[3] };
  }
  return { type: 'uksi', year: '', number: '' };
}

async function fetchLegislationFeed(params: {
  feedType: 'new' | 'uksi' | 'ukpga';
  page: number;
  date?: string;
  query?: string;
}): Promise<LegislationFeedResponse> {
  const { feedType, page, date, query } = params;
  const cleanDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
  const cleanQuery = (query || '').trim();

  let baseUrl = `https://www.legislation.gov.uk/${feedType}/data.feed`;
  if (feedType === 'new' && cleanDate) {
    baseUrl = `https://www.legislation.gov.uk/new/${cleanDate}/data.feed`;
  }
  const urlObj = new URL(baseUrl);
  if (page > 1) {
    urlObj.searchParams.set('page', String(page));
  }
  if (cleanQuery && feedType !== 'new') {
    urlObj.searchParams.set('title', cleanQuery);
  }

  const cacheKey = `${urlObj.toString()}::${cleanQuery.toLowerCase()}`;
  const cached = feedCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500);
    const response = await fetch(urlObj.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/atom+xml, application/xml, text/xml',
        'User-Agent': 'ChambersGazetteLegalDigest/1.0 (+https://www.legislation.gov.uk)',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`legislation.gov.uk returned HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const parsed = xmlParser.parse(xmlText) as Record<string, unknown>;
    const feed = (parsed.feed || {}) as Record<string, unknown>;
    const rawEntries = feed.entry;
    const entries: Record<string, unknown>[] = Array.isArray(rawEntries)
      ? (rawEntries as Record<string, unknown>[])
      : rawEntries && typeof rawEntries === 'object'
        ? [rawEntries as Record<string, unknown>]
        : [];

    let items: LegislationFeedItem[] = entries.map((entry) => {
      const id = readText(entry.id) || crypto.randomUUID();
      const title = readText(entry.title) || 'Untitled Statutory Instrument';
      const inferred = inferTypeFromId(id);
      const rawDocType = readText(entry['ukm:DocumentMainType']);
      const docType = normalizeDocType(rawDocType, inferred.type);
      const year = readText(entry['ukm:Year']) || inferred.year;
      const number = readText(entry['ukm:Number']) || inferred.number;
      const publishedDate =
        readText(entry.published) ||
        readText(entry['ukm:CreationDate']) ||
        readText(entry.updated) ||
        '';
      const updatedDate = readText(entry.updated) || publishedDate;
      const summary = readText(entry.summary).replace(/\s+/g, ' ').trim();
      const link = pickEntryLink(entry.link);

      return {
        id,
        title,
        type: docType,
        typeLabel: TYPE_LABELS[docType] || docType.toUpperCase(),
        year,
        number,
        citation: formatCitation(docType, year, number),
        publishedDate,
        updatedDate,
        summary:
          summary ||
          `Official ${TYPE_LABELS[docType] || 'UK statutory'} publication indexed via The National Archives.`,
        link,
      };
    });

    if (cleanQuery && feedType === 'new') {
      const qLower = cleanQuery.toLowerCase();
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(qLower) ||
          it.citation.toLowerCase().includes(qLower) ||
          it.summary.toLowerCase().includes(qLower),
      );
    }

    const totalResultsRaw = Number(readText(feed['opensearch:totalResults']) || items.length);
    const totalResults = Number.isFinite(totalResultsRaw) ? totalResultsRaw : items.length;
    const morePages = Number(readText(feed['leg:morePages']) || 0);

    const result: LegislationFeedResponse = {
      items,
      totalResults,
      page,
      hasMore: morePages > 0 || items.length >= 20,
      feedType,
      fetchedAt: new Date().toISOString(),
      sourceStatus: 'live',
    };

    feedCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to reach legislation.gov.uk';
    return {
      items: [],
      totalResults: 0,
      page,
      hasMore: false,
      feedType,
      fetchedAt: new Date().toISOString(),
      sourceStatus: 'unavailable',
      errorMessage: message,
    };
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
 const app = express();
async function startServer(): Promise<void> {
 
  app.use(express.json({ limit: '1mb' }));

  // --- Auth Endpoints ---
  app.get('/api/auth/me', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    res.json({ author });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const passcode = String(req.body?.passcode || '');

    if (!email || !passcode) {
      res.status(400).json({ error: 'Email and editorial passcode are required.' });
      return;
    }

    if (email !== AUTHOR_EMAIL || passcode !== AUTHOR_PASSCODE) {
      res.status(401).json({ error: 'Invalid editorial author credentials.' });
      return;
    }

    const profile: AuthorProfile = {
      email,
      name: 'Managing Editor',
      role: 'Author & Statutory Editor',
    };
    const token = signSessionToken(profile);
    res.cookie('cg_author_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ author: profile, token });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('cg_author_session');
    res.json({ ok: true });
  });

  // --- Articles Endpoints ---
  app.get('/api/articles', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    const includeDrafts = req.query.includeDrafts === 'true' && author !== null;
    const articles = store.articles
      .filter((item) => (includeDrafts ? true : item.status === 'published'))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    res.json({ articles });
  });

  app.post('/api/articles', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    if (!author) {
      res.status(401).json({ error: 'Author authentication required.' });
      return;
    }
    const body = req.body as Partial<Article>;
    const title = String(body.title || '').trim();
    const subtitle = String(body.subtitle || '').trim();
    const prose = String(body.body || '').trim();
    if (!title || !subtitle || !prose) {
      res.status(400).json({ error: 'Title, subtitle, and briefing text are required.' });
      return;
    }

    const now = new Date().toISOString();
    const wordCount = prose.split(/\s+/).filter(Boolean).length;
    const article: Article = {
      id: `art-${crypto.randomUUID().slice(0, 8)}`,
      title,
      slug: slugify(title) || `briefing-${Date.now()}`,
      subtitle,
      body: prose,
      pullQuote: body.pullQuote?.trim() || undefined,
      practiceArea:
        body.practiceArea === 'Employment' ||
        body.practiceArea === 'Regulatory Compliance' ||
        body.practiceArea === 'Immigration & Sponsorship'
          ? body.practiceArea
          : 'Corporate',
      jurisdiction: body.jurisdiction || 'UK-Wide',
      citation: String(body.citation || 'UK Statutory Briefing').trim(),
      legislationUrl: body.legislationUrl?.trim() || undefined,
      effectiveDate: String(body.effectiveDate || now.slice(0, 10)).trim(),
      readTimeMinutes: Math.max(2, Math.round(wordCount / 210)),
      featured: Boolean(body.featured),
      heroImage: body.heroImage?.trim() || undefined,
      imageCaption: body.imageCaption?.trim() || undefined,
      status: body.status === 'draft' ? 'draft' : 'published',
      authorName: String(body.authorName || author.name).trim(),
      authorRole: String(body.authorRole || author.role).trim(),
      publishedAt: now,
      updatedAt: now,
    };

    store.articles = [article, ...store.articles];
    saveStore(store);
    res.status(201).json({ article });
  });

  app.put('/api/articles/:id', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    if (!author) {
      res.status(401).json({ error: 'Author authentication required.' });
      return;
    }
    const idx = store.articles.findIndex((item) => item.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Briefing not found.' });
      return;
    }
    const existing = store.articles[idx];
    const body = req.body as Partial<Article>;
    const prose = body.body !== undefined ? String(body.body).trim() : existing.body;
    const wordCount = prose.split(/\s+/).filter(Boolean).length;

    const updated: Article = {
      ...existing,
      title: body.title !== undefined ? String(body.title).trim() : existing.title,
      subtitle: body.subtitle !== undefined ? String(body.subtitle).trim() : existing.subtitle,
      body: prose,
      pullQuote: body.pullQuote !== undefined ? body.pullQuote.trim() || undefined : existing.pullQuote,
      practiceArea: body.practiceArea || existing.practiceArea,
      jurisdiction: body.jurisdiction || existing.jurisdiction,
      citation: body.citation !== undefined ? String(body.citation).trim() : existing.citation,
      legislationUrl:
        body.legislationUrl !== undefined
          ? body.legislationUrl.trim() || undefined
          : existing.legislationUrl,
      effectiveDate:
        body.effectiveDate !== undefined ? String(body.effectiveDate).trim() : existing.effectiveDate,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      status: body.status || existing.status,
      readTimeMinutes: Math.max(2, Math.round(wordCount / 210)),
      updatedAt: new Date().toISOString(),
    };

    store.articles[idx] = updated;
    saveStore(store);
    res.json({ article: updated });
  });

  app.delete('/api/articles/:id', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    if (!author) {
      res.status(401).json({ error: 'Author authentication required.' });
      return;
    }
    const before = store.articles.length;
    store.articles = store.articles.filter((item) => item.id !== req.params.id);
    if (store.articles.length === before) {
      res.status(404).json({ error: 'Briefing not found.' });
      return;
    }
    saveStore(store);
    res.json({ ok: true });
  });

  // --- UK Law Rules Endpoints ---
  app.get('/api/rules', (_req, res) => {
    const rules = [...store.rules].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    res.json({ rules });
  });

  app.post('/api/rules', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    if (!author) {
      res.status(401).json({ error: 'Author authentication required.' });
      return;
    }
    const body = req.body as Partial<LawRule>;
    const ruleTitle = String(body.ruleTitle || '').trim();
    const statutoryCode = String(body.statutoryCode || '').trim();
    const summary = String(body.summary || '').trim();
    if (!ruleTitle || !statutoryCode || !summary) {
      res.status(400).json({ error: 'Rule title, statutory code, and summary are required.' });
      return;
    }

    const obligations = Array.isArray(body.keyObligations)
      ? body.keyObligations.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const rule: LawRule = {
      id: `rule-${crypto.randomUUID().slice(0, 8)}`,
      ruleTitle,
      statutoryCode,
      practiceArea:
        body.practiceArea === 'Employment' ||
        body.practiceArea === 'Regulatory Compliance' ||
        body.practiceArea === 'Immigration & Sponsorship'
          ? body.practiceArea
          : 'Corporate',
      jurisdiction: body.jurisdiction || 'UK-Wide',
      status:
        body.status === 'Commencement Pending' || body.status === 'Amended'
          ? body.status
          : 'In Force',
      summary,
      keyObligations: obligations,
      effectiveDate: String(body.effectiveDate || new Date().toISOString().slice(0, 10)).trim(),
      officialUrl: String(body.officialUrl || 'https://www.legislation.gov.uk').trim(),
      relatedArticleIds: Array.isArray(body.relatedArticleIds) ? body.relatedArticleIds : [],
      updatedAt: new Date().toISOString(),
    };

    store.rules = [rule, ...store.rules];
    saveStore(store);
    res.status(201).json({ rule });
  });

  app.put('/api/rules/:id', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    if (!author) {
      res.status(401).json({ error: 'Author authentication required.' });
      return;
    }
    const idx = store.rules.findIndex((item) => item.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Rule entry not found.' });
      return;
    }
    const existing = store.rules[idx];
    const body = req.body as Partial<LawRule>;
    const updated: LawRule = {
      ...existing,
      ruleTitle: body.ruleTitle !== undefined ? String(body.ruleTitle).trim() : existing.ruleTitle,
      statutoryCode:
        body.statutoryCode !== undefined ? String(body.statutoryCode).trim() : existing.statutoryCode,
      practiceArea: body.practiceArea || existing.practiceArea,
      jurisdiction: body.jurisdiction || existing.jurisdiction,
      status: body.status || existing.status,
      summary: body.summary !== undefined ? String(body.summary).trim() : existing.summary,
      keyObligations: Array.isArray(body.keyObligations)
        ? body.keyObligations.map((item) => String(item).trim()).filter(Boolean)
        : existing.keyObligations,
      effectiveDate:
        body.effectiveDate !== undefined ? String(body.effectiveDate).trim() : existing.effectiveDate,
      officialUrl:
        body.officialUrl !== undefined ? String(body.officialUrl).trim() : existing.officialUrl,
      updatedAt: new Date().toISOString(),
    };

    store.rules[idx] = updated;
    saveStore(store);
    res.json({ rule: updated });
  });

  app.delete('/api/rules/:id', (req, res) => {
    const author = getAuthenticatedAuthor(req);
    if (!author) {
      res.status(401).json({ error: 'Author authentication required.' });
      return;
    }
    const before = store.rules.length;
    store.rules = store.rules.filter((item) => item.id !== req.params.id);
    if (store.rules.length === before) {
      res.status(404).json({ error: 'Rule entry not found.' });
      return;
    }
    saveStore(store);
    res.json({ ok: true });
  });

  // --- Live UK Legislation API Proxy ---
  app.get('/api/legislation/feed', async (req, res) => {
    const rawType = String(req.query.type || 'new');
    const feedType: 'new' | 'uksi' | 'ukpga' =
      rawType === 'uksi' || rawType === 'ukpga' ? rawType : 'new';
    const pageRaw = Number(req.query.page || 1);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;

    const feed = await fetchLegislationFeed({ feedType, page, date, query });
    res.json(feed);
  });

  // --- Vite Dev Middleware / Production Static Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
} else if (!process.env.VERCEL) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Chambers Gazette server running on http://0.0.0:${PORT}`);
    });
  }
}

export const serverReady = startServer().catch((err) => {
  console.error('Failed to start Chambers Gazette server:', err);
  if (!process.env.VERCEL) {
    process.exit(1);
  }
});

export default app;
