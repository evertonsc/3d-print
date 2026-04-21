from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Float

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)

    material_grams = Column(Float)          # quanto usa de material
    print_time_hours = Column(Float)        # tempo de impressão
    material_cost_per_gram = Column(Float)  # custo do material

# ==========================================================

class Production(Base):
    __tablename__ = "productions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer)
    quantity = Column(Integer)
    unit_cost = Column(Float)
    total_cost = Column(Float)

# ==========================================================

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    energy_cost_per_kwh = Column(Float)
    labor_cost_per_hour = Column(Float)
    printer_power_kw = Column(Float)

# ==========================================================

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    quantity = Column(Float)

# ==========================================================
