from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ----- Printers -----
class PrinterIn(BaseModel):
    name: str
    manufacturer: Optional[str] = None
    price: float = 0
    depreciation_hours: float = 10000
    maintenance_cost: float = 0
    avg_power_kwh: float = 0.15


# ----- Filaments -----
class FilamentIn(BaseModel):
    name: str
    manufacturer: Optional[str] = None
    type: Optional[str] = None
    diameter_mm: float = 1.75
    spool_price: float = 0
    spool_weight_kg: float = 1.0
    density: float = 1.24


# ----- Filament inventory (each spool) -----
class FilamentInventoryIn(BaseModel):
    filament_id: Optional[int] = None
    color: str
    brand: Optional[str] = None
    type: Optional[str] = None
    source: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: float = 0
    quantity_grams: float = 1000


class FilamentInventoryAdjust(BaseModel):
    quantity_grams: float           # delta (can be negative)


# ----- Settings -----
class SettingsIn(BaseModel):
    energy_cost_per_kwh: float
    labor_cost_per_hour: float
    failure_rate: float
    currency: str = "R$"
    marketplace_fee: float
    tax: float
    fixed_fee: float
    markup: float


# ----- Products (recipes) -----
class ProductIn(BaseModel):
    name: str
    printer_id: Optional[int] = None
    filament_id: Optional[int] = None
    filament_grams: float = 0
    print_time_hours: float = 0
    labor_hours: float = 0
    supplies_cost: float = 0
    packaging_cost: float = 0


# ----- Print jobs / sales -----
class PrintJobIn(BaseModel):
    project_name: str
    printer_id: int
    filament_inventory_id: int
    quantity: int = 1
    filament_grams: float
    print_time_hours: float
    labor_hours: float = 0
    supplies_cost: float = 0
    packaging_cost: float = 0
    sold_value: float = 0
    date: Optional[datetime] = None


# ----- Quote / Orçamento -----
class QuoteIn(BaseModel):
    project_name: str
    printer_id: int
    filament_id: int
    quantity: int = 1
    filament_grams: float
    print_time_hours: float
    labor_hours: float = 0
    supplies_cost: float = 0
    packaging_cost: float = 0
    # Optional override: if user just bought a more expensive spool, send the price
    override_price_per_kg: Optional[float] = None
