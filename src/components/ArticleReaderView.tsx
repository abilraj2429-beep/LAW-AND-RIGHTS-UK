import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Copy, Edit3 } from 'lucide-react';
import type { Article, AuthorProfile, LawRule } from '../types';
import { EditorialImage } from './EditorialImage';

interface ArticleReaderViewProps {
  article: Article;
  relatedRules: LawRule[];
  author: AuthorProfile | null;
  onBack: () => void;
  onEditInDesk: (article: Article) => void;
  onOpenRulesIndex: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ArticleReaderView({
  article,
  relatedRules,
  author,
  onBack,
  onEditInDesk,
  onOpenRulesIndex,
}: ArticleReaderViewProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollProgress(100);
        return;
      }
      const pct = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
      setScrollProgress(pct);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article.id]);

  const handleCopyCitation = async () => {
    const citationText = `${article.title} (${article.citation}) — Chambers Gazette`;
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const blocks = article.body
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  let seenFirstParagraph = false;

  return (
    <div className="relative">
      {/* Reading progress hairline */}
      <div className="fixed top-16 left-0 right-0 h-[2px] bg-slate-100 z-20 pointer-events-none">
        <div
          className="h-full bg-blue-900 transition-[width] duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="pb-6 border-b border-slate-200 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Front Page</span>
          </button>

          {author && (
            <button
              type="button"
              onClick={() => onEditInDesk(article)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-950 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Briefing</span>
            </button>
          )}
        </div>

        {/* Asymmetric Reading Canvas: 70% Narrative / 30% Statutory Margin Rail */}
        <div className="pt-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-8">
            <header className="max-w-2xl mb-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                <span className="font-semibold text-blue-900">{article.practiceArea}</span>
                <span aria-hidden="true">·</span>
                <span>{article.jurisdiction}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{article.readTimeMinutes} min read</span>
                {article.status === 'draft' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-800">Draft Preview</span>
                  </>
                )}
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold leading-[1.15] text-slate-900 mb-4">
                {article.title}
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed">{article.subtitle}</p>
            </header>

            {article.heroImage && (
              <figure className="max-w-3xl mb-8">
                <EditorialImage
                  src={article.heroImage}
                  alt={article.title}
                  aspectClass="aspect-[16/9]"
                  className="rounded-sm border border-slate-200"
                  fallbackLabel={article.citation}
                />
                {article.imageCaption && (
                  <figcaption className="mt-2.5 text-xs font-serif italic text-slate-500">
                    {article.imageCaption}
                  </figcaption>
                )}
              </figure>
            )}

            {article.pullQuote && (
              <blockquote className="max-w-2xl my-8 py-6 border-y border-slate-200 font-editorial text-xl sm:text-2xl italic text-slate-800 leading-relaxed">
                “{article.pullQuote}”
              </blockquote>
            )}

            <div className="max-w-2xl space-y-6 text-[16px] leading-[1.75] text-slate-800">
              {blocks.map((block, index) => {
                if (block.startsWith('## ')) {
                  return (
                    <h2
                      key={index}
                      className="font-editorial text-2xl font-semibold text-slate-900 pt-4 pb-1"
                    >
                      {block.replace(/^##\s+/, '')}
                    </h2>
                  );
                }

                const applyDropCap = !seenFirstParagraph;
                seenFirstParagraph = true;

                return (
                  <p
                    key={index}
                    className={
                      applyDropCap
                        ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none first-letter:text-slate-900'
                        : undefined
                    }
                  >
                    {block}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Right 4 Columns: Statutory Margin Rail */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-8">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 pb-3 border-b border-slate-200">
                Statutory Metadata
              </h2>

              <dl className="divide-y divide-slate-200 text-sm">
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-slate-500">Citation</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900 text-right">
                    {article.citation}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-slate-500">Effective Date</dt>
                  <dd className="font-mono tabular-nums text-slate-900 text-right">
                    {formatDate(article.effectiveDate)}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-slate-500">Jurisdiction</dt>
                  <dd className="text-slate-900 text-right">{article.jurisdiction}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-slate-500">Practice Area</dt>
                  <dd className="text-slate-900 text-right">{article.practiceArea}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-slate-500">Published</dt>
                  <dd className="font-mono tabular-nums text-slate-900 text-right">
                    {formatDate(article.publishedAt)}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-slate-500 mb-0.5">Author</dt>
                  <dd className="font-medium text-slate-900">{article.authorName}</dd>
                  <dd className="text-xs text-slate-500">{article.authorRole}</dd>
                </div>
              </dl>

              <div className="pt-4 mt-2 border-t border-slate-200 space-y-2.5">
                <button
                  type="button"
                  onClick={handleCopyCitation}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Citation Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Legal Citation</span>
                    </>
                  )}
                </button>

                {article.legislationUrl && (
                  <a
                    href={article.legislationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <span>View Official Statutory Text</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {relatedRules.length > 0 && (
              <div className="border border-slate-200 rounded-md p-6">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Related UK Rules
                  </h2>
                  <button
                    type="button"
                    onClick={onOpenRulesIndex}
                    className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                  >
                    All Rules
                  </button>
                </div>
                <ul className="divide-y divide-slate-200">
                  {relatedRules.map((rule) => (
                    <li key={rule.id} className="py-3">
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 mb-0.5">
                        {rule.statutoryCode}
                      </div>
                      <button
                        type="button"
                        onClick={onOpenRulesIndex}
                        className="text-left text-sm font-medium text-slate-900 hover:text-blue-900 transition-colors cursor-pointer"
                      >
                        {rule.ruleTitle}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </article>
    </div>
  );
}
