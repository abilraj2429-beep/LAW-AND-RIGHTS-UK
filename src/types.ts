export type PracticeArea =
  | 'Corporate'
  | 'Employment'
  | 'Regulatory Compliance'
  | 'Immigration & Sponsorship';

export type Jurisdiction =
  | 'UK-Wide'
  | 'England & Wales'
  | 'Scotland'
  | 'Northern Ireland';

export type ArticleStatus = 'published' | 'draft';

export type RuleStatus = 'In Force' | 'Commencement Pending' | 'Amended';

export interface Article {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  body: string;
  pullQuote?: string;
  practiceArea: PracticeArea;
  jurisdiction: Jurisdiction;
  citation: string;
  legislationUrl?: string;
  effectiveDate: string;
  readTimeMinutes: number;
  featured: boolean;
  heroImage?: string;
  imageCaption?: string;
  status: ArticleStatus;
  authorName: string;
  authorRole: string;
  publishedAt: string;
  updatedAt: string;
}

export interface LawRule {
  id: string;
  ruleTitle: string;
  statutoryCode: string;
  practiceArea: PracticeArea;
  jurisdiction: Jurisdiction;
  status: RuleStatus;
  summary: string;
  keyObligations: string[];
  effectiveDate: string;
  officialUrl: string;
  relatedArticleIds: string[];
  updatedAt: string;
}

export interface LegislationFeedItem {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  year: string;
  number: string;
  citation: string;
  publishedDate: string;
  updatedDate: string;
  summary: string;
  link: string;
}

export interface LegislationFeedResponse {
  items: LegislationFeedItem[];
  totalResults: number;
  page: number;
  hasMore: boolean;
  feedType: 'new' | 'uksi' | 'ukpga';
  fetchedAt: string;
  sourceStatus: 'live' | 'unavailable';
  errorMessage?: string;
}

export interface AuthorProfile {
  email: string;
  name: string;
  role: string;
}
