import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);

  revenue = 0;
  cost = 0;
  profit = 0;
  productions: any[] = [];

  ngOnInit() {
    this.api.listProductions().subscribe(data => {
      this.productions = data;
      this.cost = data.reduce((acc, p) => acc + (p.total_cost ?? 0), 0);
      this.revenue = this.cost * 2; // MOCK
      this.profit = this.revenue - this.cost;
    });
  }
}
