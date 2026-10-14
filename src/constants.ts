import type { Props } from "astro";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconLinkedin from "@/assets/icons/IconLinkedin.svg";
import IconStrava from "@/assets/icons/IconStrava.svg";
import IconRss from "@/assets/icons/IconRss.svg";
import { SITE } from "@/config";

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
}

export const SOCIALS: Social[] = [
  {
    name: "GitHub",
    href: "https://github.com/bendrucker",
    linkTitle: `${SITE.title} on GitHub`,
    icon: IconGitHub,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/bendrucker/",
    linkTitle: `${SITE.title} on LinkedIn`,
    icon: IconLinkedin,
  },
  {
    name: "Strava",
    href: "https://www.strava.com/athletes/5723594",
    linkTitle: `${SITE.title} on Strava`,
    icon: IconStrava,
  },
  {
    name: "Mail",
    href: "mailto:bvdrucker@gmail.com",
    linkTitle: `Send an email to ${SITE.title}`,
    icon: IconMail,
  },
  {
    name: "RSS",
    href: "/rss.xml",
    linkTitle: `RSS Feed for ${SITE.title}`,
    icon: IconRss,
  },
] as const;
