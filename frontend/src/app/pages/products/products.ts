import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-products',
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrls: ['./products.css']
})
export class Products {

  name = '';
  material_grams: any;
  print_time_hours: any;
  material_cost_per_gram: any;

  message = '';
  success = true;

  constructor(private http: HttpClient) {}

  create() {
    this.http.post(
      `http://localhost:8000/products?name=${this.name}&material_grams=${this.material_grams}&print_time_hours=${this.print_time_hours}&material_cost_per_gram=${this.material_cost_per_gram}`,
      {}
    ).subscribe({
      next: () => {
        this.success = true;
        this.message = 'Product created successfully';
        this.clear();
      },
      error: () => {
        this.success = false;
        this.message = 'Error creating product';
      }
    });
  }

  clear() {
    this.name = '';
    this.material_grams = '';
    this.print_time_hours = '';
    this.material_cost_per_gram = '';
  }
}