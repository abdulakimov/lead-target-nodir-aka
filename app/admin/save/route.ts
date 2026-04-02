import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE } from "../../lib/admin-auth";
import { saveLandingContent, type LandingContent } from "../../lib/content";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.get(ADMIN_SESSION_COOKIE)?.value === ADMIN_SESSION_VALUE;

  if (!isLoggedIn) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<LandingContent>;
  const saved = saveLandingContent(body);

  return NextResponse.json({ ok: true, content: saved });
}
