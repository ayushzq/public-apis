import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 🔒 Protected Routes: Sirf Main Domain ke liye
const PROTECTED_ROUTES = [
  "/dashboard",
  "/chat",
  "/campaigns",
  "/contacts",
  "/settings",
  "/developers",
  "/template",
  "/chatbot-builder",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // -----------------------------------------------------------------
  // 1. 🛡️ SUBDOMAIN LOCK: verification.basekey.in (STEALTH MODE)
  // -----------------------------------------------------------------
  if (host.startsWith("verification.")) {
    // Sirf /verify wale link ko aage jaane do
    if (pathname.startsWith("/verify")) {
      return NextResponse.next();
    }

    // Static assets ko allow karo taaki verify page ka CSS/design na toote
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.match(/\.(png|jpg|jpeg|svg|webp|css|js)$/)
    ) {
      return NextResponse.next();
    }

    // 🔥 GHOST ENDPOINT: Agar koi direct 'verification.basekey.in' ya koi aur link khole,
    // toh ZERO redirect hoga aur seedha plain text "404 Not Found" aayega.
    // Saamne wale ko lagega yahan koi website host hi nahi hai!
    return new NextResponse("404 Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // -----------------------------------------------------------------
  // 2. 🌐 MAIN DOMAIN: basekey.in
  // -----------------------------------------------------------------
  if (pathname.startsWith("/verify")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 🔐 RESTRICTED "AGENT" LOGINS: the workspace owner/admin decides which
    // pages an agent can open (User.allowedPages). OWNER/ADMIN always have
    // full access, so this only ever narrows an AGENT session.
    if (token.role === "AGENT") {
      const allowedPages = (token.allowedPages as string[] | undefined) ?? [];
      const isAllowed = allowedPages.some((page) => pathname.startsWith(page));

      if (!isAllowed) {
        const fallback = (token.primaryPage as string | undefined) || allowedPages[0] || "/chat";
        // Avoid a redirect loop if the agent's own primary page isn't allowed either.
        if (pathname !== fallback) {
          return NextResponse.redirect(new URL(fallback, req.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/webhook|api/v1/trigger|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
