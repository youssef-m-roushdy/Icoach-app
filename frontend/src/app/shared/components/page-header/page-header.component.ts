import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Breadcrumb { label: string; link?: string; }

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-header">
      <div class="page-header__main">
        <h1 class="page-header__title">{{ title }}</h1>
        @if (breadcrumbs.length) {
          <nav class="page-header__breadcrumbs">
            @for (crumb of breadcrumbs; track crumb.label; let last = $last) {
              @if (crumb.link && !last) {
                <a [routerLink]="crumb.link">{{ crumb.label }}</a>
              } @else {
                <span [class.active]="last">{{ crumb.label }}</span>
              }
              @if (!last) { <span class="sep">/</span> }
            }
          </nav>
        }
      </div>
      <div class="page-header__actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
    .page-header__title { font-size: 1.6rem; font-weight: 700; color: var(--text-primary); margin: 0; font-family: 'Syne', sans-serif; }
    .page-header__breadcrumbs { display: flex; align-items: center; gap: 2px; margin-top: 4px; }
    .page-header__breadcrumbs a { color: var(--accent); text-decoration: none; font-size: 0.8rem; }
    .page-header__breadcrumbs span { font-size: 0.8rem; color: var(--text-muted); }
    .page-header__breadcrumbs span.active { color: var(--text-secondary); }
    .sep { font-size: 0.8rem; color: var(--text-muted); margin: 0 4px; }
    .page-header__actions { display: flex; gap: 10px; align-items: center; }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() breadcrumbs: Breadcrumb[] = [];
}
