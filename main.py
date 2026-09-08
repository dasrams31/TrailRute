"""
TrailRute - RPG Pendakian Gunung Pulau Jawa
Main Entry Point
"""

import sys
import time
import os

from game_engine import GameEngine
from data import MOUNTAINS
import ui

def select_mountain():
    ui.clear_screen()
    print(f"\n{ui.BOLD}🏔️ PILIH DESTINASI PENDAKIAN GUNUNG:{ui.RESET}")
    print(f"──────────────────────────────────────────────────────────────────────────────")
    for idx, m in enumerate(MOUNTAINS, 1):
        diff_color = ui.GREEN if m.difficulty == "Pemula" else (ui.YELLOW if m.difficulty == "Menengah" else ui.RED)
        print(f" {idx}. {ui.BOLD}{m.name:<45}{ui.RESET} [{diff_color}{m.difficulty}{ui.RESET}]")
        print(f"    Lokasi: {m.location} | Ketinggian: {m.elevation_mdpl} mdpl")
        print(f"    {ui.DIM}{m.description}{ui.RESET}\n")
    print(f"──────────────────────────────────────────────────────────────────────────────")
    print(" 0. Kembali")
    
    while True:
        pilih = input("\nPilih nomor gunung (1-5): ").strip()
        if pilih == "0":
            return None
        try:
            val = int(pilih) - 1
            if 0 <= val < len(MOUNTAINS):
                return MOUNTAINS[val].id
            else:
                print(f"{ui.RED}Pilihan tidak ada.{ui.RESET}")
        except ValueError:
            print(f"{ui.RED}Input angka valid.{ui.RESET}")

def show_guide():
    ui.clear_screen()
    print(f"\n{ui.BOLD}📖 ENSIKLOPEDIA & PANDUAN SURVIVAL PENDAKIAN JAWA{ui.RESET}")
    print(f"──────────────────────────────────────────────────────────────────────────────")
    print(f"""
 1. ⚡ SISTEM STAMINA & WAKTU (ATURAN NAISMITH):
    - Waktu mendaki dihitung realistis berdasarkan jarak mendatar dan kenaikan elevasi.
    - Tas ransel yang terlalu berat dan stamina rendah akan memperlambat tempo jalan.

 2. ❄️ SUHU, ANGIN (WIND CHILL) & HIPOTERMIA:
    - Semakin tinggi pos pendakian, suhu udara akan semakin dingin (lapse rate ~0.65°C/100m).
    - Kecepatan angin di puncak/sabana melipatgandakan dingin (Wind Chill effect).
    - Bila Suhu Tubuh (Warmth) di bawah 25%, kamu akan mengalami Hipotermia yang menguras Health.
    - Gunakan Jaket Down, Sleeping Bag di dalam Tenda, atau Emergency Blanket saat darurat!

 3. 💧 AIR & NUTRISI (ENERGY):
    - Dehidrasi membuat stamina cepat habis dan tubuh mudah lemas.
    - Selalu isi air di Pos yang memiliki sumber mata air dan masak logistik hangat.

 4. 🏕️ MANAJEMEN CAMP:
    - Hanya dirikan tenda di Pos yang memiliki izin/zona camp aman.
    - Jangan lupa membongkar dan melipat tenda sebelum melanjutkan perjalanan summit!
    """)
    print(f"──────────────────────────────────────────────────────────────────────────────")
    input("\n[Tekan Enter untuk kembali ke menu utama]")

def main():
    engine = GameEngine()
    
    while True:
        ui.clear_screen()
        ui.print_banner()
        print(f" 1. 🥾 Mulai Ekspedisi Pendakian Baru")
        print(f" 2. 📂 Lanjutkan Pendakian Terakhir (Load Save)")
        print(f" 3. 📖 Panduan Survival & Ensiklopedia Jalur")
        print(f" 0. 🚪 Keluar Game")
        
        pilihan = input(f"\n{ui.CYAN}Pilih menu (0-3): {ui.RESET}").strip()
        
        if pilihan == "1":
            ui.clear_screen()
            nama = input(f"\n{ui.BOLD}Masukkan nama pendaki / panggilanmu: {ui.RESET}").strip()
            if not nama:
                nama = "Pendaki Petualang"
                
            mountain_id = select_mountain()
            if mountain_id:
                engine.new_game(nama, mountain_id)
                engine.main_loop()
        elif pilihan == "2":
            if engine.load_game():
                engine.main_loop()
        elif pilihan == "3":
            show_guide()
        elif pilihan == "0":
            print(f"\n{ui.GREEN}Sampai jumpa di jalur pendakian berikutnya! Salam Lestari! 🌲{ui.RESET}\n")
            break

if __name__ == "__main__":
    main()
