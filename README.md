# Notelab

AI-powered personal workspace for notes, movies, books, games, and more.

## 🚀 Quick Start

### Desktop (Electron)

```bash
# Install dependencies
npm install
cd notelab-api && npm install && cd ..

# Run in development
npm start

# Build for Windows
npm run build:win
```

### Web (Vercel + Railway)

See [DEPLOY.md](DEPLOY.md) for detailed instructions.

```bash
# Backend
cd notelab-api
railway login
railway up

# Frontend
vercel --prod
```

## 📁 Project Structure

```
notelab/
├── electron/              # Electron main process
│   ├── main.js           # Entry point, spawns API server
│   └── preload.js        # IPC → HTTP bridge
├── renderer/             # React frontend
│   ├── src/
│   │   ├── hooks/useTelegram.js  # Telegram Mini App hook
│   │   └── utils/telegram.js     # Telegram SDK wrapper
│   └── index.html        # Telegram WebApp SDK loaded
├── notelab-api/          # Express + Supabase backend
│   └── src/
├── telegram-bot/          # Telegram Bot (@notelab_bot)
│   ├── bot.js            # Bot logic with Mini App button
│   └── README.md         # Bot setup guide
├── build/                # App icons
└── scripts/              # Dev scripts
```

## 🔧 Tech Stack

- **Frontend:** React + Vite + TailwindCSS
- **Desktop:** Electron
- **Backend:** Express.js
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini API
- **Deploy:** Vercel (frontend) + Railway (backend)

## 📦 Deployment Targets

| Platform | Status | Command/URL |
|----------|--------|-------------|
| Windows Desktop | ✅ Ready | `npm run build:win` |
| Web (Vercel) | ✅ Ready | `vercel --prod` |
| Telegram Mini App | ✅ Ready | https://t.me/notelab_bot |
| Railway API | ✅ Ready | `railway up` |

## 📝 Environment Variables

### Desktop
Create `notelab-api/.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Web
Set in Vercel Dashboard:
- `VITE_API_URL=https://your-api.up.railway.app/api`

## 🗄️ Database Schema

Tables in Supabase:
- `notes` — User notes
- `note_groups` — Columns/groups
- `note_items` — Items/cards
- `movies` — Movie data
- `settings` — API keys

## 🤝 Contributing

1. Fork the repo
2. Create a branch
3. Submit a PR

## 📄 License

ISC
