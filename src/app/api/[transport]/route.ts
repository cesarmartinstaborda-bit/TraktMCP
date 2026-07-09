// Main MCP API route - deployed at /api/mcp
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { type AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { registerSearchTools } from '@/lib/tools/search';
import { registerMovieTools } from '@/lib/tools/movies';
import { registerShowTools } from '@/lib/tools/shows';
import { registerUserTools } from '@/lib/tools/user';

const verifyToken = async (
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  try {
    const clientId = process.env['TRAKT_CLIENT_ID'];
    if (!clientId) return undefined;
    const response = await fetch('https://api.trakt.tv/users/me', {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-key': clientId,
        'trakt-api-version': '2',
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (!response.ok) return undefined;
    const user = (await response.json()) as { username?: string };
    return {
      token: bearerToken,
      scopes: ['read', 'write', 'checkin'],
      clientId: user.username ?? 'trakt-user',
      extra: { username: user.username, accessToken: bearerToken },
    };
  } catch {
    return undefined;
  }
};

async function handler(req: Request): Promise<Response> {
  let accessToken: string | undefined;
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7);
    const authInfo = await verifyToken(req, bearerToken);
    if (authInfo?.extra) {
      accessToken = (authInfo.extra as { accessToken?: string }).accessToken;
    }
  }
  const getAccessToken = () => accessToken;

  const mcpHandler = createMcpHandler(
    (server) => {
      registerSearchTools(server);
      registerMovieTools(server);
      registerShowTools(server);
      registerUserTools(server, getAccessToken);
    },
    {},
    { basePath: '/api' }
  );

  const authHandler = withMcpAuth(mcpHandler, verifyToken, {
    required: false,
    resourceMetadataPath: '/.well-known/oauth-protected-resource',
  });

  return authHandler(req);
}

export { handler as GET, handler as POST, handler as DELETE };
