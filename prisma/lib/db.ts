// Kept for backward compatibility with the ~30 API routes that import
// `{ db } from "@/prisma/lib/db"`. This used to construct its own
// `new PrismaClient()`, so the app ran with TWO separate connection pools
// (this one + src/lib/prisma.ts) plus a handful of routes that each made a
// THIRD, per-request client (see the auth routes) — on a pooled connection
// string like Supabase's Supavisor that adds up fast and exhausts the pool
// under load. There is now exactly one PrismaClient for the whole app.
export { prisma as db } from "@/lib/prisma";
