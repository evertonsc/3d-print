import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet></router-outlet>

    <div class="toast-container" *ngIf="toast.current() as t">
      <div class="toast" [class.toast-success]="t.success" [class.toast-error]="!t.success">
        <span>{{ t.text }}</span>
        <button class="toast-close" (click)="toast.dismiss()" aria-label="Fechar">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed; right: 20px; bottom: 20px; z-index: 1000;
      animation: slideIn .18s ease-out;
    }
    .toast {
      min-width: 280px; max-width: 420px;
      padding: 12px 14px; border-radius: 10px;
      display: flex; align-items: center; gap: 12px;
      color: #fff; box-shadow: 0 12px 28px rgba(0,0,0,.18);
      font-size: 14px;
    }
    .toast-success { background: #16a34a; }
    .toast-error   { background: #dc2626; }
    .toast-close   {
      background: transparent; border: none; color: #fff;
      cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1;
    }
    @keyframes slideIn { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
  `],
})
export class AppComponent {
  toast = inject(ToastService);
}
