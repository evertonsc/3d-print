import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, StockItem } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-insumos',
  imports: [CommonModule, FormsModule],
  templateUrl: './insumos.html',
})
export class Insumos implements OnInit {
  protected api = inject(ApiService);
  protected toast = inject(ToastService);
  protected cdr = inject(ChangeDetectorRef);

  title = 'Insumos';
  category: 'packaging' | 'supply' = 'supply';

  items: StockItem[] = [];
  busy = false;
  editingId: number | null = null;
  removing: Record<number, boolean> = {};
  form: StockItem = this.empty();

  ngOnInit() { this.load(); }

  load() {
    this.api.listStockItems(this.category).subscribe(d => {
      this.items = d;
      this.cdr.detectChanges();
    });
  }

  unitPrice(): number {
    const q = Number(this.form.purchased_qty || 0);
    if (!q) return 0;
    return Number(this.form.valor || 0) / q;
  }

  save() {
    if (this.busy) return;
    if (!this.form.description) { this.toast.error('Informe a descrição.'); return; }
    this.busy = true;
    const payload: StockItem = { ...this.form, category: this.category };
    const op = this.editingId != null
      ? this.api.updateStockItem(this.editingId, payload)
      : this.api.createStockItem(payload);
    op.pipe(finalize(() => { this.busy = false; this.cdr.detectChanges(); })).subscribe({
      next: () => {
        this.toast.success(this.editingId != null ? 'Item atualizado.' : 'Item adicionado.');
        this.cancel();
        this.load();
      },
      error: () => this.toast.error('Erro ao salvar.'),
    });
  }

  edit(s: StockItem) {
    this.editingId = s.id ?? null;
    this.form = { ...s };
    this.cdr.detectChanges();
  }

  cancel() {
    this.editingId = null;
    this.form = this.empty();
    this.cdr.detectChanges();
  }

  remove(id?: number) {
    if (!id || this.removing[id]) return;
    if (!confirm('Excluir este item?')) return;
    this.removing[id] = true;
    this.api.deleteStockItem(id).pipe(finalize(() => { this.removing[id] = false; this.cdr.detectChanges(); })).subscribe({
      next: () => { this.toast.success('Item removido.'); this.load(); },
      error: () => this.toast.error('Erro ao remover.'),
    });
  }

  protected empty(): StockItem {
    return { category: this.category, description: '', valor: 0, purchased_qty: 0, available_qty: 0 };
  }
}
