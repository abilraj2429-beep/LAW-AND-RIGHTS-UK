import { useEffect, useState, type FormEvent } from 'react';
import { LogOut, Plus, Trash2, Edit3, CheckCircle2 } from 'lucide-react';
import {
  createArticle,
  createRule,
  deleteArticle,
  deleteRule,
  updateArticle,
  updateRule,
} from '../api';
import type {
  Article,
  AuthorProfile,
  Jurisdiction,
  LawRule,
  PracticeArea,
  RuleStatus,
} from '../types';

export interface ArticleDraftSeed {
  title: string;
  subtitle: string;
  citation: string;
  legislationUrl: string;
  effectiveDate: string;
  body: string;
}

interface EditorialDeskViewProps {
  author: AuthorProfile;
  articles: Article[];
  rules: LawRule[];
  editingArticle: Article | null;
  draftSeed: ArticleDraftSeed | null;
  onConsumeSeed: () => void;
  onDataChanged: () => Promise<void>;
  onOpenArticle: (articleId: string) => void;
  onLogout: () => Promise<void>;
}

const PRACTICE_AREAS: PracticeArea[] = [
  'Corporate',
  'Employment',
  'Regulatory Compliance',
  'Immigration & Sponsorship',
];

const JURISDICTIONS: Jurisdiction[] = [
  'UK-Wide',
  'England & Wales',
  'Scotland',
  'Northern Ireland',
];

const RULE_STATUSES: RuleStatus[] = ['In Force', 'Amended', 'Commencement Pending'];

export function EditorialDeskView({
  author,
  articles,
  rules,
  editingArticle,
  draftSeed,
  onConsumeSeed,
  onDataChanged,
  onOpenArticle,
  onLogout,
}: EditorialDeskViewProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'rules'>('articles');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Article form state
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [practiceArea, setPracticeArea] = useState<PracticeArea>('Corporate');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('UK-Wide');
  const [citation, setCitation] = useState('');
  const [legislationUrl, setLegislationUrl] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [pullQuote, setPullQuote] = useState('');
  const [body, setBody] = useState('');
  const [featured, setFeatured] = useState(false);

  // Rule form state
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [statutoryCode, setStatutoryCode] = useState('');
  const [rulePracticeArea, setRulePracticeArea] = useState<PracticeArea>('Corporate');
  const [ruleJurisdiction, setRuleJurisdiction] = useState<Jurisdiction>('UK-Wide');
  const [ruleStatus, setRuleStatus] = useState<RuleStatus>('In Force');
  const [ruleEffectiveDate, setRuleEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [officialUrl, setOfficialUrl] = useState('https://www.legislation.gov.uk');
  const [ruleSummary, setRuleSummary] = useState('');
  const [obligationsText, setObligationsText] = useState('');

  const resetArticleForm = () => {
    setSelectedArticleId(null);
    setTitle('');
    setSubtitle('');
    setPracticeArea('Corporate');
    setJurisdiction('UK-Wide');
    setCitation('');
    setLegislationUrl('');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setPullQuote('');
    setBody('');
    setFeatured(false);
  };

  const populateArticleForm = (art: Article) => {
    setActiveTab('articles');
    setSelectedArticleId(art.id);
    setTitle(art.title);
    setSubtitle(art.subtitle);
    setPracticeArea(art.practiceArea);
    setJurisdiction(art.jurisdiction);
    setCitation(art.citation);
    setLegislationUrl(art.legislationUrl || '');
    setEffectiveDate(art.effectiveDate);
    setPullQuote(art.pullQuote || '');
    setBody(art.body);
    setFeatured(art.featured);
  };

  useEffect(() => {
    if (editingArticle) {
      populateArticleForm(editingArticle);
      onConsumeSeed();
    } else if (draftSeed) {
      setActiveTab('articles');
      setSelectedArticleId(null);
      setTitle(draftSeed.title);
      setSubtitle(draftSeed.subtitle);
      setCitation(draftSeed.citation);
      setLegislationUrl(draftSeed.legislationUrl);
      setEffectiveDate(draftSeed.effectiveDate);
      setBody(draftSeed.body);
      setFeatured(false);
      onConsumeSeed();
    }
  }, [editingArticle, draftSeed, onConsumeSeed]);

  const resetRuleForm = () => {
    setSelectedRuleId(null);
    setRuleTitle('');
    setStatutoryCode('');
    setRulePracticeArea('Corporate');
    setRuleJurisdiction('UK-Wide');
    setRuleStatus('In Force');
    setRuleEffectiveDate(new Date().toISOString().slice(0, 10));
    setOfficialUrl('https://www.legislation.gov.uk');
    setRuleSummary('');
    setObligationsText('');
  };

  const populateRuleForm = (rule: LawRule) => {
    setActiveTab('rules');
    setSelectedRuleId(rule.id);
    setRuleTitle(rule.ruleTitle);
    setStatutoryCode(rule.statutoryCode);
    setRulePracticeArea(rule.practiceArea);
    setRuleJurisdiction(rule.jurisdiction);
    setRuleStatus(rule.status);
    setRuleEffectiveDate(rule.effectiveDate);
    setOfficialUrl(rule.officialUrl);
    setRuleSummary(rule.summary);
    setObligationsText(rule.keyObligations.join('\n'));
  };

  const handleSaveArticle = async (targetStatus: 'published' | 'draft') => {
    setError(null);
    setNotice(null);
    if (!title.trim() || !subtitle.trim() || !body.trim()) {
      setError('Title, subtitle deck, and briefing body are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Article> = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        practiceArea,
        jurisdiction,
        citation: citation.trim() || 'UK Statutory Briefing',
        legislationUrl: legislationUrl.trim() || undefined,
        effectiveDate,
        pullQuote: pullQuote.trim() || undefined,
        body: body.trim(),
        featured,
        status: targetStatus,
      };
      if (selectedArticleId) {
        await updateArticle(selectedArticleId, payload);
        setNotice(
          targetStatus === 'published'
            ? 'Briefing updated and published.'
            : 'Draft briefing updated.',
        );
      } else {
        await createArticle(payload);
        setNotice(
          targetStatus === 'published'
            ? 'New briefing published to Chambers Gazette.'
            : 'New briefing saved as draft.',
        );
        resetArticleForm();
      }
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save briefing.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    setError(null);
    setNotice(null);
    try {
      await deleteArticle(id);
      if (selectedArticleId === id) resetArticleForm();
      setNotice('Briefing removed.');
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete briefing.');
    }
  };

  const handleSaveRule = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!ruleTitle.trim() || !statutoryCode.trim() || !ruleSummary.trim()) {
      setError('Rule title, statutory code, and summary are required.');
      return;
    }
    setSaving(true);
    try {
      const obligations = obligationsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const payload: Partial<LawRule> = {
        ruleTitle: ruleTitle.trim(),
        statutoryCode: statutoryCode.trim(),
        practiceArea: rulePracticeArea,
        jurisdiction: ruleJurisdiction,
        status: ruleStatus,
        effectiveDate: ruleEffectiveDate,
        officialUrl: officialUrl.trim() || 'https://www.legislation.gov.uk',
        summary: ruleSummary.trim(),
        keyObligations: obligations,
      };
      if (selectedRuleId) {
        await updateRule(selectedRuleId, payload);
        setNotice('Statutory rule updated.');
      } else {
        await createRule(payload);
        setNotice('New UK law rule added to the directory.');
        resetRuleForm();
      }
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save statutory rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    setError(null);
    setNotice(null);
    try {
      await deleteRule(id);
      if (selectedRuleId === id) resetRuleForm();
      setNotice('Statutory rule removed.');
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule.');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-900 mb-1">
            Signed in as {author.email}
          </div>
          <h1 className="font-editorial text-3xl font-semibold text-slate-900">
            Author Editorial Desk
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void onLogout()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Mode Switch Tabs */}
      <div className="py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
          <button
            type="button"
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'articles'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Briefings ({articles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            UK Law Rules ({rules.length})
          </button>
        </div>

        {activeTab === 'articles' ? (
          <button
            type="button"
            onClick={resetArticleForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Briefing</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={resetRuleForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New UK Rule</span>
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-2.5"
        >
          {error}
        </div>
      )}

      {activeTab === 'articles' ? (
        <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Existing Briefings List */}
          <div className="lg:col-span-5 border border-slate-200 rounded-md divide-y divide-slate-200 bg-white">
            <div className="px-4 py-3 bg-slate-50 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Published &amp; Draft Briefings
            </div>
            {articles.map((art) => (
              <div
                key={art.id}
                className={`p-4 transition-colors ${
                  selectedArticleId === art.id ? 'bg-slate-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 mb-1">
                  <span>
                    {art.practiceArea} · {art.status === 'draft' ? 'DRAFT' : 'PUBLISHED'}
                  </span>
                  <span>{art.citation}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenArticle(art.id)}
                  className="text-left font-editorial text-base font-semibold text-slate-900 hover:text-blue-900 leading-snug mb-2 cursor-pointer"
                >
                  {art.title}
                </button>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => populateArticleForm(art)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteArticle(art.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Authoring Form */}
          <div className="lg:col-span-7 border border-slate-200 rounded-md p-6 bg-white space-y-4">
            <h2 className="font-editorial text-xl font-semibold text-slate-900 pb-3 border-b border-slate-200">
              {selectedArticleId ? 'Edit Legal Briefing' : 'Compose New Legal Briefing'}
            </h2>

            <div>
              <label htmlFor="art-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Headline
              </label>
              <input
                id="art-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Statement of Changes HC 2026: Skilled Worker & ILR Updates"
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div>
              <label htmlFor="art-subtitle" className="block text-xs font-semibold text-slate-700 mb-1">
                Executive Deck / Summary
              </label>
              <textarea
                id="art-subtitle"
                rows={2}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Concise two-sentence practitioner summary..."
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="art-area" className="block text-xs font-semibold text-slate-700 mb-1">
                  Practice Area
                </label>
                <select
                  id="art-area"
                  value={practiceArea}
                  onChange={(e) => setPracticeArea(e.target.value as PracticeArea)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                >
                  {PRACTICE_AREAS.map((pa) => (
                    <option key={pa} value={pa}>
                      {pa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="art-jur" className="block text-xs font-semibold text-slate-700 mb-1">
                  Jurisdiction
                </label>
                <select
                  id="art-jur"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                >
                  {JURISDICTIONS.map((jur) => (
                    <option key={jur} value={jur}>
                      {jur}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="art-citation" className="block text-xs font-semibold text-slate-700 mb-1">
                  Statutory Citation
                </label>
                <input
                  id="art-citation"
                  type="text"
                  value={citation}
                  onChange={(e) => setCitation(e.target.value)}
                  placeholder="e.g., SI 2026/1142"
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                />
              </div>

              <div>
                <label htmlFor="art-effective" className="block text-xs font-semibold text-slate-700 mb-1">
                  Effective / Commencement Date
                </label>
                <input
                  id="art-effective"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="art-url" className="block text-xs font-semibold text-slate-700 mb-1">
                Official Legislation URL (optional)
              </label>
              <input
                id="art-url"
                type="url"
                value={legislationUrl}
                onChange={(e) => setLegislationUrl(e.target.value)}
                placeholder="https://www.legislation.gov.uk/..."
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div>
              <label htmlFor="art-quote" className="block text-xs font-semibold text-slate-700 mb-1">
                Editorial Pull Quote (optional)
              </label>
              <input
                id="art-quote"
                type="text"
                value={pullQuote}
                onChange={(e) => setPullQuote(e.target.value)}
                placeholder="Key practitioner takeaway highlighted in reader view..."
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div>
              <label htmlFor="art-body" className="block text-xs font-semibold text-slate-700 mb-1">
                Briefing Prose (use ## for section headings, blank lines between paragraphs)
              </label>
              <textarea
                id="art-body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write statutory analysis and practitioner guidance..."
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900 leading-relaxed"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
              />
              <span>Feature prominently on Front Page</span>
            </label>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveArticle('draft')}
                className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveArticle('published')}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Publish Briefing'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Existing Rules List */}
          <div className="lg:col-span-5 border border-slate-200 rounded-md divide-y divide-slate-200 bg-white">
            <div className="px-4 py-3 bg-slate-50 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Indexed Statutory Rules
            </div>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 transition-colors ${
                  selectedRuleId === rule.id ? 'bg-slate-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 mb-1">
                  <span>{rule.statutoryCode}</span>
                  <span>{rule.status}</span>
                </div>
                <div className="font-editorial text-base font-semibold text-slate-900 leading-snug mb-2">
                  {rule.ruleTitle}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => populateRuleForm(rule)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteRule(rule.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rule Authoring Form */}
          <form
            onSubmit={handleSaveRule}
            className="lg:col-span-7 border border-slate-200 rounded-md p-6 bg-white space-y-4"
          >
            <h2 className="font-editorial text-xl font-semibold text-slate-900 pb-3 border-b border-slate-200">
              {selectedRuleId ? 'Edit UK Law Rule' : 'Add UK Law Rule to Directory'}
            </h2>

            <div>
              <label htmlFor="rule-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Rule Title
              </label>
              <input
                id="rule-title"
                type="text"
                value={ruleTitle}
                onChange={(e) => setRuleTitle(e.target.value)}
                placeholder="e.g., Care Worker Sponsorship & CQC Regulated Activity Rule"
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rule-code" className="block text-xs font-semibold text-slate-700 mb-1">
                  Statutory Code / Section
                </label>
                <input
                  id="rule-code"
                  type="text"
                  value={statutoryCode}
                  onChange={(e) => setStatutoryCode(e.target.value)}
                  placeholder="e.g., Immigration Rules SW 6.1B"
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                />
              </div>

              <div>
                <label htmlFor="rule-area" className="block text-xs font-semibold text-slate-700 mb-1">
                  Practice Area
                </label>
                <select
                  id="rule-area"
                  value={rulePracticeArea}
                  onChange={(e) => setRulePracticeArea(e.target.value as PracticeArea)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                >
                  {PRACTICE_AREAS.map((pa) => (
                    <option key={pa} value={pa}>
                      {pa}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="rule-jur" className="block text-xs font-semibold text-slate-700 mb-1">
                  Jurisdiction
                </label>
                <select
                  id="rule-jur"
                  value={ruleJurisdiction}
                  onChange={(e) => setRuleJurisdiction(e.target.value as Jurisdiction)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                >
                  {JURISDICTIONS.map((jur) => (
                    <option key={jur} value={jur}>
                      {jur}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rule-status" className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  id="rule-status"
                  value={ruleStatus}
                  onChange={(e) => setRuleStatus(e.target.value as RuleStatus)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                >
                  {RULE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rule-eff" className="block text-xs font-semibold text-slate-700 mb-1">
                  Effective Date
                </label>
                <input
                  id="rule-eff"
                  type="date"
                  value={ruleEffectiveDate}
                  onChange={(e) => setRuleEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="rule-url" className="block text-xs font-semibold text-slate-700 mb-1">
                Official Source URL
              </label>
              <input
                id="rule-url"
                type="url"
                value={officialUrl}
                onChange={(e) => setOfficialUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div>
              <label htmlFor="rule-summary" className="block text-xs font-semibold text-slate-700 mb-1">
                Statutory Summary
              </label>
              <textarea
                id="rule-summary"
                rows={3}
                value={ruleSummary}
                onChange={(e) => setRuleSummary(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div>
              <label htmlFor="rule-obligations" className="block text-xs font-semibold text-slate-700 mb-1">
                Key Compliance Obligations (one duty per line)
              </label>
              <textarea
                id="rule-obligations"
                rows={4}
                value={obligationsText}
                onChange={(e) => setObligationsText(e.target.value)}
                placeholder="Enter each compliance obligation on a new line..."
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : selectedRuleId ? 'Update Statutory Rule' : 'Save Statutory Rule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
