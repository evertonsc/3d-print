import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-production',
  imports: [CommonModule, FormsModule],
  templateUrl: './production.html',
  styleUrls: ['./production.css'],
})
export class Production implements OnInit {
  private api = inject(ApiService);

  product_id: number | null = null;
  quantity: number | null = null;

  products: any[] = [];
  productions: any[] = [];

  message = '';
  success = true;

  unitCost = 0;
  totalCost = 0;

  ngOnInit() {
    this.api.listProducts().subscribe(d => this.products = d);
    this.load();
  }

  load() { this.api.listProductions().subscribe(d => this.productions = d); }

  recalc() {
    const p = this.products.find(x => x.id === Number(this.product_id));
    if (!p || !this.quantity) { this.unitCost = 0; this.totalCost = 0; return; }
    this.unitCost  = (p.material_grams ?? 0) * (p.material_cost_per_gram ?? 0);
    this.totalCost = this.unitCost * this.quantity;
  }

  produce() {
    if (!this.product_id || !this.quantity) return;
    this.api.produce(this.product_id, this.quantity).subscribe({
      next: () => { this.success = true; this.message = 'Produção registrada com sucesso!'; this.clear(); this.load(); },
      error: () => { this.success = false; this.message = 'Erro na produção (estoque insuficiente?)'; },
    });
  }

  clear() { this.product_id = null; this.quantity = null; this.recalc(); }
  dismiss() { this.message = ''; }
}
