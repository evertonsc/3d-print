import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, Filament, FilamentSpool } from '../../services/api.service';

const LOW_STOCK_GRAMS = 200;

@Component({
  standalone: true,
  selector: 'app-inventory',
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css'],
})
export class Inventory implements OnInit {
  private api = inject(ApiService);

  spools: FilamentSpool[] = [];
  filaments: Filament[] = [];
  lowStock: FilamentSpool[] = [];
  threshold = LOW_STOCK_GRAMS;

  // New spool form (matches handwritten note image #2: qty / color / brand /
  // type / source / purchase date)
  form: FilamentSpool = {
    filament_id: null,
    color: '',
    brand: '',
    type: 'PLA',
    source: '',
    purchase_date: new Date().toISOString().substring(0, 10),
    purchase_price: 0,
    quantity_grams: 1000,
  };

  // Adjust grams form
  adjust: { [id: number]: number } = {};

  message = ''; success = true;

  ngOnInit() { this.load(); this.api.listFilaments().subscribe(d => this.filaments = d); }

  load() {
    this.api.listSpools().subscribe(d => {
      this.spools = d;
      this.lowStock = d.filter(s => (s.quantity_grams ?? 0) < this.threshold);
    });
  }

  add() {
    if (!this.form.color) return;
    const payload: FilamentSpool = {
      ...this.form,
      purchase_date: this.form.purchase_date ? new Date(this.form.purchase_date).toISOString() : null,
    };
    this.api.createSpool(payload).subscribe({
      next: () => {
        this.success = true; this.message = 'Carretel adicionado.';
        this.form = { filament_id: null, color: '', brand: '', type: 'PLA', source: '',
                      purchase_date: new Date().toISOString().substring(0,10),
                      purchase_price: 0, quantity_grams: 1000 };
        this.load();
      },
      error: () => { this.success = false; this.message = 'Erro ao adicionar.'; },
    });
  }

  remove(id?: number) {
    if (!id) return;
    this.api.deleteSpool(id).subscribe(() => this.load());
  }

  applyAdjust(id?: number) {
    if (!id) return;
    const d = Number(this.adjust[id] ?? 0);
    if (!d) return;
    this.api.adjustSpool(id, d).subscribe(() => { this.adjust[id] = 0; this.load(); });
  }

  dismiss() { this.message = ''; }
}
