from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


# --------------------------------------------------------------
# Catalog of printers (sheet "Impressoras")
# --------------------------------------------------------------
class Printer(Base):
    __tablename__ = "printers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    manufacturer = Column(String)
    price = Column(Float, default=0.0)
    depreciation_hours = Column(Float, default=10000.0)
    maintenance_cost = Column(Float, default=0.0)
    avg_power_kwh = Column(Float, default=0.15)

    @property
    def depreciation_per_hour(self) -> float:
        if self.depreciation_hours and self.depreciation_hours > 0:
            return ((self.price or 0.0) + (self.maintenance_cost or 0.0)) / self.depreciation_hours
        return 0.0


# --------------------------------------------------------------
# Catalog of filaments (kept for legacy compatibility, no longer
# exposed in the Settings UI per latest requirements)
# --------------------------------------------------------------
class Filament(Base):
    __tablename__ = "filaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    manufacturer = Column(String)
    type = Column(String)
    diameter_mm = Column(Float, default=1.75)
    spool_price = Column(Float, default=0.0)
    spool_weight_kg = Column(Float, default=1.0)
    density = Column(Float, default=1.24)

    @property
    def price_per_kg(self) -> float:
        if self.spool_weight_kg and self.spool_weight_kg > 0:
            return (self.spool_price or 0.0) / self.spool_weight_kg
        return 0.0


# --------------------------------------------------------------
# Filament stock items (each spool the user owns).
# Now self-contained: manufacturer / diameter / density / temps
# live directly on the spool record.
# --------------------------------------------------------------
class FilamentInventory(Base):
    __tablename__ = "filament_inventory"

    id = Column(Integer, primary_key=True, index=True)
    filament_id = Column(Integer, ForeignKey("filaments.id"), nullable=True)

    # Main form
    brand = Column(String)               # "Marca" (was: catalogue name)
    type = Column(String)
    color = Column(String)
    source = Column(String)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    purchase_price = Column(Float, default=0.0)
    quantity_grams = Column(Float, default=1000.0)

    # "Informações Adicionais" sub-form
    manufacturer = Column(String)
    diameter_mm = Column(Float, default=1.75)
    density = Column(Float, default=1.24)
    nozzle_temp = Column(Float, default=0.0)
    bed_temp = Column(Float, default=0.0)


# --------------------------------------------------------------
# Settings (sheet "Outros")
# --------------------------------------------------------------
class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    energy_cost_per_kwh = Column(Float, default=0.86)
    labor_cost_per_hour = Column(Float, default=10.0)
    failure_rate = Column(Float, default=10.0)
    currency = Column(String, default="R$")
    marketplace_fee = Column(Float, default=0.20)
    tax = Column(Float, default=0.0)
    fixed_fee = Column(Float, default=4.0)
    markup = Column(Float, default=1.5)


# --------------------------------------------------------------
# Catalogued products (recipes — what to print)
# --------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    printer_id = Column(Integer, ForeignKey("printers.id"))
    filament_id = Column(Integer, ForeignKey("filaments.id"))
    filament_grams = Column(Float, default=0.0)
    print_time_hours = Column(Float, default=0.0)
    labor_hours = Column(Float, default=0.0)
    supplies_cost = Column(Float, default=0.0)
    packaging_cost = Column(Float, default=0.0)


# --------------------------------------------------------------
# Print jobs / sales
# --------------------------------------------------------------
class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    project_name = Column(String)
    printer_id = Column(Integer, ForeignKey("printers.id"))
    filament_inventory_id = Column(Integer, ForeignKey("filament_inventory.id"))
    quantity = Column(Integer, default=1)
    filament_grams = Column(Float, default=0.0)
    print_time_hours = Column(Float, default=0.0)
    labor_hours = Column(Float, default=0.0)
    supplies_cost = Column(Float, default=0.0)
    packaging_cost = Column(Float, default=0.0)

    filament_price_per_kg_snapshot = Column(Float, default=0.0)
    filament_cost = Column(Float, default=0.0)
    energy_cost = Column(Float, default=0.0)
    depreciation_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    final_cost = Column(Float, default=0.0)
    suggested_price = Column(Float, default=0.0)
    marketplace_price = Column(Float, default=0.0)
    sold_value = Column(Float, default=0.0)


# --------------------------------------------------------------
# Generic stockable item used by both "Embalagens" and "Insumos"
# --------------------------------------------------------------
class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)        # "packaging" | "supply"
    description = Column(String)
    valor = Column(Float, default=0.0)           # total purchase value
    purchased_qty = Column(Float, default=0.0)   # quantidade comprada
    available_qty = Column(Float, default=0.0)   # estoque disponível

    @property
    def unit_price(self) -> float:
        if self.purchased_qty and self.purchased_qty > 0:
            return (self.valor or 0.0) / self.purchased_qty
        return 0.0
