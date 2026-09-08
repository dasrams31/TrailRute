"""
Game Database: Mountains, Items, and Encounters for TrailRute RPG
"""

from typing import Dict, List
from models import Item, Mountain, Checkpoint

# ==========================================================
# ITEMS DATABASE
# ==========================================================
ITEMS: Dict[str, Item] = {
    # PERLENGKAPAN UTAMA (GEAR)
    "tenda_dome": Item(
        id="tenda_dome",
        name="Tenda Dome 2P (Double Layer)",
        category="gear",
        weight_kg=2.2,
        description="Melindungi dari angin kencang dan hujan badai saat bermalam di pos camp.",
        warmth_gain=25,
        morale_gain=15,
        is_reusable=True
    ),
    "sleeping_bag": Item(
        id="sleeping_bag",
        name="Sleeping Bag Bulu Angsa",
        category="gear",
        weight_kg=0.9,
        description="Menjaga suhu tubuh tetap hangat saat istirahat malam.",
        warmth_gain=30,
        is_reusable=True
    ),
    "matras_foil": Item(
        id="matras_foil",
        name="Matras Aluminium Foil",
        category="gear",
        weight_kg=0.3,
        description="Isolator tanah agar dingin bumi tidak menyerap panas tubuh.",
        warmth_gain=10,
        is_reusable=True
    ),
    "jaket_down": Item(
        id="jaket_down",
        name="Jaket Down Ultralight Windproof",
        category="gear",
        weight_kg=0.4,
        description="Pakaian penahan angin dan suhu beku puncak.",
        warmth_gain=20,
        is_reusable=True
    ),
    "jas_hujan": Item(
        id="jas_hujan",
        name="Jas Hujan Ponco 3-in-1",
        category="gear",
        weight_kg=0.5,
        description="Mencegah pakaian basah kuyup saat badai hujan di trek.",
        warmth_gain=5,
        is_reusable=True
    ),
    "kompor_gas": Item(
        id="kompor_gas",
        name="Kompor Mini Ultralight & Canister Gas",
        category="gear",
        weight_kg=0.6,
        description="Alat memasak air hangat dan makanan bernutrisi di jalur.",
        is_reusable=True
    ),
    "nesting_set": Item(
        id="nesting_set",
        name="Nesting Cookset Aluminium",
        category="gear",
        weight_kg=0.4,
        description="Panci serbaguna untuk memasak dan merebus air.",
        is_reusable=True
    ),
    "headlamp": Item(
        id="headlamp",
        name="Headlamp LED Rechargeable",
        category="gear",
        weight_kg=0.15,
        description="Wajib untuk summit attack dini hari atau navigasi malam.",
        morale_gain=10,
        is_reusable=True
    ),
    "trekking_pole": Item(
        id="trekking_pole",
        name="Sepasang Trekking Pole",
        category="gear",
        weight_kg=0.45,
        description="Mengurangi beban lutut 25% saat tanjakan dan turunan curam.",
        stamina_gain=10,
        is_reusable=True
    ),
    "emergency_blanket": Item(
        id="emergency_blanket",
        name="Emergency Thermal Blanket",
        category="med",
        weight_kg=0.08,
        description="Selimut darurat pemantul 90% radiasi panas tubuh (Penyelamat Hipotermia).",
        warmth_gain=45,
        health_gain=15,
        morale_gain=20
    ),

    # LOGISTIK & KONSUMSI (FOOD & DRINK)
    "air_mineral": Item(
        id="air_mineral",
        name="Air Mineral 1.5 Liter",
        category="drink",
        weight_kg=1.5,
        description="Air bersih untuk rehidrasi tubuh sepanjang perjalanan.",
        water_gain=40,
        stamina_gain=5
    ),
    "oralit_sachet": Item(
        id="oralit_sachet",
        name="Oralit Elektrolit Sachet",
        category="drink",
        weight_kg=0.02,
        description="Mencegah kram otot dan dehidrasi akut.",
        water_gain=30,
        stamina_gain=15,
        health_gain=5
    ),
    "kopi_hangat": Item(
        id="kopi_hangat",
        name="Kopi Tubruk Jahe Sachet",
        category="drink",
        weight_kg=0.03,
        description="Minuman hangat pembangkit stamina dan moral di tengah dingin.",
        stamina_gain=15,
        energy_gain=10,
        warmth_gain=15,
        morale_gain=15
    ),
    "mie_instan": Item(
        id="mie_instan",
        name="Mie Instan Kuah Rebus",
        category="food",
        weight_kg=0.1,
        description="Makanan hangat klasik pendaki, lezat dan memberi kalori instan.",
        energy_gain=30,
        warmth_gain=15,
        morale_gain=20
    ),
    "nasi_logistik": Item(
        id="nasi_logistik",
        name="Nasi Liwet + Dendeng Kering",
        category="food",
        weight_kg=0.35,
        description="Makanan berat kaya karbohidrat & protein untuk pulihkan tenaga maksimal.",
        energy_gain=60,
        stamina_gain=35,
        health_gain=10,
        morale_gain=25
    ),
    "cokelat_energy": Item(
        id="cokelat_energy",
        name="Cokelat Hitam & Energy Bar",
        category="food",
        weight_kg=0.1,
        description="Camilan praktis saat trekking tanpa perlu masak.",
        energy_gain=25,
        stamina_gain=15,
        morale_gain=10
    ),
    "madu_sachet": Item(
        id="madu_sachet",
        name="Madu Murni Sachet",
        category="food",
        weight_kg=0.03,
        description="Glukosa alami cepat serap pencegah lemas di tanjakan.",
        energy_gain=20,
        stamina_gain=10,
        health_gain=5
    ),

    # MEDIS & P3K (MED)
    "p3k_kit": Item(
        id="p3k_kit",
        name="P3K Kit Lengkap (Kassa, Betadine, Perban)",
        category="med",
        weight_kg=0.25,
        description="Mengobati luka lecet, terkilir, atau goresan ranting.",
        health_gain=30,
        morale_gain=10
    ),
    "obat_ams": Item(
        id="obat_ams",
        name="Obat AMS (Acetazolamide & Paracetamol)",
        category="med",
        weight_kg=0.02,
        description="Meredakan pusing akut akibat ketinggian (Acute Mountain Sickness).",
        health_gain=25,
        stamina_gain=15,
        morale_gain=20
    ),
    "minyak_kayu_putih": Item(
        id="minyak_kayu_putih",
        name="Minyak Kayu Putih / Balsem Hangat",
        category="med",
        weight_kg=0.08,
        description="Menghangatkan dada, meredakan mual dan kram otot.",
        warmth_gain=12,
        morale_gain=8
    )
}

# ==========================================================
# MOUNTAINS DATABASE
# ==========================================================
MOUNTAINS: List[Mountain] = [
    Mountain(
        id="prau",
        name="Gunung Prau (2.565 mdpl) - Via Patakbanteng",
        elevation_mdpl=2565,
        location="Wonosobo, Jawa Tengah",
        difficulty="Pemula",
        description="Gunung ramah pemula dengan pemandangan bukit Teletubbies dan Golden Sunrise menghadap Sindoro-Sumbing.",
        base_temp_c=16.0,
        wind_intensity_base=12,
        checkpoints=[
            Checkpoint("basecamp", "Basecamp Patakbanteng", 1700, 0.0, 0, 1.0, True, False, "Pintu gerbang registrasi & warung lokal."),
            Checkpoint("pos1", "Pos 1 (Sikuwuk)", 1900, 1.0, 200, 1.2, False, False, "Jalur tangga semen dan ladang sayur warga."),
            Checkpoint("pos2", "Pos 2 (Canggal)", 2120, 1.1, 220, 1.4, True, True, "Mulai masuk batas vegetasi hutan pinus yang rindang."),
            Checkpoint("pos3", "Pos 3 (Cacingan)", 2350, 0.9, 230, 1.7, False, False, "Tanjakan akar tanah curam yang licin saat basah."),
            Checkpoint("camp", "Plawangan Camp Area", 2540, 0.8, 190, 1.1, False, True, "Hamparan bukit sabana tempat mendirikan tenda."),
            Checkpoint("summit", "Puncak 2.565 mdpl (Sunrise View)", 2565, 0.4, 25, 1.0, False, False, "Titik tertinggi dengan panorama Sindoro Sumbing spektakuler.")
        ]
    ),
    Mountain(
        id="merbabu",
        name="Gunung Merbabu (3.145 mdpl) - Via Selo",
        elevation_mdpl=3145,
        location="Boyolali, Jawa Tengah",
        difficulty="Menengah",
        description="Jalur primadona dengan pemandangan sabana hijau luas berundak dan pemandangan megah Gunung Merapi di seberang.",
        base_temp_c=14.0,
        wind_intensity_base=20,
        checkpoints=[
            Checkpoint("basecamp", "Basecamp Selo", 1830, 0.0, 0, 1.0, True, False, "Basecamp awal, udara sejuk Boyolali."),
            Checkpoint("pos1", "Pos 1 (Dok-dok-an)", 2150, 1.8, 320, 1.2, False, False, "Jalur setapak hutan pinus landai."),
            Checkpoint("pos2", "Pos 2 (Pandean)", 2410, 1.5, 260, 1.4, True, False, "Tempat istirahat teduh, ada pos shelter."),
            Checkpoint("pos3", "Pos 3 (Batu Tulis)", 2590, 1.4, 180, 1.5, False, True, "Batas hutan menuju hamparan terbuka, angin mulai kencang."),
            Checkpoint("pos4", "Sabana 1", 2770, 1.2, 180, 1.6, False, True, "Lembah sabana indah dengan rumput ilalang."),
            Checkpoint("pos5", "Sabana 2 (Camp Utama)", 2880, 1.0, 110, 1.3, False, True, "Tempat camp terfavorit beratap langit bintang."),
            Checkpoint("summit", "Puncak Kenteng Songo (3.145 mdpl)", 3145, 1.3, 265, 1.8, False, False, "Puncak tertinggi dengan batu berlubang sembilan legendaris.")
        ]
    ),
    Mountain(
        id="sumbing",
        name="Gunung Sumbing (3.371 mdpl) - Via Garung",
        elevation_mdpl=3371,
        location="Wonosobo, Jawa Tengah",
        difficulty="Menantang",
        description="Gunung gagah dengan jalur berbatu terjal, kawah belerang aktif, dan rute ikonik Batu Kotak & Pasar Setan.",
        base_temp_c=12.0,
        wind_intensity_base=25,
        checkpoints=[
            Checkpoint("basecamp", "Basecamp Garung", 1450, 0.0, 0, 1.0, True, False, "Basecamp bersejarah jalur klasik Sumbing."),
            Checkpoint("pos1", "Pos 1 (Malim)", 1800, 2.2, 350, 1.2, True, False, "Bisa dijangkau ojek ladang atau jalan setapak berbatu."),
            Checkpoint("pos2", "Pos 2 (Gedad)", 2200, 1.6, 400, 1.5, True, False, "Pondok istirahat di tengah lebatnya vegetasi."),
            Checkpoint("pos3", "Pos 3 (Pestran)", 2550, 1.5, 350, 1.8, False, True, "Tempat mendirikan tenda sebelum tanjakan terjal."),
            Checkpoint("pos4", "Pasar Setan / Batu Kotak", 2950, 1.4, 400, 2.0, False, True, "Tanjakan ekstrem berbatu curam terbuka dengan angin kencang."),
            Checkpoint("summit", "Puncak Rajawali & Kawah (3.371 mdpl)", 3371, 1.1, 421, 2.2, False, False, "Titik tertinggi Sumbing dengan bibir kawah spektakuler.")
        ]
    ),
    Mountain(
        id="slamet",
        name="Gunung Slamet (3.428 mdpl) - Via Bambangan",
        elevation_mdpl=3428,
        location="Purbalingga, Jawa Tengah",
        difficulty="Hardcore",
        description="Atap Jawa Tengah dengan 9 pos trekking, hutan lumut lebat, dan tanjakan pasir lava merah berdebu di batas vegetasi.",
        base_temp_c=11.0,
        wind_intensity_base=28,
        checkpoints=[
            Checkpoint("basecamp", "Basecamp Bambangan", 1500, 0.0, 0, 1.0, True, False, "Basecamp desa tertinggi lereng Slamet."),
            Checkpoint("pos1", "Pos 1 (Pondok Gemilung)", 1940, 2.0, 440, 1.3, True, False, "Pondokan kayu di tepi kebun sayur."),
            Checkpoint("pos3", "Pos 3 (Pondok Cemara)", 2510, 2.2, 570, 1.6, False, True, "Trek tanah padat menanjak konstan."),
            Checkpoint("pos5", "Pos 5 (Samarantu)", 2795, 1.5, 285, 1.7, True, True, "Pos legendaris dengan mata air dan cerita mistis pendaki."),
            Checkpoint("pos7", "Pos 7 (Pondok Samyang)", 3020, 1.2, 225, 1.8, False, True, "Batas hutan cantigi sebelum zona terbuka."),
            Checkpoint("pos9", "Pos 9 (Plawangan)", 3210, 0.9, 190, 1.9, False, True, "Batas vegetasi, angin sangat menusuk tulang."),
            Checkpoint("summit", "Puncak Surono & Kawah Segoro Wedi (3.428 mdpl)", 3428, 1.0, 218, 2.4, False, False, "Tanjakan pasir merah terjal 45 derajat menuju atap Jawa Tengah.")
        ]
    ),
    Mountain(
        id="lawu",
        name="Gunung Lawu (3.265 mdpl) - Via Candi Cetho",
        elevation_mdpl=3265,
        location="Karanganyar, Jawa Tengah",
        difficulty="Menengah",
        description="Jalur mistis nan indah melewati candi kuno, sabana Bulak Peperangan, Gupakan Menjangan, hingga Warung Mbok Yem.",
        base_temp_c=13.0,
        wind_intensity_base=18,
        checkpoints=[
            Checkpoint("basecamp", "Basecamp Candi Cetho", 1450, 0.0, 0, 1.0, True, False, "Kawasan candi Hindu megah di lereng Lawu."),
            Checkpoint("pos1", "Pos 1 (Mbah Branti)", 1750, 1.8, 300, 1.2, False, False, "Hutan pinus berundak."),
            Checkpoint("pos3", "Pos 3 (Penggik)", 2250, 2.1, 500, 1.5, True, True, "Ada shelter dan sumber air di dekat jurang."),
            Checkpoint("pos5", "Pos 5 (Bulak Peperangan)", 2850, 2.4, 600, 1.4, False, True, "Sabana savana magis yang sangat luas."),
            Checkpoint("gupakan", "Gupakan Menjangan", 2950, 1.0, 100, 1.2, True, True, "Danau musiman tempat rusa gunung berteduh."),
            Checkpoint("mbok_yem", "Hargo Dalem (Warung Mbok Yem)", 3150, 1.2, 200, 1.3, True, True, "Warung tertinggi di Indonesia, sajian nasi pecel legendaris."),
            Checkpoint("summit", "Puncak Hargo Dumilah (3.265 mdpl)", 3265, 0.6, 115, 1.6, False, False, "Puncak tertinggi Lawu dengan tugu bersejarah.")
        ]
    )
]

# ==========================================================
# RANDOM EVENTS & ENCOUNTERS
# ==========================================================
EVENTS = [
    {
        "id": "kabut_pekat",
        "title": "Kabut Tebal & Turun Suhu Mendadak",
        "type": "hazard",
        "description": "Kabut putih tebal turun menutup jarak pandang hanya 2 meter. Angin dingin mulai menusuk tulang.",
        "choices": [
            {"text": "Nyalakan Headlamp & Jalan Perlahan (Pakai Trekking Pole)", "req_item": "headlamp", "stamina_cost": 10, "morale_cost": 0, "success_msg": "Dengan headlamp, jalur tetap terlihat jelas dan kamu tidak tersesat."},
            {"text": "Bungkus Diri dengan Emergency Blanket & Diam Sesaat", "req_item": "emergency_blanket", "warmth_gain": 20, "morale_gain": 10, "success_msg": "Suhu tubuhmu tetap aman sampai kabut sedikit terangkat."},
            {"text": "Nekat Lanjut Jalan Cepat Tanpa Alat", "req_item": None, "stamina_cost": 25, "warmth_cost": 20, "health_cost": 15, "morale_cost": 15, "success_msg": "Kamu tergelincir di akar pohon dan kedinginan karena panik!"}
        ]
    },
    {
        "id": "ketemu_porter",
        "title": "Bertemu Porter Senior yang Ramah",
        "type": "encounter",
        "description": "Seorang porter lokal membawa bronjong menyapamu dengan senyum hangat dan menawarkan wedang jahe panas.",
        "choices": [
            {"text": "Terima tawaran wedang jahe & dengarkan nasihat jalur", "req_item": None, "warmth_gain": 25, "energy_gain": 15, "morale_gain": 25, "success_msg": "Wedang jahe membuat badan segar dan kamu dapat tips jalur aman!"},
            {"text": "Beri tip makanan biskuit sebagai rasa terima kasih", "req_item": "cokelat_energy", "morale_gain": 35, "stamina_gain": 10, "success_msg": "Porter sangat senang dan membantumu membawakan sedikit beban tas!"}
        ]
    },
    {
        "id": "monyet_nakal",
        "title": "Kawanan Monyet Ekor Panjang Mendekat",
        "type": "hazard",
        "description": "Monyet hutan yang lincah mengincar kantong logistik di bagian luar ranselmu!",
        "choices": [
            {"text": "Gunakan Trekking Pole untuk Menggertak tanpa Menyakiti", "req_item": "trekking_pole", "morale_gain": 10, "success_msg": "Monyet mundur teratur melihat tongkatmu yang panjang."},
            {"text": "Lempar sedikit biskuit untuk mengalihkan perhatian", "req_item": "cokelat_energy", "morale_cost": 5, "success_msg": "Monyet mengambil biskuit dan lari ke dahan pohon."},
            {"text": "Panik dan Berteriak", "req_item": None, "morale_cost": 15, "stamina_cost": 10, "loss_item": "madu_sachet", "success_msg": "Satu sachet madu berhasil dicuri oleh monyet saat kamu panik!"}
        ]
    },
    {
        "id": "mata_air_segar",
        "title": "Menemukan Guyuran Mata Air Alami",
        "type": "benefit",
        "description": "Di sela bebatuan lereng, mengalir air jernih dan sangat dingin dari akar pepohonan pegunungan.",
        "choices": [
            {"text": "Isi penuh botol air mineral dan basuh wajah", "req_item": None, "water_gain": 40, "morale_gain": 20, "stamina_gain": 10, "success_msg": "Semua botol airmu terisi penuh, kesegaran air gunung memulihkan energimu!"},
            {"text": "Rebus air panas dan bikin kopi jahe hangat", "req_item": "kompor_gas", "warmth_gain": 30, "energy_gain": 20, "morale_gain": 30, "success_msg": "Menikmati kopi jahe panas di tepi sumber mata air... nikmat tiada tara!"}
        ]
    },
    {
        "id": "pendaki_kram",
        "title": "Membantu Pendaki Lain yang Kram Kaki",
        "type": "moral_choice",
        "description": "Di tepi jalur, kamu melihat pendaki pemula meringis kesakitan memegang betisnya yang kram hebat.",
        "choices": [
            {"text": "Berikan Oralit Elektrolit & Oleskan Minyak Kayu Putih", "req_item": "oralit_sachet", "morale_gain": 40, "exp_gain": 50, "success_msg": "Kramnya mereda! Pendaki itu sangat berterima kasih dan mendoakan keselamatanmu."},
            {"text": "Bantu peregangan otot dan semangati", "req_item": None, "stamina_cost": 10, "morale_gain": 20, "exp_gain": 25, "success_msg": "Ototnya perlahan rileks setelah dibantu peregangan statis."},
            {"text": "Abaikan dan fokus pada ritme jalan sendiri", "req_item": None, "morale_cost": 25, "success_msg": "Kamu merasa sedikit bersalah meninggalkannya begitu saja."}
        ]
    },
    {
        "id": "sunrise_sabana",
        "title": "Momen Golden Sunrise di Atas Lautan Awan",
        "type": "benefit",
        "description": "Matahari terbit perlahan menyinari lautan awan putih di bawah kakimu dengan semburat jingga keemasan.",
        "choices": [
            {"text": "Berhenti sejenak, tarik napas dalam & bersyukur", "req_item": None, "morale_gain": 40, "stamina_gain": 20, "health_gain": 10, "success_msg": "Keindahan alam mahakarya Sang Pencipta membakar kembali semangatmu!"}
        ]
    }
]
