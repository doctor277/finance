// drizzle.config.ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql", // <- NEW: use dialect instead of driver
  schema: "./db/schema.ts", // your schema file
  out: "./drizzle", // where migrations & snapshots go
  dbCredentials: {
    url: process.env.DATABASE_URL!, // same env var you already use
  },
  verbose: true,
  strict: true,
});
