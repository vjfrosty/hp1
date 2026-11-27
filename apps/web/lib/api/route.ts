import "server-only";

import type { z } from "zod";

/** JSON response that no cache (browser, CDN, service worker) may store. */
export function privateJson(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(data, { ...init, headers });
}

export function errorJson(status: number, error: string): Response {
  return privateJson({ error }, { status });
}

export const badRequest = (msg = "Invalid body") => errorJson(400, msg);
export const forbidden = (msg = "Forbidden") => errorJson(403, msg);
export const notFound = (msg = "Not found") => errorJson(404, msg);
export const conflict = (msg = "Conflict") => errorJson(409, msg);

/** Parses and validates a JSON body. Returns the data or a 400 response. */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  const raw = await req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, response: badRequest(first ? `${first.path.join(".")}: ${first.message}` : "Invalid body") };
  }
  return { ok: true, data: parsed.data };
}

/** Validates a uuid route param; null when malformed (answer 404). */
export function uuidParam(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
