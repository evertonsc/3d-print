from database import SessionLocal, engine
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import models
from sqlalchemy.orm import Session


# Create tables automatically
models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # libera tudo (dev)
    allow_credentials=True,
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
def create_product(name: str, db: Session = Depends(get_db)):
    product = models.Product(name=name)
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
    settings = db.query(models.Settings).first()

    # 1. MATERIAL
    material_cost = product.material_grams * product.material_cost_per_gram

    # 2. ENERGIA
    energy_cost = (
        product.print_time_hours *
        settings.printer_power_kw *
        settings.energy_cost_per_kwh
    )

    # 3. MÃO DE OBRA
    labor_cost = product.print_time_hours * settings.labor_cost_per_hour

    # 4. CUSTO TOTAL UNITÁRIO
    unit_cost = material_cost + energy_cost + labor_cost

    # 5. TOTAL
    total_cost = unit_cost * quantity

    production = models.Production(
        product_id=product_id,
        quantity=quantity,
        unit_cost=unit_cost,
        total_cost=total_cost
    )

    # descontar material do estoque
    material = db.query(models.Inventory).filter(models.Inventory.name == "filament").first()

    needed = product.material_grams * quantity

    if not material or material.quantity < needed:
        raise HTTPException(status_code=400, detail=f"Not enough stock. Needed: {needed}, Available: {material.quantity}")

    if material:
        total_material_needed = product.material_grams * quantity
        material.quantity -= total_material_needed  

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
        printer_power_kw=0.2
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