from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)

    material_grams = Column(Float)
    print_time_hours = Column(Float)
    material_cost_per_gram = Column(Float)


class Production(Base):
    __tablename__ = "productions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer)
    quantity = Column(Integer)
    unit_cost = Column(Float)
    total_cost = Column(Float)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    energy_cost_per_kwh = Column(Float)
    labor_cost_per_hour = Column(Float)
    printer_power_kw = Column(Float)


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    quantity = Column(Float)
    unit_cost = Column(Float, default=0.0)
