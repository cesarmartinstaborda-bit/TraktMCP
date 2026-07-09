// Trakt API client
// Base URL: https://api.trakt.tv
// All requests require: Content-Type, trakt-api-key, trakt-api-version headers
// OAuth endpoints also require: Authorization: Bearer <access_token>

const TRAKT_API_BASE = "https://api.trakt.tv";
const TRAKT_API_VERSION = "2";
const CHARACTER_LIMIT = 30000;

export { CHARACTER_LIMIT };

export interface TraktRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  accessToken?: string;
}

export class TraktApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "TraktApiError";
  }
}

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(`${TRAKT_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function traktRequest<T>(
  endpoint: string,
  options: TraktRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, params, accessToken } = options;

  const clientId = process.env["TRAKT_CLIENT_ID"];
  if (!clientId) {
    throw new TraktApiError(500, "TRAKT_CLIENT_ID environment variable is not set");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "trakt-api-key": clientId,
    "trakt-api-version": TRAKT_API_VERSION,
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }

    switch (response.status) {
      case 401:
        throw new TraktApiError(
          401,
          "Unauthorized: OAuth access token required or invalid. Please re-authenticate.",
          errorDetails
        );
      case 403:
        throw new TraktApiError(
          403,
          "Forbidden: You don't have permission to access this resource.",
          errorDetails
        );
      case 404:
        throw new TraktApiError(
          404,
          "Not Found: The requested resource does not exist. Check IDs/slugs.",
          errorDetails
        );
      case 409:
        throw new TraktApiError(
          409,
          "Conflict: Item already checked in or duplicate request.",
          errorDetails
        );
      case 420:
        throw new TraktApiError(
          420,
          "Account limit exceeded. Consider upgrading to Trakt VIP.",
          errorDetails
        );
      case 429:
        throw new TraktApiError(
          429,
          "Rate limit exceeded. Please wait before making more requests.",
          errorDetails
        );
      case 500:
      case 502:
      case 503:
      case 504:
        throw new TraktApiError(
          response.status,
          `Trakt API server error (${response.status}). Please try again later.`,
          errorDetails
        );
      default:
        throw new TraktApiError(
          response.status,
          `API request failed with status ${response.status}`,
          errorDetails
        );
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export function handleTraktError(error: unknown): string {
  if (error instanceof TraktApiError) {
    return `Error (${error.status}): ${error.message}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: An unexpected error occurred`;
}

export function truncateResponse(data: string, limit = CHARACTER_LIMIT): string {
  if (data.length <= limit) return data;
  return (
    data.slice(0, limit) +
    `\n\n[Response truncated at ${limit} characters. Use pagination parameters (page, limit) to get more results.]`
  );
}
