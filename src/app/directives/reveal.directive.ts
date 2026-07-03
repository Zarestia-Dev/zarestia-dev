import {
  Directive,
  OnInit,
  OnDestroy,
  Input,
  ElementRef,
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

@Directive({
  selector: '[appReveal]',
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input('appReveal') variant: '' | 'up' | 'left' | 'right' | 'scale' = 'up';
  @Input() appRevealDelay = 0;
  @Input() appRevealThreshold = 0.15;
  @Input() appRevealOnce = true;

  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  constructor() {
    // afterNextRender MUST be called from an injection context (constructor),
    // not from ngOnInit — otherwise Angular throws NG0203.
    afterNextRender(() => {
      this.setupObserver();
    });
  }

  ngOnInit(): void {
    // SSR / non-browser fallback: just mark visible immediately
    if (!isPlatformBrowser(this.platformId)) {
      this.markVisible();
      return;
    }
    if (!('IntersectionObserver' in window)) {
      this.markVisible();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setupObserver(): void {
    if (!('IntersectionObserver' in window)) {
      this.markVisible();
      return;
    }

    const node = this.el.nativeElement;
    const v = this.variant || 'up';
    node.setAttribute('data-reveal', v);
    if (this.appRevealDelay) {
      node.style.transitionDelay = `${this.appRevealDelay}ms`;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.markVisible();
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

  private markVisible(): void {
    this.el.nativeElement.classList.add('is-visible');
  }
}
