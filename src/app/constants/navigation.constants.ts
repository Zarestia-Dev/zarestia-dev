import { AppTab } from '../services/tab.service';

// ============================================================================
// NAVIGATION CONSTANTS — single source of truth for nav + footer links.
// ----------------------------------------------------------------------------
// Icons are Material Icons names (rendered via <mat-icon>).
// ============================================================================

export interface NavLink {
  labelKey: string;        // translation key, e.g. 'nav.home'
  tab: AppTab;
  icon: string;            // Material Icons name, e.g. 'home'
  descriptionKey: string;  // translation key for the description
}

export interface SocialLink {
  label: string;
  url: string;
  icon: string;            // Material Icons name
  type?: 'primary' | 'accent' | 'highlight';
}

export const NAV_LINKS: NavLink[] = [
  {
    labelKey: 'nav.home',
    tab: 'home',
    icon: 'home',
    descriptionKey: 'home.eyebrow',
  },
  {
    labelKey: 'nav.about',
    tab: 'about',
    icon: 'info',
    descriptionKey: 'about.eyebrow',
  },
  {
    labelKey: 'nav.projects',
    tab: 'projects',
    icon: 'view_list',
    descriptionKey: 'projects.eyebrow',
  },
  {
    labelKey: 'nav.profile',
    tab: 'profile',
    icon: 'account_circle',
    descriptionKey: 'profile.eyebrow',
  },
  {
    labelKey: 'nav.support',
    tab: 'support',
    icon: 'favorite',
    descriptionKey: 'support.eyebrow',
  },
];

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    url: 'https://github.com/Zarestia-Dev',
    icon: 'code',
    type: 'primary',
  },
  {
    label: 'Website',
    url: 'https://hakanismail.info',
    icon: 'language',
    type: 'accent',
  },
  {
    label: 'GitHub Sponsors',
    url: 'https://github.com/sponsors/Hakanbaban53',
    icon: 'favorite',
    type: 'highlight',
  },
];
