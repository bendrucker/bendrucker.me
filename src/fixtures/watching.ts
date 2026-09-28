import { z } from "zod";
import { WatchingItemSchema, type WatchingItem } from "@/media/types";

/*
 * Sample watching, standing in for Trakt until a real source lands.
 * `loadWatching` is the signature that source implements.
 *
 * Posters are in `static/fixtures/`, credited in the footer: shows from TVmaze,
 * movies from Wikipedia. The artwork belongs to its owners.
 */
const WATCHING = [
  {
    type: "Show",
    title: "Slow Horses",
    text: "Season 5",
    art: "/fixtures/slow-horses.jpg",
    episodes: { watched: 4, aired: 6 },
    day: "2026-09-22",
    url: "https://trakt.tv/shows/slow-horses/seasons/5",
    via: "Trakt",
  },
  {
    type: "Show",
    title: "Silo",
    text: "Season 2",
    art: "/fixtures/silo.jpg",
    episodes: { watched: 7, aired: 10 },
    day: "2026-09-18",
    url: "https://trakt.tv/shows/silo/seasons/2",
    via: "Trakt",
  },
  {
    type: "Movie",
    title: "One Battle After Another",
    art: "/fixtures/one-battle.jpg",
    day: "2026-09-12",
    url: "https://trakt.tv/search?query=One+Battle+After+Another",
    via: "Trakt",
  },
  {
    type: "Show",
    title: "Severance",
    text: "Season 2",
    art: "/fixtures/severance.jpg",
    episodes: { watched: 10, aired: 10 },
    day: "2026-08-30",
    url: "https://trakt.tv/shows/severance/seasons/2",
    via: "Trakt",
  },
  {
    type: "Show",
    title: "The Bear",
    text: "Season 4",
    art: "/fixtures/the-bear.jpg",
    episodes: { watched: 10, aired: 10 },
    day: "2026-08-09",
    url: "https://trakt.tv/shows/the-bear/seasons/4",
    via: "Trakt",
  },
  {
    type: "Movie",
    title: "Sinners",
    art: "/fixtures/sinners.jpg",
    day: "2026-07-26",
    url: "https://trakt.tv/search?query=Sinners",
    via: "Trakt",
  },
  {
    type: "Show",
    title: "Andor",
    text: "Season 2",
    art: "/fixtures/andor.jpg",
    episodes: { watched: 12, aired: 12 },
    day: "2026-07-19",
    url: "https://trakt.tv/shows/andor/seasons/2",
    via: "Trakt",
  },
  {
    type: "Show",
    title: "The Pitt",
    text: "Season 1",
    art: "/fixtures/the-pitt.jpg",
    episodes: { watched: 15, aired: 15 },
    day: "2026-07-05",
    url: "https://trakt.tv/shows/the-pitt/seasons/1",
    via: "Trakt",
  },
];

/** Shows and movies, newest first. */
export async function loadWatching(): Promise<WatchingItem[]> {
  const items = z.array(WatchingItemSchema).parse(WATCHING);
  return items.toSorted((a, b) => b.day.localeCompare(a.day));
}
