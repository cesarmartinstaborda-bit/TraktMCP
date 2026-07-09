// Trakt API type definitions
// All interfaces include [key: string]: unknown to satisfy MCP SDK's
// structuredContent index signature requirement.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StructuredContent = Record<string, any>;

export interface TraktMovie {
  title: string;
  year: number;
  ids: {
    trakt: number;
    slug: string;
    imdb?: string;
    tmdb?: number;
  };
}

export interface TraktShow {
  title: string;
  year: number;
  ids: {
    trakt: number;
    slug: string;
    tvdb?: number;
    imdb?: string;
    tmdb?: number;
  };
}

export interface TraktEpisode {
  season: number;
  number: number;
  title: string;
  ids: {
    trakt: number;
    tvdb?: number;
    imdb?: string;
    tmdb?: number;
  };
}

export interface TraktSeason {
  number: number;
  ids: {
    trakt: number;
    tvdb?: number;
    tmdb?: number;
  };
}

export interface TraktPerson {
  name: string;
  ids: {
    trakt: number;
    slug: string;
    imdb?: string;
    tmdb?: number;
  };
}

export interface TraktMovieSummary extends TraktMovie {
  tagline?: string;
  overview?: string;
  released?: string;
  runtime?: number;
  country?: string;
  updated_at?: string;
  trailer?: string;
  homepage?: string;
  status?: string;
  rating?: number;
  votes?: number;
  comment_count?: number;
  language?: string;
  available_translations?: string[];
  genres?: string[];
  certification?: string;
}

export interface TraktShowSummary extends TraktShow {
  overview?: string;
  first_aired?: string;
  airs?: {
    day?: string;
    time?: string;
    timezone?: string;
  };
  runtime?: number;
  certification?: string;
  network?: string;
  country?: string;
  updated_at?: string;
  trailer?: string;
  homepage?: string;
  status?: string;
  rating?: number;
  votes?: number;
  comment_count?: number;
  language?: string;
  available_translations?: string[];
  genres?: string[];
  aired_episodes?: number;
}

export interface TraktWatchlistItem {
  rank: number;
  id: number;
  listed_at: string;
  notes?: string;
  type: "movie" | "show" | "season" | "episode";
  movie?: TraktMovie;
  show?: TraktShow;
  season?: TraktSeason;
  episode?: TraktEpisode;
}

export interface TraktHistoryItem {
  id: number;
  watched_at: string;
  action: string;
  type: "movie" | "episode";
  movie?: TraktMovie;
  show?: TraktShow;
  episode?: TraktEpisode;
}

export interface TraktRatingItem {
  rated_at: string;
  rating: number;
  type: "movie" | "show" | "season" | "episode";
  movie?: TraktMovie;
  show?: TraktShow;
  season?: TraktSeason;
  episode?: TraktEpisode;
}

export interface TraktCollectionItem {
  collected_at: string;
  updated_at: string;
  movie?: TraktMovie;
  show?: TraktShow;
}

export interface TraktSearchResult {
  type: "movie" | "show" | "episode" | "person" | "list";
  score?: number;
  movie?: TraktMovie;
  show?: TraktShow;
  episode?: TraktEpisode;
  person?: TraktPerson;
}

export interface TraktCalendarItem {
  first_aired?: string;
  episode?: TraktEpisode;
  show?: TraktShow;
}

export interface TraktTrendingItem {
  watchers: number;
  movie?: TraktMovieSummary;
  show?: TraktShowSummary;
}

export interface TraktPopularItem {
  movie?: TraktMovieSummary;
  show?: TraktShowSummary;
}

export interface TraktWatchedItem {
  plays: number;
  last_watched_at: string;
  last_updated_at: string;
  movie?: TraktMovie;
  show?: TraktShow;
  seasons?: Array<{
    number: number;
    episodes: Array<{
      number: number;
      plays: number;
      last_watched_at: string;
    }>;
  }>;
}

export interface TraktUserProfile {
  username: string;
  private: boolean;
  name?: string;
  vip?: boolean;
  vip_ep?: boolean;
  ids: {
    slug: string;
  };
  joined_at?: string;
  location?: string;
  about?: string;
  gender?: string;
  age?: number;
  images?: {
    avatar?: {
      full?: string;
    };
  };
}

export interface TraktUserStats {
  movies: {
    plays: number;
    watched: number;
    minutes: number;
    collected: number;
    ratings: number;
    comments: number;
  };
  shows: {
    watched: number;
    collected: number;
    ratings: number;
    comments: number;
  };
  seasons: {
    ratings: number;
    comments: number;
  };
  episodes: {
    plays: number;
    watched: number;
    minutes: number;
    collected: number;
    ratings: number;
    comments: number;
  };
  network: {
    friends: number;
    followers: number;
    following: number;
  };
  ratings: {
    total: number;
    distribution: Record<string, number>;
  };
}

export interface TraktCheckin {
  movie?: TraktMovie;
  show?: TraktShow;
  episode?: TraktEpisode;
  sharing?: {
    twitter?: boolean;
    mastodon?: boolean;
    tumblr?: boolean;
  };
  message?: string;
}

export interface TraktList {
  name: string;
  description?: string;
  privacy: "private" | "friends" | "public";
  display_numbers?: boolean;
  allow_comments?: boolean;
  sort_by?: string;
  sort_how?: string;
  created_at?: string;
  updated_at?: string;
  item_count?: number;
  comment_count?: number;
  likes?: number;
  ids: {
    trakt: number;
    slug: string;
  };
}

export interface TraktListItem {
  rank: number;
  id: number;
  listed_at: string;
  notes?: string;
  type: "movie" | "show" | "season" | "episode" | "person";
  movie?: TraktMovie;
  show?: TraktShow;
  season?: TraktSeason;
  episode?: TraktEpisode;
  person?: TraktPerson;
}
