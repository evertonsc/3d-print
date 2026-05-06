import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Printer {
  id?: number;
  name: string;
  manufacturer?: string;
  price: number;
  depreciation_hours: number;
  maintenance_cost: number;
  avg_power_kwh: number;
  depreciation_per_hour?: number;
}

export interface Filament {
  id?: number;
  name: string;
  manufacturer?: string;
  type?: string;
  diameter_mm: number;
  spool_price: number;
  spool_weight_kg: number;
  density: number;
  price_per_kg?: number;
}

export interface FilamentSpool {
  id?: number;
  filament_id?: number | null;
  brand?: string;
  type?: string;
  color: string;
  source?: string;
  purchase_date?: string | null;
  purchase_price: number;
  quantity_grams: number;

  // Informações adicionais
  manufacturer?: string;
  diameter_mm?: number;
  density?: number;
  nozzle_temp?: number;
  bed_temp?: number;
}

export interface StockItem {
  id?: number;
  category: 'packaging' | 'supply';
  description: string;
  valor: number;
  purchased_qty: number;
  available_qty: number;
  unit_price?: number;
}

export interface Settings {
  energy_cost_per_kwh: number;
  labor_cost_per_hour: number;
  failure_rate: number;
  currency: string;
  marketplace_fee: number;
  tax: number;
  fixed_fee: number;
  markup: number;
}

export interface QuoteRequest {
  project_name: string;
  printer_id: number;
  filament_id: number;
  quantity: number;
  filament_grams: number;
  print_time_hours: number;
  labor_hours: number;
  supplies_cost: number;
  packaging_cost: number;
  override_price_per_kg?: number | null;
}

export interface QuoteResult {
  project_name: string;
  quantity: number;
  printer: string;
  filament: string;
  price_per_kg_used: number;
  filament_cost: number;
  energy_cost: number;
  depreciation_cost: number;
  labor_cost: number;
  supplies_cost: number;
  packaging_cost: number;
  subtotal: number;
  final_cost: number;
  suggested_price: number;
  marketplace_price: number;
  per_unit: {
    filament_cost: number;
    energy_cost: number;
    depreciation_cost: number;
    labor_cost: number;
    subtotal: number;
    final_cost: number;
    suggested_price: number;
    marketplace_price: number;
  };
}

export interface PrintJobRequest {
  project_name: string;
  printer_id: number;
  filament_inventory_id: number;
  quantity: number;
  filament_grams: number;
  print_time_hours: number;
  labor_hours: number;
  supplies_cost: number;
  packaging_cost: number;
  sold_value: number;
  date?: string | null;
  extra_filament_ids?: number[];
  insumos?: { id: number; qty: number }[];
  embalagens?: { id: number; qty: number }[];
}

export interface PrintJob extends PrintJobRequest {
  id: number;
  filament_price_per_kg_snapshot: number;
  filament_cost: number;
  energy_cost: number;
  depreciation_cost: number;
  labor_cost: number;
  subtotal: number;
  final_cost: number;
  suggested_price: number;
  marketplace_price: number;
  profit_pct: number | null;
}

export interface DreRow {
  month: string;
  filament_kg: number;
  print_time_hours: number;
  labor_hours: number;
  supplies_cost: number;
  packaging_cost: number;
  energy_cost: number;
  total_cost: number;
  sales: number;
  jobs: number;
  profit_pct: number | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ---- Settings ----
  getSettings(): Observable<Settings> { return this.http.get<Settings>(`${this.base}/settings`); }
  updateSettings(s: Settings) { return this.http.put<Settings>(`${this.base}/settings`, s); }

  // ---- Printers ----
  listPrinters(): Observable<Printer[]> { return this.http.get<Printer[]>(`${this.base}/printers`); }
  createPrinter(p: Printer) { return this.http.post<Printer>(`${this.base}/printers`, p); }
  updatePrinter(id: number, p: Printer) { return this.http.put<Printer>(`${this.base}/printers/${id}`, p); }
  deletePrinter(id: number) { return this.http.delete(`${this.base}/printers/${id}`); }

  // ---- Filament catalogue (legacy — still available, no longer in UI) ----
  listFilaments(): Observable<Filament[]> { return this.http.get<Filament[]>(`${this.base}/filaments`); }
  createFilament(f: Filament) { return this.http.post<Filament>(`${this.base}/filaments`, f); }
  updateFilament(id: number, f: Filament) { return this.http.put<Filament>(`${this.base}/filaments/${id}`, f); }
  deleteFilament(id: number) { return this.http.delete(`${this.base}/filaments/${id}`); }

  // ---- Filament inventory (each spool) ----
  listSpools(): Observable<FilamentSpool[]> { return this.http.get<FilamentSpool[]>(`${this.base}/filament-inventory`); }
  createSpool(s: FilamentSpool) { return this.http.post<FilamentSpool>(`${this.base}/filament-inventory`, s); }
  updateSpool(id: number, s: FilamentSpool) { return this.http.put<FilamentSpool>(`${this.base}/filament-inventory/${id}`, s); }
  adjustSpool(id: number, delta_grams: number) {
    return this.http.post<FilamentSpool>(`${this.base}/filament-inventory/${id}/adjust`, { quantity_grams: delta_grams });
  }
  deleteSpool(id: number) { return this.http.delete(`${this.base}/filament-inventory/${id}`); }

  // ---- Stock items (Embalagens / Insumos) ----
  listStockItems(category: 'packaging' | 'supply'): Observable<StockItem[]> {
    const params = new HttpParams().set('category', category);
    return this.http.get<StockItem[]>(`${this.base}/stock-items`, { params });
  }
  createStockItem(s: StockItem) { return this.http.post<StockItem>(`${this.base}/stock-items`, s); }
  updateStockItem(id: number, s: StockItem) { return this.http.put<StockItem>(`${this.base}/stock-items/${id}`, s); }
  deleteStockItem(id: number) { return this.http.delete(`${this.base}/stock-items/${id}`); }

  // ---- Products ----
  listProducts(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/products`); }
  createProduct(p: any) { return this.http.post(`${this.base}/products`, p); }
  updateProduct(id: number, p: any) { return this.http.put(`${this.base}/products/${id}`, p); }
  deleteProduct(id: number) { return this.http.delete(`${this.base}/products/${id}`); }

  // ---- Quote / Orçamento ----
  quote(q: QuoteRequest): Observable<QuoteResult> { return this.http.post<QuoteResult>(`${this.base}/quote`, q); }

  // ---- Print jobs ----
  listJobs(): Observable<PrintJob[]> { return this.http.get<PrintJob[]>(`${this.base}/print-jobs`); }
  createJob(j: PrintJobRequest) { return this.http.post<PrintJob>(`${this.base}/print-jobs`, j); }
  updateJob(id: number, j: PrintJobRequest) { return this.http.put<PrintJob>(`${this.base}/print-jobs/${id}`, j); }
  deleteJob(id: number) { return this.http.delete(`${this.base}/print-jobs/${id}`); }

  // ---- DRE ----
  dre(): Observable<DreRow[]> { return this.http.get<DreRow[]>(`${this.base}/dre`); }
}
