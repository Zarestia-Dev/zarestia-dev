import { MatIcon } from '@angular/material/icon';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TabService, AppTab } from '../../services/tab.service';
import { TranslationService } from '../../services/translation.service';

// ============================================================================
// HERO — landing hero for the Home page.
// Features the Zarestia logo with a swirling wind halo, animated
// headline, and primary CTAs.
// ============================================================================

@Component({
  selector: 'app-hero',
  imports: [MatIcon],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  protected readonly tabService = inject(TabService);
  protected readonly i18n = inject(TranslationService);

  setTab(tab: AppTab): void {
    this.tabService.setTab(tab);
  }
}
