import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Launchpad probes this path over HTTP from the `web` network. It must answer
 * 2xx quickly and should fail (503) when the database is not usable, so a
 * broken deploy is reported instead of routed.
 */
export async function GET() {
  try {
    await getPool().query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "database unreachable",
      },
      { status: 503 },
    );
  }
}
