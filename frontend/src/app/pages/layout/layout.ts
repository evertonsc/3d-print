import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <div class="layout">

      <aside class="sidebar">
        <div class="logo">
          <img src="assets/logo.png" />
          <span>Tom Studio 3D</span>
        </div>

        <nav>
          <a routerLink="/">Home</a>
          <a routerLink="/dashboard">Dashboard</a>
          <a routerLink="/products">Products</a>
          <a routerLink="/production">Production</a>
          <a routerLink="/inventory">Inventory</a>
        </nav>
      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>

    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      font-family: Inter, sans-serif;
    }

    .sidebar {
      width: 220px;
      background: #0f172a;
      color: white;
      padding: 20px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: bold;
      margin-bottom: 30px;
    }

    .logo img {
      width: 35px;
    }

    nav a {
      display: block;
      padding: 10px;
      border-radius: 6px;
      color: #cbd5e1;
      text-decoration: none;
      margin-bottom: 10px;
    }

    nav a:hover {
      background: #1e293b;
      color: white;
    }

    .content {
      flex: 1;
      padding: 30px;
      background: #f1f5f9;
      overflow: auto;
    }
  `]
})
export class Layout {}