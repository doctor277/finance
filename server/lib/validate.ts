import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";

/**
 * zValidator with the same error shape as every other API error:
 * 400 { error: "<field>: <message>", issues: [...] }, so the client can show
 * the first problem as-is.
 */
export const validate = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      const first = issues[0];
      const error = first ? (first.path ? `${first.path}: ${first.message}` : first.message) : "Invalid request";
      return c.json({ error, issues }, 400);
    }
  });
