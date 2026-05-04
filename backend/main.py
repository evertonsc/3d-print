"""
3D-print management backend.

Mirrors the spreadsheet ("Produtos", "Filamentos", "Impressoras",
"Outros", "DRE") and adds the requirements from the handwritten notes:
  * Stock deduction in grams when a print job is recorded.
  * Cost computation that honors the printed quantity (per-table qty).
  * Snapshotted filament price so previous jobs are NOT re-priced when
    a cheaper / more expensive spool is bought afterwards.
  * Quote endpoint with optional override for newly-purchased filament.
  * DRE endpoint with monthly aggregates.
"""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

import models
import schemas
from calculations import compute
from database import SessionLocal, engine


models.Base.metadata.create_all(bind=engine)


def seed_defaults(db: Session) -> None:
    """Seed the catalogue values that come from the spreadsheet."""
    if not db.query(models.Settings).first():
        db.add(models.Settings(
            energy_cost_per_kwh=0.86,
            labor_cost_per_hour=10.0,
            failure_rate=10.0,
            currency="R$",
            marketplace_fee=0.20,
            tax=0.0,
            fixed_fee=4.0,
            markup=1.5,
        ))

    if not db.query(models.Printer).first():
        db.add_all([
            models.Printer(name="A1 Combo", manufacturer="Bambu Lab",
                           price=4775.79, depreciation_hours=10000,
                           maintenance_cost=1000, avg_power_kwh=0.15),
            models.Printer(name="H2D", manufacturer="Bambu Lab",
                           price=22000, depreciation_hours=25000,
                           maintenance_cost=3000, avg_power_kwh=0.30),
        ])

    if not db.query(models.Filament).first():
        db.add_all([
            models.Filament(name="National3D PLA High Speed", manufacturer="National3D",
                            type="PLA", spool_price=100, spool_weight_kg=1, density=1.24),
            models.Filament(name="Masterprint PETG Basic", manufacturer="Masterprint",
                            type="PETG", spool_price=61.9, spool_weight_kg=1, density=1.27),
            models.Filament(name="Bambu Lite", manufacturer="Bambu Lab",
                            type="PLA", spool_price=75, spool_weight_kg=1, density=1.24),
        ])

    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_defaults(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Tom Studio 3D — Backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# Health
# ============================================================
@app.get("/")
def root():
    return {"status": "Backend running"}


# ============================================================
# Settings  (sheet "Outros")
# ============================================================
@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    return db.query(models.Settings).first()


@app.put("/settings")
def update_settings(payload: schemas.SettingsIn, db: Session = Depends(get_db)):
    s = db.query(models.Settings).first()
    if not s:
        s = models.Settings()
        db.add(s)
    for k, v in payload.dict().items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


# ============================================================
# Printers  (sheet "Impressoras")
# ============================================================
def _printer_dict(p: models.Printer) -> dict:
    return {
        "id": p.id, "name": p.name, "manufacturer": p.manufacturer,
        "price": p.price, "depreciation_hours": p.depreciation_hours,
        "maintenance_cost": p.maintenance_cost, "avg_power_kwh": p.avg_power_kwh,
        "depreciation_per_hour": round(p.depreciation_per_hour, 4),
    }


@app.get("/printers")
def list_printers(db: Session = Depends(get_db)):
    return [_printer_dict(p) for p in db.query(models.Printer).all()]


@app.post("/printers")
def create_printer(payload: schemas.PrinterIn, db: Session = Depends(get_db)):
    p = models.Printer(**payload.dict())
    db.add(p); db.commit(); db.refresh(p)
    return _printer_dict(p)


@app.put("/printers/{printer_id}")
def update_printer(printer_id: int, payload: schemas.PrinterIn, db: Session = Depends(get_db)):
    p = db.get(models.Printer, printer_id)
    if not p: raise HTTPException(404, "Printer not found")
    for k, v in payload.dict().items(): setattr(p, k, v)
    db.commit(); db.refresh(p)
    return _printer_dict(p)


@app.delete("/printers/{printer_id}")
def delete_printer(printer_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Printer, printer_id)
    if not p: raise HTTPException(404, "Printer not found")
    db.delete(p); db.commit()
    return {"ok": True}


# ============================================================
# Filaments catalogue  (sheet "Filamentos")
# ============================================================
def _filament_dict(f: models.Filament) -> dict:
    return {
        "id": f.id, "name": f.name, "manufacturer": f.manufacturer, "type": f.type,
        "diameter_mm": f.diameter_mm, "spool_price": f.spool_price,
        "spool_weight_kg": f.spool_weight_kg, "density": f.density,
        "price_per_kg": round(f.price_per_kg, 4),
    }


@app.get("/filaments")
def list_filaments(db: Session = Depends(get_db)):
    return [_filament_dict(f) for f in db.query(models.Filament).all()]


@app.post("/filaments")
def create_filament(payload: schemas.FilamentIn, db: Session = Depends(get_db)):
    f = models.Filament(**payload.dict())
    db.add(f); db.commit(); db.refresh(f)
    return _filament_dict(f)


@app.put("/filaments/{fid}")
def update_filament(fid: int, payload: schemas.FilamentIn, db: Session = Depends(get_db)):
    f = db.get(models.Filament, fid)
    if not f: raise HTTPException(404, "Filament not found")
    for k, v in payload.dict().items(): setattr(f, k, v)
    db.commit(); db.refresh(f)
    return _filament_dict(f)


@app.delete("/filaments/{fid}")
def delete_filament(fid: int, db: Session = Depends(get_db)):
    f = db.get(models.Filament, fid)
    if not f: raise HTTPException(404, "Filament not found")
    db.delete(f); db.commit()
    return {"ok": True}


# ============================================================
# Filament inventory — each physical spool
# (handwritten note image #2: "Filamentos existentes" — qty / color / brand /
#  type / source / purchase date)
# ============================================================
def _inv_dict(i: models.FilamentInventory) -> dict:
    return {
        "id": i.id, "filament_id": i.filament_id,
        "color": i.color, "brand": i.brand, "type": i.type, "source": i.source,
        "purchase_date": i.purchase_date.isoformat() if i.purchase_date else None,
        "purchase_price": i.purchase_price,
        "quantity_grams": i.quantity_grams,
        "manufacturer": i.manufacturer,
        "diameter_mm": i.diameter_mm,
        "density": i.density,
        "nozzle_temp": i.nozzle_temp,
        "bed_temp": i.bed_temp,
    }


def _stock_dict(s: models.StockItem) -> dict:
    return {
        "id": s.id,
        "category": s.category,
        "description": s.description,
        "valor": s.valor,
        "purchased_qty": s.purchased_qty,
        "available_qty": s.available_qty,
        "unit_price": round(s.unit_price, 4),
    }


@app.get("/filament-inventory")
def list_inventory(db: Session = Depends(get_db)):
    return [_inv_dict(i) for i in db.query(models.FilamentInventory).all()]


@app.post("/filament-inventory")
def add_inventory(payload: schemas.FilamentInventoryIn, db: Session = Depends(get_db)):
    data = payload.dict()
    if data.get("purchase_date") is None:
        data["purchase_date"] = datetime.utcnow()
    i = models.FilamentInventory(**data)
    db.add(i); db.commit(); db.refresh(i)
    return _inv_dict(i)


@app.put("/filament-inventory/{iid}")
def update_inventory(iid: int, payload: schemas.FilamentInventoryIn, db: Session = Depends(get_db)):
    i = db.get(models.FilamentInventory, iid)
    if not i: raise HTTPException(404, "Spool not found")
    data = payload.dict()
    if data.get("purchase_date") is None:
        data["purchase_date"] = i.purchase_date
    for k, v in data.items(): setattr(i, k, v)
    db.commit(); db.refresh(i)
    return _inv_dict(i)


@app.post("/filament-inventory/{iid}/adjust")
def adjust_inventory(iid: int, payload: schemas.FilamentInventoryAdjust, db: Session = Depends(get_db)):
    """Add or remove grams from a spool (positive/negative delta)."""
    i = db.get(models.FilamentInventory, iid)
    if not i: raise HTTPException(404, "Spool not found")
    i.quantity_grams = (i.quantity_grams or 0) + payload.quantity_grams
    if i.quantity_grams < 0: i.quantity_grams = 0
    db.commit(); db.refresh(i)
    return _inv_dict(i)


@app.delete("/filament-inventory/{iid}")
def delete_inventory(iid: int, db: Session = Depends(get_db)):
    i = db.get(models.FilamentInventory, iid)
    if not i: raise HTTPException(404, "Spool not found")
    db.delete(i); db.commit()
    return {"ok": True}


# ============================================================
# Products (catalogued recipes — what you can print)
# ============================================================
@app.get("/products")
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@app.post("/products")
def create_product(payload: schemas.ProductIn, db: Session = Depends(get_db)):
    p = models.Product(**payload.dict())
    db.add(p); db.commit(); db.refresh(p)
    return p


@app.put("/products/{pid}")
def update_product(pid: int, payload: schemas.ProductIn, db: Session = Depends(get_db)):
    p = db.get(models.Product, pid)
    if not p: raise HTTPException(404, "Product not found")
    for k, v in payload.dict().items(): setattr(p, k, v)
    db.commit(); db.refresh(p)
    return p


@app.delete("/products/{pid}")
def delete_product(pid: int, db: Session = Depends(get_db)):
    p = db.get(models.Product, pid)
    if not p: raise HTTPException(404, "Product not found")
    db.delete(p); db.commit()
    return {"ok": True}


# ============================================================
# Quote / Orçamento — same calculation as a print job, but does
# NOT touch stock, and supports an override price (handwritten
# note #4 / #7: when buying a different-priced filament, this lets
# the user see what the new price would be without altering past
# jobs).
# ============================================================
@app.post("/quote")
def quote(payload: schemas.QuoteIn, db: Session = Depends(get_db)):
    settings = db.query(models.Settings).first()
    printer = db.get(models.Printer, payload.printer_id)
    filament = db.get(models.Filament, payload.filament_id)
    if not settings: raise HTTPException(500, "Settings not configured")
    if not printer:  raise HTTPException(404, "Printer not found")
    if not filament: raise HTTPException(404, "Filament not found")

    price_per_kg = (
        payload.override_price_per_kg
        if payload.override_price_per_kg is not None
        else filament.price_per_kg
    )

    qty = max(1, payload.quantity)
    breakdown = compute(
        grams=payload.filament_grams * qty,
        print_time_hours=payload.print_time_hours * qty,
        labor_hours=payload.labor_hours * qty,
        supplies_cost=payload.supplies_cost * qty,
        packaging_cost=payload.packaging_cost * qty,
        filament_price_per_kg=price_per_kg,
        printer_avg_power_kwh=printer.avg_power_kwh,
        printer_depreciation_per_hour=printer.depreciation_per_hour,
        settings=settings,
        quantity=qty,
    )
    return {
        "project_name": payload.project_name,
        "quantity": qty,
        "printer": printer.name,
        "filament": filament.name,
        "price_per_kg_used": price_per_kg,
        **breakdown.dict(),
        "per_unit": {
            "filament_cost":     round(breakdown.filament_cost / qty, 4),
            "energy_cost":       round(breakdown.energy_cost / qty, 4),
            "depreciation_cost": round(breakdown.depreciation_cost / qty, 4),
            "labor_cost":        round(breakdown.labor_cost / qty, 4),
            "subtotal":          round(breakdown.subtotal / qty, 4),
            "final_cost":        round(breakdown.final_cost / qty, 4),
            "suggested_price":   round(breakdown.suggested_price / qty, 2),
            "marketplace_price": round(breakdown.marketplace_price / qty, 2),
        }
    }


# ============================================================
# Print jobs / Production
# Records a sale-like row from sheet "Produtos":
#   * deducts grams from the chosen spool (handwritten note #1, #2)
#   * snapshots filament price (note #4)
# ============================================================
def _job_dict(j: models.PrintJob) -> dict:
    return {
        "id": j.id, "date": j.date.isoformat() if j.date else None,
        "project_name": j.project_name,
        "printer_id": j.printer_id, "filament_inventory_id": j.filament_inventory_id,
        "quantity": j.quantity, "filament_grams": j.filament_grams,
        "print_time_hours": j.print_time_hours, "labor_hours": j.labor_hours,
        "supplies_cost": j.supplies_cost, "packaging_cost": j.packaging_cost,
        "filament_price_per_kg_snapshot": j.filament_price_per_kg_snapshot,
        "filament_cost": j.filament_cost, "energy_cost": j.energy_cost,
        "depreciation_cost": j.depreciation_cost, "labor_cost": j.labor_cost,
        "subtotal": j.subtotal, "final_cost": j.final_cost,
        "suggested_price": j.suggested_price, "marketplace_price": j.marketplace_price,
        "sold_value": j.sold_value,
        "profit_pct": (
            round((j.sold_value - j.final_cost) / j.final_cost, 4)
            if j.sold_value and j.final_cost else None
        ),
    }


@app.get("/print-jobs")
def list_jobs(db: Session = Depends(get_db)):
    return [_job_dict(j) for j in db.query(models.PrintJob).order_by(models.PrintJob.date.desc()).all()]


@app.post("/print-jobs")
def create_job(payload: schemas.PrintJobIn, db: Session = Depends(get_db)):
    settings = db.query(models.Settings).first()
    printer = db.get(models.Printer, payload.printer_id)
    spool = db.get(models.FilamentInventory, payload.filament_inventory_id)
    if not settings: raise HTTPException(500, "Settings not configured")
    if not printer:  raise HTTPException(404, "Printer not found")
    if not spool:    raise HTTPException(404, "Filament spool not found")

    qty = max(1, payload.quantity)
    needed_grams = (payload.filament_grams or 0) * qty

    if (spool.quantity_grams or 0) < needed_grams:
        raise HTTPException(
            400,
            f"Not enough filament in spool '{spool.color or spool.id}'. "
            f"Needed: {needed_grams}g, available: {spool.quantity_grams}g",
        )

    # Determine the filament unit price for this spool. Prefer the spool's
    # own purchase price if it knows what was paid; otherwise fall back to
    # the catalogue.
    if spool.purchase_price and spool.quantity_grams:
        # The purchase_price is what was paid for the WHOLE spool when bought.
        # We assume the bought weight equals the initial grams. As a simple
        # proxy we use the catalogue spool weight if available.
        catalogue = db.get(models.Filament, spool.filament_id) if spool.filament_id else None
        spool_kg = (catalogue.spool_weight_kg if catalogue else 1.0) or 1.0
        price_per_kg = spool.purchase_price / spool_kg
    else:
        catalogue = db.get(models.Filament, spool.filament_id) if spool.filament_id else None
        price_per_kg = catalogue.price_per_kg if catalogue else 0.0

    breakdown = compute(
        grams=needed_grams,
        print_time_hours=(payload.print_time_hours or 0) * qty,
        labor_hours=(payload.labor_hours or 0) * qty,
        supplies_cost=(payload.supplies_cost or 0) * qty,
        packaging_cost=(payload.packaging_cost or 0) * qty,
        filament_price_per_kg=price_per_kg,
        printer_avg_power_kwh=printer.avg_power_kwh,
        printer_depreciation_per_hour=printer.depreciation_per_hour,
        settings=settings,
        sold_value=payload.sold_value,
        quantity=qty,
    )

    # Deduct stock (note #1, #2).
    spool.quantity_grams = (spool.quantity_grams or 0) - needed_grams

    job = models.PrintJob(
        date=payload.date or datetime.utcnow(),
        project_name=payload.project_name,
        printer_id=payload.printer_id,
        filament_inventory_id=payload.filament_inventory_id,
        quantity=qty,
        filament_grams=needed_grams,
        print_time_hours=(payload.print_time_hours or 0) * qty,
        labor_hours=(payload.labor_hours or 0) * qty,
        supplies_cost=(payload.supplies_cost or 0) * qty,
        packaging_cost=(payload.packaging_cost or 0) * qty,
        filament_price_per_kg_snapshot=breakdown.filament_price_per_kg_snapshot,
        filament_cost=breakdown.filament_cost,
        energy_cost=breakdown.energy_cost,
        depreciation_cost=breakdown.depreciation_cost,
        labor_cost=breakdown.labor_cost,
        subtotal=breakdown.subtotal,
        final_cost=breakdown.final_cost,
        suggested_price=breakdown.suggested_price,
        marketplace_price=breakdown.marketplace_price,
        sold_value=payload.sold_value or 0,
    )
    db.add(job); db.commit(); db.refresh(job)
    return _job_dict(job)


@app.put("/print-jobs/{jid}")
def update_job(jid: int, payload: schemas.PrintJobIn, db: Session = Depends(get_db)):
    """Update an existing print job. Adjusts stock by the delta of grams."""
    j = db.get(models.PrintJob, jid)
    if not j: raise HTTPException(404, "Job not found")
    settings = db.query(models.Settings).first()
    printer  = db.get(models.Printer, payload.printer_id)
    spool    = db.get(models.FilamentInventory, payload.filament_inventory_id)
    if not settings: raise HTTPException(500, "Settings not configured")
    if not printer:  raise HTTPException(404, "Printer not found")
    if not spool:    raise HTTPException(404, "Spool not found")

    qty = max(1, payload.quantity)
    new_total_grams = (payload.filament_grams or 0) * qty
    old_spool = db.get(models.FilamentInventory, j.filament_inventory_id)

    # Refund old stock, then deduct new.
    if old_spool:
        old_spool.quantity_grams = (old_spool.quantity_grams or 0) + (j.filament_grams or 0)
    if (spool.quantity_grams or 0) < new_total_grams:
        # Roll back the refund-only operation by re-deducting before raising.
        if old_spool:
            old_spool.quantity_grams = (old_spool.quantity_grams or 0) - (j.filament_grams or 0)
        raise HTTPException(400, f"Estoque insuficiente no carretel. Necessário: {new_total_grams}g")
    spool.quantity_grams = (spool.quantity_grams or 0) - new_total_grams

    # Recompute cost using the chosen spool's price.
    if spool.purchase_price and spool.quantity_grams is not None:
        catalogue = db.get(models.Filament, spool.filament_id) if spool.filament_id else None
        spool_kg = (catalogue.spool_weight_kg if catalogue else 1.0) or 1.0
        price_per_kg = spool.purchase_price / spool_kg
    else:
        catalogue = db.get(models.Filament, spool.filament_id) if spool.filament_id else None
        price_per_kg = catalogue.price_per_kg if catalogue else 0.0

    breakdown = compute(
        grams=new_total_grams,
        print_time_hours=(payload.print_time_hours or 0) * qty,
        labor_hours=(payload.labor_hours or 0) * qty,
        supplies_cost=(payload.supplies_cost or 0) * qty,
        packaging_cost=(payload.packaging_cost or 0) * qty,
        filament_price_per_kg=price_per_kg,
        printer_avg_power_kwh=printer.avg_power_kwh,
        printer_depreciation_per_hour=printer.depreciation_per_hour,
        settings=settings,
        sold_value=payload.sold_value,
        quantity=qty,
    )

    j.date = payload.date or j.date
    j.project_name = payload.project_name
    j.printer_id = payload.printer_id
    j.filament_inventory_id = payload.filament_inventory_id
    j.quantity = qty
    j.filament_grams = new_total_grams
    j.print_time_hours = (payload.print_time_hours or 0) * qty
    j.labor_hours = (payload.labor_hours or 0) * qty
    j.supplies_cost = (payload.supplies_cost or 0) * qty
    j.packaging_cost = (payload.packaging_cost or 0) * qty
    j.filament_price_per_kg_snapshot = breakdown.filament_price_per_kg_snapshot
    j.filament_cost = breakdown.filament_cost
    j.energy_cost = breakdown.energy_cost
    j.depreciation_cost = breakdown.depreciation_cost
    j.labor_cost = breakdown.labor_cost
    j.subtotal = breakdown.subtotal
    j.final_cost = breakdown.final_cost
    j.suggested_price = breakdown.suggested_price
    j.marketplace_price = breakdown.marketplace_price
    j.sold_value = payload.sold_value or 0
    db.commit(); db.refresh(j)
    return _job_dict(j)


@app.delete("/print-jobs/{jid}")
def delete_job(jid: int, db: Session = Depends(get_db)):
    j = db.get(models.PrintJob, jid)
    if not j: raise HTTPException(404, "Job not found")
    # Refund the stock (so deleting a mistaken job restores grams).
    spool = db.get(models.FilamentInventory, j.filament_inventory_id)
    if spool:
        spool.quantity_grams = (spool.quantity_grams or 0) + (j.filament_grams or 0)
    db.delete(j); db.commit()
    return {"ok": True}


# ============================================================
# DRE — monthly aggregation (sheet "DRE")
# ============================================================
@app.get("/dre")
def dre(db: Session = Depends(get_db)):
    rows = db.query(models.PrintJob).all()
    buckets: dict = {}
    for j in rows:
        if not j.date: continue
        key = f"{j.date.year:04d}-{j.date.month:02d}"
        b = buckets.setdefault(key, {
            "month": key,
            "filament_kg": 0.0, "print_time_hours": 0.0, "labor_hours": 0.0,
            "supplies_cost": 0.0, "packaging_cost": 0.0, "energy_cost": 0.0,
            "total_cost": 0.0, "sales": 0.0, "jobs": 0,
        })
        b["filament_kg"]      += (j.filament_grams or 0) / 1000.0
        b["print_time_hours"] += j.print_time_hours or 0
        b["labor_hours"]      += j.labor_hours or 0
        b["supplies_cost"]    += j.supplies_cost or 0
        b["packaging_cost"]   += j.packaging_cost or 0
        b["energy_cost"]      += j.energy_cost or 0
        b["total_cost"]       += j.final_cost or 0
        b["sales"]            += j.sold_value or 0
        b["jobs"]             += 1

    out = []
    for b in sorted(buckets.values(), key=lambda x: x["month"]):
        b["profit_pct"] = (
            round((b["sales"] - b["total_cost"]) / b["total_cost"], 4)
            if b["total_cost"] else None
        )
        out.append({k: (round(v, 4) if isinstance(v, float) else v) for k, v in b.items()})
    return out


# ============================================================
# Stock summary (legacy compatibility)
# ============================================================
@app.get("/stock")
def stock(db: Session = Depends(get_db)):
    return [_inv_dict(i) for i in db.query(models.FilamentInventory).all()]


# ============================================================
# Stock items — Embalagens & Insumos
# ============================================================
@app.get("/stock-items")
def list_stock_items(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.StockItem)
    if category:
        q = q.filter(models.StockItem.category == category)
    return [_stock_dict(s) for s in q.all()]


@app.post("/stock-items")
def create_stock_item(payload: schemas.StockItemIn, db: Session = Depends(get_db)):
    s = models.StockItem(**payload.dict())
    db.add(s); db.commit(); db.refresh(s)
    return _stock_dict(s)


@app.put("/stock-items/{sid}")
def update_stock_item(sid: int, payload: schemas.StockItemIn, db: Session = Depends(get_db)):
    s = db.get(models.StockItem, sid)
    if not s: raise HTTPException(404, "Stock item not found")
    for k, v in payload.dict().items(): setattr(s, k, v)
    db.commit(); db.refresh(s)
    return _stock_dict(s)


@app.delete("/stock-items/{sid}")
def delete_stock_item(sid: int, db: Session = Depends(get_db)):
    s = db.get(models.StockItem, sid)
    if not s: raise HTTPException(404, "Stock item not found")
    db.delete(s); db.commit()
    return {"ok": True}
