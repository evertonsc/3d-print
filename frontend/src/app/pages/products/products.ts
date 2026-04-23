import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-products',
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrls: ['./products.css'],
})
export class Products implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  name = '';
  material_grams: number | null = null;
  print_time_hours: number | null = null;
  material_cost_per_gram: number | null = null;

  products: any[] = [];
  busy = false;

  ngOnInit() { this.load(); }

  load() { this.api.listProducts().subscribe(data => this.products = data); }

  create() {
    if (this.busy) return;
    if (!this.name || this.material_grams == null) {
      this.toast.error('Preencha nome e gramas de material.');
      return;
    }
    this.busy = true;
    this.api.createProduct({
      name: this.name,
      material_grams: this.material_grams!,
      print_time_hours: this.print_time_hours!,
      material_cost_per_gram: this.material_cost_per_gram!,
    }).pipe(finalize(() => this.busy = false)).subscribe({
      next: () => { this.toast.success('Produto criado com sucesso!'); this.clear(); this.load(); },
      error: () => this.toast.error('Erro ao criar produto'),
    });
  }

  clear() {
    this.name = '';
    this.material_grams = null;
    this.print_time_hours = null;
    this.material_cost_per_gram = null;
  }
}
