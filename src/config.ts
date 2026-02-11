export const SITE = {
  website: "https://www.bendrucker.me/",
  author: "Ben Drucker",
  profile: "https://www.bendrucker.me/",
  desc: "Programmer, photographer, cyclist.",
  title: "Ben Drucker",
  ogImage: "ben-drucker-sq.png",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  viewSource: {
    text: "View Source",
    url: "https://github.com/bendrucker/bendrucker.me/blob/master/",
  },
  dynamicOgImage: false,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "America/Los_Angeles", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  githubUsername: "bendrucker",
} as const;
