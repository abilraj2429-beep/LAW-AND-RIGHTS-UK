import { useEffect, useState } from 'react';
import { ArrowUpRight, FilePlus2, RefreshCw, Search } from 'lucide-react';
import { fetchLegislationFeed } from '../api';
import type { AuthorProfile, LegislationFeedItem, LegislationFeedResponse } from '../types';

interface DailyFeedViewProps {
  author: AuthorProfile | null;
  onAnnotateItem: (item: LegislationFeedItem) => void;
}

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

export function DailyFeedView({ author, onAnnotateItem }: DailyFeedViewProps) {
  const [feedType, setFeedType] = useState<'new' | 'uksi' | 'ukpga'>('new');
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [feed, setFeed] = useState<LegislationFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeed = async (params: {
    type: 'new' | 'uksi' | 'ukpga';
    page: number;
    date: string;
    q: string;
  }) => {
    setLoading(true);
    try {
      const data = await fetchLegislationFeed({
        type: params.type,
        page: params.page,
        date: params.type === 'new' && params.date ? params.date : undefined,
        q: params.q || undefined,
      });
      setFeed(data);
    } catch (err) {
      setFeed({
        items: [],
        totalResults: 0,
        page: params.page,
        hasMore: false,
        feedType: params.type,
        fetchedAt: new Date().toISOString(),
        sourceStatus: 'unavailable',
        errorMessage: err instanceof Error ? err.message : 'Unable to reach statutory feed.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed({ type: feedType, page, date: dateFilter, q: appliedQuery });
  }, [feedType, page, dateFilter, appliedQuery]);

  const handleTypeChange = (nextType: 'new' | 'uksi' | 'ukpga') => {
    setFeedType(nextType);
    setPage(1);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <div className="pb-8 border-b border-slate-200 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <div className="text-xs font-semibold text-blue-900 mb-2">
            Official National Archives Feed
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-slate-900">
            Daily UK Legislation Updates
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">
            Real-time parliamentary enactments, Statutory Instruments, and Public General Acts streamed from{' '}
            <span className="font-mono text-slate-800">legislation.gov.uk</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadFeed({ type: feedType, page, date: dateFilter, q: appliedQuery })}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer self-start lg:self-auto whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Feed</span>
        </button>
      </div>

      {/* Controls Toolbar */}
      <div className="py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md self-start">
          {(
            [
              { id: 'new', label: 'All New Legislation' },
              { id: 'uksi', label: 'Statutory Instruments (UKSI)' },
              { id: 'ukpga', label: 'Public General Acts (UKPGA)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTypeChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                feedType === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {feedType === 'new' && (
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter new legislation by publication date"
              className="px-3 py-2 text-xs font-mono tabular-nums text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
            />
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedQuery(searchInput);
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Filter by title keyword..."
                aria-label="Filter legislation by keyword"
                className="pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-md w-56 sm:w-64 focus:outline-none focus:border-blue-900"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* Feed Content */}
      {loading ? (
        <div className="divide-y divide-slate-200">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="py-6 animate-pulse flex flex-col gap-2">
              <div className="h-3 w-40 bg-slate-200 rounded" />
              <div className="h-5 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : feed?.sourceStatus === 'unavailable' ? (
        <div className="my-8 p-6 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-editorial text-lg font-semibold text-slate-900">
              Statutory Feed Temporarily Unavailable
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {feed.errorMessage || 'Could not retrieve Atom feed from legislation.gov.uk.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadFeed({ type: feedType, page, date: dateFilter, q: appliedQuery })}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            Retry Feed
          </button>
        </div>
      ) : !feed || feed.items.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 border-b border-slate-200">
          No statutory entries found for the current selection. Try clearing the date or keyword filter.
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-200">
            {feed.items.map((item) => (
              <article
                key={item.id}
                className="py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
              >
                <div className="lg:col-span-3 space-y-1">
                  <div className="font-mono tabular-nums text-xs font-semibold text-blue-900">
                    {item.citation}
                  </div>
                  <div className="text-xs text-slate-600">{item.typeLabel}</div>
                  <div className="font-mono tabular-nums text-xs text-slate-400">
                    Published {formatDate(item.publishedDate)}
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <h2 className="font-editorial text-xl font-semibold text-slate-900 leading-snug mb-1.5">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-900 transition-colors"
                    >
                      {item.title}
                    </a>
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                </div>

                <div className="lg:col-span-3 flex flex-wrap lg:justify-end items-center gap-3">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
                  >
                    <span>Official Text</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>

                  {author && (
                    <button
                      type="button"
                      onClick={() => onAnnotateItem(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>Annotate Briefing</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="pt-6 flex items-center justify-between gap-4 border-t border-slate-200 text-xs text-slate-500">
            <span className="font-mono tabular-nums">
              Page {feed.page} · {feed.items.length} entries shown
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!feed.hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
