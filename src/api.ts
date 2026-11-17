import type {
  Article,
  AuthorProfile,
  LawRule,
  LegislationFeedResponse,
} from './types';

const TOKEN_STORAGE_KEY = 'cg_author_token';

export function getStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage unavailability in restricted contexts
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errData = (await res.json()) as { error?: string };
      if (errData.error) message = errData.error;
    } catch {
      // Keep default message
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function fetchCurrentAuthor(): Promise<AuthorProfile | null> {
  const data = await apiFetch<{ author: AuthorProfile | null }>('/api/auth/me');
  return data.author;
}

export async function loginAuthor(
  email: string,
  passcode: string,
): Promise<{ author: AuthorProfile; token: string }> {
  const data = await apiFetch<{ author: AuthorProfile; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, passcode }),
  });
  setStoredToken(data.token);
  return data;
}

export async function logoutAuthor(): Promise<void> {
  setStoredToken(null);
  await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function fetchArticles(includeDrafts = false): Promise<Article[]> {
  const qs = includeDrafts ? '?includeDrafts=true' : '';
  const data = await apiFetch<{ articles: Article[] }>(`/api/articles${qs}`);
  return data.articles;
}

export async function createArticle(payload: Partial<Article>): Promise<Article> {
  const data = await apiFetch<{ article: Article }>('/api/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.article;
}

export async function updateArticle(id: string, payload: Partial<Article>): Promise<Article> {
  const data = await apiFetch<{ article: Article }>(`/api/articles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.article;
}

export async function deleteArticle(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/articles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchRules(): Promise<LawRule[]> {
  const data = await apiFetch<{ rules: LawRule[] }>('/api/rules');
  return data.rules;
}

export async function createRule(payload: Partial<LawRule>): Promise<LawRule> {
  const data = await apiFetch<{ rule: LawRule }>('/api/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.rule;
}

export async function updateRule(id: string, payload: Partial<LawRule>): Promise<LawRule> {
  const data = await apiFetch<{ rule: LawRule }>(`/api/rules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.rule;
}

export async function deleteRule(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchLegislationFeed(params: {
  type?: 'new' | 'uksi' | 'ukpga';
  page?: number;
  date?: string;
  q?: string;
}): Promise<LegislationFeedResponse> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.date) search.set('date', params.date);
  if (params.q) search.set('q', params.q);
  return apiFetch<LegislationFeedResponse>(`/api/legislation/feed?${search.toString()}`);
}
