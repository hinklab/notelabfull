# Notelab Deployment Guide

## Quick Deploy

### 1. Backend (Railway)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create project
cd notelab-api
railway init

# 4. Add environment variables in Railway dashboard:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app

# 5. Deploy
railway up
```

### 2. Frontend (Vercel)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd notelab
vercel --prod

# 4. Add environment variable in Vercel dashboard:
# VITE_API_URL=https://your-railway-app.up.railway.app/api
```

## Manual Deploy (Free Tiers)

### Railway (Backend)

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select `notelab-api` folder as root
4. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ALLOWED_ORIGINS`
5. Deploy

### Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com)
2. New Project → Import GitHub repo
3. Framework Preset: `Vite`
4. Root Directory: `./` (or leave default)
5. Build Command: `vite build`
6. Output Directory: `renderer/dist`
7. Environment Variables:
   - `VITE_API_URL` → Your Railway URL + `/api`
8. Deploy

## Environment Variables

### Backend (Railway/Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (auto-set) | `3000` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key | `eyJ...` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `https://a.vercel.app,https://b.vercel.app` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.railway.app/api` |

## Post-Deploy Checklist

- [ ] Health check: `GET https://api.railway.app/health` → `{"status":"ok"}`
- [ ] CORS test: Frontend can fetch from backend
- [ ] Supabase tables created with RLS
- [ ] API keys configured in settings

## Web + Desktop Sync

Desktop app uses local Express API (`localhost:3000`)
Web app uses deployed API (`https://api.railway.app/api`)

Both share the same Supabase database.

## Telegram Mini App Deploy

### 1. Create Bot (@BotFather)

```
1. Message @BotFather: /newbot
2. Name: Notelab
3. Username: notelab_bot
4. Copy the token (BOT_TOKEN)
```

### 2. Configure Mini App

```
@BotFather:
/mybots → Select bot → Bot Settings → Menu Button
Configure menu button URL: https://notelab.vercel.app
```

### 3. Deploy Bot Server

```bash
cd telegram-bot
cp .env.example .env
# Add BOT_TOKEN and MINI_APP_URL

# Deploy to Railway
railway login
railway init
railway up
```

### 4. Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | From @BotFather |
| `MINI_APP_URL` | Vercel URL (e.g., `https://notelab.vercel.app`) |

### 5. Test Mini App

1. Message your bot: `/start`
2. Click "🚀 Notelab ochish" button
3. App opens inside Telegram!

## All Platforms

| Platform | URL/Method |
|----------|-----------|
| **Desktop** | Windows `.exe` installer |
| **Web** | https://notelab.vercel.app |
| **Telegram** | https://t.me/notelab_bot |
| **Mobile** | Same web URL in browser |
