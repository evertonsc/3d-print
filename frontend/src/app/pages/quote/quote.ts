import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, FilamentSpool, Printer, PrintJob, Quote, QuoteRequest, StockItem } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-quote',
  imports: [CommonModule, FormsModule],
  templateUrl: './quote.html',
  styleUrls: ['./quote.css'],
})
export class QuotePage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  printers: Printer[] = [];
  spools: FilamentSpool[] = [];
  products: PrintJob[] = [];
  insumosCat: StockItem[] = [];
  embalagensCat: StockItem[] = [];
  quotes: Quote[] = [];

  busy = false;
  removing: Record<number, boolean> = {};
  editingId: number | null = null;

  form: QuoteRequest = this.empty();

  ngOnInit() {
    this.api.listPrinters().subscribe(d => { this.printers = d; this.cdr.detectChanges(); });
    this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
    this.api.listJobs().subscribe(d => { this.products = d; this.cdr.detectChanges(); });
    this.api.listStockItems('supply').subscribe(d => { this.insumosCat = d; this.cdr.detectChanges(); });
    this.api.listStockItems('packaging').subscribe(d => { this.embalagensCat = d; this.cdr.detectChanges(); });
    this.load();
  }

  load() {
    this.api.listQuotes().subscribe(d => { this.quotes = d; this.cdr.detectChanges(); });
  }

  spoolLabel(s: FilamentSpool): string {
    return `${s.color} ${s.brand ? '— ' + s.brand : ''}`;
  }

  /** When a Produto is selected, fill Impressora, Tempo, Trabalho, Insumos, Embalagens. */
  onProductChange() {
    const p = this.products.find(x => x.id === this.form.product_job_id);
    if (!p) return;
    this.form.printer_id = p.printer_id;
    this.form.print_time_hours = p.print_time_hours || 0;
    this.form.labor_hours = p.labor_hours || 0;
    const ex: any = (p as any).extras || {};
    this.form.insumos = (ex.insumos || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    this.form.embalagens = (ex.embalagens || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    if (!this.form.filament_grams) this.form.filament_grams = p.filament_grams || 0;
    this.cdr.detectChanges();
  }

  save() {
    if (this.busy) return;
    if (!this.form.product_job_id || !this.form.printer_id || !this.form.filament_inventory_id || !this.form.filament_grams) {
      this.toast.error('Preencha os campos obrigatórios (*).');
      return;
    }
    const product = this.products.find(p => p.id === this.form.product_job_id);
    const payload: QuoteRequest = {
      ...this.form,
      project_name: product?.project_name || '',
    };
    this.busy = true;
    const req = this.editingId != null
      ? this.api.updateQuote(this.editingId, payload)
      : this.api.createQuote(payload);
    req.pipe(finalize(() => { this.busy = false; this.cdr.detectChanges(); })).subscribe({
      next: () => {
        this.toast.success(this.editingId != null ? 'Orçamento atualizado.' : 'Orçamento salvo.');
        this.cancelEdit();
        this.load();
      },
      error: e => this.toast.error(e?.error?.detail || 'Erro ao salvar orçamento.'),
    });
  }

  edit(q: Quote) {
    this.editingId = q.id;
    const ex: any = (q as any).extras || {};
    this.form = {
      client: q.client || '',
      product_job_id: q.product_job_id,
      project_name: q.project_name,
      printer_id: q.printer_id,
      filament_inventory_id: q.filament_inventory_id,
      filament_id: null,
      quantity: q.quantity || 1,
      filament_grams: (q.filament_grams || 0) / Math.max(1, q.quantity || 1),
      print_time_hours: (q.print_time_hours || 0) / Math.max(1, q.quantity || 1),
      labor_hours: (q.labor_hours || 0) / Math.max(1, q.quantity || 1),
      supplies_cost: 0,
      packaging_cost: 0,
      override_price_per_kg: null,
      insumos: (ex.insumos || []).map((x: any) => ({ id: x.id, qty: x.qty })),
      embalagens: (ex.embalagens || []).map((x: any) => ({ id: x.id, qty: x.qty })),
    };
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editingId = null;
    this.form = this.empty();
  }

  remove(id: number) {
    if (this.removing[id]) return;
    if (!confirm('Remover este orçamento?')) return;
    this.removing[id] = true;
    this.api.deleteQuote(id).pipe(finalize(() => { this.removing[id] = false; this.cdr.detectChanges(); })).subscribe({
      next: () => { this.toast.success('Orçamento removido.'); this.load(); },
      error: () => this.toast.error('Erro ao remover.'),
    });
  }

  private empty(): QuoteRequest {
    return {
      client: '',
      product_job_id: null,
      project_name: '',
      printer_id: 0,
      filament_inventory_id: null,
      filament_id: null,
      quantity: 1,
      filament_grams: 0,
      print_time_hours: 0,
      labor_hours: 0,
      supplies_cost: 0,
      packaging_cost: 0,
      override_price_per_kg: null,
      insumos: [],
      embalagens: [],
    };
  }
}
