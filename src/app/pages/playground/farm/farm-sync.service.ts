import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ============================================================================
// FARM SYNC SERVICE — real GitHub OAuth + cloud sync.
// ----------------------------------------------------------------------------
// FLOW (Authorization Code with PKCE-free server exchange):
//
//   1. Client redirects to:
//        https://github.com/login/oauth/authorize
//          ?client_id=<CLIENT_ID>
//          &redirect_uri=<CALLBACK_URL>
//          &scope=read:user
//          &state=<random>
//
//   2. User authorizes on GitHub, GitHub redirects back to:
//        <CALLBACK_URL>?code=<code>&state=<state>
//
//   3. Client POSTs the `code` to the Cloudflare Worker:
//        POST /api/auth/github
//        Body: { code, state }
//
//   4. Worker exchanges the code for an access token server-side using
//      the CLIENT_SECRET (NEVER exposed to the client):
//        POST https://github.com/login/oauth/access_token
//        Body: { client_id, client_secret, code, redirect_uri }
//
//   5. Worker returns the access token + GitHub user info to the client
//      in the response. Client stores them in localStorage for future
//      requests. Worker also stores the token in KV for server-side use.
//
//   6. On subsequent sync requests, the client sends the access token in
//      the Authorization header.
//
//   7. If a sync returns 401 (token expired/revoked), the client clears
//      the session and re-prompts sign-in.
//
// ENVIRONMENT VARIABLES (set on the Cloudflare Worker, NOT the client):
//   - GITHUB_OAUTH_CLIENT_ID      — public, ok to expose client-side
//   - GITHUB_OAUTH_CLIENT_SECRET  — SECRET, only on the Worker
//   - GITHUB_OAUTH_CALLBACK_URL   — e.g. https://zarestia.dev/api/auth/github/callback
//
// The CLIENT_ID is read from environment.ts (safe to expose). The
// CLIENT_SECRET never touches the client.
// ============================================================================

export interface FarmSyncUser {
  /** GitHub user id (numeric string from GitHub API). Used as KV sync key. */
  githubUserId: string;
  login: string;
  avatarUrl?: string;
}

export interface FarmSyncState {
  signedIn: boolean;
  user: FarmSyncUser | null;
  syncing: boolean;
  /** ISO timestamp of last successful cloud sync, or null. */
  lastSync: string | null;
  /** True when local save has unsynced changes. */
  pending: boolean;
  error: string | null;
}

const SESSION_KEY = 'zarestia-farm-session';
const LAST_SYNC_KEY = 'zarestia-farm-last-sync';
const STATE_KEY = 'zarestia-farm-oauth-state';

@Injectable({ providedIn: 'root' })
export class FarmSyncService {
  private readonly http = inject(HttpClient);

  readonly state = signal<FarmSyncState>({
    signedIn: false,
    user: null,
    syncing: false,
    lastSync: this.readLastSync(),
    pending: false,
    error: null,
  });

  readonly signedIn = computed(() => this.state().signedIn);
  readonly syncing = computed(() => this.state().syncing);
  readonly pending = computed(() => this.state().pending);
  readonly lastSync = computed(() => this.state().lastSync);
  readonly error = computed(() => this.state().error);
  readonly user = computed(() => this.state().user);

  constructor() {
    this.restoreSession();
    // Check for OAuth callback on app boot (?code=...&state=...)
    this.handleOAuthCallbackIfPresent();
  }

  /** Mark the local save as having unsynced changes. */
  markPending(): void {
    if (!this.state().pending) {
      this.state.update((s) => ({ ...s, pending: true }));
    }
  }

  /**
   * Begin the GitHub OAuth flow. Redirects the browser to GitHub's
   * authorization page. The page will reload back to /playground/farm
   * with ?code=...&state=... after the user authorizes.
   */
  signIn(): void {
    const clientId = environment.githubOAuthClientId;
    if (!clientId) {
      this.state.update((s) => ({
        ...s,
        error: 'GitHub OAuth Client ID not configured. Set githubOAuthClientId in environment.ts.',
      }));
      return;
    }

    // Generate a random state param to prevent CSRF
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { sessionStorage.setItem(STATE_KEY, state); } catch { /* ignore */ }

    const callbackUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'read:user',
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }

  /**
   * On app boot, check if the URL contains ?code=...&state=... (OAuth callback).
   * If so, exchange the code for an access token via the Worker.
   */
  private async handleOAuthCallbackIfPresent(): Promise<void> {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return;

    // Validate state to prevent CSRF
    let expectedState: string | null = null;
    try { expectedState = sessionStorage.getItem(STATE_KEY); } catch { /* ignore */ }
    if (state !== expectedState) {
      this.state.update((s) => ({ ...s, error: 'OAuth state mismatch — possible CSRF attack.' }));
      this.cleanCallbackUrl();
      return;
    }
    try { sessionStorage.removeItem(STATE_KEY); } catch { /* ignore */ }

    this.state.update((s) => ({ ...s, syncing: true, error: null }));

    try {
      const proxyUrl = environment.githubProxyUrl?.replace(/\/$/, '') ?? '';
      if (!proxyUrl) {
        throw new Error('GitHub proxy URL not configured.');
      }
      // Worker exchanges code for token server-side (CLIENT_SECRET lives there)
      const response = await firstValueFrom(
        this.http.post<{ user: FarmSyncUser }>(`${proxyUrl}/api/auth/github`, {
          code,
          state,
        }).pipe()
      );
      this.persistSession(response.user);
      this.state.update((s) => ({
        ...s,
        signedIn: true,
        user: response.user,
        syncing: false,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      this.state.update((s) => ({ ...s, syncing: false, error: msg }));
    } finally {
      this.cleanCallbackUrl();
    }
  }

  /** Strip ?code=...&state=... from the URL after handling. */
  private cleanCallbackUrl(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState(null, '', url.pathname + url.hash);
  }

  async signOut(): Promise<void> {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(LAST_SYNC_KEY); } catch { /* ignore */ }
    this.state.set({
      signedIn: false,
      user: null,
      syncing: false,
      lastSync: null,
      pending: false,
      error: null,
    });
  }

  /**
   * Push the local save to the cloud. Returns true on success.
   * On 401 (token expired), clears the session and re-prompts sign-in.
   */
  async pushSave(data: string): Promise<boolean> {
    if (!this.state().signedIn) return false;
    this.state.update((s) => ({ ...s, syncing: true, error: null }));
    try {
      const proxyUrl = environment.githubProxyUrl?.replace(/\/$/, '') ?? '';
      const r = await fetch(`${proxyUrl}/api/farm/save`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: data,
      });
      if (r.status === 401) {
        // Token expired/revoked — clear session, prompt re-sign-in
        await this.signOut();
        this.state.update((s) => ({
          ...s,
          error: 'Session expired. Please sign in again.',
        }));
        return false;
      }
      if (!r.ok) throw new Error(`Sync failed (${r.status})`);

      const iso = new Date().toISOString();
      try { localStorage.setItem(LAST_SYNC_KEY, iso); } catch { /* ignore */ }
      this.state.update((s) => ({
        ...s,
        syncing: false,
        lastSync: iso,
        pending: false,
      }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      this.state.update((s) => ({ ...s, syncing: false, error: msg }));
      return false;
    }
  }

  /**
   * Pull the cloud save (if any). Returns the raw JSON string or null.
   */
  async pullSave(): Promise<string | null> {
    if (!this.state().signedIn) return null;
    const proxyUrl = environment.githubProxyUrl?.replace(/\/$/, '') ?? '';
    const r = await fetch(`${proxyUrl}/api/farm/load`, {
      credentials: 'include',
    });
    if (r.status === 401) {
      await this.signOut();
      this.state.update((s) => ({
        ...s,
        error: 'Session expired. Please sign in again.',
      }));
      return null;
    }
    if (!r.ok) return null;
    return await r.text();
  }

  // ---- private helpers ----

  private restoreSession(): void {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const user = JSON.parse(raw) as FarmSyncUser;
      if (user?.githubUserId && user?.login) {
        this.state.update((s) => ({ ...s, signedIn: true, user }));
      }
    } catch {
      // corrupt session — ignore
    }
  }

  private persistSession(user: FarmSyncUser): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  private readLastSync(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  }
}
