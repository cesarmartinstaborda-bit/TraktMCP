const PUBLIC_TOOLS = [
  "trakt_search",
  "trakt_lookup",
  "trakt_get_movie",
  "trakt_trending_movies",
  "trakt_popular_movies",
  "trakt_related_movies",
  "trakt_movie_people",
  "trakt_anticipated_movies",
  "trakt_get_show",
  "trakt_trending_shows",
  "trakt_popular_shows",
  "trakt_get_show_seasons",
  "trakt_get_season_episodes",
  "trakt_get_episode",
  "trakt_related_shows",
  "trakt_show_people",
];

const AUTH_TOOLS = [
  "trakt_get_profile",
  "trakt_get_stats",
  "trakt_get_watchlist",
  "trakt_add_to_watchlist",
  "trakt_remove_from_watchlist",
  "trakt_get_history",
  "trakt_add_to_history",
  "trakt_get_ratings",
  "trakt_add_rating",
  "trakt_get_watched",
  "trakt_checkin",
  "trakt_delete_checkin",
  "trakt_get_lists",
  "trakt_get_list_items",
  "trakt_get_calendar",
  "trakt_get_recommendations",
];

const HOSTED_MCP_URL = "http://trakt-mcp.lorenzo0111.me/api/mcp";

function getBaseUrl(): string {
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"]) {
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  }
  if (process.env["NEXT_PUBLIC_BASE_URL"]) {
    return process.env["NEXT_PUBLIC_BASE_URL"];
  }
  return "http://localhost:3000";
}

interface PageProps {
  searchParams: Promise<{ access_token?: string; error?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const accessToken = params.access_token;
  const error = params.error;

  const baseUrl = getBaseUrl();
  const clientId = process.env["TRAKT_CLIENT_ID"] ?? "";

  const traktAuthUrl = clientId
    ? `https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(`${baseUrl}/api/auth/callback`)}`
    : null;

  return (
    <main className="container">
      {/* Header */}
      <header className="hero">
        <div className="badge">
          <span className="badge-dot" />
          MCP Server for Trakt.TV
        </div>

        <h1 className="hero-title">
          Connect your Trakt account to{" "}
          <span className="gradient-text">AI clients</span>
        </h1>

        <p className="hero-subtitle">
          Query watch history, watchlist, ratings, and recommendations directly
          within custom GPTs, Claude Desktop, or other Model Context Protocol
          integrations.
        </p>

        {/* Hosted banner */}
        <div className="hosted-banner">
          <div className="hosted-banner-title">Hosted Endpoint URL</div>
          <div className="hosted-banner-url">{HOSTED_MCP_URL}</div>
        </div>
      </header>

      {/* Connection Card */}
      <section className="auth-section">
        <h2>Authentication</h2>
        <p>
          Public tools (search, trending, metadata) do not require
          authentication. Connect your Trakt profile below to access your
          watchlist, personal ratings, viewing history, check-ins, and
          recommendations.
        </p>

        {traktAuthUrl ? (
          <a href={traktAuthUrl} className="btn-primary" id="connect-trakt-btn">
            Connect with Trakt
          </a>
        ) : (
          <div className="error-box">
            ⚠️ <strong>TRAKT_CLIENT_ID</strong> environment variable is not
            configured.
          </div>
        )}

        {accessToken && (
          <div className="token-box" id="token-display">
            <div className="token-box-header">
              <span className="check-icon">✓</span>
              <span>Authorization token generated</span>
            </div>
            <div className="token-value">{accessToken}</div>
            <button
              className="copy-btn"
              id="copy-token-btn"
              onClick={() =>
                navigator.clipboard.writeText(accessToken).then(() => {
                  const btn = document.getElementById("copy-token-btn");
                  if (btn) btn.textContent = "✓ Copied!";
                })
              }
            >
              Copy Token
            </button>
            <p
              style={{
                marginTop: "12px",
                fontSize: "0.82rem",
                color: "var(--text-muted)",
              }}
            >
              Use this token in your MCP configuration headers. Keep it private.
            </p>
          </div>
        )}

        {error && (
          <div className="error-box">
            Authentication failed: {error.replace(/_/g, " ")}
          </div>
        )}
      </section>

      {/* Main Content */}
      <section className="section">
        <h2>Client Configuration</h2>
        <div className="code-block">
          <pre>{`{
  "mcpServers": {
    "trakt": {
      "url": "${HOSTED_MCP_URL}",
      "headers": {
        "Authorization": "Bearer YOUR_TRAKT_ACCESS_TOKEN"
      }
    }
  }
}`}</pre>
        </div>
        <p className="config-note">
          Paste this configuration snippet directly into your MCP-compatible
          client JSON configuration. Remove the <code>headers</code> object
          entirely if you only intend to use public tools.
        </p>
      </section>

      {/* Feature Cards */}
      <section className="section">
        <h2>Capabilities</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Search & Discover</h3>
            <p>
              Query movies, shows, seasons, episodes, and crew. Access trending
              lists.
            </p>
          </div>
          <div className="feature-card">
            <h3>Watchlist</h3>
            <p>Read, add, or delete watchlists objects in real time.</p>
          </div>
          <div className="feature-card">
            <h3>Syncing</h3>
            <p>
              Retrieve past history lists, check viewing stats, and log
              viewings.
            </p>
          </div>
          <div className="feature-card">
            <h3>Feedback Loop</h3>
            <p>
              Add rating weights (1–10) or query taste profiles for automated
              recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Available Tools */}
      <section className="tools-section">
        <h2>Available Tools ({PUBLIC_TOOLS.length + AUTH_TOOLS.length})</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          ⚡ Public · <span style={{ color: "#ea4335" }}>🔒 Requires Auth</span>
        </p>
        <div className="tools-grid">
          {PUBLIC_TOOLS.map((tool) => (
            <div key={tool} className="tool-chip">
              {tool}
            </div>
          ))}
          {AUTH_TOOLS.map((tool) => (
            <div key={tool} className="tool-chip requires-auth">
              <span className="lock-icon">🔒</span>
              {tool}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
