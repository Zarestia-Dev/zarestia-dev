import { MatIconModule } from '@angular/material/icon';
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { GithubService } from '../../services/github.service';
import { environment } from '../../../environments/environment';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-about',
  imports: [MatIconModule, RevealDirective],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly i18n = inject(TranslationService);
  protected readonly github = inject(GithubService);

  // Safe URL that works even before GitHub data loads
  protected readonly githubUrl = computed(() => {
    return this.github.profile()?.htmlUrl ?? environment.githubOrgUrl;
  });
}
