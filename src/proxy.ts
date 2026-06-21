import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/upload"];
const COOKIE_NAME = "ab2_auth";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
    if (!isProtected) return NextResponse.next();

    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token === process.env.AUTH_SECRET) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/upload/:path*"],
};
