import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, FilamentSpool, Printer, PrintJob, PrintJobRequest } from '../../services/api.service';
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

  busy = false;
  removing: Record<number, boolean> = {};

  /** When set, the form is editing this job id instead of creating a new one. */
  editingId: number | null = null;

  form: JobForm = this.emptyForm();

  ngOnInit() {
    this.api.listPrinters().subscribe(d => { this.printers = d; this.cdr.detectChanges(); });
    this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
    this.load();
  }

  load() {
    this.api.listJobs().subscribe(d => { this.jobs = d; this.cdr.detectChanges(); });
  }

  produce() {
    if (this.busy) return;
    if (!this.form.project_name || !this.form.printer_id || !this.form.filament_inventory_id || !this.form.filament_grams) {
      this.toast.error('Preencha os campos obrigatórios (*).');
      return;
    }
    this.busy = true;

    if (this.editingId != null) {
      this.api.updateJob(this.editingId, this.form)
        .pipe(finalize(() => { this.busy = false; this.cdr.detectChanges(); }))
        .subscribe({
          next: () => {
            this.toast.success('Produção atualizada.');
            this.cancelEdit();
            this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
            this.load();
          },
          error: e => this.toast.error(e?.error?.detail || 'Erro ao atualizar produção.'),
        });
    } else {
      this.api.createJob(this.form)
        .pipe(finalize(() => { this.busy = false; this.cdr.detectChanges(); }))
        .subscribe({
          next: () => {
            this.toast.success('Produção registrada e estoque deduzido.');
            this.form = this.emptyForm();
            this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
            this.load();
          },
          error: e => this.toast.error(e?.error?.detail || 'Erro ao registrar produção.'),
        });
    }
  }

  edit(j: PrintJob) {
    this.editingId = j.id;
    this.form = {
      project_name: j.project_name,
      printer_id: j.printer_id,
      filament_inventory_id: j.filament_inventory_id,
      // unit values: divide back by quantity since DB stores totals
      quantity: j.quantity || 1,
      filament_grams: (j.filament_grams || 0) / Math.max(1, j.quantity || 1),
      print_time_hours: (j.print_time_hours || 0) / Math.max(1, j.quantity || 1),
      labor_hours: (j.labor_hours || 0) / Math.max(1, j.quantity || 1),
      supplies_cost: (j.supplies_cost || 0) / Math.max(1, j.quantity || 1),
      packaging_cost: (j.packaging_cost || 0) / Math.max(1, j.quantity || 1),
      sold_value: j.sold_value || 0,
    };
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editingId = null;
    this.form = this.emptyForm();
    this.cdr.detectChanges();
  }

  remove(id: number) {
    if (this.removing[id]) return;
    if (!confirm('Remover esta produção?')) return;
    this.removing[id] = true;
    this.api.deleteJob(id).pipe(finalize(() => { this.removing[id] = false; this.cdr.detectChanges(); })).subscribe({
      next: () => {
        this.toast.success('Produção removida.');
        this.api.listSpools().subscribe(d => { this.spools = d; this.cdr.detectChanges(); });
        this.load();
      },
      error: () => this.toast.error('Erro ao remover.'),
    });
  }

  spoolLabel(s: FilamentSpool): string {
    return `${s.color} ${s.brand ? '— ' + s.brand : ''} (${s.quantity_grams|0}g restantes)`;
  }

  private emptyForm(): JobForm {
    return {
      project_name: '', printer_id: 0, filament_inventory_id: 0,
      quantity: 1, filament_grams: 0, print_time_hours: 0, labor_hours: 0,
      supplies_cost: 0, packaging_cost: 0, sold_value: 0,
    };
  }
}
