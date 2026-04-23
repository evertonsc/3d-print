import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, FilamentSpool, Printer, PrintJob } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-production',
  imports: [CommonModule, FormsModule],
  templateUrl: './production.html',
  styleUrls: ['./production.css'],
})
export class Production implements OnInit {
  private api = inject(ApiService);

  printers: Printer[] = [];
  spools: FilamentSpool[] = [];
  jobs: PrintJob[] = [];

  form = {
    project_name: '',
    printer_id: 0,
    filament_inventory_id: 0,
    quantity: 1,
    filament_grams: 0,
    print_time_hours: 0,
    labor_hours: 0,
    supplies_cost: 0,
    packaging_cost: 0,
    sold_value: 0,
  };

  message = ''; success = true;

  ngOnInit() {
    this.api.listPrinters().subscribe(d => this.printers = d);
    this.api.listSpools().subscribe(d => this.spools = d);
    this.load();
  }

  load() { this.api.listJobs().subscribe(d => this.jobs = d); }

  produce() {
    if (!this.form.printer_id || !this.form.filament_inventory_id || !this.form.filament_grams) {
      this.success = false; this.message = 'Preencha impressora, carretel e gramas.';
      return;
    }
    this.api.createJob(this.form).subscribe({
      next: () => {
        this.success = true; this.message = 'Produção registrada e estoque deduzido.';
        this.api.listSpools().subscribe(d => this.spools = d);
        this.load();
      },
      error: e => { this.success = false; this.message = e?.error?.detail || 'Erro ao registrar produção.'; },
    });
  }

  remove(id: number) {
    this.api.deleteJob(id).subscribe(() => {
      this.api.listSpools().subscribe(d => this.spools = d);
      this.load();
    });
  }

  spoolLabel(s: FilamentSpool): string {
    return `${s.color} ${s.brand ? '— ' + s.brand : ''} (${s.quantity_grams|0}g restantes)`;
  }

  dismiss() { this.message = ''; }
}
