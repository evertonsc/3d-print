import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

const LOW_STOCK_THRESHOLD = 200; // TODO: move to per-material config

@Component({
  standalone: true,
  selector: 'app-inventory',
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css'],
})
export class Inventory implements OnInit {
  private api = inject(ApiService);

  name = '';
  quantity: number | null = null;

  inventory: any[] = [];
  lowStock: any[] = [];

  message = '';
  success = true;

  threshold = LOW_STOCK_THRESHOLD;

  ngOnInit() { this.load(); }

  load() {
    this.api.listStock().subscribe(d => {
      this.inventory = d;
      this.lowStock = d.filter(i => (i.quantity ?? 0) < this.threshold);
    });
  }

  add() {
    if (!this.name || this.quantity == null) return;
    this.api.addStock(this.name, this.quantity).subscribe({
      next: () => { this.success = true; this.message = 'Estoque atualizado com sucesso!'; this.clear(); this.load(); },
      error: () => { this.success = false; this.message = 'Erro ao atualizar estoque'; },
    });
  }

  clear() { this.name = ''; this.quantity = null; }
  dismiss() { this.message = ''; }
}
