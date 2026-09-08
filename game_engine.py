"""
Core Game Engine for TrailRute RPG Pendakian
"""

import json
import os
import random
import time
from typing import Optional, Dict

from models import Player, Mountain, Checkpoint, Weather, Item
from data import MOUNTAINS, ITEMS, EVENTS
import ui

SAVE_FILE = "save_game.json"

class GameEngine:
    def __init__(self):
        self.player: Optional[Player] = None
        self.weather: Weather = Weather("Cerah Berawan", 18.0, 10.0, 10)
        self.running: bool = True
        self.mountain_db: Dict[str, Mountain] = {m.id: m for m in MOUNTAINS}
        self.items_db: Dict[str, Item] = ITEMS
        
    def new_game(self, player_name: str, chosen_mountain_id: str):
        mountain = self.mountain_db.get(chosen_mountain_id, MOUNTAINS[0])
        self.player = Player(
            name=player_name,
            current_mountain=mountain,
            current_checkpoint_idx=0,
            hours_elapsed=6.0  # Start at 06:00 AM
        )
        
        # Starter Kit
        self.player.inventory = {
            "tenda_dome": 1,
            "sleeping_bag": 1,
            "matras_foil": 1,
            "jaket_down": 1,
            "jas_hujan": 1,
            "kompor_gas": 1,
            "nesting_set": 1,
            "headlamp": 1,
            "trekking_pole": 1,
            "emergency_blanket": 1,
            "air_mineral": 3,
            "oralit_sachet": 2,
            "kopi_hangat": 3,
            "mie_instan": 3,
            "cokelat_energy": 2,
            "madu_sachet": 2,
            "p3k_kit": 1,
            "minyak_kayu_putih": 1
        }
        
        self.update_weather(initial=True)
        
    def update_weather(self, initial: bool = False):
        if not self.player or not self.player.current_mountain:
            return
            
        cp = self.player.current_mountain.checkpoints[self.player.current_checkpoint_idx]
        elev = cp.elevation_mdpl
        
        # Temperature lapse rate: ~0.65C drop per 100m elevation
        base_t = self.player.current_mountain.base_temp_c
        temp = max(-2.0, base_t - ((elev - 1500) / 100.0) * 0.65)
        
        # Time of day temperature modifier
        hour = int(self.player.hours_elapsed) % 24
        if 19 <= hour or hour <= 4:
            temp -= 5.0  # Malam / Dini hari sangat dingin
        elif 11 <= hour <= 14:
            temp += 3.0  # Siang hari lebih hangat
            
        # Random weather state
        cond_pool = [
            ("Cerah Sejuk", 5, 0),
            ("Berawan Berangin", 15, 20),
            ("Kabut Tebal", 20, 40),
            ("Gerimis Dingin", 25, 70),
            ("Badai Hujan & Angin Kencang", 40, 90)
        ]
        
        weights = [40, 30, 15, 10, 5] if (6 <= hour <= 15) else [15, 25, 30, 20, 10]
        chosen = random.choices(cond_pool, weights=weights, k=1)[0]
        
        wind = self.player.current_mountain.wind_intensity_base + chosen[1] + random.randint(-3, 5)
        wind = max(5, wind)
        
        self.weather = Weather(
            condition=chosen[0],
            temp_c=round(temp, 1),
            wind_kmh=wind,
            rain_probability=chosen[2]
        )

    def advance_time(self, hours: float):
        self.player.hours_elapsed += hours
        
        # Metabolic drain over time
        drain_water = int(hours * 7)
        drain_energy = int(hours * 6)
        
        self.player.hydration -= drain_water
        self.player.energy -= drain_energy
        
        # Cold impact based on weather wind chill and tent status
        wc = self.weather.wind_chill_c
        if wc < 10:
            cold_pen = int((10 - wc) * hours * 1.5)
            if self.player.is_tent_pitched:
                cold_pen = max(0, cold_pen // 3)
            self.player.warmth -= cold_pen
            
        # Severe condition penalties
        if self.player.warmth < 25:
            self.player.health -= int(hours * 8)
            self.player.morale -= int(hours * 6)
            print(f"\n{ui.RED}⚠️ [PERINGATAN] Tubuhmu menggigil hebat! Hipotermia menggerogoti Health!{ui.RESET}")
            
        if self.player.hydration < 20:
            self.player.stamina -= int(hours * 10)
            self.player.health -= int(hours * 5)
            print(f"\n{ui.YELLOW}⚠️ [PERINGATAN] Dehidrasi parah! Tenggorokan kering dan stamina anjlok!{ui.RESET}")
            
        if self.player.energy < 20:
            self.player.stamina -= int(hours * 8)
            print(f"\n{ui.YELLOW}⚠️ [PERINGATAN] Tubuh kehabisan kalori, langkah kaki menjadi sangat berat!{ui.RESET}")
            
        self.player.clamp_stats()
        self.update_weather()

    def action_trek_next_pos(self):
        curr_idx = self.player.current_checkpoint_idx
        mountain = self.player.current_mountain
        
        if curr_idx >= len(mountain.checkpoints) - 1:
            print(f"\n{ui.GREEN}Kamu sudah berada di titik tertinggi ({mountain.checkpoints[-1].name})!{ui.RESET}")
            input("\n[Tekan Enter untuk lanjut]")
            return
            
        next_cp = mountain.checkpoints[curr_idx + 1]
        
        # Check tent status
        if self.player.is_tent_pitched:
            print(f"\n{ui.YELLOW}Kamu harus membongkar dan melipat tenda terlebih dahulu sebelum melanjutkan perjalanan!{ui.RESET}")
            input("\n[Tekan Enter untuk lanjut]")
            return
            
        # Calculate hike duration via Naismith Rule with modifiers
        # Naismith: 4 km/h base + 1h per 600m ascent
        dist = next_cp.distance_km_from_prev
        elev_gain = next_cp.elevation_gain_m
        
        base_hours = (dist / 3.5) + (elev_gain / 500.0)
        base_hours *= next_cp.terrain_difficulty
        
        # Stamina & weight modifier
        weight = self.player.total_weight(self.items_db)
        weight_penalty = 1.0 + (max(0, weight - 8.0) * 0.03)  # >8kg adds slight time
        stamina_factor = 1.0 if self.player.stamina > 50 else (1.4 if self.player.stamina > 20 else 1.9)
        
        total_hours = round(base_hours * weight_penalty * stamina_factor, 1)
        
        # Stamina cost
        stamina_cost = int(25 * next_cp.terrain_difficulty + (elev_gain / 35.0))
        
        print(f"\n{ui.CYAN}🥾 Memulai pendakian menuju {next_cp.name}...{ui.RESET}")
        print(f"Jarak: {dist} km | Elevasi Naik: +{elev_gain} m | Estimasi Waktu: {total_hours} Jam")
        
        time.sleep(0.7)
        
        # Apply costs
        self.player.stamina -= stamina_cost
        self.player.exp += int(30 * next_cp.terrain_difficulty)
        
        # Trigger potential random encounter
        if random.random() < 0.65:
            self.trigger_random_event()
            
        self.advance_time(total_hours)
        self.player.current_checkpoint_idx += 1
        
        # Check Summit Arrival
        if self.player.current_checkpoint_idx == len(mountain.checkpoints) - 1:
            ui.clear_screen()
            ui.print_summit_art(mountain.name, mountain.elevation_mdpl)
            self.player.morale = 100
            self.player.exp += 150
            print(f"\n{ui.GREEN}{ui.BOLD}🏆 SELAMAT! Kamu berhasil menaklukkan puncak {mountain.name}!{ui.RESET}")
            print(f"Total waktu tempuh: {self.player.hours_elapsed:.1f} Jam.")
            input("\n[Tekan Enter untuk merayakan momen summit]")
        else:
            print(f"\n{ui.GREEN}✅ Tiba di {next_cp.name} ({next_cp.elevation_mdpl} mdpl)!{ui.RESET}")
            print(f"{ui.DIM}{next_cp.description}{ui.RESET}")
            input("\n[Tekan Enter untuk lanjut]")

    def trigger_random_event(self):
        event = random.choice(EVENTS)
        ui.clear_screen()
        ui.print_box(f"⚡ PERISTIWA JALUR: {event['title']}", event['description'], ui.YELLOW)
        
        print("\nPilih tindakanmu:")
        for idx, ch in enumerate(event['choices'], 1):
            req = f" {ui.CYAN}[Butuh: {ITEMS[ch['req_item']].name}]{ui.RESET}" if ch.get('req_item') else ""
            print(f" {idx}. {ch['text']}{req}")
            
        pilihan = input("\nNomor pilihan (1/2/...): ").strip()
        try:
            ch_idx = int(pilihan) - 1
            if 0 <= ch_idx < len(event['choices']):
                ch = event['choices'][ch_idx]
                req_item = ch.get('req_item')
                
                # Check item requirement
                if req_item and self.player.inventory.get(req_item, 0) <= 0:
                    print(f"\n{ui.RED}❌ Kamu tidak membawa {ITEMS[req_item].name}! Tindakan gagal!{ui.RESET}")
                    self.player.morale -= 10
                    self.player.stamina -= 10
                else:
                    # Apply benefits / costs
                    self.player.warmth += ch.get('warmth_gain', 0) - ch.get('warmth_cost', 0)
                    self.player.stamina += ch.get('stamina_gain', 0) - ch.get('stamina_cost', 0)
                    self.player.energy += ch.get('energy_gain', 0) - ch.get('energy_cost', 0)
                    self.player.water_gain = ch.get('water_gain', 0)
                    self.player.hydration += self.player.water_gain
                    self.player.health += ch.get('health_gain', 0) - ch.get('health_cost', 0)
                    self.player.morale += ch.get('morale_gain', 0) - ch.get('morale_cost', 0)
                    self.player.exp += ch.get('exp_gain', 0)
                    
                    if 'loss_item' in ch and ch['loss_item'] in self.player.inventory:
                        self.player.inventory[ch['loss_item']] -= 1
                        if self.player.inventory[ch['loss_item']] <= 0:
                            del self.player.inventory[ch['loss_item']]
                            
                    print(f"\n{ui.GREEN}👉 {ch['success_msg']}{ui.RESET}")
            else:
                print("\nPilihan tidak valid, kamu ragu-ragu dan kehilangan sedikit waktu.")
                self.player.morale -= 5
        except ValueError:
            print("\nPilihan tidak valid.")
            
        self.player.clamp_stats()
        input("\n[Tekan Enter untuk lanjut]")

    def action_inventory(self):
        while True:
            ui.clear_screen()
            total_w = self.player.total_weight(self.items_db)
            print(f"\n{ui.BOLD}🎒 ISI RANSEL CARRIER (Beban: {total_w} kg){ui.RESET}")
            print(f"──────────────────────────────────────────────────────────────────────────────")
            
            item_list = list(self.player.inventory.items())
            if not item_list:
                print("Ranselmu kosong!")
                input("\n[Tekan Enter untuk kembali]")
                break
                
            for idx, (item_id, qty) in enumerate(item_list, 1):
                item = self.items_db.get(item_id)
                if item:
                    cat_badge = f"[{item.category.upper()}]"
                    print(f" {idx:2d}. {ui.BOLD}{item.name:<38}{ui.RESET} x{qty:<2} ({item.weight_kg * qty:.2f} kg) {ui.CYAN}{cat_badge}{ui.RESET}")
                    print(f"     {ui.DIM}{item.description}{ui.RESET}")
                    
            print(f"──────────────────────────────────────────────────────────────────────────────")
            print(" 0. Kembali ke Menu Utama")
            
            pilih = input("\nPilih nomor item untuk digunakan/konsumsi: ").strip()
            if pilih == "0":
                break
            try:
                idx = int(pilih) - 1
                if 0 <= idx < len(item_list):
                    item_id, qty = item_list[idx]
                    item = self.items_db[item_id]
                    self.use_item(item)
                else:
                    print(f"{ui.RED}Pilihan tidak valid!{ui.RESET}")
                    time.sleep(0.7)
            except ValueError:
                pass

    def use_item(self, item: Item):
        if item.category == "gear" and item.is_reusable and item.id not in ["tenda_dome"]:
            print(f"\n{ui.GREEN}Kamu memeriksa & mengenakan {item.name}. Perlengkapan berfungsi optimal.{ui.RESET}")
            self.player.warmth += item.warmth_gain
            self.player.morale += item.morale_gain
            self.player.stamina += item.stamina_gain
            self.player.clamp_stats()
            input("\n[Tekan Enter]")
            return
            
        # Consumables / Meds
        print(f"\nMenggunakan/Mengonsumsi {ui.BOLD}{item.name}{ui.RESET}...")
        self.player.stamina += item.stamina_gain
        self.player.energy += item.energy_gain
        self.player.hydration += item.water_gain
        self.player.warmth += item.warmth_gain
        self.player.health += item.health_gain
        self.player.morale += item.morale_gain
        
        # Specific cures
        if item.id == "obat_ams":
            self.player.is_altitude_sick = False
            print(f"{ui.GREEN}Gejala pusing dan mual AMS berhasil diredakan!{ui.RESET}")
        if item.id == "emergency_blanket":
            self.player.is_hypothermic = False
            print(f"{ui.GREEN}Emergency Blanket memantulkan panas tubuh, menggigil berhenti!{ui.RESET}")
            
        # Deduct quantity
        if not item.is_reusable:
            self.player.inventory[item.id] -= 1
            if self.player.inventory[item.id] <= 0:
                del self.player.inventory[item.id]
                
        self.player.clamp_stats()
        print(f"{ui.GREEN}Efek diterapkan! Kondisi fisikmu membaik.{ui.RESET}")
        input("\n[Tekan Enter]")

    def action_rest(self):
        ui.clear_screen()
        print(f"\n{ui.BOLD}⛺ ISTIRAHAT & PEMULIHAN FISIK{ui.RESET}")
        print("1. Istirahat Singkat Duduk di Batu (30 Menit) - Pulihkan 20 Stamina")
        print("2. Istirahat 2 Jam (Rebahkan Badan) - Pulihkan 45 Stamina & 15 Moral")
        if self.player.is_tent_pitched:
            print("3. Tidur Nyenyak di Dalam Tenda (6 Jam) - Pulihkan Full Stamina, Health & Suhu")
        print("0. Batal")
        
        pilih = input("\nPilihan: ").strip()
        if pilih == "1":
            self.player.stamina += 20
            self.player.morale += 5
            self.advance_time(0.5)
            print(f"\n{ui.GREEN}Duduk sejenak melemaskan otot kaki...{ui.RESET}")
            input("\n[Tekan Enter]")
        elif pilih == "2":
            self.player.stamina += 45
            self.player.morale += 15
            self.advance_time(2.0)
            print(f"\n{ui.GREEN}Berbaring sejenak merefresh tenaga.{ui.RESET}")
            input("\n[Tekan Enter]")
        elif pilih == "3" and self.player.is_tent_pitched:
            self.player.stamina = 100
            self.player.health = min(100, self.player.health + 40)
            self.player.warmth = min(100, self.player.warmth + 50)
            self.player.morale = 100
            self.player.is_hypothermic = False
            self.advance_time(6.0)
            print(f"\n{ui.GREEN}Tidur pulas di dalam sleeping bag & tenda. Tubuhmu kembali segar bugar!{ui.RESET}")
            input("\n[Tekan Enter]")

    def action_camp(self):
        cp = self.player.current_mountain.checkpoints[self.player.current_checkpoint_idx]
        if not cp.can_camp:
            print(f"\n{ui.RED}❌ Lokasi {cp.name} tidak memungkinkan mendirikan tenda (tanah miring/jurang/bukan area camp)!{ui.RESET}")
            input("\n[Tekan Enter]")
            return
            
        if self.player.inventory.get("tenda_dome", 0) <= 0:
            print(f"\n{ui.RED}❌ Kamu tidak membawa tenda dome di ranselmu!{ui.RESET}")
            input("\n[Tekan Enter]")
            return
            
        if self.player.is_tent_pitched:
            print("\nMelipat dan memasukkan kembali tenda dome ke ransel carrier...")
            time.sleep(0.5)
            self.player.is_tent_pitched = False
            self.advance_time(0.5)
            print(f"{ui.GREEN}✅ Tenda berhasil dibongkar dan dirapikan! Siap melanjutkan perjalanan.{ui.RESET}")
        else:
            print("\nMendirikan tenda dome, memasang pasak, dan merentangkan flysheet anti-badai...")
            time.sleep(0.5)
            self.player.is_tent_pitched = True
            self.player.warmth += 20
            self.advance_time(0.5)
            print(f"{ui.GREEN}✅ Tenda berhasil berdiri kokoh! Kamu aman dari terpaan angin luar.{ui.RESET}")
            
        self.player.clamp_stats()
        input("\n[Tekan Enter]")

    def action_cook(self):
        if self.player.inventory.get("kompor_gas", 0) <= 0 or self.player.inventory.get("nesting_set", 0) <= 0:
            print(f"\n{ui.RED}❌ Kamu membutuhkan Kompor Gas dan Nesting Set untuk memasak!{ui.RESET}")
            input("\n[Tekan Enter]")
            return
            
        if self.player.inventory.get("air_mineral", 0) <= 0:
            print(f"\n{ui.RED}❌ Kamu butuh air bersih untuk memasak! Cari mata air atau hemat logistik air.{ui.RESET}")
            input("\n[Tekan Enter]")
            return
            
        print(f"\n{ui.BOLD}🍳 MENU DAPUR ALAM PENDAKI{ui.RESET}")
        print("1. Masak Air Hangat + Seduh Kopi Tubruk Jahe")
        print("2. Rebus Mie Instan Telur Hangat")
        print("3. Masak Nasi Liwet + Dendeng Gurih")
        print("0. Batal")
        
        pilih = input("\nPilih masakan: ").strip()
        if pilih == "1":
            if self.player.inventory.get("kopi_hangat", 0) > 0:
                self.player.inventory["kopi_hangat"] -= 1
                self.player.warmth += 25
                self.player.stamina += 20
                self.player.morale += 25
                self.advance_time(0.4)
                print(f"\n{ui.GREEN}☕ Menyeruput kopi jahe panas di lereng gunung... Badan langsung hangat dan rileks!{ui.RESET}")
            else:
                print(f"{ui.RED}Stok Kopi Tubruk habis!{ui.RESET}")
        elif pilih == "2":
            if self.player.inventory.get("mie_instan", 0) > 0:
                self.player.inventory["mie_instan"] -= 1
                self.player.energy += 35
                self.player.warmth += 20
                self.player.morale += 25
                self.advance_time(0.5)
                print(f"\n{ui.GREEN}🍜 Semangkuk mie rebus hangat berkuah gurih disantap habis. Nikmat tak tertandingi!{ui.RESET}")
            else:
                print(f"{ui.RED}Stok Mie Instan habis!{ui.RESET}")
        elif pilih == "3":
            if self.player.inventory.get("nasi_logistik", 0) > 0:
                self.player.inventory["nasi_logistik"] -= 1
                self.player.energy += 70
                self.player.stamina += 40
                self.player.health += 15
                self.player.morale += 35
                self.advance_time(0.8)
                print(f"\n{ui.GREEN}🍛 Nasi liwet dendeng matang sempurna! Tenaga terisi penuh 100%!{ui.RESET}")
            else:
                print(f"{ui.RED}Stok Nasi Logistik habis!{ui.RESET}")
                
        self.player.clamp_stats()
        input("\n[Tekan Enter]")

    def action_show_route_info(self):
        ui.clear_screen()
        mountain = self.player.current_mountain
        print(f"\n{ui.BOLD}🗺️ PETA ELEVASI & RUTE JALUR: {mountain.name}{ui.RESET}")
        print(f"Lokasi: {mountain.location} | Kesulitan: {mountain.difficulty}")
        print(f"──────────────────────────────────────────────────────────────────────────────")
        
        for idx, cp in enumerate(mountain.checkpoints):
            is_here = (idx == self.player.current_checkpoint_idx)
            indicator = f"{ui.GREEN}▶ [KAMU DI SINI]{ui.RESET}" if is_here else " "
            camp_icon = "🏕️" if cp.can_camp else "  "
            water_icon = "💧" if cp.has_water_source else "  "
            
            print(f" {idx+1}. {cp.name:<32} {cp.elevation_mdpl:>4} mdpl {camp_icon} {water_icon} {indicator}")
            print(f"    {ui.DIM}Dist: +{cp.distance_km_from_prev} km | Gain: +{cp.elevation_gain_m}m | {cp.description}{ui.RESET}")
            
        print(f"──────────────────────────────────────────────────────────────────────────────")
        print("Keterangan: 🏕️ = Pos Boleh Camp | 💧 = Ada Sumber Mata Air")
        input("\n[Tekan Enter untuk kembali]")

    def save_game(self):
        if not self.player:
            return
        data = {
            "name": self.player.name,
            "level": self.player.level,
            "exp": self.player.exp,
            "health": self.player.health,
            "stamina": self.player.stamina,
            "energy": self.player.energy,
            "hydration": self.player.hydration,
            "warmth": self.player.warmth,
            "morale": self.player.morale,
            "inventory": self.player.inventory,
            "mountain_id": self.player.current_mountain.id,
            "checkpoint_idx": self.player.current_checkpoint_idx,
            "hours_elapsed": self.player.hours_elapsed,
            "is_tent_pitched": self.player.is_tent_pitched
        }
        with open(SAVE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"\n{ui.GREEN}💾 Game berhasil disimpan ke {SAVE_FILE}!{ui.RESET}")
        input("\n[Tekan Enter]")

    def load_game(self) -> bool:
        if not os.path.exists(SAVE_FILE):
            print(f"\n{ui.RED}File save tidak ditemukan!{ui.RESET}")
            time.sleep(1)
            return False
            
        with open(SAVE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        mountain = self.mountain_db.get(data["mountain_id"], MOUNTAINS[0])
        self.player = Player(
            name=data["name"],
            level=data.get("level", 1),
            exp=data.get("exp", 0),
            health=data["health"],
            stamina=data["stamina"],
            energy=data["energy"],
            hydration=data["hydration"],
            warmth=data["warmth"],
            morale=data["morale"],
            inventory=data["inventory"],
            current_mountain=mountain,
            current_checkpoint_idx=data["checkpoint_idx"],
            hours_elapsed=data["hours_elapsed"],
            is_tent_pitched=data.get("is_tent_pitched", False)
        )
        self.update_weather()
        print(f"\n{ui.GREEN}✅ Data pendakian {self.player.name} di {mountain.name} berhasil dimuat!{ui.RESET}")
        time.sleep(1)
        return True

    def main_loop(self):
        while self.running and self.player and self.player.is_alive():
            ui.clear_screen()
            ui.display_hud(self.player, self.weather)
            
            # Action Menu
            print(f"\n{ui.BOLD}PILIHAN AKSI PENDAKI:{ui.RESET}")
            print(" 1. 🥾 Melanjutkan Pendakian ke Pos Berikutnya")
            print(" 2. 🎒 Buka Ransel & Gunakan Item Logistik/Medis")
            print(" 3. ⛺ Istirahat & Pulihkan Stamina")
            print(" 4. 🍳 Masak Air Panas / Makanan Hangat")
            camp_label = "Bongkar Tenda" if self.player.is_tent_pitched else "Dirikan Tenda Camp"
            print(f" 5. 🏕️  {camp_label}")
            print(" 6. 🗺️  Lihat Peta Rute & Profil Elevasi")
            print(" 7. 💾 Simpan Game (Save)")
            print(" 0. 🚪 Keluar ke Menu Utama")
            
            pilih = input(f"\n{ui.CYAN}Masukkan nomor aksi: {ui.RESET}").strip()
            
            if pilih == "1":
                self.action_trek_next_pos()
            elif pilih == "2":
                self.action_inventory()
            elif pilih == "3":
                self.action_rest()
            elif pilih == "4":
                self.action_cook()
            elif pilih == "5":
                self.action_camp()
            elif pilih == "6":
                self.action_show_route_info()
            elif pilih == "7":
                self.save_game()
            elif pilih == "0":
                break
                
            # Check Death Conditions
            if self.player.health <= 0:
                ui.clear_screen()
                print(f"\n{ui.BG_RED}{ui.WHITE}{ui.BOLD}               GAME OVER - EVAKUASI DARURAT SAR                {ui.RESET}")
                print(f"\n{ui.RED}Kondisi fisikmu kritis (Health habis). Tim SAR lereng gunung menjemputmu untuk evakuasi.{ui.RESET}")
                print(f"Jangan berkecil hati, gunung tidak akan kemana-mana. Pulihkan diri dan siapkan fisik serta logistik lebih matang!")
                input("\n[Tekan Enter untuk kembali]")
                break
