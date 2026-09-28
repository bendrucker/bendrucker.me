import { z } from "zod";
import { ListeningItemSchema, type ListeningItem } from "@/media/types";

/*
 * Sample listening, standing in for Last.fm and Apple Podcasts until a real
 * source lands. `loadListening` is the signature that source implements.
 *
 * Covers are in `static/fixtures/`, credited in the footer: from Apple's search
 * API, except Blonde, which it doesn't list, from the Cover Art Archive. The
 * artwork belongs to its owners.
 */
const LISTENING = [
  {
    type: "Album",
    title: "Promises",
    text: "Floating Points, Pharoah Sanders",
    art: "/fixtures/promises.jpg",
    label: "#d9c8a4",
    day: "2026-09-25",
    plays: 41,
    url: "https://www.last.fm/music/Floating+Points/Promises",
    via: "Last.fm",
  },
  {
    type: "Podcast",
    title: "Hard Fork",
    text: "The New York Times",
    art: "/fixtures/hard-fork.jpg",
    day: "2026-09-24",
    plays: 35,
    url: "https://podcasts.apple.com/us/search?term=Hard%20Fork",
    via: "Apple Podcasts",
  },
  {
    type: "Album",
    title: "In Rainbows",
    text: "Radiohead",
    art: "/fixtures/in-rainbows.jpg",
    label: "#e2482f",
    day: "2026-09-14",
    plays: 30,
    url: "https://www.last.fm/music/Radiohead/In+Rainbows",
    via: "Last.fm",
  },
  {
    type: "Podcast",
    title: "Acquired",
    text: "Ben Gilbert and David Rosenthal",
    art: "/fixtures/acquired.jpg",
    day: "2026-09-08",
    plays: 26,
    url: "https://podcasts.apple.com/us/search?term=Acquired",
    via: "Apple Podcasts",
  },
  {
    type: "Album",
    title: "Blonde",
    text: "Frank Ocean",
    art: "/fixtures/blonde.jpg",
    label: "#9fb4a5",
    day: "2026-08-28",
    plays: 22,
    url: "https://www.last.fm/music/Frank+Ocean/Blonde",
    via: "Last.fm",
  },
  {
    type: "Podcast",
    title: "The Rest Is History",
    text: "Goalhanger",
    art: "/fixtures/rest-history.jpg",
    day: "2026-08-02",
    plays: 6,
    url: "https://podcasts.apple.com/us/search?term=The%20Rest%20Is%20History",
    via: "Apple Podcasts",
  },
  {
    type: "Album",
    title: "Titanic Rising",
    text: "Weyes Blood",
    art: "/fixtures/titanic-rising.jpg",
    label: "#3d6f8f",
    day: "2026-07-17",
    plays: 14,
    url: "https://www.last.fm/music/Weyes+Blood/Titanic+Rising",
    via: "Last.fm",
  },
];

/** Albums and podcasts, newest first. */
export async function loadListening(): Promise<ListeningItem[]> {
  const items = z.array(ListeningItemSchema).parse(LISTENING);
  return items.toSorted((a, b) => b.day.localeCompare(a.day));
}
