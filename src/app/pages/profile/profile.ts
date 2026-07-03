import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { GithubService } from '../../services/github.service';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-profile',
  imports: [MatIconModule, MatProgressSpinnerModule, RevealDirective],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  protected readonly i18n = inject(TranslationService);
  protected readonly github = inject(GithubService);

  protected readonly chartLanguages = computed(() => this.github.topLanguages());
  protected readonly joinedDate = computed(() => {
    const p = this.github.profile();
    if (!p) return '';
    return p.createdAt.slice(0, 7).replace('-', ' / ');
  });
  protected readonly blogUrl = computed(() => {
    const p = this.github.profile();
    return p ? this.github.normalizeUrl(p.blog) : null;
  });
}
