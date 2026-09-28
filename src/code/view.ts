// What the Code list shows for a set of filters. The server renders it from
// the URL and the island reruns it as the filters change, so both read the
// same function and a shared link lands on the same list.
import { matches } from "@/activity/search";
import {
  groupRows,
  monthShort,
  type GroupedRow,
  type Section,
} from "@/activity/sections";

/** A repository, or a project standing in for its repositories. */
export interface CodeRow {
  /** `owner/name` for a repository, the id for a project. */
  key: string;
  href: string;
  title: string;
  /** The owner, when it isn't the site's own. */
  org: string;
  /** A repository's description, or a project's members. */
  text: string;
  /** A repository leads with its language's diamond, a project with it in a ring. */
  lead: "dot" | "ring";
  /** The language's color, a project's from its best repository. */
  dot: string;
  mine: boolean;
  langs: string[];
  /** The local day of the last contribution, `YYYY-MM-DD`. */
  day: string;
  /** The ranking score, which never shows. */
  score: number;
  /** Pull requests and issues opened in the window. */
  activity: number;
  /** A project's repositories, strongest first. Empty for a repository. */
  members: CodeMember[];
}

/**
 * A project's repository. Search reads its name and description, and a
 * language filter rebuilds the project's row from the ones that match.
 */
export interface CodeMember {
  /** `owner/name`. */
  key: string;
  href: string;
  title: string;
  text: string;
  dot: string;
  /** Its language, or empty when GitHub doesn't name one. */
  lang: string;
  day: string;
  activity: number;
}

/** A language the select offers, with the diamond it shows once chosen. */
export interface LanguageOption {
  value: string;
  label: string;
  color: string;
}

export const OWNERS = ["all", "mine", "others"] as const;
export const SORTS = ["recent", "active", "name"] as const;

export type CodeOwner = (typeof OWNERS)[number];
export type CodeSort = (typeof SORTS)[number];

export const OWNER_OPTIONS: readonly { value: CodeOwner; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "others", label: "Others" },
];

export const SORT_OPTIONS: readonly { value: CodeSort; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "active", label: "Most active" },
  { value: "name", label: "Name" },
];

export interface CodeFilters {
  q: string;
  owner: CodeOwner;
  /** A language name, or empty for any. */
  lang: string;
  sort: CodeSort;
}

export const DEFAULT_FILTERS: Readonly<CodeFilters> = {
  q: "",
  owner: "all",
  lang: "",
  sort: "recent",
};

/** Highlights on a desktop. A phone shows the first three, hiding the rest in CSS. */
export const HIGHLIGHTS = 5;
export const PHONE_HIGHLIGHTS = 3;

function oneOf<T extends string>(
  values: readonly T[],
  value: string | null,
): T | undefined {
  return values.find((candidate) => candidate === value);
}

export function ownerFrom(value: string | null): CodeOwner {
  return oneOf(OWNERS, value) ?? DEFAULT_FILTERS.owner;
}

export function sortFrom(value: string | null): CodeSort {
  return oneOf(SORTS, value) ?? DEFAULT_FILTERS.sort;
}

/** The language the select offers under that name in any case, or none. */
export function languageFrom(
  value: string | null,
  languages: readonly LanguageOption[],
): string {
  const wanted = value?.toLowerCase();
  return (
    languages.find((option) => option.value.toLowerCase() === wanted)?.value ??
    DEFAULT_FILTERS.lang
  );
}

/** The filters a URL names. Anything unrecognized falls back to the default. */
export function parseFilters(
  params: URLSearchParams,
  languages: readonly LanguageOption[],
): CodeFilters {
  return {
    q: params.get("q") ?? DEFAULT_FILTERS.q,
    owner: ownerFrom(params.get("owner")),
    lang: languageFrom(params.get("lang"), languages),
    sort: sortFrom(params.get("sort")),
  };
}

/** The members, strongest first, stand in for a project's description. */
export function memberSummary(names: readonly string[]): string {
  if (names.length > 3) {
    return `${names[0]}, ${names[1]}, and ${names.length - 2} more`;
  }
  return names.join(", ");
}

/** What the search's live region announces as the list changes. */
export function countLabel(count: number): string {
  return count === 1 ? "1 repository" : `${count} repositories`;
}

/** The query string for a set of filters, leaving out every default. */
export function filterSearch(filters: CodeFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q);
  if (filters.owner !== DEFAULT_FILTERS.owner)
    params.set("owner", filters.owner);
  if (filters.lang) params.set("lang", filters.lang);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  const search = params.toString();
  return search ? `?${search}` : "";
}

const FILTER_KEYS = ["q", "owner", "lang", "sort"] as const;

/** A query string with the filters swapped in, keeping every parameter they don't own. */
export function withFilters(search: string, filters: CodeFilters): string {
  const params = new URLSearchParams(search);
  for (const key of FILTER_KEYS) params.delete(key);
  for (const [key, value] of new URLSearchParams(filterSearch(filters))) {
    params.set(key, value);
  }
  const merged = params.toString();
  return merged ? `?${merged}` : "";
}

/** Whether the list is in its default state, the only one that leads with highlights. */
export function isDefault(filters: CodeFilters): boolean {
  return (
    !filters.q.trim() &&
    filters.owner === DEFAULT_FILTERS.owner &&
    !filters.lang &&
    filters.sort === DEFAULT_FILTERS.sort
  );
}

/** A project's lone match, as a row of its own. */
function memberRow(project: CodeRow, member: CodeMember): CodeRow {
  const [owner = ""] = member.key.split("/");
  return {
    key: member.key,
    href: member.href,
    title: member.title,
    org: project.mine ? "" : owner,
    text: member.text,
    lead: "dot",
    dot: member.dot,
    mine: project.mine,
    langs: member.lang ? [member.lang] : [],
    day: member.day,
    score: 0,
    activity: member.activity,
    members: [],
  };
}

/**
 * A row as a language filter shows it, or undefined when it drops out. A
 * project shows through its members in that language, so its diamond, its
 * members, and its day all belong to the language chosen.
 */
function inLanguage(row: CodeRow, lang: string): CodeRow | undefined {
  if (!lang) return row;
  if (row.members.length === 0) {
    return row.langs.includes(lang) ? row : undefined;
  }

  const members = row.members.filter((member) => member.lang === lang);
  const [first] = members;
  if (!first) return undefined;
  if (members.length === row.members.length) return row;
  if (members.length === 1) return memberRow(row, first);

  return {
    ...row,
    text: memberSummary(members.map((member) => member.title)),
    dot: first.dot,
    langs: [lang],
    day:
      members
        .map((member) => member.day)
        .toSorted()
        .at(-1) ?? row.day,
    activity: members.reduce((sum, member) => sum + member.activity, 0),
    members,
  };
}

/** Whether a row survives the query, reading every member a project holds. */
function searched(row: CodeRow, q: string): boolean {
  return matches(
    {
      title: row.title,
      text: row.text,
      org: row.org,
      note: row.members
        .map((member) => `${member.title} ${member.text}`)
        .join("\n"),
    },
    q,
  );
}

export function filterRows(
  rows: readonly CodeRow[],
  filters: CodeFilters,
): CodeRow[] {
  const hit = rows.flatMap((row) => {
    if (filters.owner !== "all" && (filters.owner === "mine") !== row.mine) {
      return [];
    }
    const shown = inLanguage(row, filters.lang);
    return shown && searched(shown, filters.q) ? [shown] : [];
  });
  // A project rebuilt from fewer members can move to an earlier day.
  return filters.lang ? hit.toSorted(byRecency) : hit;
}

/** Most recently touched first, the order the server hands rows over in. */
export function byRecency(a: CodeRow, b: CodeRow): number {
  return b.day.localeCompare(a.day) || a.title.localeCompare(b.title);
}

/** Ranked by score, strongest first. A row with nothing to rank never leads. */
export function rankHighlights(
  rows: readonly CodeRow[],
  count = HIGHLIGHTS,
): CodeRow[] {
  return rows
    .filter((row) => row.score > 0)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, count);
}

/** What a row's timeline gutter draws: its day, and whether the line stops under it. */
export interface GutterMarks {
  showDay: boolean;
  weekEnd: boolean;
}

/**
 * A row in the month list. Highlights past the phone's three still show in
 * the months on a phone, where they are hidden from the highlights, and only
 * there, so nothing is listed twice at either width. A desktop skips those
 * rows, so its gutter can differ: the next row may be the first of its day,
 * or the one its week's line stops under.
 */
export interface ListedRow extends CodeRow {
  phoneOnly: boolean;
  phone: GutterMarks;
  desktop: GutterMarks;
}

/** A month section, which a desktop hides when it holds only phone rows. */
export type ListedSection = Section<ListedRow> & { phoneOnly: boolean };

export interface CodeView {
  highlights: CodeRow[];
  /** Month sections, while the list is sorted by recency. */
  sections: ListedSection[];
  /** One unlabeled run, under any other sort. */
  sorted: GroupedRow<CodeRow>[];
  count: number;
}

function sortRows(rows: readonly CodeRow[], sort: CodeSort): CodeRow[] {
  if (sort === "active") {
    return rows.toSorted(
      (a, b) => b.activity - a.activity || b.day.localeCompare(a.day),
    );
  }
  return rows.toSorted((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  );
}

export function codeView(
  rows: readonly CodeRow[],
  filters: CodeFilters,
  { thisYear }: { thisYear: string },
): CodeView {
  const hit = filterRows(rows, filters);

  if (filters.sort !== "recent") {
    return {
      highlights: [],
      sections: [],
      sorted: sortRows(hit, filters.sort).map((item) => ({
        item,
        showDay: true,
        dayNum: String(Number(item.day.slice(8, 10))),
        sub: monthShort(item.day),
      })),
      count: hit.length,
    };
  }

  const highlights = isDefault(filters) ? rankHighlights(hit) : [];
  const onPhone = new Set(highlights.slice(0, PHONE_HIGHLIGHTS));
  const onDesktop = new Set(highlights);
  const listed = hit
    .filter((row) => !onPhone.has(row))
    .map((row) => ({ row, phoneOnly: onDesktop.has(row), day: row.day }));

  return {
    highlights,
    sections: markGutters(groupRows(listed, "month", { thisYear })),
    sorted: [],
    count: hit.length,
  };
}

interface Listing {
  row: CodeRow;
  phoneOnly: boolean;
  day: string;
}

/** Each row's gutter at both widths, reading the list as each width shows it. */
function markGutters(sections: Section<Listing>[]): ListedSection[] {
  let desktopDay: string | undefined;

  return sections.map((section) => {
    const weeks = section.weeks.map((week) => {
      const lastOnDesktop = week.rows.findLast(({ item }) => !item.phoneOnly);
      return {
        key: week.key,
        rows: week.rows.map((grouped, i) => {
          const { row, phoneOnly } = grouped.item;
          const desktop = {
            showDay: !phoneOnly && row.day !== desktopDay,
            weekEnd: grouped === lastOnDesktop,
          };
          if (!phoneOnly) desktopDay = row.day;
          return {
            ...grouped,
            item: {
              ...row,
              phoneOnly,
              phone: {
                showDay: grouped.showDay,
                weekEnd: i === week.rows.length - 1,
              },
              desktop,
            },
          };
        }),
      };
    });

    return {
      key: section.key,
      label: section.label,
      weeks,
      phoneOnly: weeks.every((week) =>
        week.rows.every(({ item }) => item.phoneOnly),
      ),
    };
  });
}

export interface GutterCopy {
  key: string;
  marks: GutterMarks;
  /** Which width draws this copy, when the two differ. */
  class: "" | "md:hidden" | "max-md:hidden";
}

/**
 * The gutters a row draws: one when both widths mark it alike, otherwise one
 * per width, switched in CSS since a width check in script would paint the
 * wrong one before hydrating.
 */
export function gutterCopies(
  phone: GutterMarks,
  desktop: GutterMarks,
): GutterCopy[] {
  if (phone.showDay === desktop.showDay && phone.weekEnd === desktop.weekEnd) {
    return [{ key: "both", marks: phone, class: "" }];
  }
  return [
    { key: "phone", marks: phone, class: "md:hidden" },
    { key: "desktop", marks: desktop, class: "max-md:hidden" },
  ];
}

export { codeTransitionName as transitionName } from "@/transitions/names";
