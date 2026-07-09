// Central MCP server factory
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTools } from "./tools/search";
import { registerMovieTools } from "./tools/movies";
import { registerShowTools } from "./tools/shows";
import { registerUserTools } from "./tools/user";

export function createTraktMcpServer(getAccessToken: () => string | undefined): McpServer {
  const server = new McpServer({
    name: "trakt-mcp-server",
    version: "1.0.0",
  });

  // Register all tool groups
  registerSearchTools(server);
  registerMovieTools(server);
  registerShowTools(server);
  registerUserTools(server, getAccessToken);

  return server;
}
