/**
 * Reads the `{ error }` body our API returns on failure and turns it into a
 * readable message. Hono's zod-validator returns `{ success: false, error: {...} }`
 * for 400s, so anything that isn't a plain string falls back to `fallback`.
 */
export async function getErrorMessage(
  response: { json(): Promise<unknown> },
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown } | null;
    if (body && typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // Non-JSON body: use the fallback.
  }
  return fallback;
}
