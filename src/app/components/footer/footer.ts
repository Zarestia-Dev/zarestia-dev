import { MatIconModule } from '@angular/material/icon';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TabService, AppTab } from '../../services/tab.service';
import { TranslationService } from '../../services/translation.service';
import { NAV_LINKS, SOCIAL_LINKS } from '../../constants/navigation.constants';

@Component({
  selector: 'app-footer',
  imports: [MatIconModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly tabService = inject(TabService);
  protected readonly i18n = inject(TranslationService);
  protected readonly navLinks = NAV_LINKS;
  protected readonly socialLinks = SOCIAL_LINKS;
  readonly currentYear = new Date().getFullYear();

  setTab(tab: AppTab): void {
    this.tabService.setTab(tab);
  }
}
