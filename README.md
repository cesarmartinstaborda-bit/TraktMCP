# Trakt MCP Server

A **Model Context Protocol (MCP) server** for the [Trakt.TV API](https://trakt.tv), deployable to [Vercel](https://vercel.com). Connect any MCP-compatible AI agent to your Trakt watch history, ratings, watchlist, and much more.

## Features

- **30+ MCP tools** spanning search, movies, TV shows, and user account features
- **OAuth authentication** — users connect their Trakt account via the landing page
- **No auth required** for public tools (search, trending, popular, details)
- **One-click Vercel deployment** with built-in Streamable HTTP transport
- Beautiful landing page for OAuth flow and configuration

## Available Tools

### Public (no auth required)
- `trakt_search` — Search for movies, shows, episodes, people
- `trakt_lookup` — Look up items by IMDb, TMDb, TVDB, or Trakt ID
- `trakt_get_movie` / `trakt_get_show` — Get full details
- `trakt_trending_movies` / `trakt_trending_shows`
- `trakt_popular_movies` / `trakt_popular_shows`
- `trakt_related_movies` / `trakt_related_shows`
- `trakt_movie_people` / `trakt_show_people` — Cast & crew
- `trakt_get_show_seasons` / `trakt_get_season_episodes` / `trakt_get_episode`
- `trakt_anticipated_movies`

### Requires OAuth (🔒)
- `trakt_get_profile` / `trakt_get_stats`
- `trakt_get_watchlist` / `trakt_add_to_watchlist` / `trakt_remove_from_watchlist`
- `trakt_get_history` / `trakt_add_to_history`
- `trakt_get_ratings` / `trakt_add_rating`
- `trakt_get_watched`
- `trakt_checkin` / `trakt_delete_checkin`
- `trakt_get_lists` / `trakt_get_list_items`
- `trakt_get_calendar`
- `trakt_get_recommendations`

## Setup

### 1. Create a Trakt App

Go to [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications) and create a new application.

Set the **Redirect URI** to:
- Local: `http://localhost:3000/api/auth/callback`
- Vercel: `https://your-project.vercel.app/api/auth/callback`

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
TRAKT_CLIENT_ID=your_client_id
TRAKT_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Run Locally

```bash
bun install
bun dev
```

Visit `http://localhost:3000` and click **Connect with Trakt** to get your access token.

### 4. Deploy to Vercel

```bash
bunx vercel
```

Set environment variables in the Vercel dashboard:
- `TRAKT_CLIENT_ID`
- `TRAKT_CLIENT_SECRET`

## MCP Client Configuration

Add to your MCP client config (e.g., Cursor, Claude Desktop):

```json
{
  "mcpServers": {
    "trakt": {
      "url": "https://your-project.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TRAKT_ACCESS_TOKEN"
      }
    }
  }
}
```

For public-only access (no user features), omit the `headers` block.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── [transport]/route.ts   # MCP Streamable HTTP endpoint
│   │   └── auth/callback/route.ts # Trakt OAuth callback
│   ├── .well-known/
│   │   └── oauth-protected-resource/route.ts  # OAuth metadata
│   ├── layout.tsx
│   ├── page.tsx                   # Landing page with OAuth flow
│   └── globals.css
└── lib/
    ├── mcp-server.ts              # MCP server factory
    ├── tools/
    │   ├── search.ts              # Search & lookup tools
    │   ├── movies.ts              # Movie tools
    │   ├── shows.ts               # TV show tools
    │   └── user.ts                # User/auth tools
    └── trakt/
        ├── client.ts              # API client + error handling
        └── types.ts               # TypeScript type definitions
```
