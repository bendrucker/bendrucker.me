export interface Repo {
  name: string;
  owner: string;
  description: string;
  url: string;
  primaryLanguage: {
    name: string;
    color: string;
    extension: string | null;
  } | null;
  stargazerCount: number;
  createdAt: string | null;
  lastActivity: string;
  activitySummary: {
    prCount: number;
    reviewCount: number;
    issueCount: number;
    mergeCount: number;
    hasMergedPRs: boolean;
  };
  years: number[];
}

export interface Language {
  name: string;
  color: string;
  extension: string | null;
  count: number;
}

export interface YearCount {
  year: number;
  count: number;
}

// The sort control renders its options from this list and narrows the value it
// reads back against it, so an option and the type cannot drift apart.
export const SORT_ORDERS = ["recent", "active", "stars", "name"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

export interface FilterState {
  owner: "all" | "personal" | "external";
  language: string | null;
  search: string;
  sort: SortOrder;
  year: number | null;
}

export interface ActivityState {
  repos: Repo[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  total: number;
  filters: FilterState;
  languages: Language[];
  years: YearCount[];
  currentYear: number | null;
}
