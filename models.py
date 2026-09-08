"""
Models for TrailRute RPG Pendakian
"""

import random
from dataclasses import dataclass, field
from typing import List, Dict, Optional

@dataclass
class Item:
    id: str
    name: str
    category: str  # 'gear', 'food', 'drink', 'med', 'fuel'
    weight_kg: float
    description: str
    stamina_gain: int = 0
    energy_gain: int = 0
    water_gain: int = 0
    warmth_gain: int = 0
    health_gain: int = 0
    morale_gain: int = 0
    is_reusable: bool = False
    durability: int = 100

@dataclass
class Checkpoint:
    id: str
    name: str
    elevation_mdpl: int
    distance_km_from_prev: float
    elevation_gain_m: int
    terrain_difficulty: float  # 1.0 = normal, 1.5 = curam, 2.0 = sangat terjal/ekstrem
    has_water_source: bool = False
    can_camp: bool = False
    description: str = ""

@dataclass
class Mountain:
    id: str
    name: str
    elevation_mdpl: int
    location: str
    difficulty: str  # 'Pemula', 'Menengah', 'Menantang', 'Hardcore'
    description: str
    checkpoints: List[Checkpoint]
    base_temp_c: float = 18.0
    wind_intensity_base: int = 15  # km/h

@dataclass
class Weather:
    condition: str  # 'Cerah', 'Berawan', 'Kabut Tebal', 'Gerimis Dingin', 'Hujan Deras & Badai'
    temp_c: float
    wind_kmh: float
    rain_probability: int
    
    @property
    def wind_chill_c(self) -> float:
        # NOAA Windchill approx: 13.12 + 0.6215*T - 11.37*(V**0.16) + 0.3965*T*(V**0.16)
        if self.wind_kmh < 4.8:
            return round(self.temp_c, 1)
        v = self.wind_kmh
        t = self.temp_c
        wc = 13.12 + (0.6215 * t) - (11.37 * (v ** 0.16)) + (0.3965 * t * (v ** 0.16))
        return round(wc, 1)

    @property
    def hypothermia_risk(self) -> str:
        wc = self.wind_chill_c
        if wc < 0:
            return "EKSTREM (Bahaya Frostbite & Hipotermia Berat!)"
        elif wc < 8:
            return "TINGGI (Wajib Jaket Down, Shell & Gerak Aktif)"
        elif wc < 15:
            return "SEDANG (Wajib Windbreaker / Fleece)"
        return "RENDAH (Aman)"

@dataclass
class Player:
    name: str
    level: int = 1
    exp: int = 0
    
    # Core Stats (0 - 100)
    health: int = 100
    stamina: int = 100
    energy: int = 100
    hydration: int = 100
    warmth: int = 100
    morale: int = 100
    
    # Inventory
    inventory: Dict[str, int] = field(default_factory=dict)  # item_id -> quantity
    equipped_gear: List[str] = field(default_factory=list)
    
    # Progression
    current_mountain: Optional[Mountain] = None
    current_checkpoint_idx: int = 0
    hours_elapsed: float = 0.0
    is_tent_pitched: bool = False
    is_hypothermic: bool = False
    is_altitude_sick: bool = False
    
    def total_weight(self, items_db: Dict[str, Item]) -> float:
        weight = 0.0
        for item_id, qty in self.inventory.items():
            if item_id in items_db:
                weight += items_db[item_id].weight_kg * qty
        return round(weight, 2)
    
    def clamp_stats(self):
        self.health = max(0, min(100, self.health))
        self.stamina = max(0, min(100, self.stamina))
        self.energy = max(0, min(100, self.energy))
        self.hydration = max(0, min(100, self.hydration))
        self.warmth = max(0, min(100, self.warmth))
        self.morale = max(0, min(100, self.morale))
        
        if self.warmth < 25:
            self.is_hypothermic = True
        elif self.warmth > 40:
            self.is_hypothermic = False
            
    def is_alive(self) -> bool:
        return self.health > 0
