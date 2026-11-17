import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, RefreshCw, Search } from 'lucide-react';
import type { Article, LawRule, LegislationFeedResponse, PracticeArea } from '../types';
import { EditorialImage } from './EditorialImage';

interface FrontPageViewProps {
  articles: Article[];
  rules: LawRule[];
  liveFeed: LegislationFeedResponse | null;
  liveFeedLoading: boolean;
  onRefreshLiveFeed: () => void;
  onOpenArticle: (articleId: string) => void;
  onOpenDailyFeed: () => void;
  onOpenRulesIndex: (area?: PracticeArea) => void;
  initialAreaFilter?: PracticeArea | 'All';
}

const AREAS: (PracticeArea | 'All')[] = [
  'All',
  'Corporate',
  'Employment',
  'Regulatory Compliance',
  'Immigration & Sponsorship',
];

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function FrontPageView({
  articles,
  rules,
  liveFeed,
  liveFeedLoading,
  onRefreshLiveFeed,
  onOpenArticle,
  onOpenDailyFeed,
  onOpenRulesIndex,
  initialAreaFilter = 'All',
}: FrontPageViewProps) {
  const [selectedArea, setSelectedArea] = useState<PracticeArea | 'All'>(initialAreaFilter);
  const [searchQuery, setSearchQuery] = useState('');

  const publishedArticles = useMemo(
    () => articles.filter((a) => a.status === 'published'),
    [articles],
  );

  const leadArticle = useMemo(() => {
    return publishedArticles.find((a) => a.featured) || publishedArticles[0];
  }, [publishedArticles]);

  const secondaryArticles = useMemo(() => {
    return publishedArticles
      .filter((a) => a.id !== leadArticle?.id && a.featured)
      .slice(0, 3);
  }, [publishedArticles, leadArticle]);

  const archiveArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedArticles.filter((article) => {
      if (selectedArea !== 'All' && article.practiceArea !== selectedArea) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.subtitle.toLowerCase().includes(q) ||
        article.citation.toLowerCase().includes(q) ||
        article.practiceArea.toLowerCase().includes(q)
      );
    });
  }, [publishedArticles, selectedArea, searchQuery]);

  const immigrationRulesCount = useMemo(
    () => rules.filter((r) => r.practiceArea === 'Immigration & Sponsorship').length,
    [rules],
  );

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Editorial Dateline Strip (Hero Sub-masthead, strictly outside <header>) */}
      <div className="py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{todayDisplay}</span>
          <span aria-hidden="true">·</span>
          <span>UK Statutory &amp; Regulatory Digest</span>
          <span aria-hidden="true">·</span>
          <span>London</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-[11px] text-slate-500">
          <span>{publishedArticles.length} Briefings</span>
          <span aria-hidden="true">/</span>
          <span>{rules.length} Statutory Rules Indexed</span>
        </div>
      </div>

      {/* Tier 1 + Right Sidebar: Lead Story & Today in UK Legislation */}
      <section className="pt-8 pb-12 border-b border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left 8 Columns: Lead Briefing */}
        <div className="lg:col-span-8">
          {leadArticle ? (
            <article className="group">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                <span className="font-semibold text-blue-900">{leadArticle.practiceArea}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {leadArticle.citation}
                </span>
                <span aria-hidden="true">·</span>
                <span>{leadArticle.jurisdiction}</span>
                <span aria-hidden="true">·</span>
                <span>{leadArticle.readTimeMinutes} min read</span>
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold leading-[1.15] tracking-tight text-slate-900 mb-4">
                <button
                  type="button"
                  onClick={() => onOpenArticle(leadArticle.id)}
                  className="text-left hover:text-blue-900 transition-colors cursor-pointer"
                >
                  {leadArticle.title}
                </button>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mb-6">
                {leadArticle.subtitle}
              </p>

              <figure className="mb-5">
                <button
                  type="button"
                  onClick={() => onOpenArticle(leadArticle.id)}
                  className="block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-900"
                >
                  <EditorialImage
                    src={leadArticle.heroImage}
                    alt={leadArticle.title}
                    aspectClass="aspect-[16/9]"
                    className="rounded-sm border border-slate-200"
                    fallbackLabel={leadArticle.citation}
                  />
                </button>
                {leadArticle.imageCaption && (
                  <figcaption className="mt-2.5 text-xs font-serif italic text-slate-500">
                    {leadArticle.imageCaption}
                  </figcaption>
                )}
              </figure>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-500">
                  By <span className="font-semibold text-slate-900">{leadArticle.authorName}</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatDate(leadArticle.publishedAt)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenArticle(leadArticle.id)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:text-blue-950 transition-colors cursor-pointer"
                >
                  <span>Read Full Briefing</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          ) : (
            <div className="py-12 text-sm text-slate-500">No briefings published yet.</div>
          )}
        </div>

        {/* Right 4 Columns: Live Daily Legislation Ledger + Immigration Watch */}
        <aside className="lg:col-span-4 lg:border-l lg:border-slate-200 lg:pl-8 space-y-8">
          <div>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="font-editorial text-xl font-semibold text-slate-900">
                  Today in UK Legislation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live statutory stream via legislation.gov.uk
                </p>
              </div>
              <button
                type="button"
                onClick={onRefreshLiveFeed}
                disabled={liveFeedLoading}
                aria-label="Refresh live legislation feed"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${liveFeedLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {liveFeedLoading && !liveFeed ? (
              <div className="py-4 space-y-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="py-3 border-b border-slate-100 animate-pulse">
                    <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-full bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : liveFeed?.sourceStatus === 'unavailable' ? (
              <div className="py-5 border-b border-slate-200 text-xs text-slate-600 space-y-2">
                <p>
                  Live parliamentary feed is temporarily unreachable ({liveFeed.errorMessage || 'network timeout'}).
                </p>
                <button
                  type="button"
                  onClick={onRefreshLiveFeed}
                  className="font-semibold text-blue-900 hover:underline cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {(liveFeed?.items || []).slice(0, 6).map((item) => (
                  <li key={item.id} className="py-3.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 mb-1">
                      <span className="font-medium text-slate-700">{item.citation}</span>
                      <span>{formatDate(item.publishedDate)}</span>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-start gap-1.5 text-sm font-medium text-slate-900 hover:text-blue-900 leading-snug transition-colors"
                    >
                      <span>{item.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400 group-hover:text-blue-900" />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={onOpenDailyFeed}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Full Daily Legislation Feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Focused Watch Box: ILR, Skilled Worker & Care Workers */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
            <div className="text-xs font-semibold text-blue-900 mb-1">
              Sponsorship &amp; Settlement Watch
            </div>
            <h3 className="font-editorial text-lg font-semibold text-slate-900 mb-2">
              ILR, Skilled Workers &amp; Care Worker Rules
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Updated guidance covering 5-year &amp; 10-year Indefinite Leave to Remain absence rules, CQC care worker sponsorship, and SOC 2020 going rates.
            </p>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs">
              <span className="font-mono tabular-nums text-slate-500">
                {immigrationRulesCount} Rules Indexed
              </span>
              <button
                type="button"
                onClick={() => onOpenRulesIndex('Immigration & Sponsorship')}
                className="font-semibold text-blue-900 hover:underline cursor-pointer"
              >
                Inspect Rules
              </button>
            </div>
          </div>
        </aside>
      </section>

      {/* Tier 2: Secondary Features (3-Column Salience Row) */}
      {secondaryArticles.length > 0 && (
        <section className="py-12 border-b border-slate-200">
          <div className="flex items-baseline justify-between gap-4 mb-8">
            <h2 className="font-editorial text-2xl font-semibold text-slate-900">
              Practice Area Dispatches
            </h2>
            <span className="text-xs text-slate-500">
              ILR, Adult Social Care Sponsorship &amp; Board Governance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {secondaryArticles.map((article) => (
              <article key={article.id} className="flex flex-col justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenArticle(article.id)}
                    className="block w-full text-left mb-4 cursor-pointer"
                  >
                    <EditorialImage
                      src={article.heroImage}
                      alt={article.title}
                      aspectClass="aspect-[4/3]"
                      className="rounded-sm border border-slate-200"
                      fallbackLabel={article.practiceArea}
                    />
                  </button>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-blue-900">{article.practiceArea}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{article.citation}</span>
                  </div>
                  <h3 className="font-editorial text-xl font-semibold leading-snug text-slate-900 mb-2">
                    <button
                      type="button"
                      onClick={() => onOpenArticle(article.id)}
                      className="text-left hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      {article.title}
                    </button>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4">
                    {article.subtitle}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{article.authorName}</span>
                  <span className="font-mono tabular-nums">
                    {formatDate(article.publishedAt)} · {article.readTimeMinutes}m
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Tier 3: Complete Briefings & Legal Commentary Ledger */}
      <section className="pt-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-slate-900">
              All Legal Briefings &amp; Statutory Commentary
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Filter editorial analyses across UK corporate, employment, regulatory, and immigration sponsorship law.
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search briefings or citations..."
              aria-label="Search briefings or citations"
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
            />
          </div>
        </div>

        {/* Interactive Filter Bar (Functional Segmented Buttons) */}
        <div className="py-4 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
          {AREAS.map((area) => {
            const active = selectedArea === area;
            return (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {area === 'All' ? 'All Practice Areas' : area}
              </button>
            );
          })}
        </div>

        {archiveArticles.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No briefings match your current filter. Clear the search query or select All Practice Areas.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {archiveArticles.map((article) => (
              <article
                key={article.id}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline"
              >
                <div className="md:col-span-3 space-y-1">
                  <div className="text-xs font-semibold text-blue-900">
                    {article.practiceArea}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-500">
                    {article.citation}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-400">
                    {formatDate(article.publishedAt)}
                  </div>
                </div>

                <div className="md:col-span-7">
                  <h3 className="font-editorial text-xl font-semibold text-slate-900 mb-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenArticle(article.id)}
                      className="text-left hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      {article.title}
                    </button>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{article.subtitle}</p>
                </div>

                <div className="md:col-span-2 md:text-right flex md:flex-col items-center md:items-end justify-between gap-2">
                  <span className="text-xs text-slate-500">{article.readTimeMinutes} min read</span>
                  <button
                    type="button"
                    onClick={() => onOpenArticle(article.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <span>Read</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
