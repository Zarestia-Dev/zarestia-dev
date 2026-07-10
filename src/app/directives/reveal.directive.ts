import {
  Directive,
  Input,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// ============================================================================
// REVEAL DIRECTIVE — pure-CSS scroll-reveal powered by IntersectionObserver.
// Add `appReveal` to any element and it will receive `.is-visible` once it
// scrolls into view, which triggers the SCSS `[data-reveal]` animation.
//
// Usage:
//   <div appReveal>...</div>            // default = up
//   <div appReveal="left">...</div>
//   <div appReveal="scale" [appRevealDelay]="120">...</div>
// ============================================================================

type RevealVariant = 'up' | 'left' | 'right' | 'scale';

@Directive({
  selector: '[appReveal]',
})
export class RevealDirective implements OnDestroy {
  @Input('appReveal') variant: RevealVariant | '' = 'up';
  @Input() appRevealDelay = 0;
  @Input() appRevealThreshold = 0.15;
  @Input() appRevealOnce = true;

  private readonly host = inject(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => this.setupObserver());
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private get node(): HTMLElement {
    return this.host.nativeElement as HTMLElement;
  }

  private setupObserver(): void {
    const node = this.node;

    if (!('IntersectionObserver' in window)) {
      node.classList.add('is-visible');
      return;
    }

    const v: RevealVariant = this.variant || 'up';
    node.setAttribute('data-reveal', v);
    if (this.appRevealDelay) {
      node.style.transitionDelay = `${this.appRevealDelay}ms`;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (this.appRevealOnce) {
              this.observer?.disconnect();
            }
          } else if (!this.appRevealOnce) {
            entry.target.classList.remove('is-visible');
          }
        }
      },
      { threshold: this.appRevealThreshold, rootMargin: '0px 0px -8% 0px' }
    );
    this.observer.observe(node);
  }
}
