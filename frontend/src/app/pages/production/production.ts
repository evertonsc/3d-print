import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, FilamentSpool, Printer, PrintJob } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

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

  printers: Printer[] = [];
  spools: FilamentSpool[] = [];
  jobs: PrintJob[] = [];

  /** Disables the submit button immediately on first click. */
  busy = false;
  /** Tracks per-row delete in flight. */
  removing: Record<number, boolean> = {};

  form = {
    project_name: '', printer_id: 0, filament_inventory_id: 0,
    quantity: 1, filament_grams: 0, print_time_hours: 0, labor_hours: 0,
    supplies_cost: 0, packaging_cost: 0, sold_value: 0,
  };

  ngOnInit() {
    this.api.listPrinters().subscribe(d => this.printers = d);
    this.api.listSpools().subscribe(d => this.spools = d);
    this.load();
  }

  load() { this.api.listJobs().subscribe(d => this.jobs = d); }

  produce() {
    if (this.busy) return;
    if (!this.form.printer_id || !this.form.filament_inventory_id || !this.form.filament_grams) {
      this.toast.error('Preencha impressora, carretel e gramas.');
      return;
    }
    this.busy = true;
    this.api.createJob(this.form).pipe(finalize(() => this.busy = false)).subscribe({
      next: () => {
        this.toast.success('Produção registrada e estoque deduzido.');
        this.api.listSpools().subscribe(d => this.spools = d);
        this.load();
      },
      error: e => this.toast.error(e?.error?.detail || 'Erro ao registrar produção.'),
    });
  }

  remove(id: number) {
    if (this.removing[id]) return;
    this.removing[id] = true;
    this.api.deleteJob(id).pipe(finalize(() => this.removing[id] = false)).subscribe({
      next: () => {
        this.toast.success('Produção removida.');
        this.api.listSpools().subscribe(d => this.spools = d);
        this.load();
      },
      error: () => this.toast.error('Erro ao remover.'),
    });
  }

  spoolLabel(s: FilamentSpool): string {
    return `${s.color} ${s.brand ? '— ' + s.brand : ''} (${s.quantity_grams|0}g restantes)`;
  }
}
