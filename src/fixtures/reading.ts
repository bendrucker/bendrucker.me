import { z } from "zod";
import { ReadingItemSchema, type ReadingItem } from "@/media/types";

/*
 * Sample reading, standing in for Goodreads and Matter until a real source
 * lands. `loadReading` is the signature that source implements.
 */
const READING = [
  {
    type: "Book",
    title: "Piranesi",
    text: "Susanna Clarke",
    day: "2026-09-24",
    url: "https://www.goodreads.com/search?q=Piranesi+Susanna+Clarke",
    via: "Goodreads",
  },
  {
    type: "Article",
    title: "The Web We Lost",
    text: "Anil Dash",
    note: "Your own note, from the Matter annotation.",
    day: "2026-09-20",
    url: "https://anildash.com/2012/12/13/the_web_we_lost/",
    via: "anildash.com",
  },
  {
    type: "Article",
    title: "Local-first software",
    text: "Martin Kleppmann et al.",
    day: "2026-09-03",
    url: "https://www.inkandswitch.com/local-first/",
    via: "inkandswitch.com",
  },
  {
    type: "Book",
    title: "The Overstory",
    text: "Richard Powers",
    note: "Your own note, from the Goodreads review.",
    day: "2026-08-30",
    url: "https://www.goodreads.com/search?q=The+Overstory+Richard+Powers",
    via: "Goodreads",
  },
  {
    type: "Article",
    title: "Choose Boring Technology",
    text: "Dan McKinley",
    day: "2026-08-14",
    url: "https://mcfunley.com/choose-boring-technology",
    via: "mcfunley.com",
  },
  {
    type: "Article",
    title: "Things You Should Never Do, Part I",
    text: "Joel Spolsky",
    day: "2026-07-29",
    url: "https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/",
    via: "joelonsoftware.com",
  },
  {
    type: "Book",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    text: "Gabrielle Zevin",
    day: "2026-07-21",
    url: "https://www.goodreads.com/search?q=Tomorrow%2C+and+Tomorrow%2C+and+Tomorrow",
    via: "Goodreads",
  },
  {
    type: "Article",
    title: "Reflections on Trusting Trust",
    text: "Ken Thompson",
    day: "2026-07-10",
    url: "https://www.cs.cmu.edu/~rdriley/487/papers/Thompson_1984_ReflectionsonTrustingTrust.pdf",
    via: "cs.cmu.edu",
  },
];

/** Books and articles, newest first. */
export async function loadReading(): Promise<ReadingItem[]> {
  const items = z.array(ReadingItemSchema).parse(READING);
  return items.toSorted((a, b) => b.day.localeCompare(a.day));
}
