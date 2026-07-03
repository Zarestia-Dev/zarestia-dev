import { MatIconModule } from '@angular/material/icon';
import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { TabService, AppTab } from '../../services/tab.service';
import { TranslationService } from '../../services/translation.service';
import { RevealDirective } from '../../directives/reveal.directive';

// ============================================================================
// CTA SECTION — reusable call-to-action band used at the bottom of the Home page.
// All strings are translation keys.
// ============================================================================

@Component({
  selector: 'app-cta-section',
  imports: [MatIconModule, RevealDirective],
  templateUrl: './cta-section.html',
  styleUrl: './cta-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaSection {
  protected readonly tabService = inject(TabService);
  protected readonly i18n = inject(TranslationService);

  @Input() eyebrowKey = 'home.cta.section.eyebrow';
  @Input() titleKey = 'home.cta.section.title';
  @Input() subtitleKey = 'home.cta.section.subtitle';
  @Input() primaryLabelKey = 'home.cta.support';
  @Input() primaryTab: AppTab = 'support';
  @Input() primaryIcon = 'favorite';
  @Input() secondaryLabelKey: string | null = 'home.cta.explore';
  @Input() secondaryTab: AppTab = 'projects';
  @Input() secondaryIcon = 'view_list';

  setTab(tab: AppTab): void {
    this.tabService.setTab(tab);
  }
}
