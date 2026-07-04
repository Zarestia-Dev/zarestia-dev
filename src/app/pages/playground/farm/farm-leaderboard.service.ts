import { Injectable, signal, computed, inject } from '@angular/core';
import { FarmSyncService } from './farm-sync.service';
import { environment } from '../../../../environments/environment';

// ============================================================================
// FARM LEADERBOARD SERVICE — GitHub-based social leaderboard.
// ----------------------------------------------------------------------------
// NO MOCK DATA. The entries signal starts empty. If the user is not signed
// in or the Worker backend is unreachable, the leaderboard shows an empty
// state ("No farmers yet. Be the first!") instead of fake players.
//
// BACKEND CONTRACT (Cloudflare Worker KV):
//
//   Per-user record (key: farm:user:<githubUserId>):
//     {
//       login: string,
//       avatarUrl: string,
//       level: number,
//       coins: number,         // current gold
//       totalEarned: number,   // lifetime coins earned (tiebreaker)
//       charm: number,         // cosmetic charm score
//       updatedAt: ISO-string,
//       farmSnapshot: FarmSaveData  // full save, for read-only visits
//     }
//
//   Leaderboard cache (key: farm:leaderboard):
//     Array of { githubUserId, login, avatarUrl, level, coins, charm, updatedAt }
//     Sorted by level DESC, then coins DESC.
//     Updated on save (write-through) or by a periodic Cron Trigger.
//
// Worker routes:
//   GET  /api/farm/leaderboard?n=50   → cached top-N
//   GET  /api/farm/visit/:userId      → returns farmSnapshot
//   POST /api/farm/save               → upserts user record + refreshes cache
// ============================================================================

export interface LeaderboardEntry {
  githubUserId: string;
  username: string;
  avatarUrl: string;
  level: number;
  coins: number;
  totalEarned: number;
  charm: number;
  updatedAt: string;
}

export interface VisitFarm {
  login: string;
  avatarUrl: string;
  level: number;
  coins: number;
  charm: number;
  plots: unknown[];
  animals: unknown[];
}

@Injectable({ providedIn: 'root' })
export class FarmLeaderboardService {
  private readonly sync = inject(FarmSyncService);

  /** Empty until real data is fetched from the Worker. */
  readonly entries = signal<LeaderboardEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadedAt = signal<string | null>(null);

  readonly currentUserId = computed(() => this.sync.state().user?.githubUserId ?? null);
  readonly myRank = computed(() => {
    const id = this.currentUserId();
    if (!id) return null;
    const idx = this.entries().findIndex((e) => e.githubUserId === id);
    return idx >= 0 ? idx + 1 : null;
  });

  /** Fetch the top N players from the leaderboard cache. NO MOCK DATA. */
  async loadTopN(n = 50): Promise<void> {
    if (!this.sync.signedIn()) {
      this.entries.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const proxyUrl = environment.githubProxyUrl?.replace(/\/$/, '') ?? '';
      const r = await fetch(`${proxyUrl}/api/farm/leaderboard?n=${n}`, {
        credentials: 'include',
      });
      if (r.status === 401) {
        await this.sync.signOut();
        this.error.set('Session expired. Please sign in again.');
        this.entries.set([]);
        return;
      }
      if (!r.ok) throw new Error(`Failed to load leaderboard (${r.status})`);
      const data = (await r.json()) as LeaderboardEntry[];
      this.entries.set(Array.isArray(data) ? data : []);
      this.loadedAt.set(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Leaderboard load failed';
      this.error.set(msg);
      this.entries.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  /** Visit another player's farm (read-only). Returns null if not found. */
  async visitFarm(userId: string): Promise<VisitFarm | null> {
    if (!this.sync.signedIn()) return null;
    const proxyUrl = environment.githubProxyUrl?.replace(/\/$/, '') ?? '';
    const r = await fetch(`${proxyUrl}/api/farm/visit/${userId}`, {
      credentials: 'include',
    });
    if (r.status === 401) {
      await this.sync.signOut();
      return null;
    }
    if (!r.ok) return null;
    return (await r.json()) as VisitFarm;
  }
}
