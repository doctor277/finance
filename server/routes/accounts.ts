import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts } from "@/db/schema";
import { idParamSchema, idsSchema, nameSchema } from "@/lib/schemas";
import { requireAuth, type AuthEnv } from "@/server/lib/auth";

const app = new Hono<AuthEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const data = await db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(eq(accounts.userId, c.get("userId")))
      .orderBy(asc(accounts.name));

    return c.json({ data });
  })
  .get("/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");

    const [data] = await db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.userId, c.get("userId")), eq(accounts.id, id)));

    if (!data) return c.json({ error: "Not found" }, 404);

    return c.json({ data });
  })
  .post("/", zValidator("json", nameSchema), async (c) => {
    const { name } = c.req.valid("json");

    const [data] = await db
      .insert(accounts)
      .values({ id: createId(), userId: c.get("userId"), name })
      .returning({ id: accounts.id, name: accounts.name });

    return c.json({ data }, 201);
  })
  .post("/bulk-delete", zValidator("json", idsSchema), async (c) => {
    const { ids } = c.req.valid("json");

    const data = await db
      .delete(accounts)
      .where(and(eq(accounts.userId, c.get("userId")), inArray(accounts.id, ids)))
      .returning({ id: accounts.id });

    return c.json({ data });
  })
  .patch(
    "/:id",
    zValidator("param", idParamSchema),
    zValidator("json", nameSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name } = c.req.valid("json");

      const [data] = await db
        .update(accounts)
        .set({ name })
        .where(and(eq(accounts.userId, c.get("userId")), eq(accounts.id, id)))
        .returning({ id: accounts.id, name: accounts.name });

      if (!data) return c.json({ error: "Not found" }, 404);

      return c.json({ data });
    },
  )
  .delete("/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");

    const [data] = await db
      .delete(accounts)
      .where(and(eq(accounts.userId, c.get("userId")), eq(accounts.id, id)))
      .returning({ id: accounts.id });

    if (!data) return c.json({ error: "Not found" }, 404);

    return c.json({ data });
  });

export default app;
