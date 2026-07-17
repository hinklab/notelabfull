# Notelab API

Express + Supabase backend for Notelab.

## Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

3. Install dependencies:
```bash
npm install
```

4. Start server:
```bash
npm start      # Production
npm run dev    # Development (nodemon)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/notes` | GET, POST | List / Create notes |
| `/api/notes/:id` | PUT, DELETE | Update / Delete note |
| `/api/groups` | GET, POST | List / Create groups |
| `/api/groups/:id` | PUT, DELETE | Update / Delete group |
| `/api/items` | GET, POST | List / Create items |
| `/api/items/:id` | PUT, DELETE | Update / Delete item |
| `/api/movies` | GET, POST | List / Create movies |
| `/api/settings` | GET, PUT | Get / Update settings |
| `/api/agent/chat` | POST | Agent chat |

## Database Schema

See Supabase dashboard for table definitions. Main tables:
- `notes` — User notes (Movies, Books, Games, etc.)
- `note_groups` — Columns/groups within a note
- `note_items` — Items/cards within a group
- `movies` — Movie-specific data
- `settings` — User API keys (Gemini, OMDB, TMDB)
