import { MatIcon } from '@angular/material/icon';
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { GithubService } from '../../services/github.service';
import { environment } from '../../../environments/environment';
import { RevealDirective } from '../../directives/reveal.directive';

interface SupportPlatform {
  titleKey: string;
  descKey: string;
  feeKey: string;
  ctaKey: string;
  url: string;
  icon: string;            // Material Icons name
  accent: 'lime' | 'green' | 'yellow' | 'silver';
}

interface OtherWay {
  titleKey: string;
  descKey: string;
  ctaKey: string;
  url: string;
  icon: string;            // Material Icons name
  accent: 'lime' | 'green' | 'yellow' | 'silver';
}

@Component({
  selector: 'app-support',
  imports: [MatIcon, RevealDirective],
  templateUrl: './support.html',
  styleUrl: './support.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Support {
  protected readonly i18n = inject(TranslationService);
  protected readonly github = inject(GithubService);

  // Safe GitHub URL that works even before data loads
  protected readonly githubUrl = computed(() => {
    return this.github.profile()?.htmlUrl ?? environment.githubOrgUrl;
  });

  // "Why support" cards (3 items — Tools & subscriptions intentionally removed)
  protected readonly whyItems = [
    { titleKey: 'support.why.item1.title', descKey: 'support.why.item1.desc', icon: 'cloud', accent: 'lime' as const },
    { titleKey: 'support.why.item2.title', descKey: 'support.why.item2.desc', icon: 'local_cafe', accent: 'green' as const },
    { titleKey: 'support.why.item4.title', descKey: 'support.why.item4.desc', icon: 'auto_awesome', accent: 'silver' as const },
  ];

  // Platform cards — only GitHub Sponsors is enabled.
  // Other platforms (PayPal, Ko-fi, Buy Me a Coffee) are not available in Turkey.
  protected readonly platforms: SupportPlatform[] = [
    {
      titleKey: 'support.platforms.sponsors.title',
      descKey: 'support.platforms.sponsors.desc',
      feeKey: 'support.platforms.sponsors.fee',
      ctaKey: 'support.platforms.sponsors.cta',
      url: 'https://github.com/sponsors/Hakanbaban53',
      icon: 'favorite',
      accent: 'lime',
    },
  ];

  // Free ways to help
  protected readonly otherWays: OtherWay[] = [
    {
      titleKey: 'support.other.star.title',
      descKey: 'support.other.star.desc',
      ctaKey: 'support.other.star.cta',
      url: 'https://github.com/Zarestia-Dev',
      icon: 'star',
      accent: 'yellow',
    },
    {
      titleKey: 'support.other.share.title',
      descKey: 'support.other.share.desc',
      ctaKey: 'support.other.share.cta',
      url: 'https://twitter.com/intent/tweet?text=Check%20out%20Zarestia%27s%20open-source%20projects%3A%20https%3A%2F%2Fgithub.com%2FZarestia-Dev',
      icon: 'share',
      accent: 'green',
    },
    {
      titleKey: 'support.other.issue.title',
      descKey: 'support.other.issue.desc',
      ctaKey: 'support.other.issue.cta',
      url: 'https://github.com/Zarestia-Dev',
      icon: 'bug_report',
      accent: 'lime',
    },
  ];

  // FAQ items
  protected readonly faq = [
    { qKey: 'support.faq.q1', aKey: 'support.faq.a1' },
    { qKey: 'support.faq.q2', aKey: 'support.faq.a2' },
    { qKey: 'support.faq.q3', aKey: 'support.faq.a3' },
    { qKey: 'support.faq.q4', aKey: 'support.faq.a4' },
    { qKey: 'support.faq.q5', aKey: 'support.faq.a5' },
    { qKey: 'support.faq.q6', aKey: 'support.faq.a6' },
  ];
}
