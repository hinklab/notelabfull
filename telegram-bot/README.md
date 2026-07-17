# Notelab Telegram Bot

Telegram Mini App integration for Notelab.

## Setup

1. Get bot token from [@BotFather](https://t.me/BotFather):
   - Send `/newbot`
   - Name: `Notelab`
   - Username: `notelab_bot`
   - Copy the token

2. Configure Mini App:
   - Send `/mybots` → Select bot → Bot Settings → Menu Button
   - Configure menu button URL: `https://notelab.vercel.app`
   - Or use inline button with `web_app` (already configured in bot.js)

3. Install & run:
```bash
cd telegram-bot
cp .env.example .env
# Edit .env with your BOT_TOKEN
npm install
npm start
```

## Features

- `/start` — Welcome with Mini App button
- `/help` — Instructions
- Web App integration — Opens Notelab in Telegram

## Deployment

For 24/7 hosting, deploy to:
- [Railway](https://railway.app) (recommended)
- [Render](https://render.com)
- VPS with PM2

### Railway Deploy
```bash
railway login
railway init
railway up
```

Add environment variables in Railway dashboard:
- `BOT_TOKEN`
- `MINI_APP_URL`
