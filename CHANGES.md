# 3D-print — changes summary

Update of the `evertonsc/3d-print` repo so the application matches the
spreadsheet (`sample_data.xlsx`, sheets *Produtos*, *Filamentos*,
*Impressoras*, *Outros*, *Embalagem*, *DRE*) and the requirements written
on the three handwritten notes.

---

## What the spreadsheet does (recap)

Per row of the *Produtos* sheet:

| Col | Formula | Meaning |
| --- | --- | --- |
| J | `grams/1000 × VLOOKUP(filament, R$/kg)` | Filament cost |
| K | `hours × printer.kWh/h × Outros!energy` | Energy cost |
| L | `hours × printer.depreciation_per_hour` | Depreciation |
| M | `labor_hours × Outros!labor_rate` | Labor |
| N | `SUM(J:M)` | Subtotal |
| O | `N × (1 + Outros!failure%/100)` | Final cost |
| P | `O × markup (Q5 = 1.5)` | Suggested price |
| Q | `P / (1 − marketplace − tax) + fixed_fee` | Marketplace price |
| U | `(sold − O) / O` | Profit % |

`DRE` aggregates the `Produtos` sheet by month.

---

## Handwritten requirements addressed

| # | Note (PT) | Where it now lives |
| --- | --- | --- |
| 1 | *"Calcular vendas/estoque. Subtrair quantidade de itens usados na venda do número existente no estoque."* | `POST /print-jobs` deducts `filament_grams × quantity` from the chosen spool. Deleting a job refunds it. |
| 2 | *"Mesma coisa, porém calcular quantidades em gramas — o estoque existente da cor utilizada."* | `FilamentInventory` stores `quantity_grams`; deduction is in grams. |
| 3 | *"Quantidade por mesa: cálculo conforme a quantidade do produto na mesma mesa."* (ex.: imprimir 1 = 0,28; 50 = …; 131 = 1,17) | `POST /quote` and `POST /print-jobs` both multiply the per-unit cost by `quantity` and also return per-unit values. |
| 4 | *"Ao comprar filamento mais barato, não pode alterar o preço dos itens já feitos."* | Each `PrintJob` snapshots `filament_price_per_kg_snapshot`, `filament_cost`, etc. Changing the catalogue or buying a new spool does NOT rewrite past jobs. |
| 5 | *"Com base na quantidade que vai imprimir, atualizar custos para a impressão da mesa."* | The Quote page recalculates everything live when the user changes quantity / grams. |
| 6 | *"Formulário com medidas/valores que ao enviar faz o cálculo da quantidade impressa."* | New page **Orçamento** (`/quote`). |
| 7 | *"Conto com base na quantidade. Adicionar nesse form o valor do material comprado (caso o mesmo filamento tenha sido comprado mais caro)."* | Quote form has an **override price (R$/kg)** field; spool form has a `purchase_price` field. |
| 8 | *"Filamentos existentes — qtde / cor / marca / tipo / fabricante / fonte (Tiktok, Eder 14/02 ...)"* | `FilamentInventory` columns: `color`, `brand`, `type`, `source`, `purchase_date`, `purchase_price`, `quantity_grams`. Inventory page shows them all. |
| 9 | *"Botão Baixar Orçamento (Gerar PDF) — impressao3d.netlify.app"* | Quote page has a **⬇ Baixar Orçamento (PDF)** button that opens a print-ready document and triggers `window.print()`, letting the browser save as PDF. |

---

## Backend changes (`backend/`)

* **`models.py`** — replaced. New tables that mirror the spreadsheet:
  * `Printer` (`Impressoras`) with computed `depreciation_per_hour`.
  * `Filament` catalogue (`Filamentos`) with computed `price_per_kg`.
  * `FilamentInventory` — one row per physical spool (color, brand, type,
    source, purchase date/price, remaining grams).
  * `Settings` (`Outros`) — energy, labor, failure %, markup,
    marketplace fee, tax, fixed fee, currency.
  * `Product` — re-cast as a recipe (printer + filament + grams + hours).
  * `PrintJob` — sale/job rows. Snapshots all costs so future price
    changes don't rewrite history (req. #4).

* **`calculations.py` (NEW)** — pure cost engine. Same formulas as the
  spreadsheet (J/K/L/M/N/O/P/Q/U).

* **`schemas.py` (NEW)** — Pydantic input models, so endpoints accept
  JSON bodies instead of query strings.

* **`main.py`** — fully rewritten. New endpoints:

  | Method | Path | Purpose |
  | --- | --- | --- |
  | `GET / PUT` | `/settings` | Read/update sheet *Outros* |
  | `GET / POST / PUT / DELETE` | `/printers[...]` | Manage printers |
  | `GET / POST / PUT / DELETE` | `/filaments[...]` | Manage filament catalogue |
  | `GET / POST / PUT / DELETE` | `/filament-inventory[...]` | Manage spools |
  | `POST` | `/filament-inventory/{id}/adjust` | Add/remove grams |
  | `POST` | `/quote` | Run the full cost calc (no DB write) |
  | `GET / POST / DELETE` | `/print-jobs[...]` | Sales/production rows; deducts spool grams; snapshots prices |
  | `GET` | `/dre` | Monthly aggregation (sheet *DRE*) |
  | `GET` | `/stock` | Backwards-compatible alias for `/filament-inventory` |

  Seeds the catalogue with the printers and filaments from the
  spreadsheet on first start.

* **`database.py`** — now reads `DATABASE_URL` from env, so SQLite can be
  used as fallback if Postgres isn't running.

* **`requirements.txt` (NEW)** — pinned dependencies.

---

## Frontend changes (`frontend/src/app/`)

* **`services/api.service.ts`** — typed API client covering every new
  endpoint (`Printer`, `Filament`, `FilamentSpool`, `Settings`, `QuoteRequest`,
  `QuoteResult`, `PrintJob`, `DreRow`).

* **`app.config.ts` / `app.routes.ts`** — added `provideRouter` and the
  new routes `/quote` and `/settings`.

* **`pages/layout/layout.html`** — new sidebar items (Orçamento,
  Configurações), Inventory renamed to "Filamentos", labels in PT.

* **`pages/quote/` (NEW)** — Orçamento form:
  * pick printer, filament, qty, grams, hours, labor, insumos,
    embalagem;
  * optional **R$/kg override** for newly bought spools (req. #7);
  * shows full breakdown (per unit + total): filament, energy,
    depreciation, labor, subtotal, final, suggested, marketplace;
  * **⬇ Baixar Orçamento (PDF)** opens a print-ready window and triggers
    `window.print()` (req. #9);
  * "Salvar como Produção" persists the calculation as a `PrintJob`.

* **`pages/settings/` (NEW)** — edit sheet *Outros* (energy, labor,
  failure %, markup, marketplace fee, tax, fixed fee), manage printers,
  manage filament catalogue.

* **`pages/inventory/`** — rewritten. Now lists physical spools with
  every column from the handwritten note (color, brand, type, source,
  purchase date, purchase price, grams). Supports add / delete / adjust
  grams (`±g`). Low-stock alert below 200 g.

* **`pages/production/`** — rewritten. Real cost calculation with
  spool selection, quantity multiplier (req. #3, #5), and full price
  breakdown per row. Deletion refunds the stock.

* **`pages/dashboard/`** — KPIs now from real jobs; a DRE table mirrors
  the *DRE* sheet (filament kg, hours, supplies, energy, total cost,
  sales, profit % per month).

---

## Running it

Backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Either start Docker Postgres:
docker-compose up -d
# ...or fall back to SQLite for a quick try:
DATABASE_URL=sqlite:///./3dprint.db uvicorn main:app --reload
```

Swagger: http://localhost:8000/docs

Frontend:

```bash
cd frontend
npm install
ng serve
```

Open http://localhost:4200.

---

## v2 — Fixes (April 2026)

Three issues reported by the user have been addressed.

### 1. Single-click feedback on every action button
Every action button (Salvar, Calcular, Cadastrar, +Adicionar Carretel,
Registrar Produção, 🗑 Excluir, ✓ Ajustar, etc.) now toggles a
component-level `busy` / `removing` / `adjusting` flag the moment the
user clicks. While the request is in flight the button is `[disabled]`
and shows an interim label ("Salvando…", "Calculando…", "…"). This
gives instant visual feedback on the **first** click and also prevents
duplicate submissions.

Implemented across:
- `pages/production/production.{ts,html}`
- `pages/inventory/inventory.{ts,html}`
- `pages/settings/settings.{ts,html}`
- `pages/products/products.{ts,html}`
- `pages/quote/quote.{ts,html}`

### 2. Toasts now auto-dismiss after 6 s
Each page used to keep a local `message` string visible until the user
manually clicked `✕`. That logic has been replaced by a global
`ToastService` (`src/app/services/toast.service.ts`):

- A single signal-backed `current` toast is rendered by the root
  `AppComponent` in a fixed bottom-right container.
- Calling `toast.success(...)` / `toast.error(...)` schedules an
  automatic dismissal after **6000 ms** (`AUTO_DISMISS_MS`).
- The user may still close it early with the `✕` button.

### 3. Data persistence across application restarts
The previous default `DATABASE_URL` pointed at a Postgres container
that only existed while `docker compose up` was running, so a refresh
or restart wiped the database.

`backend/database.py` now defaults to a **local SQLite file** stored
right next to the backend code (`backend/3d_print.db`):

```
DATABASE_URL = sqlite:///<path-to-backend>/3d_print.db   (default)
```

The file is created automatically on first launch by
`models.Base.metadata.create_all(...)` in `main.py`. Every printer,
filament, spool, settings change and print job is written to that
file and is therefore visible the next time you run the application
locally — no Docker required.

If you still want Postgres (e.g., for production), simply set the
`DATABASE_URL` environment variable before launching `uvicorn`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/3d_print" \
    uvicorn main:app --reload
```

The `.gitignore` should keep `backend/3d_print.db` out of version
control if you don't want to commit your data.
