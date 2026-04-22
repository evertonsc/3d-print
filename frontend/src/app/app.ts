import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav class="navbar">
      <a routerLink="/">Home</a>
      <a routerLink="/products">Products</a>
      <a routerLink="/production">Production</a>
      <a routerLink="/inventory">Inventory</a>
    </nav>

    <div class="content">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .navbar {
      display: flex;
      gap: 20px;
      padding: 15px;
      background: #1e1e2f;
    }

    .navbar a {
      color: white;
      text-decoration: none;
      font-weight: bold;
    }

    .navbar a:hover {
      color: #00d4ff;
    }

    .content {
      padding: 20px;
    }
  `]
})
export class AppComponent {}