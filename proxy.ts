import { cataloguePreviewEnabled, isCatalogueFixturePath } from "@/lib/storefront/catalogue-preview";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";

export async function proxy(request: NextRequest) {
  // Fixture routes never read session cookies or enter application authentication.
  if (isCatalogueFixturePath(request.nextUrl.pathname)) {
    if (!cataloguePreviewEnabled(process.env)) return new NextResponse("Not found", { status: 404 });
    return NextResponse.next();
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/dev/store-catalogue", "/dev/catalogue-preview", "/dashboard/:path*", "/onboarding/:path*", "/vendor/:path*", "/notifications/:path*", "/team"],
};
