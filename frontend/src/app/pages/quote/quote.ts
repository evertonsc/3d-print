import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, FilamentSpool, Printer, PrintJob, Quote, QuoteRequest, Settings, StockItem } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

type Row = { id: number; qty: number };

interface ModalCfg {
  kind: 'filamento' | 'insumo' | 'embalagem';
  title: string;
  fieldLabel: string;
  qtyLabel: string;
  addLabel: string;
  options: any[];
  optionLabel: (o: any) => string;
  labelFor: (id: number) => string;
  unitPriceFor: (id: number) => number;
  rows: Row[];
  successMsg: string;
}

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
  settings: Settings | null = null;

  busy = false;
  removing: Record<number, boolean> = {};
  editingId: number | null = null;

  filamentos: Row[] = [];
  insumos: Row[] = [];
  embalagens: Row[] = [];

  modalCfg: ModalCfg | null = null;
  draft: Row = { id: 0, qty: 1 };

  form: QuoteRequest & { unit_value?: number } = this.empty();

  ngOnInit() {
    this.api.listPrinters().subscribe(d => { this.printers = d; this.cdr.detectChanges(); });
    this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
    this.api.listJobs().subscribe(d => { this.products = d; this.cdr.detectChanges(); });
    this.api.listStockItems('supply').subscribe(d => { this.insumosCat = d; this.cdr.detectChanges(); });
    this.api.listStockItems('packaging').subscribe(d => { this.embalagensCat = d; this.cdr.detectChanges(); });
    this.api.getSettings().subscribe(s => { this.settings = s; this.cdr.detectChanges(); });
    this.load();
  }

  load() {
    this.api.listQuotes().subscribe(d => { this.quotes = d; this.cdr.detectChanges(); });
  }

  spoolLabel(s: FilamentSpool): string {
    return `${s.color} ${s.brand ? '— ' + s.brand : ''}`;
  }

  /** When a Produto is selected, populate fields from the product. */
  onProductChange() {
    const p = this.products.find(x => x.id === this.form.product_job_id);
    if (!p) return;
    this.form.printer_id = p.printer_id;
    this.form.print_time_hours = p.print_time_hours || 0;
    this.form.labor_hours = p.labor_hours || 0;
    const ex: any = (p as any).extras || {};
    this.insumos = (ex.insumos || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    this.embalagens = (ex.embalagens || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    if (Array.isArray(ex.filamentos_full) && ex.filamentos_full.length) {
      this.filamentos = ex.filamentos_full.map((x: any) => ({ id: x.id, qty: x.qty || 0 }));
    } else if (p.filament_inventory_id) {
      this.filamentos = [{ id: p.filament_inventory_id, qty: p.filament_grams || 0 }];
    }
    this.cdr.detectChanges();
  }

  // ===== Modais (same behavior as Produtos) =====
  modalTotalFilamentos(cfg: ModalCfg): number {
    return cfg.rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  }
  modalTotalQty(cfg: ModalCfg): number {
    let total = 0;
    for (const r of cfg.rows) total += cfg.unitPriceFor(r.id) * (Number(r.qty) || 0);
    return total;
  }

  openFilamentos() {
    this.modalCfg = {
      kind: 'filamento', title: 'Adicionar Filamento',
      fieldLabel: 'Filamento', qtyLabel: 'Quantidade (g)',
      addLabel: 'Adicionar Filamento',
      options: this.spools,
      optionLabel: (s: FilamentSpool) => this.spoolLabel(s),
      labelFor: (id: number) => { const s = this.spools.find(x => x.id === id); return s ? this.spoolLabel(s) : `#${id}`; },
      unitPriceFor: () => 0,
      rows: this.filamentos.map(r => ({ ...r })),
      successMsg: 'Filamento(s) salvo(s)',
    };
    this.draft = { id: 0, qty: 1 };
  }

  openInsumos() {
    this.modalCfg = {
      kind: 'insumo', title: 'Adicionar Insumo',
      fieldLabel: 'Insumo', qtyLabel: 'Quantidade (unid)',
      addLabel: 'Adicionar Insumo',
      options: this.insumosCat,
      optionLabel: (s: StockItem) => s.description,
      labelFor: (id: number) => this.insumosCat.find(x => x.id === id)?.description || `#${id}`,
      unitPriceFor: (id: number) => this.insumosCat.find(x => x.id === id)?.unit_price || 0,
      rows: this.insumos.map(r => ({ ...r })),
      successMsg: 'Insumo(s) salvo(s)',
    };
    this.draft = { id: 0, qty: 1 };
  }

  openEmbalagens() {
    this.modalCfg = {
      kind: 'embalagem', title: 'Adicionar Embalagem',
      fieldLabel: 'Embalagem', qtyLabel: 'Quantidade (unid)',
      addLabel: 'Adicionar Embalagem',
      options: this.embalagensCat,
      optionLabel: (s: StockItem) => s.description,
      labelFor: (id: number) => this.embalagensCat.find(x => x.id === id)?.description || `#${id}`,
      unitPriceFor: (id: number) => this.embalagensCat.find(x => x.id === id)?.unit_price || 0,
      rows: this.embalagens.map(r => ({ ...r })),
      successMsg: 'Embalagem(ns) salva(s)',
    };
    this.draft = { id: 0, qty: 1 };
  }

  addRow(cfg: ModalCfg) {
    if (!this.draft.id || !this.draft.qty || this.draft.qty <= 0) {
      this.toast.error('Preencha os campos obrigatórios (*).'); return;
    }
    cfg.rows.push({ id: this.draft.id, qty: this.draft.qty });
    this.draft = { id: 0, qty: 1 };
  }
  saveModal(cfg: ModalCfg) {
    if (cfg.kind === 'filamento') this.filamentos = cfg.rows.map(r => ({ ...r }));
    else if (cfg.kind === 'insumo') this.insumos = cfg.rows.map(r => ({ ...r }));
    else if (cfg.kind === 'embalagem') this.embalagens = cfg.rows.map(r => ({ ...r }));
    this.toast.success(cfg.successMsg);
    this.closeModal();
  }
  closeModal() { this.modalCfg = null; this.cdr.detectChanges(); }

  save() {
    if (this.busy) return;
    if (!this.form.product_job_id || !this.form.printer_id) {
      this.toast.error('Preencha os campos obrigatórios (*).'); return;
    }
    if (!this.filamentos.length) {
      this.toast.error('Adicione pelo menos um Filamento.'); return;
    }
    const product = this.products.find(p => p.id === this.form.product_job_id);
    const primary = this.filamentos[0];
    const totalGrams = this.filamentos.reduce((s, r) => s + (Number(r.qty) || 0), 0);

    const payload: any = {
      ...this.form,
      project_name: product?.project_name || '',
      filament_inventory_id: primary.id,
      filament_grams: totalGrams,
      insumos: this.insumos.filter(r => r.id && r.qty > 0),
      embalagens: this.embalagens.filter(r => r.id && r.qty > 0),
      filamentos_full: this.filamentos,
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
      filament_grams: q.filament_grams || 0,
      print_time_hours: q.print_time_hours || 0,
      labor_hours: q.labor_hours || 0,
      supplies_cost: 0,
      packaging_cost: 0,
      override_price_per_kg: null,
      insumos: [], embalagens: [],
      unit_value: 0,
    };
    if (Array.isArray(ex.filamentos_full) && ex.filamentos_full.length) {
      this.filamentos = ex.filamentos_full.map((x: any) => ({ id: x.id, qty: x.qty || 0 }));
    } else if (q.filament_inventory_id) {
      this.filamentos = [{ id: q.filament_inventory_id, qty: q.filament_grams || 0 }];
    } else {
      this.filamentos = [];
    }
    this.insumos = (ex.insumos || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    this.embalagens = (ex.embalagens || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editingId = null;
    this.form = this.empty();
    this.filamentos = []; this.insumos = []; this.embalagens = [];
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

  private empty(): QuoteRequest & { unit_value?: number } {
    return {
      client: '', product_job_id: null, project_name: '',
      printer_id: 0, filament_inventory_id: null, filament_id: null,
      quantity: 1, filament_grams: 0, print_time_hours: 0, labor_hours: 0,
      supplies_cost: 0, packaging_cost: 0, override_price_per_kg: null,
      insumos: [], embalagens: [], unit_value: 0,
    };
  }
}
