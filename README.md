# ⛰️ TrailRute - Game Pendakian Gunung Pulau Jawa (Terminal & 3D Web)

**TrailRute** hadir dalam dua mode permainan:
1. **Mode 3D Web Interaktif (Three.js / WebGL)**: Eksplorasi first-person 3D menapaki punggungan gunung, sabana, hutan pinus, dan puncak di atas lautan awan (*Sea of Clouds*).
2. **Mode RPG CLI / Terminal**: Simulasi manajemen survival berbasis teks dengan kalkulasi waktu Naismith, cuaca Open-Meteo & NOAA Wind Chill.

---

## 🎮 1. Menjalankan Game 3D Web (Three.js)

Jalankan server web lokal:
```bash
python3 serve.py
```
Lalu buka browser di: **`http://localhost:8000`**

### Fitur 3D Web:
- **First-Person Controller:** Bergerak menelusuri kontur lereng gunung secara *real-time* (W, A, S, D + Mouse Look).
- **Prosedural Gunung Jawa:** Gunung Prau, Gunung Merbabu, dan Gunung Sumbing dengan ketinggian mdpl dinamis.
- **Vegetasi Hutan & Sabana:** Hutan pinus di lereng bawah, padang sabana, dan bunga edelweiss di zona atas.
- **Sistem Pasang Tenda 3D:** Tekan tombol **[C]** untuk mendirikan Tenda Dome oranye saat cuaca buruk atau di pos camp.
- **Headlamp Spot:** Tekan tombol **[F]** untuk menyalakan sorot lampu kepala saat kabut/malam.
- **HUD Survival:** Pemantauan *Health, Stamina, Suhu Badan (Warmth), & Hidrasi* serta kalkulasi *Wind Chill*.

---

## 💻 2. Menjalankan Mode RPG Terminal / CLI

Jalankan game berbasis terminal:
```bash
python3 main.py
```

---
*Salam Lestari! 🌲*
