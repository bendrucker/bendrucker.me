export const SITE = {
  website: "https://www.bendrucker.me/",
  trailingSlash: "always",
  author: "Ben Drucker",
  profile: "https://www.bendrucker.me/",
  desc: "Programmer, photographer, cyclist.",
  title: "Ben Drucker",
  ogImage: "ben-drucker-sq.png",
  lightAndDarkMode: true,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showBackButton: true, // show back button in post detail
  viewSource: {
    text: "View source",
    url: "https://github.com/bendrucker/bendrucker.me/blob/HEAD/",
  },
  dynamicOgImage: false,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "America/Los_Angeles", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  githubUsername: "bendrucker",
  /**
   * Which categories the site shows. Reading, Watching, and Listening run on
   * fixtures, so production builds leave them off until a real source lands.
   * Use `isEnabled`, which also turns every one on in development and under
   * `PUBLIC_ALL_CATEGORIES=1`, rather than reading these directly.
   */
  categories: {
    rides: true,
    code: true,
    writing: true,
    reading: false,
    watching: false,
    listening: false,
  },
} as const;

export type CategoryId = keyof typeof SITE.categories;

interface CategoryEnv {
  DEV?: boolean;
  PUBLIC_ALL_CATEGORIES?: string;
}

/**
 * Whether a category is on in this build. A category that is off has no home
 * card, no routes, no credits, and no entries in the sitemap, `llms.txt`, or
 * RSS. Development builds and `PUBLIC_ALL_CATEGORIES=1` turn every one on, so
 * a production-shaped build can still be reviewed whole.
 */
export function isEnabled(
  category: CategoryId,
  env: CategoryEnv = import.meta.env,
): boolean {
  return (
    SITE.categories[category] ||
    env.DEV === true ||
    env.PUBLIC_ALL_CATEGORIES === "1"
  );
}

function isCategoryId(segment: string): segment is CategoryId {
  return Object.hasOwn(SITE.categories, segment);
}

/** Whether a path falls under the route of a category that is off in this build. */
export function isSwitchedOff(
  pathname: string,
  env: CategoryEnv = import.meta.env,
): boolean {
  const section = pathname.split("/").find(Boolean) ?? "";
  return isCategoryId(section) && !isEnabled(section, env);
}
