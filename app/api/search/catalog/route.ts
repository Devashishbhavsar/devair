import { NextRequest, NextResponse } from "next/server";
import { getSearchCatalog } from "@/lib/search";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? "";
  const limitRaw = Number(params.get("limit"));
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
  const catalog = getSearchCatalog({ q, limit });

  return NextResponse.json({
    ok: true,
    query: q.trim() || null,
    ...catalog,
  });
}
