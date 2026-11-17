import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { Article, LawRule, PracticeArea, RuleStatus } from '../types';

interface RulesDirectoryViewProps {
  rules: LawRule[];
  articles: Article[];
  initialArea?: PracticeArea | 'All';
  onOpenArticle: (articleId: string) => void;
}

const PRACTICE_FILTERS: (PracticeArea | 'All')[] = [
  'All',
  'Corporate',
  'Employment',
  'Regulatory Compliance',
  'Immigration & Sponsorship',
];

const STATUS_FILTERS: (RuleStatus | 'All')[] = [
  'All',
  'In Force',
  'Amended',
  'Commencement Pending',
];

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function RulesDirectoryView({
  rules,
  articles,
  initialArea = 'All',
  onOpenArticle,
}: RulesDirectoryViewProps) {
  const [selectedArea, setSelectedArea] = useState<PracticeArea | 'All'>(initialArea);
  const [selectedStatus, setSelectedStatus] = useState<RuleStatus | 'All'>('All');
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const first = rules[0]?.id;
    return first ? { [first]: true } : {};
  });

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (selectedArea !== 'All' && rule.practiceArea !== selectedArea) return false;
      if (selectedStatus !== 'All' && rule.status !== selectedStatus) return false;
      if (!q) return true;
      return (
        rule.ruleTitle.toLowerCase().includes(q) ||
        rule.statutoryCode.toLowerCase().includes(q) ||
        rule.summary.toLowerCase().includes(q) ||
        rule.keyObligations.some((ob) => ob.toLowerCase().includes(q))
      );
    });
  }, [rules, selectedArea, selectedStatus, query]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <div className="pb-8 border-b border-slate-200">
        <div className="text-xs font-semibold text-blue-900 mb-2">
          Statutory Reference Index
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-slate-900">
          UK Law Rules Directory
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-3xl">
          Indexed statutory obligations across Corporate Governance, Employment &amp; Tribunal Rules, Regulatory Compliance, and Immigration Sponsorship (ILR, Skilled Worker &amp; Care Worker rules).
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="py-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRACTICE_FILTERS.map((area) => {
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

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as RuleStatus | 'All')}
            aria-label="Filter rules by commencement status"
            className="px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
          >
            {STATUS_FILTERS.map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All Statuses' : st}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rule, statute, ILR, care worker..."
              aria-label="Search UK law rules"
              className="pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-md w-64 sm:w-72 focus:outline-none focus:border-blue-900"
            />
          </div>
        </div>
      </div>

      {/* Rules Count */}
      <div className="py-3 text-xs font-mono tabular-nums text-slate-500 border-b border-slate-100">
        Showing {filteredRules.length} of {rules.length} indexed statutory rules
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">
          No UK law rules matched your current filters.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filteredRules.map((rule) => {
            const isOpen = Boolean(expandedIds[rule.id]);
            const linkedArticles = articles.filter(
              (a) => a.status === 'published' && rule.relatedArticleIds.includes(a.id),
            );

            return (
              <section key={rule.id} className="py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-3 space-y-1">
                    <div className="font-mono tabular-nums text-xs font-semibold text-blue-900">
                      {rule.statutoryCode}
                    </div>
                    <div className="text-xs text-slate-600">
                      {rule.practiceArea} · {rule.jurisdiction}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-400">
                      Effective {formatDate(rule.effectiveDate)}
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
                      <span
                        className={`font-semibold ${
                          rule.status === 'In Force'
                            ? 'text-emerald-800'
                            : rule.status === 'Amended'
                              ? 'text-amber-800'
                              : 'text-slate-700'
                        }`}
                      >
                        Status: {rule.status}
                      </span>
                    </div>

                    <h2 className="font-editorial text-xl font-semibold text-slate-900 mb-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(rule.id)}
                        className="text-left hover:text-blue-900 transition-colors cursor-pointer"
                      >
                        {rule.ruleTitle}
                      </button>
                    </h2>

                    <p className="text-sm text-slate-600 leading-relaxed">{rule.summary}</p>
                  </div>

                  <div className="lg:col-span-2 flex lg:justify-end items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(rule.id)}
                      aria-expanded={isOpen}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>{isOpen ? 'Hide Duties' : 'View Duties'}</span>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-5 lg:ml-[25%] bg-slate-50 border border-slate-200 rounded-md p-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2.5">
                        Key Compliance Obligations
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-800 list-disc pl-5">
                        {rule.keyObligations.map((ob, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {ob}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                      <a
                        href={rule.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:underline"
                      >
                        <span>Official Statutory Provision</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>

                      {linkedArticles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-500">Related Commentary:</span>
                          {linkedArticles.map((art) => (
                            <button
                              key={art.id}
                              type="button"
                              onClick={() => onOpenArticle(art.id)}
                              className="font-semibold text-blue-900 hover:underline cursor-pointer"
                            >
                              {art.citation}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
