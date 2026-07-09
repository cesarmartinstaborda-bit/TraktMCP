// Dynamic Client Registration (RFC 7591)
// MCP clients POST here with client metadata before starting OAuth.
// We echo back the redirect_uris from the request and return our Trakt client_id.
import { type NextRequest, NextResponse } from "next/server";

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
  if (!clientId) {
    return NextResponse.json(
      { error: "server_error", error_description: "Server not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // Parse the registration request from the MCP client
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // Empty body is fine — use defaults
  }

  // The client sends redirect_uris; we must echo them back (RFC 7591 §3.2.1)
  const redirectUris = Array.isArray(body["redirect_uris"])
    ? (body["redirect_uris"] as string[])
    : [];

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_name: body["client_name"] ?? "Trakt MCP Client",
      scope: "read write checkin",
    },
    { status: 201, headers: CORS_HEADERS }
  );
}
