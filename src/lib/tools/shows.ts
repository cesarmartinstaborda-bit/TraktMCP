// TV Show tools for Trakt API
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { traktRequest, handleTraktError, truncateResponse } from "../trakt/client";
import type { TraktShowSummary, TraktTrendingItem, TraktEpisode, StructuredContent } from "../trakt/types";

export function registerShowTools(server: McpServer) {
  // Get show summary
  server.registerTool(
    "trakt_get_show",
    {
      title: "Get Show Details",
      description: `Get detailed information about a TV show from Trakt.

Returns full show summary including title, year, overview, network, status, rating, genres, and IDs.

Args:
  - id (string): Trakt slug (e.g., "breaking-bad"), Trakt ID, or IMDb ID (e.g., "tt0903747")

Returns:
  Full show object with title, year, overview, first_aired, airs schedule, network, status, rating, votes, genres, and IDs.`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug, Trakt ID, or IMDb ID of the show"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        const show = await traktRequest<TraktShowSummary>(`/shows/${id}`, {
          params: { extended: "full" },
        });

        return {
          content: [{ type: "text", text: JSON.stringify(show, null, 2) }],
          structuredContent: show as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get trending shows
  server.registerTool(
    "trakt_trending_shows",
    {
      title: "Get Trending Shows",
      description: `Get TV shows currently being watched by the most Trakt users right now.

Updated every 10 minutes.

Args:
  - page (number): Page number (default: 1)
  - limit (number): Results per page, max 100 (default: 10)

Returns:
  Array of trending shows with watcher count, title, year, status, network, rating, and IDs.`,
      inputSchema: {
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(10),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ page, limit }) => {
      try {
        const trending = await traktRequest<TraktTrendingItem[]>("/shows/trending", {
          params: { page, limit, extended: "full" },
        });

        const formatted = trending.map((item) => ({
          watchers: item.watchers,
          title: item.show?.title,
          year: item.show?.year,
          status: item.show?.status,
          network: item.show?.network,
          rating: item.show?.rating,
          genres: item.show?.genres,
          ids: item.show?.ids,
        }));

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(formatted, null, 2)),
            },
          ],
          structuredContent: { trending: formatted } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get popular shows
  server.registerTool(
    "trakt_popular_shows",
    {
      title: "Get Popular Shows",
      description: `Get the most popular TV shows on Trakt, based on total number of ratings.

Args:
  - page (number): Page number (default: 1)
  - limit (number): Results per page, max 100 (default: 10)
  - genres (string): Optional comma-separated genres to filter by (e.g., "drama,crime")
  - years (string): Optional year or range (e.g., "2023" or "2020-2023")
  - status (string): Optional status filter: "returning series", "in production", "planned", "canceled", "ended"

Returns:
  Array of popular shows with title, year, overview, status, network, rating, genres, and IDs.`,
      inputSchema: {
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(10),
        genres: z.string().optional().describe("Comma-separated genres to filter"),
        years: z.string().optional().describe('Year or range (e.g., "2023")'),
        status: z
          .string()
          .optional()
          .describe(
            'Status: "returning series", "in production", "planned", "canceled", "ended"'
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ page, limit, genres, years, status }) => {
      try {
        const params: Record<string, string | number | boolean | undefined> = {
          page,
          limit,
          extended: "full",
        };
        if (genres) params["genres"] = genres;
        if (years) params["years"] = years;
        if (status) params["status"] = status;

        const shows = await traktRequest<TraktShowSummary[]>("/shows/popular", { params });

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(shows, null, 2)),
            },
          ],
          structuredContent: { shows } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get show seasons
  server.registerTool(
    "trakt_get_show_seasons",
    {
      title: "Get Show Seasons",
      description: `Get all seasons for a TV show including episode counts and air dates.

Args:
  - id (string): Trakt slug, Trakt ID, or IMDb ID of the show

Returns:
  Array of seasons with season number, episode count, air date, overview, and IDs.`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug or ID of the show"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        const seasons = await traktRequest<unknown[]>(`/shows/${id}/seasons`, {
          params: { extended: "full" },
        });

        return {
          content: [{ type: "text", text: JSON.stringify(seasons, null, 2) }],
          structuredContent: { seasons } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get season episodes
  server.registerTool(
    "trakt_get_season_episodes",
    {
      title: "Get Season Episodes",
      description: `Get all episodes for a specific season of a TV show.

Args:
  - id (string): Trakt slug, Trakt ID, or IMDb ID of the show
  - season (number): Season number (use 0 for specials)

Returns:
  Array of episodes with episode number, title, air date, overview, rating, and IDs.`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug or ID of the show"),
        season: z.number().int().min(0).describe("Season number (0 for specials)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, season }) => {
      try {
        const episodes = await traktRequest<TraktEpisode[]>(
          `/shows/${id}/seasons/${season}`,
          { params: { extended: "full" } }
        );

        return {
          content: [{ type: "text", text: JSON.stringify(episodes, null, 2) }],
          structuredContent: { episodes } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get specific episode
  server.registerTool(
    "trakt_get_episode",
    {
      title: "Get Episode Details",
      description: `Get detailed information about a specific TV episode.

Args:
  - id (string): Trakt slug, Trakt ID, or IMDb ID of the show
  - season (number): Season number
  - episode (number): Episode number within the season

Returns:
  Episode details including title, season, number, air date, overview, rating, votes, and IDs.`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug or ID of the show"),
        season: z.number().int().min(0).describe("Season number"),
        episode: z.number().int().min(1).describe("Episode number"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, season, episode }) => {
      try {
        const ep = await traktRequest<TraktEpisode>(
          `/shows/${id}/seasons/${season}/episodes/${episode}`,
          { params: { extended: "full" } }
        );

        return {
          content: [{ type: "text", text: JSON.stringify(ep, null, 2) }],
          structuredContent: ep as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get related shows
  server.registerTool(
    "trakt_related_shows",
    {
      title: "Get Related Shows",
      description: `Get TV shows related to a specific show, useful for recommendations.

Args:
  - id (string): Trakt slug, Trakt ID, or IMDb ID of the show
  - limit (number): Number of results (default: 10, max: 100)

Returns:
  Array of related shows with title, year, status, network, rating, genres, and IDs.`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug or ID of the show"),
        limit: z.number().int().min(1).max(100).optional().default(10),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, limit }) => {
      try {
        const shows = await traktRequest<TraktShowSummary[]>(
          `/shows/${id}/related`,
          { params: { limit, extended: "full" } }
        );

        return {
          content: [{ type: "text", text: JSON.stringify(shows, null, 2) }],
          structuredContent: { shows } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get show cast & crew
  server.registerTool(
    "trakt_show_people",
    {
      title: "Get Show Cast & Crew",
      description: `Get the cast and crew for a TV show.

Args:
  - id (string): Trakt slug, Trakt ID, or IMDb ID of the show

Returns:
  Object with "cast" array (character + guest/regular indicator + person details) and "crew" object (directors, writers, producers, etc.)`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug or ID of the show"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        const people = await traktRequest<unknown>(`/shows/${id}/people`);

        return {
          content: [{ type: "text", text: JSON.stringify(people, null, 2) }],
          structuredContent: people as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );
}
