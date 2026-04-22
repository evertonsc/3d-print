import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {

  revenue = 0;
  cost = 0;
  profit = 0;

  productions: any[] = [];

  constructor(private http: HttpClient) {
    this.load();
  }

  load() {
    this.http.get<any[]>('http://localhost:8000/productions')
      .subscribe(data => {
        this.productions = data;

        this.cost = data.reduce((acc, p) => acc + p.total_cost, 0);

        // MOCK revenue (2x cost for now)
        this.revenue = this.cost * 2;

        this.profit = this.revenue - this.cost;
      });
  }
}