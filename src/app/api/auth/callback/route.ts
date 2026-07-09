// Trakt OAuth callback handler
// Two modes:
// 1. MCP client flow: relay code + state back to the MCP client's redirect_uri
// 2. Manual flow (from landing page): exchange code for token and show it
import { type NextRequest, NextResponse } from "next/server";

const TRAKT_API = "https://api.trakt.tv";

function getBaseUrl(): string {
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"]) {
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  }
  if (process.env["NEXT_PUBLIC_BASE_URL"]) {
    return process.env["NEXT_PUBLIC_BASE_URL"];
  }
  return "http://localhost:3000";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = getBaseUrl();

  if (error) {
    // Try to relay error back to MCP client if state contains redirect_uri
    if (rawState) {
      try {
        const relayState = JSON.parse(decodeURIComponent(rawState)) as {
          redirect_uri?: string;
          state?: string;
        };
        if (relayState.redirect_uri) {
          const dest = new URL(relayState.redirect_uri);
          dest.searchParams.set("error", error);
          if (relayState.state) dest.searchParams.set("state", relayState.state);
          return NextResponse.redirect(dest.toString());
        }
      } catch {
        // Fall through to landing page error
      }
    }
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_code`);
  }

  // Parse state to detect if this is an MCP client flow
  type RelayState = {
    redirect_uri?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  };

  let relayState: RelayState | null = null;

  if (rawState) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawState)) as RelayState;
      relayState = parsed;
    } catch {
      // Not a relay state — could be direct state from landing page (no relay)
    }
  }

  // MCP client flow: relay the code back to the MCP client without exchanging it here.
  // The MCP client will exchange the code using the token endpoint.
  if (relayState?.redirect_uri) {
    const dest = new URL(relayState.redirect_uri);
    dest.searchParams.set("code", code);
    if (relayState.state) dest.searchParams.set("state", relayState.state);
    return NextResponse.redirect(dest.toString());
  }

  // Manual flow (user clicked "Connect with Trakt" on landing page):
  // Exchange the code for an access token and display it.
  const clientId = process.env["TRAKT_CLIENT_ID"];
  const clientSecret = process.env["TRAKT_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/?error=server_configuration_error`);
  }

  try {
    const tokenResponse = await fetch(`${TRAKT_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return NextResponse.redirect(
      `${baseUrl}/?access_token=${encodeURIComponent(tokenData.access_token)}`
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?error=internal_error`);
  }
}
