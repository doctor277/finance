import { hc } from "hono/client";
import type { AppType } from "@/server/app";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000");

export const client = hc<AppType>(baseUrl);
