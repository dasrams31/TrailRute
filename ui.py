"""
UI, ASCII Art, and Terminal Display Formatting for TrailRute RPG
"""

import os
import sys

# ANSI Colors
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"
WHITE = "\033[37m"
BG_BLUE = "\033[44m"
BG_GREEN = "\033[42m"
BG_RED = "\033[41m"

def clear_screen():
    # If in standard terminal
    os.system('cls' if os.name == 'nt' else 'clear')

def print_banner():
    banner = f"""
{CYAN}{BOLD}
  ╔═══════════════════════════════════════════════════════════════╗
  ║    _____           _ _ _____       _                          ║
  ║   |_   _| __ __ _ (_) |  __ \\ _   _| |_ ___                   ║
  ║     | || '__/ _` || | | |__) | | | | __/ _ \\                  ║
  ║     | || | | (_| || | |  _  /| |_| | ||  __/                  ║
  ║     |_||_|  \\__,_||_|_|_| \\_\\ \\__,_|\\__\\___|                  ║
  ║                                                               ║
  ║       ⛰️  EKSPEDISI PENDAKIAN GUNUNG PULAU JAWA  ⛰️           ║
  ║           Survival, Navigasi, Logistik & Cuaca                ║
  ╚═══════════════════════════════════════════════════════════════╝
{RESET}"""
    print(banner)

def print_summit_art(mountain_name: str, elevation: int):
    art = f"""
{YELLOW}{BOLD}
                ▲
               / \\
              /   \\          ☀️  GOLDEN SUNRISE ☀️
             /  ▲  \\
            /  / \\  \\       ☁️  Lautan Awan Putih ☁️
           /  /   \\  \\
          /  /  ▲  \\  \\
   ══════╩══╩═══╩══╩══╩══════════════════════════════════════════════
     SELAMAT! KAMU TELAH MENCAPAI PUNCAK TERTINGGI!
     🏆 {mountain_name.upper()} ({elevation} mdpl)
   ══════════════════════════════════════════════════════════════════
{RESET}"""
    print(art)

def stat_bar(value: int, max_val: int = 100, length: int = 15, color: str = GREEN) -> str:
    clamped = max(0, min(max_val, value))
    filled_len = int(length * (clamped / max_val))
    bar = "█" * filled_len + "░" * (length - filled_len)
    
    # Auto color based on value if default
    if clamped < 25:
        c = RED
    elif clamped < 50:
        c = YELLOW
    else:
        c = color
        
    return f"{c}{bar}{RESET} {clamped:>3}/{max_val}"

def display_hud(player, weather):
    print(f"\n{BOLD}══════════════════════════════════════════════════════════════════════════════{RESET}")
    print(f" 🥾 {BOLD}{player.name}{RESET} | Lv.{player.level} (EXP: {player.exp}) | Waktu: {player.hours_elapsed:.1f} Jam di Gunung")
    if player.current_mountain:
        curr_cp = player.current_mountain.checkpoints[player.current_checkpoint_idx]
        print(f" 📍 Lokasi: {CYAN}{player.current_mountain.name}{RESET} -> {BOLD}{curr_cp.name}{RESET} ({curr_cp.elevation_mdpl} mdpl)")
    print(f"──────────────────────────────────────────────────────────────────────────────")
    
    # Status Bars Row 1
    h_bar = stat_bar(player.health, 100, 12, RED)
    s_bar = stat_bar(player.stamina, 100, 12, GREEN)
    e_bar = stat_bar(player.energy, 100, 12, YELLOW)
    print(f" ❤️  Health   : {h_bar}  │  ⚡ Stamina : {s_bar}  │  🍞 Nutrisi : {e_bar}")
    
    # Status Bars Row 2
    w_bar = stat_bar(player.hydration, 100, 12, BLUE)
    t_bar = stat_bar(player.warmth, 100, 12, MAGENTA)
    m_bar = stat_bar(player.morale, 100, 12, CYAN)
    print(f" 💧 Hidrasi  : {w_bar}  │  🔥 Suhu Bdn: {t_bar}  │  🧠 Mental  : {m_bar}")
    print(f"──────────────────────────────────────────────────────────────────────────────")
    
    # Weather & Warning HUD
    if weather:
        w_icon = "☀️" if "Cerah" in weather.condition else ("🌧️" if "Hujan" in weather.condition else "🌫️")
        risk_color = RED if "EKSTREM" in weather.hypothermia_risk or "TINGGI" in weather.hypothermia_risk else GREEN
        print(f" ⛅ Cuaca: {w_icon} {weather.condition} | Suhu: {weather.temp_c}°C (Wind Chill: {weather.wind_chill_c}°C) | Angin: {weather.wind_kmh} km/h")
        print(f" ⚠️  Risiko Hipotermia: {risk_color}{weather.hypothermia_risk}{RESET}")
        
    # Condition Badges
    badges = []
    if player.is_tent_pitched:
        badges.append(f"{GREEN}[🏕️ TENDA TERPASANG]{RESET}")
    if player.is_hypothermic:
        badges.append(f"{RED}{BOLD}[⚠️ MENGGIGIL HIPOTERMIA]{RESET}")
    if player.is_altitude_sick:
        badges.append(f"{YELLOW}[⚠️ GEJALA AMS (PUSING)]{RESET}")
        
    if badges:
        print(f" Status: {' '.join(badges)}")
    print(f"{BOLD}══════════════════════════════════════════════════════════════════════════════{RESET}")

def print_box(title: str, text: str, color: str = WHITE):
    lines = text.split("\n")
    max_w = max(len(title) + 4, max((len(l) for l in lines), default=40))
    max_w = min(max_w, 74)
    
    print(f"{color}┌─ {BOLD}{title}{RESET}{color} " + "─" * (max_w - len(title) - 4) + "┐")
    for line in lines:
        print(f"│ {line:<{max_w-2}} │")
    print("└" + "─" * max_w + f"┘{RESET}")
