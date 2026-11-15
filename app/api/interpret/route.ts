import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJson } from "@/lib/http";
import { interpretDescription } from "@/lib/music/interpret";
import { requireUser } from "@/lib/session";

const bodySchema = z.object({
  description: z.string().trim().min(3).max(1200),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const { description } = await parseJson(request, bodySchema);
    const result = await interpretDescription(description);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
