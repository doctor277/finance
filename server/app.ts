import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { clerkMiddleware } from "@hono/clerk-auth";

import accounts from "@/server/routes/accounts";
import categories from "@/server/routes/categories";
import summary from "@/server/routes/summary";
import transactions from "@/server/routes/transactions";

/**
 * The whole API as one Hono app, mounted by app/api/[[...route]]/route.ts.
 * Kept outside the Next.js route file so tests can call `app.request()` directly.
 */
const app = new Hono().basePath("/api");

app.use("*", clerkMiddleware());

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled API error", err);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

const routes = app
  .route("/summary", summary)
  .route("/accounts", accounts)
  .route("/categories", categories)
  .route("/transactions", transactions);

export { app };
export type AppType = typeof routes;
