import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
})
export class Layout {
  collapsed = false;
  materiaisOpen = false;

  constructor(private router: Router) {
    this.materiaisOpen = this.isMateriaisActive();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (this.isMateriaisActive()) this.materiaisOpen = true;
    });
  }

  toggle() { this.collapsed = !this.collapsed; }

  isMateriaisActive(): boolean {
    return this.router.url.startsWith('/materiais');
  }
}
