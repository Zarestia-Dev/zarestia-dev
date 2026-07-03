import { MatIconModule } from '@angular/material/icon';
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
  imports: [MatIconModule, RevealDirective],
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

  // Platform cards
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
    {
      titleKey: 'support.platforms.kofi.title',
      descKey: 'support.platforms.kofi.desc',
      feeKey: 'support.platforms.kofi.fee',
      ctaKey: 'support.platforms.kofi.cta',
      url: 'https://ko-fi.com/hakanbaban53',
      icon: 'local_cafe',
      accent: 'green',
    },
    {
      titleKey: 'support.platforms.bmc.title',
      descKey: 'support.platforms.bmc.desc',
      feeKey: 'support.platforms.bmc.fee',
      ctaKey: 'support.platforms.bmc.cta',
      url: 'https://www.buymeacoffee.com/hakanbaban53',
      icon: 'free_breakfast',
      accent: 'yellow',
    },
    {
      titleKey: 'support.platforms.paypal.title',
      descKey: 'support.platforms.paypal.desc',
      feeKey: 'support.platforms.paypal.fee',
      ctaKey: 'support.platforms.paypal.cta',
      url: 'https://www.paypal.com/paypalme/hakanbaban53',
      icon: 'account_balance_wallet',
      accent: 'silver',
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
  ];
}
