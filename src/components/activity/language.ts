/**
 * The short form a language goes by where a name would not fit: its file
 * extension, or its name lowercased for one with no extension of its own.
 */
export function languageLabel(language: {
  name: string;
  extension: string | null;
}): string {
  return language.extension
    ? language.extension.slice(1)
    : language.name.toLowerCase();
}
