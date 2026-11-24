import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { categories } from "@/db/schema";
import { idParamSchema, idsSchema, nameSchema } from "@/lib/schemas";
import { requireAuth, type AuthEnv } from "@/server/lib/auth";

const app = new Hono<AuthEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const data = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, c.get("userId")))
      .orderBy(asc(categories.name));

    return c.json({ data });
  })
  .get("/:id", validate("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");

    const [data] = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.userId, c.get("userId")), eq(categories.id, id)));

    if (!data) return c.json({ error: "Not found" }, 404);

    return c.json({ data });
  })
  .post("/", validate("json", nameSchema), async (c) => {
    const { name } = c.req.valid("json");

    const [data] = await db
      .insert(categories)
      .values({ id: createId(), userId: c.get("userId"), name })
      .returning({ id: categories.id, name: categories.name });

    return c.json({ data }, 201);
  })
  .post("/bulk-delete", validate("json", idsSchema), async (c) => {
    const { ids } = c.req.valid("json");

    const data = await db
      .delete(categories)
      .where(and(eq(categories.userId, c.get("userId")), inArray(categories.id, ids)))
      .returning({ id: categories.id });

    return c.json({ data });
  })
  .patch(
    "/:id",
    validate("param", idParamSchema),
    validate("json", nameSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name } = c.req.valid("json");

      const [data] = await db
        .update(categories)
        .set({ name })
        .where(and(eq(categories.userId, c.get("userId")), eq(categories.id, id)))
        .returning({ id: categories.id, name: categories.name });

      if (!data) return c.json({ error: "Not found" }, 404);

      return c.json({ data });
    },
  )
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");

    const [data] = await db
      .delete(categories)
      .where(and(eq(categories.userId, c.get("userId")), eq(categories.id, id)))
      .returning({ id: categories.id });

    if (!data) return c.json({ error: "Not found" }, 404);

    return c.json({ data });
  });

export default app;
