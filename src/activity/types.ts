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
// reads back against it, so an option and the type cannot drift apart. The
// filter schema builds its enum from the same list.
export const SORT_ORDERS = ["recent", "active", "stars", "name"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

// "all" is the owner control's value for an unfiltered owner. The filter schema
// accepts it and drops it, so `FilterState` goes to an action as it stands.
export const OWNER_FILTERS = ["all", "personal", "external"] as const;

export type OwnerFilter = (typeof OWNER_FILTERS)[number];

// The filter controls' reactive state, assignable to the repos action's input
// so the composable sends it untranslated.
export interface FilterState {
  owner: OwnerFilter;
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
