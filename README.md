````md
This is a Next.js project bootstrapped with create-next-app and built using **Bun**.

## Getting Started

### Prerequisites
- Bun installed: https://bun.sh

### Install dependencies
```bash
bun install
````

### Run the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Development Notes

* Uses Next.js App Router
* API routes are handled with Hono
* Database access via Drizzle ORM
* Authentication with Clerk
* Amounts are stored in milliunits and converted on the frontend

## Database Seeding (Development Only)

```bash
bun run db:seed
```

This deletes existing data and inserts fresh seeded data. Do not run in production.

## Fonts

This project uses `next/font` to automatically optimize and load **Geist**, the Vercel font family.

## Learn More

* Next.js Documentation: [https://nextjs.org/docs](https://nextjs.org/docs)
* Bun Documentation: [https://bun.sh/docs](https://bun.sh/docs)

## Deploy on Vercel

Deploy using the Vercel Platform.

Make sure to configure the required environment variables
(from `.env.local`) in the Vercel dashboard before deploying.

