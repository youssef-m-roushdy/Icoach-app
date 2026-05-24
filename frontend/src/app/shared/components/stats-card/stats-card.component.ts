import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="stats-card" [class]="'stats-card--' + color">
      <div class="stats-card__icon">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <div class="stats-card__body">
        <span class="stats-card__value">{{ value | number }}</span>
        <span class="stats-card__label">{{ label }}</span>
        @if (sub) {
          <span class="stats-card__sub">{{ sub }}</span>
        }
      </div>
      <div class="stats-card__glow"></div>
    </div>
  `,
  styles: [`
    .stats-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stats-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
    .stats-card__icon {
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0;
    }
    .stats-card--emerald .stats-card__icon { background: rgba(16,185,129,0.15); color: #10b981; }
    .stats-card--blue .stats-card__icon { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .stats-card--amber .stats-card__icon { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .stats-card--rose .stats-card__icon { background: rgba(244,63,94,0.15); color: #f43f5e; }
    .stats-card__body { flex: 1; }
    .stats-card__value { display: block; font-size: 2rem; font-weight: 700; line-height: 1; color: var(--text-primary); font-family: 'DM Mono', monospace; }
    .stats-card__label { display: block; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
    .stats-card__sub { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }
    .stats-card__glow {
      position: absolute; right: -20px; bottom: -20px;
      width: 80px; height: 80px; border-radius: 50%; opacity: 0.06;
    }
    .stats-card--emerald .stats-card__glow { background: #10b981; }
    .stats-card--blue .stats-card__glow { background: #3b82f6; }
    .stats-card--amber .stats-card__glow { background: #f59e0b; }
    .stats-card--rose .stats-card__glow { background: #f43f5e; }
  `]
})
export class StatsCardComponent {
  @Input() label = '';
  @Input() value: number = 0;
  @Input() icon = 'analytics';
  @Input() color: 'emerald' | 'blue' | 'amber' | 'rose' = 'emerald';
  @Input() sub = '';
}
