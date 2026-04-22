import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-inventory',
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css']
})
export class Inventory {

  name = '';
  quantity: any;

  inventory: any[] = [];
  lowStock: any[] = [];

  message = '';
  success = true;

  constructor(private http: HttpClient) {
    this.load();
  }

  add() {
    this.http.post(
      `http://localhost:8000/stock?name=${this.name}&quantity=${this.quantity}`,
      {}
    ).subscribe({
      next: () => {
        this.success = true;
        this.message = 'Estoque atualizado';
        this.clear();
        this.load();
      },
      error: () => {
        this.success = false;
        this.message = 'Erro ao atualizar estoque';
      }
    });
  }

  load() {
    this.http.get<any[]>('http://localhost:8000/stock')
      .subscribe(data => {
        this.inventory = data;
        this.checkLowStock();
      });
  }

  checkLowStock() {
    this.lowStock = this.inventory.filter(i => i.quantity < 200);
  }

  clear() {
    this.name = '';
    this.quantity = '';
  }
}