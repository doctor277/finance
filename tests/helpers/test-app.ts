import { mock } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/db/schema";

/**
 * Boots the real Hono API against an in-process Postgres (PGlite) that has every
 * migration in ./drizzle applied. Clerk is replaced by a header: requests send
 * `x-test-user-id: <id>` to act as that user, or nothing to be signed out.
 */
export function createTestApp() {
  // Bun runs every test file in one process and caches modules, so the mocked
  // app is built once and shared; each file resets the tables in beforeEach.
  instance ??= build();
  return instance;
}

let instance: ReturnType<typeof build> | undefined;

async function build() {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: "./drizzle" });

  mock.module("@/db/drizzle", () => ({ db }));
  mock.module("@hono/clerk-auth", () => ({
    clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
    getAuth: (c: { req: { header: (name: string) => string | undefined } }) => {
      const userId = c.req.header("x-test-user-id");
      return userId ? { userId } : null;
    },
  }));

  const { app } = await import("@/server/app");

  const request = (
    method: string,
    path: string,
    options: { as?: string; body?: unknown } = {},
  ) => {
    const headers: Record<string, string> = {};
    if (options.as) headers["x-test-user-id"] = options.as;
    if (options.body !== undefined) headers["content-type"] = "application/json";

    return app.request(path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  };

  const reset = async () => {
    await client.exec(
      `TRUNCATE "transactions", "accounts", "categories" RESTART IDENTITY CASCADE;`,
    );
  };

  return { app, db, client, request, reset };
}
