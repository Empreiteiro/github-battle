# GitHub Battle Arena

> Create battle rooms and see who's the most active dev on GitHub! Territory conquest grid based on real GitHub activity.

**[Live Demo](https://github-battle-arena.netlify.app)**

![Territory Conquest](https://img.shields.io/badge/style-territory_conquest-39d353?style=flat-square)
![React](https://img.shields.io/badge/React-19-58a6ff?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)
![Netlify](https://img.shields.io/badge/Netlify-deployed-00c7b7?style=flat-square&logo=netlify)

## Features

- **Territory Conquest Grid** — GitHub contribution-style 52x7 grid where participants conquer cells proportionally to their score
- **N-Player Support** — No limit on participants; each gets a unique color with 4 intensity levels
- **Real GitHub Activity** — Scores based on commits, PRs, issues, code reviews, and comments via GitHub Events API
- **Customizable Scoring** — Toggle contribution types on/off and adjust point values per battle
- **Custom Time Windows** — Pick exact start/end datetimes or use presets (1h, 6h, 24h, 7d, 30d)
- **Public Voting** — Viewers can vote on who they think will win
- **Private Rooms** — Optional password protection for competitors (viewing is always public)
- **Live Updates** — Auto-refresh every 30 seconds with animated territory expansion
- **Multiple Battles** — Run as many battles simultaneously as you want

## Scoring System

| Activity | Default Points |
|---|---|
| Commit | 5 pts |
| PR Opened | 10 pts |
| PR Merged | 15 pts |
| Issue Opened | 3 pts |
| Code Review | 8 pts |
| Comment | 1 pt |

All values are customizable per battle.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Netlify Functions (serverless)
- **Storage**: Netlify Blobs (production) / localStorage (local dev)
- **API**: GitHub REST API (public events, no auth required)
- **Deploy**: Netlify

## Getting Started

```bash
# Install dependencies
make install

# Start dev server (local mode with localStorage)
make dev

# Start with full backend (requires Netlify CLI)
make netlify-dev

# Build for production
make build

# Deploy to Netlify
make deploy
```

### Available Commands

| Command | Description |
|---|---|
| `make install` | Install dependencies |
| `make dev` | Start Vite dev server (local mode) |
| `make build` | Type-check and build for production |
| `make preview` | Build and preview production bundle |
| `make lint` | Run ESLint |
| `make netlify-dev` | Start with Netlify Functions backend |
| `make deploy` | Deploy to Netlify production |
| `make clean` | Remove build artifacts and node_modules |

## Project Structure

```
src/
  components/
    TerritoryArena.tsx    # Territory conquest grid (canvas)
    BattleCard.tsx        # Battle list card
    VotePanel.tsx         # Public voting panel
    ParticipantList.tsx   # Scoreboard with stats
    PasswordModal.tsx     # Private room password dialog
    Layout.tsx            # App shell with header
  pages/
    Home.tsx              # Battle listing
    CreateBattle.tsx      # Battle creation form
    BattleRoom.tsx        # Battle view with arena + sidebar
  hooks/
    useBattle.ts          # Battle data fetching + 30s polling
  utils/
    api.ts                # API client with localStorage fallback
    localStore.ts         # Offline mode storage
    github.ts             # GitHub Events API integration
    scoring.ts            # Score calculation
    pixelArt.ts           # Territory colors and grid utilities
  types/
    index.ts              # TypeScript interfaces
netlify/
  functions/              # Serverless API endpoints
```

## How It Works

1. **Create a battle** — Pick a name, add GitHub usernames, set a time window, and customize scoring
2. **Activity is scored** — The app fetches public GitHub events within the time window and calculates points
3. **Territory is conquered** — A 52x7 grid (like GitHub's contribution graph) fills with each player's color proportionally to their score
4. **Viewers vote** — Anyone can vote on who they think will win
5. **Live updates** — Scores refresh every 30 seconds, territory expands with animation

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
