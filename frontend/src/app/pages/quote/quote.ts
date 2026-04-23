import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Filament, Printer, QuoteRequest, QuoteResult } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-quote',
  imports: [CommonModule, FormsModule],
  templateUrl: './quote.html',
  styleUrls: ['./quote.css'],
})
export class Quote implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  printers: Printer[] = [];
  filaments: Filament[] = [];

  form: QuoteRequest = {
    project_name: '', printer_id: 0, filament_id: 0, quantity: 1,
    filament_grams: 0, print_time_hours: 0, labor_hours: 0,
    supplies_cost: 0, packaging_cost: 0, override_price_per_kg: null,
  };

  result: QuoteResult | null = null;

  calculating = false;
  saving = false;

  ngOnInit() {
    this.api.listPrinters().subscribe(d => this.printers = d);
    this.api.listFilaments().subscribe(d => this.filaments = d);
  }

  calculate() {
    if (this.calculating) return;
    if (!this.form.printer_id || !this.form.filament_id || !this.form.filament_grams) {
      this.toast.error('Preencha impressora, filamento e gramas.');
      return;
    }
    this.calculating = true;
    this.api.quote(this.form).pipe(finalize(() => this.calculating = false)).subscribe({
      next: r => { this.result = r; this.toast.success('Orçamento calculado.'); },
      error: () => this.toast.error('Erro ao calcular orçamento.'),
    });
  }

  downloadPdf() {
    if (!this.result) return;
    const r = this.result;
    const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Orçamento — ${r.project_name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color:#0f172a; padding:32px; max-width:760px; margin:auto; }
  h1 { color:#16a34a; margin:0 0 4px; } small { color:#64748b; }
  table { width:100%; border-collapse:collapse; margin-top:18px; }
  th, td { padding:8px 10px; border-bottom:1px solid #e2e8f0; text-align:left; font-size:14px; }
  th { color:#64748b; font-weight:500; }
  .total td { font-weight:600; border-top:2px solid #0f172a; }
  .meta { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-top:14px; font-size:14px; }
  .meta b { color:#64748b; font-weight:500; margin-right:6px; }
  @media print { .noprint { display:none; } body { padding:12px; } }
</style></head><body>
  <h1>Orçamento — Tom Studio 3D</h1>
  <small>Gerado em ${new Date().toLocaleString('pt-BR')}</small>
  <div class="meta">
    <div><b>Projeto:</b> ${r.project_name}</div>
    <div><b>Quantidade:</b> ${r.quantity}</div>
    <div><b>Impressora:</b> ${r.printer}</div>
    <div><b>Filamento:</b> ${r.filament}</div>
    <div><b>Preço filamento:</b> R$ ${fmt(r.price_per_kg_used)}/kg</div>
  </div>
  <table>
    <thead><tr><th>Componente</th><th style="text-align:right">Por unidade</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      <tr><td>Filamento</td>     <td align="right">R$ ${fmt(r.per_unit.filament_cost)}</td>     <td align="right">R$ ${fmt(r.filament_cost)}</td></tr>
      <tr><td>Energia</td>       <td align="right">R$ ${fmt(r.per_unit.energy_cost)}</td>       <td align="right">R$ ${fmt(r.energy_cost)}</td></tr>
      <tr><td>Depreciação</td>   <td align="right">R$ ${fmt(r.per_unit.depreciation_cost)}</td> <td align="right">R$ ${fmt(r.depreciation_cost)}</td></tr>
      <tr><td>Trabalho</td>      <td align="right">R$ ${fmt(r.per_unit.labor_cost)}</td>        <td align="right">R$ ${fmt(r.labor_cost)}</td></tr>
      <tr><td>Insumos</td>       <td align="right">—</td>                                       <td align="right">R$ ${fmt(r.supplies_cost)}</td></tr>
      <tr><td>Embalagem</td>     <td align="right">—</td>                                       <td align="right">R$ ${fmt(r.packaging_cost)}</td></tr>
      <tr class="total"><td>Subtotal</td>           <td align="right">R$ ${fmt(r.per_unit.subtotal)}</td>          <td align="right">R$ ${fmt(r.subtotal)}</td></tr>
      <tr class="total"><td>Custo final (com falha)</td><td align="right">R$ ${fmt(r.per_unit.final_cost)}</td>   <td align="right">R$ ${fmt(r.final_cost)}</td></tr>
    </tbody>
  </table>
  <button class="noprint" onclick="window.print()" style="margin-top:20px;padding:10px 16px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;">
    Imprimir / Salvar como PDF
  </button>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { this.toast.error('Pop-up bloqueado pelo navegador.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  saveAsJob() {
    if (!this.result || this.saving) return;
    this.saving = true;
    this.api.listSpools().subscribe(spools => {
      const match = spools.find(s => s.filament_id === this.form.filament_id);
      if (!match || !match.id) {
        this.saving = false;
        this.toast.error('Nenhum carretel deste filamento em estoque. Cadastre em "Filamentos".');
        return;
      }
      this.api.createJob({
        project_name: this.form.project_name,
        printer_id: this.form.printer_id,
        filament_inventory_id: match.id,
        quantity: this.form.quantity,
        filament_grams: this.form.filament_grams,
        print_time_hours: this.form.print_time_hours,
        labor_hours: this.form.labor_hours,
        supplies_cost: this.form.supplies_cost,
        packaging_cost: this.form.packaging_cost,
        sold_value: 0,
      }).pipe(finalize(() => this.saving = false)).subscribe({
        next: () => this.toast.success('Orçamento salvo como produção e estoque deduzido.'),
        error: (e) => this.toast.error(e?.error?.detail || 'Falha ao salvar produção.'),
      });
    });
  }
}
