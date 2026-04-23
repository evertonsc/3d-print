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
    name = Column(String, unique=True, index=True)            # e.g. "A1 Combo"
    manufacturer = Column(String)                             # e.g. "Bambu Lab"
    price = Column(Float, default=0.0)                        # R$
    depreciation_hours = Column(Float, default=10000.0)       # total expected life in h
    maintenance_cost = Column(Float, default=0.0)             # R$
    avg_power_kwh = Column(Float, default=0.15)               # kWh/h

    @property
    def depreciation_per_hour(self) -> float:
        if self.depreciation_hours and self.depreciation_hours > 0:
            return ((self.price or 0.0) + (self.maintenance_cost or 0.0)) / self.depreciation_hours
        return 0.0


# --------------------------------------------------------------
# Catalog of filaments (sheet "Filamentos")
# --------------------------------------------------------------
class Filament(Base):
    __tablename__ = "filaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)            # e.g. "National3D PLA High Speed"
    manufacturer = Column(String)
    type = Column(String)                                     # PLA / PETG / TPU / ...
    diameter_mm = Column(Float, default=1.75)
    spool_price = Column(Float, default=0.0)                  # R$
    spool_weight_kg = Column(Float, default=1.0)
    density = Column(Float, default=1.24)                     # g/cm³

    @property
    def price_per_kg(self) -> float:
        if self.spool_weight_kg and self.spool_weight_kg > 0:
            return (self.spool_price or 0.0) / self.spool_weight_kg
        return 0.0


# --------------------------------------------------------------
# Filament stock items (sheet image #2 — "Filamentos existentes")
# Each spool the user owns: color, brand/manufacturer, type, source...
# --------------------------------------------------------------
class FilamentInventory(Base):
    __tablename__ = "filament_inventory"

    id = Column(Integer, primary_key=True, index=True)
    filament_id = Column(Integer, ForeignKey("filaments.id"))
    color = Column(String)                                    # "Preto", "Branco", ...
    brand = Column(String)                                    # Bambu, N3D, Creality, eSUN ...
    type = Column(String)                                     # PLA / PETG / TPU
    source = Column(String)                                   # where it was bought (Tiktok, Eder 14/02, ...)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    purchase_price = Column(Float, default=0.0)               # R$ paid for THIS spool (note #4 / #7)
    quantity_grams = Column(Float, default=1000.0)            # remaining grams


# --------------------------------------------------------------
# Settings (sheet "Outros")
# --------------------------------------------------------------
class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    energy_cost_per_kwh = Column(Float, default=0.86)         # R$/kWh
    labor_cost_per_hour = Column(Float, default=10.0)         # R$/h
    failure_rate = Column(Float, default=10.0)                # %
    currency = Column(String, default="R$")
    marketplace_fee = Column(Float, default=0.20)             # 0..1
    tax = Column(Float, default=0.0)                          # 0..1
    fixed_fee = Column(Float, default=4.0)                    # R$
    markup = Column(Float, default=1.5)                       # multiplier (Q5)


# --------------------------------------------------------------
# Catalogued products (recipes — what to print)
# --------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    printer_id = Column(Integer, ForeignKey("printers.id"))
    filament_id = Column(Integer, ForeignKey("filaments.id"))
    filament_grams = Column(Float, default=0.0)               # per unit
    print_time_hours = Column(Float, default=0.0)             # per unit
    labor_hours = Column(Float, default=0.0)                  # per unit
    supplies_cost = Column(Float, default=0.0)                # R$ extra (insumos)
    packaging_cost = Column(Float, default=0.0)               # R$ extra (embalagem)


# --------------------------------------------------------------
# Print jobs / sales (sheet "Produtos" rows)
# --------------------------------------------------------------
class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    project_name = Column(String)                             # "Projeto"
    printer_id = Column(Integer, ForeignKey("printers.id"))
    filament_inventory_id = Column(Integer, ForeignKey("filament_inventory.id"))
    quantity = Column(Integer, default=1)                     # qty printed
    filament_grams = Column(Float, default=0.0)               # total grams used
    print_time_hours = Column(Float, default=0.0)
    labor_hours = Column(Float, default=0.0)
    supplies_cost = Column(Float, default=0.0)
    packaging_cost = Column(Float, default=0.0)

    # Snapshotted values (so changing filament price later does NOT alter past jobs — note #4)
    filament_price_per_kg_snapshot = Column(Float, default=0.0)
    filament_cost = Column(Float, default=0.0)
    energy_cost = Column(Float, default=0.0)
    depreciation_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    final_cost = Column(Float, default=0.0)                   # with failure rate
    suggested_price = Column(Float, default=0.0)              # cost * markup
    marketplace_price = Column(Float, default=0.0)            # with fees
    sold_value = Column(Float, default=0.0)                   # what was actually sold for
