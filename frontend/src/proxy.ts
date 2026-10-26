import { NextResponse, type NextRequest } from "next/server";
import { locales, pickLocale } from "@/dictionaries";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
  )
    return;
  request.nextUrl.pathname = `/${pickLocale(request.headers.get("accept-language"))}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
