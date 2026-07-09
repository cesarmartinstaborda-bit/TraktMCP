// User tools for Trakt API (requires OAuth)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { traktRequest, handleTraktError, truncateResponse } from "../trakt/client";
import type {
  TraktWatchlistItem,
  TraktHistoryItem,
  TraktRatingItem,
  TraktWatchedItem,
  TraktUserProfile,
  TraktUserStats,
  StructuredContent,
} from "../trakt/types";

export function registerUserTools(server: McpServer, getAccessToken: () => string | undefined) {
  // Helper to get token or throw a helpful error
  function requireToken(): string {
    const token = getAccessToken();
    if (!token) {
      throw new Error(
        "OAuth authentication required. Connect your Trakt account via the OAuth flow first."
      );
    }
    return token;
  }

  // Get user profile (me or specific user)
  server.registerTool(
    "trakt_get_profile",
    {
      title: "Get User Profile",
      description: `Get a Trakt user's profile information.

Use "me" as username to get the authenticated user's profile (requires OAuth).
Other usernames can be accessed publicly.

Args:
  - username (string): Trakt username, or "me" for the authenticated user (default: "me")

Returns:
  User profile with username, name, VIP status, join date, location, about, and avatar.`,
      inputSchema: {
        username: z.string().optional().default("me").describe('Trakt username or "me"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ username }) => {
      try {
        const accessToken = username === "me" ? requireToken() : getAccessToken();
        const profile = await traktRequest<TraktUserProfile>(`/users/${username}`, {
          params: { extended: "full" },
          accessToken,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
          structuredContent: profile as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get user stats
  server.registerTool(
    "trakt_get_stats",
    {
      title: "Get User Stats",
      description: `Get watching statistics for a Trakt user.

Includes total movies/shows/episodes watched, minutes watched, ratings given, and network stats.

Args:
  - username (string): Trakt username, or "me" for the authenticated user (default: "me")

Returns:
  Stats object with movies (plays, watched, minutes), shows (watched), episodes (plays, watched, minutes), ratings distribution, and network (friends, followers, following).`,
      inputSchema: {
        username: z.string().optional().default("me").describe('Trakt username or "me"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ username }) => {
      try {
        const accessToken = username === "me" ? requireToken() : getAccessToken();
        const stats = await traktRequest<TraktUserStats>(`/users/${username}/stats`, {
          accessToken,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
          structuredContent: stats as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get watchlist
  server.registerTool(
    "trakt_get_watchlist",
    {
      title: "Get Watchlist",
      description: `Get the authenticated user's watchlist. Requires OAuth authentication.

The watchlist contains movies, shows, seasons, and episodes the user wants to watch.

Args:
  - type (string): Filter by type: "movies", "shows", "seasons", "episodes" (default: "movies")
  - sort (string): Sort order: "rank", "added", "title", "released", "runtime", "popularity", "percentage", "votes", "my_rating", "random", "watched", "collected" (default: "rank")
  - page (number): Page number (default: 1)
  - limit (number): Results per page, max 100 (default: 20)

Returns:
  Array of watchlist items with rank, listed_at, type, and item details (title, year, IDs).`,
      inputSchema: {
        type: z
          .enum(["movies", "shows", "seasons", "episodes"])
          .optional()
          .default("movies")
          .describe("Type of content to retrieve"),
        sort: z
          .string()
          .optional()
          .default("rank")
          .describe("Sort order for results"),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ type, sort, page, limit }) => {
      try {
        const accessToken = requireToken();
        const items = await traktRequest<TraktWatchlistItem[]>(
          `/users/me/watchlist/${type}/${sort}`,
          { params: { page, limit, extended: "full" }, accessToken }
        );

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(items, null, 2)),
            },
          ],
          structuredContent: { items, count: items.length } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Add to watchlist
  server.registerTool(
    "trakt_add_to_watchlist",
    {
      title: "Add to Watchlist",
      description: `Add movies, shows, seasons, or episodes to the authenticated user's watchlist.

Requires OAuth authentication.

Args:
  - movies (array): Array of movie objects with ids (e.g., [{"ids": {"trakt": 1234}}])
  - shows (array): Array of show objects with ids
  - seasons (array): Array of show objects with nested seasons to add
  - episodes (array): Array of episode objects with ids

Returns:
  Summary of added/existing items and any not-found IDs.

Examples:
  - Add movie by Trakt ID: movies=[{"ids": {"trakt": 1234}}]
  - Add movie by IMDb: movies=[{"ids": {"imdb": "tt1375666"}}]
  - Add show by slug: shows=[{"ids": {"slug": "breaking-bad"}}]`,
      inputSchema: {
        movies: z
          .array(z.object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) }))
          .optional()
          .default([])
          .describe("Movies to add"),
        shows: z
          .array(z.object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) }))
          .optional()
          .default([])
          .describe("Shows to add"),
        episodes: z
          .array(z.object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) }))
          .optional()
          .default([])
          .describe("Episodes to add"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ movies, shows, episodes }) => {
      try {
        const accessToken = requireToken();
        const result = await traktRequest<unknown>("/sync/watchlist", {
          method: "POST",
          body: { movies, shows, episodes },
          accessToken,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Remove from watchlist
  server.registerTool(
    "trakt_remove_from_watchlist",
    {
      title: "Remove from Watchlist",
      description: `Remove movies, shows, seasons, or episodes from the authenticated user's watchlist.

Requires OAuth authentication.

Args:
  - movies (array): Movie objects with ids to remove
  - shows (array): Show objects with ids to remove
  - episodes (array): Episode objects with ids to remove

Returns:
  Summary of deleted and not-found items.`,
      inputSchema: {
        movies: z
          .array(z.object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) }))
          .optional()
          .default([])
          .describe("Movies to remove"),
        shows: z
          .array(z.object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) }))
          .optional()
          .default([])
          .describe("Shows to remove"),
        episodes: z
          .array(z.object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) }))
          .optional()
          .default([])
          .describe("Episodes to remove"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ movies, shows, episodes }) => {
      try {
        const accessToken = requireToken();
        const result = await traktRequest<unknown>("/sync/watchlist/remove", {
          method: "POST",
          body: { movies, shows, episodes },
          accessToken,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get watch history
  server.registerTool(
    "trakt_get_history",
    {
      title: "Get Watch History",
      description: `Get the authenticated user's watch history. Requires OAuth authentication.

Returns a chronological list of movies and episodes the user has watched.

Args:
  - type (string): Filter by type: "movies", "shows", "seasons", "episodes" (default: "movies")
  - id (number): Optional Trakt ID to filter history for a specific item
  - start_at (string): Optional ISO 8601 datetime to filter history from (e.g., "2024-01-01T00:00:00.000Z")
  - end_at (string): Optional ISO 8601 datetime to filter history until
  - page (number): Page number (default: 1)
  - limit (number): Results per page, max 100 (default: 20)

Returns:
  Array of history items with id, watched_at, action, type, and item details.`,
      inputSchema: {
        type: z
          .enum(["movies", "shows", "seasons", "episodes"])
          .optional()
          .default("movies"),
        id: z.number().int().optional().describe("Optional Trakt ID to filter by specific item"),
        start_at: z.string().optional().describe("ISO 8601 start datetime filter"),
        end_at: z.string().optional().describe("ISO 8601 end datetime filter"),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ type, id, start_at, end_at, page, limit }) => {
      try {
        const accessToken = requireToken();
        const endpoint = id
          ? `/users/me/history/${type}/${id}`
          : `/users/me/history/${type}`;

        const params: Record<string, string | number | boolean | undefined> = {
          page,
          limit,
          extended: "full",
        };
        if (start_at) params["start_at"] = start_at;
        if (end_at) params["end_at"] = end_at;

        const history = await traktRequest<TraktHistoryItem[]>(endpoint, {
          params,
          accessToken,
        });

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(history, null, 2)),
            },
          ],
          structuredContent: { history, count: history.length } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Add to history (mark as watched)
  server.registerTool(
    "trakt_add_to_history",
    {
      title: "Mark as Watched",
      description: `Mark movies or episodes as watched in the user's history. Requires OAuth authentication.

This adds items to the user's watch history with a specified watched_at time.

Args:
  - movies (array): Movie objects with ids and optional watched_at timestamp
  - shows (array): Show objects with ids and optional nested seasons/episodes
  - episodes (array): Episode objects with ids and optional watched_at timestamp

Returns:
  Summary of added/not-found items.

Examples:
  - Mark movie as watched now: movies=[{"ids": {"imdb": "tt1375666"}}]
  - Mark with specific time: movies=[{"ids": {"trakt": 1234}, "watched_at": "2024-01-15T20:00:00.000Z"}]
  - Mark specific episode: episodes=[{"ids": {"trakt": 5678}}]`,
      inputSchema: {
        movies: z
          .array(
            z.object({
              ids: z.record(z.string(), z.union([z.string(), z.number()])),
              watched_at: z.string().optional(),
            })
          )
          .optional()
          .default([]),
        shows: z
          .array(z.object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) }))
          .optional()
          .default([]),
        episodes: z
          .array(
            z.object({
              ids: z.record(z.string(), z.union([z.string(), z.number()])),
              watched_at: z.string().optional(),
            })
          )
          .optional()
          .default([]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ movies, shows, episodes }) => {
      try {
        const accessToken = requireToken();
        const result = await traktRequest<unknown>("/sync/history", {
          method: "POST",
          body: { movies, shows, episodes },
          accessToken,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get ratings
  server.registerTool(
    "trakt_get_ratings",
    {
      title: "Get User Ratings",
      description: `Get the authenticated user's ratings for movies, shows, seasons, and episodes.

Requires OAuth authentication.

Args:
  - type (string): Filter by type: "movies", "shows", "seasons", "episodes", "all" (default: "movies")
  - rating (number): Filter by specific rating (1-10)
  - page (number): Page number (default: 1)
  - limit (number): Results per page, max 100 (default: 20)

Returns:
  Array of rated items with rating (1-10), rated_at timestamp, and item details.`,
      inputSchema: {
        type: z
          .enum(["movies", "shows", "seasons", "episodes", "all"])
          .optional()
          .default("movies"),
        rating: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Filter by specific rating (1-10)"),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ type, rating, page, limit }) => {
      try {
        const accessToken = requireToken();
        const endpoint = rating
          ? `/users/me/ratings/${type}/${rating}`
          : `/users/me/ratings/${type}`;

        const ratings = await traktRequest<TraktRatingItem[]>(endpoint, {
          params: { page, limit, extended: "full" },
          accessToken,
        });

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(ratings, null, 2)),
            },
          ],
          structuredContent: { ratings, count: ratings.length } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Add rating
  server.registerTool(
    "trakt_add_rating",
    {
      title: "Rate a Movie or Show",
      description: `Rate movies, shows, seasons, or episodes. Requires OAuth authentication.

Ratings are on a scale of 1-10.

Args:
  - movies (array): Movie objects with ids and rating (1-10)
  - shows (array): Show objects with ids and rating (1-10)
  - seasons (array): Season objects with ids and rating (1-10)
  - episodes (array): Episode objects with ids and rating (1-10)

Returns:
  Summary of added/not-found items.

Examples:
  - Rate movie 9/10: movies=[{"ids": {"imdb": "tt1375666"}, "rating": 9}]
  - Rate show: shows=[{"ids": {"slug": "breaking-bad"}, "rating": 10}]`,
      inputSchema: {
        movies: z
          .array(
            z.object({
              ids: z.record(z.string(), z.union([z.string(), z.number()])),
              rating: z.number().int().min(1).max(10),
            })
          )
          .optional()
          .default([]),
        shows: z
          .array(
            z.object({
              ids: z.record(z.string(), z.union([z.string(), z.number()])),
              rating: z.number().int().min(1).max(10),
            })
          )
          .optional()
          .default([]),
        episodes: z
          .array(
            z.object({
              ids: z.record(z.string(), z.union([z.string(), z.number()])),
              rating: z.number().int().min(1).max(10),
            })
          )
          .optional()
          .default([]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ movies, shows, episodes }) => {
      try {
        const accessToken = requireToken();
        const result = await traktRequest<unknown>("/sync/ratings", {
          method: "POST",
          body: { movies, shows, episodes },
          accessToken,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get watched movies/shows
  server.registerTool(
    "trakt_get_watched",
    {
      title: "Get Watched Items",
      description: `Get all movies or shows the authenticated user has watched at least once.

Requires OAuth authentication.

Args:
  - type (string): "movies" or "shows" (default: "movies")

Returns:
  Array of watched items with play count, last_watched_at, and item details.
  For shows, includes per-season and per-episode play counts.`,
      inputSchema: {
        type: z.enum(["movies", "shows"]).optional().default("movies"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ type }) => {
      try {
        const accessToken = requireToken();
        const watched = await traktRequest<TraktWatchedItem[]>(
          `/users/me/watched/${type}`,
          { params: { extended: "full" }, accessToken }
        );

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(watched, null, 2)),
            },
          ],
          structuredContent: { watched, count: watched.length } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Check-in
  server.registerTool(
    "trakt_checkin",
    {
      title: "Check In to Movie or Episode",
      description: `Check in to a movie or episode currently being watched.

Only one check-in is allowed at a time. The previous check-in will expire after the runtime.
Requires OAuth authentication.

Args:
  - movie (object): Movie to check into with ids (provide movie OR episode+show, not both)
  - show (object): Show containing the episode being watched
  - episode (object): Episode to check into with ids (or just season+number if show is provided)
  - message (string): Optional message/comment about the check-in

Returns:
  Check-in confirmation with expires_at timestamp and item details.

Examples:
  - Check into movie: movie={"ids": {"imdb": "tt1375666"}}
  - Check into episode: show={"ids": {"slug": "breaking-bad"}}, episode={"season": 1, "number": 1}`,
      inputSchema: {
        movie: z
          .object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) })
          .optional()
          .describe("Movie to check into"),
        show: z
          .object({ ids: z.record(z.string(), z.union([z.string(), z.number()])) })
          .optional()
          .describe("Show containing the episode"),
        episode: z
          .object({
            ids: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
            season: z.number().int().optional(),
            number: z.number().int().optional(),
          })
          .optional()
          .describe("Episode to check into"),
        message: z.string().max(500).optional().describe("Optional message"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ movie, show, episode, message }) => {
      try {
        const accessToken = requireToken();
        const body: Record<string, unknown> = {};
        if (movie) body["movie"] = movie;
        if (show) body["show"] = show;
        if (episode) body["episode"] = episode;
        if (message) body["message"] = message;

        const result = await traktRequest<unknown>("/checkin", {
          method: "POST",
          body,
          accessToken,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Delete check-in (undo)
  server.registerTool(
    "trakt_delete_checkin",
    {
      title: "Delete Active Check-in",
      description: `Delete (undo) the currently active check-in. Requires OAuth authentication.

Use this to cancel an accidental check-in.

Returns:
  204 No Content on success.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const accessToken = requireToken();
        await traktRequest<Record<string, unknown>>("/checkin", { method: "DELETE", accessToken });

        return {
          content: [{ type: "text", text: "Check-in successfully deleted." }],
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get user lists
  server.registerTool(
    "trakt_get_lists",
    {
      title: "Get User Lists",
      description: `Get the authenticated user's custom lists. Requires OAuth authentication.

Returns all personal lists the user has created on Trakt.

Returns:
  Array of lists with name, description, privacy, sort options, item_count, likes, and IDs.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const accessToken = requireToken();
        const lists = await traktRequest<unknown[]>("/users/me/lists", { accessToken });

        return {
          content: [{ type: "text", text: JSON.stringify(lists, null, 2) }],
          structuredContent: { lists } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get list items
  server.registerTool(
    "trakt_get_list_items",
    {
      title: "Get List Items",
      description: `Get items in a specific Trakt list.

Works for both personal lists (requires OAuth for private lists) and public lists.

Args:
  - username (string): Trakt username who owns the list, or "me" for authenticated user
  - list_id (string): Trakt list ID or slug
  - type (string): Filter by type: "movie", "show", "season", "episode", "person" (optional)
  - page (number): Page number (default: 1)
  - limit (number): Results per page, max 100 (default: 20)

Returns:
  Array of list items with rank, listed_at, type, and item details.`,
      inputSchema: {
        username: z.string().optional().default("me").describe('Username or "me"'),
        list_id: z.string().min(1).describe("List ID or slug"),
        type: z.string().optional().describe("Filter by item type"),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ username, list_id, type, page, limit }) => {
      try {
        const accessToken = getAccessToken();
        const endpoint = type
          ? `/users/${username}/lists/${list_id}/items/${type}`
          : `/users/${username}/lists/${list_id}/items`;

        const items = await traktRequest<unknown[]>(endpoint, {
          params: { page, limit, extended: "full" },
          accessToken,
        });

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(items, null, 2)),
            },
          ],
          structuredContent: { items, count: items.length } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get calendar (upcoming episodes)
  server.registerTool(
    "trakt_get_calendar",
    {
      title: "Get My Calendar",
      description: `Get the authenticated user's upcoming TV episodes from shows they watch.

Only includes episodes from shows in the user's watched history or collection.
Requires OAuth authentication.

Args:
  - start_date (string): Start date in YYYY-MM-DD format (default: today)
  - days (number): Number of days to include (default: 7, max: 33)

Returns:
  Array of calendar entries grouped by date, each with episode details and show info.`,
      inputSchema: {
        start_date: z
          .string()
          .optional()
          .describe('Start date in YYYY-MM-DD format (default: today)'),
        days: z.number().int().min(1).max(33).optional().default(7),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ start_date, days }) => {
      try {
        const accessToken = requireToken();
        const date = start_date ?? new Date().toISOString().split("T")[0];

        const calendar = await traktRequest<unknown[]>(
          `/calendars/my/shows/${date}/${days}`,
          { params: { extended: "full" }, accessToken }
        );

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(calendar, null, 2)),
            },
          ],
          structuredContent: { calendar } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // Get recommendations
  server.registerTool(
    "trakt_get_recommendations",
    {
      title: "Get Personalized Recommendations",
      description: `Get personalized movie or show recommendations based on the user's watching history and ratings.

Requires OAuth authentication.

Args:
  - type (string): "movies" or "shows" (default: "movies")
  - limit (number): Number of recommendations (default: 10, max: 100)
  - ignore_collected (boolean): Exclude items already in collection (default: false)

Returns:
  Array of recommended items with title, year, overview, rating, genres, and IDs.`,
      inputSchema: {
        type: z.enum(["movies", "shows"]).optional().default("movies"),
        limit: z.number().int().min(1).max(100).optional().default(10),
        ignore_collected: z
          .boolean()
          .optional()
          .default(false)
          .describe("Exclude items already in collection"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ type, limit, ignore_collected }) => {
      try {
        const accessToken = requireToken();
        const params: Record<string, string | number | boolean | undefined> = {
          limit,
          extended: "full",
        };
        if (ignore_collected) params["ignore_collected"] = "true";

        const recs = await traktRequest<unknown[]>(
          `/recommendations/${type}`,
          { params, accessToken }
        );

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(recs, null, 2)),
            },
          ],
          structuredContent: { recommendations: recs } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );
}
