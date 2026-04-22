import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="layout">

      <aside class="sidebar">

        <div class="logo">
          <img src="assets/logo.png" />
          <span>Tom Studio 3D</span>
        </div>

        <nav>
          <a routerLink="/" routerLinkActive="active">Home</a>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/products" routerLinkActive="active">Products</a>
          <a routerLink="/production" routerLinkActive="active">Production</a>
          <a routerLink="/inventory" routerLinkActive="active">Inventory</a>
        </nav>

        <div class="user">
          <div class="avatar">T</div>
          <div>
            <strong>Tom</strong>
            <small>Admin</small>
          </div>
        </div>

      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>

    </div>
  `,
  styles: [`

    * {
      box-sizing: border-box;
    }

    .layout {
      display: flex;
      height: 100vh;
      font-family: 'Inter', sans-serif;
      background: #f1f5f9;
    }

    /* SIDEBAR */

    .sidebar {
      width: 240px;
      background: #0f172a;
      color: white;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 30px;
      font-weight: 600;
    }

    .logo img {
      width: 32px;
    }

    nav a {
      display: block;
      padding: 12px;
      border-radius: 8px;
      color: #cbd5e1;
      text-decoration: none;
      margin-bottom: 8px;
      transition: 0.2s;
    }

    nav a:hover {
      background: #1e293b;
      color: white;
    }

    .active {
      background: #22c55e;
      color: white;
    }

    .user {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
    }

    .avatar {
      background: #22c55e;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }

    /* CONTENT */

    .content {
      flex: 1;
      padding: 30px 40px;
      overflow-y: auto;
    }

  `]
})
export class Layout {}