import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ---- Products ----
  listProducts() { return this.http.get<any[]>(`${this.base}/products`); }
  createProduct(p: { name: string; material_grams: number; print_time_hours: number; material_cost_per_gram: number; }) {
    const params = new HttpParams({ fromObject: p as any });
    return this.http.post(`${this.base}/products`, {}, { params });
  }

  // ---- Production ----
  listProductions() { return this.http.get<any[]>(`${this.base}/productions`); }
  produce(product_id: number, quantity: number) {
    const params = new HttpParams({ fromObject: { product_id, quantity } as any });
    return this.http.post(`${this.base}/produce`, {}, { params });
  }

  // ---- Inventory ----
  listStock() { return this.http.get<any[]>(`${this.base}/stock`); }
  addStock(name: string, quantity: number) {
    const params = new HttpParams({ fromObject: { name, quantity } as any });
    return this.http.post(`${this.base}/stock`, {}, { params });
  }
}
