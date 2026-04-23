"""
Cost-and-price engine that mirrors the spreadsheet ("Produtos" sheet).

Per-unit columns from the spreadsheet, expressed here as functions:

    J  filament_cost     = grams/1000 * filament.price_per_kg
    K  energy_cost       = hours * printer.avg_power_kwh * settings.energy_cost_per_kwh
    L  depreciation_cost = hours * printer.depreciation_per_hour
    M  labor_cost        = labor_hours * settings.labor_cost_per_hour
    N  subtotal          = J + K + L + M + supplies + packaging
    O  final_cost        = N * (1 + failure_rate/100)
    P  suggested_price   = O * markup            (Q5 in the sheet, default 1.5)
    Q  marketplace_price = P / (1 - marketplace_fee - tax) + fixed_fee
    U  profit_pct        = (sold - O) / O
"""
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class CostBreakdown:
    filament_cost: float
    energy_cost: float
    depreciation_cost: float
    labor_cost: float
    supplies_cost: float
    packaging_cost: float
    subtotal: float
    final_cost: float
    suggested_price: float
    marketplace_price: float
    profit_pct: Optional[float] = None
    filament_price_per_kg_snapshot: float = 0.0

    def dict(self):
        return asdict(self)


def compute(
    *,
    grams: float,
    print_time_hours: float,
    labor_hours: float,
    supplies_cost: float,
    packaging_cost: float,
    filament_price_per_kg: float,
    printer_avg_power_kwh: float,
    printer_depreciation_per_hour: float,
    settings,                    # models.Settings
    sold_value: Optional[float] = None,
    quantity: int = 1,
) -> CostBreakdown:
    """All values are computed per the requested quantity."""
    grams = grams or 0.0
    print_time_hours = print_time_hours or 0.0
    labor_hours = labor_hours or 0.0
    supplies_cost = supplies_cost or 0.0
    packaging_cost = packaging_cost or 0.0

    filament_cost = (grams / 1000.0) * (filament_price_per_kg or 0.0)
    energy_cost = print_time_hours * (printer_avg_power_kwh or 0.0) * (settings.energy_cost_per_kwh or 0.0)
    depreciation_cost = print_time_hours * (printer_depreciation_per_hour or 0.0)
    labor_cost = labor_hours * (settings.labor_cost_per_hour or 0.0)

    subtotal = filament_cost + energy_cost + depreciation_cost + labor_cost + supplies_cost + packaging_cost
    final_cost = subtotal * (1.0 + (settings.failure_rate or 0.0) / 100.0)

    suggested_price = final_cost * (settings.markup or 1.5)

    fee_factor = 1.0 - (settings.marketplace_fee or 0.0) - (settings.tax or 0.0)
    if fee_factor <= 0:
        marketplace_price = suggested_price + (settings.fixed_fee or 0.0)
    else:
        marketplace_price = suggested_price / fee_factor + (settings.fixed_fee or 0.0)

    profit_pct = None
    if sold_value not in (None, 0) and final_cost:
        profit_pct = (sold_value - final_cost) / final_cost

    return CostBreakdown(
        filament_cost=round(filament_cost, 4),
        energy_cost=round(energy_cost, 4),
        depreciation_cost=round(depreciation_cost, 4),
        labor_cost=round(labor_cost, 4),
        supplies_cost=round(supplies_cost, 4),
        packaging_cost=round(packaging_cost, 4),
        subtotal=round(subtotal, 4),
        final_cost=round(final_cost, 4),
        suggested_price=round(suggested_price, 2),
        marketplace_price=round(marketplace_price, 2),
        profit_pct=round(profit_pct, 4) if profit_pct is not None else None,
        filament_price_per_kg_snapshot=round(filament_price_per_kg or 0.0, 4),
    )
