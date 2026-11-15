import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path.join(".");
    return NextResponse.json(
      { error: path ? `${path}: ${first?.message}` : "Invalid request body" },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error("[api]", error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
  return schema.parse(body);
}
