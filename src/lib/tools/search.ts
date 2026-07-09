// Search tools for Trakt API
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { traktRequest, handleTraktError, truncateResponse } from "../trakt/client";
import type { TraktSearchResult, StructuredContent } from "../trakt/types";

export function registerSearchTools(server: McpServer) {
  // Search for movies, shows, episodes, people
  server.registerTool(
    "trakt_search",
    {
      title: "Search Trakt",
      description: `Search Trakt for movies, TV shows, episodes, people, and lists.

Returns a list of matching items with their Trakt IDs, titles, and metadata.

Args:
  - query (string): Search query string
  - type (string): Type to search: "movie", "show", "episode", "person", "list" (default: "movie,show")
  - page (number): Page number for pagination (default: 1)
  - limit (number): Results per page, max 100 (default: 10)

Returns:
  Array of search results with type, score, and item details (title, year, IDs).

Examples:
  - "Search for Breaking Bad" → query="Breaking Bad", type="show"
  - "Find the movie Inception" → query="Inception", type="movie"
  - "Search for Bryan Cranston" → query="Bryan Cranston", type="person"`,
      inputSchema: {
        query: z.string().min(1).describe("Search query string"),
        type: z
          .string()
          .optional()
          .default("movie,show")
          .describe(
            'Comma-separated types: "movie", "show", "episode", "person", "list"'
          ),
        page: z.number().int().min(1).optional().default(1).describe("Page number"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(10)
          .describe("Results per page"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, type, page, limit }) => {
      try {
        const results = await traktRequest<TraktSearchResult[]>("/search/" + (type ?? "movie,show"), {
          params: { query, page, limit },
        });

        if (!results.length) {
          return {
            content: [{ type: "text", text: `No results found for "${query}"` }],
          };
        }

        const formatted = results.map((r) => {
          const item = r.movie ?? r.show ?? r.episode ?? r.person;
          const title = r.person
            ? r.person.name
            : (item as { title?: string })?.title ?? "Unknown";
          const year = (item as { year?: number })?.year;
          const ids = (item as { ids?: Record<string, unknown> })?.ids ?? {};
          return {
            type: r.type,
            score: r.score,
            title,
            year,
            ids,
          };
        });

        return {
          content: [
            {
              type: "text",
              text: truncateResponse(JSON.stringify(formatted, null, 2)),
            },
          ],
          structuredContent: { results: formatted, total: results.length } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );

  // ID lookup
  server.registerTool(
    "trakt_lookup",
    {
      title: "Lookup by ID",
      description: `Look up a Trakt item by an external ID (IMDb, TMDb, TVDB, or Trakt ID).

Useful for resolving IDs between different services.

Args:
  - id_type (string): Type of ID: "imdb", "tmdb", "tvdb", "trakt"
  - id (string): The ID value (e.g., "tt0903747" for IMDb)
  - type (string): Optional filter: "movie", "show", "episode", "person"

Returns:
  Array of matching items with their Trakt metadata and cross-service IDs.`,
      inputSchema: {
        id_type: z
          .enum(["imdb", "tmdb", "tvdb", "trakt"])
          .describe("Type of the external ID"),
        id: z.string().min(1).describe("The ID value to look up"),
        type: z
          .string()
          .optional()
          .describe('Filter by type: "movie", "show", "episode", "person"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id_type, id, type }) => {
      try {
        const params: Record<string, string> = {};
        if (type) params["type"] = type;

        const results = await traktRequest<TraktSearchResult[]>(
          `/search/${id_type}/${id}`,
          { params }
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
          structuredContent: { results } as StructuredContent,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleTraktError(error) }] };
      }
    }
  );
}
