import type { APIRoute } from "astro";
import { codeDetailResponse } from "@/code/detailResponse";

// A repository as the Code list's modal shows it. See `[project].json.ts`.

export const GET: APIRoute = async ({ params }) =>
  codeDetailResponse(`${params.owner ?? ""}/${params.repo ?? ""}`);
