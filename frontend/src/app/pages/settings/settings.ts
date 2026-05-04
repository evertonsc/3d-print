import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Settings, Printer } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  settings: Settings = {
    energy_cost_per_kwh: 0.86, labor_cost_per_hour: 10, failure_rate: 10,
    currency: 'R$', marketplace_fee: 0.20, tax: 0, fixed_fee: 4, markup: 1.5,
  };
  printers: Printer[] = [];

  savingSettings = false;
  busyPrinter = false;
  removingPrinter: Record<number, boolean> = {};
  editingPrinterId: number | null = null;

  newPrinter: Printer = this.emptyPrinter();

  ngOnInit() { this.load(); }

  load() {
    this.api.getSettings().subscribe(s => { if (s) this.settings = s; this.cdr.detectChanges(); });
    this.refreshPrinters();
  }

  refreshPrinters() { this.api.listPrinters().subscribe(d => { this.printers = d; this.cdr.detectChanges(); }); }

  save() {
    if (this.savingSettings) return;
    this.savingSettings = true;
    this.api.updateSettings(this.settings).pipe(finalize(() => { this.savingSettings = false; this.cdr.detectChanges(); })).subscribe({
      next: () => this.toast.success('Configurações salvas.'),
      error: () => this.toast.error('Erro ao salvar.'),
    });
  }

  // ---------- Printers ----------
  savePrinter() {
    if (this.busyPrinter) return;
    if (!this.newPrinter.name) { this.toast.error('Informe o nome da impressora.'); return; }
    this.busyPrinter = true;
    const op = this.editingPrinterId != null
      ? this.api.updatePrinter(this.editingPrinterId, this.newPrinter)
      : this.api.createPrinter(this.newPrinter);
    op.pipe(finalize(() => { this.busyPrinter = false; this.cdr.detectChanges(); })).subscribe({
      next: () => {
        this.toast.success(this.editingPrinterId != null ? 'Impressora atualizada.' : 'Impressora adicionada.');
        this.cancelPrinter();
        this.refreshPrinters();
      },
      error: () => this.toast.error('Erro ao salvar impressora.'),
    });
  }
  editPrinter(p: Printer) { this.editingPrinterId = p.id ?? null; this.newPrinter = { ...p }; this.cdr.detectChanges(); }
  cancelPrinter() { this.editingPrinterId = null; this.newPrinter = this.emptyPrinter(); this.cdr.detectChanges(); }
  delPrinter(id?: number) {
    if (!id || this.removingPrinter[id]) return;
    if (!confirm('Excluir esta impressora?')) return;
    this.removingPrinter[id] = true;
    this.api.deletePrinter(id).pipe(finalize(() => { this.removingPrinter[id] = false; this.cdr.detectChanges(); })).subscribe({
      next: () => { this.toast.success('Impressora removida.'); this.refreshPrinters(); },
      error: () => this.toast.error('Erro ao remover impressora.'),
    });
  }

  private emptyPrinter(): Printer {
    return { name: '', manufacturer: '', price: 0, depreciation_hours: 10000, maintenance_cost: 0, avg_power_kwh: 0.15 };
  }
}
