// OAuth Authorization Server metadata endpoint (RFC 8414)
// Required by MCP clients to discover how to initiate the OAuth flow
// This server acts as an AS that wraps Trakt's OAuth
import { getBaseUrl } from "@/lib/utils";
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(): Promise<NextResponse> {
  const baseUrl = getBaseUrl();

  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/authorize`,
    token_endpoint: `${baseUrl}/api/auth/token`,
    registration_endpoint: `${baseUrl}/api/auth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["read", "write", "checkin"],
    service_documentation: "https://docs.trakt.tv",
  };

  return NextResponse.json(metadata, { headers: CORS_HEADERS });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
