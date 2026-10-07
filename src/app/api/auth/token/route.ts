// OAuth token endpoint
// Proxies token exchange and refresh requests to Trakt's OAuth token endpoint
// MCP clients POST here with code + code_verifier to get an access token
import { unpackCode, verifierFromNonce } from "@/lib/pkce";
import { getBaseUrl } from "@/lib/utils";
import { type NextRequest, NextResponse } from "next/server";

const TRAKT_TOKEN_URL = "https://api.trakt.tv/oauth/token";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientId = process.env["TRAKT_CLIENT_ID"];
  const clientSecret = process.env["TRAKT_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "server_error", error_description: "Server not configured" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  let body: Record<string, string>;
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text).entries());
    } else {
      body = (await req.json()) as Record<string, string>;
    }
  } catch {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Could not parse request body",
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const grantType = body["grant_type"];
  const baseUrl = getBaseUrl();

  if (grantType === "authorization_code") {
    const rawCode = body["code"];
    if (!rawCode) {
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing code parameter",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { code, nonce } = unpackCode(rawCode);

    // Trakt requires PKCE for this client. The two PKCE legs are independent:
    // body["code_verifier"] belongs to the MCP client -> this server leg and
    // must NOT be forwarded to Trakt.
    const traktResponse = await fetch(TRAKT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        grant_type: "authorization_code",
        ...(nonce ? { code_verifier: verifierFromNonce(nonce) } : {}),
      }),
    });

    if (!traktResponse.ok) {
      const errorBody = await traktResponse.text();
      console.error("Trakt token exchange failed:", errorBody);
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Token exchange failed" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const tokenData = (await traktResponse.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      scope: string;
    };

    // Return standard OAuth2 token response
    return NextResponse.json(
      {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type ?? "Bearer",
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: "read write checkin",
      },
      { headers: CORS_HEADERS },
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = body["refresh_token"];
    if (!refreshToken) {
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing refresh_token parameter",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const traktResponse = await fetch(TRAKT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        grant_type: "refresh_token",
      }),
    });

    if (!traktResponse.ok) {
      const errorBody = await traktResponse.text();
      console.error("Trakt refresh failed:", errorBody);
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Token refresh failed" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const tokenData = (await traktResponse.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
    };

    return NextResponse.json(
      {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type ?? "Bearer",
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: "read write checkin",
      },
      { headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      error: "unsupported_grant_type",
      error_description: `Unsupported grant_type: ${grantType}`,
    },
    { status: 400, headers: CORS_HEADERS },
  );
}
