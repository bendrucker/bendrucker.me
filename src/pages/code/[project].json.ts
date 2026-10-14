import type { APIRoute } from "astro";
import { codeDetailResponse } from "@/code/detailResponse";

// A project as the Code list's modal shows it. Every `/code` path gets the
// activity ETag and conditional 304s from `src/middleware.ts`. The `.json`
// suffix outranks `[project].astro`.

export const GET: APIRoute = async ({ params }) =>
  codeDetailResponse(params.project ?? "");
