import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Hero } from '../../components/hero/hero';
import { CtaSection } from '../../components/cta-section/cta-section';

@Component({
  selector: 'app-home',
  imports: [Hero, CtaSection],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
