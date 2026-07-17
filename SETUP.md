# NoteLab - O'rnatish va Ishga Tushirish

## ⚠️ MUHIM: Ma'lumotlar Saqlanish Joyi

**Ma'lumotlaringiz qayerda saqlanadi:**
- Windows: `C:\Users\[username]\AppData\Roaming\notelab\notelab.json`
- Bu fayl **avtomatik yaratiladi** va barcha ma'lumotlaringizni saqlaydi
- **Backup oling!** Bu faylni nusxalab saqlang

## Tezkor Boshlash

### 1. Bog'liqliklarni o'rnatish
```bash
npm install
cd notelab-api && npm install && cd ..
```

### 2. API kalitlarini sozlash (ixtiyoriy)

`notelab-api/.env` faylini oching va quyidagi ma'lumotlarni kiriting:

```env
PORT=3000
# Bu kalitlar ixtiyoriy - ilova ularsiz ham ishlaydi
SUPABASE_URL=https://sizning-project.supabase.co
SUPABASE_SERVICE_KEY=sizning-service-role-key
```

**Eslatma:** Ilova endi **lokal JSON fayl**da ishlaydi, Supabase kerak emas!

### 3. Ilovani ishga tushirish

**API bilan (tavsiya etiladi):**
```bash
npm start
```

**Faqat frontend (API siz):**
```bash
npm run dev:noapi
```

**Faqat API serverni ishga tushirish:**
```bash
npm run api:dev
```

## Buyruqlar

| Buyruq | Tavsif |
|--------|--------|
| `npm start` | Ilovani API bilan ishga tushiradi (development) |
| `npm run dev:noapi` | Faqat frontend (API siz) |
| `npm run dev:api` | `npm start` bilan bir xil |
| `npm run api` | Faqat API server (production) |
| `npm run api:dev` | Faqat API server (development) |
| `npm run build:win` | Windows uchun build |

## Ma'lumotlar Bazasi

**Arxitektura:**
- **Lokal JSON fayl**: `notelab.json` (AppData/Roaming/notelab)
- **API Server**: Express.js (port 3000)
- **Frontend**: React + Vite (port 5173)
- **Electron**: Desktop wrapper

**Ma'lumotlar strukturasi:**
```json
{
  "notes": [],        // Notelar ro'yxati
  "note_groups": [],  // Guruhlar
  "note_items": [],   // Itemlar
  "movies": [],       // Filmlar
  "settings": {},     // API kalitlar
  "agent_memory": []  // Agent xotirasi
}
```

## Muammolarni hal qilish

### Ilova bo'sh ochiladi / Ma'lumotlar yuklanmaydi

**Sabab:** API server ishlamayapti

**Yechim:**
1. `npm start` buyrug'ini ishlating (API bilan)
2. Konsolda xatolarni tekshiring
3. `http://localhost:3000/health` ga kiring - `{"status":"ok"}` ko'rsatishi kerak

### Eski ma'lumotlar yo'qolgan

**Tekshirish:**
```bash
dir "%APPDATA%\notelab\notelab.json"
```

Agar fayl mavjud bo'lsa:
1. Faylni oching va ma'lumotlar borligini tekshiring
2. `npm start` bilan ilovani qayta ishga tushiring
3. Agar muammo davom etsa, konsolda xatolarni tekshiring

**Backup:**
```bash
copy "%APPDATA%\notelab\notelab.json" "%APPDATA%\notelab\notelab-backup.json"
```

### API server ishlamayapti

**Tekshirish:**
```bash
curl http://localhost:3000/health
```

Agar javob kelmasa:
1. `cd notelab-api && npm install` buyrug'ini bajaring
2. `npm run api:dev` buyrug'i bilan alohida ishga tushiring
3. Konsolda xatolarni tekshiring

### Port band

Agar 3000 yoki 5173 portlar band bo'lsa:
- Boshqa ilovalarni yoping
- Yoki `.env` faylida `PORT` ni o'zgartiring

## API Kalitlar (ixtiyoriy)

Qo'shimcha funksiyalar uchun API kalitlar kerak:

### TMDB (The Movie Database)
- **Nima uchun:** Film/serial ma'lumotlari
- **Qayerdan:** https://www.themoviedb.org/settings/api
- **Fayl:** `notelab-api/.env` → `TMDB_KEY`

### OMDB (Open Movie Database)  
- **Nima uchun:** Film reytinglari
- **Qayerdan:** http://www.omdbapi.com/apikey.aspx
- **Fayl:** `notelab-api/.env` → `OMDB_KEY`

### Gemini (Google AI)
- **Nima uchun:** AI agent
- **Qayerdan:** https://makersuite.google.com/app/apikey
- **Fayl:** `notelab-api/.env` → `GEMINI_KEY`

### RAWG (Video Games Database)
- **Nima uchun:** O'yin ma'lumotlari
- **Qayerdan:** https://rawg.io/apidocs
- **Fayl:** `notelab-api/.env` → `RAWG_KEY`

## Loyiha Strukturasi

```
notelab/
├── electron/          # Electron asosiy jarayon
│   ├── main.js       # Entry point
│   ├── preload.js    # API bridge
│   └── services/     # SQLite, OMDB, TMDB
├── renderer/          # React frontend
│   └── src/
├── notelab-api/       # Express backend API
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   └── services/ # Database helper
│   └── .env          # API kalitlar
├── scripts/          # Development skriptlar
└── package.json
```

## Qo'shimcha Ma'lumot

- API default port: `3000`
- Vite dev server: `5173`
- Production build: `npm run build:win`
- Ma'lumotlar: `%APPDATA%\notelab\notelab.json`

## Yordam

Muammo yuzaga kelsa:
1. Konsolda xatolarni tekshiring
2. `notelab.json` faylini backup qiling
3. GitHub Issues ga murojaat qiling


