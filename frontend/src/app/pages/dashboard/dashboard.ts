import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, DreRow, PrintJob } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);

  jobs: PrintJob[] = [];
  dre: DreRow[] = [];

  totalRevenue = 0; totalCost = 0; totalProfit = 0; profitPct = 0;
  totalKg = 0; totalHours = 0;

  ngOnInit() {
    this.api.listJobs().subscribe(jobs => {
      this.jobs = jobs;
      this.totalCost    = jobs.reduce((a, j) => a + (j.final_cost ?? 0), 0);
      this.totalRevenue = jobs.reduce((a, j) => a + (j.sold_value ?? 0), 0);
      this.totalProfit  = this.totalRevenue - this.totalCost;
      this.profitPct    = this.totalCost ? this.totalProfit / this.totalCost : 0;
      this.totalKg      = jobs.reduce((a, j) => a + (j.filament_grams ?? 0), 0) / 1000;
      this.totalHours   = jobs.reduce((a, j) => a + (j.print_time_hours ?? 0), 0);
    });
    this.api.dre().subscribe(d => this.dre = d);
  }

  formatMonth(m: string) {
    const [y, mo] = m.split('-');
    const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${labels[+mo - 1]}/${y}`;
  }
}
