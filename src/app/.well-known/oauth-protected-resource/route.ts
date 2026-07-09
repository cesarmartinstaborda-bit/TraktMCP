// OAuth Protected Resource metadata endpoint (RFC 9728)
// Required by MCP spec for OAuth discovery.
// Points MCP clients to our AS metadata at /.well-known/oauth-authorization-server
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getBaseUrl(): string {
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"]) {
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  }
  if (process.env["NEXT_PUBLIC_BASE_URL"]) {
    return process.env["NEXT_PUBLIC_BASE_URL"];
  }
  return "http://localhost:3000";
}

export async function GET(): Promise<NextResponse> {
  const baseUrl = getBaseUrl();

  // This server is both the Resource Server and the Authorization Server
  const metadata = {
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["read", "write", "checkin"],
    resource_documentation: "https://docs.trakt.tv",
  };

  return NextResponse.json(metadata, { headers: CORS_HEADERS });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
