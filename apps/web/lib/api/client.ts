/**
 * Same-origin fetch helpers. Clerk's session cookie travels with every request,
 * so no bearer token is needed for the web app.
 */

/** A 401: the one failure a user fixes by signing in again (DentAnnotate pattern). */
export class SessionExpiredError extends Error {
  readonly status = 401;
  constructor(detail?: string | null) {
    super(detail ?? "Сесията ви изтече. Влезте отново, за да продължите.");
    this.name = "SessionExpiredError";
  }
}

export function isSessionExpired(error: unknown): error is SessionExpiredError {
  return error instanceof SessionExpiredError;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function failure(response: Response): Promise<Error> {
  const detail = await response
    .json()
    .then((body) => (typeof body?.error === "string" ? (body.error as string) : null))
    .catch(() => null);
  // 403 is deliberately not a session error: signing in again does not fix it.
  if (response.status === 401) return new SessionExpiredError();
  return new ApiError(response.status, detail ?? `Грешка ${response.status}`);
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as T;
}

export async function sendJson<T>(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as T;
}
