import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { GithubService, GitHubRepo } from '../../services/github.service';
import { RevealDirective } from '../../directives/reveal.directive';

type FilterKind = 'all' | 'active' | 'archived';
type SortKind = 'stars' | 'name' | 'recent';

@Component({
  selector: 'app-projects',
  imports: [MatIcon, MatProgressSpinner, RevealDirective],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects {
  protected readonly i18n = inject(TranslationService);
  protected readonly github = inject(GithubService);

  readonly activeFilter = signal<FilterKind>('all');
  readonly sortBy = signal<SortKind>('stars');

  readonly filters: { value: FilterKind; labelKey: string }[] = [
    { value: 'all',      labelKey: 'projects.filter.all' },
    { value: 'active',   labelKey: 'projects.filter.active' },
    { value: 'archived', labelKey: 'projects.filter.archived' },
  ];

  readonly sortOptions: { value: SortKind; labelKey: string }[] = [
    { value: 'stars',  labelKey: 'projects.sort.stars' },
    { value: 'name',   labelKey: 'projects.sort.name' },
    { value: 'recent', labelKey: 'projects.sort.recent' },
  ];

  readonly skeletonCards = [1, 2, 3] as const;

  readonly filteredRepos = computed<GitHubRepo[]>(() => {
    const filter = this.activeFilter();
    const sort = this.sortBy();
    let list = [...this.github.repos()];

    if (filter === 'active')   list = list.filter((r) => !r.isArchived);
    if (filter === 'archived') list = list.filter((r) =>  r.isArchived);

    switch (sort) {
      case 'stars':  list.sort((a, b) => b.stars - a.stars); break;
      case 'name':   list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'recent': list.sort((a, b) => (b.pushedAt > a.pushedAt ? 1 : -1)); break;
    }
    return list;
  });

  setFilter(f: FilterKind): void { this.activeFilter.set(f); }
  setSort(s: SortKind): void { this.sortBy.set(s); }

  accentClass(repo: GitHubRepo): string {
    const lang = repo.primaryLanguage;
    if (lang === 'Python' || lang === 'Shell') return 'accent-lime';
    if (lang === 'C#' || lang === 'TypeScript') return 'accent-green';
    if (lang === 'JavaScript' || lang === 'HTML') return 'accent-yellow';
    return 'accent-silver';
  }

  statusKey(repo: GitHubRepo): string {
    if (repo.isArchived) return 'projects.status.archived';
    if (repo.isFork) return 'projects.status.fork';
    return 'projects.status.active';
  }
}
