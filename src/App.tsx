import { useCallback, useEffect, useState } from 'react';
import {
  fetchArticles,
  fetchCurrentAuthor,
  fetchLegislationFeed,
  fetchRules,
  logoutAuthor,
} from './api';
import { ArticleReaderView } from './components/ArticleReaderView';
import { AuthorAuthModal } from './components/AuthorAuthModal';
import { DailyFeedView } from './components/DailyFeedView';
import { EditorialDeskView, type ArticleDraftSeed } from './components/EditorialDeskView';
import { FrontPageView } from './components/FrontPageView';
import { PracticeAreasView } from './components/PracticeAreasView';
import { RulesDirectoryView } from './components/RulesDirectoryView';
import { TopBar, type NavView } from './components/TopBar';
import type {
  Article,
  AuthorProfile,
  LawRule,
  LegislationFeedItem,
  LegislationFeedResponse,
  PracticeArea,
} from './types';

export default function App() {
  const [activeView, setActiveView] = useState<NavView>('front-page');
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [rules, setRules] = useState<LawRule[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [liveFeed, setLiveFeed] = useState<LegislationFeedResponse | null>(null);
  const [liveFeedLoading, setLiveFeedLoading] = useState(true);

  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [frontAreaFilter, setFrontAreaFilter] = useState<PracticeArea | 'All'>('All');
  const [rulesAreaFilter, setRulesAreaFilter] = useState<PracticeArea | 'All'>('All');

  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [draftSeed, setDraftSeed] = useState<ArticleDraftSeed | null>(null);

  const loadPublicationData = useCallback(async (isAuthor: boolean) => {
    try {
      const [fetchedArticles, fetchedRules] = await Promise.all([
        fetchArticles(isAuthor),
        fetchRules(),
      ]);
      setArticles(fetchedArticles);
      setRules(fetchedRules);
    } catch {
      // Retain existing state if transient error
    } finally {
      setDataLoading(false);
    }
  }, []);

  const loadTopLiveFeed = useCallback(async () => {
    setLiveFeedLoading(true);
    try {
      const feed = await fetchLegislationFeed({ type: 'new', page: 1 });
      setLiveFeed(feed);
    } catch {
      setLiveFeed({
        items: [],
        totalResults: 0,
        page: 1,
        hasMore: false,
        feedType: 'new',
        fetchedAt: new Date().toISOString(),
        sourceStatus: 'unavailable',
        errorMessage: 'Unable to reach legislation.gov.uk',
      });
    } finally {
      setLiveFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      let currentAuthor: AuthorProfile | null = null;
      try {
        currentAuthor = await fetchCurrentAuthor();
        setAuthor(currentAuthor);
      } catch {
        setAuthor(null);
      }
      await Promise.all([
        loadPublicationData(Boolean(currentAuthor)),
        loadTopLiveFeed(),
      ]);
    };
    void bootstrap();
  }, [loadPublicationData, loadTopLiveFeed]);

  const handleNavigate = (view: NavView) => {
    if (view === 'editorial-desk' && !author) {
      setAuthModalOpen(true);
      return;
    }
    if (view === 'front-page') {
      setFrontAreaFilter('All');
    }
    if (view === 'rules-index') {
      setRulesAreaFilter('All');
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleOpenArticle = (articleId: string) => {
    setActiveArticleId(articleId);
    setActiveView('article');
  };

  const handleAuthenticated = async (signedInAuthor: AuthorProfile) => {
    setAuthor(signedInAuthor);
    setAuthModalOpen(false);
    await loadPublicationData(true);
    setActiveView('editorial-desk');
  };

  const handleLogout = async () => {
    await logoutAuthor();
    setAuthor(null);
    await loadPublicationData(false);
    setActiveView('front-page');
  };

  const handleAnnotateFeedItem = (item: LegislationFeedItem) => {
    if (!author) {
      setAuthModalOpen(true);
      return;
    }
    setEditingArticle(null);
    setDraftSeed({
      title: `${item.title}: Practitioner Compliance Briefing`,
      subtitle: `Legal commentary on ${item.citation} (${item.typeLabel}), published on legislation.gov.uk.`,
      citation: item.citation,
      legislationUrl: item.link,
      effectiveDate: item.publishedDate.slice(0, 10) || new Date().toISOString().slice(0, 10),
      body: `## Overview of ${item.citation}\n\n${item.summary}\n\n## Key Implications for Practitioners\n\nInsert practical corporate, employment, or regulatory compliance guidance here.`,
    });
    setActiveView('editorial-desk');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleEditInDesk = (article: Article) => {
    setDraftSeed(null);
    setEditingArticle(article);
    setActiveView('editorial-desk');
  };

  const activeArticle = articles.find((a) => a.id === activeArticleId) || null;
  const relatedRulesForArticle = activeArticle
    ? rules.filter(
        (r) =>
          r.relatedArticleIds.includes(activeArticle.id) ||
          r.practiceArea === activeArticle.practiceArea,
      ).slice(0, 4)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <TopBar
        activeView={activeView}
        author={author}
        onNavigate={handleNavigate}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <div className="flex-1">
        {dataLoading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6 animate-pulse">
            <div className="h-8 w-2/3 bg-slate-200 rounded" />
            <div className="h-64 w-full bg-slate-100 rounded" />
            <div className="h-24 w-full bg-slate-100 rounded" />
          </div>
        ) : activeView === 'front-page' ? (
          <FrontPageView
            key={`front-${frontAreaFilter}`}
            articles={articles}
            rules={rules}
            liveFeed={liveFeed}
            liveFeedLoading={liveFeedLoading}
            onRefreshLiveFeed={() => void loadTopLiveFeed()}
            onOpenArticle={handleOpenArticle}
            onOpenDailyFeed={() => handleNavigate('daily-feed')}
            onOpenRulesIndex={(area) => {
              setRulesAreaFilter(area || 'All');
              setActiveView('rules-index');
              window.scrollTo({ top: 0, behavior: 'auto' });
            }}
            initialAreaFilter={frontAreaFilter}
          />
        ) : activeView === 'article' && activeArticle ? (
          <ArticleReaderView
            article={activeArticle}
            relatedRules={relatedRulesForArticle}
            author={author}
            onBack={() => handleNavigate('front-page')}
            onEditInDesk={handleEditInDesk}
            onOpenRulesIndex={() => handleNavigate('rules-index')}
          />
        ) : activeView === 'daily-feed' ? (
          <DailyFeedView author={author} onAnnotateItem={handleAnnotateFeedItem} />
        ) : activeView === 'rules-index' ? (
          <RulesDirectoryView
            key={`rules-${rulesAreaFilter}`}
            rules={rules}
            articles={articles}
            initialArea={rulesAreaFilter}
            onOpenArticle={handleOpenArticle}
          />
        ) : activeView === 'practice-areas' ? (
          <PracticeAreasView
            articles={articles}
            rules={rules}
            onFilterBriefings={(area) => {
              setFrontAreaFilter(area);
              setActiveView('front-page');
              window.scrollTo({ top: 0, behavior: 'auto' });
            }}
            onFilterRules={(area) => {
              setRulesAreaFilter(area);
              setActiveView('rules-index');
              window.scrollTo({ top: 0, behavior: 'auto' });
            }}
          />
        ) : activeView === 'editorial-desk' && author ? (
          <EditorialDeskView
            author={author}
            articles={articles}
            rules={rules}
            editingArticle={editingArticle}
            draftSeed={draftSeed}
            onConsumeSeed={() => {
              setEditingArticle(null);
              setDraftSeed(null);
            }}
            onDataChanged={() => loadPublicationData(true)}
            onOpenArticle={handleOpenArticle}
            onLogout={handleLogout}
          />
        ) : (
          <FrontPageView
            articles={articles}
            rules={rules}
            liveFeed={liveFeed}
            liveFeedLoading={liveFeedLoading}
            onRefreshLiveFeed={() => void loadTopLiveFeed()}
            onOpenArticle={handleOpenArticle}
            onOpenDailyFeed={() => handleNavigate('daily-feed')}
            onOpenRulesIndex={(area) => {
              setRulesAreaFilter(area || 'All');
              setActiveView('rules-index');
            }}
          />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-editorial text-sm font-semibold text-slate-900">
              Chambers Gazette
            </span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>UK Statutory Rules &amp; Daily Legislation Commentary</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavigate('daily-feed')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Daily Legislation Feed
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('rules-index')}
              className="hover:text-slate-900 cursor-pointer"
            >
              UK Rules Directory
            </button>
            <a
              href="https://www.legislation.gov.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900"
            >
              legislation.gov.uk
            </a>
          </div>
        </div>
      </footer>

      <AuthorAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(signedInAuthor) => void handleAuthenticated(signedInAuthor)}
      />
    </div>
  );
}
