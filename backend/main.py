from contextlib import asynccontextmanager
from database import SessionLocal, engine
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import models
from sqlalchemy.orm import Session


# Create tables automatically
models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed default Settings on startup if missing
    db = SessionLocal()
    try:
        if not db.query(models.Settings).first():
            db.add(models.Settings(
                energy_cost_per_kwh=1.0,
                labor_cost_per_hour=10.0,
                printer_power_kw=0.2,
            ))
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # cannot be True together with "*"
    allow_methods=["*"],
    allow_headers=["*"],
)


# DB session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================================
@app.get("/")
def root():
    return {"status": "Backend running"}

# ==========================================================
@app.post("/products")
def create_product(
    name: str,
    material_grams: float,
    print_time_hours: float,
    material_cost_per_gram: float,
    db: Session = Depends(get_db),
):
    product = models.Product(
        name=name,
        material_grams=material_grams,
        print_time_hours=print_time_hours,
        material_cost_per_gram=material_cost_per_gram,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

# ==========================================================
@app.get("/products")
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()

# ==========================================================
@app.post("/produce")
def produce(product_id: int, quantity: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    settings = db.query(models.Settings).first()
    if not settings:
        raise HTTPException(status_code=500, detail="Settings not configured")

    material_cost = (product.material_grams or 0) * (product.material_cost_per_gram or 0)
    energy_cost = (
        (product.print_time_hours or 0)
        * settings.printer_power_kw
        * settings.energy_cost_per_kwh
    )
    labor_cost = (product.print_time_hours or 0) * settings.labor_cost_per_hour

    unit_cost = material_cost + energy_cost + labor_cost
    total_cost = unit_cost * quantity

    # Validate stock
    material = db.query(models.Inventory).filter(models.Inventory.name == "filament").first()
    needed = (product.material_grams or 0) * quantity

    if not material or material.quantity < needed:
        available = material.quantity if material else 0
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock. Needed: {needed}, Available: {available}",
        )

    material.quantity -= needed

    production = models.Production(
        product_id=product_id,
        quantity=quantity,
        unit_cost=unit_cost,
        total_cost=total_cost,
    )
    db.add(production)
    db.commit()
    db.refresh(production)
    return production

# ==========================================================
@app.get("/productions")
def list_productions(db: Session = Depends(get_db)):
    return db.query(models.Production).all()

# ==========================================================
@app.post("/settings")
def create_settings(db: Session = Depends(get_db)):
    settings = models.Settings(
        energy_cost_per_kwh=1.0,
        labor_cost_per_hour=10.0,
        printer_power_kw=0.2,
    )
    db.add(settings)
    db.commit()
    return settings

# ==========================================================
@app.get("/stock")
def list_stock(db: Session = Depends(get_db)):
    return db.query(models.Inventory).all()

# ==========================================================
@app.post("/stock")
def add_stock(name: str, quantity: float, db: Session = Depends(get_db)):
    item = db.query(models.Inventory).filter(models.Inventory.name == name).first()
    if item:
        item.quantity += quantity
    else:
        item = models.Inventory(name=name, quantity=quantity)
        db.add(item)
    db.commit()
    return item
