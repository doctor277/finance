import { clerkMiddleware } from "@clerk/nextjs/server";

const PUBLIC_PAGE_PREFIXES = ["/sign-in", "/sign-up"];

const isPublicPage = (pathname: string) =>
  PUBLIC_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // API routes authenticate inside Hono (server/lib/auth.ts) and answer 401 JSON
  // instead of redirecting, so the client can show a proper error.
  if (pathname.startsWith("/api")) return;

  if (!isPublicPage(pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes so Clerk can read the session there
    "/(api|trpc)(.*)",
  ],
};
