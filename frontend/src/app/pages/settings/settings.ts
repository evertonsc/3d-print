import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Settings, Printer, Filament } from '../../services/api.service';
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

  settings: Settings = {
    energy_cost_per_kwh: 0.86, labor_cost_per_hour: 10, failure_rate: 10,
    currency: 'R$', marketplace_fee: 0.20, tax: 0, fixed_fee: 4, markup: 1.5,
  };
  printers: Printer[] = [];
  filaments: Filament[] = [];

  savingSettings = false;
  addingPrinter = false;
  addingFilament = false;
  removingPrinter: Record<number, boolean> = {};
  removingFilament: Record<number, boolean> = {};

  newPrinter: Printer = this.emptyPrinter();
  newFilament: Filament = this.emptyFilament();

  ngOnInit() { this.load(); }

  load() {
    this.api.getSettings().subscribe(s => { if (s) this.settings = s; });
    this.api.listPrinters().subscribe(d => this.printers = d);
    this.api.listFilaments().subscribe(d => this.filaments = d);
  }

  save() {
    if (this.savingSettings) return;
    this.savingSettings = true;
    this.api.updateSettings(this.settings).pipe(finalize(() => this.savingSettings = false)).subscribe({
      next: () => this.toast.success('Configurações salvas.'),
      error: () => this.toast.error('Erro ao salvar.'),
    });
  }

  addPrinter() {
    if (this.addingPrinter) return;
    if (!this.newPrinter.name) { this.toast.error('Informe o nome da impressora.'); return; }
    this.addingPrinter = true;
    this.api.createPrinter(this.newPrinter).pipe(finalize(() => this.addingPrinter = false)).subscribe({
      next: () => {
        this.toast.success('Impressora adicionada.');
        this.newPrinter = this.emptyPrinter();
        this.api.listPrinters().subscribe(d => this.printers = d);
      },
      error: () => this.toast.error('Erro ao adicionar impressora.'),
    });
  }

  delPrinter(id?: number) {
    if (!id || this.removingPrinter[id]) return;
    this.removingPrinter[id] = true;
    this.api.deletePrinter(id).pipe(finalize(() => this.removingPrinter[id] = false)).subscribe({
      next: () => { this.toast.success('Impressora removida.'); this.api.listPrinters().subscribe(d => this.printers = d); },
      error: () => this.toast.error('Erro ao remover impressora.'),
    });
  }

  addFilament() {
    if (this.addingFilament) return;
    if (!this.newFilament.name) { this.toast.error('Informe o nome do filamento.'); return; }
    this.addingFilament = true;
    this.api.createFilament(this.newFilament).pipe(finalize(() => this.addingFilament = false)).subscribe({
      next: () => {
        this.toast.success('Filamento adicionado.');
        this.newFilament = this.emptyFilament();
        this.api.listFilaments().subscribe(d => this.filaments = d);
      },
      error: () => this.toast.error('Erro ao adicionar filamento.'),
    });
  }

  delFilament(id?: number) {
    if (!id || this.removingFilament[id]) return;
    this.removingFilament[id] = true;
    this.api.deleteFilament(id).pipe(finalize(() => this.removingFilament[id] = false)).subscribe({
      next: () => { this.toast.success('Filamento removido.'); this.api.listFilaments().subscribe(d => this.filaments = d); },
      error: () => this.toast.error('Erro ao remover filamento.'),
    });
  }

  private emptyPrinter(): Printer {
    return { name: '', manufacturer: '', price: 0, depreciation_hours: 10000, maintenance_cost: 0, avg_power_kwh: 0.15 };
  }
  private emptyFilament(): Filament {
    return { name: '', manufacturer: '', type: 'PLA', diameter_mm: 1.75, spool_price: 0, spool_weight_kg: 1, density: 1.24 };
  }
}
