import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, Filament, FilamentSpool } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

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
  private toast = inject(ToastService);

  spools: FilamentSpool[] = [];
  filaments: Filament[] = [];
  lowStock: FilamentSpool[] = [];
  threshold = LOW_STOCK_GRAMS;

  busy = false;
  removing: Record<number, boolean> = {};
  adjusting: Record<number, boolean> = {};

  form: FilamentSpool = this.emptyForm();
  adjust: { [id: number]: number } = {};

  ngOnInit() { this.load(); this.api.listFilaments().subscribe(d => this.filaments = d); }

  load() {
    this.api.listSpools().subscribe(d => {
      this.spools = d;
      this.lowStock = d.filter(s => (s.quantity_grams ?? 0) < this.threshold);
    });
  }

  add() {
    if (this.busy) return;
    if (!this.form.color) { this.toast.error('Informe a cor do carretel.'); return; }
    this.busy = true;
    const payload: FilamentSpool = {
      ...this.form,
      purchase_date: this.form.purchase_date ? new Date(this.form.purchase_date).toISOString() : null,
    };
    this.api.createSpool(payload).pipe(finalize(() => this.busy = false)).subscribe({
      next: () => { this.toast.success('Carretel adicionado.'); this.form = this.emptyForm(); this.load(); },
      error: () => this.toast.error('Erro ao adicionar.'),
    });
  }

  remove(id?: number) {
    if (!id || this.removing[id]) return;
    this.removing[id] = true;
    this.api.deleteSpool(id).pipe(finalize(() => this.removing[id] = false)).subscribe({
      next: () => { this.toast.success('Carretel removido.'); this.load(); },
      error: () => this.toast.error('Erro ao remover carretel.'),
    });
  }

  applyAdjust(id?: number) {
    if (!id || this.adjusting[id]) return;
    const d = Number(this.adjust[id] ?? 0);
    if (!d) return;
    this.adjusting[id] = true;
    this.api.adjustSpool(id, d).pipe(finalize(() => this.adjusting[id] = false)).subscribe({
      next: () => { this.toast.success('Estoque ajustado.'); this.adjust[id] = 0; this.load(); },
      error: () => this.toast.error('Erro ao ajustar estoque.'),
    });
  }

  private emptyForm(): FilamentSpool {
    return {
      filament_id: null, color: '', brand: '', type: 'PLA', source: '',
      purchase_date: new Date().toISOString().substring(0, 10),
      purchase_price: 0, quantity_grams: 1000,
    };
  }
}
