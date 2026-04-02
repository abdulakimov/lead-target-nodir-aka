import { NextResponse } from "next/server";
import { getRedis } from "../../lib/server/redis";
import { ensurePostgresSchema } from "../../lib/server/postgres";

export async function GET() {
  try {
    await ensurePostgresSchema();
    const redis = await getRedis();
    await redis.set("health:last", new Date().toISOString());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Health check failed" },
      { status: 500 },
    );
  }
}
