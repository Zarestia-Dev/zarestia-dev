import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

// ============================================================================
// APP CONFIG — Zoneless change detection (no zone.js polyfill required).
// Per project requirements: NO Angular Animations module. All motion is
// pure CSS/SCSS.
// ============================================================================

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(),
  ],
};
