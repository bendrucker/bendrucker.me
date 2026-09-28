/**
 * What Writing's search announces through its live region: "3 posts" while a
 * query is set, and nothing otherwise. The server renders it for a `q` in the
 * URL and the page script rewrites it per keystroke, so it stays apart from
 * the view model to keep the script small.
 */
export function searchStatus(query: string, count: number): string {
  if (query.trim() === "") return "";
  return count === 1 ? "1 post" : `${count} posts`;
}
