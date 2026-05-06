import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, FilamentSpool, Printer, PrintJob, PrintJobRequest, StockItem } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

type JobForm = PrintJobRequest;

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

  busy = false;
  removing: Record<number, boolean> = {};

  editingId: number | null = null;

  // Multi-filamento
  multiFilament = false;
  extraFilamentIds: number[] = [];

  // Linhas dinâmicas
  insumos: { id: number; qty: number }[] = [];
  embalagens: { id: number; qty: number }[] = [];

  form: JobForm = this.emptyForm();

  ngOnInit() {
    this.api.listPrinters().subscribe(d => { this.printers = d; this.cdr.detectChanges(); });
    this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
    this.api.listStockItems('supply').subscribe(d => { this.insumosCat = d; this.cdr.detectChanges(); });
    this.api.listStockItems('packaging').subscribe(d => { this.embalagensCat = d; this.cdr.detectChanges(); });
    this.load();
  }

  load() {
    this.api.listJobs().subscribe(d => { this.jobs = d; this.cdr.detectChanges(); });
  }

  trackIdx(i: number) { return i; }

  // ----- Multi filamento -----
  onToggleMulti() {
    if (!this.multiFilament) this.extraFilamentIds = [];
    else if (!this.extraFilamentIds.length) this.extraFilamentIds = [0]; // Filamento 2
    this.cdr.detectChanges();
  }
  addExtraFilament() { this.extraFilamentIds.push(0); this.cdr.detectChanges(); }
  removeExtraFilament(i: number) { this.extraFilamentIds.splice(i, 1); this.cdr.detectChanges(); }
  setExtraFilament(i: number, v: number) { this.extraFilamentIds[i] = v; }

  // ----- Insumos / Embalagens -----
  addInsumo() { this.insumos.push({ id: 0, qty: 1 }); this.cdr.detectChanges(); }
  removeInsumo(i: number) { this.insumos.splice(i, 1); this.cdr.detectChanges(); }
  addEmbalagem() { this.embalagens.push({ id: 0, qty: 1 }); this.cdr.detectChanges(); }
  removeEmbalagem(i: number) { this.embalagens.splice(i, 1); this.cdr.detectChanges(); }

  produce() {
    if (this.busy) return;
    if (!this.form.project_name || !this.form.printer_id || !this.form.filament_inventory_id || !this.form.filament_grams) {
      this.toast.error('Preencha os campos obrigatórios (*).');
      return;
    }
    if (!this.form.print_time_hours || this.form.print_time_hours <= 0) {
      this.toast.error('Tempo (h) é obrigatório e deve ser diferente de 0.');
      return;
    }

    const payload: JobForm = {
      ...this.form,
      extra_filament_ids: this.multiFilament ? this.extraFilamentIds.filter(x => !!x) : [],
      insumos: this.insumos.filter(r => r.id && r.qty > 0),
      embalagens: this.embalagens.filter(r => r.id && r.qty > 0),
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
      sold_value: j.sold_value || 0,
    };
    const ex: any = (j as any).extras || {};
    this.extraFilamentIds = ex.extra_filament_ids || [];
    this.multiFilament = this.extraFilamentIds.length > 0;
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

  spoolLabel(s: FilamentSpool): string {
    return `${s.color} ${s.brand ? '— ' + s.brand : ''} (${s.quantity_grams|0}g restantes)`;
  }

  private resetForm() {
    this.form = this.emptyForm();
    this.multiFilament = false;
    this.extraFilamentIds = [];
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
