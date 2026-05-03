import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, Filament, Printer } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

interface ProductRow {
  id?: number;
  name: string;
  printer_id?: number | null;
  filament_id?: number | null;
  filament_grams: number;
  print_time_hours: number;
  labor_hours: number;
  supplies_cost: number;
  packaging_cost: number;
}

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
  private cdr = inject(ChangeDetectorRef);

  printers: Printer[] = [];
  filaments: Filament[] = [];
  products: ProductRow[] = [];

  busy = false;
  removing: Record<number, boolean> = {};
  editingId: number | null = null;

  form: ProductRow = this.empty();

  ngOnInit() {
    this.api.listPrinters().subscribe(d => { this.printers = d; this.cdr.detectChanges(); });
    this.api.listFilaments().subscribe(d => { this.filaments = d; this.cdr.detectChanges(); });
    this.load();
  }

  load() {
    this.api.listProducts().subscribe(data => { this.products = data || []; this.cdr.detectChanges(); });
  }

  save() {
    if (this.busy) return;
    if (!this.form.name || !this.form.filament_grams) {
      this.toast.error('Preencha os campos obrigatórios (*).');
      return;
    }
    this.busy = true;
    const op = this.editingId != null
      ? this.api.updateProduct(this.editingId, this.form)
      : this.api.createProduct(this.form);
    op.pipe(finalize(() => { this.busy = false; this.cdr.detectChanges(); })).subscribe({
      next: () => {
        this.toast.success(this.editingId != null ? 'Produto atualizado.' : 'Produto criado.');
        this.cancel();
        this.load();
      },
      error: () => this.toast.error('Erro ao salvar produto.'),
    });
  }

  edit(p: ProductRow) {
    this.editingId = p.id ?? null;
    this.form = { ...p };
    this.cdr.detectChanges();
  }

  cancel() {
    this.editingId = null;
    this.form = this.empty();
    this.cdr.detectChanges();
  }

  remove(id?: number) {
    if (!id || this.removing[id]) return;
    if (!confirm('Excluir este produto?')) return;
    this.removing[id] = true;
    this.api.deleteProduct(id).pipe(finalize(() => { this.removing[id] = false; this.cdr.detectChanges(); })).subscribe({
      next: () => { this.toast.success('Produto excluído.'); this.load(); },
      error: () => this.toast.error('Erro ao excluir.'),
    });
  }

  printerName(id?: number | null) { return this.printers.find(p => p.id === id)?.name || '—'; }
  filamentName(id?: number | null) { return this.filaments.find(f => f.id === id)?.name || '—'; }

  private empty(): ProductRow {
    return {
      name: '', printer_id: null, filament_id: null,
      filament_grams: 0, print_time_hours: 0, labor_hours: 0,
      supplies_cost: 0, packaging_cost: 0,
    };
  }
}
