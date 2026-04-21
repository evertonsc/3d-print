/* import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
} */

/* import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
	<h1>3D Print</h1>

	<input [(ngModel)]="name" placeholder="Product name" />
	<button (click)="create()">Create</button>

	<ul>
	  <li *ngFor="let p of products">{{ p.name }}</li>
	</ul>
  `
})
export class AppComponent {
	name = '';
	products: any[] = [];

	constructor(private http: HttpClient) {
		this.load();
	}

	load() {
		this.http.get<any[]>('http://localhost:8000/products')
			.subscribe(data => this.products = data);
	}

	create() {
		this.http.post('http://localhost:8000/products?name=' + this.name, {})
			.subscribe(() => this.load());
	}
} */

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
    <div class="container">

      <h1>3D Print</h1>

      <!-- CREATE PRODUCT -->
      <div class="card">
        <h2>Create Product</h2>

        <input [(ngModel)]="name" placeholder="Name" />
        <input [(ngModel)]="material_grams" placeholder="Material (grams)" />
        <input [(ngModel)]="print_time_hours" placeholder="Print time (hours)" />
        <input [(ngModel)]="material_cost_per_gram" placeholder="Cost per gram" />

        <button (click)="createProduct()">Create</button>
      </div>

      <!-- PRODUCTS -->
      <div class="card">
        <h2>Products</h2>
        <ul>
          <li *ngFor="let p of products">
            {{ p.id }} - {{ p.name }}
          </li>
        </ul>
      </div>

      <!-- PRODUCTION -->
      <div class="card">
        <h2>Production</h2>

        <input [(ngModel)]="productionProductId" placeholder="Product ID" />
        <input [(ngModel)]="quantity" placeholder="Quantity" />

        <button (click)="produce()">Run Production</button>
      </div>

      <!-- PRODUCTIONS -->
      <div class="card">
        <h2>Productions</h2>
        <ul>
          <li *ngFor="let pr of productions">
            Product {{ pr.product_id }} |
            Qty: {{ pr.quantity }} |
            Unit: {{ pr.unit_cost.toFixed(2) }} |
            Total: {{ pr.total_cost.toFixed(2) }}
          </li>
        </ul>
      </div>

      <!-- STOCK -->
      <div class="card">
        <h2>Stock Entry</h2>

        <input [(ngModel)]="stockName" placeholder="Material name" />
        <input [(ngModel)]="stockQty" placeholder="Quantity" />

        <button (click)="addStock()">Add Stock</button>
      </div>

      <div class="card">
        <h2>Inventory</h2>
        <ul>
          <li *ngFor="let i of inventory">
            {{ i.name }} - {{ i.quantity }}
          </li>
        </ul>
      </div>

    </div>
  `,
	styles: [`
    .container {
      max-width: 900px;
      margin: auto;
      font-family: Arial;
    }

    h1 {
      text-align: center;
    }

    .card {
      background: #f9f9f9;
      padding: 20px;
      margin: 20px 0;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }

    input {
      display: block;
      margin: 8px 0;
      padding: 10px;
      width: 100%;
      border-radius: 6px;
      border: 1px solid #ccc;
    }

    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
    }

    button:hover {
      background: #0056b3;
    }
  `]
})
export class AppComponent {

	name = '';
	material_grams: any;
	print_time_hours: any;
	material_cost_per_gram: any;

	products: any[] = [];

	productionProductId: any;
	quantity: any;
	productions: any[] = [];

	stockName = '';
	stockQty: any;
	inventory: any[] = [];

	constructor(private http: HttpClient) {
		this.loadProducts();
		this.loadProductions();
		this.loadInventory();
	}

	createProduct() {
		this.http.post(
			`http://localhost:8000/products?name=${this.name}&material_grams=${this.material_grams}&print_time_hours=${this.print_time_hours}&material_cost_per_gram=${this.material_cost_per_gram}`,
			{}
		).subscribe(() => this.loadProducts());
	}

	loadProducts() {
		this.http.get<any[]>('http://localhost:8000/products')
			.subscribe(data => this.products = data);
	}

	produce() {
		this.http.post(
			`http://localhost:8000/produce?product_id=${this.productionProductId}&quantity=${this.quantity}`,
			{}
		).subscribe(() => {
			this.loadProductions();
			this.loadInventory();
		});
	}

	loadProductions() {
		this.http.get<any[]>('http://localhost:8000/productions')
			.subscribe(data => this.productions = data);
	}

	addStock() {
		this.http.post(
			`http://localhost:8000/stock?name=${this.stockName}&quantity=${this.stockQty}`,
			{}
		).subscribe(() => this.loadInventory());
	}

	loadInventory() {
		this.http.get<any[]>('http://localhost:8000/stock')
			.subscribe(data => this.inventory = data);
	}
}