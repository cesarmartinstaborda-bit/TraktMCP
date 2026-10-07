// OAuth authorize endpoint
// Redirects MCP clients to Trakt's authorization page
// After Trakt auth, user is redirected back to /api/auth/callback
import { challengeFromVerifier, createNonce, verifierFromNonce } from "@/lib/pkce";
import { getBaseUrl } from "@/lib/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  // Pass through OAuth parameters from the MCP client
  const clientId = process.env["TRAKT_CLIENT_ID"];
  if (!clientId) {
    return NextResponse.json(
      { error: "server_error", error_description: "TRAKT_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  if (!process.env["TRAKT_CLIENT_SECRET"]) {
    return NextResponse.json(
      { error: "server_error", error_description: "TRAKT_CLIENT_SECRET not configured" },
      { status: 500 }
    );
  }
  // Capture the MCP client's redirect_uri and state so we can relay them after the Trakt callback
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state = searchParams.get("state") ?? "";
  const codeChallenge = searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "";

  const baseUrl = getBaseUrl();

  // Store MCP client params in state so the callback can relay the code back
  // We encode them in the state we send to Trakt
  const nonce = createNonce();
  const upstreamChallenge = challengeFromVerifier(verifierFromNonce(nonce));

  const relayState = encodeURIComponent(
    JSON.stringify({ redirect_uri: redirectUri, state, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, nonce })
  );

  // Our callback URL that Trakt will redirect to
  const ourCallback = `${baseUrl}/api/auth/callback`;

  const traktAuthUrl = new URL("https://trakt.tv/oauth/authorize");
  traktAuthUrl.searchParams.set("response_type", "code");
  traktAuthUrl.searchParams.set("client_id", clientId);
  traktAuthUrl.searchParams.set("redirect_uri", ourCallback);
  traktAuthUrl.searchParams.set("state", relayState);
  traktAuthUrl.searchParams.set("code_challenge", upstreamChallenge);
  traktAuthUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(traktAuthUrl.toString());
}
