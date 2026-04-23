import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Settings, Printer, Filament } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);

  settings: Settings = {
    energy_cost_per_kwh: 0.86, labor_cost_per_hour: 10, failure_rate: 10,
    currency: 'R$', marketplace_fee: 0.20, tax: 0, fixed_fee: 4, markup: 1.5,
  };
  printers: Printer[] = [];
  filaments: Filament[] = [];
  message = ''; success = true;

  newPrinter: Printer = { name: '', manufacturer: '', price: 0, depreciation_hours: 10000, maintenance_cost: 0, avg_power_kwh: 0.15 };
  newFilament: Filament = { name: '', manufacturer: '', type: 'PLA', diameter_mm: 1.75, spool_price: 0, spool_weight_kg: 1, density: 1.24 };

  ngOnInit() { this.load(); }

  load() {
    this.api.getSettings().subscribe(s => { if (s) this.settings = s; });
    this.api.listPrinters().subscribe(d => this.printers = d);
    this.api.listFilaments().subscribe(d => this.filaments = d);
  }

  save() {
    this.api.updateSettings(this.settings).subscribe({
      next: () => { this.success = true; this.message = 'Configurações salvas.'; },
      error: () => { this.success = false; this.message = 'Erro ao salvar.'; },
    });
  }

  addPrinter() {
    if (!this.newPrinter.name) return;
    this.api.createPrinter(this.newPrinter).subscribe(() => {
      this.newPrinter = { name: '', manufacturer: '', price: 0, depreciation_hours: 10000, maintenance_cost: 0, avg_power_kwh: 0.15 };
      this.api.listPrinters().subscribe(d => this.printers = d);
    });
  }
  delPrinter(id?: number) { if (id) this.api.deletePrinter(id).subscribe(() => this.api.listPrinters().subscribe(d => this.printers = d)); }

  addFilament() {
    if (!this.newFilament.name) return;
    this.api.createFilament(this.newFilament).subscribe(() => {
      this.newFilament = { name: '', manufacturer: '', type: 'PLA', diameter_mm: 1.75, spool_price: 0, spool_weight_kg: 1, density: 1.24 };
      this.api.listFilaments().subscribe(d => this.filaments = d);
    });
  }
  delFilament(id?: number) { if (id) this.api.deleteFilament(id).subscribe(() => this.api.listFilaments().subscribe(d => this.filaments = d)); }
}
