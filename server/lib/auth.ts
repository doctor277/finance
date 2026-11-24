import { createMiddleware } from "hono/factory";
import { getAuth } from "@hono/clerk-auth";

export type AuthEnv = {
  Variables: {
    userId: string;
  };
};

/**
 * Rejects the request with 401 unless Clerk resolved a signed-in user.
 * Handlers read the user from `c.get("userId")` and must scope every query to it.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", auth.userId);
  await next();
});
