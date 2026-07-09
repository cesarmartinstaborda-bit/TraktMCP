// Movie tools for Trakt API
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { traktRequest, handleTraktError, truncateResponse } from "../trakt/client";
import type {
  TraktMovieSummary,
  TraktTrendingItem,
  TraktSearchResult,
  StructuredContent,
} from "../trakt/types";

export function registerMovieTools(server: McpServer) {
  // Get movie summary
  server.registerTool(
    "trakt_get_movie",
    {
      title: "Get Movie Details",
      description: `Get detailed information about a movie from Trakt.

Returns full movie summary including title, year, overview, runtime, rating, genres, and all IDs.

Args:
  - id (string): Trakt ID, slug (e.g., "inception-2010"), or IMDb ID (e.g., "tt1375666")

Returns:
  Full movie object with title, year, tagline, overview, released date, runtime, rating, votes, genres, certification, and IDs (trakt, imdb, tmdb).

Examples:
  - Get movie by slug: id="inception-2010"
  - Get by IMDb ID: id="tt1375666"`,
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Trakt slug, Trakt ID, or IMDb ID of the movie"),
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
        const movie = await traktRequest<TraktMovieSummary>(
          `/movies/${id}`,
          { params: { extended: "full" } }
        );

        return {
          content: [{ type: "text", text: JSON.stringify(movie, null, 2) }],
          structuredContent: movie as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get trending movies
  server.registerTool(
    "trakt_trending_movies",
    {
      title: "Get Trending Movies",
      description: `Get movies currently being watched by the most Trakt users right now.

Movies are updated every 10 minutes and include the number of current watchers.

Args:
  - page (number): Page number (default: 1)
  - limit (number): Number of results per page, max 100 (default: 10)

Returns:
  Array of trending movies with watcher count, title, year, rating, and IDs.`,
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
        const trending = await traktRequest<TraktTrendingItem[]>(
          "/movies/trending",
          { params: { page, limit, extended: "full" } }
        );

        const formatted = trending.map((item) => ({
          watchers: item.watchers,
          title: item.movie?.title,
          year: item.movie?.year,
          rating: item.movie?.rating,
          genres: item.movie?.genres,
          ids: item.movie?.ids,
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

  // Get popular movies
  server.registerTool(
    "trakt_popular_movies",
    {
      title: "Get Popular Movies",
      description: `Get the most popular movies on Trakt, based on total number of ratings.

Args:
  - page (number): Page number (default: 1)
  - limit (number): Number of results per page, max 100 (default: 10)
  - genres (string): Optional comma-separated genres to filter by (e.g., "action,comedy")
  - years (string): Optional year or range (e.g., "2023" or "2020-2023")

Returns:
  Array of popular movies with title, year, overview, rating, genres, and IDs.`,
      inputSchema: {
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(10),
        genres: z.string().optional().describe("Comma-separated genres to filter"),
        years: z.string().optional().describe('Year or range (e.g., "2023" or "2020-2023")'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ page, limit, genres, years }) => {
      try {
        const params: Record<string, string | number | boolean | undefined> = {
          page,
          limit,
          extended: "full",
        };
        if (genres) params["genres"] = genres;
        if (years) params["years"] = years;

        const movies = await traktRequest<TraktMovieSummary[]>(
          "/movies/popular",
          { params }
        );

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(movies, null, 2)),
            },
          ],
          structuredContent: { movies } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get movie related movies
  server.registerTool(
    "trakt_related_movies",
    {
      title: "Get Related Movies",
      description: `Get movies related to a specific movie, useful for recommendations.

Args:
  - id (string): Trakt slug, Trakt ID, or IMDb ID of the movie
  - limit (number): Number of results (default: 10, max: 100)

Returns:
  Array of related movies with title, year, rating, genres, and IDs.`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug or ID of the movie"),
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
        const movies = await traktRequest<TraktMovieSummary[]>(
          `/movies/${id}/related`,
          { params: { limit, extended: "full" } }
        );

        return {
          content: [{ type: "text", text: JSON.stringify(movies, null, 2) }],
          structuredContent: { movies } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get movie cast & crew
  server.registerTool(
    "trakt_movie_people",
    {
      title: "Get Movie Cast & Crew",
      description: `Get the cast and crew for a movie, including directors, writers, and actors.

Args:
  - id (string): Trakt slug, Trakt ID, or IMDb ID of the movie

Returns:
  Object with "cast" array (character name + person details) and "crew" object (directors, writers, producers, etc.)`,
      inputSchema: {
        id: z.string().min(1).describe("Trakt slug or ID of the movie"),
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
        const people = await traktRequest<unknown>(`/movies/${id}/people`);

        return {
          content: [{ type: "text", text: JSON.stringify(people, null, 2) }],
          structuredContent: people as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get anticipated movies
  server.registerTool(
    "trakt_anticipated_movies",
    {
      title: "Get Most Anticipated Movies",
      description: `Get the most anticipated movies based on number of watchlist adds.

Args:
  - page (number): Page number (default: 1)
  - limit (number): Number of results per page, max 100 (default: 10)

Returns:
  Array of anticipated movies with list count, title, year, and IDs.`,
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
        const movies = await traktRequest<Array<{ list_count: number; movie: TraktMovieSummary }>>(
          "/movies/anticipated",
          { params: { page, limit, extended: "full" } }
        );

        const formatted = movies.map((item) => ({
          list_count: item.list_count,
          ...item.movie,
        }));

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(formatted, null, 2)),
            },
          ],
          structuredContent: { movies: formatted } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );
}
