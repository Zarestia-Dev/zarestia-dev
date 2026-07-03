import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// ============================================================================
// GITHUB SERVICE — runtime fetching via Cloudflare Worker proxy.
// ----------------------------------------------------------------------------
// The site fetches GitHub data at runtime from a Cloudflare Worker that:
//   - Authenticates with a GitHub token (server-side, never exposed)
//   - Caches responses at the edge (s-maxage=900, max-age=300)
//   - Proxies both REST and GraphQL endpoints under /api/github/*
//
// This means: no rebuild needed when GitHub data changes. The site loads,
// shows a loading state, then fills in real data. localStorage caches the
// last successful fetch so the first paint is instant on repeat visits.
// ============================================================================

export interface GitHubProfile {
  login: string;
  name: string;
  bio: string;
  avatarUrl: string;
  htmlUrl: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  twitterUsername: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubLanguage {
  name: string;
  color: string;
  bytes: number;
  percent: number;
}

export interface GitHubRepo {
  name: string;
  nameWithOwner: string;
  description: string;
  url: string;
  homepageUrl: string | null;
  stars: number;
  forks: number;
  isArchived: boolean;
  isFork: boolean;
  primaryLanguage: string | null;
  primaryLanguageColor: string | null;
  updatedAt: string;
  pushedAt: string;
  license: string | null;
  topics: string[];
  languages: GitHubLanguage[];
  totalLanguageBytes: number;
  openIssues: number;
  openPulls: number;
}

export interface GitHubStats {
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  pinnedCount: number;
  languageCount: number;
  followers: number;
  following: number;
  accountAgeYears: number;
}

interface CachedData {
  meta: { fetchedAt: string; username: string; orgName: string };
  profile: GitHubProfile;
  pinnedRepos: GitHubRepo[];
  languages: GitHubLanguage[];
  stats: GitHubStats;
}

// ---- GitHub API raw response types (snake_case from API) ----
interface GitHubUserResponse {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  twitter_username: string | null;
  created_at: string;
  updated_at: string;
}

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  fork: boolean;
  language: string | null;
  updated_at: string;
  pushed_at: string;
  license: { spdx_id: string } | null;
  topics: string[];
}

const CACHE_KEY = 'zarestia-github-cache';
// Cache valid for 1 hour in localStorage (Worker has its own edge cache too)
const CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly http = inject(HttpClient);
  private readonly proxyUrl = environment.githubProxyUrl?.replace(/\/$/, '') ?? '';
  private readonly username = environment.githubUsername || 'Hakanbaban53';
  private readonly orgName = environment.githubOrgName || 'Zarestia-Dev';

  // ---- Reactive state (signals for zoneless Angular) ----
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly fetchedAt = signal<string>('');

  readonly profile = signal<GitHubProfile | null>(null);
  readonly repos = signal<GitHubRepo[]>([]);
  readonly languages = signal<GitHubLanguage[]>([]);
  readonly stats = signal<GitHubStats | null>(null);

  // ---- Computed convenience getters ----
  readonly activeRepos = computed<GitHubRepo[]>(() =>
    this.repos().filter((r) => !r.isArchived && !r.isFork)
  );

  readonly topLanguages = computed<GitHubLanguage[]>(() =>
    [...this.languages()].sort((a, b) => b.bytes - a.bytes).slice(0, 6)
  );

  readonly totalStars = computed<number>(() =>
    this.repos().reduce((s, r) => s + r.stars, 0)
  );

  readonly totalForks = computed<number>(() =>
    this.repos().reduce((s, r) => s + r.forks, 0)
  );

  // ---- Initialization ----
  // Trigger fetch immediately on service creation (first inject).
  // We don't await — components observe the signals.
  constructor() {
    // 1. Load cached data synchronously (instant first paint on repeat visits)
    this.loadFromCache();
    // 2. Fetch fresh data in the background
    void this.fetchAll();
  }

  /** Re-trigger a fresh fetch (e.g. from a "refresh" button). */
  async refresh(): Promise<void> {
    await this.fetchAll();
  }

  // ---- Fetching ----

  private async fetchAll(): Promise<void> {
    if (!this.proxyUrl) {
      this.error.set('GitHub proxy not configured.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const [profile, repos] = await Promise.all([
        this.fetchProfile(),
        this.fetchOrgRepos(),
      ]);

      const featured = this.selectFeaturedRepos(repos);
      const languages = await this.fetchLanguagesForRepos(featured);
      const stats = this.computeStats(profile, featured, languages);

      this.profile.set(profile);
      this.repos.set(featured);
      this.languages.set(languages);
      this.stats.set(stats);
      this.fetchedAt.set(new Date().toISOString());
      this.error.set(null);

      // Persist to localStorage for instant next load
      this.saveToCache({ profile, pinnedRepos: featured, languages, stats });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load GitHub data.';
      // Only set error if we have no cached data to fall back on
      if (!this.profile()) {
        this.error.set(message);
      }
      // If we have cached data, keep showing it silently
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchProfile(): Promise<GitHubProfile> {
    const data = await this.restGet<GitHubUserResponse>(`/users/${this.username}`);
    return {
      login: data.login,
      name: data.name || data.login,
      bio: data.bio || '',
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
      followers: data.followers ?? 0,
      following: data.following ?? 0,
      publicRepos: data.public_repos ?? 0,
      publicGists: data.public_gists ?? 0,
      company: data.company || null,
      blog: data.blog || null,
      location: data.location || null,
      email: data.email || null,
      twitterUsername: data.twitter_username || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private async fetchOrgRepos(): Promise<GitHubRepoResponse[]> {
    const data = await this.restGet<GitHubRepoResponse[]>(
      `/orgs/${this.orgName}/repos?per_page=100&sort=pushed&direction=desc`
    );
    return Array.isArray(data) ? data : [];
  }

  /** Select featured repos: non-fork, sorted by stars then recency, top 6. */
  private selectFeaturedRepos(repos: GitHubRepoResponse[]): GitHubRepo[] {
    return repos
      .filter((r) => !r.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 6)
      .map((r) => ({
        name: r.name,
        nameWithOwner: r.full_name,
        description: r.description || '',
        url: r.html_url,
        homepageUrl: r.homepage || null,
        stars: r.stargazers_count,
        forks: r.forks_count,
        isArchived: r.archived,
        isFork: r.fork,
        primaryLanguage: r.language || null,
        primaryLanguageColor: null,
        updatedAt: r.updated_at,
        pushedAt: r.pushed_at,
        license: r.license?.spdx_id || null,
        topics: r.topics || [],
        languages: [],
        totalLanguageBytes: 0,
        openIssues: 0,
        openPulls: 0,
      }));
  }

  /** Fetch language breakdown for each repo (in parallel) and aggregate. */
  private async fetchLanguagesForRepos(repos: GitHubRepo[]): Promise<GitHubLanguage[]> {
    const langMap = new Map<string, { color: string; bytes: number }>();

    const results = await Promise.allSettled(
      repos.map((r) =>
        this.restGet<Record<string, number>>(`/repos/${r.nameWithOwner}/languages`)
      )
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status !== 'fulfilled') continue;
      const langs = result.value;
      // Update the repo's own language list
      const repoLangs: GitHubLanguage[] = [];
      let totalBytes = 0;
      for (const [name, bytes] of Object.entries(langs)) {
        totalBytes += bytes;
        const color = this.languageColor(name);
        const entry = langMap.get(name) ?? { color, bytes: 0 };
        entry.bytes += bytes;
        langMap.set(name, entry);
        repoLangs.push({ name, color, bytes, percent: 0 });
      }
      repos[i].languages = repoLangs;
      repos[i].totalLanguageBytes = totalBytes;
      // Set primary language color
      if (repos[i].primaryLanguage && !repos[i].primaryLanguageColor) {
        repos[i].primaryLanguageColor = this.languageColor(repos[i].primaryLanguage ?? '');
      }
    }

    // Aggregate + compute percentages
    const totalBytes = [...langMap.values()].reduce((s, l) => s + l.bytes, 0);
    return [...langMap.entries()]
      .map(([name, { color, bytes }]) => ({
        name,
        color,
        bytes,
        percent: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);
  }

  private computeStats(
    profile: GitHubProfile,
    repos: GitHubRepo[],
    languages: GitHubLanguage[]
  ): GitHubStats {
    return {
      totalStars: repos.reduce((s, r) => s + r.stars, 0),
      totalForks: repos.reduce((s, r) => s + r.forks, 0),
      totalRepos: profile.publicRepos,
      pinnedCount: repos.length,
      languageCount: languages.length,
      followers: profile.followers,
      following: profile.following,
      accountAgeYears:
        (Date.now() - new Date(profile.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25),
    };
  }

  // ---- HTTP helpers ----

  private async restGet<T>(path: string): Promise<T> {
    const url = `${this.proxyUrl}/api/github${path}`;
    return firstValueFrom(this.http.get<T>(url));
  }

  // ---- localStorage cache ----

  private loadFromCache(): void {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached: CachedData = JSON.parse(raw);
      // Check TTL
      const age = Date.now() - new Date(cached.meta.fetchedAt).getTime();
      if (age > CACHE_TTL_MS * 24) return; // stale beyond 24h — skip
      this.profile.set(cached.profile);
      this.repos.set(cached.pinnedRepos);
      this.languages.set(cached.languages);
      this.stats.set(cached.stats);
      this.fetchedAt.set(cached.meta.fetchedAt);
      // We have cached data — don't show a spinner, just refresh silently
      this.loading.set(false);
    } catch {
      // ignore corrupt cache
    }
  }

  private saveToCache(data: Omit<CachedData, 'meta'>): void {
    try {
      const payload: CachedData = {
        ...data,
        meta: {
          fetchedAt: new Date().toISOString(),
          username: this.username,
          orgName: this.orgName,
        },
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage full or unavailable — non-fatal
    }
  }

  // ---- Formatting helpers (used by templates) ----

  formatCount(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n.toString();
  }

  formatDate(iso: string): string {
    try {
      return iso.slice(0, 10);
    } catch {
      return iso;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  normalizeUrl(url: string | null): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }

  displayName(): string {
    const p = this.profile();
    return p?.name || p?.login || this.username;
  }

  // ---- Language color lookup (GitHub linguist colors) ----
  private languageColor(name: string): string {
    const colors: Record<string, string> = {
      Rust: '#dea584',
      TypeScript: '#3178c6',
      JavaScript: '#f1e05a',
      Python: '#3572A5',
      'C#': '#178600',
      HTML: '#e34c26',
      SCSS: '#c6538c',
      CSS: '#563d7c',
      Shell: '#89e051',
      Ruby: '#701516',
      Go: '#00ADD8',
      Dockerfile: '#384d54',
      PowerShell: '#012456',
      Kotlin: '#A97BFF',
      Just: '#384d54',
      TSQL: '#e38c00',
    };
    return colors[name] ?? '#95999B';
  }
}
