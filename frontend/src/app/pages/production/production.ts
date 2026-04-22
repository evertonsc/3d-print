import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-production',
  imports: [CommonModule, FormsModule],
  templateUrl: './production.html',
  styleUrls: ['./production.css']
})
export class Production {

  product_id: any;
  quantity: any;

  productions: any[] = [];

  message = '';
  success = true;

  constructor(private http: HttpClient) {
    this.load();
  }

  produce() {
    this.http.post(
      `http://localhost:8000/produce?product_id=${this.product_id}&quantity=${this.quantity}`,
      {}
    ).subscribe({
      next: () => {
        this.success = true;
        this.message = 'Produção realizada com sucesso';
        this.clear();
        this.load();
      },
      error: () => {
        this.success = false;
        this.message = 'Erro na produção (estoque insuficiente?)';
      }
    });
  }

  load() {
    this.http.get<any[]>('http://localhost:8000/productions')
      .subscribe(data => this.productions = data);
  }

  clear() {
    this.product_id = '';
    this.quantity = '';
  }
}