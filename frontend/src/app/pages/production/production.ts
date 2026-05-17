import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, FilamentSpool, Printer, PrintJob, PrintJobRequest, Settings, StockItem } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

type JobForm = PrintJobRequest;
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
  selector: 'app-production',
  imports: [CommonModule, FormsModule],
  templateUrl: './production.html',
  styleUrls: ['./production.css'],
})
export class Production implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  printers: Printer[] = [];
  spools: FilamentSpool[] = [];
  jobs: PrintJob[] = [];

  insumosCat: StockItem[] = [];
  embalagensCat: StockItem[] = [];

  settings: Settings | null = null;

  busy = false;
  removing: Record<number, boolean> = {};

  editingId: number | null = null;

  filamentos: Row[] = [];
  insumos: Row[] = [];
  embalagens: Row[] = [];

  modalCfg: ModalCfg | null = null;
  draft: Row = { id: 0, qty: 1 };

  form: JobForm = this.emptyForm();

  ngOnInit() {
    this.api.listPrinters().subscribe(d => { this.printers = d; this.cdr.detectChanges(); });
    this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
    this.api.listStockItems('supply').subscribe(d => { this.insumosCat = d; this.cdr.detectChanges(); });
    this.api.listStockItems('packaging').subscribe(d => { this.embalagensCat = d; this.cdr.detectChanges(); });
    this.api.getSettings().subscribe(s => { this.settings = s; this.cdr.detectChanges(); });
    this.load();
  }

  load() {
    this.api.listJobs().subscribe(d => { this.jobs = d; this.cdr.detectChanges(); });
  }

  spoolLabel(s: FilamentSpool): string {
    return `${s.color} ${s.brand ? '— ' + s.brand : ''} (${s.quantity_grams|0}g restantes)`;
  }

  // ========== Tooltips ==========
  private fmt(n: number): string {
    return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  finalCostTip(j: PrintJob): string {
    const ex: any = (j as any).extras || {};
    let supTotal = 0;
    for (const it of (ex.insumos || [])) {
      const cat = this.insumosCat.find(x => x.id === it.id);
      supTotal += (cat?.unit_price || 0) * (it.qty || 0);
    }
    let packTotal = 0;
    for (const it of (ex.embalagens || [])) {
      const cat = this.embalagensCat.find(x => x.id === it.id);
      packTotal += (cat?.unit_price || 0) * (it.qty || 0);
    }
    const prod = (j.final_cost || 0) - supTotal - packTotal;
    return `<b>Custo de produção:</b> R$ ${this.fmt(prod)}<br>`
         + `<b>Insumos:</b> R$ ${this.fmt(supTotal)}<br>`
         + `<b>Embalagens:</b> R$ ${this.fmt(packTotal)}`;
  }

  filamCostTip(j: PrintJob): string {
    const ex: any = (j as any).extras || {};
    const list: { id: number; qty: number }[] = (ex.filamentos_full && ex.filamentos_full.length)
      ? ex.filamentos_full
      : [{ id: j.filament_inventory_id, qty: j.filament_grams || 0 }];
    const totalGrams = list.reduce((s, r) => s + (r.qty || 0), 0) || 1;
    const totalCost = j.filament_cost || 0;
    const lines: string[] = [];
    for (const r of list) {
      const sp = this.spools.find(s => s.id === r.id);
      const name = sp ? this.spoolLabel(sp) : `#${r.id}`;
      const share = (r.qty || 0) / totalGrams;
      const cost = totalCost * share;
      lines.push(`<b>${name}:</b> R$ ${this.fmt(cost)}`);
    }
    return lines.join('<br>') || '—';
  }

  // ========== Modais ==========
  modalTotalFilamentos(cfg: ModalCfg): number {
    return cfg.rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  }
  modalTotalQty(cfg: ModalCfg): number {
    let total = 0;
    for (const r of cfg.rows) {
      total += cfg.unitPriceFor(r.id) * (Number(r.qty) || 0);
    }
    return total;
  }

  openFilamentos() {
    this.modalCfg = {
      kind: 'filamento',
      title: 'Adicionar Filamento',
      fieldLabel: 'Filamento',
      qtyLabel: 'Quantidade (g)',
      addLabel: 'Adicionar Filamento',
      options: this.spools,
      optionLabel: (s: FilamentSpool) => this.spoolLabel(s),
      labelFor: (id: number) => {
        const s = this.spools.find(x => x.id === id);
        return s ? this.spoolLabel(s) : `#${id}`;
      },
      unitPriceFor: () => 0,
      rows: this.filamentos.map(r => ({ ...r })),
      successMsg: 'Filamento(s) salvo(s)',
    };
    this.draft = { id: 0, qty: 1 };
    this.cdr.detectChanges();
  }

  openInsumos() {
    this.modalCfg = {
      kind: 'insumo',
      title: 'Adicionar Insumo',
      fieldLabel: 'Insumo',
      qtyLabel: 'Quantidade (unid)',
      addLabel: 'Adicionar Insumo',
      options: this.insumosCat,
      optionLabel: (s: StockItem) => s.description,
      labelFor: (id: number) => this.insumosCat.find(x => x.id === id)?.description || `#${id}`,
      unitPriceFor: (id: number) => this.insumosCat.find(x => x.id === id)?.unit_price || 0,
      rows: this.insumos.map(r => ({ ...r })),
      successMsg: 'Insumo(s) salvo(s)',
    };
    this.draft = { id: 0, qty: 1 };
    this.cdr.detectChanges();
  }

  openEmbalagens() {
    this.modalCfg = {
      kind: 'embalagem',
      title: 'Adicionar Embalagem',
      fieldLabel: 'Embalagem',
      qtyLabel: 'Quantidade (unid)',
      addLabel: 'Adicionar Embalagem',
      options: this.embalagensCat,
      optionLabel: (s: StockItem) => s.description,
      labelFor: (id: number) => this.embalagensCat.find(x => x.id === id)?.description || `#${id}`,
      unitPriceFor: (id: number) => this.embalagensCat.find(x => x.id === id)?.unit_price || 0,
      rows: this.embalagens.map(r => ({ ...r })),
      successMsg: 'Embalagem(ns) salva(s)',
    };
    this.draft = { id: 0, qty: 1 };
    this.cdr.detectChanges();
  }

  addRow(cfg: ModalCfg) {
    if (!this.draft.id || !this.draft.qty || this.draft.qty <= 0) {
      this.toast.error('Preencha os campos obrigatórios (*).');
      return;
    }
    cfg.rows.push({ id: this.draft.id, qty: this.draft.qty });
    this.draft = { id: 0, qty: 1 };
    this.cdr.detectChanges();
  }

  saveModal(cfg: ModalCfg) {
    if (cfg.kind === 'filamento') this.filamentos = cfg.rows.map(r => ({ ...r }));
    else if (cfg.kind === 'insumo') this.insumos = cfg.rows.map(r => ({ ...r }));
    else if (cfg.kind === 'embalagem') this.embalagens = cfg.rows.map(r => ({ ...r }));
    this.toast.success(cfg.successMsg);
    this.closeModal();
  }

  closeModal() {
    this.modalCfg = null;
    this.cdr.detectChanges();
  }

  // ========== Submit ==========
  produce() {
    if (this.busy) return;
    if (!this.form.project_name || !this.form.printer_id) {
      this.toast.error('Preencha os campos obrigatórios (*).');
      return;
    }
    if (!this.form.print_time_hours || this.form.print_time_hours <= 0) {
      this.toast.error('Tempo (h) é obrigatório e deve ser diferente de 0.');
      return;
    }
    if (!this.filamentos.length) {
      this.toast.error('Adicione pelo menos um Filamento.');
      return;
    }

    const primary = this.filamentos[0];
    const totalGrams = this.filamentos.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const extras = this.filamentos.slice(1).map(r => r.id).filter(Boolean);

    const payload: any = {
      ...this.form,
      filament_grams: totalGrams,
      filament_inventory_id: primary.id,
      extra_filament_ids: extras,
      insumos: this.insumos.filter(r => r.id && r.qty > 0),
      embalagens: this.embalagens.filter(r => r.id && r.qty > 0),
      filamentos_full: this.filamentos,
    };

    this.busy = true;

    const refresh = () => {
      this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
      this.api.listStockItems('supply').subscribe(d => { this.insumosCat = d; this.cdr.detectChanges(); });
      this.api.listStockItems('packaging').subscribe(d => { this.embalagensCat = d; this.cdr.detectChanges(); });
      this.load();
    };

    if (this.editingId != null) {
      this.api.updateJob(this.editingId, payload)
        .pipe(finalize(() => { this.busy = false; this.cdr.detectChanges(); }))
        .subscribe({
          next: () => { this.toast.success('Produto atualizado.'); this.cancelEdit(); refresh(); },
          error: e => this.toast.error(e?.error?.detail || 'Erro ao atualizar produto.'),
        });
    } else {
      this.api.createJob(payload)
        .pipe(finalize(() => { this.busy = false; this.cdr.detectChanges(); }))
        .subscribe({
          next: () => {
            this.toast.success('Produto registrado e estoque deduzido.');
            this.resetForm();
            refresh();
          },
          error: e => this.toast.error(e?.error?.detail || 'Erro ao registrar produto.'),
        });
    }
  }

  edit(j: PrintJob) {
    this.editingId = j.id;
    this.form = {
      project_name: j.project_name,
      printer_id: j.printer_id,
      filament_inventory_id: j.filament_inventory_id,
      quantity: 1,
      filament_grams: j.filament_grams || 0,
      print_time_hours: j.print_time_hours || 0,
      labor_hours: j.labor_hours || 0,
      supplies_cost: 0,
      packaging_cost: 0,
      sold_value: 0,
    };
    const ex: any = (j as any).extras || {};
    if (Array.isArray(ex.filamentos_full) && ex.filamentos_full.length) {
      this.filamentos = ex.filamentos_full.map((x: any) => ({ id: x.id, qty: x.qty || 1 }));
    } else {
      this.filamentos = [{ id: j.filament_inventory_id, qty: j.filament_grams || 1 }];
      for (const fid of (ex.extra_filament_ids || [])) {
        if (fid) this.filamentos.push({ id: fid, qty: 1 });
      }
    }
    this.insumos = (ex.insumos || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    this.embalagens = (ex.embalagens || []).map((x: any) => ({ id: x.id, qty: x.qty }));
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editingId = null;
    this.resetForm();
  }

  remove(id: number) {
    if (this.removing[id]) return;
    if (!confirm('Remover este produto?')) return;
    this.removing[id] = true;
    this.api.deleteJob(id).pipe(finalize(() => { this.removing[id] = false; this.cdr.detectChanges(); })).subscribe({
      next: () => {
        this.toast.success('Produto removido.');
        this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
        this.load();
      },
      error: () => this.toast.error('Erro ao remover.'),
    });
  }

  private resetForm() {
    this.form = this.emptyForm();
    this.filamentos = [];
    this.insumos = [];
    this.embalagens = [];
    this.cdr.detectChanges();
  }

  private emptyForm(): JobForm {
    return {
      project_name: '', printer_id: 0, filament_inventory_id: 0,
      quantity: 1, filament_grams: 0, print_time_hours: 0, labor_hours: 0,
      supplies_cost: 0, packaging_cost: 0, sold_value: 0,
    };
  }
}
