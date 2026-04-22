import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-products',
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrls: ['./products.css'],
})
export class Products implements OnInit {
  private api = inject(ApiService);

  name = '';
  material_grams: number | null = null;
  print_time_hours: number | null = null;
  material_cost_per_gram: number | null = null;

  products: any[] = [];
  message = '';
  success = true;

  ngOnInit() { this.load(); }

  load() {
    this.api.listProducts().subscribe(data => this.products = data);
  }

  create() {
    if (!this.name || this.material_grams == null) return;
    this.api.createProduct({
      name: this.name,
      material_grams: this.material_grams!,
      print_time_hours: this.print_time_hours!,
      material_cost_per_gram: this.material_cost_per_gram!,
    }).subscribe({
      next: () => { this.success = true; this.message = 'Produto criado com sucesso!'; this.clear(); this.load(); },
      error: () => { this.success = false; this.message = 'Erro ao criar produto'; },
    });
  }

  clear() {
    this.name = '';
    this.material_grams = null;
    this.print_time_hours = null;
    this.material_cost_per_gram = null;
  }

  dismiss() { this.message = ''; }
}
