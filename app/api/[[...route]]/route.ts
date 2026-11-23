import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";

import summary from "./summary";
import categories from "./categories";
import accounts from "./accounts";
import transactions from "./transactions" ;


export const runtime = "edge";

const app = new Hono().basePath("/api");

app.use(
  "*",
  cors({
    origin: ["http://localhost:3001", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used for the AppType export
const routes = app
  .route("/summary", summary)
  .route("/accounts", accounts)
  .route("/categories", categories)
  .route("/transactions", transactions);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
