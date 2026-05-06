from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class PrinterIn(BaseModel):
    name: str
    manufacturer: Optional[str] = None
    price: float = 0
    depreciation_hours: float = 10000
    maintenance_cost: float = 0
    avg_power_kwh: float = 0.15


class FilamentIn(BaseModel):
    name: str
    manufacturer: Optional[str] = None
    type: Optional[str] = None
    diameter_mm: float = 1.75
    spool_price: float = 0
    spool_weight_kg: float = 1.0
    density: float = 1.24


class FilamentInventoryIn(BaseModel):
    filament_id: Optional[int] = None
    brand: Optional[str] = None
    type: Optional[str] = None
    color: str
    source: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: float = 0
    quantity_grams: float = 1000

    manufacturer: Optional[str] = None
    diameter_mm: Optional[float] = 1.75
    density: Optional[float] = 1.24
    nozzle_temp: Optional[float] = 0
    bed_temp: Optional[float] = 0


class FilamentInventoryAdjust(BaseModel):
    quantity_grams: float


class SettingsIn(BaseModel):
    energy_cost_per_kwh: float
    labor_cost_per_hour: float
    failure_rate: float
    currency: str = "R$"
    marketplace_fee: float
    tax: float
    fixed_fee: float
    markup: float


class ProductIn(BaseModel):
    name: str
    printer_id: Optional[int] = None
    filament_id: Optional[int] = None
    filament_grams: float = 0
    print_time_hours: float = 0
    labor_hours: float = 0
    supplies_cost: float = 0
    packaging_cost: float = 0


class StockItemRef(BaseModel):
    id: int
    qty: float = 0


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

    # New: extras (multi-filamento, insumos, embalagens)
    extra_filament_ids: Optional[List[int]] = []
    insumos: Optional[List[StockItemRef]] = []
    embalagens: Optional[List[StockItemRef]] = []


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
    override_price_per_kg: Optional[float] = None


class StockItemIn(BaseModel):
    category: str
    description: str
    valor: float = 0
    purchased_qty: float = 0
    available_qty: float = 0
